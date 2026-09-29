import { SessionDialog } from "./session-dialog";
import React, { useEffect, useState, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Routes,
  Route,
  NavLink,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { api, setCsrf, queryClient, type User, type Progress } from "./api";
import { Today, Catalog, Chapter, LessonPage } from "./learning-pages";
import {
  Notes,
  Review,
  Placement,
  Projects,
  Mission,
  ProgressPage,
  ContentPage,
  Settings,
  Archive,
} from "./personal-pages";
import styles from "./Workspace.module.css";
import "./theme.css";
const Practice = lazy(() => import("./practice"));
export const APP_NAME = "DevPractice";
function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  return (
    <main className={styles.login}>
      <div className={styles.logoMark}>d/</div>
      <p className={styles.eyebrow}>YOUR LEARNING WORKSPACE</p>
      <h1>Welcome to {APP_NAME}</h1>
      <p>Sign in to pick up where you left off.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError("");
          const form = new FormData(e.currentTarget);
          try {
            const pre = await api<{ csrfToken: string }>("/auth/csrf");
            await api<User>("/auth/login", "POST", {
              email: form.get("email"),
              password: form.get("password"),
              csrfToken: pre.csrfToken,
            });
            const user = await api<User>("/auth/me");
            setCsrf(user.csrfToken, user.id);
            onLogin(user);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Sign-in failed.");
          } finally {
            setPending(false);
          }
        }}
      >
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <button disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className={styles.muted}>
        Private owner account. Create it with the local administration command
        in the setup guide.
      </p>
    </main>
  );
}
function App() {
  const [user, setUser] = useState<User | null>(null),
    [loaded, setLoaded] = useState(false),
    [expired, setExpired] = useState(false),
    [more, setMore] = useState(false);
  const location = useLocation();
  useEffect(() => {
    api<User>("/auth/me")
      .then((u) => {
        setCsrf(u.csrfToken, u.id);
        setUser(u);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    const fn = () => setExpired(true);
    window.addEventListener("session-expired", fn);
    return () => window.removeEventListener("session-expired", fn);
  }, []);
  useEffect(() => {
    setMore(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    document.documentElement.dataset.theme = user?.theme ?? "system";
  }, [user]);
  const progress = useQuery({
    queryKey: ["progress"],
    queryFn: () => api<Progress>("/progress"),
    enabled: !!user && !expired,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
  if (!loaded)
    return (
      <p className={styles.loading} role="status">
        Opening your workspace…
      </p>
    );
  if (!user)
    return (
      <Login
        onLogin={(u) => {
          setUser(u);
          setExpired(false);
        }}
      />
    );
  const primary = [
    ["/today", "◷", "Today"],
    ["/learn", "▤", "Learn"],
    ["/review", "↻", "Review"],
    ["/projects", "⌘", "Projects"],
  ];
  const secondary = [
    ["/progress", "↗", "Progress"],
    ["/notes", "▧", "Notes"],
    ["/content", "⇧", "Content"],
    ["/settings", "⚙", "Settings"],
  ];
  return (
    <div className={styles.app}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>
      <aside className={styles.sidebar}>
        <Link to="/today" className={styles.brand}>
          <span className={styles.logoMark}>d/</span>
          {APP_NAME}
        </Link>
        <p className={styles.navLabel}>WORKSPACE</p>
        <nav aria-label="Main navigation">
          {primary.map(([href, icon, label]) => (
            <NavLink
              key={href}
              to={href!}
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              <span aria-hidden>{icon}</span>
              {label}
              {label === "Review" && !!progress.data?.dueReviews && (
                <b>{progress.data.dueReviews}</b>
              )}
            </NavLink>
          ))}
          <div className={styles.navDivider} />
          {secondary.map(([href, icon, label]) => (
            <NavLink
              key={href}
              to={href!}
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              <span aria-hidden>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <span className={styles.avatar}>
            {user.email.slice(0, 1).toUpperCase()}
          </span>
          <div>
            Personal workspace
            <small>
              Level {progress.data?.level ?? 1} · {progress.data?.totalXP ?? 0}{" "}
              XP
            </small>
          </div>
        </div>
      </aside>
      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <span>
            {APP_NAME}{" "}
            <span className={styles.muted}>
              / {location.pathname.split("/")[1] || "today"}
            </span>
          </span>
          <span className={styles.muted}>Learn at your own pace</span>
        </header>
        <main id="main" className={styles.main}>
          <Suspense fallback={<p role="status">Loading workspace…</p>}>
            <Routes>
              <Route path="/today" element={<Today />} />
              <Route path="/learn" element={<Catalog />} />
              <Route path="/learn/chapters/:chapterId" element={<Chapter />} />
              <Route path="/learn/lessons/:lessonId" element={<LessonPage />} />
              <Route path="/practice/:exerciseId" element={<Practice />} />
              <Route path="/placement/:chapterId" element={<Placement />} />
              <Route path="/review" element={<Review />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:missionId" element={<Mission />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/content" element={<ContentPage />} />
              <Route
                path="/settings"
                element={
                  <Settings
                    onLogout={() => {
                      setUser(null);
                      setCsrf("");
                      queryClient.clear();
                    }}
                    onTheme={(theme) => setUser({ ...user, theme })}
                  />
                }
              />
              <Route path="/archive/:id" element={<Archive />} />
              <Route path="*" element={<Navigate to="/today" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {primary.map(([href, icon, label]) => (
          <NavLink key={href} to={href!}>
            <span aria-hidden>{icon}</span>
            {label}
          </NavLink>
        ))}
        <button onClick={() => setMore(!more)} aria-expanded={more}>
          <span>•••</span>More
        </button>
        {more && (
          <div className={styles.moreMenu}>
            {secondary.map(([href, , label]) => (
              <Link key={href} to={href!}>
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>
      {expired && (
        <SessionDialog>
          <p>
            Your session expired. Your unsaved work is preserved behind this
            sign-in form.
          </p>
          <Login
            onLogin={(u) => {
              if (u.id !== user.id) {
                queryClient.clear();
                window.location.reload();
              } else {
                setUser(u);
                setExpired(false);
                void queryClient.invalidateQueries();
              }
            }}
          />
        </SessionDialog>
      )}
    </div>
  );
}
const router = createBrowserRouter([{ path: "*", element: <App /> }]);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
