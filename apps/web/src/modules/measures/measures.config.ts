import type { ColumnDef, FilterDef, FormSectionDef } from '@/components/types';
import { optionsFrom, priorityOptions } from '@/lib/status';

export const MEASURE_TYPES = ['Apoyo psicosocial', 'Adecuación de horario', 'Acompañamiento en recreos', 'Separación de espacios', 'Comunicación con apoderado', 'Otra'];

export const measureColumns: ColumnDef[] = [
  { field: 'folio', header: 'Folio', kind: 'folio' },
  { field: 'type', header: 'Medida' },
  { field: 'caseFolio', header: 'Caso', kind: 'folio', minScreen: 'md' },
  { field: 'priority', header: 'Prioridad', kind: 'priority', minScreen: 'lg' },
  { field: 'status', header: 'Estado', kind: 'status' },
  { field: 'responsible', header: 'Responsable', minScreen: 'xl' },
  { field: 'startDate', header: 'Inicio', kind: 'date', minScreen: 'lg' },
  { field: 'endDate', header: 'Término', kind: 'date', minScreen: 'md' }
];

export const measureFilters: FilterDef[] = [
  { field: 'status', label: 'Estado', options: optionsFrom(['vigente', 'pendiente', 'vencida', 'finalizada']) },
  { field: 'priority', label: 'Prioridad', options: priorityOptions }
];

export const measureFormSections: FormSectionDef[] = [
  {
    title: 'Medida de resguardo',
    description: 'Las medidas se definen por el equipo responsable; el sistema no propone acciones automáticamente.',
    fields: [
      { name: 'caseFolio', label: 'Caso asociado', type: 'text', required: true, placeholder: 'Folio del caso, por ejemplo CC-2026-0001' },
      { name: 'type', label: 'Tipo de medida', type: 'select', required: true, options: MEASURE_TYPES.map((v) => ({ value: v, label: v })) },
      { name: 'priority', label: 'Prioridad', type: 'select', required: true, options: priorityOptions },
      { name: 'responsible', label: 'Responsable', type: 'text', required: true },
      { name: 'startDate', label: 'Fecha de inicio', type: 'date', required: true },
      { name: 'endDate', label: 'Fecha de término', type: 'date', help: 'Déjela vacía si la medida se evaluará en seguimiento.' },
      { name: 'description', label: 'Descripción y forma de implementación', type: 'textarea', required: true }
    ]
  }
];
