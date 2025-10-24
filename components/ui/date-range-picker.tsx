"use client"

import * as React from "react"
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import './date-range-picker-styles.css'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DateRange } from "react-day-picker"

interface DateRangePickerProps {
  dateRange?: DateRange
  onDateRangeChange?: (dateRange: DateRange) => void
  children: React.ReactNode
  align?: "start" | "center" | "end"
  numberOfMonths?: number
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  children,
  align = "start",
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [startDate, setStartDate] = React.useState<Date | null>(null)
  const [endDate, setEndDate] = React.useState<Date | null>(null)

  const handleChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)

    if (start && end && onDateRangeChange) {
      onDateRangeChange({ from: start, to: end })
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align={align}>
        <DatePicker
          selected={startDate}
          onChange={handleChange}
          startDate={startDate}
          endDate={endDate}
          selectsRange
          inline
          monthsShown={numberOfMonths}
          maxDate={new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}
