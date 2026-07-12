import type { ComponentProps } from "@solidjs/web"
import { For, omit } from "solid-js"
import { Link, useLocation } from "@tanstack/solid-router"

import type { TNavItem } from "@/config/docs"
import { cx } from "@/registry/lib/cva"
import { Button } from "@/registry/ui/button"

const MainNav = (
  props: ComponentProps<"nav"> & {
    items: TNavItem[]
  },
) => {
  const rest = omit(props, "class", "items")
  const location = useLocation()

  return (
    <nav class={cx("items-center gap-0.5", props.class)} {...rest}>
      <For each={props.items}>
        {(item) => (
          <Button<typeof Link>
            variant="ghost"
            size="sm"
            as={(props) => (
              <Link
                to={item.href}
                class={cx(location().pathname === item.href && "text-primary")}
                {...props}
              >
                {item.title}
              </Link>
            )}
          />
        )}
      </For>
    </nav>
  )
}

export default MainNav
