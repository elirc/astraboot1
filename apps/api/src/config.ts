import { z } from "zod";

const loginThrottleSchema = z.object({
  LOGIN_MAX_FAILURES: z.coerce.number().int().min(1).max(1000).default(5),
  LOGIN_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
});

/** Read once per server instance; invalid configuration prevents startup. */
export function loginThrottleConfig(
  environment: Record<string, string | undefined>,
) {
  const parsed = loginThrottleSchema.parse(environment);
  return {
    maxFailures: parsed.LOGIN_MAX_FAILURES,
    windowMs: parsed.LOGIN_WINDOW_MINUTES * 60_000,
  };
}
