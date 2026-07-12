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

  return {
    name: "solid-compat",
    enforce: "pre",
    resolveId(source, importer) {
      // Only intercept 'solid-js' imports from node_modules
      if (source === "solid-js" && importer && importer.includes("node_modules")) {
        return VIRTUAL_ID
      }
      // Redirect solid-js/web → @solidjs/web
      if (source === "solid-js/web" && importer && importer.includes("node_modules")) {
        return this.resolve("@solidjs/web", importer, { skipSelf: true })
      }
      // Redirect solid-js/store → solid-js (our compat module)
      if (source === "solid-js/store" && importer && importer.includes("node_modules")) {
        return VIRTUAL_ID
      }
      return null
    },
    load(id) {
      if (id === VIRTUAL_ID) {
        // Re-export everything from solid-js, plus aliases for removed names
        return `
export * from "solid-js";
export { merge as mergeProps } from "solid-js";
export { omit as splitProps } from "solid-js";
export { onSettled as onMount } from "solid-js";
export { createEffect as createComputed } from "solid-js";
`
      }
      return null
    },
  }
}
