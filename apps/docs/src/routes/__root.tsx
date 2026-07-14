/// <reference types="vite/client" />
import type { JSX } from "@solidjs/web"
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/solid-router"
import { Loading } from "solid-js"
import { ColorModeProvider, ColorModeScript } from "@opencenter-cloud/kobalte-core"

import SEO from "@/components/seo"
import { Toaster } from "@/registry/ui/sonner"

export const Route = createRootRoute({
  head: () => SEO(),
  component: Outlet,
  shellComponent: RootDocument,
})

function RootDocument(props: { children: JSX.Element }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ColorModeScript />
        <ColorModeProvider>
          <Loading fallback={null}>{props.children}</Loading>
          <Toaster />
        </ColorModeProvider>
        <Scripts />
      </body>
    </html>
  )
}
