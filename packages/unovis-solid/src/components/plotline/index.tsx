import type { PlotlineConfigInterface } from '@unovis/ts'
import { Plotline } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisPlotlineProps<Datum> = PlotlineConfigInterface<Datum>

export const VisPlotlineSelectors = Plotline.selectors

export function VisPlotline<Datum>(props: VisPlotlineProps<Datum>) {
  const [component, setComponent] = createSignal<Plotline<Datum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new Plotline<Datum>(props))
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

  return <div data-vis-component />
}
