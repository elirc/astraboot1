import { QueryClient } from "@tanstack/react-query";
let csrf = "",
  recoveryOwner = "";
export const setCsrf = (value: string, ownerId = "") => {
  const restored = !!value && !!ownerId && recoveryOwner === ownerId;
  csrf = value;
  recoveryOwner = ownerId;
  if (restored) window.dispatchEvent(new Event("session-restored"));
};
export const recoveryKey = (kind: string, id: string) =>
  "devpractice:" + recoveryOwner + ":" + kind + ":" + id;
export const eventId = () => crypto.randomUUID();
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api/v1" + path, {
    method,
    credentials: "same-origin",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 401 && !path.startsWith("/auth"))
    window.dispatchEvent(new Event("session-expired"));
  const value = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      response.status,
      value?.error?.code ?? "ERROR",
      value?.error?.message ?? "Request failed",
      value?.error?.fieldErrors,
    );
  return value?.data as T;
}
export async function envelope<T>(
  path: string,
): Promise<{
  data: T;
  meta?: {
    nextCursor?: string | null;
    revision?: number;
    activeReleaseId?: string | null;
    remaining?: number;
  };
}> {
  const response = await fetch("/api/v1" + path, {
    credentials: "same-origin",
  });
  if (response.status === 401)
    window.dispatchEvent(new Event("session-expired"));
  if (!response.ok) throw new Error("Could not load this page.");
  return response.json();
}
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
export const refresh = () => queryClient.invalidateQueries();
export type User = {
  id: string;
  email: string;
  csrfToken: string;
  theme: string;
  timezone: string;
};
export type Progress = {
  totalLessonCount: number;
  nextAttemptCursor: string | null;
  exercisePasses: { itemId: string; masteryRevision: number }[];
  totalXP: number;
  level: number;
  dueReviews: number;
  lessons: { lessonId: string; status: string }[];
  concepts: { id: string; status: string; independentItems: number }[];
  attempts: {
    id: string;
    itemId: string;
    masteryRevision: number;
    outcome: string;
    assistance: string;
    gradingOrigin: string;
    createdAt: string;
  }[];
  placements: {
    id: string;
    score: number;
    qualified: boolean;
    practiceOnly: boolean;
    assessmentId: string;
  }[];
  missions: { missionId: string; status: string }[];
};
