import { it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { execute, type FunctionSpec } from "../packages/runner/src/index";
import { compile } from "../packages/runner/src/compiler";
const spec: FunctionSpec = {
  kind: "function-cases",
  language: "javascript",
  entrypoint: "solve",
  starterCode: "function solve(x){return 0}",
  assertInputUnchanged: true,
  cases: [
    { id: "empty", args: [[]], expected: 0 },
    { id: "mixed", args: [[1, 2]], expected: 3 },
  ],
  mutants: [
    "function solve(x){return 0}",
    "function solve(x){return x.length}",
  ],
};
it("runs correct code and rejects boundary and mutation defects", async () => {
  expect(
    (
      await execute(
        "function solve(x){return x.reduce((a,b)=>a+b,0)}",
        spec,
        "good",
      )
    ).status,
  ).toBe("passed");
  expect((await execute(spec.starterCode, spec, "bad")).status).toBe("failed");
  expect(
    (
      await execute(
        "function solve(x){const s=x.reduce((a,b)=>a+b,0);x.push(9);return s}",
        spec,
        "mutate",
      )
    ).status,
  ).toBe("failed");
});
it("interrupts loops and limits recursion, allocation, and output", async () => {
  expect(
    (await execute("function solve(){while(true){}}", spec, "loop", 30)).status,
  ).toBe("timed_out");
  expect(
    (await execute("function solve(){return solve()}", spec, "recurse", 50))
      .status,
  ).not.toBe("passed");
  expect(
    (
      await execute(
        'function solve(){return "a".repeat(70000)}',
        spec,
        "output",
      )
    ).status,
  ).toBe("runtime_error");
  expect(
    (
      await execute(
        "function solve(){const a=[];while(true)a.push(new Array(10000).fill(1))}",
        spec,
        "allocation",
        100,
      )
    ).status,
  ).not.toBe("passed");
});
it("exposes no host APIs and recovers after errors", async () => {
  for (const name of ["fetch", "process", "require", "window", "localStorage"])
    expect(
      (await execute("function solve(){return " + name + "}", spec, name))
        .status,
    ).toBe("runtime_error");
  expect((await execute("function solve( {", spec, "syntax")).status).toBe(
    "runtime_error",
  );
  expect(
    (
      await execute('function solve(){throw new Error("oops")}', spec, "throw")
    ).diagnostics.join(""),
  ).toContain("oops");
  expect(
    (
      await execute(
        'function solve(x){for(let i=0;i<1000;i++)console.log("hello");return x.reduce((a,b)=>a+b,0)}',
        spec,
        "logs",
      )
    ).console.length,
  ).toBe(100);
});
// Allow cold compiler-library loading on the shared host; interpreter execution limits are unchanged.
it("rejects runtime-correct TypeScript with semantic errors", async () => {
  const names = (await readdir("node_modules/typescript/lib")).filter((n) =>
    /^lib\..*\.d\.ts$/.test(n),
  );
  const libs = Object.fromEntries(
    await Promise.all(
      names.map(async (n) => [
        "/" + n,
        await readFile("node_modules/typescript/lib/" + n, "utf8"),
      ]),
    ),
  );
  expect(
    compile(
      "function solve(x: number[]):number {return x.reduce((a,b)=>a+b,0)}",
      libs,
    ).diagnostics,
  ).toEqual([]);
  expect(
    compile(
      "function solve(x: number[]):number {const label: string = 2; return x.reduce((a,b)=>a+b,0)}",
      libs,
    ).diagnostics.join(""),
  ).toContain("not assignable");
}, 60000);
