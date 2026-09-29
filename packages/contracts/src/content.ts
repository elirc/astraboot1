import { z } from "zod";

export const stableId = z.string().regex(/^[a-z0-9-]{1,80}$/);
const conceptId = z.string().regex(/^[a-z0-9.-]{1,80}$/);
const prose = z.string().min(1).max(100_000);
export const jsonValue: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(jsonValue),
  ]),
);
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };
const common = {
  id: stableId,
  version: z.number().int().positive(),
  masteryRevision: z.number().int().positive(),
  title: z.string().min(1).max(200),
  conceptIds: z.array(conceptId).min(1),
  prerequisiteIds: z.array(stableId),
  bodyMarkdown: prose,
};
const option = z
  .object({ id: stableId, text: prose, explanation: prose })
  .strict();
export const functionGrading = z
  .object({
    kind: z.literal("function-cases"),
    language: z.enum(["javascript", "typescript"]),
    entrypoint: z.string().regex(/^[a-zA-Z_$][\w$]*$/),
    starterCode: z.string().max(65536),
    assertInputUnchanged: z.boolean(),
    cases: z
      .array(
        z
          .object({
            id: stableId,
            args: z.array(jsonValue),
            expected: jsonValue,
          })
          .strict(),
      )
      .min(2)
      .max(25),
    mutants: z.array(z.string().max(65536)).min(2),
  })
  .strict();
export const gradingSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("choice"),
      multiple: z.boolean(),
      options: z.array(option).min(2),
      correctIds: z.array(stableId).min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("text"),
      expected: prose,
      normalization: z.enum(["exact", "trim", "trim-lines"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("rubric"),
      criteria: z.array(prose).min(2),
      modelAnswer: prose,
    })
    .strict(),
  functionGrading,
]);
export type Grading = z.infer<typeof gradingSchema>;
const solution = z
  .object({
    code: z.string().optional(),
    modelAnswer: z.string().optional(),
    explanationMarkdown: prose,
  })
  .strict()
  .refine(
    (s) => Boolean(s.code || s.modelAnswer),
    "A solution requires code or modelAnswer",
  );
const hints = z.array(prose).length(3);
const exerciseFields = {
  type: z.enum([
    "choice",
    "prediction",
    "code-reading",
    "debug",
    "function",
    "explanation",
    "local-task",
  ]),
  difficulty: z.enum(["foundation", "intermediate"]),
  primaryConceptId: conceptId,
  cognitiveLevel: z.enum([
    "recall",
    "recognize",
    "explain",
    "apply",
    "debug",
    "transfer",
  ]),
  promptMarkdown: prose,
  hints,
  solution,
  grading: gradingSchema,
  estimatedMinutes: z.number().int().min(1).max(120),
};
export const itemSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...common,
      kind: z.literal("track"),
      chapterIds: z.array(stableId),
      description: prose,
      targetOutcomes: z.array(prose),
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal("chapter"),
      trackId: stableId,
      lessonIds: z.array(stableId).length(3),
      assessmentId: stableId,
      objectiveIds: z.array(conceptId),
      missionIds: z.array(stableId),
      sequence: z.number().int().positive(),
      release: z.enum(["V1", "V2", "V3"]),
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal("lesson"),
      chapterId: stableId,
      objectives: z.array(prose).min(1).max(3),
      estimatedMinutes: z.number().int().positive(),
      workedExampleMarkdown: prose,
      commonMistakes: z.array(prose).min(1),
      summary: prose,
      exerciseIds: z.array(stableId).length(3),
      reviewCardIds: z.array(stableId).length(2),
      references: z.array(z.string().url()).min(1),
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal("exercise"),
      lessonId: stableId,
      ...exerciseFields,
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal("review_card"),
      lessonId: stableId,
      type: z.enum(["recall", "transfer", "debug"]),
      promptMarkdown: prose,
      answer: prose,
      explanation: prose,
      gradingOrigin: z.enum(["server_objective", "self_reported"]),
      primaryConceptId: conceptId,
      grading: gradingSchema,
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal("assessment"),
      chapterId: stableId,
      items: z
        .array(
          z
            .object({
              id: stableId,
              title: z.string().min(1).max(200),
              objectiveIds: z.array(conceptId).min(1),
              critical: z.boolean(),
              ...exerciseFields,
            })
            .strict(),
        )
        .length(5),
      qualification: z
        .object({ minCorrect: z.literal(4), requireCritical: z.literal(true) })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal("mission"),
      projectId: stableId,
      workType: z.enum(["build", "extend", "repair", "refactor"]),
      stack: z.enum(["React", "Node.js", "C#"]),
      release: z.enum(["V1", "V2", "V3"]),
      starterAssetId: stableId,
      starterCommit: z.string().nullable(),
      setup: z.array(prose).min(1),
      relevantFiles: z.array(prose).min(1),
      baselineChecks: z.array(prose).min(1),
      acceptanceCriteria: z.array(prose).min(1),
      verificationCommands: z.array(prose).min(1),
      hints,
      solutionMarkdown: prose,
      reflectionRubric: z.array(prose).min(1),
    })
    .strict(),
]);
export type Item = z.infer<typeof itemSchema>;
export type Exercise = Extract<Item, { kind: "exercise" }>;
export type Lesson = Extract<Item, { kind: "lesson" }>;
export type Assessment = Extract<Item, { kind: "assessment" }>;
export const packageSchema = z
  .object({
    schemaVersion: z.literal(1),
    packageId: stableId,
    packageVersion: z.number().int().positive(),
    baseReleaseId: z.string().uuid().nullable(),
    mode: z.literal("snapshot"),
    title: prose,
    items: z.array(itemSchema).min(1).max(2000),
    assets: z.array(
      z
        .object({
          id: stableId,
          path: z.string().regex(/^assets\/[a-zA-Z0-9/_-]+\.zip$/),
          checksum: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((pkg, context) => {
    const ids = new Set<string>();
    pkg.assets.forEach((asset, index) => {
      if (ids.has(asset.id))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["assets", index, "id"],
          message: "Duplicate asset ID: " + asset.id,
        });
      ids.add(asset.id);
    });
  });
export type ContentPackage = z.infer<typeof packageSchema>;
export const mutation = z.object({ clientEventId: z.string().uuid() });
export const revisionMutation = mutation.extend({
  expectedRevision: z.number().int().nonnegative(),
});
export const repositoryUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Use an HTTP(S) URL without credentials");

export function validatePackage(input: unknown) {
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      issues: parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`,
      ),
    };
  const pkg = parsed.data,
    issues: string[] = [],
    warnings: string[] = [];
  const map = new Map(pkg.items.map((i) => [i.id, i]));
  if (map.size !== pkg.items.length) issues.push("items: Duplicate stable IDs");
  const nestedIds = new Set<string>(map.keys());
  const check = (from: string, ids: string[], kind?: Item["kind"]) =>
    ids.forEach((id) => {
      if (!map.has(id) || (kind && map.get(id)?.kind !== kind))
        issues.push(`${from}: invalid ${kind ?? "item"} reference ${id}`);
    });
  const grade = (id: string, g: Grading) => {
    if (
      g.kind === "choice" &&
      (new Set(g.options.map((o) => o.id)).size !== g.options.length ||
        new Set(g.correctIds).size !== g.correctIds.length ||
        g.correctIds.some((x) => !g.options.some((o) => o.id === x)) ||
        (!g.multiple && g.correctIds.length !== 1))
    )
      issues.push(`${id}: invalid choice answer IDs`);
    if (g.kind === "function-cases") {
      if (new Set(g.cases.map((c) => c.id)).size !== g.cases.length)
        issues.push(`${id}: duplicate case IDs`);
      if (new TextEncoder().encode(JSON.stringify(g.cases)).length > 65536)
        issues.push(`${id}: cases exceed 64 KiB`);
      if (/\b(import|export)\b/.test(g.starterCode))
        issues.push(`${id}: imports/exports are unsupported`);
    }
  };
  const fingerprints = new Map<string, string>();
  for (const i of pkg.items) {
    check(i.id, i.prerequisiteIds);
    if (/\]\(\s*(?:javascript|data|vbscript):/i.test(JSON.stringify(i)))
      issues.push(`${i.id}: unsafe Markdown link`);
    if (i.kind === "track") check(i.id, i.chapterIds, "chapter");
    if (i.kind === "chapter") {
      check(i.id, [i.trackId], "track");
      check(i.id, i.lessonIds, "lesson");
      check(i.id, [i.assessmentId], "assessment");
      check(i.id, i.missionIds, "mission");
      if (
        i.lessonIds.some((id) => {
          const l = map.get(id);
          return l?.kind === "lesson" && l.chapterId !== i.id;
        })
      )
        issues.push(`${i.id}: lesson parent mismatch`);
    }
    if (i.kind === "lesson") {
      check(i.id, [i.chapterId], "chapter");
      check(i.id, i.exerciseIds, "exercise");
      check(i.id, i.reviewCardIds, "review_card");
      if (
        [...i.exerciseIds, ...i.reviewCardIds].some((id) => {
          const child = map.get(id);
          return child && "lessonId" in child && child.lessonId !== i.id;
        })
      )
        issues.push(`${i.id}: child parent mismatch`);
    }
    if (i.kind === "exercise" || i.kind === "review_card") {
      check(i.id, [i.lessonId], "lesson");
      grade(i.id, i.grading);
      if (!i.conceptIds.includes(i.primaryConceptId))
        issues.push(`${i.id}: primary concept not declared`);
    }
    if (i.kind === "assessment") {
      check(i.id, [i.chapterId], "chapter");
      for (const a of i.items) {
        if (nestedIds.has(a.id))
          issues.push(`${i.id}: duplicate placement ID ${a.id}`);
        nestedIds.add(a.id);
        grade(a.id, a.grading);
      }
      const chapter = map.get(i.chapterId);
      if (
        chapter?.kind === "chapter" &&
        chapter.objectiveIds.some(
          (c) => !i.items.some((a) => a.objectiveIds.includes(c)),
        )
      )
        issues.push(`${i.id}: missing objective coverage`);
      if (
        !i.items.some((a) =>
          ["apply", "debug", "transfer"].includes(a.cognitiveLevel),
        )
      )
        issues.push(`${i.id}: needs application or debugging`);
    }
    if (
      i.kind === "mission" &&
      !pkg.assets.some((a) => a.id === i.starterAssetId)
    )
      issues.push(`${i.id}: unknown starter asset`);
    if (i.kind === "lesson" || i.kind === "exercise") {
      const fingerprint =
        i.kind === "lesson" ? i.bodyMarkdown : i.promptMarkdown;
      const existing = fingerprints.get(fingerprint);
      if (existing)
        issues.push(`${i.id}: duplicated body/prompt with ${existing}`);
      fingerprints.set(fingerprint, i.id);
    }
  }
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) {
      issues.push(`${id}: prerequisite cycle`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of map.get(id)?.prerequisiteIds ?? []) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  map.forEach((_, id) => visit(id));
  for (const track of pkg.items.filter((i) => i.kind === "track")) {
    const order = track.chapterIds
      .map((id) => map.get(id))
      .filter((i) => i?.kind === "chapter");
    if (order.some((c, n) => n > 0 && c.sequence <= order[n - 1]!.sequence))
      issues.push(`${track.id}: chapter order is not increasing`);
  }
  return issues.length
    ? { ok: false as const, issues }
    : { ok: true as const, package: pkg, warnings };
}

export function publicItem(item: Item) {
  const cleanGrade = (g: Grading) => {
    if (g.kind === "choice")
      return {
        kind: g.kind,
        multiple: g.multiple,
        options: g.options.map(({ id, text }) => ({ id, text })),
      };
    if (g.kind === "text")
      return { kind: g.kind, normalization: g.normalization };
    if (g.kind === "rubric") return { kind: g.kind, criteria: g.criteria };
    const { mutants: _mutants, ...publicGrade } = g;
    return publicGrade;
  };
  if (item.kind === "exercise") {
    const { solution: _solution, hints: _hints, grading, ...rest } = item;
    return { ...rest, grading: cleanGrade(grading) };
  }
  if (item.kind === "review_card") {
    const {
      answer: _answer,
      explanation: _explanation,
      grading,
      ...rest
    } = item;
    return { ...rest, grading: cleanGrade(grading) };
  }
  if (item.kind === "assessment")
    return {
      ...item,
      items: item.items.map(
        ({ solution: _solution, hints: _hints, grading, ...rest }) => ({
          ...rest,
          grading: cleanGrade(grading),
        }),
      ),
    };
  if (item.kind === "mission") {
    const { solutionMarkdown: _solution, hints: _hints, ...rest } = item;
    return rest;
  }
  return item;
}
