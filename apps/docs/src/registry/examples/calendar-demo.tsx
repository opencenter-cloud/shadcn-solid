import { For } from "solid-js"

import {
  Calendar,
  CalendarCell,
  CalendarCellTrigger,
  CalendarHeadCell,
  CalendarLabel,
  CalendarNav,
  CalendarTable,
} from "@/registry/ui/calendar"

const { format: formatWeekdayLong } = new Intl.DateTimeFormat("en", {
  weekday: "long",
})
const { format: formatWeekdayShort } = new Intl.DateTimeFormat("en", {
  weekday: "short",
})
const { format: formatMonth } = new Intl.DateTimeFormat("en", {
  month: "long",
})

const CalendarDemo = () => {
  return (
    <Calendar mode="single">
      {(props) => (
        <div class="flex flex-col gap-4 rounded-md border p-3 shadow-sm">
          <div class="relative flex w-full items-center justify-between">
            <CalendarNav
              action="prev-month"
              aria-label="Go to previous month"
            />
            <CalendarLabel>
              {formatMonth(props.month)} {props.month.getFullYear()}
            </CalendarLabel>
            <CalendarNav action="next-month" aria-label="Go to next month" />
          </div>
          <CalendarTable>
            <thead>
              <tr class="flex">
                <For each={props.weekdays}>
                  {(weekday) => (
                    <CalendarHeadCell abbr={formatWeekdayLong(weekday())}>
                      {formatWeekdayShort(weekday())}
                    </CalendarHeadCell>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={props.weeks}>
                {(week) => (
                  <tr class="mt-2 flex w-full">
                    <For each={week()}>
                      {(day) => (
                        <CalendarCell>
                          <CalendarCellTrigger day={day()}>
                            {day().getDate()}
                          </CalendarCellTrigger>
                        </CalendarCell>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </CalendarTable>
        </div>
      )}
    </Calendar>
  )
}

export default CalendarDemo
