import { useEffect, useRef, useState } from "react";
import type { Grading } from "../../../packages/contracts/src/content";
import type { RunResult } from "../../../packages/runner/src/index";
import styles from "./Workspace.module.css";
export type PlacementRun = { status: string; passedCaseIds: string[] };
export default function PlacementCode({
  id,
  spec,
  onChange,
  onResult,
  onBusy,
}: {
  id: string;
  spec: Extract<Grading, { kind: "function-cases" }>;
  onChange: (source: string) => void;
  onResult: (result: PlacementRun | null) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [source, setSource] = useState(spec.starterCode),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [result, setResult] = useState<RunResult | null>(null);
  const current = useRef(source),
    worker = useRef<Worker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finish = () => {
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    setBusy(false);
    onBusy(false);
  };
  useEffect(
    () => () => {
      worker.current?.terminate();
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const run = () => {
    finish();
    onResult(null);
    setResult(null);
    setBusy(true);
    onBusy(true);
    setMessage("Initializing runner…");
    const code = current.current,
      runId = crypto.randomUUID(),
      w = new Worker(new URL("./runner.worker.ts", import.meta.url), {
        type: "module",
      });
    worker.current = w;
    timer.current = setTimeout(() => {
      if (worker.current === w) {
        finish();
        setMessage("Compiler loading exceeded one minute. Retry Run.");
      }
    }, 60000);
    w.onerror = () => {
      if (worker.current === w) {
        finish();
        setMessage("Runner failed to load. Retry Run.");
      }
    };
    w.onmessage = (event: MessageEvent<RunResult | { type: string }>) => {
      if (worker.current !== w) return;
      if ("type" in event.data) {
        if (timer.current) clearTimeout(timer.current);
        setMessage("Checking code…");
        timer.current = setTimeout(() => {
          finish();
          setMessage("Execution stopped by watchdog.");
        }, 5000);
        w.postMessage({
          protocolVersion: 1,
          runId,
          exerciseId: id,
          exerciseVersionId: id,
          source: code,
          spec,
        });
        return;
      }
      if (event.data.runId !== runId) return;
      finish();
      if (current.current !== code) {
        setMessage(
          "Code changed during the run. Run the current version before submitting.",
        );
        return;
      }
      setResult(event.data);
      setMessage(event.data.status.replaceAll("_", " "));
      onChange(code);
      onResult({
        status: event.data.status,
        passedCaseIds: event.data.cases
          .filter((c) => c.passed)
          .map((c) => c.id),
      });
    };
    w.postMessage({ type: "initialize", language: spec.language });
  };
  return (
    <section>
      <label htmlFor={id + "-code"}>{spec.language} assessment code</label>
      <textarea
        id={id + "-code"}
        className={styles.codeEditor}
        spellCheck={false}
        value={source}
        onChange={(e) => {
          current.current = e.target.value;
          setSource(e.target.value);
          onChange(e.target.value);
          onResult(null);
          setResult(null);
        }}
      />
      <div className={styles.actions}>
        <button type="button" disabled={busy} onClick={run}>
          Run assessment code
        </button>
        {busy && (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              finish();
              setMessage("Cancelled. Your source is preserved.");
            }}
          >
            Stop
          </button>
        )}
      </div>
      <p role="status">{message}</p>
      {result && (
        <div>
          {result.diagnostics.map((d, n) => (
            <pre key={n}>{d}</pre>
          ))}
          <p>
            {result.cases.filter((c) => c.passed).length}/{spec.cases.length}{" "}
            cases passed · browser automated feedback
          </p>
        </div>
      )}
      <p className={styles.muted}>
        No hints or reference solution appear before assessment submission.
      </p>
    </section>
  );
}
