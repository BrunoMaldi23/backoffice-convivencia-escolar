import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const permissions = ['dashboard.read', 'users.read', 'users.create', 'users.update', 'users.disable', 'roles.read', 'roles.assign', 'audit.read', 'cases.read', 'cases.create', 'cases.update', 'cases.assign', 'cases.transition', 'cases.close', 'cases.reopen', 'cases.timeline.read', 'institutions.read', 'institutions.manage', 'case-grants.manage', 'reports.read', 'reports.create', 'reports.update', 'participants.read', 'participants.manage', 'interviews.read', 'interviews.create', 'interviews.update', 'interviews.finalize', 'interviews.correct', 'documents.read', 'documents.create', 'protocols.read', 'protocols.manage', 'measures.read', 'measures.manage', 'follow-ups.read', 'follow-ups.create', 'tasks.read', 'tasks.manage', 'notifications.read', 'courses.read', 'courses.manage', 'students.read', 'students.manage', 'guardians.read', 'guardians.manage', 'staff.read', 'staff.manage', 'summons.read', 'summons.manage', 'referrals.read', 'referrals.manage'];
const matrix: Record<string, string[]> = {
  SYSTEM_ADMIN: permissions,
  DIRECTOR: ['dashboard.read', 'users.read', 'roles.read', 'audit.read', 'courses.read', 'students.read', 'guardians.read', 'staff.read'],
  CONVIVENCIA: ['dashboard.read', 'cases.read', 'cases.create', 'cases.update', 'cases.assign', 'cases.transition', 'cases.close', 'cases.reopen', 'cases.timeline.read', 'reports.read', 'reports.create', 'reports.update', 'participants.read', 'participants.manage', 'interviews.read', 'interviews.create', 'interviews.update', 'interviews.finalize', 'interviews.correct', 'documents.read', 'documents.create', 'protocols.read', 'protocols.manage', 'measures.read', 'measures.manage', 'follow-ups.read', 'follow-ups.create', 'tasks.read', 'tasks.manage', 'notifications.read', 'courses.read', 'courses.manage', 'students.read', 'students.manage', 'guardians.read', 'guardians.manage', 'staff.read', 'staff.manage', 'summons.read', 'summons.manage', 'referrals.read', 'referrals.manage'],
  PSICOLOGO: ['dashboard.read', 'cases.read', 'cases.update', 'cases.timeline.read', 'interviews.read', 'interviews.create', 'interviews.update', 'documents.read', 'documents.create', 'measures.read', 'follow-ups.read', 'follow-ups.create', 'tasks.read', 'courses.read', 'students.read', 'guardians.read', 'staff.read', 'summons.read', 'referrals.read', 'referrals.manage'],
  TRABAJADOR_SOCIAL: ['dashboard.read', 'cases.read', 'cases.update', 'cases.timeline.read', 'interviews.read', 'interviews.create', 'interviews.update', 'documents.read', 'documents.create', 'measures.read', 'follow-ups.read', 'follow-ups.create', 'tasks.read', 'courses.read', 'students.read', 'guardians.read', 'staff.read', 'summons.read', 'referrals.read', 'referrals.manage'],
  INSPECTOR_GENERAL: ['dashboard.read', 'cases.read', 'cases.create', 'cases.update', 'cases.timeline.read', 'courses.read', 'students.read', 'guardians.read', 'staff.read', 'summons.read', 'summons.manage'],
  INSPECTOR: ['dashboard.read', 'courses.read', 'students.read'], DOCENTE: ['dashboard.read', 'courses.read'], ORIENTADOR: ['dashboard.read', 'courses.read', 'students.read'],
  AUDITOR: ['dashboard.read', 'audit.read', 'cases.timeline.read']
};

async function main() {
  await db.$transaction(async (tx) => {
    await tx.permission.createMany({
      data: permissions.map((code) => ({ code, description: code })),
      skipDuplicates: true,
    });
    await tx.role.createMany({
      data: Object.keys(matrix).map((name) => ({ name, description: name })),
      skipDuplicates: true,
    });

    const [storedPermissions, storedRoles] = await Promise.all([
      tx.permission.findMany({ select: { id: true, code: true } }),
      tx.role.findMany({ select: { id: true, name: true } }),
    ]);
    const permissionByCode = new Map(storedPermissions.map((permission) => [permission.code, permission.id]));
    const roleByName = new Map(storedRoles.map((role) => [role.name, role.id]));
    const assignments = Object.entries(matrix).flatMap(([name, codes]) =>
      codes.map((code) => ({
        roleId: roleByName.get(name)!,
        permissionId: permissionByCode.get(code)!,
      })),
    );
    await tx.rolePermission.createMany({ data: assignments, skipDuplicates: true });
    await tx.systemControl.upsert({ where: { key: 'rbac_seed_v2' }, update: { value: 'superseded-by-v3' }, create: { key: 'rbac_seed_v2', value: 'superseded-by-v3' } });
    await tx.systemControl.upsert({ where: { key: 'rbac_seed_v3' }, update: { value: 'superseded-by-v4' }, create: { key: 'rbac_seed_v3', value: 'superseded-by-v4' } });
    await tx.systemControl.upsert({ where: { key: 'rbac_seed_v4' }, update: { value: 'applied' }, create: { key: 'rbac_seed_v4', value: 'applied' } });
  }, { maxWait: 10_000, timeout: 60_000 });
  process.stdout.write('Roles y permisos inicializados o ya existentes.\n');
}
main().catch((error: unknown) => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'unknown';
  process.stderr.write(`No se pudo inicializar RBAC (código: ${code}).\n`);
  process.exitCode = 1;
}).finally(async () => db.$disconnect());
