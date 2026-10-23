import type { ColumnDef, FilterDef } from '@/components/types';
import { optionsFrom } from '@/lib/status';

export const DOCUMENT_CATEGORIES = ['Actas', 'Informes', 'Medidas', 'Citaciones', 'Derivaciones', 'Normativa interna'];

export const documentColumns: ColumnDef[] = [
  { field: 'title', header: 'Documento', kind: 'strong' },
  { field: 'category', header: 'Categoría', minScreen: 'md' },
  { field: 'caseFolio', header: 'Caso', kind: 'folio', minScreen: 'lg' },
  { field: 'format', header: 'Formato', minScreen: 'xl' },
  { field: 'updatedAt', header: 'Actualizado', kind: 'date', minScreen: 'sm' },
  { field: 'status', header: 'Estado', kind: 'status' }
];

export const documentFilters: FilterDef[] = [
  { field: 'category', label: 'Categoría', options: DOCUMENT_CATEGORIES.map((v) => ({ value: v, label: v })) },
  { field: 'status', label: 'Estado', options: optionsFrom(['borrador', 'publicado']) }
];

export const templateColumns: ColumnDef[] = [
  { field: 'name', header: 'Plantilla', kind: 'strong' },
  { field: 'category', header: 'Categoría' },
  { field: 'updatedAt', header: 'Actualizada', kind: 'date', minScreen: 'sm' }
];
