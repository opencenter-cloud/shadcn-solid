import type { GraphConfigInterface, GraphInputNode, GraphInputLink } from '@unovis/ts'
import { Graph } from '@unovis/ts'
import { createSignal, onCleanup, createEffect, onSettled } from 'solid-js'
import { arePropsEqual } from '../../utils/props'
import { useVisContainer } from '../../utils/context'

export type VisGraphProps<N extends GraphInputNode, L extends GraphInputLink> = GraphConfigInterface<N, L> & {
  data?: { nodes: N[]; links?: L[] }
}

export const VisGraphSelectors = Graph.selectors

export function VisGraph<N extends GraphInputNode, L extends GraphInputLink>(props: VisGraphProps<N, L>) {
  const [component, setComponent] = createSignal<Graph<N, L>>()
  const ctx = useVisContainer()

  onSettled(() => {
    setComponent(new Graph<N, L>(props))
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
