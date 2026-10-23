import type { ColumnDef, FilterDef } from '@/components/types';
import { optionsFrom } from '@/lib/status';

export const followUpColumns: ColumnDef[] = [
  { field: 'type', header: 'Seguimiento', kind: 'strong' },
  { field: 'caseFolio', header: 'Caso', kind: 'folio' },
  { field: 'responsible', header: 'Responsable', minScreen: 'lg' },
  { field: 'scheduledAt', header: 'Fecha', kind: 'datetime', minScreen: 'sm' },
  { field: 'status', header: 'Estado', kind: 'status' }
];

export const followUpFilters: FilterDef[] = [
  { field: 'status', label: 'Estado', options: optionsFrom(['programada', 'realizada', 'vencida']) }
];
