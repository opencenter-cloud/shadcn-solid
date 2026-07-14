import { createContext, merge, useContext } from "solid-js"
import { Dynamic } from "@solidjs/web"
import type { JSX } from "@solidjs/web"

type MDXComponents = Record<string, (props: any) => JSX.Element>

// MDX v3 emits string tags (e.g. `"figure"`, `"p"`) in the `_components` map
// and passes them straight to `createComponent`. React tolerates that; Solid's
// `createComponent` calls its first arg as a function, so it fails. Provide
// function wrappers around every HTML tag MDX may emit — they render the tag
// via `Dynamic` so props flow through cleanly.
const HTML_TAGS = [
  "a", "abbr", "address", "area", "article", "aside", "audio",
  "b", "base", "bdi", "bdo", "blockquote", "body", "br", "button",
  "canvas", "caption", "cite", "code", "col", "colgroup",
  "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div",
  "dl", "dt",
  "em", "embed",
  "fieldset", "figcaption", "figure", "footer", "form",
  "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html",
  "i", "iframe", "img", "input", "ins",
  "kbd",
  "label", "legend", "li", "link",
  "main", "map", "mark", "menu", "meta", "meter",
  "nav", "noscript",
  "object", "ol", "optgroup", "option", "output",
  "p", "picture", "pre", "progress",
  "q",
  "rp", "rt", "ruby",
  "s", "samp", "script", "section", "select", "slot", "small", "source",
  "span", "strong", "style", "sub", "summary", "sup", "svg",
  "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead",
  "time", "title", "tr", "track",
  "u", "ul",
  "var", "video",
  "wbr",
]

const defaultComponents: MDXComponents = {}
for (const tag of HTML_TAGS) {
  defaultComponents[tag] = (props: any) => (
    <Dynamic component={tag} {...props} />
  )
}

const MDXContext = createContext<MDXComponents>(defaultComponents)

export function MDXProvider(props: {
  components?: MDXComponents
  children: JSX.Element
}) {
  const existing = useContext(MDXContext)
  return (
    <MDXContext value={merge(existing, props.components ?? {})}>
      {props.children}
    </MDXContext>
  )
}

export function useMDXComponents(): MDXComponents {
  return useContext(MDXContext)
}

export { MDXContext }
