import { For } from "solid-js"

import { Card, CardContent } from "@/registry/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/registry/ui/carousel"

const CarouselSizeDemo = () => {
  return (
    <Carousel
      options={() => ({
        align: "start",
      })}
      class="w-full max-w-xs"
    >
      <CarouselContent>
        <For each={Array.from({ length: 5 })}>
          {(_, index) => (
            <CarouselItem class="md:basis-1/2 lg:basis-1/3">
              <div class="p-1">
                <Card>
                  <CardContent class="flex aspect-square items-center justify-center p-6">
                    <span class="text-3xl font-semibold">{index + 1}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          )}
        </For>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}

export default CarouselSizeDemo
