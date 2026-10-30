export type ContainerStatus = 'SHIPPING' | 'ARRIVED' | 'UNLOADING' | 'COMPLETED';

export type ContainerFileType = 'pdf' | 'excel' | 'word' | 'image' | 'powerpoint' | 'archive' | 'text' | 'other';

export interface ContainerFile {
  id: number;
  container_id: number;
  title: string;
  original_name: string;
  file_path: string;
  file_type: ContainerFileType;
  file_extension: string;
  file_size: number;
  description?: string | null;
  downloads_count: number;
  created_at: string;
  user?: { id: number; name: string } | null;
}

export interface Container {
  id: number;
  container_number: string;
  title: string;
  status: ContainerStatus;
  supplier?: string | null;
  origin?: string | null;
  shipping_date?: string | null;
  arrival_date?: string | null;
  notes?: string | null;
  files_count: number;
  total_files_size: number;
  files: ContainerFile[];
  user?: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface ContainerStats {
  total_containers: number;
  total_files: number;
  total_size: number;
  status_counts: Record<string, number>;
}

export interface PaginatedContainers {
  current_page: number;
  data: Container[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}
