import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import * as cases from '@/services/cases';
import * as ops from '@/services/caseOperations';
import type { DocumentKind, FollowUpInput, InterviewInput, MeasureInput, MeasureStatus, ParticipantKind, ReportInput, TaskInput, TaskStatus, UpdateReportInput } from '@/types/api';
import { caseScope, useApiMutation } from './useApiMutation';

type Id = MaybeRefOrGetter<string>;
const caseQuery = <T>(caseId: Id, name: string, fn: (id: string) => Promise<T>, enabled: MaybeRefOrGetter<boolean> = true) =>
  useQuery({ queryKey: computed(() => ['case', toValue(caseId), name]), queryFn: () => fn(toValue(caseId)), enabled });

/** Lecturas por expediente. `enabled` permite no consultar pestañas a las que el rol no tiene acceso. */
export const useReports = (caseId: Id, enabled?: MaybeRefOrGetter<boolean>) => caseQuery(caseId, 'reports', cases.listReports, enabled);
export const useCaseParticipants = (caseId: Id, enabled?: MaybeRefOrGetter<boolean>) => caseQuery(caseId, 'participants', cases.listCaseParticipants, enabled);
export const useInterviews = (caseId: Id, enabled?: MaybeRefOrGetter<boolean>) => caseQuery(caseId, 'interviews', cases.listInterviews, enabled);
export const useDocuments = (caseId: Id, enabled?: MaybeRefOrGetter<boolean>) => caseQuery(caseId, 'documents', ops.listDocuments, enabled);
export const useMeasures = (caseId: Id, enabled?: MaybeRefOrGetter<boolean>) => caseQuery(caseId, 'measures', ops.listMeasures, enabled);
export const useFollowUps = (caseId: Id, enabled?: MaybeRefOrGetter<boolean>) => caseQuery(caseId, 'follow-ups', ops.listFollowUps, enabled);
export const useTasks = (caseId: Id, enabled?: MaybeRefOrGetter<boolean>) => caseQuery(caseId, 'tasks', ops.listTasks, enabled);

/** Escrituras por expediente (todas invalidan el expediente, los listados y los agregados). */
export const useCreateReport = (caseId: string) => useApiMutation((input: ReportInput) => cases.createReport(caseId, input), () => caseScope(caseId));
export const useUpdateReport = (caseId: string) => useApiMutation((input: { id: string } & UpdateReportInput) => { const { id, ...body } = input; return cases.updateReport(caseId, id, body); }, () => caseScope(caseId));
export const useVoidReport = (caseId: string) => useApiMutation((input: { id: string; expectedVersion: number; reason: string }) => cases.voidReport(caseId, input.id, input), () => caseScope(caseId));

export const useCreateParticipant = (caseId: string) => useApiMutation(
  async (input: { establishmentId: string; kind: ParticipantKind; referenceLabel?: string; studentId?: string; guardianId?: string; staffMemberId?: string; participationCode: string }) => {
    const { participationCode, ...person } = input;
    const participant = await cases.createParticipant(person);
    return cases.linkParticipant(caseId, { participantId: participant.id, participationCode });
  }, () => caseScope(caseId));
export const useLinkParticipant = (caseId: string) => useApiMutation((input: { participantId: string; participationCode: string }) => cases.linkParticipant(caseId, input), () => caseScope(caseId));
export const useUpdateParticipantLink = (caseId: string) => useApiMutation((input: { id: string; expectedVersion: number; participationCode: string }) => cases.updateParticipantLink(caseId, input.id, input), () => caseScope(caseId));
export const useUnlinkParticipant = (caseId: string) => useApiMutation((linkId: string) => cases.unlinkParticipant(caseId, linkId), () => caseScope(caseId));

export const useCreateInterview = (caseId: string) => useApiMutation((input: InterviewInput) => cases.createInterview(caseId, input), () => caseScope(caseId));
export const useUpdateInterview = (caseId: string) => useApiMutation((input: InterviewInput & { id: string; expectedVersion: number }) => { const { id, ...body } = input; return cases.updateInterview(caseId, id, body); }, () => caseScope(caseId));
export const useFinalizeInterview = (caseId: string) => useApiMutation((input: { id: string; expectedVersion: number }) => cases.finalizeInterview(caseId, input.id, input.expectedVersion), () => caseScope(caseId));
export const useCorrectInterview = (caseId: string) => useApiMutation((input: { id: string; reason: string }) => cases.correctInterview(caseId, input.id, input.reason), () => caseScope(caseId));
export const useDeleteInterviewDraft = (caseId: string) => useApiMutation((input: { id: string; expectedVersion: number }) => cases.deleteInterviewDraft(caseId, input.id, input.expectedVersion), () => caseScope(caseId));
export const useVoidInterview = (caseId: string) => useApiMutation((input: { id: string; expectedVersion: number; reason: string }) => cases.voidInterview(caseId, input.id, input), () => caseScope(caseId));

export const useUploadDocument = (caseId: string) => useApiMutation((input: { kind: DocumentKind; file: File }) => ops.uploadDocument(caseId, input), () => caseScope(caseId));
export const useLinkVideoEvidence = (caseId: string) => useApiMutation((input: { title: string; externalUrl: string }) => ops.linkVideoEvidence(caseId, input), () => caseScope(caseId));
export const useVoidDocument = (caseId: string) => useApiMutation((input: { id: string; expectedVersion: number; reason: string }) => ops.voidDocument(caseId, input.id, input), () => caseScope(caseId));

export const useCreateMeasure = (caseId: string) => useApiMutation((input: MeasureInput) => ops.createMeasure(caseId, input), () => caseScope(caseId));
export const useUpdateMeasure = (caseId: string) => useApiMutation((input: { id: string; expectedVersion: number; title?: string; description?: string | null; status?: MeasureStatus; dueAt?: string | null; responsibleUserIds?: string[] }) => { const { id, ...body } = input; return ops.updateMeasure(caseId, id, body); }, () => caseScope(caseId));
export const useCreateFollowUp = (caseId: string) => useApiMutation((input: FollowUpInput) => ops.createFollowUp(caseId, input), () => caseScope(caseId));
export const useVoidFollowUp = (caseId: string) => useApiMutation((input: { id: string; expectedVersion: number; reason: string }) => ops.voidFollowUp(caseId, input.id, input), () => caseScope(caseId));
export const useCreateTask = (caseId: string) => useApiMutation((input: TaskInput) => ops.createTask(caseId, input), () => caseScope(caseId));
export const useCompleteTask = (caseId: string) => useApiMutation((taskId: string) => ops.completeTask(caseId, taskId), () => caseScope(caseId));
export const useUpdateTask = (caseId: string) => useApiMutation((input: { id: string; expectedVersion: number; title?: string; dueAt?: string | null; assignedToUserId?: string | null; status?: TaskStatus }) => ops.updateTask(caseId, input.id, input), () => caseScope(caseId));
export const useApplyProtocol = (caseId: string) => useApiMutation((versionId: string) => ops.applyProtocol(caseId, versionId), () => caseScope(caseId));
export const useProtocolApplications = (caseId: Id, enabled: MaybeRefOrGetter<boolean> = true) => caseQuery(caseId, 'protocol-applications', ops.listProtocolApplications, enabled);
export const useRevokeProtocolApplication = (caseId: string) => useApiMutation((input: { id: string; expectedVersion: number; reason: string }) => ops.revokeProtocolApplication(caseId, input.id, input), () => caseScope(caseId));

/** Eliminación definitiva de registros reversibles (ver `services/caseOperations.ts`): invalidan el expediente completo. */
type VersionedId = { id: string; expectedVersion: number };
export const useDeleteReport = (caseId: string) => useApiMutation((input: VersionedId) => cases.deleteReport(caseId, input.id, input.expectedVersion), () => caseScope(caseId));
export const useDeleteDocument = (caseId: string) => useApiMutation((input: VersionedId) => ops.deleteDocument(caseId, input.id, input.expectedVersion), () => caseScope(caseId));
export const useDeleteFollowUp = (caseId: string) => useApiMutation((input: VersionedId) => ops.deleteFollowUp(caseId, input.id, input.expectedVersion), () => caseScope(caseId));
export const useDeleteTask = (caseId: string) => useApiMutation((input: VersionedId) => ops.deleteTask(caseId, input.id, input.expectedVersion), () => caseScope(caseId));
export const useDeleteProtocolApplication = (caseId: string) => useApiMutation((input: VersionedId) => ops.deleteProtocolApplication(caseId, input.id, input.expectedVersion), () => caseScope(caseId));
