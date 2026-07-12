import type { TimelineConfigInterface } from '@unovis/ts'
import { Timeline } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisTimelineProps<Datum> = TimelineConfigInterface<Datum> & {
  data?: Datum[]
}

export const VisTimelineSelectors = Timeline.selectors

export function VisTimeline<Datum>(props: VisTimelineProps<Datum>) {
  const [component, setComponent] = createSignal<Timeline<Datum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new Timeline<Datum>(props))
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
