import type {
  Course, Guardian, GuardianDetail, ImportStudentRow, ImportStudentsResult, Page, StaffMember, Student, StudentCaseRef, StudentDetail, Uuid
} from '@/types/api';
import { api } from './api';

/** Cursos, estudiantes, apoderados y funcionarios: docs/api/community-contract.md. */

export interface PeopleQuery { establishmentId: Uuid; search?: string; active?: boolean; page?: number; limit?: number }
export interface StudentQuery extends PeopleQuery { courseId?: Uuid }
export interface GuardianQuery extends PeopleQuery { studentId?: Uuid }
const params = (query: object) => ({ ...query, search: (query as PeopleQuery).search || undefined });

// ── Cursos ──
export interface CourseQuery { establishmentId: Uuid; academicYear?: number; active?: boolean }
export const listCourses = async (query: CourseQuery): Promise<Course[]> => (await api.get<Course[]>('/courses', { params: query })).data;
export const createCourse = async (input: { establishmentId: Uuid; name: string; level?: string; academicYear: number }): Promise<Course> => (await api.post<Course>('/courses', input)).data;
export const updateCourse = async (id: Uuid, input: { expectedVersion: number; name?: string; level?: string | null; isActive?: boolean }): Promise<Course> => (await api.patch<Course>(`/courses/${id}`, input)).data;

// ── Estudiantes ──
export const listStudents = async (query: StudentQuery): Promise<Page<Student>> => (await api.get<Page<Student>>('/students', { params: params({ page: 1, limit: 25, ...query }) })).data;
export const getStudent = async (id: Uuid): Promise<StudentDetail> => (await api.get<StudentDetail>(`/students/${id}`)).data;
export interface StudentInput { rut: string; firstNames: string; lastNames: string; birthDate?: string; courseId?: Uuid }
export const createStudent = async (input: StudentInput & { establishmentId: Uuid }): Promise<Student> => (await api.post<Student>('/students', input)).data;
export const updateStudent = async (id: Uuid, input: { expectedVersion: number; rut?: string; firstNames?: string; lastNames?: string; birthDate?: string | null; courseId?: Uuid | null; isActive?: boolean }): Promise<Student> => (await api.patch<Student>(`/students/${id}`, input)).data;
export const listStudentCases = async (id: Uuid): Promise<StudentCaseRef[]> => (await api.get<StudentCaseRef[]>(`/students/${id}/cases`)).data;
export const linkStudentGuardian = async (studentId: Uuid, input: { guardianId: Uuid; relationship: string; isPrimary: boolean }): Promise<unknown> => (await api.post(`/students/${studentId}/guardians`, input)).data;
export const unlinkStudentGuardian = async (studentId: Uuid, guardianId: Uuid): Promise<void> => { await api.post(`/students/${studentId}/guardians/${guardianId}/unlink`, {}); };
export const importStudents = async (input: { establishmentId: Uuid; academicYear: number; rows: ImportStudentRow[] }): Promise<ImportStudentsResult> => (await api.post<ImportStudentsResult>('/students/import', input)).data;

// ── Apoderados ──
export const listGuardians = async (query: GuardianQuery): Promise<Page<Guardian>> => (await api.get<Page<Guardian>>('/guardians', { params: params({ page: 1, limit: 25, ...query }) })).data;
export const getGuardian = async (id: Uuid): Promise<GuardianDetail> => (await api.get<GuardianDetail>(`/guardians/${id}`)).data;
export interface GuardianInput { rut?: string; firstNames: string; lastNames: string; email?: string; phone?: string }
export const createGuardian = async (input: GuardianInput & { establishmentId: Uuid }): Promise<Guardian> => (await api.post<Guardian>('/guardians', input)).data;
export const updateGuardian = async (id: Uuid, input: { expectedVersion: number; rut?: string | null; firstNames?: string; lastNames?: string; email?: string | null; phone?: string | null; isActive?: boolean }): Promise<Guardian> => (await api.patch<Guardian>(`/guardians/${id}`, input)).data;

// ── Funcionarios ──
export const listStaff = async (query: PeopleQuery): Promise<Page<StaffMember>> => (await api.get<Page<StaffMember>>('/staff', { params: params({ page: 1, limit: 25, ...query }) })).data;
export interface StaffInput extends GuardianInput { position: string; userId?: Uuid }
export const createStaff = async (input: StaffInput & { establishmentId: Uuid }): Promise<StaffMember> => (await api.post<StaffMember>('/staff', input)).data;
export const updateStaff = async (id: Uuid, input: { expectedVersion: number; rut?: string | null; firstNames?: string; lastNames?: string; position?: string; email?: string | null; phone?: string | null; userId?: Uuid | null; isActive?: boolean }): Promise<StaffMember> => (await api.patch<StaffMember>(`/staff/${id}`, input)).data;
