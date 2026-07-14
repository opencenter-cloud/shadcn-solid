import type { Plugin } from "vite"

/**
 * Vite plugin that provides a compatibility shim for third-party packages
 * still importing removed Solid 1.x APIs from 'solid-js'.
 * 
 * Strategy: Intercept 'solid-js' imports from node_modules and redirect them
 * to a virtual module that re-exports all Solid 2 APIs plus the old names as
 * aliases to the new ones.
 */
export default function solidCompat(): Plugin {
  const VIRTUAL_ID = "\0solid-compat"

  // Only shim these packages — everything else (kobalte, corvu-next) now
  // ships correct @solidjs/web imports from source rebuild.
  const SHIMMED_PACKAGES = [
    "@tanstack/solid-table",
    "@tanstack/solid-form",
    "@tanstack/solid-store",
    "@solid-primitives/deep",
  ]

  function needsShim(importer: string | undefined): boolean {
    if (!importer || !importer.includes("node_modules")) return false
    return SHIMMED_PACKAGES.some((pkg) => importer.includes(pkg.replace("/", "/")))
  }

  return {
    name: "solid-compat",
    enforce: "pre",
    resolveId(source, importer) {
      // Only intercept 'solid-js' imports from shimmed packages
      if (source === "solid-js" && needsShim(importer)) {
        return VIRTUAL_ID
      }
      // Redirect solid-js/web → @solidjs/web for shimmed packages
      if (source === "solid-js/web" && needsShim(importer)) {
        return this.resolve("@solidjs/web", importer, { skipSelf: true })
      }
      // Redirect solid-js/store → solid-js (our compat module) for shimmed packages
      if (source === "solid-js/store" && needsShim(importer)) {
        return VIRTUAL_ID
      }
      return null
    },
    load(id) {
      if (id === VIRTUAL_ID) {
        // Re-export everything from solid-js, plus aliases for removed names.
        // splitProps shim: returns [picked, rest] tuple matching Solid 1 API,
        // implemented via omit() for the rest + direct prop access for picked keys.
        return `
export * from "solid-js";
export { merge as mergeProps } from "solid-js";
export { onSettled as onMount } from "solid-js";
import { createEffect as _createEffect } from "solid-js";
import { omit as _omit } from "solid-js";

// Solid 1 createComputed(fn) ran synchronously on tracked deps.
// Map to split-phase: compute returns the value, apply is a no-op.
export function createComputed(fn, value) {
  return _createEffect(fn, () => {});
}

export function splitProps(props, ...arrays) {
  const keys = arrays.flat();
  const picked = {};
  for (const key of keys) {
    Object.defineProperty(picked, key, {
      get() { return props[key]; },
      enumerable: true,
      configurable: true,
    });
  }
  const rest = _omit(props, ...keys);
  return [picked, rest];
}
`
      }
      return null
    },
  }
}
