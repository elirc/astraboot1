# Learning algorithms

Everything on this page is implemented in `packages/learning-core/src/index.ts`
— 29 lines of pure functions with no imports beyond types. That's a
deliberate boundary: the scheduler and graders take plain values (including
`now: Date` as a parameter) and return plain values, so every rule below is
deterministic and unit-testable without a database or a clock mock.

## XP

| Event | XP | Award key |
| --- | --- | --- |
| First accepted exercise pass | 10 | `exercise:<itemId>:<masteryRevision>` |
| First lesson completion | 20 | `lesson:<id>` |
| First self-reported mission completion | 50 | `mission:<id>` |

The unique `(userId, awardKey)` constraint prevents repeats — `award()` is an
upsert whose update branch is empty. Note the exercise key includes the
`masteryRevision`: if an exercise is republished with a new mastery revision,
passing it again is a new achievement. Level is derived, not stored:
`Math.floor(totalXP / 250) + 1` (`apps/api/src/progress.ts`). XP never gates
navigation.

## Spaced repetition (`schedule`)

The whole scheduler is three lines:

```ts
const applied = correctness===false ? 'Again' : rating;
const next = applied==='Again' ? 0 : applied==='Hard' ? step : Math.min(5, step + (applied==='Easy' ? 2 : 1));
const minutes = applied==='Again' ? 10 : applied==='Hard' ? 1440 : ([0,1,3,7,14,30][next] ?? 30) * 1440;
```

In words:

- Steps are indexes into `[0, 1, 3, 7, 14, 30]` days, capped at step 5.
- **Good** advances one step (1 → 3 → 7 → 14 → 30 days). **Easy** advances
  two. **Hard** keeps the current step and waits exactly one day. **Again**
  resets to step 0 and comes back in ten minutes.
- The first line is the rule juniors miss: on a server-graded card, a wrong
  answer **forces** `Again` no matter which button the learner pressed —
  `correctness === false` overrides the self-chosen rating. Self-graded
  cards pass `correctness: null`, so the rating stands.

Server time is authoritative (`now` comes from the API). A response to a
card that isn't due yet is rejected (`NOT_DUE`), and a stale
`expectedRevision` conflicts (`REVISION_CONFLICT`) — reviewing on two
devices cannot double-apply. Identical events replay via the mutation
receipt instead of re-scheduling.

## Mastery (`conceptStatus`)

Progression is `unseen → practicing → demonstrated → retained`, with
`review_due` when retained material goes overdue:

- **Demonstrated** requires two *distinct* items passed independently —
  `assistance === 'none'` and `origin !== 'self_reported'` — and at least
  one of them at `apply`, `debug` or `transfer` level. Self-assessment alone
  can never demonstrate a concept, and neither can a pass after revealing
  the solution (reveal history is permanent per mastery revision).
- **Retained** additionally requires two correct, due reviews on different
  UTC dates at least seven days apart.

These are product heuristics, not scientific measurements — the docs say so
on purpose, and a senior reviewer would expect that honesty.

## Placement (`placementOutcome`)

```ts
qualified = score >= 4 && every critical question correct && !revealedBefore
```

Four of five answers, all critical answers correct, and no prior reveal of
that placement version. The same version becomes practice-only after its
first submission. Placement and skipping never complete lesson exercises —
they change the path, not the evidence.

## Exercises

1. **Predict the schedule.** A card is at step 3 (7 days). The learner
   answers a server-objective card wrongly but presses Good. Write down the
   resulting step and due delay, then confirm against `schedule()` in
   `packages/learning-core/src/index.ts`. **Check**: step 0, ten minutes —
   if you said step 4 / 14 days, re-read the `correctness===false` line.
2. **Prove the XP cap.** Find the one code path that calls
   `award(...,10,...)` in `apps/api/src/learning.ts` and explain why calling
   the endpoint twice with different `clientEventId`s still awards 10 XP
   once. **Check**: your answer names the `(userId, awardKey)` unique
   constraint, not the mutation receipt.
3. **Design review.** The step cap is 5 (30 days). Argue for or against
   adding a 90-day step, listing which tables and which lines would change.
   **Check**: your change touches only `learning-core` and no API route —
   if it doesn't, you've put scheduling logic in the wrong layer.
