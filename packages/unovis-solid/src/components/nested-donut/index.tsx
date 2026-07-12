import type { NestedDonutConfigInterface } from '@unovis/ts'
import { NestedDonut } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisNestedDonutProps<Datum> = NestedDonutConfigInterface<Datum> & {
  data?: Datum[]
}

export const VisNestedDonutSelectors = NestedDonut.selectors

export function VisNestedDonut<Datum>(props: VisNestedDonutProps<Datum>) {
  const [component, setComponent] = createSignal<NestedDonut<Datum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new NestedDonut<Datum>(props))
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
