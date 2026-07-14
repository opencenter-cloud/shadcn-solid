import type { JSX, ComponentProps } from "@solidjs/web"
import {
  Match,
  Switch,
  createMemo,
  merge,
  omit,
} from "solid-js"

import { Index } from "@/registry/__index__"

import ComponentPreviewTabs from "./component-preview-tabs"

type Props = ComponentProps<"div"> & {
  name: string
  align?: "center" | "start" | "end"
  description?: string
  hideCode?: boolean
  type?: "block" | "component" | "example"
}

const ComponentPreview = (props: Props) => {
  const mergedProps = merge(
    {
      align: "center",
      hideCode: false,
    } as Props,
    props,
  )
  const rest = omit(mergedProps, "name", "type", "align", "hideCode")

  const registryEntry = createMemo(
    () => Index.tailwindcss[mergedProps.name],
  )

  const component = createMemo(
    () => registryEntry()?.component() as JSX.Element,
  )

  return (
    <Switch
      fallback={
        <ComponentPreviewTabs
          align={mergedProps.align}
          hideCode={mergedProps.hideCode}
          component={component}
          {...rest}
        />
      }
    >
      <Match when={!registryEntry()}>
        <p class="text-muted-foreground text-sm">
          Component{" "}
          <code class="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm">
            {mergedProps.name}
          </code>{" "}
          not found in registry.
        </p>
      </Match>
      <Match when={mergedProps.type === "block"}>
        <div class="relative aspect-[4/2.5] w-full overflow-hidden rounded-md border md:-mx-1">
          <div class="bg-background absolute inset-0 hidden w-[1600px] md:block">
            <iframe
              title="Block"
              src={`/view/${mergedProps.name}`}
              class="size-full"
            />
          </div>
        </div>
      </Match>
    </Switch>
  )
}

export default ComponentPreview
