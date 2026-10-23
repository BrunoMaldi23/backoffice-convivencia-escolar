import type { Tone } from '@/lib/status';

export interface DetailItem { key: string; label: string; value?: string | number | null; wide?: boolean }
export interface TimelineEntry { id: string; title: string; description?: string; at: string; tone?: Tone; meta?: string }
export interface Option { label: string; value: string; disabled?: boolean }

/** Columna de `AppTable`. `minScreen` oculta la columna bajo ese ancho para tablas adaptativas; `align` alinea el contenido. */
export interface ColumnDef {
  field: string;
  header: string;
  minScreen?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'right';
  /** Ordenamiento en el cliente (solo tablas sin paginación del servidor). */
  sortable?: boolean;
}

export interface FilterDef { field: string; label: string; options: Option[] }
