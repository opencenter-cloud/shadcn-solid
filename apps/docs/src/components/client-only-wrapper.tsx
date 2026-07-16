/* eslint-disable */
// @ts-ignore
// @refresh skip
import type { Component } from "solid-js"
import type { ComponentProps, JSX } from "@solidjs/web"
import { createRoot, omit, untrack } from "solid-js"
import { isServer, render } from "@solidjs/web"

/**
 * Client-only wrapper for Solid 2 hydration safety.
 *
 * Renders a stable <div data-client-only style="display:contents"> on both
 * server and client. After hydration, mounts the lazily-loaded component
 * inside the host div using render() (creates an independent reactive root).
 *
 * See SOLID2-MIGRATION-LESSONS.md lessons #31, #34, #35.
 */
export default function clientOnlyWrapper<T extends Component<any>>(
  fn: () => Promise<{
    default: T
  }>,
  options: { lazy?: boolean } = {},
) {
  void options

  let loaded: T | undefined
  let loadPromise: Promise<T> | undefined
  const loadOnce = () => {
    if (loaded) return Promise.resolve(loaded)
    loadPromise ??= load(fn)
    loadPromise.then((m) => {
      loaded = m
    })
    return loadPromise
  }

  return (props: ComponentProps<T>) => {
    let host: HTMLDivElement | undefined
    const rest = omit(props, "fallback")

    if (!isServer) {
      setTimeout(() => {
        if (!host) return
        loadOnce().then((Comp) => {
          // render() creates an owned root — onCleanup inside Comp will
          // attach to this root's owner, preventing NO_OWNER_CLEANUP warnings.
          render(() => <Comp {...rest} />, host!)
        })
      }, 0)
    }

    return (
      <div ref={host} data-client-only="" style={{ display: "contents" }}>
        {props.fallback}
      </div>
    )
  }
}

function load<T>(
  fn: () => Promise<{
    default: T
  }>,
) {
  return fn().then((m) => m.default)
}
