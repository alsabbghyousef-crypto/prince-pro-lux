export interface DataSheetCategory {
  id: number;
  name: string;
  parent_id: number | null;
  icon?: string;
  description?: string;
  datasheets_count?: number;
  subcategories?: DataSheetCategory[];
}

export interface DataSheet {
  id: number;
  title: string;
  original_name: string;
  file_path: string;
  file_type: 'pdf' | 'excel' | 'word' | 'image' | 'powerpoint' | 'archive' | 'text' | 'other';
  file_extension: string;
  file_size: number;
  category_id: number | null;
  subcategory_id: number | null;
  description?: string | null;
  tags?: string | null;
  downloads_count: number;
  created_at: string;
  updated_at: string;
  category?: DataSheetCategory | null;
  subcategory?: DataSheetCategory | null;
  user?: { id: number; name: string } | null;
}

export interface DataSheetStats {
  total_count: number;
  total_size: number;
  type_counts: Record<string, number>;
}
