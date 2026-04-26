import { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangeSelectorProps {
  onChange: (range: DateRange | null) => void;
}

export default function DateRangeSelector({ onChange }: DateRangeSelectorProps) {
  const [periodType, setPeriodType] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('day');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const dateRange = useMemo(() => {
    if (periodType === 'custom') {
      if (customStart && customEnd) {
        return { start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) };
      }
      return null; // Don't filter if custom range is incomplete
    }
    
    switch (periodType) {
      case 'day': return { start: startOfDay(referenceDate), end: endOfDay(referenceDate) };
      case 'week': return { start: startOfWeek(referenceDate, { weekStartsOn: 6 }), end: endOfWeek(referenceDate, { weekStartsOn: 6 }) };
      case 'month': return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
      case 'year': return { start: startOfYear(referenceDate), end: endOfYear(referenceDate) };
      default: return { start: startOfDay(referenceDate), end: endOfDay(referenceDate) };
    }
  }, [periodType, referenceDate, customStart, customEnd]);

  useEffect(() => {
    onChange(dateRange);
  }, [dateRange, onChange]);

  const handlePrevDate = () => {
    switch (periodType) {
      case 'day': setReferenceDate(prev => subDays(prev, 1)); break;
      case 'week': setReferenceDate(prev => subDays(prev, 7)); break;
      case 'month': setReferenceDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)); break;
      case 'year': setReferenceDate(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1)); break;
    }
  };

  const handleNextDate = () => {
    switch (periodType) {
      case 'day': setReferenceDate(prev => addDays(prev, 1)); break;
      case 'week': setReferenceDate(prev => addDays(prev, 7)); break;
      case 'month': setReferenceDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)); break;
      case 'year': setReferenceDate(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1)); break;
    }
  };

  const getDateDisplay = () => {
    if (periodType === 'custom') return 'فترة مخصصة';
    switch (periodType) {
      case 'day': return format(referenceDate, 'dd/MM/yyyy');
      case 'week': return `${format(dateRange?.start || new Date(), 'dd/MM')} - ${format(dateRange?.end || new Date(), 'dd/MM/yyyy')}`;
      case 'month': return format(referenceDate, 'MM/yyyy');
      case 'year': return format(referenceDate, 'yyyy');
    }
  };

  return (
    <div className="flex flex-col xl:flex-row items-center gap-4 w-full xl:w-auto">
      <div className="flex bg-secondary/30 border border-border rounded-full p-1 shadow-inner w-full xl:w-auto overflow-hidden">
        {[
          { id: 'day', label: 'يومي' },
          { id: 'week', label: 'أسبوعي' },
          { id: 'month', label: 'شهري' },
          { id: 'year', label: 'سنوي' },
          { id: 'custom', label: 'مخصص' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setPeriodType(tab.id as any); setReferenceDate(new Date()); }}
            className={`flex-1 xl:w-20 py-1.5 px-2 text-sm font-bold rounded-full transition-all duration-300 ${
              periodType === tab.id 
              ? 'bg-[#f97316] text-white shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {periodType !== 'custom' ? (
        <div className="flex items-center bg-background border border-border rounded-full shadow-sm overflow-hidden h-11 w-full xl:w-auto">
          <button onClick={handleNextDate} className="px-5 h-full hover:bg-secondary flex items-center justify-center border-l border-border transition-colors">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <div className="flex-1 xl:w-56 px-4 flex items-center justify-center gap-3 font-bold text-sm tracking-wide">
            <span>{getDateDisplay()}</span>
            <Calendar className="w-4 h-4 text-foreground" />
          </div>

          <button onClick={handlePrevDate} className="px-5 h-full hover:bg-secondary flex items-center justify-center border-r border-border transition-colors">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 w-full xl:w-auto bg-background border border-border rounded-full shadow-sm p-1 px-3 h-11">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-foreground font-bold">من</span>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent border-none outline-none text-sm w-full font-bold text-foreground" />
          </div>
          <div className="w-px h-6 bg-border mx-1"></div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-foreground font-bold">إلى</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent border-none outline-none text-sm w-full font-bold text-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}
