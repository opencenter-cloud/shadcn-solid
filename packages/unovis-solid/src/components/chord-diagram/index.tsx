import type { ChordDiagramConfigInterface, ChordInputNode, ChordInputLink } from '@unovis/ts'
import { ChordDiagram } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisChordDiagramProps<N extends ChordInputNode, L extends ChordInputLink> = ChordDiagramConfigInterface<N, L> & {
  data?: { nodes: N[]; links?: L[] }
}

export const VisChordDiagramSelectors = ChordDiagram.selectors

export function VisChordDiagram<N extends ChordInputNode, L extends ChordInputLink>(props: VisChordDiagramProps<N, L>) {
  const [component, setComponent] = createSignal<ChordDiagram<N, L>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new ChordDiagram<N, L>(props))
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
