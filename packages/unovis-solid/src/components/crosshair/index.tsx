import type { CrosshairConfigInterface } from '@unovis/ts'
import { Crosshair } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisCrosshairProps<Datum> = CrosshairConfigInterface<Datum> & {
  data?: Datum[]
}

export const VisCrosshairSelectors = Crosshair.selectors

export function VisCrosshair<Datum>(props: VisCrosshairProps<Datum>) {
  const [component, setComponent] = createSignal<Crosshair<Datum>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new Crosshair<Datum>(props))
    if (props.data) component()?.setData(props.data)
    ctx.update('crosshair', component)
  })

  onCleanup(() => {
    component()?.destroy()
    ctx.destroy('crosshair')
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

  return <div data-vis-crosshair />
}
