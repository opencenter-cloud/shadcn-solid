import type { GroupedBarConfigInterface } from '@unovis/ts'
import { GroupedBar } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisGroupedBarProps<Datum> = GroupedBarConfigInterface<Datum> & {
  data?: Datum[]
}

export const VisGroupedBarSelectors = GroupedBar.selectors

export function VisGroupedBar<Datum>(props: VisGroupedBarProps<Datum>) {
  const [component, setComponent] = createSignal<GroupedBar<Datum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new GroupedBar<Datum>(props))
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
