import { SingleContainer } from '@unovis/ts'
import type {
  Annotations,
  Tooltip,
  SingleContainerConfigInterface,
  ComponentCore,
} from '@unovis/ts'
import type { ParentProps } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { createEffect, createSignal, createStore, omit, onCleanup } from 'solid-js'
import type { VisContainerContextProps } from '../../utils/context'
import { VisContainerContext } from '../../utils/context'
import { createTrigger } from '../../utils/trigger'
import { combineStyle } from '../../utils/combine-style'

export type VisSingleContainerProps<Datum> = ParentProps<
  SingleContainerConfigInterface<Datum> & {
    data?: Datum
    class?: string
    style?: JSX.CSSProperties
  }
>

export function VisSingleContainer<Datum>(
  props: VisSingleContainerProps<Datum>
) {
  const divProps = () => ({ children: props.children, class: props.class })
  const styleVal = () => props.style
  const dataVal = () => props.data
  const rest = () => omit(props, 'children', 'class', 'style', 'data')

  const [ref, setRef] = createSignal<HTMLDivElement>()
  const [chart, setChart] = createSignal<SingleContainer<Datum>>()
  const [config, setConfig] = createStore<
    SingleContainerConfigInterface<Datum>
  >({
    component: undefined,
    annotations: undefined,
    tooltip: undefined,
  })
  const [track, dirty] = createTrigger()

  const init = () => {
    const c = chart()
    const r = ref()

    if (c) return
    if (r && config.component)
      setChart(new SingleContainer(r, config, dataVal()))
  }

  onCleanup(() => chart()?.destroy())

  createEffect(
    () => dataVal(),
    (data) => {
      if (data) chart()?.setData(data)
    }
  )

  createEffect(() => {
    init()
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
            c.component = value() as ComponentCore<Datum>
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

  const destroy: VisContainerContextProps['destroy'] = (key) => {
    setConfig(
      (c) => {
        switch (key) {
          case 'component':
            c.component = undefined
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
        data-vis-single-container
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
