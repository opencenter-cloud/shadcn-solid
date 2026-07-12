import type { BrushConfigInterface } from '@unovis/ts'
import { Brush } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisBrushProps<Datum> = BrushConfigInterface<Datum> & {
  data?: Datum[]
}

export const VisBrushSelectors = Brush.selectors

export function VisBrush<Datum>(props: VisBrushProps<Datum>) {
  const [component, setComponent] = createSignal<Brush<Datum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new Brush<Datum>(props))
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
