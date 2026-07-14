/// <reference types="vite/client" />
import type { JSX } from "@solidjs/web"
import {
  ErrorComponent,
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/solid-router"
// import { Loading } from "solid-js"
import { ColorModeProvider, ColorModeScript } from "@opencenter-cloud/kobalte-core"

import SEO from "@/components/seo"
import { Toaster } from "@/registry/ui/sonner"

export const Route = createRootRoute({
  head: () => SEO(),
  component: Outlet,
  shellComponent: RootDocument,
  errorComponent: (props) => {
    return (
      <html lang="en">
        <head>
          <title>Error</title>
        </head>
        <body>
          <div style={{ padding: "20px", color: "red", background: "#f8d7da" }}>
            <h1>Root Error</h1>
            <p>{props.error?.message || String(props.error)}</p>
            <pre>{props.error?.stack}</pre>
          </div>
        </body>
      </html>
    )
  },
})

function RootDocument(props: { children: JSX.Element }) {
  return (
    <html lang="en">
      <head>
        <ColorModeScript />
        <HeadContent />
      </head>
      <body>
        <ColorModeProvider>
          {props.children}
          <Toaster />
        </ColorModeProvider>
        <Scripts />
      </body>
    </html>
  )
}
