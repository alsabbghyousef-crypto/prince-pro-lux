import { LayoutGrid, List } from 'lucide-react';

interface ViewToggleProps {
  viewMode: 'list' | 'grid';
  setViewMode: (mode: 'list' | 'grid') => void;
}

export default function ViewToggle({ viewMode, setViewMode }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-secondary/50 border border-border rounded-lg p-1 shrink-0 h-11 w-full sm:w-auto">
      <button
        onClick={() => setViewMode('list')}
        className={`flex-1 sm:flex-none p-2 rounded-md transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-background shadow-sm text-[#f97316]' : 'text-muted-foreground hover:text-foreground'}`}
        title="عرض قائمة"
      >
        <List className="w-5 h-5" />
      </button>
      <button
        onClick={() => setViewMode('grid')}
        className={`flex-1 sm:flex-none p-2 rounded-md transition-all flex items-center justify-center ${viewMode === 'grid' ? 'bg-background shadow-sm text-[#f97316]' : 'text-muted-foreground hover:text-foreground'}`}
        title="عرض بطاقات"
      >
        <LayoutGrid className="w-5 h-5" />
      </button>
    </div>
  );
}
