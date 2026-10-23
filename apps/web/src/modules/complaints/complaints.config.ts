import type { ColumnDef, FilterDef, FormSectionDef } from '@/components/types';
import { optionsFrom } from '@/lib/status';

export const COMPLAINT_CATEGORIES = ['Maltrato entre estudiantes', 'Maltrato de adulto a estudiante', 'Acoso escolar', 'Discriminación', 'Otro'];
export const CLASSIFICATIONS = ['Sin clasificar', 'Falta leve', 'Falta grave', 'Falta gravísima'];
const channelOptions = ['Presencial', 'Correo institucional', 'Buzón interno', 'Entrevista'].map((v) => ({ value: v, label: v }));

export const complaintColumns: ColumnDef[] = [
  { field: 'folio', header: 'Folio', kind: 'folio' },
  { field: 'category', header: 'Categoría' },
  { field: 'classification', header: 'Clasificación', minScreen: 'lg' },
  { field: 'channel', header: 'Canal', minScreen: 'xl' },
  { field: 'assignedTo', header: 'Asignada a', minScreen: 'xl' },
  { field: 'receivedAt', header: 'Recepción', kind: 'date', minScreen: 'sm' },
  { field: 'status', header: 'Estado', kind: 'status' }
];

export const complaintFilters: FilterDef[] = [
  { field: 'status', label: 'Estado', options: optionsFrom(['recibida', 'clasificada', 'en_revision', 'derivada', 'desestimada']) },
  { field: 'category', label: 'Categoría', options: COMPLAINT_CATEGORIES.map((v) => ({ value: v, label: v })) }
];

export const complaintFormSections: FormSectionDef[] = [
  {
    title: 'Recepción',
    description: 'Registro interno realizado por un funcionario. No existe un portal público de denuncias.',
    fields: [
      { name: 'channel', label: 'Canal de recepción', type: 'select', required: true, options: channelOptions },
      { name: 'receivedAt', label: 'Fecha de recepción', type: 'date', required: true },
      { name: 'category', label: 'Categoría', type: 'select', required: true, options: COMPLAINT_CATEGORIES.map((v) => ({ value: v, label: v })) },
      { name: 'reporterRole', label: 'Quién informa', type: 'select', required: true, options: ['Estudiante', 'Apoderado/a', 'Funcionario/a', 'Anónimo'].map((v) => ({ value: v, label: v })) }
    ]
  },
  {
    title: 'Relato',
    description: 'Transcriba lo informado sin interpretar. No incluya datos de salud ni información que no sea necesaria.',
    fields: [{ name: 'description', label: 'Relato de la denuncia', type: 'textarea', required: true }, { name: 'involvedCourse', label: 'Curso de las personas involucradas', type: 'text' }]
  }
];
