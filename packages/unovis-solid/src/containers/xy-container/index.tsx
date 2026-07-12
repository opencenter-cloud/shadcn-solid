import { XYContainer } from '@unovis/ts'
import type {
  Annotations,
  Axis,
  Crosshair,
  Tooltip,
  XYComponentCore,
  XYContainerConfigInterface,
} from '@unovis/ts'
import type { JSX, ParentProps } from 'solid-js'
import {
  createEffect,
  createSignal,
  createStore,
  omit,
  onCleanup,
  onSettled,
} from 'solid-js'
import type { VisContainerContextProps } from '../../utils/context'
import { VisContainerContext } from '../../utils/context'
import { createTrigger } from '../../utils/trigger'
import { combineStyle } from '../../utils/combine-style'

export type VisXYContainerProps<Datum> = ParentProps<
  XYContainerConfigInterface<Datum> & {
    data?: Datum[]
    class?: string
    style?: JSX.CSSProperties
  }
>

export function VisXYContainer<Datum>(props: VisXYContainerProps<Datum>) {
  const divProps = () => ({ children: props.children, class: props.class })
  const styleVal = () => props.style
  const dataVal = () => props.data
  const rest = () => omit(props, ['children', 'class', 'style', 'data'])

  const [ref, setRef] = createSignal<HTMLDivElement>()
  const [chart, setChart] = createSignal<XYContainer<Datum>>()
  const [config, setConfig] = createStore<XYContainerConfigInterface<Datum>>({
    components: [],
    annotations: undefined,
    crosshair: undefined,
    tooltip: undefined,
    xAxis: undefined,
    yAxis: undefined,
  })
  const [track, dirty] = createTrigger()

  onSettled(() => {
    const r = ref()
    if (r) setChart(new XYContainer(r, config, dataVal()))
  })

  onCleanup(() => chart()?.destroy())

  createEffect(
    () => dataVal(),
    (data) => {
      if (data) chart()?.setData(data)
    }
  )

  createEffect(() => {
    track()
    return { ...config, ...rest() }
  }, (cfg) => {
    chart()?.updateContainer(cfg)
  })

  const update: VisContainerContextProps['update'] = (key, value) => {
    setConfig(
      (c) => {
        switch (key) {
          case 'component':
            c.components = [
              ...(c.components as XYComponentCore<Datum>[]),
              value() as XYComponentCore<Datum>,
            ]
            break
          case 'axis':
            // @ts-expect-error -- dynamic key
            c[`${(value() as Axis<Datum>).config.type}Axis`] =
              value() as Axis<Datum>
            break
          case 'crosshair':
            c.crosshair = value() as Crosshair<Datum>
            break
          case 'annotations':
            c.annotations = value() as Annotations
            break
          case 'tooltip':
            c.tooltip = value() as Tooltip
        }
      }
    )
  }

  const destroy: VisContainerContextProps['destroy'] = (key, value) => {
    setConfig(
      (c) => {
        switch (key) {
          case 'component':
            c.components = c.components?.filter((i) => !i.isDestroyed())
            break
          case 'axis':
            // @ts-expect-error -- dynamic key
            c[`${value}Axis`] = undefined
            break
          case 'crosshair':
            c.crosshair = undefined
            break
          case 'annotations':
            c.annotations = undefined
            break
          case 'tooltip':
            c.tooltip = undefined
        }
      }
    )
  }

  return (
    <VisContainerContext value={{ update, destroy, dirty }}>
      <div
        data-vis-xy-container
        ref={setRef}
        style={combineStyle(
          {
            display: 'block',
            position: 'relative',
            width: '100%',
          },
          styleVal()
        )}
        class={divProps().class}
      >
        {divProps().children}
      </div>
    </VisContainerContext>
  )
}
