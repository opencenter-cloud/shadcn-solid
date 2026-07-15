/* @refresh skip */
/// <reference types="vite/client" />
import type { JSX } from "@solidjs/web"
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/solid-router"
import { ColorModeProvider } from "@opencenter-cloud/kobalte-core"

import SEO from "@/components/seo"
import { Toaster } from "@/registry/ui/sonner"

export const Route = createRootRoute({
  head: () => ({
    ...SEO(),
    headScripts: [
      ...(SEO().scripts ?? []),
      {
        // ColorModeScript inline — static, no reactive primitives.
        // Cannot use <ColorModeScript /> component in shellComponent (lesson #28).
        id: "kb-color-mode-script",
        children: `!(function(){try{var a=function(c){var v="(prefers-color-scheme: dark)",h=window.matchMedia(v).matches?"dark":"light",r=c==="system"?h:c,o=document.documentElement,i=r==="dark";return o.style.colorScheme=r,o.dataset.kbTheme=r,c},n=a,m="system",e="kb-color-mode",t=localStorage.getItem(e);t?a(t):localStorage.setItem(e,a(m))}catch(a){}})();`,
      },
    ],
  }),
  component: RootComponent,
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

/**
 * Root component — wraps ALL routes with providers.
 * Context providers and reactive components belong here, NOT in shellComponent.
 * See SOLID2-MIGRATION-LESSONS.md lesson #28.
 */
function RootComponent() {
  return (
    <ColorModeProvider>
      <Outlet />
      <Toaster />
    </ColorModeProvider>
  )
}

/**
 * Shell component — the static HTML document skeleton.
 * ONLY static HTML elements and framework-provided components here.
 * NO context providers, NO components using reactive primitives.
 */
function RootDocument(props: { children: JSX.Element }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {props.children}
        <Scripts />
      </body>
    </html>
  )
}
