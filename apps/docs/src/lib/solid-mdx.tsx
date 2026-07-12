import { createContext, merge, useContext } from "solid-js"
import { Dynamic } from "@solidjs/web"
import type { JSX } from "@solidjs/web"

type MDXComponents = Record<string, (props: any) => JSX.Element>

const MDXContext = createContext<MDXComponents>({})

export function MDXProvider(props: {
  components?: MDXComponents
  children: JSX.Element
}) {
  const existing = useContext(MDXContext)
  const merged = merge(existing, props.components ?? {})
  return (
    <MDXContext value={merged}>
      {props.children}
    </MDXContext>
  )
}

export function useMDXComponents(): MDXComponents {
  return useContext(MDXContext)
}

export { MDXContext }
