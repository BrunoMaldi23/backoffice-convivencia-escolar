import type { ColumnDef, FilterDef, FormSectionDef } from '@/components/types';
import { optionsFrom } from '@/lib/status';

const institutionTypes = ['Salud', 'Salud mental', 'Protección', 'Psicosocial', 'Otra'].map((v) => ({ value: v, label: v }));

export const referralColumns: ColumnDef[] = [
  { field: 'folio', header: 'Folio', kind: 'folio' },
  { field: 'institution', header: 'Institución receptora' },
  { field: 'institutionType', header: 'Tipo', minScreen: 'lg' },
  { field: 'caseFolio', header: 'Caso', kind: 'folio', minScreen: 'md' },
  { field: 'responsible', header: 'Responsable', minScreen: 'xl' },
  { field: 'sentAt', header: 'Fecha de envío', kind: 'date', minScreen: 'sm' },
  { field: 'status', header: 'Estado', kind: 'status' }
];

export const referralFilters: FilterDef[] = [
  { field: 'status', label: 'Estado', options: optionsFrom(['enviada', 'en_atencion', 'sin_respuesta', 'cerrada']) },
  { field: 'institutionType', label: 'Tipo de institución', options: institutionTypes }
];

export const referralFormSections: FormSectionDef[] = [
  {
    title: 'Derivación',
    description: 'Registrar la derivación no envía comunicaciones externas. El envío se realiza por los canales formales del establecimiento.',
    fields: [
      { name: 'caseFolio', label: 'Caso asociado', type: 'text', required: true, placeholder: 'CC-2026-0001' },
      { name: 'institution', label: 'Institución receptora', type: 'text', required: true },
      { name: 'institutionType', label: 'Tipo de institución', type: 'select', required: true, options: institutionTypes },
      { name: 'responsible', label: 'Responsable interno', type: 'text', required: true },
      { name: 'sentAt', label: 'Fecha de envío', type: 'date', required: true },
      { name: 'reason', label: 'Motivo de la derivación', type: 'textarea', required: true }
    ]
  }
];
