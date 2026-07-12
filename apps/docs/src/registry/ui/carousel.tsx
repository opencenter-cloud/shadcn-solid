import type {
  Accessor,
  Setter,
  VoidProps,
} from "solid-js"
import {
  createContext,
  createEffect,
  merge,
  onSettled,
  omit,
  useContext,
} from "solid-js"
import { createStore } from "solid-js"
import type { PolymorphicProps } from "@opencenter-cloud/kobalte-core/polymorphic"
import type { CreateEmblaCarouselType } from "embla-carousel-solid"
import createEmblaCarousel from "embla-carousel-solid"

import { cx } from "@/registry/lib/cva"

import type { ButtonProps } from "./button"
import { Button } from "./button"
import type { ComponentProps, ValidComponent } from "@solidjs/web";

type CarouselAPI = CreateEmblaCarouselType[1]
type CreateCarouselParameters = Parameters<typeof createEmblaCarousel>
type CarouselOptions = CreateCarouselParameters[0]
type CarouselPlugin = CreateCarouselParameters[1]

export interface CarouselOptionsProps {
  options?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setAPI?: Setter<CarouselAPI>
}

export type CarouselProps = ComponentProps<"div"> & CarouselOptionsProps

type CarouselContextProps = {
  ref: ReturnType<typeof createEmblaCarousel>[0]
  api: ReturnType<typeof createEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: Accessor<boolean>
  canScrollNext: Accessor<boolean>
} & CarouselOptionsProps

const CarouselContext = createContext<CarouselContextProps | null>(null)

const useCarousel = () => {
  const context = useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

export const Carousel = (props: CarouselProps) => {
  const mergedProps = merge<CarouselProps[]>(
    {
      orientation: "horizontal",
    },
    props,
  )
  const rest = omit(mergedProps, "orientation", "options", "setAPI", "plugins", "class", "children")

  const [ref, api] = createEmblaCarousel(
    () => ({
      ...merge.options?.(),
      axis: mergedProps.orientation === "horizontal" ? "x" : "y",
    }),
    () => mergedProps.plugins?.() ?? [],
  )

  const [store, setStore] = createStore({
    canScrollNext: false,
    canScrollPrev: false,
  })

  const onSelect = (api: CarouselAPI) => {
    if (!api()) return
    setStore({
      canScrollNext: api()!.canScrollNext(),
      canScrollPrev: api()!.canScrollPrev(),
    })
  }

  const scrollPrev = () => {
    api()?.scrollPrev()
  }

  const scrollNext = () => {
    api()?.scrollNext()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      scrollPrev()
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      scrollNext()
    }
  }

  onSettled(() => {
    if (!api() || !mergedProps.setAPI) return
    // @ts-expect-error - api should be defined
    mergedProps.setAPI(api)
  })

  createEffect(
    () => api(),
    (currentApi) => {
      if (!currentApi) return
      onSelect(() => currentApi)
      currentApi.on("reInit", (api) => {
        onSelect(() => api)
      })
      currentApi.on("select", (api) => {
        onSelect(() => api)
      })

      return () => {
        currentApi.off("select", (api) => {
          onSelect(() => api)
        })
      }
    }
  )

  const value: CarouselContextProps = {
    ref,
    api,
    canScrollPrev: () => store.canScrollPrev,
    get options() {
      return mergedProps.options
    },
    canScrollNext: () => store.canScrollNext,
    get orientation() {
      return (
        mergedProps.orientation ??
        (mergedProps.options?.().axis === "y" ? "vertical" : "horizontal")
      )
    },
    get plugins() {
      return mergedProps.plugins
    },
    scrollNext,
    scrollPrev,
    get setAPI() {
      return mergedProps.setAPI
    },
  }

  return (
    <CarouselContext value={value}>
      <div
        onKeyDown={handleKeyDown}
        class={cx("relative", mergedProps.class)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...rest}
      >
        {mergedProps.children}
      </div>
    </CarouselContext>
  )
}

export type CarouselContentProps = ComponentProps<"div">

export const CarouselContent = (props: CarouselContentProps) => {
  const { ref, orientation } = useCarousel()
  const rest = omit(props, "class")

  return (
    <div ref={ref} class="overflow-hidden" data-slot="carousel-content">
      <div
        class={cx(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          props.class,
        )}
        {...rest}
      />
    </div>
  )
}

export type CarouselItemProps = ComponentProps<"div">

export const CarouselItem = (props: CarouselItemProps) => {
  const { orientation } = useCarousel()
  const rest = omit(props, "class")

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      class={cx(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        props.class,
      )}
      {...rest}
    />
  )
}

export type CarouselNextProps<T extends ValidComponent = "button"> = VoidProps<
  ButtonProps<T>
>

export const CarouselNext = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, CarouselNextProps<T>>,
) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel()
  const mergedProps = merge<CarouselNextProps[]>(
    {
      variant: "outline",
      size: "icon",
    },
    props as CarouselNextProps,
  )
  const rest = omit(mergedProps, "class", "variant", "size")

  return (
    <Button
      data-slot="carousel-next"
      variant={mergedProps.variant}
      size={mergedProps.size}
      class={cx(
        "absolute size-8 rounded-full",
        orientation === "horizontal"
          ? "top-1/2 -right-12 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        mergedProps.class,
      )}
      disabled={!canScrollNext()}
      onClick={scrollNext}
      {...rest}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="size-4"
        viewBox="0 0 24 24"
      >
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 12h14m-7-7l7 7l-7 7"
        />
      </svg>
    </Button>
  )
}

export type CarouselPreviousProps<T extends ValidComponent = "button"> =
  VoidProps<ButtonProps<T>>

export const CarouselPrevious = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, CarouselPreviousProps<T>>,
) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()
  const mergedProps = merge<CarouselPreviousProps[]>(
    {
      variant: "outline",
      size: "icon",
    },
    props as CarouselPreviousProps,
  )
  const rest = omit(mergedProps, "class", "variant", "size")

  return (
    <Button
      data-slot="carousel-previous"
      variant={mergedProps.variant}
      size={mergedProps.size}
      class={cx(
        "absolute size-8 rounded-full",
        orientation === "horizontal"
          ? "top-1/2 -left-12 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        mergedProps.class,
      )}
      disabled={!canScrollPrev()}
      onClick={scrollPrev}
      {...rest}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="size-4"
        viewBox="0 0 24 24"
      >
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="m12 19l-7-7l7-7m7 7H5"
        />
      </svg>
    </Button>
  )
}
