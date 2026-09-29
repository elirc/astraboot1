import { describe, expect, it } from "vitest";
import { loginThrottleConfig } from "../apps/api/src/config";

describe("login throttle configuration", () => {
  it("keeps the five-failure, fifteen-minute defaults", () => {
    expect(loginThrottleConfig({})).toEqual({
      maxFailures: 5,
      windowMs: 900_000,
    });
  });
  it("accepts explicit server configuration", () => {
    expect(
      loginThrottleConfig({
        LOGIN_MAX_FAILURES: "2",
        LOGIN_WINDOW_MINUTES: "3",
      }),
    ).toEqual({ maxFailures: 2, windowMs: 180_000 });
  });
  it("rejects empty, fractional, nonnumeric, and unbounded settings", () => {
    for (const value of ["", "0", "-1", "1.5", "NaN", "Infinity", "1001"])
      expect(() =>
        loginThrottleConfig({ LOGIN_MAX_FAILURES: value }),
      ).toThrow();
    for (const value of ["", "0", "1.5", "later", "1441"])
      expect(() =>
        loginThrottleConfig({ LOGIN_WINDOW_MINUTES: value }),
      ).toThrow();
  });
});
