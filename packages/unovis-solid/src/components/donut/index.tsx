import type { DonutConfigInterface } from '@unovis/ts'
import { Donut } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisDonutProps<Datum> = DonutConfigInterface<Datum> & {
  data?: Datum[]
}

export const VisDonutSelectors = Donut.selectors

export function VisDonut<Datum>(props: VisDonutProps<Datum>) {
  const [component, setComponent] = createSignal<Donut<Datum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new Donut<Datum>(props))
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
