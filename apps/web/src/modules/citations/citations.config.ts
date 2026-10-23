import type { ColumnDef, FilterDef, FormSectionDef } from '@/components/types';
import { optionsFrom } from '@/lib/status';

const channelOptions = ['Agenda escolar', 'Correo institucional', 'Llamada telefónica'].map((v) => ({ value: v, label: v }));

export const citationColumns: ColumnDef[] = [
  { field: 'folio', header: 'Folio', kind: 'folio' },
  { field: 'recipient', header: 'Citado/a' },
  { field: 'caseFolio', header: 'Caso', kind: 'folio', minScreen: 'md' },
  { field: 'channel', header: 'Canal', minScreen: 'xl' },
  { field: 'scheduledAt', header: 'Fecha y hora', kind: 'datetime', minScreen: 'sm' },
  { field: 'status', header: 'Estado', kind: 'status' }
];

export const citationFilters: FilterDef[] = [
  { field: 'status', label: 'Estado', options: optionsFrom(['enviada', 'confirmada', 'realizada', 'no_asiste']) },
  { field: 'channel', label: 'Canal', options: channelOptions }
];

export const citationFormSections: FormSectionDef[] = [
  {
    title: 'Citación',
    description: 'Registrar la citación no la envía: la comunicación se emitirá desde el servidor cuando la integración esté disponible.',
    fields: [
      { name: 'caseFolio', label: 'Caso asociado', type: 'text', required: true, placeholder: 'CC-2026-0001' },
      { name: 'recipient', label: 'Persona citada', type: 'select', required: true, options: ['Apoderado/a', 'Apoderado/a suplente', 'Tutor/a legal'].map((v) => ({ value: v, label: v })) },
      { name: 'scheduledAt', label: 'Fecha y hora', type: 'datetime', required: true },
      { name: 'channel', label: 'Canal de aviso', type: 'select', required: true, options: channelOptions },
      { name: 'reason', label: 'Motivo', type: 'textarea', required: true }
    ]
  }
];
