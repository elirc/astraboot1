# 0002 — Hard interpreter memory boundary

The pinned QuickJS 0.31.0 runner reproduced an assertion during resource exhaustion cleanup. Upstream reports include https://github.com/justjake/quickjs-emscripten/issues/257 and https://github.com/justjake/quickjs-emscripten/issues/255. setMemoryLimit alone is not treated as a host-memory guarantee.

The installed Emscripten loader accepts wasmMemory. Each run supplies a new WebAssembly.Memory with 16 MiB initial and 64 MiB maximum, alongside a 32 MiB QuickJS allocation budget, stack limit, interruption deadline, and outer worker watchdog. This limits the interpreter linear memory; it does not cap compiler or entire browser memory. No WASM binary modification is used.

Disposal assertions produce runtime_error; they can never produce a pass. Every browser run uses a fresh worker and discards it after the result or timeout. The associated WASM memory becomes unreachable when that worker terminates. Tests must verify allocation, oversized output, loops, cancellation and subsequent successful runs; cross-engine browser proof is still pending.
