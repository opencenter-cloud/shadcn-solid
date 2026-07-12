import type { RollingPinLegendConfigInterface } from '@unovis/ts'
import { RollingPinLegend } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'

export type VisRollingPinLegendProps = RollingPinLegendConfigInterface

export const VisRollingPinLegendSelectors = RollingPinLegend.selectors

export function VisRollingPinLegend(props: VisRollingPinLegendProps) {
  const [component, setComponent] = createSignal<RollingPinLegend>()
  const [ref, setRef] = createSignal<HTMLDivElement>()

  onSettled(() => {
    const r = ref()
    if (r) setComponent(new RollingPinLegend(r, props))
  })

  onCleanup(() => {
    component()?.destroy()
  })

  createEffect(
    () => ({ ...props }),
    (curr, prev) => {
      if (!arePropsEqual(prev, curr)) {
        component()?.setConfig(curr)
      }
    }
  )

  return <div data-vis-component ref={setRef} style={{ display: 'block' }} />
}
