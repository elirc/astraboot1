import { readFile, writeFile } from "node:fs/promises";
const css = await readFile("apps/web/src/theme.css", "utf8");
const light = css.match(/:root\s*\{([^}]*)\}/s)?.[1];
const dark = css.match(
  /:root\[data-theme=[^\]]*dark[^\]]*\]\s*\{([^}]*)\}/s,
)?.[1];
if (!light || !dark) throw new Error("Theme token blocks were not found.");
function tokens(block) {
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+)\s*:\s*(#[a-f\d]{3,6})\s*(?:;|$)/gi)].map(
      (m) => [m[1], m[2]],
    ),
  );
}
function luminance(hex) {
  let digits = hex.slice(1);
  if (digits.length === 3) digits = [...digits].map((c) => c + c).join("");
  const channels = [0, 2, 4]
    .map((n) => parseInt(digits.slice(n, n + 2), 16) / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
const checks = [];
for (const [theme, block] of [
  ["light", light],
  ["dark", dark],
]) {
  const palette = tokens(block);
  for (const [foreground, background, minimum] of [
    ["text", "bg", 4.5],
    ["text", "surface", 4.5],
    ["muted", "bg", 4.5],
    ["muted", "surface", 4.5],
    ["accent", "surface", 4.5],
    ["surface", "accent", 4.5],
    ["error", "surface", 4.5],
    ["code-text", "code", 4.5],
    ["control-border", "surface", 3],
    ["control-border", "bg", 3],
    ["control-border", "surface-soft", 3],
    ["accent", "bg", 3],
  ]) {
    if (!palette[foreground] || !palette[background])
      throw new Error(
        "Missing contrast token " + foreground + " or " + background,
      );
    const a = luminance(palette[foreground]),
      b = luminance(palette[background]),
      ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    checks.push({
      theme,
      foreground,
      background,
      ratio: Math.round(ratio * 100) / 100,
      minimum,
      passed: ratio >= minimum,
    });
  }
}
const result = {
  checkedAt: new Date().toISOString(),
  scope: "Authored theme token contrast; not a complete WCAG conformance audit",
  sources: [
    "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html",
    "https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html",
  ],
  checks,
};
await writeFile(
  "docs/contrast-verification.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    checks.filter((c) => !c.passed),
    null,
    2,
  ),
);
if (checks.some((c) => !c.passed)) process.exitCode = 1;
else
  console.log(
    "All " +
      checks.length +
      " text, control-boundary, and focus contrast pairs passed.",
  );
