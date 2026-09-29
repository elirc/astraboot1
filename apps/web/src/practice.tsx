import { DraftHistory } from "./draft-history";
import { useDateFormat } from "./collections";
import { AnswerForm } from "./answer-form";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type {
  Exercise,
  Item,
  Json,
  Lesson,
} from "../../../packages/contracts/src/content";
import type { RunResult } from "../../../packages/runner/src/index";
import { api, eventId, refresh } from "./api";
import { useDraft } from "./use-draft";
import { PageTitle, Prose, State, Notice } from "./ui";
import styles from "./Workspace.module.css";
const Editor = lazy(() => import("./editor"));
export default function Practice() {
  const { exerciseId } = useParams();
  const q = useQuery({
    queryKey: ["exercise", exerciseId],
    queryFn: () =>
      api<Exercise & { versionId: string }>("/exercises/" + exerciseId),
  });
  return (
    <State loading={q.isLoading} error={q.error}>
      {q.data && (
        <ExerciseWorkspace
          key={q.data.id + ":" + q.data.versionId}
          exercise={q.data}
        />
      )}
    </State>
  );
}
function ExerciseWorkspace({
  exercise: ex,
}: {
  exercise: Exercise & { versionId: string };
}) {
  const formatDate = useDateFormat();
  const functionSpec = ex.grading.kind === "function-cases" ? ex.grading : null;
  const relatedMission = useQuery({
    queryKey: ["local-task-mission", ex.lessonId],
    enabled: ex.type === "local-task",
    queryFn: async () => {
      const [lesson, missions] = await Promise.all([
        api<Lesson>("/lessons/" + ex.lessonId),
        api<Extract<Item, { kind: "mission" }>[]>("/missions"),
      ]);
      return (
        missions.find((mission) =>
          mission.prerequisiteIds.includes(lesson.chapterId),
        ) ?? null
      );
    },
  });
  const draft = useDraft(ex.id, ex.versionId, functionSpec?.starterCode ?? "");
  const [answer, setAnswer] = useState<Json>(""),
    [result, setResult] = useState<RunResult | null>(null),
    [feedback, setFeedback] = useState(""),
    [hints, setHints] = useState<string[]>([]),
    [solution, setSolution] = useState(""),
    [self, setSelf] = useState(false),
    [busy, setBusy] = useState(false),
    [runState, setRunState] = useState(""),
    [plain, setPlain] = useState(true);
  const worker = useRef<Worker | null>(null),
    active = useRef(""),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    currentSource = useRef(draft.text);
  currentSource.current = draft.text;
  const stop = () => {
    active.current = "";
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    setBusy(false);
    setRunState("Cancelled. Your code is preserved.");
  };
  const changeSource = (source: string) => {
    currentSource.current = source;
    draft.setSource(source);
    setResult(null);
    if (active.current) {
      stop();
      setRunState("Code changed. Run the current version to check it.");
    }
  };
  useEffect(
    () => () => {
      worker.current?.terminate();
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function submit(r?: RunResult, source = draft.text) {
    try {
      const saved = await api<{
        passed: boolean;
        gradingOrigin: string;
        assistance: string;
        feedback: string[];
        modelAnswer?: string;
      }>("/attempts", "POST", {
        clientEventId: eventId(),
        exerciseId: ex.id,
        exerciseVersionId: ex.versionId,
        ...(functionSpec
          ? {
              source,
              runnerResult: {
                status: r?.status ?? "failed",
                passedCaseIds:
                  r?.cases.filter((c) => c.passed).map((c) => c.id) ?? [],
                durationMs: r?.durationMs ?? 0,
              },
            }
          : { answer, selfAssessment: self }),
      });
      setFeedback(
        (saved.passed ? "✓ Passed" : "Try again") +
          " · " +
          saved.gradingOrigin.replaceAll("_", " ") +
          " · Assistance: " +
          saved.assistance.replaceAll("_", " ") +
          "\n" +
          saved.feedback.join("\n"),
      );
      if (saved.modelAnswer) setSolution(saved.modelAnswer);
      await refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not submit.");
    }
  }
  function runCode() {
    if (!functionSpec) return;
    stop();
    setResult(null);
    setBusy(true);
    setRunState("Initializing compiler and runner…");
    const source = currentSource.current,
      runId = crypto.randomUUID();
    active.current = runId;
    const w = new Worker(new URL("./runner.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    timer.current = setTimeout(() => {
      if (active.current === runId) {
        stop();
        setRunState("Compiler loading exceeded one minute. Retry Run.");
      }
    }, 60000);
    w.onerror = () => {
      stop();
      setRunState("Runner failed to load. Retry Run.");
    };
    w.onmessage = (event: MessageEvent<RunResult | { type: string }>) => {
      if (worker.current !== w || active.current !== runId) return;
      if ("type" in event.data) {
        if (timer.current) clearTimeout(timer.current);
        setRunState("Checking types and running cases…");
        timer.current = setTimeout(() => {
          stop();
          setRunState("Execution stopped by watchdog.");
        }, 5000);
        w.postMessage({
          protocolVersion: 1,
          runId,
          exerciseId: ex.id,
          exerciseVersionId: ex.versionId,
          source,
          spec: functionSpec,
        });
        return;
      }
      if (event.data.runId !== runId) return;
      if (timer.current) clearTimeout(timer.current);
      w.terminate();
      worker.current = null;
      active.current = "";
      setBusy(false);
      if (currentSource.current !== source) {
        setRunState("Code changed. Run the current version to check it.");
        return;
      }
      setResult(event.data);
      setRunState(event.data.status.replaceAll("_", " "));
      void submit(event.data, source);
    };
    w.postMessage({ type: "initialize", language: functionSpec.language });
  }
  const reveal = async (kind: "hint" | "solution") => {
    try {
      const r = await api<{
        text:
          | string
          | {
              code?: string;
              modelAnswer?: string;
              explanationMarkdown: string;
            };
      }>("/exercises/" + ex.id + "/reveals", "POST", {
        clientEventId: eventId(),
        versionId: ex.versionId,
        revealKind: kind,
        ...(kind === "hint" ? { hintIndex: hints.length } : {}),
      });
      const text =
        typeof r.text === "string"
          ? r.text
          : (r.text.code
              ? "\n~~~" +
                (functionSpec?.language ?? "") +
                "\n" +
                r.text.code +
                "\n~~~\n"
              : "") +
            (r.text.modelAnswer ?? "") +
            "\n" +
            r.text.explanationMarkdown;
      if (kind === "hint") setHints([...hints, text]);
      else setSolution(text);
    } catch (e) {
      setFeedback(String(e));
    }
  };
  return (
    <>
      <Link className={styles.textLink} to={"/learn/lessons/" + ex.lessonId}>
        ← Back to lesson
      </Link>
      <PageTitle
        kicker={ex.type.toUpperCase() + " · " + ex.estimatedMinutes + " MIN"}
        title={ex.title}
      />
      <div className={styles.lessonWorkspace}>
        <section className={styles.instruction}>
          <Prose>{ex.promptMarkdown}</Prose>
          {functionSpec && (
            <p className={styles.muted}>
              Single-file {functionSpec.language}. JSON inputs and results. No
              imports, browser APIs, network, or Node APIs.
            </p>
          )}
          {ex.type === "local-task" && (
            <section className={styles.panel}>
              <h2>Continue in a project</h2>
              {relatedMission.isLoading ? (
                <p>Finding the related mission...</p>
              ) : relatedMission.data ? (
                <Link
                  className={styles.secondaryButton}
                  to={"/projects/" + relatedMission.data.id}
                >
                  Open {relatedMission.data.title} →
                </Link>
              ) : (
                <p className={styles.muted}>
                  No related project mission is published for this chapter yet.
                </p>
              )}
            </section>
          )}
          {hints.map((h, n) => (
            <div className={styles.hint} key={n}>
              <strong>Hint {n + 1}</strong>
              <Prose>{h}</Prose>
            </div>
          ))}
          <div className={styles.actions}>
            <button
              className={styles.secondaryButton}
              disabled={hints.length >= 3}
              onClick={() => reveal("hint")}
            >
              Reveal next hint
            </button>
            <button className={styles.ghost} onClick={() => reveal("solution")}>
              Reveal solution
            </button>
          </div>
          <p className={styles.muted}>
            Revealing the solution records solution assistance for this practice
            revision, including later retries.
          </p>
          {solution && (
            <details open>
              <summary>Stored model answer</summary>
              <Prose>{solution}</Prose>
            </details>
          )}
        </section>
        <section className={styles.practicePanel}>
          {functionSpec ? (
            <>
              <div className={styles.editorHeader}>
                <span>
                  {functionSpec.language === "typescript"
                    ? "exercise.ts"
                    : "exercise.js"}
                </span>
                <span role="status">{draft.status}</span>
              </div>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={plain}
                  onChange={(e) => setPlain(e.target.checked)}
                />
                Plain text editor
              </label>
              {plain ? (
                <textarea
                  disabled={draft.status === "Loading"}
                  className={styles.codeEditor}
                  aria-label="Exercise code"
                  spellCheck={false}
                  value={draft.text}
                  onChange={(e) => changeSource(e.target.value)}
                />
              ) : (
                <Suspense fallback={<p>Loading editor…</p>}>
                  <Editor
                    value={draft.text}
                    onChange={changeSource}
                    typescript={functionSpec.language === "typescript"}
                  />
                </Suspense>
              )}
              <div className={styles.actions}>
                <button onClick={runCode} disabled={busy}>
                  {busy ? "Running…" : "Run & check"}
                </button>
                {busy && (
                  <button className={styles.secondaryButton} onClick={stop}>
                    Stop
                  </button>
                )}
                <button
                  className={styles.secondaryButton}
                  onClick={() => draft.retry()}
                >
                  Save
                </button>
                <button
                  className={styles.ghost}
                  onClick={async () => {
                    if (
                      draft.dirty &&
                      !window.confirm(
                        "Replace unsaved code with the starter? Your current code will be saved as a recoverable snapshot.",
                      )
                    )
                      return;
                    if (await draft.save(true, "reset")) {
                      changeSource(functionSpec.starterCode);
                      await draft.save(true, "reset");
                    }
                  }}
                >
                  Reset starter
                </button>
              </div>
              <DraftHistory
                id={ex.id}
                onRestore={(source) => {
                  if (
                    !draft.dirty ||
                    window.confirm("Replace the unsaved code in your editor?")
                  )
                    changeSource(source);
                }}
              />
              <p role="status">{runState}</p>
              {result && (
                <div className={styles.results}>
                  <strong>
                    {result.status === "passed"
                      ? "✓ All cases passed"
                      : "Result: " + result.status.replaceAll("_", " ")}
                  </strong>
                  {result.diagnostics.map((d, i) => (
                    <pre key={i}>{d}</pre>
                  ))}
                  {result.cases.map((c) => (
                    <div className={styles.row} key={c.id}>
                      <span>
                        {c.passed ? "✓" : "✕"} {c.id}
                      </span>
                      <code>{JSON.stringify(c.actual)}</code>
                    </div>
                  ))}
                  {result.console.length > 0 && (
                    <details>
                      <summary>Console ({result.console.length} lines)</summary>
                      <pre>{result.console.join("\n")}</pre>
                    </details>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <AnswerForm
                grading={ex.grading}
                value={answer}
                onChange={setAnswer}
              />
              {ex.grading.kind === "rubric" && (
                <>
                  <h3>Self-assessment criteria</h3>
                  <ul>
                    {ex.grading.criteria.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={self}
                      onChange={(e) => setSelf(e.target.checked)}
                    />
                    My response meets these criteria.
                  </label>
                </>
              )}
              <button onClick={() => submit()}>Check response</button>
            </>
          )}
          <Notice text={feedback} />
          {draft.conflict && (
            <section role="alert" className={styles.conflict}>
              <h3>Both versions are preserved</h3>
              <p>Server version · {formatDate(draft.conflict.updatedAt)}</p>
              <pre>{draft.conflict.source}</pre>
              <p>
                Your version remains in the editor. Edit it to merge, then save.
              </p>
              <button onClick={draft.keepServer}>Keep server</button>
              <button onClick={draft.keepMine}>
                Save my version after review
              </button>
            </section>
          )}
        </section>
      </div>
      {draft.blocker.state === "blocked" && (
        <div
          className={styles.conflict}
          role="alertdialog"
          aria-label="Unsaved changes"
        >
          <p>You have unsaved code.</p>
          <button onClick={() => draft.blocker.reset?.()}>Stay</button>
          <button onClick={() => draft.blocker.proceed?.()}>
            Leave without saving
          </button>
        </div>
      )}
    </>
  );
}
