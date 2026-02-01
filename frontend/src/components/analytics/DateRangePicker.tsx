import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { type DateRangePreset } from '@/stores/analyticsStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DateRangePickerProps {
  preset: DateRangePreset;
  startDate: Date;
  endDate: Date;
  onChange: (preset: DateRangePreset, startDate?: Date, endDate?: Date) => void;
  className?: string;
}

const presetLabels: Record<DateRangePreset, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  custom: 'Custom Range',
};

export function DateRangePicker({ 
  preset, 
  startDate, 
  endDate, 
  onChange,
  className 
}: DateRangePickerProps): JSX.Element {
  const [showCustomInputs, setShowCustomInputs] = useState(preset === 'custom');
  const [customStart, setCustomStart] = useState(format(startDate, 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endDate, 'yyyy-MM-dd'));

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setShowCustomInputs(newPreset === 'custom');
    if (newPreset !== 'custom') {
      onChange(newPreset);
    }
  };

  const handleCustomDateChange = () => {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      onChange('custom', start, end);
    }
  };

  const displayText = preset === 'custom' 
    ? `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`
    : presetLabels[preset];

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-slate-500" />
              <span className="text-sm">{displayText}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem onClick={() => handlePresetChange('today')}>
            Today
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePresetChange('week')}>
            This Week
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePresetChange('month')}>
            This Month
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePresetChange('quarter')}>
            This Quarter
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePresetChange('custom')}>
            Custom Range
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showCustomInputs && (
        <div className="flex gap-2 items-center">
          <Input
            type="date"
            value={customStart}
            onChange={(e) => {
              setCustomStart(e.target.value);
              // Auto update if end date is already valid
              const newStart = new Date(e.target.value);
              const currentEnd = new Date(customEnd);
              if (!isNaN(newStart.getTime()) && !isNaN(currentEnd.getTime())) {
                onChange('custom', newStart, currentEnd);
              }
            }}
            className="w-[140px] text-sm"
          />
          <span className="text-slate-400">to</span>
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => {
              setCustomEnd(e.target.value);
              // Auto update if start date is already valid
              const currentStart = new Date(customStart);
              const newEnd = new Date(e.target.value);
              if (!isNaN(currentStart.getTime()) && !isNaN(newEnd.getTime())) {
                onChange('custom', currentStart, newEnd);
              }
            }}
            className="w-[140px] text-sm"
          />
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
