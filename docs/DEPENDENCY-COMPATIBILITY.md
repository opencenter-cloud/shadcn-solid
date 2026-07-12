# Third-Party Dependency Solid 2 Compatibility Matrix

> Spike results from Task 2. Tested against `solid-js@2.0.0-beta.15` + `@solidjs/web@2.0.0-beta.15`.

Date: 2026-07-12

## Summary

| Package | Version | Verdict | Effort | Approach |
|---------|---------|---------|--------|----------|
| `embla-carousel-solid` | 8.6.0 | NEEDS_PATCH | ~30 min | `pnpm patch` |
| `@tanstack/solid-table` | 8.21.3 | NEEDS_PATCH | ~20 min | `pnpm patch` |
| `@tanstack/solid-form` | 1.33.1 | NEEDS_PATCH | ~20 min | `pnpm patch` |
| `cmdk-solid` | 1.1.2 | **NEEDS_FORK** | 2–4 hours | `@opencenter-cloud/cmdk-solid` |
| `somoto` | 0.0.2 | NEEDS_PATCH | ~1 hour | `pnpm patch` or workspace package |
| `@unovis/solid` | 1.6.7 | NEEDS_PATCH | 2–4 hours | Recompile from source |

**Key finding:** Only `cmdk-solid` requires a full fork. The other 5 packages can use `pnpm patch` or local workspace packages with mechanical changes.

## Decision: Fork vs Patch

The migration plan originally assumed all 6 packages needed forks under `@opencenter-cloud/`. Based on this spike:

- **Keep as fork:** `cmdk-solid` → `@opencenter-cloud/cmdk-solid` (semantic rewrites + Kobalte/primitives dep swap required)
- **Use `pnpm patch`:** `embla-carousel-solid`, `@tanstack/solid-table`, `@tanstack/solid-form` (trivial mechanical changes, <10 lines each for table/form)
- **Use workspace package (recompile from source):** `somoto`, `@unovis/solid` (pre-compiled Solid 1 output needs recompilation with `babel-preset-solid@2.0.0-beta.15`)

## Detailed Findings

### embla-carousel-solid@8.6.0

- **Peer dep:** `solid-js: ^1.0.0`
- **Solid code:** ~40 lines (single `createEmblaCarousel` hook)
- **Breaking APIs:**
  - `createEffect` single-arg × 3 → split-phase
  - `on()` helper × 1 → removed in Solid 2
  - `onCleanup` inside effect → return from apply phase
- **Fix:** ~20 changed lines in one file. `pnpm patch` is sufficient.

### @tanstack/solid-table@8.21.3

- **Peer dep:** `solid-js: >=1.3`
- **Solid code:** ~63 lines (single adapter file)
- **Breaking APIs:**
  - `mergeProps` × 4 → `merge`
  - `createComputed` × 1 → split-phase `createEffect` or `createMemo`
  - `import from 'solid-js/store'` × 1 → `from 'solid-js'`
- **Fix:** ~10 changed lines. `pnpm patch` is sufficient.
- **Note:** Upstream v9 beta (unreleased) also targets Solid 1. No Solid 2 timeline.

### @tanstack/solid-form@1.33.1

- **Peer dep:** `solid-js: >=1.9.9` (accepts Solid 2 in semver range)
- **Solid code:** ~200 lines runtime (90% of package is TypeScript generics)
- **Breaking APIs:**
  - `onMount` × 4 → `onSettled`
  - `mergeProps` × 2 → `merge`
  - `splitProps` × 1 → `omit` (signature change)
  - `createComputed` × 4 → may need `createMemo` replacement
- **Fix:** ~10 line modifications. `pnpm patch` is sufficient.
- **Note:** `@tanstack/solid-store@0.11.0` (dep) uses only `createSignal` + `onCleanup` — no issues.

### cmdk-solid@1.1.2 ← NEEDS_FORK

- **Peer dep:** `solid-js: ^1.8.0`
- **Solid code:** ~530 lines
- **Breaking APIs (19 sites):**
  - `splitProps` × 9 → `omit` (return type change, not a simple rename)
  - `onMount` × 7 → `onSettled`
  - `createEffect` single-arg × 9 → split-phase (semantic analysis required per site)
  - `createContext(undefined)` × 3 → `createContext<T|null>(null)` (Solid 2 throws on undefined default)
  - `<Ctx.Provider>` × 3 → context IS the provider pattern
- **Additional blockers:**
  - Hard dep on `@kobalte/core@^0.12.4` → must swap to `@opencenter-cloud/kobalte-core`
  - Hard dep on `@kobalte/utils@^0.9.0` → must swap to `@opencenter-cloud/kobalte-utils`
  - Hard dep on `@solid-primitives/deep` and `@solid-primitives/mutation-observer` → need `@next` versions
- **Why fork, not patch:**
  - `splitProps` → `omit` is not a text substitution — the return type changes from `[local, rest]` tuple to a single object. Each of 9 call sites needs understanding of which properties are consumed locally vs forwarded.
  - `createEffect` split-phase requires per-site analysis: separating tracked reads (compute) from DOM writes (apply). 9 effects with mixed tracking+mutation.
  - Dependency on Kobalte/primitives means the entire dep tree must change.
  - `pnpm patch` would be fragile across any upstream bumps.
- **Recommended:** Fork as `@opencenter-cloud/cmdk-solid`, apply full migration using lessons #1, #3, #4, #5, #7, #11.

### somoto@0.0.2

- **Peer dep:** `solid-js: >=1.6.0`
- **Solid code:** ~400 lines source (ships pre-compiled)
- **Breaking APIs:**
  - `mergeProps` × 3 → `merge`
  - `onMount` × 5 → `onSettled`
  - `createEffect` single-arg × 7 → split-phase
  - `import from 'solid-js/web'` × 1 → `@solidjs/web` (compiler output)
- **Fix approach:** Either:
  - Clone source from `oc1s/somo`, apply ~15 mechanical changes, recompile with Solid 2 toolchain. Add as workspace package in `packages/somoto/`.
  - Or `pnpm patch` on the distributed bundle (messier but faster).
- **Recommended:** Workspace package — the source is small (~400 lines) and recompilation with `babel-preset-solid@2.0.0-beta.15` fixes the `solid-js/web` imports automatically.

### @unovis/solid@1.6.7

- **Peer dep:** `solid-js: ^1.9.0`
- **Solid code:** ~600-700 lines across 35 pre-compiled JS files
- **Breaking APIs:**
  - `import from "solid-js/web"` × 30 files (compiler-generated runtime calls: `template`, `createComponent`, `spread`, `mergeProps`)
  - `onMount` × 28 files → `onSettled`
  - `createEffect(on(...))` × ~30 sites → `on()` removed
  - `createEffect` single-arg × 14 sites → split-phase
  - `splitProps` × 2 → `omit`
- **Critical issue:** Ships pre-compiled Solid 1 output. The `solid-js/web` imports are baked-in compiler runtime calls that won't resolve against Solid 2's `@solidjs/web`. Cannot be fixed with text patches alone — needs recompilation from source.
- **Fix approach:** Clone `f5/unovis`, isolate `packages/solid`, recompile with `babel-preset-solid@2.0.0-beta.15`. Fix ~50 lines in template generator + utils (mechanical `onMount` → `onSettled`, remove `on()` wrapper, split-phase effects).
- **Estimated effort:** 2–4 hours. Upstream is active (last release May 2026), PR feasible.
- **Recommended:** Workspace package in `packages/unovis-solid/` or `pnpm patch` after local recompile.

## Revised Approach

Based on these findings, the migration plan simplifies:

| Original Plan | Revised Plan |
|---------------|-------------|
| 6 forks under `@opencenter-cloud/` | 1 fork (`cmdk-solid`) + 3 `pnpm patch` + 2 workspace packages |
| Tasks 3–8 all create npm packages | Task 6 creates `@opencenter-cloud/cmdk-solid`; others use patches |

### pnpm patch approach

```bash
# Create patches for trivial fixes
pnpm patch embla-carousel-solid@8.6.0
pnpm patch @tanstack/solid-table@8.21.3
pnpm patch @tanstack/solid-form@1.33.1
```

Patches are stored in `patches/` and applied automatically via `pnpm-lock.yaml` `patchedDependencies` field.

### Workspace packages (recompile from source)

```
packages/
├── somoto/          # Source from oc1s/somo, recompiled for Solid 2
├── unovis-solid/    # Source from f5/unovis/packages/solid, recompiled for Solid 2
└── cmdk-solid/      # Fork of create-signal/cmdk-solid, fully migrated
```

## Deprecation Conditions (unchanged)

All patches/forks are temporary. Deprecated when upstream publishes Solid 2 support.
