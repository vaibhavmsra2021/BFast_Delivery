import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: Date;
  setDate?: (date: Date | undefined) => void;
  selected?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholderText?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  date,
  setDate,
  selected,
  onChange,
  placeholderText = "Pick a date",
  className,
  disabled
}: DatePickerProps) {
  // Support both useState-style (date/setDate) and controlled component style (selected/onChange)
  const value = date || selected;
  const setValue = (newDate: Date | undefined) => {
    if (setDate) {
      setDate(newDate);
    }
    if (onChange) {
      onChange(newDate || null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : placeholderText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value || undefined}
          onSelect={setValue}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
