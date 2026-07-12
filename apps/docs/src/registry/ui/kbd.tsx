import { omit } from "solid-js"

import { cx } from "@/registry/lib/cva"
import type { ComponentProps } from "@solidjs/web";

export type KbdProps = ComponentProps<"kbd">

export const Kbd = (props: KbdProps) => {
  const rest = omit(props, "class")

  return (
    <kbd
      data-slot="kbd"
      class={cx(
        "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium select-none",
        "[&_svg:not([class*='size-'])]:size-3",
        "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        props.class,
      )}
      {...rest}
    />
  )
}

export type KbdGroupProps = ComponentProps<"div">

export const KbdGroup = (props: KbdGroupProps) => {
  const rest = omit(props, "class")

  return (
    <div
      data-slot="kbd-group"
      class={cx("inline-flex items-center gap-1", props.class)}
      {...rest}
    />
  )
}
