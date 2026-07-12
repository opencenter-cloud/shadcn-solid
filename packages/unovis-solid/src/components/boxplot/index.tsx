import type { BoxplotConfigInterface } from '@unovis/ts'
import { Boxplot } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisBoxplotProps<Datum> = BoxplotConfigInterface<Datum> & {
  data?: Datum[]
}

export const VisBoxplotSelectors = Boxplot.selectors

export function VisBoxplot<Datum>(props: VisBoxplotProps<Datum>) {
  const [component, setComponent] = createSignal<Boxplot<Datum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new Boxplot<Datum>(props))
    if (props.data) component()?.setData(props.data)
    ctx.update('component', component)
  })

  onCleanup(() => {
    component()?.destroy()
    ctx.destroy('component')
  })

  createEffect(
    () => ({ ...props }),
    (curr, prev) => {
      if (!arePropsEqual(prev, curr)) {
        component()?.setConfig(curr)
        ctx.dirty()
      }
    }
  )

  createEffect(
    () => props.data,
    (data) => {
      if (data) {
        component()?.setData(data)
        ctx.dirty()
      }
    }
  )

  return <div data-vis-component />
}
