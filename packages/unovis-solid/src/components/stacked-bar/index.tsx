import type { StackedBarConfigInterface } from '@unovis/ts'
import { StackedBar } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisStackedBarProps<Datum> = StackedBarConfigInterface<Datum> & {
  data?: Datum[]
}

export const VisStackedBarSelectors = StackedBar.selectors

export function VisStackedBar<Datum>(props: VisStackedBarProps<Datum>) {
  const [component, setComponent] = createSignal<StackedBar<Datum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new StackedBar<Datum>(props))
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
