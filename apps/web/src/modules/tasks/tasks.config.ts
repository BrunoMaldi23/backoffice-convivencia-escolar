import type { ColumnDef, FilterDef, FormSectionDef } from '@/components/types';
import { optionsFrom, priorityOptions } from '@/lib/status';

export const TASK_STATUSES = ['pendiente', 'en_curso', 'vencida', 'completada'] as const;

export const taskColumns: ColumnDef[] = [
  { field: 'title', header: 'Tarea', kind: 'strong' },
  { field: 'caseFolio', header: 'Caso', kind: 'folio', minScreen: 'lg' },
  { field: 'responsible', header: 'Responsable', minScreen: 'xl' },
  { field: 'priority', header: 'Prioridad', kind: 'priority', minScreen: 'md' },
  { field: 'dueDate', header: 'Vence', kind: 'date', minScreen: 'sm' },
  { field: 'status', header: 'Estado', kind: 'status' }
];

export const taskFilters: FilterDef[] = [
  { field: 'status', label: 'Estado', options: optionsFrom([...TASK_STATUSES]) },
  { field: 'priority', label: 'Prioridad', options: priorityOptions }
];

export const taskFormSections: FormSectionDef[] = [
  {
    title: 'Tarea',
    fields: [
      { name: 'title', label: 'Título', type: 'text', required: true, full: true },
      { name: 'caseFolio', label: 'Caso asociado', type: 'text', placeholder: 'Opcional, por ejemplo CC-2026-0001' },
      { name: 'responsible', label: 'Responsable', type: 'text', required: true },
      { name: 'priority', label: 'Prioridad', type: 'select', required: true, options: priorityOptions },
      { name: 'dueDate', label: 'Fecha de vencimiento', type: 'date', required: true },
      { name: 'description', label: 'Descripción', type: 'textarea' }
    ]
  }
];
