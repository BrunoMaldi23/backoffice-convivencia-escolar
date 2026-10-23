import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import * as community from '@/services/community';
import type { ImportStudentRow } from '@/types/api';
import { useApiMutation } from './useApiMutation';

/** Cursos, estudiantes, apoderados y funcionarios. Todas las claves cuelgan de `['community', …]` para invalidarse juntas. */
type Enabled = MaybeRefOrGetter<boolean>;
/** Las vistas aún pueden no conocer el establecimiento (`null`); la consulta espera a tenerlo. */
type Loose<Q extends { establishmentId: string }> = Omit<Q, 'establishmentId'> & { establishmentId: string | null | undefined };
const ready = (query: MaybeRefOrGetter<{ establishmentId: string | null | undefined }>, enabled: Enabled) => computed(() => Boolean(toValue(query).establishmentId) && toValue(enabled));

export const useCourses = (query: MaybeRefOrGetter<Loose<community.CourseQuery>>, enabled: Enabled = true) =>
  useQuery({ queryKey: computed(() => ['community', 'courses', toValue(query)]), queryFn: () => community.listCourses(toValue(query) as community.CourseQuery), enabled: ready(query, enabled), staleTime: 60_000 });

export const useStudents = (query: MaybeRefOrGetter<Loose<community.StudentQuery>>, enabled: Enabled = true) =>
  useQuery({ queryKey: computed(() => ['community', 'students', toValue(query)]), queryFn: () => community.listStudents(toValue(query) as community.StudentQuery), enabled: ready(query, enabled), placeholderData: keepPreviousData });
export const useStudent = (id: MaybeRefOrGetter<string>) => useQuery({ queryKey: computed(() => ['community', 'student', toValue(id)]), queryFn: () => community.getStudent(toValue(id)) });
export const useStudentCases = (id: MaybeRefOrGetter<string>, enabled: Enabled = true) =>
  useQuery({ queryKey: computed(() => ['community', 'student', toValue(id), 'cases']), queryFn: () => community.listStudentCases(toValue(id)), enabled });

export const useGuardians = (query: MaybeRefOrGetter<Loose<community.GuardianQuery>>, enabled: Enabled = true) =>
  useQuery({ queryKey: computed(() => ['community', 'guardians', toValue(query)]), queryFn: () => community.listGuardians(toValue(query) as community.GuardianQuery), enabled: ready(query, enabled), placeholderData: keepPreviousData });
export const useGuardian = (id: MaybeRefOrGetter<string>) => useQuery({ queryKey: computed(() => ['community', 'guardian', toValue(id)]), queryFn: () => community.getGuardian(toValue(id)) });

export const useStaff = (query: MaybeRefOrGetter<Loose<community.PeopleQuery>>, enabled: Enabled = true) =>
  useQuery({ queryKey: computed(() => ['community', 'staff', toValue(query)]), queryFn: () => community.listStaff(toValue(query) as community.PeopleQuery), enabled: ready(query, enabled), placeholderData: keepPreviousData });

const WITH_AUDIT: string[][] = [['community'], ['audit']];

export const useCreateCourse = () => useApiMutation((input: Parameters<typeof community.createCourse>[0]) => community.createCourse(input), () => WITH_AUDIT);
export const useUpdateCourse = () => useApiMutation((input: { id: string } & Parameters<typeof community.updateCourse>[1]) => { const { id, ...body } = input; return community.updateCourse(id, body); }, () => WITH_AUDIT);

export const useCreateStudent = () => useApiMutation((input: Parameters<typeof community.createStudent>[0]) => community.createStudent(input), () => WITH_AUDIT);
export const useUpdateStudent = () => useApiMutation((input: { id: string } & Parameters<typeof community.updateStudent>[1]) => { const { id, ...body } = input; return community.updateStudent(id, body); }, () => WITH_AUDIT);
export const useImportStudents = () => useApiMutation((input: { establishmentId: string; academicYear: number; rows: ImportStudentRow[] }) => community.importStudents(input), () => WITH_AUDIT);
export const useLinkStudentGuardian = () => useApiMutation((input: { studentId: string; guardianId: string; relationship: string; isPrimary: boolean }) => { const { studentId, ...body } = input; return community.linkStudentGuardian(studentId, body); }, () => WITH_AUDIT);
export const useUnlinkStudentGuardian = () => useApiMutation((input: { studentId: string; guardianId: string }) => community.unlinkStudentGuardian(input.studentId, input.guardianId), () => WITH_AUDIT);

export const useCreateGuardian = () => useApiMutation((input: Parameters<typeof community.createGuardian>[0]) => community.createGuardian(input), () => WITH_AUDIT);
export const useUpdateGuardian = () => useApiMutation((input: { id: string } & Parameters<typeof community.updateGuardian>[1]) => { const { id, ...body } = input; return community.updateGuardian(id, body); }, () => WITH_AUDIT);

export const useCreateStaff = () => useApiMutation((input: Parameters<typeof community.createStaff>[0]) => community.createStaff(input), () => WITH_AUDIT);
export const useUpdateStaff = () => useApiMutation((input: { id: string } & Parameters<typeof community.updateStaff>[1]) => { const { id, ...body } = input; return community.updateStaff(id, body); }, () => WITH_AUDIT);
