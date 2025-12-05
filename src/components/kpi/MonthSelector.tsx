import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MonthSelectorProps {
  value: number | null;
  onChange: (month: number) => void;
}

const MONTHS = [
  { label: "JAN", value: 1 },
  { label: "FEB", value: 2 },
  { label: "MAR", value: 3 },
  { label: "APR", value: 4 },
  { label: "MAY", value: 5 },
  { label: "JUN", value: 6 },
  { label: "JUL", value: 7 },
  { label: "AUG", value: 8 },
  { label: "SEP", value: 9 },
  { label: "OCT", value: 10 },
  { label: "NOV", value: 11 },
  { label: "DEC", value: 12 },
];

const MonthSelector = ({ value, onChange }: MonthSelectorProps) => {
  const selectedMonth = MONTHS.find((m) => m.value === value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {selectedMonth ? selectedMonth.label : "Select Month"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 bg-popover border-border z-50">
        <div className="grid grid-cols-4 gap-2">
          {MONTHS.map((month) => (
            <Button
              key={month.value}
              variant={value === month.value ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(month.value)}
              className="w-16"
            >
              {month.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MonthSelector;
