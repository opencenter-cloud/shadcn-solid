import type { ComponentProps, JSX } from "@solidjs/web"
import type { Component } from "solid-js"
import { Match, Show, Switch, lazy, omit } from "solid-js"

import { cx } from "@/registry/lib/cva"
import * as accordion from "@/registry/ui/accordion"

import Callout from "./callout"
import CodeBlockCommand from "./code-block-command"
import CopyButton from "./copy-button"

const ComponentInstallation = lazy(() => import("./component-installation"))
const ComponentSource = lazy(() => import("./component-source"))
const ComponentSourceTabs = lazy(() => import("./component-source-tabs"))
const ComponentPreview = lazy<Component<any>>(() => import("./component-preview"))

type MDXComponents = Record<string, (props: any) => JSX.Element>

export const mdxCustomComponents: MDXComponents = {
  a: (props) => (
    <a class="font-medium underline underline-offset-4" {...props} />
  ),
  h1: (props) => (
    <h1
      class="font-heading mt-2 scroll-m-28 text-3xl font-bold tracking-tight"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      class="font-heading mt-12 scroll-m-28 text-2xl font-medium tracking-tight first:mt-0 lg:mt-20 [&+p]:mt-4! *:[code]:text-2xl"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      class="font-heading mt-8 scroll-m-28 text-xl font-semibold tracking-tight *:[code]:text-xl"
      {...props}
    />
  ),
  h4: (props) => (
    <h4
      class="font-heading mt-8 scroll-m-28 text-lg font-medium tracking-tight"
      {...props}
    />
  ),
  h5: (props) => (
    <h5
      class="mt-8 scroll-m-28 text-lg font-medium tracking-tight"
      {...props}
    />
  ),
  h6: (props) => (
    <h6
      class="mt-8 scroll-m-28 text-base font-medium tracking-tight"
      {...props}
    />
  ),
  li: (props) => <li class="mt-2" {...props} />,
  ol: (props) => <ol class="my-6 ml-6 list-decimal" {...props} />,
  p: (props) => <p class="leading-relaxed not-first:mt-6" {...props} />,
  ul: (props) => <ul class="my-6 ml-6 list-disc" {...props} />,
  strong: (props) => <strong class="font-medium" {...props} />,
  blockquote: (props) => (
    <blockquote class="mt-6 border-l-2 pl-6 italic" {...props} />
  ),
  hr: (props) => <hr class="my-4 md:my-8" {...props} />,
  table: (props) => (
    <div class="my-6 w-full overflow-y-auto">
      <table
        class="relative w-full overflow-hidden border-none text-sm"
        {...props}
      />
    </div>
  ),
  tr: (props) => <tr class="last:border-b-none m-0 border-b" {...props} />,
  th: (props) => (
    <th
      class="px-4 py-2 text-left font-bold [[align=center]]:text-center [[align=right]]:text-right"
      {...props}
    />
  ),
  td: (props) => (
    <td
      class="px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      class="no-scrollbar min-w-0 overflow-x-auto px-4 py-3.5 outline-none has-data-highlighted-line:px-0 has-data-line-numbers:px-0 has-data-[slot=tabs]:p-0"
      {...props}
    />
  ),
  code: (
    props: ComponentProps<"code"> & {
      __raw__?: string
      __src__?: string
      __npm__?: string
      __yarn__?: string
      __pnpm__?: string
      __bun__?: string
    },
  ) => {
    const rest = omit(props, "class", "__raw__", "__src__", "__npm__", "__yarn__", "__pnpm__", "__bun__")

    const isCommand = () =>
      props.__npm__ ?? props.__yarn__ ?? props.__pnpm__ ?? props.__bun__

    return (
      <Switch
        fallback={
          <>
            <Show when={props.__raw__}>
              <CopyButton value={props.__raw__!} />
            </Show>
            <code {...rest} />
          </>
        }
      >
        <Match when={typeof rest.children === "string"}>
          <code
            class={cx(
              "bg-muted relative rounded-md px-[0.3rem] py-[0.2rem] font-mono text-[0.8rem] outline-none",
              props.class,
            )}
            {...rest}
          />
        </Match>

        <Match when={isCommand()}>
          <CodeBlockCommand
            __npm__={props.__npm__}
            __yarn__={props.__yarn__}
            __pnpm__={props.__pnpm__}
            __bun__={props.__bun__}
          />
        </Match>
      </Switch>
    )
  },
  Step: (props: ComponentProps<"div">) => {
    return (
      <div
        class="[&>h3]:step steps mb-12 [counter-reset:step] *:[h3]:first:mt-0!"
        {...props}
      />
    )
  },
  StepItem: (props: ComponentProps<"h3">) => {
    return (
      <h3
        class="font-heading mt-8 scroll-m-32 text-xl font-medium tracking-tight"
        {...props}
      />
    )
  },
  ...accordion,
  ComponentPreview,
  ComponentInstallation,
  ComponentSourceTabs,
  ComponentSource,
  Callout,
}
