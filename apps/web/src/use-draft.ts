import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { api, ApiError, eventId, recoveryKey } from "./api";

export type Draft = {
  source: string;
  revision: number;
  contentVersionId: string;
  updatedAt: string;
};
type LocalDraft = { source: string; baseRevision: number };

const storageKey = (id: string, versionId: string) =>
  recoveryKey("draft", id + ":" + versionId);
function readLocalDraft(key: string): LocalDraft | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    return value &&
      typeof value.source === "string" &&
      Number.isInteger(value.baseRevision)
      ? value
      : null;
  } catch {
    return null;
  }
}
function storeLocalDraft(key: string, value: LocalDraft | null) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {}
}

export function useDraft(id: string, versionId: string, starter: string) {
  const key = storageKey(id, versionId),
    local = useRef<LocalDraft | null>(readLocalDraft(key));
  const initial = local.current?.source ?? starter;
  const [text, setText] = useState(initial),
    [revision, setRevision] = useState(local.current?.baseRevision ?? 0),
    [status, setStatus] = useState("Loading"),
    [conflict, setConflict] = useState<Draft | null>(null);
  const current = useRef(initial),
    saved = useRef(starter),
    rev = useRef(local.current?.baseRevision ?? 0),
    inflight = useRef(false),
    ready = useRef(false),
    failed = useRef(false);
  const setSource = (value: string) => {
    current.current = value;
    setText(value);
    setStatus("Unsaved");
    storeLocalDraft(key, { source: value, baseRevision: rev.current });
  };

  useEffect(() => {
    let live = true;
    const recovered = readLocalDraft(key);
    local.current = recovered;
    ready.current = false;
    failed.current = false;
    setConflict(null);
    if (recovered) {
      current.current = recovered.source;
      rev.current = recovered.baseRevision;
      setRevision(recovered.baseRevision);
      setText(recovered.source);
    } else {
      current.current = starter;
      rev.current = 0;
      setRevision(0);
      setText(starter);
    }
    setStatus("Loading");
    api<Draft | null>("/drafts/" + id)
      .then((d) => {
        if (!live) return;
        const serverSource = d?.source ?? starter,
          serverRevision = d?.revision ?? 0;
        saved.current = serverSource;
        rev.current = serverRevision;
        setRevision(serverRevision);
        ready.current = true;
        if (recovered && recovered.source !== serverSource) {
          current.current = recovered.source;
          setText(recovered.source);
          storeLocalDraft(key, {
            source: recovered.source,
            baseRevision: serverRevision,
          });
          if (recovered.baseRevision !== serverRevision) {
            setConflict(
              d ?? {
                source: serverSource,
                revision: serverRevision,
                contentVersionId: versionId,
                updatedAt: "",
              },
            );
            setStatus("Conflict");
          } else setStatus("Unsaved");
        } else {
          current.current = serverSource;
          setText(serverSource);
          storeLocalDraft(key, null);
          setStatus("Saved");
        }
      })
      .catch(() => {
        if (live) {
          failed.current = true;
          setStatus("Unsaved");
        }
      });
    return () => {
      live = false;
    };
  }, [id, versionId, starter, key]);

  const save = useCallback(
    async (force = false, reason = "save") => {
      if (inflight.current || !ready.current || conflict) return false;
      if (!force && current.current === saved.current) return true;
      inflight.current = true;
      const source = current.current;
      setStatus("Saving");
      try {
        const result = await api<Draft>("/drafts/" + id, "PUT", {
          clientEventId: eventId(),
          source,
          contentVersionId: versionId,
          expectedRevision: rev.current,
          reason,
        });
        saved.current = source;
        rev.current = result.revision;
        setRevision(result.revision);
        failed.current = false;
        if (current.current === source) {
          storeLocalDraft(key, null);
          setStatus("Saved");
        } else {
          storeLocalDraft(key, {
            source: current.current,
            baseRevision: result.revision,
          });
          setStatus("Unsaved");
        }
        return true;
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 409 &&
          error.code === "REVISION_CONFLICT" &&
          error.details &&
          typeof (error.details as Draft).source === "string"
        ) {
          setConflict(error.details as Draft);
          setStatus("Conflict");
        } else {
          failed.current = true;
          storeLocalDraft(key, {
            source: current.current,
            baseRevision: rev.current,
          });
          setStatus("Unsaved");
        }
        return false;
      } finally {
        inflight.current = false;
      }
    },
    [id, versionId, conflict, key],
  );
  useEffect(() => {
    if (
      status !== "Unsaved" ||
      !ready.current ||
      inflight.current ||
      failed.current
    )
      return;
    const timer = setTimeout(() => void save(), 1000);
    return () => clearTimeout(timer);
  }, [text, status, save]);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (current.current !== saved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);
  const blocker = useBlocker(() => current.current !== saved.current);
  const retry = async () => {
    try {
      const server = await api<Draft | null>("/drafts/" + id),
        serverRevision = server?.revision ?? 0;
      if (serverRevision !== rev.current) {
        saved.current = server?.source ?? starter;
        rev.current = serverRevision;
        setRevision(serverRevision);
        setConflict(
          server ?? {
            source: starter,
            revision: 0,
            contentVersionId: versionId,
            updatedAt: "",
          },
        );
        setStatus("Conflict");
        return;
      }
      ready.current = true;
      failed.current = false;
      await save(true);
    } catch {
      failed.current = true;
      storeLocalDraft(key, {
        source: current.current,
        baseRevision: rev.current,
      });
      setStatus("Unsaved");
    }
  };
  useEffect(() => {
    const reconnect = () => {
      if (current.current !== saved.current) void retry();
    };
    window.addEventListener("online", reconnect);
    window.addEventListener("session-restored", reconnect);
    return () => {
      window.removeEventListener("online", reconnect);
      window.removeEventListener("session-restored", reconnect);
    };
  }, [id, versionId, conflict]);
  const keepServer = () => {
    if (!conflict) return;
    current.current = saved.current = conflict.source;
    rev.current = conflict.revision;
    setRevision(conflict.revision);
    setText(conflict.source);
    setConflict(null);
    storeLocalDraft(key, null);
    setStatus("Saved");
  };
  const keepMine = () => {
    if (!conflict) return;
    rev.current = conflict.revision;
    setRevision(conflict.revision);
    setConflict(null);
    storeLocalDraft(key, {
      source: current.current,
      baseRevision: conflict.revision,
    });
    setStatus("Unsaved");
  };
  return {
    text,
    setSource,
    revision,
    status,
    dirty: text !== saved.current,
    save,
    retry,
    conflict,
    keepServer,
    keepMine,
    blocker,
  };
}
