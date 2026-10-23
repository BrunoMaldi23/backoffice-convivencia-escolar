import type { Tone } from '@/lib/status';

export interface DetailItem { key: string; label: string; value?: string | number | null; wide?: boolean }
export interface TimelineEntry { id: string; title: string; description?: string; at: string; tone?: Tone; meta?: string }
export interface Option { label: string; value: string; disabled?: boolean }

/** Columna de `ResourceTable`. `minScreen` oculta la columna bajo ese ancho para tablas adaptativas. */
export interface ColumnDef {
  field: string;
  header: string;
  kind?: 'text' | 'strong' | 'folio' | 'date' | 'datetime' | 'status' | 'priority' | 'roles' | 'number';
  sortable?: boolean;
  minScreen?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface FilterDef { field: string; label: string; options: Option[] }

export interface FormFieldDef {
  name: string;
  label: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'multiselect' | 'date' | 'datetime' | 'rut' | 'number';
  required?: boolean;
  options?: Option[];
  help?: string;
  placeholder?: string;
  full?: boolean;
}

export interface FormSectionDef { title: string; description?: string; fields: FormFieldDef[] }
