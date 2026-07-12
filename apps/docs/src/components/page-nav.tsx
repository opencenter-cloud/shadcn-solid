import { omit } from "solid-js"
import type { ComponentProps } from "@solidjs/web"

import { cx } from "@/registry/lib/cva"

const PageNav = (props: ComponentProps<"div">) => {
  const rest = omit(props, "class", "children")

  return (
    <div class={cx("container-wrapper scroll-mt-24", props.class)} {...rest}>
      <div class="container flex items-center justify-between gap-4 py-4">
        {props.children}
      </div>
    </div>
  )
}

export default PageNav
