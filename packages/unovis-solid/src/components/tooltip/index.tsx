import type { TooltipConfigInterface } from '@unovis/ts'
import { Tooltip } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisTooltipProps = TooltipConfigInterface

export const VisTooltipSelectors = Tooltip.selectors

export function VisTooltip(props: VisTooltipProps) {
  const [component, setComponent] = createSignal<Tooltip>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new Tooltip(props))
    ctx.update('tooltip', component)
  })

  onCleanup(() => {
    component()?.destroy()
    ctx.destroy('tooltip')
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

  return <div data-vis-tooltip />
}
