import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import cn from 'clsx';

export interface SearchableOption {
  value: string | number;
  label: string;
  badge?: string | number;
  subLabel?: string;
  icon?: React.ReactNode;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'اختر من القائمة...',
  searchPlaceholder = 'ابحث هنا...',
  className,
  buttonClassName,
  disabled = false,
  clearable = false,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((o) => String(o.value) === String(value)),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(term) ||
        (o.subLabel && o.subLabel.toLowerCase().includes(term))
    );
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

  // Auto-focus search input when opened, and reset search when closed
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
  };

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full bg-secondary/40 hover:bg-secondary/60 border border-border flex items-center justify-between cursor-pointer outline-none transition-all shadow-xs',
          buttonClassName
            ? buttonClassName
            : 'h-10 rounded-xl px-3.5 text-xs sm:text-sm font-bold text-foreground',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-primary/20 border-primary bg-background'
        )}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          {selectedOption?.icon && (
            <span className="shrink-0 text-primary">{selectedOption.icon}</span>
          )}
          <span className={cn('truncate', !selectedOption && 'text-muted-foreground font-medium')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge !== undefined && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary shrink-0 font-mono">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ms-2">
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180 text-primary'
            )}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1.5 bg-card border border-border/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-100 min-w-[14rem]">
          
          {/* Search Header */}
          <div className="p-2.5 border-b border-border/80 shrink-0 relative bg-secondary/30">
            <Search className="w-4 h-4 absolute start-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border/80 h-9 rounded-xl ps-9 pe-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold placeholder:font-normal placeholder:text-muted-foreground"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute end-4 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 p-1.5 space-y-0.5 custom-scrollbar max-h-56">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs font-bold text-muted-foreground">
                لا توجد نتائج تطابق "{searchTerm}"
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = String(value) === String(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 text-xs sm:text-sm rounded-xl cursor-pointer transition-all select-none',
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'hover:bg-secondary text-foreground font-semibold'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      {option.icon && (
                        <span className={cn('shrink-0', isSelected ? 'text-primary-foreground' : 'text-primary')}>
                          {option.icon}
                        </span>
                      )}
                      <div className="truncate">
                        <span className="truncate block">{option.label}</span>
                        {option.subLabel && (
                          <span
                            className={cn(
                              'text-[10px] block truncate mt-0.5',
                              isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            )}
                          >
                            {option.subLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ms-2">
                      {option.badge !== undefined && (
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-bold font-mono',
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-secondary text-muted-foreground border border-border'
                          )}
                        >
                          {option.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 shrink-0" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
