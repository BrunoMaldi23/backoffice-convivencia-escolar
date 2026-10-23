/**
 * Tipos de la API real (docs/api/backend-contracts.md y esquema de la API). Las fechas llegan como ISO-8601 (string)
 * y los identificadores son UUID. No contienen secretos: la API nunca devuelve hashes ni tokens.
 */
export type Uuid = string;
export type IsoDate = string;

export interface Page<T> { items: T[]; total: number; page: number; limit: number }

/** Usuario de la sesión, tal como lo entrega `GET /api/auth/me` (los roles son informativos; el servidor decide los permisos). */
export interface SessionUser { id: Uuid; displayName: string; email: string; roles: string[] }

// ── Autenticación, usuarios, roles y auditoría ─────────────────────────────────────────────────────────────
export interface AdminUser { id: Uuid; email: string; displayName: string; isActive: boolean; createdAt: IsoDate; updatedAt: IsoDate; roles: string[] }
export interface Role { id: Uuid; name: string; description: string; permissions: string[] }
export interface Permission { id: Uuid; code: string; description: string }
export interface AuditEntry { id: Uuid; actorUserId: Uuid | null; action: string; targetType: string; targetId: string | null; metadata: Record<string, unknown> | null; createdAt: IsoDate }

// ── Instituciones ──────────────────────────────────────────────────────────────────────────────────────────
export interface Establishment { id: Uuid; code: string; name: string; institutionalIdentifier: string | null; isActive: boolean; createdAt: IsoDate; updatedAt: IsoDate }
export interface CaseStage { id: Uuid; establishmentId: Uuid; code: string; name: string; displayOrder: number; isActive: boolean; createdAt: IsoDate; updatedAt: IsoDate }
export interface Membership { establishmentId: Uuid; userId: Uuid; isActive: boolean; createdAt: IsoDate; updatedAt: IsoDate }
export type CaseAccessLevel = 'READ' | 'WRITE';
export interface CaseAccessGrant { id: Uuid; caseId: Uuid; userId: Uuid; accessLevel: CaseAccessLevel; grantedByUserId: Uuid; grantedAt: IsoDate; expiresAt: IsoDate | null; revokedAt: IsoDate | null; reason: string | null }

// ── Expedientes ────────────────────────────────────────────────────────────────────────────────────────────
export const CASE_STATUSES = ['ABIERTO', 'EN_EVALUACION', 'EN_PROCESO', 'PAUSADO', 'RESUELTO', 'CERRADO'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export interface CaseRecord {
  id: Uuid; establishmentId: Uuid; folio: number; title: string; initialDescription: string; receivedAt: IsoDate; categoryCode: string; priority: string;
  status: CaseStatus; currentStageId: Uuid | null; responsibleUserId: Uuid | null; createdByUserId: Uuid; closedAt: IsoDate | null; closureReason: string | null;
  nextAction: string | null; nextActionDueAt: IsoDate | null; version: number; createdAt: IsoDate; updatedAt: IsoDate;
}

export type CaseEventType =
  | 'CASE_CREATED' | 'CASE_UPDATED' | 'CASE_ASSIGNED' | 'CASE_STAGE_CHANGED' | 'CASE_TRANSITIONED' | 'CASE_PAUSED' | 'CASE_RESUMED' | 'CASE_RESOLVED' | 'CASE_CLOSED'
  | 'CASE_REOPENED' | 'REPORT_CREATED' | 'REPORT_UPDATED' | 'PARTICIPANT_LINKED' | 'PARTICIPANT_UNLINKED' | 'INTERVIEW_CREATED' | 'INTERVIEW_FINALIZED'
  | 'INTERVIEW_CORRECTED' | 'DOCUMENT_UPLOADED' | 'PROTOCOL_APPLIED' | 'MEASURE_CREATED' | 'MEASURE_UPDATED' | 'FOLLOW_UP_CREATED' | 'TASK_CREATED'
  | 'TASK_COMPLETED' | 'NOTIFICATION_CREATED';

export interface CaseEvent {
  id: Uuid; caseId: Uuid; actorUserId: Uuid | null; occurredAt: IsoDate; eventType: CaseEventType; previousStatus: CaseStatus | null; newStatus: CaseStatus | null;
  previousStageId: Uuid | null; newStageId: Uuid | null; correlationId: Uuid; relatedEntityType: string | null; relatedEntityId: string | null; metadata: unknown;
}

export interface CaseReport {
  id: Uuid; caseId: Uuid; establishmentId: Uuid; receivedAt: IsoDate; channelCode: string; classificationCode: string; factualDescription: string; background: string | null;
  createdByUserId: Uuid; version: number; createdAt: IsoDate; updatedAt: IsoDate;
}

export type ParticipantKind = 'ESTUDIANTE' | 'APODERADO' | 'FUNCIONARIO' | 'TERCERO';
export interface Participant { id: Uuid; establishmentId: Uuid; kind: ParticipantKind; referenceLabel: string; isActive: boolean; createdAt: IsoDate; updatedAt: IsoDate }
export interface CaseParticipantLink { id: Uuid; caseId: Uuid; participantId: Uuid; participationCode: string; linkedByUserId: Uuid; linkedAt: IsoDate; unlinkedAt: IsoDate | null; participant: Participant }

export type InterviewStatus = 'BORRADOR' | 'FINALIZADA';
export interface Interview {
  id: Uuid; caseId: Uuid; interviewerUserId: Uuid; occurredAt: IsoDate; modalityCode: string; summary: string; restrictedNotes: string | null; agreements: string | null;
  status: InterviewStatus; version: number; finalizedAt: IsoDate | null; createdAt: IsoDate; updatedAt: IsoDate;
}

export type DocumentKind = 'DOCUMENTO' | 'EVIDENCIA';
/** Metadatos de un documento. La clave interna de almacenamiento (`storageKey`) nunca se muestra ni se usa. */
export interface CaseDocument { id: Uuid; caseId?: Uuid; kind: DocumentKind; originalFilename: string; contentType: string; sizeBytes: number; sha256: string; createdAt: IsoDate; uploadedByUserId: Uuid }

export type ProtocolVersionStatus = 'BORRADOR' | 'PUBLICADO' | 'RETIRADO';
export interface ProtocolVersion { id: Uuid; protocolTemplateId: Uuid; version: number; title: string; content: unknown; status: ProtocolVersionStatus; createdByUserId: Uuid; publishedAt: IsoDate | null; createdAt: IsoDate }
export interface ProtocolTemplate { id: Uuid; establishmentId: Uuid; code: string; name: string; isActive: boolean; createdAt: IsoDate; updatedAt: IsoDate; versions: ProtocolVersion[] }
export interface ProtocolApplication { id: Uuid; caseId: Uuid; protocolVersionId: Uuid; appliedByUserId: Uuid; appliedAt: IsoDate }

export type MeasureStatus = 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';
export interface CaseMeasure {
  id: Uuid; caseId: Uuid; createdByUserId: Uuid; title: string; description: string | null; dueAt: IsoDate | null; status: MeasureStatus; version: number; completedAt: IsoDate | null;
  createdAt: IsoDate; updatedAt: IsoDate; responsibles: { measureId: Uuid; userId: Uuid; assignedAt: IsoDate }[];
}

export interface CaseFollowUp { id: Uuid; caseId: Uuid; createdByUserId: Uuid; occurredAt: IsoDate; note: string; nextAction: string | null; nextActionDueAt: IsoDate | null; createdAt: IsoDate }

export type TaskStatus = 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';
export interface CaseTask { id: Uuid; caseId: Uuid; createdByUserId: Uuid; assignedToUserId: Uuid | null; title: string; dueAt: IsoDate | null; status: TaskStatus; completedAt: IsoDate | null; createdAt: IsoDate; updatedAt: IsoDate }

export interface AppNotification { id: Uuid; userId: Uuid; caseId: Uuid | null; type: string; title: string; body: string; readAt: IsoDate | null; createdAt: IsoDate }

// ── Entradas (cuerpos de solicitud) ───────────────────────────────────────────────────────────────────────
export interface CreateCaseInput { establishmentId: Uuid; title: string; initialDescription?: string; receivedAt: IsoDate; categoryCode: string; priority: string; currentStageId?: Uuid; responsibleUserId?: Uuid; nextAction?: string; nextActionDueAt?: IsoDate }
export interface UpdateCaseInput { expectedVersion: number; title?: string; categoryCode?: string; priority?: string; receivedAt?: IsoDate; currentStageId?: Uuid | null; nextAction?: string | null; nextActionDueAt?: IsoDate | null }
export interface CaseListFilters { establishmentId?: Uuid; status?: CaseStatus; responsibleUserId?: Uuid; priority?: string; stageId?: Uuid; from?: IsoDate; to?: IsoDate; page?: number; limit?: number }
export interface TransitionInput { toStatus: CaseStatus; expectedVersion: number; stageId?: Uuid; reason?: string }
export interface ReportInput { receivedAt: IsoDate; channelCode: string; classificationCode: string; factualDescription: string; background?: string }
export interface UpdateReportInput { expectedVersion: number; channelCode?: string; classificationCode?: string; factualDescription?: string; background?: string | null }
export interface InterviewInput { occurredAt: IsoDate; modalityCode: string; summary: string; restrictedNotes?: string; agreements?: string }
export interface MeasureInput { title: string; description?: string; dueAt?: IsoDate; responsibleUserIds: Uuid[] }
export interface FollowUpInput { occurredAt: IsoDate; note: string; nextAction?: string; nextActionDueAt?: IsoDate }
export interface TaskInput { title: string; dueAt?: IsoDate; assignedToUserId?: Uuid }
