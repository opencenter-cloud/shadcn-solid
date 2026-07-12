/// <reference types="vite/client" />
import type { JSX } from "@solidjs/web"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/solid-router"
import { ColorModeProvider, ColorModeScript } from "@opencenter-cloud/kobalte-core"

import SEO from "@/components/seo"
import { Toaster } from "@/registry/ui/sonner"

export const Route = createRootRoute({
  head: () => SEO(),
  shellComponent: RootDocument,
})

function RootDocument(props: { children: JSX.Element }) {
  return (
    <>
      <HeadContent />
      <ColorModeScript />
      <ColorModeProvider>
        {props.children}
        <Toaster />
      </ColorModeProvider>
      <Scripts />
    </>
  )
}
