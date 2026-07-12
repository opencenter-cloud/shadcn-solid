import type { TopoJSONMapConfigInterface } from '@unovis/ts'
import { TopoJSONMap } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisTopoJSONMapProps<AreaDatum, PointDatum, LinkDatum> = TopoJSONMapConfigInterface<AreaDatum, PointDatum, LinkDatum> & {
  data?: { areas?: AreaDatum[]; points?: PointDatum[]; links?: LinkDatum[] }
}

export const VisTopoJSONMapSelectors = TopoJSONMap.selectors

export function VisTopoJSONMap<AreaDatum, PointDatum, LinkDatum>(props: VisTopoJSONMapProps<AreaDatum, PointDatum, LinkDatum>) {
  const [component, setComponent] = createSignal<TopoJSONMap<AreaDatum, PointDatum, LinkDatum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new TopoJSONMap<AreaDatum, PointDatum, LinkDatum>(props))
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
