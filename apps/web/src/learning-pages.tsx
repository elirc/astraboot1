import { usePages, useDateFormat } from "./collections";
import { useState, useEffect, useRef } from "react";
import { Link, useParams, useBlocker, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, envelope, eventId, refresh, recoveryKey, type Progress } from "./api";
import type {
  Item,
  Lesson,
  Exercise,
} from "../../../packages/contracts/src/content";
import { PageTitle, State, Prose, Notice } from "./ui";
import styles from "./Workspace.module.css";
type ChapterItem = Extract<Item, { kind: "chapter" }> & {
  progress: { status: string }[];
  placedOut: boolean;
};
type TrackItem = Extract<Item, { kind: "track" }>;
type QuickNoteRecovery = {
  body: string;
  pending?: { fingerprint: string; clientEventId: string };
};
const quickNoteKey = (lessonId: string) => recoveryKey("lesson-note", lessonId);
function readQuickNote(lessonId: string): QuickNoteRecovery | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(quickNoteKey(lessonId)) ?? "null",
    );
    return value && typeof value.body === "string" ? value : null;
  } catch {
    return null;
  }
}
function writeQuickNote(lessonId: string, value: QuickNoteRecovery | null) {
  try {
    if (value)
      localStorage.setItem(quickNoteKey(lessonId), JSON.stringify(value));
    else localStorage.removeItem(quickNoteKey(lessonId));
  } catch {}
}
export function Today() {
  const formatDate = useDateFormat();
  const p = useQuery({
    queryKey: ["progress"],
    queryFn: () => api<Progress>("/progress"),
    refetchInterval: 30000,
  });
  const a = useQuery({
    queryKey: ["activity"],
    queryFn: () =>
      api<
        { id: string; kind: string; contentItemId: string; createdAt: string }[]
      >("/activity"),
    refetchInterval: 30000,
  });
  const c = useQuery({
    queryKey: ["curriculum"],
    queryFn: () => api<ChapterItem[]>("/curriculum?limit=100"),
  });
  const progress = p.data;
  const unfinished = progress?.lessons.find((l) => l.status === "in_progress");
  const activeMission = progress?.missions.find(
    (mission) => mission.status === "in_progress",
  );
  const completed = new Set(progress?.lessons.filter(l => l.status === "completed").map(l => l.lessonId));
  const first = c.data?.flatMap(chapter => chapter.lessonIds).find(id => !completed.has(id));
  return (
    <>
      <PageTitle
        kicker="YOUR DAILY PRACTICE"
        title="A little progress, every day."
      >
        Continue a lesson, revisit a concept, or put your skills to work.
      </PageTitle>
      <State loading={p.isLoading} error={p.error}>
        <div className={styles.stats}>
          <div>
            <span>Lessons completed</span>
            <strong>
              {progress?.lessons.filter((l) => l.status === "completed")
                .length ?? 0}
              <small> / {progress?.totalLessonCount ?? 0}</small>
            </strong>
          </div>
          <div>
            <span>Ready to review</span>
            <strong>
              {progress?.dueReviews ?? 0}
              <small> cards</small>
            </strong>
          </div>
          <div>
            <span>Practice earned</span>
            <strong>
              {progress?.totalXP ?? 0}
              <small> XP · Level {progress?.level ?? 1}</small>
            </strong>
          </div>
        </div>
        <div className={styles.twoColumn}>
          <section className={styles.continueCard}>
            <p className={styles.eyebrow}>
              {unfinished
                ? "PICK UP WHERE YOU LEFT OFF"
                : "START WITH THE FOUNDATIONS"}
            </p>
            <h2>
              {unfinished
                ? "Continue your lesson"
                : "From a request to a working application"}
            </h2>
            <p>
              Read the explanation, work through the exercises, and make the
              ideas your own.
            </p>
            {unfinished?.lessonId || first ? (
              <Link
                className={styles.button}
                to={"/learn/lessons/" + (unfinished?.lessonId || first)}
              >
                {unfinished ? "Resume lesson" : "Open first lesson"}{" "}
                <span>→</span>
              </Link>
            ) : (
              <p>
                No course is published yet. Import a validated snapshot in
                Content.
              </p>
            )}
            <Link className={styles.textLink} to="/learn">
              Browse all chapters →
            </Link>
          </section>
          <section className={styles.panel}>
            <p className={styles.eyebrow}>KEEP IT FRESH</p>
            <h2>
              {progress?.dueReviews
                ? progress.dueReviews + " cards are ready"
                : "Your review queue is clear"}
            </h2>
            <p>
              Cards appear when you complete a lesson or add it to review.
              Practice is scheduled from your last response.
            </p>
            <Link className={styles.secondaryButton} to="/review">
              Open review queue →
            </Link>
          </section>
        </div>
        <div className={styles.sectionHeading}>
          <h2>Current project</h2>
          <Link to="/projects">All projects →</Link>
        </div>
        <div className={styles.panel}>
          {activeMission ? (
            <div className={styles.row}>
              <span>
                Mission in progress
                <small>{activeMission.missionId}</small>
              </span>
              <Link
                className={styles.secondaryButton}
                to={"/projects/" + activeMission.missionId}
              >
                Continue mission →
              </Link>
            </div>
          ) : (
            <p className={styles.muted}>
              No project mission is in progress. Start one when you are ready to
              apply a chapter in a local codebase.
            </p>
          )}
        </div>
        <div className={styles.sectionHeading}>
          <h2>Your learning path</h2>
          <Link to="/learn">View curriculum →</Link>
        </div>
        <div className={styles.chapterGrid}>
          {c.data?.slice(0, 3).map((ch) => (
            <ChapterCard key={ch.id} chapter={ch} />
          ))}
        </div>
        <div className={styles.sectionHeading}>
          <h2>Recent activity</h2>
        </div>
        <div className={styles.panel}>
          {a.data?.length ? (
            a.data.slice(0, 5).map((event) => (
              <div className={styles.row} key={event.id}>
                <span>
                  {event.kind.replaceAll("_", " ")} · {event.contentItemId}
                </span>
                <time>{formatDate(event.createdAt, true)}</time>
              </div>
            ))
          ) : (
            <p className={styles.muted}>
              Your learning activity will appear here after your first exercise.
            </p>
          )}
        </div>
      </State>
    </>
  );
}
function ChapterCard({ chapter: ch }: { chapter: ChapterItem }) {
  const completed =
    ch.progress?.filter((p) => p.status === "completed").length ?? 0;
  return (
    <Link className={styles.chapterCard} to={"/learn/chapters/" + ch.id}>
      <span className={styles.chapterNumber}>
        {String(ch.sequence).padStart(2, "0")}
      </span>
      <span className={styles.eyebrow}>
        {ch.release} · {ch.lessonIds.length} LESSONS
      </span>
      <h3>{ch.title}</h3>
      <p>{ch.bodyMarkdown}</p>
      <div className={styles.progressTrack}>
        <span
          style={{ width: (completed / ch.lessonIds.length) * 100 + "%" }}
        />
      </div>
      <small>
        {ch.placedOut
          ? "Placed out"
          : completed + " of " + ch.lessonIds.length + " completed"}{" "}
        <span>→</span>
      </small>
    </Link>
  );
}
export function Catalog() {
  const [params, setParams] = useSearchParams();
  const filter = params.get("q") ?? "";
  const track = params.get("track") ?? "";
  const setFilter = (value: string) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set("q", value); else next.delete("q");
    return next;
  }, { replace: true });
  const setTrack = (value: string) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set("track", value); else next.delete("track");
    return next;
  });
  const q = usePages<ChapterItem>(
    "catalog",
    "/curriculum?q=" +
      encodeURIComponent(filter) +
      (track ? "&track=" + encodeURIComponent(track) : ""),
  );
  const inventory = useQuery({
    queryKey: ["catalog-inventory"],
    queryFn: () => envelope<ChapterItem[]>("/curriculum?limit=100"),
  });
  const tracks = (inventory.data?.meta as { tracks?: TrackItem[] } | undefined)?.tracks ?? [];
  const chapters = inventory.data?.data ?? [];
  const totalLessons = chapters.reduce((sum, chapter) => sum + chapter.lessonIds.length, 0);
  const completedLessons = chapters.reduce((sum, chapter) => sum + (chapter.progress?.filter(p => p.status === "completed").length ?? 0), 0);
  return (
    <>
      <PageTitle kicker="YOUR LEARNING LIBRARY" title="Build skills. Go deeper.">
        Start with the foundations, then explore JavaScript, interface craft,
        and everyday engineering. Each chapter includes worked examples,
        practice, and spaced review. Every chapter stays open.
      </PageTitle>
      {inventory.data && <div className={styles.libraryOverview} aria-label="Learning library overview">
        <div><strong>{chapters.length}</strong><span>chapters to explore</span></div>
        <div><strong>{totalLessons}</strong><span>guided lessons</span></div>
        <div><strong>{completedLessons}<small> / {totalLessons}</small></strong><span>lessons completed</span></div>
      </div>}
        <div className={styles.sectionHeading}><h2>Choose your path</h2><span className={styles.muted}>Build on what you know</span></div>
        <div className={styles.trackGrid}>
          {tracks.map((item) => (
            <article className={`${styles.trackCard} ${track === item.id ? styles.trackSelected : ""}`} key={item.id}>
              <span className={styles.eyebrow}>
                {item.chapterIds.length} CHAPTERS
              </span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <button
                aria-pressed={track === item.id}
                aria-label={(track === item.id ? "Show all paths instead of " : "Explore ") + item.title}
                className={
                  track === item.id ? undefined : styles.secondaryButton
                }
                onClick={() => setTrack(track === item.id ? "" : item.id)}
              >
                {track === item.id ? "Selected path · Show all" : "Explore path →"}
              </button>
            </article>
          ))}
        </div>
        {!q.isLoading && !q.error && tracks.length === 0 && (
          <p>No published learning tracks are available yet.</p>
        )}
        <div className={styles.sectionHeading}><h2>{tracks.find(item => item.id === track)?.title ?? "All chapters"}</h2><span className={styles.muted}>Read · Practice · Review</span></div>
        <div className={styles.catalogFilters}>
          <label className={styles.search}>
            Find a chapter
            <input
              value={filter}
              type="search"
              maxLength={200}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search JavaScript, React, SQL..."
            />
          </label>
          <label>
            Track
            <select value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="">All published tracks</option>
              {tracks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          {(filter || track) && <button className={styles.secondaryButton} onClick={() => setParams({})}>Clear filters</button>}
        </div>
      <State loading={q.isLoading} error={q.error}>
        <p className={styles.muted} role="status">{q.rows.length} {q.hasNextPage ? "chapters loaded" : "matching chapters"}{filter ? ` for “${filter}”` : ""}</p>
        <div className={styles.chapterGrid}>
          {q.rows.map((c) => (
            <ChapterCard key={c.id} chapter={c} />
          ))}
        </div>
        {q.rows.length === 0 && (
          <div className={styles.empty}>
            <h3>{filter || track ? "No chapters match these filters." : "Your learning library is ready for a course."}</h3>
            <p>{filter || track ? "Try a broader topic or explore another path." : "Open Content to import a validated course snapshot."}</p>
            {filter || track ? <button onClick={() => setParams({})}>Show all chapters</button> : <Link to="/content">Open Content →</Link>}
          </div>
        )}
        {q.hasNextPage && (
          <button
            disabled={q.isFetchingNextPage}
            onClick={() => q.fetchNextPage()}
          >
            Load more chapters
          </button>
        )}
      </State>
    </>
  );
}
export function Chapter() {
  const { chapterId } = useParams();
  const q = useQuery({
    queryKey: ["chapter", chapterId],
    queryFn: () => api<ChapterItem>("/chapters/" + chapterId),
  });
  const lessons = useQuery({
    queryKey: ["chapter-lessons", chapterId, q.data?.lessonIds],
    queryFn: () =>
      Promise.all(q.data!.lessonIds.map((id) => api<Lesson>("/lessons/" + id))),
    enabled: !!q.data,
  });
  const c = q.data;
  return (
    <State loading={q.isLoading} error={q.error}>
      {c && (
        <>
          <Link className={styles.textLink} to="/learn">
            ← Curriculum
          </Link>
          <PageTitle
            kicker={"CHAPTER " + String(c.sequence).padStart(2, "0")}
            title={c.title}
          >
            {c.bodyMarkdown}
          </PageTitle>
          <div className={styles.twoColumn}>
            <section className={styles.panel}>
              <h2>What you’ll practice</h2>
              <ul>
                {c.objectiveIds.map((id) => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
              <h3>Suggested prerequisites</h3>
              {c.prerequisiteIds.length ? (
                c.prerequisiteIds.map((id) => (
                  <Link
                    className={styles.textLink}
                    key={id}
                    to={"/learn/chapters/" + id}
                  >
                    {id} →
                  </Link>
                ))
              ) : (
                <p>This is a good place to begin.</p>
              )}
            </section>
            <section className={styles.panel}>
              <p className={styles.eyebrow}>ALREADY FAMILIAR?</p>
              <h2>Try the placement assessment</h2>
              <p>
                Five questions. Four correct answers and every critical item are
                required. Placement records its own evidence.
              </p>
              <Link
                className={styles.secondaryButton}
                to={"/placement/" + c.id}
              >
                Take placement →
              </Link>
            </section>
          </div>
          <h2>Lessons</h2>
          <div className={styles.panel}>
            {lessons.data?.map((l, n) => (
              <Link
                className={styles.lessonRow}
                key={l.id}
                to={"/learn/lessons/" + l.id}
              >
                <span className={styles.chapterNumber}>{n + 1}</span>
                <div>
                  <h3>{l.title}</h3>
                  <p>
                    {l.estimatedMinutes} min read · {l.exerciseIds.length} activities · {l.reviewCardIds.length} review cards
                  </p>
                </div>
                <span>→</span>
              </Link>
            ))}
          </div>
          {c.missionIds.length > 0 && (
            <section>
              <h2>Put it into practice</h2>
              {c.missionIds.map((id) => (
                <Link
                  className={styles.secondaryButton}
                  key={id}
                  to={"/projects/" + id}
                >
                  Project {id} →
                </Link>
              ))}
            </section>
          )}
        </>
      )}
    </State>
  );
}
export function LessonPage() {
  const { lessonId } = useParams();
  return <LessonWorkspace key={lessonId} lessonId={lessonId!} />;
}
function LessonWorkspace({ lessonId }: { lessonId: string }) {
  const q = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => api<Lesson>("/lessons/" + lessonId),
  });
  const exercises = useQuery({
    queryKey: ["lesson-exercises", lessonId, q.data?.exerciseIds],
    queryFn: () =>
      Promise.all(
        q.data!.exerciseIds.map((id) => api<Exercise>("/exercises/" + id)),
      ),
    enabled: !!q.data,
  });
  const [read, setRead] = useState(false),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState("Instruction"),
    [note, setNote] = useState(() => readQuickNote(lessonId!)?.body ?? ""),
    [noteSaving, setNoteSaving] = useState(false);
  const quickMutation = useRef(readQuickNote(lessonId!)?.pending ?? null),
    quickInflight = useRef(false),
    currentNote = useRef(note);
  currentNote.current = note;
  const p = useQuery({
    queryKey: ["progress", lessonId],
    queryFn: () => api<Progress>("/progress?lessonId=" + lessonId),
  });
  const lesson = q.data;
  const chapter = useQuery({
    queryKey: ["chapter", lesson?.chapterId],
    queryFn: () => api<ChapterItem>("/chapters/" + lesson!.chapterId),
    enabled: !!lesson,
  });
  const index = chapter.data?.lessonIds.indexOf(lessonId!) ?? -1;
  const adjacent = chapter.data?.lessonIds ?? [];
  const blocker = useBlocker(!!note.trim());
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("Leave this lesson with an unsaved note?"))
        blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    setRead(false);
    setNotice("");
    setTab("Instruction");
    const recovered = readQuickNote(lessonId!);
    quickMutation.current = recovered?.pending ?? null;
    setNote(recovered?.body ?? "");
  }, [lessonId]);
  useEffect(() => {
    if (note)
      writeQuickNote(lessonId!, {
        body: note,
        ...(quickMutation.current ? { pending: quickMutation.current } : {}),
      });
    else writeQuickNote(lessonId!, null);
  }, [lessonId, note]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (note.trim()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [note]);
  const saveQuickNote = async () => {
    const submitted = currentNote.current,
      body = submitted.trim();
    if (!body || !lesson || quickInflight.current) return;
    quickInflight.current = true;
    setNoteSaving(true);
    const fingerprint = JSON.stringify({
        title: lesson.title,
        body,
        contentItemId: lesson.id,
      }),
      clientEventId =
        quickMutation.current?.fingerprint === fingerprint
          ? quickMutation.current.clientEventId
          : eventId();
    quickMutation.current = { fingerprint, clientEventId };
    writeQuickNote(lessonId!, {
      body: submitted,
      pending: quickMutation.current,
    });
    try {
      await api("/notes", "POST", {
        clientEventId,
        title: lesson.title,
        body,
        contentItemId: lesson.id,
      });
      quickMutation.current = null;
      if (currentNote.current === submitted) {
        writeQuickNote(lessonId!, null);
        setNote("");
      } else writeQuickNote(lessonId!, { body: currentNote.current });
      setNotice("Note saved.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save note.");
    } finally {
      quickInflight.current = false;
      setNoteSaving(false);
    }
  };
  useEffect(() => {
    const retry = () => {
      if (quickMutation.current) void saveQuickNote();
    };
    window.addEventListener("online", retry);
    window.addEventListener("session-restored", retry);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("session-restored", retry);
    };
  }, [lessonId, note, lesson?.title]);
  const act = async (action: string) => {
    try {
      await api("/lessons/" + lessonId + "/" + action, "POST", {
        clientEventId: eventId(),
        ...(action === "complete" ? { readAcknowledged: read } : {}),
      });
      setNotice(
        action === "complete"
          ? "Lesson completed. Your cards are ready for review."
          : action === "skip"
            ? "Lesson skipped. Existing evidence is preserved."
            : "Cards added to review.",
      );
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save.");
    }
  };
  return (
    <State loading={q.isLoading} error={q.error}>
      {lesson && (
        <>
          <Link
            className={styles.textLink}
            to={"/learn/chapters/" + lesson.chapterId}
          >
            ← Chapter
          </Link>
          <PageTitle
            kicker={"LESSON · " + lesson.estimatedMinutes + " MIN READ"}
            title={lesson.title}
          />
          <div className={styles.mobileTabs}>
            {["Instruction", "Practice", "Results"].map((t) => (
              <button
                key={t}
                className={tab === t ? styles.selected : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className={styles.lessonWorkspace}>
            <article
              className={
                styles.instruction +
                " " +
                (tab !== "Instruction" ? styles.mobileHidden : "")
              }
            >
              <div className={styles.objectives}>
                <h2>By the end, you can</h2>
                <ul>
                  {lesson.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
              <Prose>{lesson.bodyMarkdown}</Prose>
              <h2>A worked example</h2>
              <Prose>{lesson.workedExampleMarkdown}</Prose>
              <nav aria-label="Lesson navigation" className={styles.actions}>
                {index > 0 && (
                  <Link to={"/learn/lessons/" + adjacent[index - 1]}>
                    ← Previous lesson
                  </Link>
                )}
                {index >= 0 && index < adjacent.length - 1 && (
                  <Link to={"/learn/lessons/" + adjacent[index + 1]}>
                    Next lesson →
                  </Link>
                )}
              </nav>
              <h2>Common mistakes</h2>
              <ul>
                {lesson.commonMistakes.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <h2>Take this with you</h2>
              <Prose>{lesson.summary}</Prose>
              <details>
                <summary>Documentation references</summary>
                <ul>
                  {lesson.references.map((r) => (
                    <li key={r}>
                      <a href={r} target="_blank" rel="noreferrer">
                        {new URL(r).hostname}
                        {new URL(r).pathname}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={read}
                  onChange={(e) => setRead(e.target.checked)}
                />
                I’ve read the explanation and worked example.
              </label>
              <div className={styles.actions}>
                <button onClick={() => act("complete")}>Complete lesson</button>
                <button className={styles.ghost} onClick={() => act("skip")}>
                  Skip for now
                </button>
              </div>
            </article>
            <aside
              className={
                styles.practicePanel +
                " " +
                (tab === "Instruction" ? styles.mobileHidden : "")
              }
            >
              <p className={styles.eyebrow}>MAKE IT STICK</p>
              <h2>Practice the ideas</h2>
              {p.data?.lessons.some(
                (l) => l.lessonId === lesson.id && l.status === "completed",
              ) &&
                exercises.data?.some(
                  (ex) =>
                    !p.data?.exercisePasses.some(
                      (a) =>
                        a.itemId === ex.id &&
                        a.masteryRevision === ex.masteryRevision,
                    ),
                ) && (
                  <Notice text="Updated practice available. Your earlier completion remains in history." />
                )}
              {exercises.data?.map((ex, n) => {
                const pass = p.data?.exercisePasses.some(
                  (a) =>
                    a.itemId === ex.id &&
                    a.masteryRevision === ex.masteryRevision,
                );
                return (
                  <Link
                    className={styles.exerciseCard}
                    key={ex.id}
                    to={"/practice/" + ex.id}
                  >
                    <span className={styles.eyebrow}>
                      0{n + 1} · {ex.type.replace("-", " ")}
                    </span>
                    <h3>{ex.title}</h3>
                    <small>
                      {pass ? "✓ Passed" : "Start activity"} ·{" "}
                      {ex.estimatedMinutes} min →
                    </small>
                  </Link>
                );
              })}
              <Notice text={notice} />
              <div className={styles.actions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => act("review-cards")}
                >
                  Add to review
                </button>
                <button
                  className={styles.ghost}
                  onClick={async () => {
                    try {
                      await api("/bookmarks/" + lesson.id, "PUT", {
                        clientEventId: eventId(),
                      });
                      setNotice("Bookmarked.");
                    } catch (e) {
                      setNotice(String(e));
                    }
                  }}
                >
                  Bookmark lesson
                </button>
              </div>
              <label>
                Capture a thought
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What clicked? What would you try differently?"
                />
              </label>
              <button
                className={styles.secondaryButton}
                disabled={!note.trim() || noteSaving}
                onClick={saveQuickNote}
              >
                Save note
              </button>
              <Link className={styles.textLink} to="/notes">
                Open notebook →
              </Link>
            </aside>
          </div>
        </>
      )}
    </State>
  );
}
