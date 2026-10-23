import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import * as cookieParser from 'cookie-parser';
import { createHash, randomBytes } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: typeof import('supertest') = require('supertest');
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../database/database.service';
import { UsersService } from './users.service';

describe('Fase 1A HTTP con PostgreSQL y Mailpit', () => {
  let app: INestApplication | undefined;
  let db: DatabaseService | undefined;
  const ids: string[] = [];
  const adminEmail = `admin-fixture-${randomBytes(8).toString('hex')}@test.local`;
  const employeeEmail = `empleado-${randomBytes(8).toString('hex')}@test.local`;
  const adminPassword = randomBytes(24).toString('base64url');
  let adminId: string;
  let agent: ReturnType<typeof request.agent>;
  let csrf: string;
  let employeePassword: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== '/convivencia_test') throw new Error('Las pruebas requieren exclusivamente convivencia_test.');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix('api'); app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init(); db = app.get(DatabaseService);
    const role = await db!.role.findUniqueOrThrow({ where: { name: 'SYSTEM_ADMIN' } });
    const admin = await db!.user.create({ data: { email: adminEmail, displayName: 'Administrador de prueba', passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }), roles: { create: { roleId: role.id } } } });
    adminId = admin.id; ids.push(adminId);
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: adminEmail, password: adminPassword }).expect(201);
    csrf = (await agent.get('/api/auth/csrf').expect(200)).body.token as string;
  });
  afterAll(async () => {
    if (db && ids.length) {
      await db.securityAudit.deleteMany({ where: { OR: [{ actorUserId: { in: ids } }, { targetId: { in: ids } }] } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    if (app) await app.close();
  });
  const server = () => app!.getHttpServer();
  async function mailCode(recipient: string) {
    const response = await fetch('http://mailpit:8025/api/v1/messages');
    expect(response.ok).toBe(true);
    const data = await response.json() as { messages: { ID: string; To: { Address: string }[] }[] };
    const message = data.messages.find((item) => item.To.some((to) => to.Address === recipient));
    expect(message).toBeDefined();
    const textResponse = await fetch(`http://mailpit:8025/view/${message!.ID}.txt`);
    const body = await textResponse.text();
    const match = body.match(/[\r\n]+([A-Za-z0-9_-]{43})[\r\n]+/);
    expect(match).not.toBeNull();
    return match![1];
  }

  it('protege rutas con 401, 403, CSRF y valida DTO', async () => {
    await request(server()).get('/api/users').expect(401);
    await agent.post('/api/users').send({ email: employeeEmail, displayName: 'Persona', roles: ['DOCENTE'] }).expect(403);
    await agent.post('/api/users').set('X-CSRF-Token', 'incorrecto').send({ email: employeeEmail, displayName: 'Persona', roles: ['DOCENTE'] }).expect(403);
    await agent.post('/api/users').set('X-CSRF-Token', csrf).send({ email: 'inválido', displayName: 'P', roles: ['DOCENTE'] }).expect(400);
  });
  it('lista roles y permisos sin secretos', async () => {
    const roles = await agent.get('/api/roles').expect(200);
    expect(roles.body.some((r: { name: string }) => r.name === 'SYSTEM_ADMIN')).toBe(true);
    const perms = await agent.get('/api/permissions').expect(200);
    expect(perms.body.some((p: { code: string }) => p.code === 'users.read')).toBe(true);
  });
  it('invita, activa y administra usuario con RBAC', async () => {
    const created = await agent.post('/api/users').set('X-CSRF-Token', csrf).send({ email: employeeEmail.toUpperCase(), displayName: 'Empleado de prueba', roles: ['DOCENTE'] }).expect(201);
    const id = created.body.id as string; ids.push(id);
    expect(created.body.isActive).toBe(false);
    expect(JSON.stringify(created.body)).not.toMatch(/passwordHash|tokenHash/);
    await agent.post('/api/users').set('X-CSRF-Token', csrf).send({ email: employeeEmail, displayName: 'Duplicado', roles: ['DOCENTE'] }).expect(409);
    const code = await mailCode(employeeEmail);
    employeePassword = randomBytes(24).toString('base64url');
    await request(server()).post('/api/auth/accept-invitation').send({ token: code, password: employeePassword }).expect(201);
    await request(server()).post('/api/auth/accept-invitation').send({ token: code, password: randomBytes(24).toString('base64url') }).expect(400);
    expect((await db!.user.findUniqueOrThrow({ where: { id } })).isActive).toBe(true);
    const employee = request.agent(server());
    await employee.post('/api/auth/login').send({ email: employeeEmail, password: employeePassword }).expect(201);
    await employee.get('/api/users').expect(403);
    await employee.get('/api/audit').expect(403);
    expect(await db!.securityAudit.count({ where: { actorUserId: id, action: 'ADMIN_ACCESS_DENIED' } })).toBeGreaterThan(0);
    const listed = await agent.get('/api/users').query({ search: employeeEmail, active: 'true' }).expect(200);
    expect(listed.body.items).toHaveLength(1);
    await agent.patch(`/api/users/${id}`).set('X-CSRF-Token', csrf).send({ displayName: 'Nombre actualizado' }).expect(200);
    await agent.patch(`/api/users/${id}/roles`).set('X-CSRF-Token', csrf).send({ roles: ['AUDITOR'] }).expect(200);
    await agent.post(`/api/users/${id}/revoke-sessions`).set('X-CSRF-Token', csrf).expect(201);
    await agent.patch(`/api/users/${id}/status`).set('X-CSRF-Token', csrf).send({ isActive: false }).expect(200);
    const audits = await agent.get('/api/audit').query({ action: 'USER_DISABLED' }).expect(200);
    expect(audits.body.items.some((a: { targetId: string }) => a.targetId === id)).toBe(true);
  });
  it('impide retirar al último administrador en la base aislada', async () => {
    await agent.patch(`/api/users/${adminId}/status`).set('X-CSRF-Token', csrf).send({ isActive: false }).expect(409);
    await agent.patch(`/api/users/${adminId}/roles`).set('X-CSRF-Token', csrf).send({ roles: ['DOCENTE'] }).expect(409);
  });
  it('rechaza invitación vencida y evita activación manual de cuenta pendiente', async () => {
    const email = `pendiente-${randomBytes(8).toString('hex')}@test.local`;
    const created = await agent.post('/api/users').set('X-CSRF-Token', csrf).send({ email, displayName: 'Pendiente de prueba', roles: ['DOCENTE'] }).expect(201);
    ids.push(created.body.id as string);
    await agent.patch(`/api/users/${created.body.id}/status`).set('X-CSRF-Token', csrf).send({ isActive: true }).expect(409);
    const code = await mailCode(email);
    await db!.passwordResetToken.update({ where: { tokenHash: createHash('sha256').update(code).digest('hex') }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await request(server()).post('/api/auth/accept-invitation').send({ token: code, password: randomBytes(24).toString('base64url') }).expect(400);
    expect((await db!.user.findUniqueOrThrow({ where: { id: created.body.id as string } })).isActive).toBe(false);
  });
  it('recupera contraseña con correo real y token de un solo uso', async () => {
    const unknown = await request(server()).post('/api/auth/forgot-password').send({ email: 'ausente@test.local' }).expect(201);
    const known = await request(server()).post('/api/auth/forgot-password').send({ email: adminEmail }).expect(201);
    expect(known.body).toEqual(unknown.body);
    const code = await mailCode(adminEmail);
    await request(server()).post('/api/auth/reset-password').send({ token: code, password: randomBytes(24).toString('base64url') }).expect(201);
    await request(server()).post('/api/auth/reset-password').send({ token: code, password: randomBytes(24).toString('base64url') }).expect(400);
    await agent.get('/api/auth/me').expect(401);
  });
  it('rechaza recuperación vencida y cambios concurrentes sin perder al último administrador', async () => {
    await request(server()).post('/api/auth/forgot-password').send({ email: employeeEmail }).expect(201);
    const code = await mailCode(employeeEmail);
    await db!.passwordResetToken.update({ where: { tokenHash: createHash('sha256').update(code).digest('hex') }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await request(server()).post('/api/auth/reset-password').send({ token: code, password: randomBytes(24).toString('base64url') }).expect(400);
    const role = await db!.role.findUniqueOrThrow({ where: { name: 'SYSTEM_ADMIN' } });
    const second = await db!.user.create({ data: { email: `admin2-${randomBytes(8).toString('hex')}@test.local`, displayName: 'Segundo administrador', passwordHash: await argon2.hash(randomBytes(24), { type: argon2.argon2id }), roles: { create: { roleId: role.id } } } });
    ids.push(second.id);
    const service = app!.get(UsersService);
    const outcomes = await Promise.allSettled([service.status(adminId, false, adminId), service.status(second.id, false, second.id)]);
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
    expect(await db!.user.count({ where: { isActive: true, roles: { some: { role: { name: 'SYSTEM_ADMIN' } } } } })).toBeGreaterThanOrEqual(1);
  });
  it('limita intentos de ingreso', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const response = await request(server()).post('/api/auth/login').send({ email: 'ausente@test.local', password: 'incorrecta123' });
      statuses.push(response.status);
    }
    expect(statuses).toContain(429);
  });
});
