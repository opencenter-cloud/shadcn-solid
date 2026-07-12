import type { FlowLegendConfigInterface } from '@unovis/ts'
import { FlowLegend } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'

export type VisFlowLegendProps = FlowLegendConfigInterface

export const VisFlowLegendSelectors = FlowLegend.selectors

export function VisFlowLegend(props: VisFlowLegendProps) {
  const [component, setComponent] = createSignal<FlowLegend>()
  const [ref, setRef] = createSignal<HTMLDivElement>()

  onSettled(() => {
    const r = ref()
    if (r) setComponent(new FlowLegend(r, { ...props, renderIntoProvidedDomNode: true }))
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
