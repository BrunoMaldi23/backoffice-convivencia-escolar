import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const permissions = ['dashboard.read', 'users.read', 'users.create', 'users.update', 'users.disable', 'roles.read', 'roles.assign', 'audit.read', 'cases.read', 'cases.create', 'cases.update', 'cases.assign', 'cases.transition', 'cases.close', 'cases.reopen', 'cases.timeline.read', 'institutions.read', 'institutions.manage', 'case-grants.manage'];
const matrix: Record<string, string[]> = {
  SYSTEM_ADMIN: permissions,
  DIRECTOR: ['dashboard.read', 'users.read', 'roles.read', 'audit.read'],
  CONVIVENCIA: ['dashboard.read', 'cases.read', 'cases.create', 'cases.update', 'cases.assign', 'cases.transition', 'cases.close', 'cases.reopen', 'cases.timeline.read'],
  PSICOLOGO: ['dashboard.read', 'cases.read', 'cases.update', 'cases.timeline.read'],
  TRABAJADOR_SOCIAL: ['dashboard.read', 'cases.read', 'cases.update', 'cases.timeline.read'],
  INSPECTOR_GENERAL: ['dashboard.read', 'cases.read', 'cases.create', 'cases.update', 'cases.timeline.read'],
  INSPECTOR: ['dashboard.read'], DOCENTE: ['dashboard.read'], ORIENTADOR: ['dashboard.read'],
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
    await tx.systemControl.upsert({ where: { key: 'rbac_seed_v3' }, update: { value: 'applied' }, create: { key: 'rbac_seed_v3', value: 'applied' } });
  });
  process.stdout.write('Roles y permisos inicializados o ya existentes.\n');
}
main().catch(() => { process.stderr.write('No se pudo inicializar RBAC.\n'); process.exitCode = 1; }).finally(async () => db.$disconnect());
