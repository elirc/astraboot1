import { usePages, useDateFormat } from "./collections";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Link, useParams, useBlocker } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  api,
  ApiError,
  eventId,
  refresh,
  recoveryKey,
  type Progress,
} from "./api";
import type {
  Item,
  Json,
  Assessment,
  ContentPackage,
} from "../../../packages/contracts/src/content";
import { AnswerForm } from "./answer-form";
import { PageTitle, State, Prose, Notice } from "./ui";
import styles from "./Workspace.module.css";
export function ProgressPage() {
  const formatDate = useDateFormat();
  const history = usePages<Progress["attempts"][number]>(
    "attempt-history",
    "/attempts",
  );
  const placements = usePages<Progress["placements"][number]>(
    "placement-history",
    "/placement-attempts",
  );
  const q = useQuery({
    queryKey: ["progress"],
    queryFn: () => api<Progress>("/progress"),
  });
  const p = q.data;
  return (
    <>
      <PageTitle
        kicker="YOUR LEARNING RECORD"
        title="Progress, with the context."
      >
        Completion, independent evidence, and retained understanding tell
        different parts of the story.
      </PageTitle>
      <State loading={q.isLoading} error={q.error}>
        {p && (
          <>
            <div className={styles.stats}>
              <div>
                <span>Completed lessons</span>
                <strong>
                  {p.lessons.filter((l) => l.status === "completed").length}
                </strong>
              </div>
              <div>
                <span>Experience</span>
                <strong>
                  {p.totalXP}
                  <small> XP</small>
                </strong>
              </div>
              <div>
                <span>Level</span>
                <strong>{p.level}</strong>
              </div>
            </div>
            <h2>Concept evidence</h2>
            <div className={styles.panel}>
              {p.concepts.length ? (
                p.concepts.map((c) => (
                  <div className={styles.row} key={c.id}>
                    <span>
                      {c.id}
                      <small>{c.independentItems} independent items</small>
                    </span>
                    <span className={styles.badge}>
                      {c.status.replaceAll("_", " ")}
                    </span>
                  </div>
                ))
              ) : (
                <p>Complete activities to build your first evidence.</p>
              )}
            </div>
            <h2>Placement</h2>
            <div className={styles.panel}>
              {placements.rows.length ? (
                placements.rows.map((a) => (
                  <p key={a.id}>
                    {a.assessmentId} · {a.score}/5 ·{" "}
                    {a.practiceOnly
                      ? "Practice only"
                      : a.qualified
                        ? "Placed out"
                        : "Not qualified"}
                  </p>
                ))
              ) : (
                <p>No placement attempts yet.</p>
              )}
              {placements.hasNextPage && (
                <button
                  onClick={() => placements.fetchNextPage()}
                  disabled={placements.isFetchingNextPage}
                >
                  Load earlier placements
                </button>
              )}
            </div>
            <h2>Attempt history</h2>
            <div className={styles.panel}>
              {history.rows.map((a) => (
                <div className={styles.row} key={a.id}>
                  <Link to={"/practice/" + a.itemId}>
                    {a.itemId}
                    <small>{formatDate(a.createdAt)}</small>
                  </Link>
                  <span>
                    {a.outcome}
                    <small>
                      {a.gradingOrigin.replaceAll("_", " ")} ·{" "}
                      {a.assistance.replaceAll("_", " ")}
                    </small>
                  </span>
                </div>
              ))}
              {history.hasNextPage && (
                <button
                  disabled={history.isFetchingNextPage}
                  onClick={() => history.fetchNextPage()}
                >
                  Load earlier attempts
                </button>
              )}
              {history.error && <Notice text={history.error.message} />}
            </div>
          </>
        )}
      </State>
    </>
  );
}
export function Review() {
  type Card = Extract<Item, { kind: "review_card" }> & {
    versionId: string;
    state: { revision: number; step: number };
  };
  const q = useQuery({
    queryKey: ["reviews"],
    queryFn: () => api<Card[]>("/reviews/due"),
  });
  const [answer, setAnswer] = useState<Json>(""),
    [revealed, setRevealed] = useState(""),
    [notice, setNotice] = useState(""),
    [count, setCount] = useState(0),
    [pending, setPending] = useState(false);
  const card = q.data?.[0];
  useEffect(() => {
    setAnswer("");
    setRevealed("");
  }, [card?.id]);
  const rate = async (rating: string) => {
    if (!card) return;
    setPending(true);
    try {
      const r = await api<{
        correctness: boolean | null;
        answer: string;
        explanation: string;
        appliedRating: string;
      }>("/reviews/" + card.id + "/responses", "POST", {
        clientEventId: eventId(),
        expectedRevision: card.state.revision,
        versionId: card.versionId,
        rating,
        answer,
      });
      setNotice(
        (r.correctness === false
          ? "Incorrect — scheduled Again. "
          : "Scheduled " + r.appliedRating + ". ") +
          r.answer +
          " " +
          r.explanation,
      );
      setCount(count + 1);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Review could not be saved.");
      await q.refetch();
    } finally {
      setPending(false);
    }
  };
  return (
    <>
      <PageTitle kicker="RETRIEVAL PRACTICE" title="Make room for remembering.">
        {count} reviewed this session. No daily limit; continue for as long as
        it’s useful.
      </PageTitle>
      <State loading={q.isLoading} error={q.error}>
        {card ? (
          <section className={styles.reviewCard} key={card.id}>
            <span className={styles.eyebrow}>
              {card.type} · STEP {card.state.step}
            </span>
            <h2>{card.title}</h2>
            <Prose>{card.promptMarkdown}</Prose>
            {card.gradingOrigin === "server_objective" ? (
              <AnswerForm
                grading={card.grading}
                value={answer}
                onChange={setAnswer}
              />
            ) : (
              <>
                <label>
                  Your recall
                  <textarea
                    value={typeof answer === "string" ? answer : ""}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                </label>
                <button
                  className={styles.secondaryButton}
                  onClick={async () => {
                    try {
                      const r = await api<{
                        answer: string;
                        explanation: string;
                      }>("/reviews/" + card.id + "/reveal", "POST", {
                        clientEventId: eventId(),
                      });
                      setRevealed(r.answer + "\n\n" + r.explanation);
                    } catch (e) {
                      setNotice(String(e));
                    }
                  }}
                >
                  Reveal answer
                </button>
                {revealed && <Prose>{revealed}</Prose>}
              </>
            )}
            <p className={styles.muted}>
              {card.gradingOrigin === "server_objective"
                ? "An incorrect answer is automatically scheduled Again."
                : "Free recall is self-reported practice."}
            </p>
            <div className={styles.actions}>
              {["Again", "Hard", "Good", "Easy"].map((r) => (
                <button
                  key={r}
                  disabled={
                    pending ||
                    (card.gradingOrigin === "self_reported" && !revealed)
                  }
                  className={r === "Good" ? undefined : styles.secondaryButton}
                  onClick={() => rate(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className={styles.empty}>
            <h2>You’re up to date.</h2>
            <p>
              Complete a lesson or add its cards to review. Due cards appear
              here.
            </p>
            <Link className={styles.button} to="/learn">
              Explore lessons →
            </Link>
            <button className={styles.ghost} onClick={() => q.refetch()}>
              Refresh queue
            </button>
          </section>
        )}
        <Notice text={notice} />
      </State>
    </>
  );
}
const PlacementCode = lazy(() => import("./placement-code"));
export function Placement() {
  const { chapterId } = useParams();
  return <PlacementWorkspace key={chapterId} chapterId={chapterId!} />;
}
function PlacementWorkspace({ chapterId }: { chapterId: string }) {
  const [browserResults, setBrowserResults] = useState<
      Record<string, { status: string; passedCaseIds: string[] }>
    >({}),
    [running, setRunning] = useState<Record<string, boolean>>({});
  const q = useQuery({
    queryKey: ["placement", chapterId],
    queryFn: () =>
      api<Assessment & { versionId: string }>("/placements/" + chapterId),
  });
  const [answers, setAnswers] = useState<Record<string, Json>>({}),
    [result, setResult] = useState<{
      score: number;
      qualified: boolean;
      practiceOnly: boolean;
      items: {
        id: string;
        passed: boolean;
        solution: {
          modelAnswer?: string;
          code?: string;
          explanationMarkdown: string;
        };
      }[];
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const version = useRef("");
  useEffect(() => {
    const next = q.data?.versionId;
    if (!next || version.current === next) return;
    version.current = next;
    setAnswers({});
    setBrowserResults({});
    setRunning({});
    setResult(null);
    setError("");
    setBusy(false);
  }, [q.data?.versionId]);
  return (
    <>
      <PageTitle
        kicker="PLACEMENT ASSESSMENT"
        title="Show what you already know."
      >
        Five items. Pass at least four and every critical item. After answers
        are revealed, repeats on this version are practice only.
      </PageTitle>
      <State loading={q.isLoading} error={q.error}>
        {q.data && (
          <>
            <div className={styles.assessment}>
              {q.data.items.map((item, n) => (
                <section
                  className={styles.panel}
                  key={item.id + ":" + q.data.versionId}
                >
                  <span className={styles.eyebrow}>
                    ITEM {n + 1}
                    {item.critical ? " · CRITICAL" : ""}
                  </span>
                  <h2>{item.title}</h2>
                  <Prose>{item.promptMarkdown}</Prose>
                  {item.grading.kind === "function-cases" ? (
                    <Suspense fallback={<p>Loading code editor…</p>}>
                      <PlacementCode
                        id={item.id}
                        spec={item.grading}
                        onChange={(source) =>
                          setAnswers((current) => ({
                            ...current,
                            [item.id]: source,
                          }))
                        }
                        onResult={(result) =>
                          setBrowserResults((current) => {
                            const next = { ...current };
                            if (result) next[item.id] = result;
                            else delete next[item.id];
                            return next;
                          })
                        }
                        onBusy={(value) =>
                          setRunning((current) => ({
                            ...current,
                            [item.id]: value,
                          }))
                        }
                      />
                    </Suspense>
                  ) : (
                    <AnswerForm
                      grading={item.grading}
                      value={answers[item.id] ?? ""}
                      onChange={(v) => setAnswers({ ...answers, [item.id]: v })}
                    />
                  )}
                  {result && (
                    <div>
                      <strong>
                        {result.items[n]?.passed
                          ? "✓ Correct"
                          : "✕ Review this concept"}
                      </strong>
                      <Prose>
                        {(result.items[n]?.solution.modelAnswer ??
                          result.items[n]?.solution.code ??
                          "") +
                          "\n\n" +
                          result.items[n]?.solution.explanationMarkdown}
                      </Prose>
                    </div>
                  )}
                </section>
              ))}
            </div>
            <button
              disabled={busy || Object.values(running).some(Boolean)}
              onClick={async () => {
                setBusy(true);
                const submittedVersion = q.data!.versionId;
                try {
                  const r = await api<NonNullable<typeof result>>(
                    "/placements/" + chapterId,
                    "POST",
                    {
                      clientEventId: eventId(),
                      assessmentId: q.data!.id,
                      versionId: q.data!.versionId,
                      answers,
                      browserResults,
                    },
                  );
                  if (version.current === submittedVersion) setResult(r);
                  await refresh();
                } catch (e) {
                  setError(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Submitting…" : "Submit assessment"}
            </button>
            {result && (
              <Notice
                text={
                  result.score +
                  "/5 · " +
                  (result.practiceOnly
                    ? "Practice only"
                    : result.qualified
                      ? "Chapter placed out"
                      : "Keep practicing — the chapter remains open")
                }
              />
            )}
            <Notice text={error} />
          </>
        )}
      </State>
    </>
  );
}
type Note = {
  id: string;
  title: string;
  body: string;
  revision: number;
  contentItemId: string | null;
  updatedAt: string;
  deletedAt?: string | null;
  content?: AssociatedContent | null;
};
type AssociatedContent = {
  id: string;
  kind: string;
  title: string;
  parentId: string | null;
  archived: boolean;
};
function contentPath(content: AssociatedContent) {
  if (content.archived) return "/archive/" + content.id;
  if (content.kind === "track") return "/learn";
  if (content.kind === "chapter") return "/learn/chapters/" + content.id;
  if (content.kind === "lesson") return "/learn/lessons/" + content.id;
  if (content.kind === "exercise") return "/practice/" + content.id;
  if (content.kind === "mission") return "/projects/" + content.id;
  if (content.kind === "review_card" && content.parentId)
    return "/learn/lessons/" + content.parentId;
  if (content.kind === "assessment" && content.parentId)
    return "/placement/" + content.parentId;
  return "/learn";
}
type NoteRecovery = {
  title: string;
  body: string;
  baseRevision: number;
  pendingCreate?: { fingerprint: string; clientEventId: string };
};
const noteRecoveryKey = (id: string) => recoveryKey("note", id || "new");
function readNoteRecovery(id: string): NoteRecovery | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(noteRecoveryKey(id)) ?? "null",
    );
    return value &&
      typeof value.title === "string" &&
      typeof value.body === "string" &&
      Number.isInteger(value.baseRevision)
      ? value
      : null;
  } catch {
    return null;
  }
}
function writeNoteRecovery(id: string, value: NoteRecovery | null) {
  try {
    if (value) localStorage.setItem(noteRecoveryKey(id), JSON.stringify(value));
    else localStorage.removeItem(noteRecoveryKey(id));
  } catch {}
}
function isConflictNote(value: unknown): value is Note {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Note).revision === "number" &&
    typeof (value as Note).title === "string" &&
    typeof (value as Note).body === "string"
  );
}
export function Notes() {
  const formatDate = useDateFormat();
  const [search, setSearch] = useState(""),
    [selected, setSelected] = useState<Note | null>(() =>
      readNoteRecovery("")
        ? {
            id: "",
            title: "New note",
            body: "",
            revision: 0,
            contentItemId: null,
            updatedAt: "",
          }
        : null,
    ),
    [notice, setNotice] = useState(""),
    [noteDirty, setNoteDirty] = useState(false);
  const q = usePages<Note>("notes", "/notes?q=" + encodeURIComponent(search));
  const b = usePages<{
    contentItemId: string;
    kind: string;
    title: string;
    archived: boolean;
    parentId: string | null;
  }>("bookmarks", "/bookmarks?q=" + encodeURIComponent(search));
  return (
    <>
      <PageTitle kicker="YOUR NOTEBOOK" title="Keep the things that click.">
        Notes and bookmarks stay attached to their content, even after a course
        update.
      </PageTitle>
      <div className={styles.actions}>
        <label className={styles.search}>
          Search notes and bookmarks
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="A concept, question, or idea…"
          />
        </label>
        <button
          onClick={() => {
            if (
              !noteDirty ||
              window.confirm("Leave this note with unsaved changes?")
            )
              setSelected({
                id: "",
                title: "New note",
                body: "",
                revision: 0,
                contentItemId: null,
                updatedAt: "",
              });
          }}
        >
          New note
        </button>
        <button
          className={styles.secondaryButton}
          onClick={() => {
            if (
              !noteDirty ||
              window.confirm("Leave this note with unsaved changes?")
            )
              setSelected(null);
          }}
        >
          Show bookmarks
        </button>
      </div>
      <State loading={q.isLoading || b.isLoading} error={q.error ?? b.error}>
        <div className={styles.twoColumn}>
          <section className={styles.panel}>
            {q.rows.length ? (
              q.rows.map((n) => (
                <button
                  className={styles.noteRow}
                  key={n.id}
                  onClick={() => {
                    if (
                      !noteDirty ||
                      window.confirm("Leave this note with unsaved changes?")
                    )
                      setSelected(n);
                  }}
                >
                  <strong>{n.title}</strong>
                  <p>{n.body.slice(0, 150)}</p>
                  <small>{formatDate(n.updatedAt, true)}</small>
                </button>
              ))
            ) : (
              <p>
                {search
                  ? "No notes match this search."
                  : "No notes yet. Capture a question as you learn."}
              </p>
            )}
            {q.hasNextPage && (
              <button
                onClick={() => q.fetchNextPage()}
                disabled={q.isFetchingNextPage}
              >
                Load more notes
              </button>
            )}
          </section>
          {selected ? (
            <NoteEditor
              key={selected.id}
              initial={selected}
              onDirty={setNoteDirty}
              onSaved={(n) => {
                setSelected((current) =>
                  current?.id === n.id || current?.id === ""
                    ? { ...n, content: current.content }
                    : current,
                );
                void q.refetch();
              }}
              onDeleted={() => {
                setSelected(null);
                void q.refetch();
              }}
            />
          ) : (
            <section className={styles.panel}>
              <h2>Bookmarks</h2>
              {b.rows.length ? (
                b.rows.map((mark) => (
                  <div className={styles.row} key={mark.contentItemId}>
                    <Link to={contentPath({ id: mark.contentItemId, ...mark })}>
                      {mark.title}
                      <small>
                        {mark.archived ? "Archived content" : mark.kind}
                      </small>
                    </Link>
                    <button
                      className={styles.ghost}
                      onClick={async () => {
                        try {
                          await api(
                            "/bookmarks/" + mark.contentItemId,
                            "DELETE",
                            { clientEventId: eventId() },
                          );
                          await b.refetch();
                        } catch (e) {
                          setNotice(String(e));
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p>
                  {search
                    ? "No bookmarks match this search."
                    : "Bookmark a lesson to find it here."}
                </p>
              )}
              {b.hasNextPage && (
                <button
                  onClick={() => b.fetchNextPage()}
                  disabled={b.isFetchingNextPage}
                >
                  Load more bookmarks
                </button>
              )}
            </section>
          )}
        </div>
      </State>
      <Notice text={notice} />
    </>
  );
}
function NoteEditor({
  initial,
  onSaved,
  onDeleted,
  onDirty,
}: {
  initial: Note;
  onDirty: (dirty: boolean) => void;
  onSaved: (n: Note) => void;
  onDeleted: () => void;
}) {
  const recovered = useRef(readNoteRecovery(initial.id));
  const cached = recovered.current;
  const [title, setTitle] = useState(cached?.title ?? initial.title),
    [body, setBody] = useState(cached?.body ?? initial.body),
    [revision, setRevision] = useState(initial.revision),
    [status, setStatus] = useState(cached ? "Unsaved" : "Saved"),
    [conflict, setConflict] = useState<Note | null>(
      cached && initial.id && cached.baseRevision !== initial.revision
        ? initial
        : null,
    );
  const inflight = useRef(false),
    saved = useRef({ title: initial.title, body: initial.body }),
    pendingCreate = useRef(cached?.pendingCreate ?? null);
  const dirty = title !== saved.current.title || body !== saved.current.body;
  const blocker = useBlocker(dirty);
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (dirty)
      writeNoteRecovery(initial.id, {
        title,
        body,
        baseRevision: revision,
        ...(pendingCreate.current
          ? { pendingCreate: pendingCreate.current }
          : {}),
      });
    else writeNoteRecovery(initial.id, null);
  }, [initial.id, title, body, revision, dirty]);
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("Leave this note with unsaved changes?"))
        blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  const save = async () => {
    if (inflight.current || conflict) return;
    inflight.current = true;
    setStatus("Saving");
    const fingerprint = JSON.stringify({
        title,
        body,
        contentItemId: initial.contentItemId,
      }),
      clientEventId = initial.id
        ? eventId()
        : pendingCreate.current?.fingerprint === fingerprint
          ? pendingCreate.current.clientEventId
          : eventId();
    if (!initial.id) {
      pendingCreate.current = { fingerprint, clientEventId };
      writeNoteRecovery(initial.id, {
        title,
        body,
        baseRevision: revision,
        pendingCreate: pendingCreate.current,
      });
    }
    try {
      const n = await api<Note>(
        "/notes" + (initial.id ? "/" + initial.id : ""),
        initial.id ? "PATCH" : "POST",
        {
          clientEventId,
          title,
          body,
          ...(initial.id
            ? { expectedRevision: revision }
            : { contentItemId: initial.contentItemId }),
        },
      );
      saved.current = { title, body };
      pendingCreate.current = null;
      writeNoteRecovery(initial.id, null);
      setRevision(n.revision);
      setStatus("Saved");
      onSaved(n);
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.status === 409 &&
        e.code === "REVISION_CONFLICT" &&
        isConflictNote(e.details)
      ) {
        setConflict(e.details);
        setStatus("Conflict");
      } else setStatus(e instanceof Error ? e.message : "Unsaved");
    } finally {
      inflight.current = false;
    }
  };
  useEffect(() => {
    const online = () => {
      if (dirty && !conflict) void save();
    };
    window.addEventListener("online", online);
    window.addEventListener("session-restored", online);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("session-restored", online);
    };
  }, [title, body, revision, conflict]);
  useEffect(() => {
    if (!dirty || !initial.id || status === "Conflict") return;
    const timer = setTimeout(() => void save(), 1000);
    return () => clearTimeout(timer);
  }, [title, body, revision]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeading}>
        <h2>{initial.id ? "Edit note" : "New note"}</h2>
        <span role="status">
          {dirty && status === "Saved" ? "Unsaved" : status}
        </span>
      </div>
      {initial.content && (
        <p>
          Associated content:{" "}
          <Link className={styles.textLink} to={contentPath(initial.content)}>
            {initial.content.title}
            {initial.content.archived ? " (archived)" : ""} →
          </Link>
        </p>
      )}
      <label>
        Title
        <input
          disabled={!initial.id && status === "Saving"}
          maxLength={200}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setStatus("Unsaved");
          }}
        />
      </label>
      <label>
        Note
        <textarea
          disabled={!initial.id && status === "Saving"}
          rows={10}
          maxLength={20000}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setStatus("Unsaved");
          }}
        />
      </label>
      <div className={styles.actions}>
        <button onClick={save}>Save note</button>
        {initial.id && (
          <button
            className={styles.ghost}
            onClick={async () => {
              if (!window.confirm("Delete this note?")) return;
              try {
                await api("/notes/" + initial.id, "DELETE", {
                  clientEventId: eventId(),
                  expectedRevision: revision,
                });
                writeNoteRecovery(initial.id, null);
                onDeleted();
              } catch (e) {
                if (
                  e instanceof ApiError &&
                  e.status === 409 &&
                  e.code === "REVISION_CONFLICT" &&
                  isConflictNote(e.details)
                ) {
                  setConflict(e.details);
                  setStatus("Conflict");
                } else setStatus(e instanceof Error ? e.message : "Unsaved");
              }
            }}
          >
            Delete
          </button>
        )}
      </div>
      {conflict && (
        <section className={styles.conflict}>
          <h3>Note changed on another device</h3>
          <p>
            {conflict.deletedAt
              ? "This note was deleted. Copy your text into a new note to keep it."
              : "Server text (" +
                new Date(conflict.updatedAt).toLocaleString() +
                "):"}
          </p>
          <pre>{conflict.body}</pre>
          <button
            onClick={() => {
              setTitle(conflict.title);
              setBody(conflict.body);
              setRevision(conflict.revision);
              saved.current = { title: conflict.title, body: conflict.body };
              setConflict(null);
              writeNoteRecovery(initial.id, null);
              setStatus("Saved");
            }}
          >
            Keep server
          </button>
          {!conflict.deletedAt && (
            <button
              onClick={() => {
                setRevision(conflict.revision);
                setConflict(null);
                setStatus("Unsaved");
              }}
            >
              Save my version after review
            </button>
          )}
        </section>
      )}
    </section>
  );
}

type MissionItem = Extract<Item, { kind: "mission" }> & {
  versionId: string;
  progress?: { status: string } | null;
};
export function Projects() {
  const [release, setRelease] = useState(""),
    [stack, setStack] = useState(""),
    [project, setProject] = useState(""),
    [workType, setWorkType] = useState("");
  const q = useQuery({
    queryKey: ["missions"],
    queryFn: () => api<MissionItem[]>("/missions"),
  });
  const missions = q.data ?? [],
    releases = [...new Set(missions.map((m) => m.release))].sort(),
    stacks = [...new Set(missions.map((m) => m.stack))].sort(),
    projects = [...new Set(missions.map((m) => m.projectId))].sort(),
    workTypes = [...new Set(missions.map((m) => m.workType))].sort(),
    visible = missions.filter(
      (m) =>
        (!release || m.release === release) &&
        (!stack || m.stack === stack) &&
        (!project || m.projectId === project) &&
        (!workType || m.workType === workType),
    );
  return (
    <>
      <PageTitle
        kicker="LOCAL PROJECT MISSIONS"
        title="Work on the whole application."
      >
        Build features, investigate defects, and check your work in VS Code.
        Reports are self-reported.
      </PageTitle>
      <div className={styles.actions}>
        <label>
          Release
          <select value={release} onChange={(e) => setRelease(e.target.value)}>
            <option value="">All releases</option>
            {releases.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Stack
          <select value={stack} onChange={(e) => setStack(e.target.value)}>
            <option value="">All stacks</option>
            {stacks.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Project
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">All projects</option>
            {projects.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Work type
          <select
            value={workType}
            onChange={(e) => setWorkType(e.target.value)}
          >
            <option value="">All work types</option>
            {workTypes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        {(release || stack || project || workType) && (
          <button
            className={styles.ghost}
            onClick={() => {
              setRelease("");
              setStack("");
              setProject("");
              setWorkType("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>
      <State loading={q.isLoading} error={q.error}>
        <div className={styles.chapterGrid}>
          {visible.map((m) => (
            <Link
              key={m.id}
              to={"/projects/" + m.id}
              className={styles.chapterCard}
            >
              <span className={styles.eyebrow}>
                {m.release} · {m.stack} · {m.workType}
              </span>
              <h2>{m.title}</h2>
              <p>{m.bodyMarkdown}</p>
              <small>{m.progress?.status ?? "Open mission"} →</small>
            </Link>
          ))}
        </div>
        {missions.length === 0 ? (
          <p>No missions are published yet.</p>
        ) : (
          visible.length === 0 && <p>No missions match these filters.</p>
        )}
      </State>
    </>
  );
}
type MissionReport = {
  revision: number;
  checklist: boolean[];
  status: string;
  repositoryUrl?: string;
  commitHash?: string;
  report: { notes: string; command: string; outcome: string };
};
export function Mission() {
  const { missionId } = useParams();
  return <MissionWorkspace key={missionId} missionId={missionId!} />;
}
function MissionWorkspace({ missionId }: { missionId: string }) {
  const q = useQuery({
    queryKey: ["mission", missionId],
    queryFn: () => api<MissionItem>("/missions/" + missionId),
  });
  const p = useQuery({
    queryKey: ["mission-progress", missionId],
    queryFn: () =>
      api<MissionReport | null>("/missions/" + missionId + "/progress"),
  });
  const missionList = useQuery({
    queryKey: ["missions"],
    queryFn: () => api<MissionItem[]>("/missions"),
  });
  const [checks, setChecks] = useState<boolean[]>([]),
    [revision, setRevision] = useState(0),
    [url, setUrl] = useState(""),
    [commit, setCommit] = useState(""),
    [notes, setNotes] = useState(""),
    [command, setCommand] = useState(""),
    [outcome, setOutcome] = useState(""),
    [notice, setNotice] = useState(""),
    [hints, setHints] = useState<string[]>([]),
    [solution, setSolution] = useState("");
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current || !p.isSuccess || !q.data) return;
    initialized.current = true;
    if (p.data) {
      setChecks(p.data.checklist);
      setRevision(p.data.revision);
      setUrl(p.data.repositoryUrl ?? "");
      setCommit(p.data.commitHash ?? "");
      setNotes(p.data.report.notes);
      setCommand(p.data.report.command);
      setOutcome(p.data.report.outcome);
    } else setChecks(q.data.acceptanceCriteria.map(() => false));
  }, [p.isSuccess, p.data, q.data]);
  const m = q.data;
  const save = async (status: string) => {
    try {
      const r = await api<MissionReport>(
        "/missions/" + missionId + "/progress",
        "PUT",
        {
          clientEventId: eventId(),
          expectedRevision: revision,
          checklist: checks,
          status,
          repositoryUrl: url,
          commitHash: commit,
          report: { notes, command, outcome },
        },
      );
      setRevision(r.revision);
      setNotice(
        status === "completed"
          ? "Mission completed · self-reported."
          : "Progress saved.",
      );
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save report.");
    }
  };
  return (
    <State loading={q.isLoading || p.isLoading} error={q.error ?? p.error}>
      {m && (
        <>
          <Link to="/projects">← Projects</Link>
          <PageTitle
            kicker={m.release + " · " + m.stack + " · " + m.workType}
            title={m.title}
          />
          <Prose>{m.bodyMarkdown}</Prose>
          <section className={styles.panel}>
            <h2>Suggested prerequisites</h2>
            {m.prerequisiteIds.length === 0 ? (
              <p>This mission has no suggested prerequisites.</p>
            ) : missionList.isPending ? (
              <p>Resolving prerequisite links...</p>
            ) : missionList.isError ? (
              <div>
                <p>Could not resolve prerequisite links.</p>
                <button
                  className={styles.secondaryButton}
                  onClick={() => missionList.refetch()}
                >
                  Retry
                </button>
              </div>
            ) : (
              <ul>
                {m.prerequisiteIds.map((id) => {
                  const prerequisiteMission = missionList.data.find(
                    (item) => item.id === id,
                  );
                  return (
                    <li key={id}>
                      <Link
                        className={styles.textLink}
                        to={
                          prerequisiteMission
                            ? "/projects/" + id
                            : "/learn/chapters/" + id
                        }
                      >
                        {prerequisiteMission?.title ?? id} →
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className={styles.muted}>
              Prerequisites are guidance; you can start this mission at any
              time.
            </p>
          </section>
          <div className={styles.twoColumn}>
            <section className={styles.panel}>
              <h2>Set up your workspace</h2>
              <a
                className={styles.button}
                href={"/api/v1/assets/" + m.starterAssetId}
              >
                Download versioned starter ↓
              </a>
              <p className={styles.muted}>
                Starter: {m.starterAssetId}
                {m.starterCommit ? " · " + m.starterCommit : ""}
              </p>
              <h3>Setup</h3>
              <pre>{m.setup.join("\n")}</pre>
              <h3>Baseline checks</h3>
              <pre>{m.baselineChecks.join("\n")}</pre>
              <p>
                Baseline checks should pass before you start. Mission checks are
                expected to fail until the assignment is complete.
              </p>
              <h3>Relevant files</h3>
              <ul>
                {m.relevantFiles.map((f) => (
                  <li key={f}>
                    <code>{f}</code>
                  </li>
                ))}
              </ul>
              <h3>Verify your work</h3>
              <pre>{m.verificationCommands.join("\n")}</pre>
              <h3>Reflection</h3>
              <ul>
                {m.reflectionRubric.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <div className={styles.actions}>
                <button
                  className={styles.secondaryButton}
                  disabled={hints.length >= 3}
                  onClick={async () => {
                    try {
                      const r = await api<{ text: string }>(
                        "/missions/" + m.id + "/reveals",
                        "POST",
                        {
                          clientEventId: eventId(),
                          versionId: m.versionId,
                          revealKind: "hint",
                          hintIndex: hints.length,
                        },
                      );
                      setHints([...hints, r.text]);
                    } catch (e) {
                      setNotice(String(e));
                    }
                  }}
                >
                  Next hint
                </button>
                <button
                  className={styles.ghost}
                  onClick={async () => {
                    try {
                      const r = await api<{ text: string }>(
                        "/missions/" + m.id + "/reveals",
                        "POST",
                        {
                          clientEventId: eventId(),
                          versionId: m.versionId,
                          revealKind: "solution",
                        },
                      );
                      setSolution(r.text);
                    } catch (e) {
                      setNotice(String(e));
                    }
                  }}
                >
                  Reveal reference solution
                </button>
              </div>
              {hints.map((h, n) => (
                <Prose key={n}>{h}</Prose>
              ))}
              {solution && <Prose>{solution}</Prose>}
            </section>
            <section className={styles.panel}>
              <h2>Acceptance checklist</h2>
              {m.acceptanceCriteria.map((criterion, n) => (
                <label className={styles.checkbox} key={criterion}>
                  <input
                    type="checkbox"
                    checked={checks[n] ?? false}
                    onChange={(e) =>
                      setChecks(
                        m.acceptanceCriteria.map((_, i) =>
                          i === n ? e.target.checked : (checks[i] ?? false),
                        ),
                      )
                    }
                  />
                  {criterion}
                </label>
              ))}
              <h2>Your completion report</h2>
              <p className={styles.muted}>
                Stored as self-reported. The platform does not fetch your
                repository or run its code.
              </p>
              <label>
                Repository URL (optional)
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>
              <label>
                Commit hash (optional)
                <input
                  value={commit}
                  onChange={(e) => setCommit(e.target.value)}
                />
              </label>
              <label>
                Test command
                <input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                />
              </label>
              <label>
                Reported outcome
                <textarea
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                />
              </label>
              <label>
                Notes and reflection
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              <div className={styles.actions}>
                <button onClick={() => save("completed")}>
                  Report completion
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => save("in_progress")}
                >
                  Save progress
                </button>
              </div>
              <Notice text={notice} />
            </section>
          </div>
        </>
      )}
    </State>
  );
}
export function ContentPage() {
  type Release = {
    id: string;
    packageId: string;
    packageVersion: number;
    state: string;
    checksum: string;
    baseReleaseId: string | null;
    validationSummary: {
      added: string[];
      changed: string[];
      archived: string[];
      unchanged: string[];
      masteryChanged: string[];
    };
  };
  const q = usePages<Release>("releases", "/content/releases");
  const [draft, setDraft] = useState<Release | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <PageTitle
        kicker="CONTENT LIBRARY"
        title="Grow your course, deliberately."
      >
        Import a complete snapshot, inspect changes, then publish. Draft imports
        do not change your active lessons.
      </PageTitle>
      <section className={styles.panel}>
        <h2>Import a course snapshot</h2>
        <p>
          A snapshot replaces the active manifest. To add a chapter, combine it
          with the existing course using the content build command first. JSON
          only, up to 10 MiB.
        </p>
        <label>
          Content package
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 10485760) {
                setNotice("File exceeds 10 MiB.");
                return;
              }
              setBusy(true);
              setNotice("Validating package…");
              try {
                const pkg: ContentPackage = JSON.parse(await file.text());
                const result = await api<Release>("/content/imports", "POST", {
                  clientEventId: eventId(),
                  package: pkg,
                });
                setDraft(result);
                setNotice(
                  "Draft validated. Review the changes before publishing.",
                );
                await q.refetch();
              } catch (err) {
                setNotice(
                  err instanceof ApiError
                    ? err.message + "\n" + JSON.stringify(err.details, null, 2)
                    : String(err),
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {draft && (
          <section className={styles.preview}>
            <h3>
              Release preview · {draft.packageId} v{draft.packageVersion}
            </h3>
            <p>
              Built from release:{" "}
              {draft.baseReleaseId ?? "None (initial snapshot)"}
            </p>
            {Object.entries(draft.validationSummary).map(([kind, ids]) => (
              <details key={kind}>
                <summary>
                  {kind}: {ids.length}
                </summary>
                <p>{ids.join(", ") || "None"}</p>
              </details>
            ))}
            <button
              disabled={busy || draft.state === "published"}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(
                    "/content/imports/" + draft.id + "/publish",
                    "POST",
                    { clientEventId: eventId(), checksum: draft.checksum },
                  );
                  setNotice(
                    "Release published atomically. Existing learning history is preserved.",
                  );
                  setDraft(null);
                  await refresh();
                } catch (e) {
                  setNotice(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Publish this snapshot
            </button>
          </section>
        )}
        <Notice text={notice} />
      </section>
      <h2>Release history</h2>
      <State loading={q.isLoading} error={q.error}>
        <div className={styles.panel}>
          {q.rows.map((r) => (
            <div className={styles.row} key={r.id}>
              <span>
                {r.packageId} · version {r.packageVersion}
                <small>
                  {r.state}
                  {r.id === q.meta?.activeReleaseId ? " · Active" : ""}
                </small>
              </span>
              {r.state === "published" && r.id !== q.meta?.activeReleaseId && (
                <button
                  className={styles.secondaryButton}
                  onClick={async () => {
                    try {
                      await api(
                        "/content/releases/" + r.id + "/activate",
                        "POST",
                        {
                          clientEventId: eventId(),
                          expectedRevision: q.meta?.revision ?? 0,
                        },
                      );
                      setNotice(
                        "Earlier release activated. Newer attempts remain in your history.",
                      );
                      await refresh();
                    } catch (e) {
                      setNotice(String(e));
                    }
                  }}
                >
                  Activate release
                </button>
              )}
              {r.state === "draft" && (
                <button className={styles.ghost} onClick={() => setDraft(r)}>
                  Preview
                </button>
              )}
            </div>
          ))}
          {q.hasNextPage && (
            <button
              onClick={() => q.fetchNextPage()}
              disabled={q.isFetchingNextPage}
            >
              Load earlier releases
            </button>
          )}
        </div>
      </State>
    </>
  );
}
export function Settings({
  onLogout,
  onTheme,
}: {
  onLogout: () => void;
  onTheme: (theme: string) => void;
}) {
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: () =>
      api<{ email: string; timezone: string; theme: string; revision: number }>(
        "/settings",
      ),
  });
  const [theme, setTheme] = useState("system"),
    [timezone, setTimezone] = useState("UTC"),
    [password, setPassword] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0);
  const initialized = useRef(false);
  useEffect(() => {
    if (q.data && !initialized.current) {
      initialized.current = true;
      setTheme(q.data.theme);
      setTimezone(q.data.timezone);
      setRevision(q.data.revision);
    }
  }, [q.data]);
  return (
    <>
      <PageTitle
        kicker="PREFERENCES & ACCOUNT"
        title="Your workspace, your rhythm."
      />
      <State loading={q.isLoading} error={q.error}>
        <div className={styles.twoColumn}>
          <section className={styles.panel}>
            <h2>Appearance and time</h2>
            <label>
              Theme
              <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="system">Follow system</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              Display timezone
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="America/Los_Angeles"
              />
            </label>
            <button
              onClick={async () => {
                try {
                  const saved = await api<{ revision: number }>(
                    "/settings",
                    "PATCH",
                    {
                      clientEventId: eventId(),
                      expectedRevision: revision,
                      theme,
                      timezone,
                    },
                  );
                  setRevision(saved.revision);
                  onTheme(theme);
                  setNotice("Preferences saved.");
                  await q.refetch();
                } catch (e) {
                  setNotice(String(e));
                }
              }}
            >
              Save preferences
            </button>
            <h2>Keep a portable copy</h2>
            <p>
              Export your progress, notes, drafts, and content references as
              versioned JSON.
            </p>
            <a
              className={styles.secondaryButton}
              href="/api/v1/exports/progress"
            >
              Download learning records ↓
            </a>
          </section>
          <section className={styles.panel}>
            <h2>Owner account</h2>
            <p>{q.data?.email}</p>
            <button
              className={styles.secondaryButton}
              onClick={async () => {
                try {
                  await api("/auth/logout", "POST", {});
                  onLogout();
                } catch (e) {
                  setNotice(String(e));
                }
              }}
            >
              Sign out
            </button>
            <h3>Sign out all devices</h3>
            <label>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button
              className={styles.ghost}
              onClick={async () => {
                try {
                  await api("/auth/revoke-all", "POST", { password });
                  onLogout();
                } catch (e) {
                  setNotice(String(e));
                }
              }}
            >
              Revoke every session
            </button>
            <p className={styles.muted}>
              Password recovery uses the local owner:reset command. There is no
              public registration.
            </p>
          </section>
        </div>
        <Notice text={notice} />
      </State>
    </>
  );
}
export function Archive() {
  const { id } = useParams();
  const q = useQuery({
    queryKey: ["archive", id],
    queryFn: () => api<Item>("/archive/" + id),
  });
  return (
    <State loading={q.isLoading} error={q.error}>
      {q.data && (
        <>
          <PageTitle kicker="ARCHIVED CONTENT" title={q.data.title}>
            This item is no longer in the active release. Your notes and history
            are preserved.
          </PageTitle>
          <Prose>{q.data.bodyMarkdown}</Prose>
          {q.data.kind === "lesson" && (
            <Prose>{q.data.workedExampleMarkdown}</Prose>
          )}
        </>
      )}
    </State>
  );
}
