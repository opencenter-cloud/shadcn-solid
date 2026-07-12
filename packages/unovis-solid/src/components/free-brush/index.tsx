import type { FreeBrushConfigInterface } from '@unovis/ts'
import { FreeBrush } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisFreeBrushProps<Datum> = FreeBrushConfigInterface<Datum> & {
  data?: Datum[]
}

export const VisFreeBrushSelectors = FreeBrush.selectors

export function VisFreeBrush<Datum>(props: VisFreeBrushProps<Datum>) {
  const [component, setComponent] = createSignal<FreeBrush<Datum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new FreeBrush<Datum>(props))
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
