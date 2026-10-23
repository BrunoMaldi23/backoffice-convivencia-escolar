import type { CaseEventType, CaseStatus, ParticipantKind } from '@/types/api';

/**
 * Códigos de catálogo que usa la interfaz. La API los guarda como texto libre (categoría, canal, clasificación, modalidad
 * y participación no tienen un endpoint de catálogo), por lo que estas listas son una convención del frontend: ofrecen
 * opciones consistentes y etiquetas en español, pero cualquier otro código recibido se muestra tal cual.
 * Los catálogos institucionales definitivos están pendientes de definición por el establecimiento (ver docs/frontend/api-integration.md).
 */
export interface Option { value: string; label: string }

const make = (entries: [string, string][]): Option[] => entries.map(([value, label]) => ({ value, label }));
const labelFrom = (options: Option[]) => (code: string | null | undefined) =>
  code ? options.find((o) => o.value === code)?.label ?? code.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '—';

export const CATEGORY_OPTIONS = make([
  ['CONVIVENCIA', 'Convivencia escolar'], ['ACOSO', 'Acoso escolar'], ['CIBERACOSO', 'Ciberacoso'], ['VIOLENCIA', 'Violencia física o verbal'],
  ['DISCRIMINACION', 'Discriminación'], ['VULNERACION', 'Vulneración de derechos'], ['OTRO', 'Otra situación']
]);
export const categoryLabel = labelFrom(CATEGORY_OPTIONS);

export const CHANNEL_OPTIONS = make([['DIRECTO', 'Presencial'], ['CORREO', 'Correo institucional'], ['TELEFONO', 'Teléfono'], ['BUZON', 'Buzón interno'], ['OTRO', 'Otro canal']]);
export const channelLabel = labelFrom(CHANNEL_OPTIONS);

export const CLASSIFICATION_OPTIONS = make([['SIN_CLASIFICAR', 'Sin clasificar'], ['LEVE', 'Falta leve'], ['GRAVE', 'Falta grave'], ['GRAVISIMA', 'Falta gravísima']]);
export const classificationLabel = labelFrom(CLASSIFICATION_OPTIONS);

export const MODALITY_OPTIONS = make([['PRESENCIAL', 'Presencial'], ['VIDEOLLAMADA', 'Videollamada'], ['TELEFONICA', 'Telefónica']]);
export const modalityLabel = labelFrom(MODALITY_OPTIONS);

export const PARTICIPATION_OPTIONS = make([['AFECTADO', 'Afectado/a'], ['DENUNCIANTE', 'Denunciante'], ['IMPLICADO', 'Implicado/a'], ['TESTIGO', 'Testigo'], ['OTRO', 'Otra participación']]);
export const participationLabel = labelFrom(PARTICIPATION_OPTIONS);

export const PARTICIPANT_KIND_OPTIONS: { value: ParticipantKind; label: string }[] = [
  { value: 'ESTUDIANTE', label: 'Estudiante' }, { value: 'APODERADO', label: 'Apoderado/a' }, { value: 'FUNCIONARIO', label: 'Funcionario/a' }, { value: 'TERCERO', label: 'Tercero' }
];
export const participantKindLabel = (kind: string) => PARTICIPANT_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;

export const RELATIONSHIP_OPTIONS = make([['MADRE', 'Madre'], ['PADRE', 'Padre'], ['TUTOR_LEGAL', 'Tutor/a legal'], ['ABUELO_A', 'Abuelo/a'], ['HERMANO_A', 'Hermano/a'], ['OTRO', 'Otro vínculo']]);
export const relationshipLabel = labelFrom(RELATIONSHIP_OPTIONS);

/** Instituciones de la red a las que se deriva. Convención del frontend: la API guarda el código como texto libre. */
export const REFERRAL_TYPE_OPTIONS = make([
  ['SALUD', 'Salud (CESFAM, hospital)'], ['OPD', 'Oficina de Protección de Derechos'], ['TRIBUNAL_FAMILIA', 'Tribunal de Familia'], ['FISCALIA', 'Fiscalía'],
  ['SERVICIO_LOCAL', 'Servicio Local de Educación'], ['SUPERINTENDENCIA', 'Superintendencia de Educación'], ['OTRO', 'Otra institución']
]);
export const referralTypeLabel = labelFrom(REFERRAL_TYPE_OPTIONS);

/** Transiciones permitidas por la máquina de estados (docs/architecture/case-state-machine.md). El servidor las valida. */
export const TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  ABIERTO: ['EN_EVALUACION', 'PAUSADO'],
  EN_EVALUACION: ['EN_PROCESO', 'PAUSADO', 'RESUELTO'],
  EN_PROCESO: ['PAUSADO', 'RESUELTO'],
  PAUSADO: ['EN_EVALUACION', 'EN_PROCESO'],
  RESUELTO: ['CERRADO', 'EN_PROCESO'],
  CERRADO: ['EN_EVALUACION']
};

/** Transiciones que exigen un motivo (reglas del servidor en `CasesService.transition`). */
export function transitionNeedsReason(from: CaseStatus, to: CaseStatus): boolean {
  return to === 'PAUSADO' || to === 'RESUELTO' || to === 'CERRADO' || from === 'PAUSADO' || from === 'CERRADO' || (from === 'RESUELTO' && to === 'EN_PROCESO');
}

/** Nombre de la acción según el origen y el destino de la transición. */
export function transitionLabel(from: CaseStatus, to: CaseStatus): string {
  if (to === 'CERRADO') return 'Cerrar caso';
  if (from === 'CERRADO') return 'Reabrir caso';
  if (to === 'PAUSADO') return 'Pausar';
  if (from === 'PAUSADO') return to === 'EN_PROCESO' ? 'Reanudar en proceso' : 'Reanudar evaluación';
  if (to === 'RESUELTO') return 'Marcar como resuelto';
  if (from === 'RESUELTO' && to === 'EN_PROCESO') return 'Volver a proceso';
  return to === 'EN_EVALUACION' ? 'Iniciar evaluación' : 'Pasar a en proceso';
}

export const EVENT_LABELS: Record<CaseEventType, string> = {
  CASE_CREATED: 'Expediente creado', CASE_UPDATED: 'Expediente actualizado', CASE_ASSIGNED: 'Responsable asignado', CASE_STAGE_CHANGED: 'Etapa modificada',
  CASE_TRANSITIONED: 'Cambio de estado', CASE_PAUSED: 'Expediente pausado', CASE_RESUMED: 'Expediente reanudado', CASE_RESOLVED: 'Expediente resuelto',
  CASE_CLOSED: 'Expediente cerrado', CASE_REOPENED: 'Expediente reabierto', REPORT_CREATED: 'Denuncia registrada', REPORT_UPDATED: 'Denuncia modificada', REPORT_VOIDED: 'Denuncia anulada',
  PARTICIPANT_LINKED: 'Involucrado asociado', PARTICIPANT_UPDATED: 'Participación actualizada', PARTICIPANT_UNLINKED: 'Involucrado desvinculado', INTERVIEW_CREATED: 'Entrevista registrada',
  INTERVIEW_FINALIZED: 'Entrevista finalizada', INTERVIEW_CORRECTED: 'Entrevista reabierta para corrección', INTERVIEW_VOIDED: 'Entrevista anulada', DOCUMENT_UPLOADED: 'Documento cargado', DOCUMENT_VOIDED: 'Documento anulado',
  PROTOCOL_APPLIED: 'Protocolo aplicado', PROTOCOL_REVOKED: 'Aplicación de protocolo revocada', MEASURE_CREATED: 'Medida registrada', MEASURE_UPDATED: 'Medida actualizada', FOLLOW_UP_CREATED: 'Seguimiento registrado', FOLLOW_UP_VOIDED: 'Seguimiento anulado',
  TASK_CREATED: 'Tarea creada', TASK_UPDATED: 'Tarea actualizada', TASK_COMPLETED: 'Tarea completada', TASK_CANCELLED: 'Tarea cancelada', NOTIFICATION_CREATED: 'Notificación emitida', SUMMONS_CREATED: 'Citación registrada',
  SUMMONS_UPDATED: 'Citación actualizada', REFERRAL_CREATED: 'Derivación registrada', REFERRAL_UPDATED: 'Derivación actualizada'
};
export const eventLabel = (type: string) => EVENT_LABELS[type as CaseEventType] ?? type.replace(/_/g, ' ').toLowerCase();

/** Número de folio legible. El backend guarda un entero por establecimiento. */
export const formatFolio = (folio: number) => `EXP-${String(folio).padStart(4, '0')}`;
