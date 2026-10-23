import type {
  AppNotification, CaseDocument, CaseFollowUp, CaseMeasure, CaseTask, DocumentKind, FollowUpInput, MeasureInput, MeasureStatus, ProtocolApplication, ProtocolTemplate,
  ProtocolVersion, TaskInput, Uuid
} from '@/types/api';
import { api } from './api';

/** Documentos, protocolos, medidas, seguimientos, tareas y notificaciones: docs/api/backend-contracts.md ("Operación de expediente"). */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export const listDocuments = async (caseId: Uuid): Promise<CaseDocument[]> => (await api.get<CaseDocument[]>(`/cases/${caseId}/documents`)).data;

/** Codifica un archivo en base64 por tramos (evita desbordar la pila con archivos grandes). */
export async function fileToBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

export async function uploadDocument(caseId: Uuid, input: { kind: DocumentKind; file: File }): Promise<CaseDocument> {
  const base64Content = await fileToBase64(input.file);
  const { data } = await api.post<CaseDocument>(`/cases/${caseId}/documents`, { kind: input.kind, originalFilename: input.file.name, contentType: input.file.type, base64Content });
  return data;
}

/** Descarga autorizada como binario; nunca se construye una ruta de almacenamiento. */
export const downloadDocument = async (caseId: Uuid, id: Uuid): Promise<Blob> =>
  (await api.get<Blob>(`/cases/${caseId}/documents/${id}/download`, { responseType: 'blob' })).data;

export const listProtocols = async (establishmentId: Uuid): Promise<ProtocolTemplate[]> => (await api.get<ProtocolTemplate[]>(`/protocols/${establishmentId}`)).data;
export const createProtocol = async (input: { establishmentId: Uuid; code: string; name: string; title: string; content: unknown }): Promise<ProtocolTemplate> =>
  (await api.post<ProtocolTemplate>('/protocols', { ...input, content: JSON.stringify(input.content) })).data;
export const publishProtocolVersion = async (versionId: Uuid, establishmentId: Uuid): Promise<ProtocolVersion> => (await api.post<ProtocolVersion>(`/protocols/versions/${versionId}/publish`, { establishmentId })).data;
export const applyProtocol = async (caseId: Uuid, versionId: Uuid): Promise<ProtocolApplication> => (await api.post<ProtocolApplication>(`/cases/${caseId}/protocols/${versionId}`, {})).data;

export const listMeasures = async (caseId: Uuid): Promise<CaseMeasure[]> => (await api.get<CaseMeasure[]>(`/cases/${caseId}/measures`)).data;
export const createMeasure = async (caseId: Uuid, input: MeasureInput): Promise<CaseMeasure> => (await api.post<CaseMeasure>(`/cases/${caseId}/measures`, input)).data;
export const updateMeasure = async (caseId: Uuid, id: Uuid, input: { expectedVersion: number; status?: MeasureStatus; dueAt?: string | null }): Promise<CaseMeasure> => (await api.post<CaseMeasure>(`/cases/${caseId}/measures/${id}/update`, input)).data;

export const listFollowUps = async (caseId: Uuid): Promise<CaseFollowUp[]> => (await api.get<CaseFollowUp[]>(`/cases/${caseId}/follow-ups`)).data;
export const createFollowUp = async (caseId: Uuid, input: FollowUpInput): Promise<CaseFollowUp> => (await api.post<CaseFollowUp>(`/cases/${caseId}/follow-ups`, input)).data;

export const listTasks = async (caseId: Uuid): Promise<CaseTask[]> => (await api.get<CaseTask[]>(`/cases/${caseId}/tasks`)).data;
export const createTask = async (caseId: Uuid, input: TaskInput): Promise<CaseTask> => (await api.post<CaseTask>(`/cases/${caseId}/tasks`, input)).data;
export const completeTask = async (caseId: Uuid, id: Uuid): Promise<CaseTask> => (await api.post<CaseTask>(`/cases/${caseId}/tasks/${id}/complete`, {})).data;

export const listNotifications = async (): Promise<AppNotification[]> => (await api.get<AppNotification[]>('/notifications')).data;
export const markNotificationRead = async (id: Uuid): Promise<AppNotification> => (await api.post<AppNotification>(`/notifications/${id}/read`, {})).data;
