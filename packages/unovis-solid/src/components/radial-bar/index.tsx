import type { RadialBarConfigInterface } from '@unovis/ts'
import { RadialBar } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisRadialBarProps<Datum> = RadialBarConfigInterface<Datum> & {
  data?: Datum[]
}

export const VisRadialBarSelectors = RadialBar.selectors

export function VisRadialBar<Datum>(props: VisRadialBarProps<Datum>) {
  const [component, setComponent] = createSignal<RadialBar<Datum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new RadialBar<Datum>(props))
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
