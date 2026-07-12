import type { LineConfigInterface } from '@unovis/ts'
import { Line } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisLineProps<Datum> = LineConfigInterface<Datum> & {
  data?: Datum[]
}

export const VisLineSelectors = Line.selectors

export function VisLine<Datum>(props: VisLineProps<Datum>) {
  const [component, setComponent] = createSignal<Line<Datum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new Line<Datum>(props))
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
