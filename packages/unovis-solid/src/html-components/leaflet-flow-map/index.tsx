import type { LeafletFlowMapConfigInterface, GenericDataRecord } from '@unovis/ts'
import { LeafletFlowMap } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'

export type VisLeafletFlowMapProps<PointDatum extends GenericDataRecord, FlowDatum extends GenericDataRecord> = LeafletFlowMapConfigInterface<PointDatum, FlowDatum> & {
  data?: { points: PointDatum[]; flows?: FlowDatum[] }
}

export const VisLeafletFlowMapSelectors = LeafletFlowMap.selectors

export function VisLeafletFlowMap<PointDatum extends GenericDataRecord, FlowDatum extends GenericDataRecord>(props: VisLeafletFlowMapProps<PointDatum, FlowDatum>) {
  const [component, setComponent] = createSignal<LeafletFlowMap<PointDatum, FlowDatum>>()
  const [ref, setRef] = createSignal<HTMLDivElement>()

  onSettled(() => {
    const r = ref()
    if (r) setComponent(new LeafletFlowMap<PointDatum, FlowDatum>(r, props, props.data))
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

  return <div ref={setRef} style={{ display: 'block', position: 'relative' }} />
}
