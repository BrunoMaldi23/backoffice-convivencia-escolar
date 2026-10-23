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
    const byCode = new Map<string, string>();
    for (const code of permissions) {
      const permission = await tx.permission.upsert({ where: { code }, update: {}, create: { code, description: code } });
      byCode.set(code, permission.id);
    }
    for (const [name, codes] of Object.entries(matrix)) {
      const role = await tx.role.upsert({ where: { name }, update: {}, create: { name, description: name } });
      for (const code of codes) await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: byCode.get(code)! } }, update: {}, create: { roleId: role.id, permissionId: byCode.get(code)! } });
    }
    await tx.systemControl.upsert({ where: { key: 'rbac_seed_v2' }, update: { value: 'superseded-by-v3' }, create: { key: 'rbac_seed_v2', value: 'superseded-by-v3' } });
    await tx.systemControl.upsert({ where: { key: 'rbac_seed_v3' }, update: { value: 'superseded-by-v4' }, create: { key: 'rbac_seed_v3', value: 'superseded-by-v4' } });
    await tx.systemControl.upsert({ where: { key: 'rbac_seed_v4' }, update: { value: 'applied' }, create: { key: 'rbac_seed_v4', value: 'applied' } });
  });
  process.stdout.write('Roles y permisos inicializados o ya existentes.\n');
}
main().catch(() => { process.stderr.write('No se pudo inicializar RBAC.\n'); process.exitCode = 1; }).finally(async () => db.$disconnect());
