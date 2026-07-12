import type { PlotbandConfigInterface } from '@unovis/ts'
import { Plotband } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisPlotbandProps<Datum> = PlotbandConfigInterface<Datum>

export const VisPlotbandSelectors = Plotband.selectors

export function VisPlotband<Datum>(props: VisPlotbandProps<Datum>) {
  const [component, setComponent] = createSignal<Plotband<Datum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new Plotband<Datum>(props))
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
