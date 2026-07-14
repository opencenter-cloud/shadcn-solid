import type { JSX } from "@solidjs/web"
import { createMemo, onSettled, onCleanup } from "solid-js"
import { createFileRoute } from "@tanstack/solid-router"

import { Index } from "@/registry/__index__"

export const Route = createFileRoute("/view/$name")({
  component: RouteComponent,
})

function RouteComponent() {
  const params = Route.useParams()

  onSettled(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === "kb-color-mode") {
        const colorMode = event.newValue
        if (!colorMode) return

        document.documentElement.setAttribute("data-kb-theme", colorMode)
        document.documentElement.style.colorScheme = colorMode
      }
    }
    window.addEventListener("storage", handler)
    onCleanup(() => { window.removeEventListener("storage", handler); })
  })

  const Component = createMemo(
    () => Index.tailwindcss[params().name]?.component() as JSX.Element,
  )

  return <Component />
}
