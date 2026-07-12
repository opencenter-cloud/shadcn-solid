import { Show, merge, omit } from "solid-js"
import type { ComponentProps, JSX } from "@solidjs/web"

import { cx } from "@/registry/lib/cva"

type Props = ComponentProps<"div"> & {
  align?: "center" | "start" | "end"
  hideCode?: boolean
  component: () => JSX.Element
}

const ComponentPreviewTabs = (props: Props) => {
  const mergedProps = merge(
    {
      align: "center",
      hideCode: false,
    } as Props,
    props,
  )
  const rest = omit(mergedProps, "class", "align", "hideCode", "component", "children")

  return (
    <div
      class={cx(
        "group relative mt-4 mb-12 flex flex-col gap-2 rounded-lg border",
        mergedProps.class,
      )}
      {...rest}
    >
      <div data-slot="preview">
        <div
          data-align={mergedProps.align}
          class={cx(
            "preview flex h-[450px] w-full justify-center p-10 has-data-[slot='card']:h-fit has-data-[slot='data-table-demo']:h-full data-[align=center]:items-center data-[align=end]:items-end data-[align=start]:items-start",
          )}
        >
          {mergedProps.component()}
        </div>
        <Show when={!mergedProps.hideCode}>
          <div
            data-slot="code"
            class="overflow-hidden **:data-rehype-pretty-code-figure:m-0! **:data-rehype-pretty-code-figure:rounded-t-none **:data-rehype-pretty-code-figure:border-t [&_pre]:max-h-[400px]"
          >
            {mergedProps.children}
          </div>
        </Show>
      </div>
    </div>
  )
}

export default ComponentPreviewTabs
