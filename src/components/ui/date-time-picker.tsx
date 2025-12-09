import { useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: Date;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "בחר תאריך ושעה",
  minDate = new Date(),
}: DateTimePickerProps) {
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined);
  const [selectedHour, setSelectedHour] = useState<string>(
    value ? new Date(value).getHours().toString().padStart(2, "0") : "08"
  );
  const [selectedMinute, setSelectedMinute] = useState<string>(
    value ? new Date(value).getMinutes().toString().padStart(2, "0") : "00"
  );

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      updateDateTime(newDate, selectedHour, selectedMinute);
    }
  };

  const handleTimeSelect = (hour: string, minute: string) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    if (date) {
      updateDateTime(date, hour, minute);
    }
  };

  const updateDateTime = (selectedDate: Date, hour: string, minute: string) => {
    const newDateTime = new Date(selectedDate);
    newDateTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
    onChange(newDateTime.toISOString());
  };

  const quickTimeButtons = [
    { label: "08:00", hour: "08", minute: "00" },
    { label: "10:00", hour: "10", minute: "00" },
    { label: "12:00", hour: "12", minute: "00" },
    { label: "14:00", hour: "14", minute: "00" },
    { label: "16:00", hour: "16", minute: "00" },
  ];

  const quickDateButtons = [
    { 
      label: "היום", 
      date: new Date() 
    },
    { 
      label: "מחר", 
      date: new Date(Date.now() + 24 * 60 * 60 * 1000) 
    },
    { 
      label: "עוד שבוע", 
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
    },
  ];

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full h-12 justify-start text-right font-normal text-base",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="ml-2 h-5 w-5" />
          {date ? (
            <span className="flex items-center gap-2">
              {format(date, "EEEE, d MMMM yyyy", { locale: he })}
              <Clock className="h-4 w-4 text-muted-foreground" />
              {selectedHour}:{selectedMinute}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Quick Date Buttons */}
          <div className="flex gap-2">
            {quickDateButtons.map((btn) => (
              <Button
                key={btn.label}
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-sm"
                onClick={() => handleDateSelect(btn.date)}
              >
                {btn.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={(date) => date < minDate}
            initialFocus
            locale={he}
          />

          {/* Time Selection */}
          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-semibold text-center">בחר שעה</div>
            
            {/* Quick Time Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {quickTimeButtons.map((btn) => (
                <Button
                  key={btn.label}
                  type="button"
                  variant={selectedHour === btn.hour && selectedMinute === btn.minute ? "default" : "outline"}
                  size="sm"
                  className="h-9 text-sm font-medium"
                  onClick={() => handleTimeSelect(btn.hour, btn.minute)}
                >
                  {btn.label}
                </Button>
              ))}
            </div>

            {/* Manual Time Selection */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground text-center">או בחר ידנית:</div>
              <div className="flex items-center justify-center gap-2">
                <Select value={selectedHour} onValueChange={(h) => handleTimeSelect(h, selectedMinute)}>
                  <SelectTrigger className="w-20 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {hours.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-lg font-bold">:</span>
                <Select value={selectedMinute} onValueChange={(m) => handleTimeSelect(selectedHour, m)}>
                  <SelectTrigger className="w-20 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {minutes.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
