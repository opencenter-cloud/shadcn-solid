import {
  For,
  Match,
  Show,
  Switch,
  createContext,
  merge,
  omit,
  useContext,
} from "solid-js"
import type { JSX } from "@solidjs/web"
import { render } from "@solidjs/web"
import type { VisCrosshairProps } from "@opencenter-cloud/unovis-solid"
import {
  VisCrosshair,
  VisSingleContainer,
  VisXYContainer,
  type VisSingleContainerProps,
  type VisXYContainerProps,
} from "@opencenter-cloud/unovis-solid"

import { cx } from "@/registry/lib/cva"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: '[data-kb-theme="dark"]' } as const

export type ChartConfig = Record<
  string,
  {
    label?: JSX.Element
    icon?: JSX.Element
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>

interface ChartContextProps {
  config: ChartConfig
}

const ChartContext = createContext<ChartContextProps | null>(null)

const useChart = () => {
  const context = useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

type SingleContainerProps<T> = VisSingleContainerProps<T> & {
  type: "single"
}

type XYContainerProps<T> = VisXYContainerProps<T> & {
  type: "xy"
}

export type ChartContainerProps<T> = (
  | XYContainerProps<T>
  | SingleContainerProps<T>
) &
  ChartContextProps

export const ChartContainer = <T,>(props: ChartContainerProps<T>) => {
  const rest = omit(props, "config", "children", "type", "class")

  return (
    <ChartContext
      value={{
        get config() {
          return props.config
        },
      }}
    >
      <div
        data-slot="chart"
        class={cx("flex aspect-video justify-center", props.class)}
      >
        <Switch>
          <Match when={props.type === "xy"}>
            <VisXYContainer {...(rest as Omit<XYContainerProps<T>, "type">)}>
              <ChartStyle type="xy" config={props.config} />
              {props.children}
            </VisXYContainer>
          </Match>

          <Match when={props.type === "single"}>
            <VisSingleContainer
              {...(rest as Omit<SingleContainerProps<T>, "type">)}
            >
              <ChartStyle type="single" config={props.config} />
              {props.children}
            </VisSingleContainer>
          </Match>
        </Switch>
      </div>
    </ChartContext>
  )
}

export type ChartStyleProps = {
  type: "xy" | "single"
} & Omit<ChartContextProps, "data">

export const ChartStyle = (props: ChartStyleProps) => {
  const colorConfig = () =>
    Object.entries(props.config).filter(
      ([, config]) => config.theme ?? config.color,
    )

  return (
    <Show when={colorConfig().length}>
      <style>
        {Object.entries(THEMES)
          .map(([theme, prefix]) => {
            const colorVars = colorConfig()
              .map(([key, itemConfig]) => {
                const color =
                  itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ??
                  itemConfig.color
                return color ? `  --color-${key}: ${color};` : null
              })
              .join("\n")

            return `${prefix} [data-vis-${props.type}-container] {\n${colorVars}\n}`
          })
          .join("\n\n")}
      </style>
    </Show>
  )
}

export type ChartCrosshairProps<T> = Omit<VisCrosshairProps<T>, "template"> & {
  template?: (
    props: {
      data: T
      x: number | Date
    } & ChartContextProps,
  ) => JSX.Element
}

export const ChartCrosshair = <T,>(props: ChartCrosshairProps<T>) => {
  const rest = omit(props, "template")
  const { config } = useChart()

  const template = (d: T, x: number | Date) => {
    const container = document.createElement("div")
    const Component = () =>
      !props.template ? null : props.template({ data: d, x, config })
    render(() => <Component />, container)
    return container.innerHTML
  }

  return <VisCrosshair template={template} {...rest} />
}

type InferLabelKey<T, C> = C extends ChartConfig
  ? ChartConfig extends C
    ? keyof T
    : keyof C
  : never

const getConfigFromData = <T, C extends ChartConfig = ChartConfig>(
  data: T,
  config: ChartConfig,
  labelKey?: InferLabelKey<T, C>,
  nameKey?: C extends undefined ? never : keyof C,
) => {
  const valueKeys =
    // @ts-expect-error
    Object.entries(data)
      .filter(
        ([key, value]) =>
          key !== labelKey &&
          (typeof value === "number" || typeof value === "object"),
      )
      .filter(([key]) => !key.includes("_"))
      .map(([key]) => key)

  const items = valueKeys.map((key) => {
    const configItem = config[key]
    let color = configItem.color

    // @ts-expect-error
    if (!color && "fill" in data) {
      color = data.fill as string
    }

    const rawValue = data[key as keyof T]
    const value =
      typeof rawValue === "object" && rawValue !== null
        ? Object.values(rawValue).find((v) => typeof v === "number")
        : (rawValue as number)

    return {
      value,
      key: nameKey ? config[nameKey].label : configItem.label,
      icon: configItem.icon,
      color,
    }
  })

  const label = data[labelKey as keyof T] ?? config[labelKey as keyof C].label

  return {
    label,
    items,
  }
}

export type ChartTooltipContentProps<T, C extends ChartConfig = ChartConfig> = {
  data: T
  x: number | Date
  labelKey: InferLabelKey<T, C>
  class?: string
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  nameKey?: C extends undefined ? never : keyof C
  labelFormatter?: (data: number | Date) => JSX.Element
  labelAsKey?: boolean
  formatter?: (
    value: number,
    name: JSX.Element,
    item: T,
    index: number,
  ) => JSX.Element
} & ChartContextProps

export const ChartTooltipContent = <T, C extends ChartConfig = ChartConfig>(
  props: ChartTooltipContentProps<T, C>,
) => {
  const mergedProps = merge(
    {
      hideLabel: false,
      hideIndicator: false,
      indicator: "dot",
      labelAsKey: false,
    } satisfies Partial<ChartTooltipContentProps<T, C>>,
    props,
  )

  const value = () =>
    getConfigFromData<T, C>(
      mergedProps.data,
      mergedProps.config,
      mergedProps.labelKey,
      mergedProps.nameKey,
    )

  const tooltipLabel = () => {
    if (mergedProps.hideLabel || !value().items.length) {
      return null
    }

    return (
      <div class="font-medium capitalize">
        <Show
          when={!mergedProps.labelFormatter}
          fallback={mergedProps.labelFormatter!(
            typeof mergedProps.x === "number" ? Math.round(mergedProps.x) : mergedProps.x,
          )}
        >
          {value().label as JSX.Element}
        </Show>
      </div>
    )
  }

  const nestLabel = () =>
    value().items.length === 1 && mergedProps.indicator !== "dot"

  return (
    <div
      class={cx("grid min-w-[8rem] items-start gap-1.5 text-xs", mergedProps.class)}
    >
      <Show when={!nestLabel()}>{tooltipLabel()}</Show>
      <div class="grid gap-1.5">
        <For each={value().items}>
          {(item, index) => (
            <div
              class={cx(
                "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:size-2.5",
                mergedProps.indicator === "dot" && "items-center",
              )}
            >
              <Show
                when={!mergedProps.formatter}
                fallback={mergedProps.formatter!(
                  item.value!,
                  item.key,
                  mergedProps.data,
                  index(),
                )}
              >
                <Show when={item.icon}>{item.icon}</Show>
                <Show when={!item.icon && !mergedProps.hideIndicator}>
                  <div
                    class={cx(
                      "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                      {
                        "size-2.5": mergedProps.indicator === "dot",
                        "w-1": mergedProps.indicator === "line",
                        "w-0 border-[1.5px] border-dashed bg-transparent":
                          mergedProps.indicator === "dashed",
                        "my-0.5": nestLabel() && mergedProps.indicator === "dashed",
                      },
                    )}
                    style={{
                      "--color-border": item.color,
                      "--color-bg": item.color,
                    }}
                  />
                </Show>
                <div
                  class={cx(
                    "flex flex-1 justify-between gap-1.5 leading-none",
                    nestLabel() ? "items-end" : "items-center",
                  )}
                >
                  <div class="grid gap-1.5">
                    <Show when={nestLabel()}>{tooltipLabel()}</Show>
                    <span class="text-muted-foreground capitalize">
                      <Show
                        when={!mergedProps.labelAsKey}
                        fallback={value().label as string}
                      >
                        {item.key}
                      </Show>
                    </span>
                  </div>
                  <span class="text-foreground font-mono font-medium tabular-nums">
                    {item.value}
                  </span>
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
