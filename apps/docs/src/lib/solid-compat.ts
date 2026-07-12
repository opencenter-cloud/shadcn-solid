// Compatibility shim for third-party packages that still use Solid 1 API names.
// This is imported via Vite's resolve.alias to handle deps that weren't fully patched.
export { merge as mergeProps, omit as splitProps, onSettled as onMount, createEffect as createComputed } from "solid-js"
export * from "solid-js"
