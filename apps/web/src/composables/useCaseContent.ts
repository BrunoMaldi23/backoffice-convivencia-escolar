import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import * as cases from '@/services/cases';
import * as ops from '@/services/caseOperations';
import type { DocumentKind, FollowUpInput, InterviewInput, MeasureInput, MeasureStatus, ParticipantKind, ReportInput, TaskInput, UpdateReportInput } from '@/types/api';
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

export const useCreateParticipant = (caseId: string) => useApiMutation(
  async (input: { establishmentId: string; kind: ParticipantKind; referenceLabel: string; participationCode: string }) => {
    const participant = await cases.createParticipant({ establishmentId: input.establishmentId, kind: input.kind, referenceLabel: input.referenceLabel });
    return cases.linkParticipant(caseId, { participantId: participant.id, participationCode: input.participationCode });
  }, () => caseScope(caseId));
export const useLinkParticipant = (caseId: string) => useApiMutation((input: { participantId: string; participationCode: string }) => cases.linkParticipant(caseId, input), () => caseScope(caseId));
export const useUnlinkParticipant = (caseId: string) => useApiMutation((linkId: string) => cases.unlinkParticipant(caseId, linkId), () => caseScope(caseId));

export const useCreateInterview = (caseId: string) => useApiMutation((input: InterviewInput) => cases.createInterview(caseId, input), () => caseScope(caseId));
export const useUpdateInterview = (caseId: string) => useApiMutation((input: InterviewInput & { id: string; expectedVersion: number }) => { const { id, ...body } = input; return cases.updateInterview(caseId, id, body); }, () => caseScope(caseId));
export const useFinalizeInterview = (caseId: string) => useApiMutation((input: { id: string; expectedVersion: number }) => cases.finalizeInterview(caseId, input.id, input.expectedVersion), () => caseScope(caseId));
export const useCorrectInterview = (caseId: string) => useApiMutation((input: { id: string; reason: string }) => cases.correctInterview(caseId, input.id, input.reason), () => caseScope(caseId));

export const useUploadDocument = (caseId: string) => useApiMutation((input: { kind: DocumentKind; file: File }) => ops.uploadDocument(caseId, input), () => caseScope(caseId));

export const useCreateMeasure = (caseId: string) => useApiMutation((input: MeasureInput) => ops.createMeasure(caseId, input), () => caseScope(caseId));
export const useUpdateMeasure = (caseId: string) => useApiMutation((input: { id: string; expectedVersion: number; status?: MeasureStatus; dueAt?: string | null }) => { const { id, ...body } = input; return ops.updateMeasure(caseId, id, body); }, () => caseScope(caseId));
export const useCreateFollowUp = (caseId: string) => useApiMutation((input: FollowUpInput) => ops.createFollowUp(caseId, input), () => caseScope(caseId));
export const useCreateTask = (caseId: string) => useApiMutation((input: TaskInput) => ops.createTask(caseId, input), () => caseScope(caseId));
export const useCompleteTask = (caseId: string) => useApiMutation((taskId: string) => ops.completeTask(caseId, taskId), () => caseScope(caseId));
export const useApplyProtocol = (caseId: string) => useApiMutation((versionId: string) => ops.applyProtocol(caseId, versionId), () => caseScope(caseId));
