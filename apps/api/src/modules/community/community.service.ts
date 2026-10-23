import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeRut, rutSearchTerm } from '../../common/rut';
import { AuditRequestContext, SecurityAuditService } from '../../common/security/security-audit.service';
import { DatabaseService } from '../../database/database.service';
import { InstitutionsService } from '../institutions/institutions.service';

type Tx = Prisma.TransactionClient;
type Paging = { skip: number; take: number; page: number; limit: number };
export interface ImportStudentRow { rut: string; firstNames: string; lastNames: string; birthDate?: string; courseName?: string }

const guardianSummary = { id: true, firstNames: true, lastNames: true, phone: true, email: true, isActive: true } as const;
const courseSummary = { id: true, name: true, academicYear: true } as const;

/**
 * Comunidad educativa del establecimiento: cursos, estudiantes, apoderados y funcionarios.
 * Todo acceso exige membresía activa en el establecimiento. Los datos personales nunca se escriben en la auditoría.
 */
@Injectable()
export class CommunityService {
  constructor(private readonly db: DatabaseService, private readonly institutions: InstitutionsService, private readonly audit: SecurityAuditService) {}

  // ---- Cursos ----
  async listCourses(actor: string, query: { establishmentId: string; academicYear?: number; active?: boolean }) {
    await this.institutions.requireActiveMembership(actor, query.establishmentId);
    return this.db.course.findMany({
      where: { establishmentId: query.establishmentId, ...(query.academicYear ? { academicYear: query.academicYear } : {}), ...(query.active === undefined ? {} : { isActive: query.active }) },
      include: { _count: { select: { students: { where: { isActive: true } } } } },
      orderBy: [{ academicYear: 'desc' }, { name: 'asc' }]
    });
  }
  async createCourse(actor: string, data: { establishmentId: string; name: string; level?: string; academicYear: number }, ctx: AuditRequestContext) {
    return this.write(() => this.db.$transaction(async (tx) => {
      await this.institutions.requireActiveMembership(actor, data.establishmentId, tx);
      const course = await tx.course.create({ data: { establishmentId: data.establishmentId, name: data.name.trim(), level: data.level?.trim() || null, academicYear: data.academicYear } });
      await this.record(tx, actor, 'COURSE_CREATED', 'COURSE', course.id, { establishmentId: data.establishmentId }, ctx);
      return course;
    }), 'Ya existe un curso con ese nombre en el año indicado');
  }
  async updateCourse(actor: string, id: string, data: { expectedVersion: number; name?: string; level?: string | null; isActive?: boolean }, ctx: AuditRequestContext) {
    return this.write(() => this.db.$transaction(async (tx) => {
      const current = await tx.course.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Curso no disponible');
      await this.institutions.requireActiveMembership(actor, current.establishmentId, tx);
      const result = await tx.course.updateMany({ where: { id, version: data.expectedVersion }, data: { ...(data.name === undefined ? {} : { name: data.name.trim() }), ...(data.level === undefined ? {} : { level: data.level?.trim() || null }), ...(data.isActive === undefined ? {} : { isActive: data.isActive }), version: { increment: 1 } } });
      if (result.count !== 1) throw new ConflictException('El curso fue modificado por otra persona');
      await this.record(tx, actor, 'COURSE_UPDATED', 'COURSE', id, { establishmentId: current.establishmentId }, ctx);
      return tx.course.findUniqueOrThrow({ where: { id } });
    }), 'Ya existe un curso con ese nombre en el año indicado');
  }

  // ---- Estudiantes ----
  async listStudents(actor: string, query: { establishmentId: string; search?: string; courseId?: string; active?: boolean }, paging: Paging) {
    await this.institutions.requireActiveMembership(actor, query.establishmentId);
    const where: Prisma.StudentWhereInput = { establishmentId: query.establishmentId, ...(query.courseId ? { courseId: query.courseId } : {}), ...(query.active === undefined ? {} : { isActive: query.active }), ...this.studentSearch(query.search) };
    const [items, total] = await this.db.$transaction([
      this.db.student.findMany({ where, include: { course: { select: courseSummary } }, orderBy: [{ lastNames: 'asc' }, { firstNames: 'asc' }], skip: paging.skip, take: paging.take }),
      this.db.student.count({ where })
    ]);
    return { items, total, page: paging.page, limit: paging.limit };
  }
  async getStudent(actor: string, id: string) {
    const student = await this.db.student.findUnique({ where: { id }, include: { course: { select: courseSummary }, guardianLinks: { include: { guardian: { select: guardianSummary } }, orderBy: { createdAt: 'asc' } } } });
    if (!student) throw new NotFoundException('Estudiante no disponible');
    await this.institutions.requireActiveMembership(actor, student.establishmentId);
    return student;
  }
  async createStudent(actor: string, data: { establishmentId: string; rut: string; firstNames: string; lastNames: string; birthDate?: string; courseId?: string }, ctx: AuditRequestContext) {
    const rut = this.requireRut(data.rut);
    return this.write(() => this.db.$transaction(async (tx) => {
      await this.institutions.requireActiveMembership(actor, data.establishmentId, tx);
      if (data.courseId) await this.requireCourse(tx, data.establishmentId, data.courseId);
      const student = await tx.student.create({ data: { establishmentId: data.establishmentId, rut, firstNames: data.firstNames.trim(), lastNames: data.lastNames.trim(), birthDate: this.date(data.birthDate), courseId: data.courseId ?? null }, include: { course: { select: courseSummary } } });
      await this.record(tx, actor, 'STUDENT_CREATED', 'STUDENT', student.id, { establishmentId: data.establishmentId }, ctx);
      return student;
    }), 'Ya existe un estudiante con ese RUT en el establecimiento');
  }
  async updateStudent(actor: string, id: string, data: { expectedVersion: number; rut?: string; firstNames?: string; lastNames?: string; birthDate?: string | null; courseId?: string | null; isActive?: boolean }, ctx: AuditRequestContext) {
    const rut = data.rut === undefined ? undefined : this.requireRut(data.rut);
    return this.write(() => this.db.$transaction(async (tx) => {
      const current = await tx.student.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Estudiante no disponible');
      await this.institutions.requireActiveMembership(actor, current.establishmentId, tx);
      if (data.courseId) await this.requireCourse(tx, current.establishmentId, data.courseId);
      const result = await tx.student.updateMany({ where: { id, version: data.expectedVersion }, data: { ...(rut === undefined ? {} : { rut }), ...(data.firstNames === undefined ? {} : { firstNames: data.firstNames.trim() }), ...(data.lastNames === undefined ? {} : { lastNames: data.lastNames.trim() }), ...(data.birthDate === undefined ? {} : { birthDate: data.birthDate === null ? null : this.date(data.birthDate) }), ...(data.courseId === undefined ? {} : { courseId: data.courseId }), ...(data.isActive === undefined ? {} : { isActive: data.isActive }), version: { increment: 1 } } });
      if (result.count !== 1) throw new ConflictException('El estudiante fue modificado por otra persona');
      await this.record(tx, actor, 'STUDENT_UPDATED', 'STUDENT', id, { establishmentId: current.establishmentId, fields: Object.keys(data).filter((key) => key !== 'expectedVersion') }, ctx);
      return tx.student.findUniqueOrThrow({ where: { id }, include: { course: { select: courseSummary } } });
    }), 'Ya existe un estudiante con ese RUT en el establecimiento');
  }
  async linkGuardian(actor: string, studentId: string, data: { guardianId: string; relationship: string; isPrimary: boolean }, ctx: AuditRequestContext) {
    return this.db.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      if (!student) throw new NotFoundException('Estudiante no disponible');
      await this.institutions.requireActiveMembership(actor, student.establishmentId, tx);
      const guardian = await tx.guardian.findFirst({ where: { id: data.guardianId, establishmentId: student.establishmentId } });
      if (!guardian) throw new NotFoundException('Apoderado no disponible');
      if (data.isPrimary) await tx.studentGuardian.updateMany({ where: { studentId, guardianId: { not: data.guardianId } }, data: { isPrimary: false } });
      const link = await tx.studentGuardian.upsert({ where: { studentId_guardianId: { studentId, guardianId: data.guardianId } }, update: { relationship: data.relationship.trim().toUpperCase(), isPrimary: data.isPrimary }, create: { studentId, guardianId: data.guardianId, relationship: data.relationship.trim().toUpperCase(), isPrimary: data.isPrimary } });
      await this.record(tx, actor, 'STUDENT_GUARDIAN_LINKED', 'STUDENT', studentId, { guardianId: data.guardianId }, ctx);
      return link;
    });
  }
  async unlinkGuardian(actor: string, studentId: string, guardianId: string, ctx: AuditRequestContext) {
    return this.db.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      if (!student) throw new NotFoundException('Estudiante no disponible');
      await this.institutions.requireActiveMembership(actor, student.establishmentId, tx);
      const link = await tx.studentGuardian.findUnique({ where: { studentId_guardianId: { studentId, guardianId } } });
      if (!link) throw new NotFoundException('La relación no existe');
      await tx.studentGuardian.delete({ where: { studentId_guardianId: { studentId, guardianId } } });
      await this.record(tx, actor, 'STUDENT_GUARDIAN_UNLINKED', 'STUDENT', studentId, { guardianId }, ctx);
      return { success: true };
    });
  }
  /** Expedientes en los que el estudiante figura como involucrado, limitados a los que la persona puede ver. */
  async studentCases(actor: string, studentId: string) {
    const student = await this.db.student.findUnique({ where: { id: studentId }, select: { establishmentId: true } });
    if (!student) throw new NotFoundException('Estudiante no disponible');
    await this.institutions.requireActiveMembership(actor, student.establishmentId);
    const links = await this.db.caseParticipant.findMany({ where: { unlinkedAt: null, participant: { studentId }, case: this.institutions.caseAccessWhere(actor) }, select: { participationCode: true, case: { select: { id: true, folio: true, title: true, status: true, priority: true, receivedAt: true } } }, orderBy: { linkedAt: 'desc' } });
    return links.map((link) => ({ participationCode: link.participationCode, ...link.case }));
  }
  /** Carga masiva: todo o nada. Crea los estudiantes nuevos y actualiza nombres y curso de los existentes (por RUT). */
  async importStudents(actor: string, data: { establishmentId: string; academicYear: number; rows: ImportStudentRow[] }, ctx: AuditRequestContext) {
    const errors: { row: number; message: string }[] = [];
    const seen = new Set<string>();
    const parsed = data.rows.map((row, index) => {
      const line = index + 1;
      const rut = normalizeRut(row.rut ?? '');
      if (!rut) errors.push({ row: line, message: 'RUT no válido' });
      else if (seen.has(rut)) errors.push({ row: line, message: 'RUT repetido en el archivo' });
      else seen.add(rut);
      const firstNames = (row.firstNames ?? '').trim();
      const lastNames = (row.lastNames ?? '').trim();
      if (!firstNames || !lastNames) errors.push({ row: line, message: 'Faltan nombres o apellidos' });
      const birthDate = row.birthDate?.trim() ? this.date(row.birthDate.trim()) : undefined;
      if (row.birthDate?.trim() && !birthDate) errors.push({ row: line, message: 'Fecha de nacimiento no válida (use AAAA-MM-DD)' });
      return { rut, firstNames, lastNames, birthDate, courseName: row.courseName?.trim() || undefined };
    });
    if (errors.length) throw new BadRequestException({ statusCode: 400, message: 'El archivo tiene filas con errores; no se importó nada', error: 'Bad Request', errors: errors.slice(0, 50) });
    return this.write(() => this.db.$transaction(async (tx) => {
      await this.institutions.requireActiveMembership(actor, data.establishmentId, tx);
      const courses = new Map((await tx.course.findMany({ where: { establishmentId: data.establishmentId, academicYear: data.academicYear } })).map((course) => [course.name.toLowerCase(), course.id]));
      let createdCourses = 0; let created = 0; let updated = 0;
      for (const row of parsed) {
        let courseId: string | null = null;
        if (row.courseName) {
          const key = row.courseName.toLowerCase();
          courseId = courses.get(key) ?? null;
          if (!courseId) { courseId = (await tx.course.create({ data: { establishmentId: data.establishmentId, name: row.courseName, academicYear: data.academicYear } })).id; courses.set(key, courseId); createdCourses += 1; }
        }
        const rut = row.rut!;
        const existing = await tx.student.findUnique({ where: { establishmentId_rut: { establishmentId: data.establishmentId, rut } } });
        if (existing) { await tx.student.update({ where: { id: existing.id }, data: { firstNames: row.firstNames, lastNames: row.lastNames, ...(row.birthDate ? { birthDate: row.birthDate } : {}), ...(courseId ? { courseId } : {}), isActive: true, version: { increment: 1 } } }); updated += 1; }
        else { await tx.student.create({ data: { establishmentId: data.establishmentId, rut, firstNames: row.firstNames, lastNames: row.lastNames, birthDate: row.birthDate, courseId } }); created += 1; }
      }
      await this.record(tx, actor, 'STUDENTS_IMPORTED', 'ESTABLISHMENT', data.establishmentId, { created, updated, createdCourses }, ctx);
      return { created, updated, createdCourses };
    }, { timeout: 60_000 }), 'Hay datos duplicados en la carga');
  }

  // ---- Apoderados ----
  async listGuardians(actor: string, query: { establishmentId: string; search?: string; studentId?: string; active?: boolean }, paging: Paging) {
    await this.institutions.requireActiveMembership(actor, query.establishmentId);
    const where: Prisma.GuardianWhereInput = { establishmentId: query.establishmentId, ...(query.studentId ? { studentLinks: { some: { studentId: query.studentId } } } : {}), ...(query.active === undefined ? {} : { isActive: query.active }), ...this.personSearch(query.search) };
    const [items, total] = await this.db.$transaction([
      this.db.guardian.findMany({ where, include: { _count: { select: { studentLinks: true } } }, orderBy: [{ lastNames: 'asc' }, { firstNames: 'asc' }], skip: paging.skip, take: paging.take }),
      this.db.guardian.count({ where })
    ]);
    return { items, total, page: paging.page, limit: paging.limit };
  }
  async getGuardian(actor: string, id: string) {
    const guardian = await this.db.guardian.findUnique({ where: { id }, include: { studentLinks: { include: { student: { select: { id: true, firstNames: true, lastNames: true, isActive: true, course: { select: courseSummary } } } }, orderBy: { createdAt: 'asc' } } } });
    if (!guardian) throw new NotFoundException('Apoderado no disponible');
    await this.institutions.requireActiveMembership(actor, guardian.establishmentId);
    return guardian;
  }
  async createGuardian(actor: string, data: { establishmentId: string; rut?: string; firstNames: string; lastNames: string; email?: string; phone?: string }, ctx: AuditRequestContext) {
    const rut = data.rut?.trim() ? this.requireRut(data.rut) : null;
    return this.write(() => this.db.$transaction(async (tx) => {
      await this.institutions.requireActiveMembership(actor, data.establishmentId, tx);
      const guardian = await tx.guardian.create({ data: { establishmentId: data.establishmentId, rut, firstNames: data.firstNames.trim(), lastNames: data.lastNames.trim(), email: data.email?.trim().toLowerCase() || null, phone: data.phone?.trim() || null } });
      await this.record(tx, actor, 'GUARDIAN_CREATED', 'GUARDIAN', guardian.id, { establishmentId: data.establishmentId }, ctx);
      return guardian;
    }), 'Ya existe un apoderado con ese RUT en el establecimiento');
  }
  async updateGuardian(actor: string, id: string, data: { expectedVersion: number; rut?: string | null; firstNames?: string; lastNames?: string; email?: string | null; phone?: string | null; isActive?: boolean }, ctx: AuditRequestContext) {
    const rut = data.rut === undefined ? undefined : data.rut === null || !data.rut.trim() ? null : this.requireRut(data.rut);
    return this.write(() => this.db.$transaction(async (tx) => {
      const current = await tx.guardian.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Apoderado no disponible');
      await this.institutions.requireActiveMembership(actor, current.establishmentId, tx);
      const result = await tx.guardian.updateMany({ where: { id, version: data.expectedVersion }, data: { ...(rut === undefined ? {} : { rut }), ...(data.firstNames === undefined ? {} : { firstNames: data.firstNames.trim() }), ...(data.lastNames === undefined ? {} : { lastNames: data.lastNames.trim() }), ...(data.email === undefined ? {} : { email: data.email?.trim().toLowerCase() || null }), ...(data.phone === undefined ? {} : { phone: data.phone?.trim() || null }), ...(data.isActive === undefined ? {} : { isActive: data.isActive }), version: { increment: 1 } } });
      if (result.count !== 1) throw new ConflictException('El apoderado fue modificado por otra persona');
      await this.record(tx, actor, 'GUARDIAN_UPDATED', 'GUARDIAN', id, { establishmentId: current.establishmentId, fields: Object.keys(data).filter((key) => key !== 'expectedVersion') }, ctx);
      return tx.guardian.findUniqueOrThrow({ where: { id } });
    }), 'Ya existe un apoderado con ese RUT en el establecimiento');
  }

  // ---- Funcionarios ----
  async listStaff(actor: string, query: { establishmentId: string; search?: string; active?: boolean }, paging: Paging) {
    await this.institutions.requireActiveMembership(actor, query.establishmentId);
    const where: Prisma.StaffMemberWhereInput = { establishmentId: query.establishmentId, ...(query.active === undefined ? {} : { isActive: query.active }), ...this.personSearch(query.search) };
    const [items, total] = await this.db.$transaction([
      this.db.staffMember.findMany({ where, include: { user: { select: { id: true, displayName: true } } }, orderBy: [{ lastNames: 'asc' }, { firstNames: 'asc' }], skip: paging.skip, take: paging.take }),
      this.db.staffMember.count({ where })
    ]);
    return { items, total, page: paging.page, limit: paging.limit };
  }
  async createStaff(actor: string, data: { establishmentId: string; rut?: string; firstNames: string; lastNames: string; position: string; email?: string; phone?: string; userId?: string }, ctx: AuditRequestContext) {
    const rut = data.rut?.trim() ? this.requireRut(data.rut) : null;
    return this.write(() => this.db.$transaction(async (tx) => {
      await this.institutions.requireActiveMembership(actor, data.establishmentId, tx);
      if (data.userId) await this.institutions.requireActiveMembership(data.userId, data.establishmentId, tx);
      const member = await tx.staffMember.create({ data: { establishmentId: data.establishmentId, rut, firstNames: data.firstNames.trim(), lastNames: data.lastNames.trim(), position: data.position.trim(), email: data.email?.trim().toLowerCase() || null, phone: data.phone?.trim() || null, userId: data.userId ?? null }, include: { user: { select: { id: true, displayName: true } } } });
      await this.record(tx, actor, 'STAFF_CREATED', 'STAFF_MEMBER', member.id, { establishmentId: data.establishmentId }, ctx);
      return member;
    }), 'Ya existe un funcionario con ese RUT o esa cuenta de usuario');
  }
  async updateStaff(actor: string, id: string, data: { expectedVersion: number; rut?: string | null; firstNames?: string; lastNames?: string; position?: string; email?: string | null; phone?: string | null; userId?: string | null; isActive?: boolean }, ctx: AuditRequestContext) {
    const rut = data.rut === undefined ? undefined : data.rut === null || !data.rut.trim() ? null : this.requireRut(data.rut);
    return this.write(() => this.db.$transaction(async (tx) => {
      const current = await tx.staffMember.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Funcionario no disponible');
      await this.institutions.requireActiveMembership(actor, current.establishmentId, tx);
      if (data.userId) await this.institutions.requireActiveMembership(data.userId, current.establishmentId, tx);
      const result = await tx.staffMember.updateMany({ where: { id, version: data.expectedVersion }, data: { ...(rut === undefined ? {} : { rut }), ...(data.firstNames === undefined ? {} : { firstNames: data.firstNames.trim() }), ...(data.lastNames === undefined ? {} : { lastNames: data.lastNames.trim() }), ...(data.position === undefined ? {} : { position: data.position.trim() }), ...(data.email === undefined ? {} : { email: data.email?.trim().toLowerCase() || null }), ...(data.phone === undefined ? {} : { phone: data.phone?.trim() || null }), ...(data.userId === undefined ? {} : { userId: data.userId }), ...(data.isActive === undefined ? {} : { isActive: data.isActive }), version: { increment: 1 } } });
      if (result.count !== 1) throw new ConflictException('El funcionario fue modificado por otra persona');
      await this.record(tx, actor, 'STAFF_UPDATED', 'STAFF_MEMBER', id, { establishmentId: current.establishmentId, fields: Object.keys(data).filter((key) => key !== 'expectedVersion') }, ctx);
      return tx.staffMember.findUniqueOrThrow({ where: { id }, include: { user: { select: { id: true, displayName: true } } } });
    }), 'Ya existe un funcionario con ese RUT o esa cuenta de usuario');
  }

  // ---- Utilidades ----
  private requireRut(value: string) { const rut = normalizeRut(value); if (!rut) throw new BadRequestException('El RUT no es válido'); return rut; }
  /** Fecha de calendario (sin hora) a partir de `AAAA-MM-DD` o ISO; `undefined` si no es válida. */
  private date(value: string | undefined): Date | undefined {
    if (!value) return undefined;
    const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  private async requireCourse(tx: Tx, establishmentId: string, courseId: string) { if (!await tx.course.findFirst({ where: { id: courseId, establishmentId, isActive: true }, select: { id: true } })) throw new NotFoundException('Curso no disponible'); }
  private personSearch(search?: string) {
    const term = search?.trim();
    if (!term) return {};
    const insensitive = 'insensitive' as const;
    const rut = rutSearchTerm(term);
    return { OR: [{ firstNames: { contains: term, mode: insensitive } }, { lastNames: { contains: term, mode: insensitive } }, ...(/^[\dK-]{3,}$/.test(rut) ? [{ rut: { contains: rut, mode: insensitive } }] : [])] };
  }
  private studentSearch(search?: string) { return this.personSearch(search); }
  private async write<T>(action: () => Promise<T>, duplicateMessage: string) {
    try { return await action(); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException(duplicateMessage); throw error; }
  }
  private record(tx: Tx, actor: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown>, context: AuditRequestContext) {
    return tx.securityAudit.create({ data: this.audit.data({ actorUserId: actor, action, targetType, targetId, metadata, context }) });
  }
}
