import { Show, omit } from "solid-js"
import type { ComponentProps, JSX } from "@solidjs/web"

import { cx } from "@/registry/lib/cva"
import { Alert, AlertDescription, AlertTitle } from "@/registry/ui/alert"

const Callout = (
  props: ComponentProps<typeof Alert> & { icon?: JSX.Element },
) => {
  const rest = omit(props, "class", "icon", "title", "children")

  return (
    <Alert
      class={cx(
        "bg-surface text-surface-foreground mt-6 w-auto border-none md:-mx-4",
        props.class,
      )}
      {...rest}
    >
      {props.icon}
      <Show when={props.title}>
        <AlertTitle>{props.title}</AlertTitle>
      </Show>
      <AlertDescription class="text-card-foreground/80">
        {props.children}
      </AlertDescription>
    </Alert>
  )
}

export default Callout
