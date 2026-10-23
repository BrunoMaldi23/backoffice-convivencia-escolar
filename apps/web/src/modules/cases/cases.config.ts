import type { ColumnDef, FilterDef, FormSectionDef } from '@/components/types';
import { optionsFrom, priorityOptions } from '@/lib/status';

export const CASE_TYPES = ['Conflicto entre pares', 'Maltrato escolar', 'Ciberacoso', 'Agresión verbal', 'Daño a la propiedad', 'Situación de vulneración', 'Otro'];
const typeOptions = CASE_TYPES.map((v) => ({ value: v, label: v }));

export const caseColumns: ColumnDef[] = [
  { field: 'folio', header: 'Folio', kind: 'folio' },
  { field: 'type', header: 'Tipo' },
  { field: 'course', header: 'Curso', minScreen: 'md' },
  { field: 'priority', header: 'Prioridad', kind: 'priority' },
  { field: 'status', header: 'Estado', kind: 'status', minScreen: 'sm' },
  { field: 'responsible', header: 'Responsable', minScreen: 'xl' },
  { field: 'createdAt', header: 'Ingreso', kind: 'date', minScreen: 'lg' },
  { field: 'updatedAt', header: 'Última actualización', kind: 'datetime', minScreen: 'xl' }
];

export const caseFilters: FilterDef[] = [
  { field: 'status', label: 'Estado', options: optionsFrom(['abierto', 'en_proceso', 'en_revision', 'pendiente']) },
  { field: 'priority', label: 'Prioridad', options: priorityOptions },
  { field: 'type', label: 'Tipo', options: typeOptions }
];

export const caseFormSections: FormSectionDef[] = [
  {
    title: 'Identificación del caso',
    description: 'El folio se asigna automáticamente al guardar.',
    fields: [
      { name: 'type', label: 'Tipo de situación', type: 'select', required: true, options: typeOptions },
      { name: 'priority', label: 'Prioridad', type: 'select', required: true, options: priorityOptions },
      { name: 'course', label: 'Curso', type: 'text', required: true, placeholder: 'Por ejemplo, 7° Básico A' },
      { name: 'occurredAt', label: 'Fecha de los hechos', type: 'date', required: true },
      { name: 'place', label: 'Lugar', type: 'text', placeholder: 'Sala, patio, entorno digital u otro' },
      { name: 'source', label: 'Origen del caso', type: 'select', options: [
        { value: 'denuncia', label: 'Denuncia' }, { value: 'observacion', label: 'Observación directa' }, { value: 'derivacion', label: 'Derivación interna' }
      ] }
    ]
  },
  {
    title: 'Antecedentes',
    description: 'Describa los hechos de forma objetiva. Evite juicios y datos que no sean necesarios para la gestión del caso.',
    fields: [{ name: 'description', label: 'Relato de los hechos', type: 'textarea', required: true }]
  },
  {
    title: 'Responsables',
    fields: [
      { name: 'responsible', label: 'Responsable del caso', type: 'select', required: true, options: [
        { value: 'convivencia', label: 'Encargado/a de convivencia' }, { value: 'psicologia', label: 'Psicólogo/a' }, { value: 'inspectoria', label: 'Inspectoría general' }
      ], help: 'La lista definitiva se cargará desde los funcionarios con rol habilitado.' }
    ]
  }
];
