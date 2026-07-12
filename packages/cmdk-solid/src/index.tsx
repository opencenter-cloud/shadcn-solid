import { Dialog as KobalteDialog } from '@opencenter-cloud/kobalte-core/dialog'
import type { DialogRootProps } from '@opencenter-cloud/kobalte-core/dialog'
import { mergeDefaultProps, mergeRefs } from '@opencenter-cloud/kobalte-utils'
import { trackDeep } from '@solid-primitives/deep'
import {
  Accessor,
  Component,
  ParentComponent,
  Show,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createStore,
  createUniqueId,
  merge,
  omit,
  onCleanup,
  onSettled,
  useContext,
} from 'solid-js'
import type { JSX } from '@solidjs/web'
import { commandScore } from './command-score'

type Children = { children?: JSX.Element }
type DivProps = JSX.IntrinsicElements['div']

export type CommandLoadingProps = Children &
  DivProps & {
    /** Estimated progress of loading asynchronous options. */
    progress?: number
    /**
     * Accessible label for this loading progressbar. Not shown visibly.
     */
    label?: string
  }

export type CommandEmptyProps = Children & DivProps & {}
export type CommandSeparatorProps = DivProps & {
  /** Whether this separator should always be rendered. Useful if you disable automatic filtering. */
  alwaysRender?: boolean
}
export type CommandDialogProps = DialogRootProps &
  CommandRootProps & {
    /** Provide a className to the Dialog overlay. */
    overlayClassName?: string
    /** Provide a className to the Dialog content. */
    contentClassName?: string
    /** Provide a custom element the Dialog should portal into. */
    container?: HTMLElement
  }
export type CommandListProps = Children &
  DivProps & {
    /**
     * Accessible label for this List of suggestions. Not shown visibly.
     */
    label?: string
  }
export type CommandItemProps = Children &
  Omit<DivProps, 'disabled' | 'onSelect' | 'value'> & {
    /** Whether this item is currently disabled. */
    disabled?: boolean
    /** Event handler for when this item is selected, either via click or keyboard selection. */
    onSelect?: (value: string) => void
    /**
     * A unique value for this item.
     * If no value is provided, it will be inferred from `children` or the rendered `textContent`. If your `textContent` changes between renders, you _must_ provide a stable, unique `value`.
     */
    value?: string
    /** Optional keywords to match against when filtering. */
    keywords?: string[]
    /** Whether this item is forcibly rendered regardless of filtering. */
    forceMount?: boolean
  }
export type CommandGroupProps = Children &
  Omit<DivProps, 'heading' | 'value'> & {
    /** Optional heading to render for this group. */
    heading?: JSX.Element
    /** If no heading is provided, you must provide a value that is unique for this group. */
    value?: string
    /** Whether this group is forcibly rendered regardless of filtering. */
    forceMount?: boolean
  }
export type CommandInputProps = Omit<JSX.IntrinsicElements['input'], 'value' | 'onChange' | 'type'> & {
  /**
   * Optional controlled state for the value of the search input.
   */
  value?: string
  /**
   * Event handler called when the search value changes.
   */
  onValueChange?: (search: string) => void
}
export type CommandRootProps = Children &
  DivProps & {
    /**
     * Accessible label for this command menu. Not shown visibly.
     */
    label?: string
    /**
     * Optionally set to `false` to turn off the automatic filtering and sorting.
     * If `false`, you must conditionally render valid items based on the search query yourself.
     */
    shouldFilter?: boolean
    /**
     * Custom filter function for whether each command menu item should matches the given search query.
     * It should return a number between 0 and 1, with 1 being the best match and 0 being hidden entirely.
     * By default, uses the `command-score` library.
     */
    filter?: (value: string, search: string, keywords?: string[]) => number
    /**
     * Optional default item value when it is initially rendered.
     */
    defaultValue?: string
    /**
     * Optional controlled state of the selected command menu item.
     */
    value?: string
    /**
     * Event handler called when the selected item of the menu changes.
     */
    onValueChange?: (value: string) => void
    /**
     * Optionally set to `true` to turn on looping around when using the arrow keys.
     */
    loop?: boolean
    /**
     * Optionally set to `true` to disable selection via pointer events.
     */
    disablePointerSelection?: boolean
    /**
     * Set to `false` to disable ctrl+n/j/p/k shortcuts. Defaults to `true`.
     */
    vimBindings?: boolean
  }

type Context = {
  value: (id: string, value: string, keywords?: string[]) => void
  item: (id: string, groupId?: string) => void
  group: (id: string) => void
  filter: () => boolean
  label: Accessor<string>
  disablePointerSelection: Accessor<boolean>
  // Ids
  listId: string
  labelId: string
  inputId: string
  // Refs
  listInnerRef: Accessor<HTMLDivElement | null>
  setListInnerRef: (el: HTMLDivElement | null) => void
}

type State = {
  search: string
  value: string
  filtered: { count: number; items: Record<string, number>; groups: string[] }
  items: string[]
  groups: Record<string, string[]>
  ids: Record<string, { value: string; keywords?: string[] }>
}

type Store = {
  state: State
  snapshot: () => State
  setState: <K extends keyof State>(key: K, value: State[K], opts?: any) => void
}

type Group = {
  id: string
  forceMount?: boolean
}

const GROUP_SELECTOR = `[cmdk-group=""]`
const GROUP_ITEMS_SELECTOR = `[cmdk-group-items=""]`
const GROUP_HEADING_SELECTOR = `[cmdk-group-heading=""]`
const ITEM_SELECTOR = `[cmdk-item=""]`
const VALID_ITEM_SELECTOR = `${ITEM_SELECTOR}:not([aria-disabled="true"])`
const SELECT_EVENT = `cmdk-item-select`
const VALUE_ATTR = `data-value`
const defaultFilter: NonNullable<CommandRootProps['filter']> = (value, search, keywords) =>
  commandScore(value, search, keywords)

// Solid 2: createContext with null default (lesson #3)
const CommandContext = createContext<Context | null>(null)
const useCommand = () => {
  const ctx = useContext(CommandContext)
  if (!ctx) throw new Error('useCommand must be used within a Command component')
  return ctx
}
const StoreContext = createContext<Store | null>(null)
const useStore = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a Command component')
  return ctx
}
const GroupContext = createContext<Accessor<Group> | null>(null)

const Command: Component<CommandRootProps> = (props) => {
  const [state, setState] = createStore<State>({
    search: '',
    value: props.value ?? props.defaultValue ?? '',
    filtered: { count: 0, items: {}, groups: [] },
    items: [],
    groups: {},
    ids: {},
  })

  // Solid 2: split-phase createEffect for filtering
  createEffect(
    () => {
      trackDeep(state.ids)
      const skipFiltering = !state.search || props.shouldFilter === false
      const items: Record<string, number> = state.items.reduce(
        (acc, id: string) => {
          acc[id] = skipFiltering ? 1 : score(state.ids[id]!.value, state.ids[id]!.keywords)
          return acc
        },
        {} as Record<string, number>,
      )
      const groups = Object.keys(state.groups).filter((groupId) => {
        return state.groups[groupId]!.some((id: string) => (items[id] || 0) > 0)
      })
      const count = Object.values(items).filter((score) => score > 0).length
      return { count, items, groups }
    },
    (filtered) => {
      setState(s => { s.filtered = filtered })
    },
  )

  const mergedProps = mergeDefaultProps({ vimBindings: true, disablePointerSelection: false }, props)

  // Solid 2: omit instead of splitProps — extract the rest props
  const localKeys = [
    'label',
    'children',
    'value',
    'onValueChange',
    'filter',
    'shouldFilter',
    'loop',
    'disablePointerSelection',
    'vimBindings',
  ] as const
  const etc = omit(mergedProps, ...localKeys)

  const listId = createUniqueId()
  const labelId = createUniqueId()
  const inputId = createUniqueId()

  const [listInnerRef, setListInnerRef] = createSignal<HTMLDivElement | null>(null)

  const schedule = useScheduleLayoutEffect()

  // Solid 2: split-phase effect for controlled value
  createEffect(
    () => mergedProps.value,
    (controlledValue) => {
      if (controlledValue !== undefined) {
        const v = controlledValue.trim()
        if (v != state.value) {
          setState(s => { s.value = v })
        }
      }
    },
  )

  // Solid 2: onSettled replaces onMount
  onSettled(() => {
    schedule(6, scrollSelectedIntoView)
  })

  const store: Store = {
    state,
    snapshot: () => trackDeep(state),
    setState: (key, value, opts) => {
      if (Object.is(state[key], value)) return
      setState(s => { (s as any)[key] = value })

      if (key === 'search') {
        schedule(8, selectFirstItem)
      } else if (key === 'value') {
        if (!opts) {
          schedule(5, scrollSelectedIntoView)
        }
        if (props.value !== undefined) {
          const newValue = (value ?? '') as string
          props.onValueChange?.(newValue)
          return
        }
      }
    },
  }

  const context: Context = {
    value: (id: string, value: string, keywords?: string[]) => {
      setState(s => {
        s.ids = { ...s.ids, [id]: { value, keywords } }
      })
    },
    item: (id: string, groupId?: string) => {
      if (!listInnerRef()) {
        console.warn('Mount Command.Item inside a Command.List component.')
      }
      setState(s => {
        s.items = Array.from(new Set([...s.items, id]))
        if (groupId) {
          s.groups = {
            ...s.groups,
            [groupId]: [...(s.groups[groupId] || []), id],
          }
        }
      })

      schedule(3, () => {
        if (!state.value) {
          selectFirstItem()
        }
      })

      onCleanup(() => {
        setState(s => {
          s.items = s.items.filter((item) => item !== id)
          if (groupId) {
            s.groups = {
              ...s.groups,
              [groupId]: s.groups[groupId]!.filter((item) => item !== id),
            }
          }
          s.ids = Object.fromEntries(Object.entries(s.ids).filter(([key]) => key !== id))
        })

        const selectedItem = getSelectedItem()
        if (selectedItem?.getAttribute('id') === id) schedule(1, () => selectFirstItem())
      })
    },
    group: (id) => {
      if (!listInnerRef()) {
        console.warn('Mount Command.Group inside a Command.List component.')
      }
      setState(s => {
        s.groups = { [id]: [], ...s.groups }
      })

      onCleanup(() => {
        setState(s => {
          s.groups = Object.fromEntries(Object.entries(s.groups).filter(([key]) => key !== id))
          s.ids = Object.fromEntries(Object.entries(s.ids).filter(([key]) => key !== id))
        })
      })
    },
    filter: () => {
      return props.shouldFilter !== false
    },
    label: () => mergedProps.label || props['aria-label'] || '',
    disablePointerSelection: () => !!props.disablePointerSelection,
    listId,
    inputId,
    labelId,
    listInnerRef,
    setListInnerRef,
  }

  function score(value: string, keywords?: string[]) {
    const filter = mergedProps.filter ?? defaultFilter
    return value ? filter(value, state.search, keywords) : 0
  }

  function selectFirstItem() {
    const item = getValidItems().find((item) => item.getAttribute('aria-disabled') !== 'true')
    const value = item?.getAttribute(VALUE_ATTR) || ''
    store.setState('value', value)
  }

  function scrollSelectedIntoView() {
    requestAnimationFrame(() => {
      const item = getSelectedItem()
      if (item) {
        if (item.parentElement?.firstChild === item) {
          item.closest(GROUP_SELECTOR)?.querySelector(GROUP_HEADING_SELECTOR)?.scrollIntoView({ block: 'nearest' })
        }
        item.scrollIntoView({ block: 'nearest' })
      }
    })
  }

  function getSelectedItem() {
    return listInnerRef()?.querySelector(`${ITEM_SELECTOR}[aria-selected="true"]`)
  }

  function getValidItems() {
    return Array.from(listInnerRef()?.querySelectorAll(VALID_ITEM_SELECTOR) || [])
  }

  function updateSelectedToIndex(index: number) {
    const items = getValidItems()
    const item = items[index]
    if (item) store.setState('value', item.getAttribute(VALUE_ATTR) || '')
  }

  function updateSelectedByItem(change: 1 | -1) {
    const selected = getSelectedItem()
    const items = getValidItems()
    const index = items.findIndex((item) => item === selected)

    let newSelected = items[index + change]

    if (props.loop) {
      newSelected =
        index + change < 0
          ? items[items.length - 1]
          : index + change === items.length
          ? items[0]
          : items[index + change]
    }

    if (newSelected) store.setState('value', newSelected.getAttribute(VALUE_ATTR) || '')
  }

  function updateSelectedByGroup(change: 1 | -1) {
    const selected = getSelectedItem()
    let group = selected?.closest(GROUP_SELECTOR)
    let item: HTMLElement | null = null

    while (group && !item) {
      group = change > 0 ? findNextSibling(group, GROUP_SELECTOR) : findPreviousSibling(group, GROUP_SELECTOR)
      item = group?.querySelector(VALID_ITEM_SELECTOR) || null
    }

    if (item) {
      store.setState('value', item.getAttribute(VALUE_ATTR) || '')
    } else {
      updateSelectedByItem(change)
    }
  }

  const last = () => updateSelectedToIndex(getValidItems().length - 1)

  const next = (e: KeyboardEvent) => {
    e.preventDefault()
    if (e.metaKey) {
      last()
    } else if (e.altKey) {
      updateSelectedByGroup(1)
    } else {
      updateSelectedByItem(1)
    }
  }

  const prev = (e: KeyboardEvent) => {
    e.preventDefault()
    if (e.metaKey) {
      updateSelectedToIndex(0)
    } else if (e.altKey) {
      updateSelectedByGroup(-1)
    } else {
      updateSelectedByItem(-1)
    }
  }

  return (
    <div
      tabIndex={-1}
      {...etc}
      cmdk-root=""
      onKeyDown={(e) => {
        //@ts-ignore
        etc.onKeyDown?.(e)

        if (!e.defaultPrevented) {
          switch (e.key) {
            case 'n':
            case 'j': {
              if (mergedProps.vimBindings && e.ctrlKey) {
                next(e)
              }
              break
            }
            case 'ArrowDown': {
              next(e)
              break
            }
            case 'p':
            case 'k': {
              if (mergedProps.vimBindings && e.ctrlKey) {
                prev(e)
              }
              break
            }
            case 'ArrowUp': {
              prev(e)
              break
            }
            case 'Home': {
              e.preventDefault()
              updateSelectedToIndex(0)
              break
            }
            case 'End': {
              e.preventDefault()
              last()
              break
            }
            case 'Enter': {
              if (!e.isComposing && e.keyCode !== 229) {
                e.preventDefault()
                const item = getSelectedItem()
                if (item) {
                  const event = new Event(SELECT_EVENT)
                  item.dispatchEvent(event)
                }
              }
            }
          }
        }
      }}
    >
      <label
        cmdk-label=""
        for={context.inputId}
        id={context.labelId}
        style={srOnlyStyles}
      >
        {mergedProps.label}
      </label>
      {/* Solid 2: <Context value={}> instead of <Context.Provider value={}> */}
      <StoreContext value={store}>
        <CommandContext value={context}>{props.children}</CommandContext>
      </StoreContext>
    </div>
  )
}

/**
 * Command menu item. Becomes active on pointer enter or through keyboard navigation.
 * Preferably pass a `value`, otherwise the value will be inferred from `children` or
 * the rendered item's `textContent`.
 */
const Item: ParentComponent<CommandItemProps> = (props) => {
  const store = useStore()
  const id = createUniqueId()
  const [ref, setRef] = createSignal<HTMLDivElement>()
  const groupContext = useContext(GroupContext)
  const context = useCommand()
  const [rendered, setRendered] = createSignal(false)

  // Solid 2: onSettled replaces onMount
  onSettled(() => {
    if (!forceMount()) {
      return context.item(id, groupContext?.().id)
    }
  })

  // Tracks the value of the item and updates it in context and on the [data-value] attribute
  const [value, setValue] = createSignal(props.value || '', { ownedWrite: true })

  // Solid 2: split-phase effect for tracking props.value → local value
  createEffect(
    () => ({ propValue: props.value, textContent: ref()?.textContent }),
    ({ propValue, textContent }) => {
      if (propValue) {
        setValue(propValue)
        return
      }
      if (textContent) {
        setValue(textContent)
        return
      }
    },
  )

  // Solid 2: split-phase effect for syncing value to context + DOM attribute
  createEffect(
    () => ({ v: value(), kw: props.keywords }),
    ({ v, kw }) => {
      context.value(id, v, kw)
      ref()?.setAttribute(VALUE_ATTR, v)
    },
  )

  const forceMount = () => props.forceMount ?? groupContext?.().forceMount
  const selected = useCmdk((state) => value() && value() == state.value)

  const render = useCmdk((state) =>
    !rendered()
      ? true
      : forceMount()
      ? true
      : context.filter() === false
      ? true
      : !state.search
      ? true
      : (state.filtered.items[id] || 0) > 0,
  )

  // Solid 2: onSettled replaces onMount
  onSettled(() => {
    const element = ref()
    if (!element || props.disabled) return
    setRendered(true)
  })

  // Solid 2: split-phase effect replacing on() helper for event listener
  createEffect(
    () => ref(),
    (element) => {
      if (!element) return
      element.addEventListener(SELECT_EVENT, onSelect)
      return () => {
        element.removeEventListener(SELECT_EVENT, onSelect)
      }
    },
  )

  function onSelect() {
    select()
    props.onSelect?.(value())
  }

  function select() {
    store.setState('value', value(), true)
  }

  // Solid 2: omit instead of splitProps
  const etc = omit(props, 'disabled', 'onSelect', 'value', 'forceMount', 'keywords', 'children')

  return (
    <Show when={render()}>
      <div
        {...etc}
        ref={(el) => setRef(el)}
        id={id}
        cmdk-item=""
        role="option"
        aria-disabled={Boolean(props.disabled)}
        aria-selected={Boolean(selected())}
        data-disabled={Boolean(props.disabled)}
        data-selected={Boolean(selected())}
        onPointerMove={props.disabled || context.disablePointerSelection() ? undefined : select}
        onClick={props.disabled ? undefined : onSelect}
      >
        {props.children}
      </div>
    </Show>
  )
}

/**
 * Group command menu items together with a heading.
 * Grouped items are always shown together.
 */
const Group: ParentComponent<CommandGroupProps> = (props) => {
  // Solid 2: omit instead of splitProps
  const etc = omit(props, 'heading', 'value', 'forceMount', 'children')
  const id = createUniqueId()
  const [ref, setRef] = createSignal<HTMLDivElement>()
  const [headerRef, setHeaderRef] = createSignal<HTMLDivElement>()
  const headingId = createUniqueId()
  const context = useCommand()
  const render = useCmdk((state) => {
    return props.forceMount
      ? true
      : context.filter() === false
      ? true
      : !state.search
      ? true
      : state.filtered.groups.includes(id)
  })

  // Solid 2: onSettled replaces onMount
  onSettled(() => {
    context.group(id)
  })

  const [value, setValue] = createSignal(props.value || '', { ownedWrite: true })

  // Solid 2: split-phase effect for value tracking
  createEffect(
    () => ({ propValue: props.value, textContent: headerRef()?.textContent }),
    ({ propValue, textContent }) => {
      if (propValue) {
        setValue(propValue)
        return
      }
      if (textContent) {
        setValue(textContent)
        return
      }
    },
  )

  // Solid 2: split-phase effect for syncing value to context + DOM
  createEffect(
    () => ({ v: value() }),
    ({ v }) => {
      context.value(id, v)
      ref()?.setAttribute(VALUE_ATTR, v)
    },
  )

  const contextValue = () => ({ id, forceMount: props.forceMount })

  return (
    <div
      ref={mergeRefs((el) => setRef(el), props.ref)}
      {...etc}
      cmdk-group=""
      id={id}
      role="presentation"
      hidden={render() ? undefined : true}
    >
      <Show when={props.heading}>
        <div cmdk-group-heading="" ref={(el) => setHeaderRef(el)} aria-hidden id={headingId}>
          {props.heading}
        </div>
      </Show>

      <div cmdk-group-items="" role="group" aria-labelledby={props.heading ? headingId : undefined}>
        {/* Solid 2: <Context value={}> */}
        <GroupContext value={contextValue}>{props.children}</GroupContext>
      </div>
    </div>
  )
}

/**
 * A visual and semantic separator between items or groups.
 * Visible when the search query is empty or `alwaysRender` is true, hidden otherwise.
 */
const Separator: Component<CommandSeparatorProps> = (props) => {
  const etc = omit(props, 'alwaysRender')
  const render = useCmdk((state) => !state.search)

  return (
    <Show when={props.alwaysRender || render()}>
      <div {...etc} cmdk-separator="" role="separator" />
    </Show>
  )
}

/**
 * Command menu input.
 * All props are forwarded to the underlying `input` element.
 */
const Input: Component<CommandInputProps> = (props) => {
  const etc = omit(props, 'onValueChange', 'ref', 'value')
  const isControlled = () => props.value != null
  const store = useStore()
  const search = useCmdk((state) => state.search)
  const value = useCmdk((state) => state.value)
  const context = useCommand()

  const selectedItemId = createMemo(() => {
    const item = context
      .listInnerRef()
      ?.querySelector(`${ITEM_SELECTOR}[${VALUE_ATTR}="${encodeURIComponent(value())}"]`)
    return item?.getAttribute('id') || undefined
  })

  // Solid 2: split-phase effect for controlled input value
  createEffect(
    () => props.value,
    (controlledValue) => {
      if (controlledValue != null) {
        store.setState('search', controlledValue)
      }
    },
  )

  return (
    <input
      ref={props.ref}
      {...etc}
      cmdk-input=""
      autocomplete="off"
      autocorrect="off"
      spellcheck={false}
      aria-autocomplete="list"
      role="combobox"
      aria-expanded={true}
      aria-controls={context.listId}
      aria-labelledby={context.labelId}
      aria-activedescendant={selectedItemId()}
      id={context.inputId}
      type="text"
      value={isControlled() ? props.value : search()}
      onInput={(e) => {
        if (!isControlled()) {
          //@ts-ignore
          store.setState('search', e.target.value)
        }
        //@ts-ignore
        props.onValueChange?.(e.target.value)
      }}
    />
  )
}

/**
 * Contains `Item`, `Group`, and `Separator`.
 * Use the `--cmdk-list-height` CSS variable to animate height based on the number of results.
 */
const List: ParentComponent<CommandListProps> = (props) => {
  const mergedProps = mergeDefaultProps({ label: 'Suggestions' }, props)
  const etc = omit(mergedProps, 'label', 'children', 'ref')
  let ref: HTMLDivElement
  let height: HTMLDivElement | null

  const context = useCommand()

  // Solid 2: onSettled replaces onMount
  onSettled(() => {
    if (!ref || !height) return

    const el = height
    const wrapper = ref

    let animationFrame: number

    const observer = new ResizeObserver(() => {
      animationFrame = requestAnimationFrame(() => {
        const height = el.offsetHeight
        wrapper.style.setProperty(`--cmdk-list-height`, height.toFixed(1) + 'px')
      })
    })
    observer.observe(el)

    onCleanup(() => {
      cancelAnimationFrame(animationFrame)
      observer.unobserve(el)
    })
  })

  return (
    <div
      ref={mergeRefs((el) => (ref = el), mergedProps.ref)}
      {...etc}
      cmdk-list=""
      role="listbox"
      aria-label={mergedProps.label}
      id={context.listId}
    >
      {SlottableWithNestedChildren(props, (child) => (
        <div ref={mergeRefs((el) => (height = el), context.setListInnerRef)} cmdk-list-sizer="">
          {child}
        </div>
      ))}
    </div>
  )
}

/**
 * Renders the command menu in a Kobalte Dialog.
 */
const Dialog: ParentComponent<CommandDialogProps> = (props) => {
  // Solid 2: omit instead of splitProps (multi-split)
  const localKeys = ['overlayClassName', 'contentClassName', 'container'] as const
  const dialogRootKeys = [
    'open', 'defaultOpen', 'onOpenChange', 'id', 'modal', 'preventScroll', 'forceMount', 'translations',
  ] as const
  const allOmitKeys = [...localKeys, ...dialogRootKeys] as const

  const etc = omit(props, ...allOmitKeys)

  // For Dialog root props, we need to manually pick them
  const dialogRootProps = {
    get open() { return props.open },
    get defaultOpen() { return props.defaultOpen },
    get onOpenChange() { return props.onOpenChange },
    get id() { return props.id },
    get modal() { return props.modal },
    get preventScroll() { return props.preventScroll },
    get forceMount() { return props.forceMount },
    get translations() { return props.translations },
  }

  return (
    <KobalteDialog {...dialogRootProps}>
      <KobalteDialog.Portal mount={props.container}>
        <KobalteDialog.Overlay cmdk-overlay="" class={props.overlayClassName} />
        <KobalteDialog.Content aria-label={props.label} cmdk-dialog="" class={props.contentClassName}>
          <Command {...etc} />
        </KobalteDialog.Content>
      </KobalteDialog.Portal>
    </KobalteDialog>
  )
}

/**
 * Automatically renders when there are no results for the search query.
 */
const Empty: ParentComponent<CommandEmptyProps> = (props) => {
  const [mounted, setMounted] = createSignal(false)

  const render = useCmdk((state) => state.filtered.count === 0 && mounted())

  // Solid 2: onSettled replaces onMount
  onSettled(() => {
    setMounted(true)
  })

  return (
    <Show when={render()}>
      <div {...props} cmdk-empty="" role="presentation" />
    </Show>
  )
}

/**
 * You should conditionally render this with `progress` while loading asynchronous items.
 */
const Loading: ParentComponent<CommandLoadingProps> = (props) => {
  const mergedProps = mergeDefaultProps({ label: 'Loading...' }, props)
  const etc = omit(mergedProps, 'progress', 'children', 'label')

  return (
    <div
      {...etc}
      cmdk-loading=""
      role="progressbar"
      aria-valuenow={mergedProps.progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={mergedProps.label}
    >
      {SlottableWithNestedChildren(props, (child) => (
        <div aria-hidden>{child}</div>
      ))}
    </div>
  )
}

const pkg = Object.assign(Command, {
  List,
  Item,
  Input,
  Group,
  Separator,
  Dialog,
  Empty,
  Loading,
})

export { pkg as Command, defaultFilter, useCmdk as useCommandState }

export {
  Dialog as CommandDialog,
  Empty as CommandEmpty,
  Group as CommandGroup,
  Input as CommandInput,
  Item as CommandItem,
  List as CommandList,
  Loading as CommandLoading,
  Command as CommandRoot,
  Separator as CommandSeparator,
}

/**
 *
 *
 * Helpers
 *
 *
 */

function findNextSibling(el: Element, selector: string) {
  let sibling = el.nextElementSibling

  while (sibling) {
    if (sibling.matches(selector)) return sibling
    sibling = sibling.nextElementSibling
  }
}

function findPreviousSibling(el: Element, selector: string) {
  let sibling = el.previousElementSibling

  while (sibling) {
    if (sibling.matches(selector)) return sibling
    sibling = sibling.previousElementSibling
  }
}

/** Run a selector against the store state. */
function useCmdk<T = any>(selector: (state: State) => T) {
  const store = useStore()
  return () => selector(store.state)
}

/** Imperatively run a function on the next layout effect cycle. */
const useScheduleLayoutEffect = () => {
  const [s, ss] = createSignal(0, { ownedWrite: true })
  let fns = new Map<string | number, () => void>()

  // Solid 2: split-phase effect for scheduling
  createEffect(
    () => s(),
    () => {
      queueMicrotask(() => {
        fns.forEach((f) => {
          f()
        })
        fns = new Map()
      })
    },
  )

  return (id: string | number, cb: () => void) => {
    fns.set(id, cb)
    ss(s() + 1)
  }
}

function SlottableWithNestedChildren(
  props: { asChild?: boolean; children?: JSX.Element },
  render: (child: JSX.Element) => JSX.Element,
) {
  return render(props.children)
}

const srOnlyStyles = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: '0',
} as const
