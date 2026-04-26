import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import cn from 'clsx';

interface Option {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options, value, onChange, placeholder = 'اختر...', className, buttonClassName, disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => options.find(o => String(o.value) === String(value)), [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-reset search when closed
  useEffect(() => {
    if (!isOpen) setSearchTerm('');
  }, [isOpen]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-background border border-border flex items-center justify-between cursor-pointer outline-none transition-all shadow-sm focus:border-primary focus:ring-1 focus:ring-primary",
          buttonClassName ? buttonClassName : "h-11 rounded-lg px-4 text-sm font-bold",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-1 ring-primary border-primary"
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180", buttonClassName && "ms-2")} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden flex flex-col max-h-64 animate-in fade-in zoom-in-95 duration-100 min-w-[12rem]">
          <div className="p-2 border-b border-border shrink-0 relative bg-secondary/10">
            <Search className="w-4 h-4 absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-secondary/30 border border-transparent h-10 rounded-lg ps-8 pe-3 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-semibold placeholder:font-normal"
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1.5 space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm font-semibold text-muted-foreground">لا توجد نتائج</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => { onChange(option.value); setIsOpen(false); }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-colors select-none",
                    String(value) === String(option.value) 
                      ? "bg-primary text-primary-foreground font-bold shadow-md" 
                      : "hover:bg-secondary/60 text-foreground font-semibold"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {String(value) === String(option.value) && <Check className="w-4 h-4 shrink-0 ms-2" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
