import type {
  AppNotification, CaseDocument, CaseFollowUp, CaseMeasure, CaseReferral, CaseSummons, CaseTask, DocumentKind, FollowUpInput, Interview, MeasureInput, MeasureStatus, Page, ProtocolApplication,
  ProtocolTemplate, ProtocolVersion, ReferralInput, ReferralStatus, SummonsInput, SummonsStatus, TaskInput, TaskStatus, UpdateReferralInput, UpdateSummonsInput, Uuid
} from '@/types/api';
import { pick } from '@/lib/body';
import { ClientValidationError } from '@/lib/errors';
import { api, type ReadRequestOptions } from './api';

/** Documentos, protocolos, medidas, seguimientos, tareas y notificaciones: docs/api/backend-contracts.md ("Operación de expediente"). */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

/** La API autoriza con la sesión vigente y sólo entrega URLs firmadas de Supabase Storage. */
export const listDocuments = async (caseId: Uuid, options?: ReadRequestOptions): Promise<CaseDocument[]> =>
  (await api.get<CaseDocument[]>(`/cases/${caseId}/documents`, options)).data;
export interface GlobalWorkItems<T> { rows: { case: import('@/types/api').CaseRecord; item: T }[]; scanned: number; eligible: number; totalCases: number; truncated: boolean }
const globalWorkItems = async <T>(kind: string, includeClosed: boolean, options?: ReadRequestOptions): Promise<GlobalWorkItems<T>> => (await api.get<GlobalWorkItems<T>>(`/work-items/${kind}`, { ...options, params: { includeClosed } })).data;
export const listGlobalDocuments = (includeClosed = false, options?: ReadRequestOptions) => globalWorkItems<CaseDocument>('documents', includeClosed, options);
export const listGlobalMeasures = (includeClosed = false, options?: ReadRequestOptions) => globalWorkItems<CaseMeasure>('measures', includeClosed, options);
export const listGlobalFollowUps = (includeClosed = false, options?: ReadRequestOptions) => globalWorkItems<CaseFollowUp>('follow-ups', includeClosed, options);
export const listGlobalTasks = (includeClosed = false, options?: ReadRequestOptions) => globalWorkItems<CaseTask>('tasks', includeClosed, options);
export interface DashboardWorkItems {
  tasks?: GlobalWorkItems<CaseTask>;
  measures?: GlobalWorkItems<CaseMeasure>;
  followUps?: GlobalWorkItems<CaseFollowUp>;
  interviews?: GlobalWorkItems<Interview>;
}
export const getDashboardWorkItems = async (options?: ReadRequestOptions): Promise<DashboardWorkItems> =>
  (await api.get<DashboardWorkItems>('/dashboard/work-items', options)).data;
export const listGlobalInterviews = (includeClosed = false, options?: ReadRequestOptions) => globalWorkItems<import('@/types/api').Interview>('interviews', includeClosed, options);
export const listGlobalReports = (includeClosed = false, options?: ReadRequestOptions) => globalWorkItems<import('@/types/api').CaseReport>('reports', includeClosed, options);

export async function uploadDocument(caseId: Uuid, input: { kind: DocumentKind; file: File }): Promise<CaseDocument> {
  if (input.kind !== 'DOCUMENTO') throw new ClientValidationError('Seleccione Documento para cargar un archivo.');
  const upload = (await api.post<{ uploadId: Uuid; signedUrl: string }>(`/cases/${caseId}/documents/uploads`, {
    originalFilename: input.file.name, contentType: input.file.type, sizeBytes: input.file.size
  })).data;
  // El adaptador de previsualización no puede emitir URLs firmadas reales.
  if (upload.signedUrl.startsWith('fake://')) {
    return (await api.post<CaseDocument>(`/cases/${caseId}/documents`, {
      kind: 'DOCUMENTO', originalFilename: input.file.name, contentType: input.file.type, base64Content: await previewBase64(input.file)
    })).data;
  }
  try {
    const response = await fetch(upload.signedUrl, { method: 'PUT', headers: { 'Content-Type': input.file.type }, body: input.file });
    if (!response.ok) throw new ClientValidationError('No fue posible cargar el archivo de forma segura. Intente nuevamente.');
    return (await api.post<CaseDocument>(`/cases/${caseId}/documents/uploads/${upload.uploadId}/complete`)).data;
  } catch (error) {
    void api.delete(`/cases/${caseId}/documents/uploads/${upload.uploadId}`).catch(() => undefined);
    throw error;
  }
}

/** Sólo para el adaptador de previsualización en memoria; producción usa File directamente. */
async function previewBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

export const linkVideoEvidence = async (caseId: Uuid, input: { title: string; externalUrl: string }): Promise<CaseDocument> =>
  (await api.post<CaseDocument>(`/cases/${caseId}/documents`, {
    kind: 'EVIDENCIA', originalFilename: input.title, externalUrl: input.externalUrl
  })).data;

/** Descarga autorizada como binario; nunca se construye una ruta de almacenamiento. */
export const downloadDocument = async (caseId: Uuid, id: Uuid): Promise<Blob> =>
  (await api.get<Blob>(`/cases/${caseId}/documents/${id}/download`, { responseType: 'blob' })).data;
export const voidDocument = async (caseId: Uuid, id: Uuid, input: { expectedVersion: number; reason: string }): Promise<CaseDocument> =>
  (await api.post<CaseDocument>(`/cases/${caseId}/documents/${id}/void`, pick(input, ['expectedVersion', 'reason'] as const))).data;

export const listProtocols = async (establishmentId: Uuid): Promise<ProtocolTemplate[]> => (await api.get<ProtocolTemplate[]>(`/protocols/${establishmentId}`)).data;
export const importRice2026Protocols = async (establishmentId: Uuid): Promise<{ created: number; existing: number; total: number }> => (await api.post(`/protocols/${establishmentId}/import-rice-2026`, {})).data;
export const createProtocol = async (input: { establishmentId: Uuid; code: string; name: string; categoryCodes: string[]; title: string; content: unknown }): Promise<ProtocolTemplate> =>
  (await api.post<ProtocolTemplate>('/protocols', { ...input, content: JSON.stringify(input.content) })).data;
export const publishProtocolVersion = async (versionId: Uuid, establishmentId: Uuid): Promise<ProtocolVersion> => (await api.post<ProtocolVersion>(`/protocols/versions/${versionId}/publish`, { establishmentId })).data;
export const applyProtocol = async (caseId: Uuid, versionId: Uuid): Promise<ProtocolApplication> => (await api.post<ProtocolApplication>(`/cases/${caseId}/protocols/${versionId}`, {})).data;
export const listProtocolApplications = async (caseId: Uuid): Promise<ProtocolApplication[]> => (await api.get<ProtocolApplication[]>(`/cases/${caseId}/protocol-applications`)).data;
export const revokeProtocolApplication = async (caseId: Uuid, id: Uuid, input: { expectedVersion: number; reason: string }): Promise<ProtocolApplication> => (await api.post<ProtocolApplication>(`/cases/${caseId}/protocol-applications/${id}/revoke`, pick(input, ['expectedVersion', 'reason'] as const))).data;

export const listMeasures = async (caseId: Uuid): Promise<CaseMeasure[]> => (await api.get<CaseMeasure[]>(`/cases/${caseId}/measures`)).data;
export const createMeasure = async (caseId: Uuid, input: MeasureInput): Promise<CaseMeasure> => (await api.post<CaseMeasure>(`/cases/${caseId}/measures`, input)).data;
export const updateMeasure = async (caseId: Uuid, id: Uuid, input: { expectedVersion: number; title?: string; description?: string | null; status?: MeasureStatus; dueAt?: string | null; responsibleUserIds?: string[] }): Promise<CaseMeasure> => (await api.post<CaseMeasure>(`/cases/${caseId}/measures/${id}/update`, input)).data;

export const listFollowUps = async (caseId: Uuid): Promise<CaseFollowUp[]> => (await api.get<CaseFollowUp[]>(`/cases/${caseId}/follow-ups`)).data;
export const createFollowUp = async (caseId: Uuid, input: FollowUpInput): Promise<CaseFollowUp> => (await api.post<CaseFollowUp>(`/cases/${caseId}/follow-ups`, input)).data;
export const voidFollowUp = async (caseId: Uuid, id: Uuid, input: { expectedVersion: number; reason: string }): Promise<CaseFollowUp> =>
  (await api.post<CaseFollowUp>(`/cases/${caseId}/follow-ups/${id}/void`, pick(input, ['expectedVersion', 'reason'] as const))).data;

export const listTasks = async (caseId: Uuid): Promise<CaseTask[]> => (await api.get<CaseTask[]>(`/cases/${caseId}/tasks`)).data;
export const createTask = async (caseId: Uuid, input: TaskInput): Promise<CaseTask> => (await api.post<CaseTask>(`/cases/${caseId}/tasks`, input)).data;
export const completeTask = async (caseId: Uuid, id: Uuid): Promise<CaseTask> => (await api.post<CaseTask>(`/cases/${caseId}/tasks/${id}/complete`, {})).data;
export const updateTask = async (caseId: Uuid, id: Uuid, input: { expectedVersion: number; title?: string; dueAt?: string | null; assignedToUserId?: string | null; status?: TaskStatus }): Promise<CaseTask> => (await api.post<CaseTask>(`/cases/${caseId}/tasks/${id}/update`, pick(input, ['expectedVersion', 'title', 'dueAt', 'assignedToUserId', 'status'] as const))).data;

export const listNotifications = async (options?: ReadRequestOptions): Promise<AppNotification[]> => (await api.get<AppNotification[]>('/notifications', options)).data;
export const markNotificationRead = async (id: Uuid): Promise<AppNotification> => (await api.post<AppNotification>(`/notifications/${id}/read`, {})).data;

/** Citaciones y derivaciones (docs/api/community-contract.md). Los listados globales solo incluyen expedientes visibles para la persona. */
export interface ActionListQuery<S> { establishmentId?: Uuid; status?: S; page?: number; limit?: number }
export const listCaseSummons = async (caseId: Uuid): Promise<CaseSummons[]> => (await api.get<CaseSummons[]>(`/cases/${caseId}/summons`)).data;
export const createSummons = async (caseId: Uuid, input: SummonsInput): Promise<CaseSummons> => (await api.post<CaseSummons>(`/cases/${caseId}/summons`, input)).data;
export const updateSummons = async (caseId: Uuid, id: Uuid, input: UpdateSummonsInput): Promise<CaseSummons> => (await api.post<CaseSummons>(`/cases/${caseId}/summons/${id}/update`, input)).data;
export const downloadSummonsLetter = async (caseId: Uuid, id: Uuid): Promise<Blob> =>
  (await api.get<Blob>(`/cases/${caseId}/summons/${id}/letter`, { responseType: 'blob' })).data;
export const sendSummonsEmail = async (caseId: Uuid, id: Uuid, input: { expectedVersion: number; recipientEmail: string }): Promise<CaseSummons> =>
  (await api.post<CaseSummons>(`/cases/${caseId}/summons/${id}/send-email`, input)).data;
export const listSummons = async (query: ActionListQuery<SummonsStatus> & { from?: string; to?: string } = {}, options?: ReadRequestOptions): Promise<Page<CaseSummons>> => (await api.get<Page<CaseSummons>>('/summons', { ...options, params: { page: 1, limit: 25, ...query } })).data;

export const listCaseReferrals = async (caseId: Uuid): Promise<CaseReferral[]> => (await api.get<CaseReferral[]>(`/cases/${caseId}/referrals`)).data;
export const createReferral = async (caseId: Uuid, input: ReferralInput): Promise<CaseReferral> => (await api.post<CaseReferral>(`/cases/${caseId}/referrals`, input)).data;
export const updateReferral = async (caseId: Uuid, id: Uuid, input: UpdateReferralInput): Promise<CaseReferral> => (await api.post<CaseReferral>(`/cases/${caseId}/referrals/${id}/update`, input)).data;
export const listReferrals = async (query: ActionListQuery<ReferralStatus> = {}, options?: ReadRequestOptions): Promise<Page<CaseReferral>> => (await api.get<Page<CaseReferral>>('/referrals', { ...options, params: { page: 1, limit: 25, ...query } })).data;

/**
 * Eliminaciones definitivas de registros aún reversibles (documentos, seguimientos, tareas pendientes y protocolos aplicados): salen del
 * expediente y de su línea de tiempo y solo queda la auditoría de seguridad. Lo ya formalizado se anula, cancela o revoca (con motivo).
 */
type Removed = Promise<{ id: Uuid }>;
const remove = async (path: string, expectedVersion: number): Removed => (await api.delete<{ id: Uuid }>(path, { data: { expectedVersion } })).data;
export const deleteDocument = (caseId: Uuid, id: Uuid, expectedVersion: number): Removed => remove(`/cases/${caseId}/documents/${id}`, expectedVersion);
export const deleteFollowUp = (caseId: Uuid, id: Uuid, expectedVersion: number): Removed => remove(`/cases/${caseId}/follow-ups/${id}`, expectedVersion);
export const deleteTask = (caseId: Uuid, id: Uuid, expectedVersion: number): Removed => remove(`/cases/${caseId}/tasks/${id}`, expectedVersion);
export const deleteProtocolApplication = (caseId: Uuid, id: Uuid, expectedVersion: number): Removed => remove(`/cases/${caseId}/protocol-applications/${id}`, expectedVersion);
