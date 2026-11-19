import type {
  CaseEvent, CaseListFilters, CaseParticipantLink, CaseRecord, CaseReport, CreateCaseInput, Interview, InterviewInput, Page, Participant, ParticipantKind, ReportInput,
  TimelineMode, TransitionInput, UpdateCaseInput, UpdateReportInput, Uuid
} from '@/types/api';
import { pick } from '@/lib/body';
import { api, type ReadRequestOptions } from './api';

/** Expedientes y su contenido básico: docs/api/backend-contracts.md ("Instituciones y expedientes", "Denuncias, involucrados y entrevistas"). */

export const listCases = async (filters: CaseListFilters = {}, options?: ReadRequestOptions): Promise<Page<CaseRecord>> =>
  (await api.get<Page<CaseRecord>>('/cases', { ...options, params: { ...filters, page: filters.page ?? 1, limit: filters.limit ?? 20 } })).data;
export const getCase = async (id: Uuid, options?: ReadRequestOptions): Promise<CaseRecord> => (await api.get<CaseRecord>(`/cases/${id}`, options)).data;
export const createCase = async (input: CreateCaseInput): Promise<CaseRecord> => (await api.post<CaseRecord>('/cases', input)).data;
export const updateCase = async (id: Uuid, input: UpdateCaseInput): Promise<CaseRecord> => (await api.patch<CaseRecord>(`/cases/${id}`, input)).data;
export const assignCase = async (id: Uuid, input: { responsibleUserId: Uuid; expectedVersion: number; reason?: string }): Promise<CaseRecord> => (await api.post<CaseRecord>(`/cases/${id}/assign`, input)).data;
export const transitionCase = async (id: Uuid, input: TransitionInput): Promise<CaseRecord> => (await api.post<CaseRecord>(`/cases/${id}/transition`, input)).data;
export const archiveCase = async (id: Uuid, input: { expectedVersion: number; reason: string }): Promise<CaseRecord> => (await api.post<CaseRecord>(`/cases/${id}/archive`, input)).data;
export const getTimeline = async (id: Uuid, page = 1, limit = 50, mode: TimelineMode = 'relevant'): Promise<Page<CaseEvent>> => (await api.get<Page<CaseEvent>>(`/cases/${id}/timeline`, { params: { page, limit, mode } })).data;

export const listReports = async (caseId: Uuid, options?: ReadRequestOptions): Promise<CaseReport[]> => (await api.get<CaseReport[]>(`/cases/${caseId}/reports`, options)).data;
export const createReport = async (caseId: Uuid, input: ReportInput): Promise<CaseReport> => (await api.post<CaseReport>(`/cases/${caseId}/reports`, input)).data;
export const updateReport = async (caseId: Uuid, id: Uuid, input: UpdateReportInput): Promise<CaseReport> => (await api.patch<CaseReport>(`/cases/${caseId}/reports/${id}`, input)).data;
export const voidReport = async (caseId: Uuid, id: Uuid, input: { expectedVersion: number; reason: string }): Promise<CaseReport> => (await api.post<CaseReport>(`/cases/${caseId}/reports/${id}/void`, pick(input, ['expectedVersion', 'reason'] as const))).data;

export const listCaseParticipants = async (caseId: Uuid, options?: ReadRequestOptions): Promise<CaseParticipantLink[]> => (await api.get<CaseParticipantLink[]>(`/cases/${caseId}/participants`, options)).data;
export const createParticipant = async (input: { establishmentId: Uuid; kind: ParticipantKind; referenceLabel?: string; studentId?: Uuid; guardianId?: Uuid; staffMemberId?: Uuid }): Promise<Participant> => (await api.post<Participant>('/participants', input)).data;
export const linkParticipant = async (caseId: Uuid, input: { participantId: Uuid; participationCode: string }): Promise<CaseParticipantLink> => (await api.post<CaseParticipantLink>(`/cases/${caseId}/participants`, input)).data;
export const updateParticipantLink = async (caseId: Uuid, linkId: Uuid, input: { expectedVersion: number; participationCode: string }): Promise<CaseParticipantLink> => (await api.patch<CaseParticipantLink>(`/cases/${caseId}/participants/${linkId}`, pick(input, ['expectedVersion', 'participationCode'] as const))).data;
export const unlinkParticipant = async (caseId: Uuid, linkId: Uuid): Promise<CaseParticipantLink> => (await api.post<CaseParticipantLink>(`/cases/${caseId}/participants/${linkId}/unlink`, {})).data;

export const listInterviews = async (caseId: Uuid, options?: ReadRequestOptions): Promise<Interview[]> => (await api.get<Interview[]>(`/cases/${caseId}/interviews`, options)).data;
export const createInterview = async (caseId: Uuid, input: InterviewInput): Promise<Interview> => (await api.post<Interview>(`/cases/${caseId}/interviews`, input)).data;
export const updateInterview = async (caseId: Uuid, id: Uuid, input: InterviewInput & { expectedVersion: number }): Promise<Interview> => (await api.patch<Interview>(`/cases/${caseId}/interviews/${id}`, input)).data;
/** El id identifica el recurso en la URL; nunca se replica en el cuerpo porque el DTO del servidor lo rechaza. */
export const finalizeInterview = async (caseId: Uuid, id: Uuid, input: number | { id?: Uuid; expectedVersion: number; intervieweeSignature: string; interviewerSignature: string }): Promise<Interview> => {
  const body = typeof input === 'number' ? { expectedVersion: input } : pick(input, ['expectedVersion', 'intervieweeSignature', 'interviewerSignature'] as const);
  return (await api.post<Interview>(`/cases/${caseId}/interviews/${id}/finalize`, body)).data;
};
export const correctInterview = async (caseId: Uuid, id: Uuid, reason: string): Promise<Interview> => (await api.post<Interview>(`/cases/${caseId}/interviews/${id}/correct`, { reason })).data;
export const deleteInterviewDraft = async (caseId: Uuid, id: Uuid, expectedVersion: number): Promise<{ id: Uuid }> => (await api.delete<{ id: Uuid }>(`/cases/${caseId}/interviews/${id}`, { data: { expectedVersion } })).data;
export const voidInterview = async (caseId: Uuid, id: Uuid, input: { expectedVersion: number; reason: string }): Promise<Interview> => (await api.post<Interview>(`/cases/${caseId}/interviews/${id}/void`, pick(input, ['expectedVersion', 'reason'] as const))).data;

/** Eliminación definitiva de una denuncia aún vigente: sale del expediente y de su línea de tiempo; solo queda la auditoría de seguridad. */
export const deleteReport = async (caseId: Uuid, id: Uuid, expectedVersion: number): Promise<{ id: Uuid }> => (await api.delete<{ id: Uuid }>(`/cases/${caseId}/reports/${id}`, { data: { expectedVersion } })).data;
