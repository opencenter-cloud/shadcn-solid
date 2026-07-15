/* eslint-disable */
// @ts-ignore
// @refresh skip
import type { Component } from "solid-js"
import type { ComponentProps, JSX } from "@solidjs/web"
import { omit } from "solid-js"
import { isServer, render } from "@solidjs/web"

/**
 *
 * Read more: https://docs.solidjs.com/solid-start/reference/client/client-only
 */
// not using Suspense
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
    if (!isServer)
      setTimeout(() => {
        if (!host) return
        loadOnce().then((Comp) => {
          render(() => <Comp {...rest} />, host!)
        })
      }, 0)
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
