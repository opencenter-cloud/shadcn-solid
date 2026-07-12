import type { BulletLegendConfigInterface } from '@unovis/ts'
import { BulletLegend } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'

export type VisBulletLegendProps = BulletLegendConfigInterface

export const VisBulletLegendSelectors = BulletLegend.selectors

export function VisBulletLegend(props: VisBulletLegendProps) {
  const [component, setComponent] = createSignal<BulletLegend>()
  const [ref, setRef] = createSignal<HTMLDivElement>()

  onSettled(() => {
    const r = ref()
    if (r) setComponent(new BulletLegend(r, { ...props, renderIntoProvidedDomNode: true }))
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

  return <div ref={setRef} style={{ display: 'block' }} />
}
