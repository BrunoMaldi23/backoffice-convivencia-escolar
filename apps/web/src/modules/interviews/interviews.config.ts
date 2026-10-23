import type { ColumnDef, FilterDef, FormSectionDef } from '@/components/types';
import { optionsFrom } from '@/lib/status';

const participantOptions = ['Estudiante', 'Apoderado/a', 'Docente', 'Estudiante y apoderado/a', 'Otro funcionario/a'].map((v) => ({ value: v, label: v }));
const modeOptions = ['Presencial', 'Videollamada', 'Llamada telefónica'].map((v) => ({ value: v, label: v }));

export const interviewColumns: ColumnDef[] = [
  { field: 'folio', header: 'Folio', kind: 'folio' },
  { field: 'caseFolio', header: 'Caso', kind: 'folio', minScreen: 'md' },
  { field: 'participant', header: 'Participante' },
  { field: 'interviewer', header: 'Entrevistador/a', minScreen: 'xl' },
  { field: 'mode', header: 'Modalidad', minScreen: 'lg' },
  { field: 'scheduledAt', header: 'Fecha y hora', kind: 'datetime', minScreen: 'sm' },
  { field: 'status', header: 'Estado', kind: 'status' }
];

export const interviewFilters: FilterDef[] = [
  { field: 'status', label: 'Estado', options: optionsFrom(['programada', 'reprogramada', 'realizada']) },
  { field: 'mode', label: 'Modalidad', options: modeOptions }
];

export const interviewFormSections: FormSectionDef[] = [
  {
    title: 'Datos de la entrevista',
    fields: [
      { name: 'caseFolio', label: 'Caso asociado', type: 'text', required: true, placeholder: 'CC-2026-0001' },
      { name: 'participant', label: 'Participante', type: 'select', required: true, options: participantOptions },
      { name: 'scheduledAt', label: 'Fecha y hora', type: 'datetime', required: true },
      { name: 'mode', label: 'Modalidad', type: 'select', required: true, options: modeOptions },
      { name: 'place', label: 'Lugar', type: 'text', placeholder: 'Oficina de convivencia' },
      { name: 'purpose', label: 'Objetivo de la entrevista', type: 'textarea', required: true }
    ]
  }
];

export const agreementSections: FormSectionDef[] = [
  {
    title: 'Registro y acuerdos',
    description: 'Registre solo la información necesaria para el caso. El acta oficial se generará desde el servidor.',
    fields: [
      { name: 'summary', label: 'Síntesis de la entrevista', type: 'textarea', required: true },
      { name: 'agreements', label: 'Acuerdos', type: 'textarea', required: true },
      { name: 'nextReview', label: 'Fecha de revisión de acuerdos', type: 'date' }
    ]
  }
];
