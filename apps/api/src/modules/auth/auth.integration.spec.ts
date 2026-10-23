import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import * as cookieParser from 'cookie-parser';
import { randomBytes } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request: typeof import('supertest') = require('supertest');
import { DatabaseModule } from '../../database/database.module';
import { DatabaseService } from '../../database/database.service';
import { AuthModule } from './auth.module';

describe('Auth HTTP integration', () => {
  let app: INestApplication; let db: DatabaseService; let email: string; let password: string;
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== '/convivencia_test') throw new Error('Las pruebas requieren convivencia_test.');
    const module = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, AuthModule] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix('api'); app.use(cookieParser()); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })); await app.init(); db = app.get(DatabaseService);
    email = `fixture-${randomBytes(12).toString('hex')}@test.local`; password = randomBytes(24).toString('base64url');
    const role = await db.role.upsert({ where: { name: 'TEST_ROLE' }, update: {}, create: { name: 'TEST_ROLE' } });
    const user = await db.user.create({ data: { email, displayName: 'Fixture de prueba', passwordHash: await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }) } });
    await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
  });
  afterAll(async () => { if (db && email) { await db.session.deleteMany({ where: { user: { email } } }); await db.user.deleteMany({ where: { email } }); } if (app) await app.close(); });
  it('rechaza acceso y DTO inválido', async () => { await request(app.getHttpServer()).get('/api/auth/me').expect(401); await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'invalido', password: 'corta' }).expect(400); });
  it('rechaza credenciales incorrectas e inexistentes', async () => { await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: 'x'.repeat(12) }).expect(401); await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'nadie@test.local', password }).expect(401); });
  it('crea, consulta y revoca una sesión con CSRF', async () => {
    const agent = request.agent(app.getHttpServer()); const login = await agent.post('/api/auth/login').send({ email, password }).expect(201);
    const cookies = login.headers['set-cookie'] as unknown as string[]; expect(cookies.join(';')).toContain('bce_session='); expect(cookies.join(';')).toContain('HttpOnly'); expect(cookies.join(';')).toContain('SameSite=Strict');
    expect(await db.session.count({ where: { user: { email }, revokedAt: null } })).toBe(1); await agent.get('/api/auth/me').expect(200); const csrf = await agent.get('/api/auth/csrf').expect(200);
    await agent.post('/api/auth/logout').expect(403); await agent.post('/api/auth/logout').set('X-CSRF-Token', 'incorrecto').expect(403); await agent.post('/api/auth/logout').set('X-CSRF-Token', csrf.body.token).expect(201); await agent.get('/api/auth/me').expect(401);
  });
  it('rechaza cuenta desactivada y sesión vencida', async () => { await db.user.update({ where: { email }, data: { isActive: false } }); await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(401); await db.user.update({ where: { email }, data: { isActive: true } }); const result = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(201); const cookies = result.headers['set-cookie'] as unknown as string[]; const cookie = cookies.find((value) => value.startsWith('bce_session=')) as string; const token = cookie.split(';')[0].split('=')[1]; const { createHash } = await import('node:crypto'); await db.session.updateMany({ where: { tokenHash: createHash('sha256').update(token).digest('hex') }, data: { expiresAt: new Date(Date.now() - 1000) } }); await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie).expect(401); });
});
