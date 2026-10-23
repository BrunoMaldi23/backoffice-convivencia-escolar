import type {
  CaseEvent, CaseListFilters, CaseParticipantLink, CaseRecord, CaseReport, CreateCaseInput, Interview, InterviewInput, Page, Participant, ParticipantKind, ReportInput,
  TransitionInput, UpdateCaseInput, UpdateReportInput, Uuid
} from '@/types/api';
import { api } from './api';

/** Expedientes y su contenido básico: docs/api/backend-contracts.md ("Instituciones y expedientes", "Denuncias, involucrados y entrevistas"). */

export const listCases = async (filters: CaseListFilters = {}): Promise<Page<CaseRecord>> =>
  (await api.get<Page<CaseRecord>>('/cases', { params: { ...filters, page: filters.page ?? 1, limit: filters.limit ?? 20 } })).data;
export const getCase = async (id: Uuid): Promise<CaseRecord> => (await api.get<CaseRecord>(`/cases/${id}`)).data;
export const createCase = async (input: CreateCaseInput): Promise<CaseRecord> => (await api.post<CaseRecord>('/cases', input)).data;
export const updateCase = async (id: Uuid, input: UpdateCaseInput): Promise<CaseRecord> => (await api.patch<CaseRecord>(`/cases/${id}`, input)).data;
export const assignCase = async (id: Uuid, input: { responsibleUserId: Uuid; expectedVersion: number; reason?: string }): Promise<CaseRecord> => (await api.post<CaseRecord>(`/cases/${id}/assign`, input)).data;
export const transitionCase = async (id: Uuid, input: TransitionInput): Promise<CaseRecord> => (await api.post<CaseRecord>(`/cases/${id}/transition`, input)).data;
export const getTimeline = async (id: Uuid, page = 1, limit = 50): Promise<Page<CaseEvent>> => (await api.get<Page<CaseEvent>>(`/cases/${id}/timeline`, { params: { page, limit } })).data;

export const listReports = async (caseId: Uuid): Promise<CaseReport[]> => (await api.get<CaseReport[]>(`/cases/${caseId}/reports`)).data;
export const createReport = async (caseId: Uuid, input: ReportInput): Promise<CaseReport> => (await api.post<CaseReport>(`/cases/${caseId}/reports`, input)).data;
export const updateReport = async (caseId: Uuid, id: Uuid, input: UpdateReportInput): Promise<CaseReport> => (await api.patch<CaseReport>(`/cases/${caseId}/reports/${id}`, input)).data;

export const listCaseParticipants = async (caseId: Uuid): Promise<CaseParticipantLink[]> => (await api.get<CaseParticipantLink[]>(`/cases/${caseId}/participants`)).data;
export const createParticipant = async (input: { establishmentId: Uuid; kind: ParticipantKind; referenceLabel?: string; studentId?: Uuid; guardianId?: Uuid; staffMemberId?: Uuid }): Promise<Participant> => (await api.post<Participant>('/participants', input)).data;
export const linkParticipant = async (caseId: Uuid, input: { participantId: Uuid; participationCode: string }): Promise<CaseParticipantLink> => (await api.post<CaseParticipantLink>(`/cases/${caseId}/participants`, input)).data;
export const unlinkParticipant = async (caseId: Uuid, linkId: Uuid): Promise<CaseParticipantLink> => (await api.post<CaseParticipantLink>(`/cases/${caseId}/participants/${linkId}/unlink`, {})).data;

export const listInterviews = async (caseId: Uuid): Promise<Interview[]> => (await api.get<Interview[]>(`/cases/${caseId}/interviews`)).data;
export const createInterview = async (caseId: Uuid, input: InterviewInput): Promise<Interview> => (await api.post<Interview>(`/cases/${caseId}/interviews`, input)).data;
export const updateInterview = async (caseId: Uuid, id: Uuid, input: InterviewInput & { expectedVersion: number }): Promise<Interview> => (await api.patch<Interview>(`/cases/${caseId}/interviews/${id}`, input)).data;
export const finalizeInterview = async (caseId: Uuid, id: Uuid, expectedVersion: number): Promise<Interview> => (await api.post<Interview>(`/cases/${caseId}/interviews/${id}/finalize`, { expectedVersion })).data;
export const correctInterview = async (caseId: Uuid, id: Uuid, reason: string): Promise<Interview> => (await api.post<Interview>(`/cases/${caseId}/interviews/${id}/correct`, { reason })).data;
