import type { LeafletMapConfigInterface, GenericDataRecord } from '@unovis/ts'
import { LeafletMap } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'

export type VisLeafletMapProps<Datum extends GenericDataRecord> = LeafletMapConfigInterface<Datum> & {
  data?: Datum[]
}

export const VisLeafletMapSelectors = LeafletMap.selectors

export function VisLeafletMap<Datum extends GenericDataRecord>(props: VisLeafletMapProps<Datum>) {
  const [component, setComponent] = createSignal<LeafletMap<Datum>>()
  const [ref, setRef] = createSignal<HTMLDivElement>()

  onSettled(() => {
    const r = ref()
    if (r) setComponent(new LeafletMap<Datum>(r, props, props.data))
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
