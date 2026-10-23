import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearSession, ensureSession, SESSION_KEY } from '../src/composables/useSession';
import { roleHintAllows } from '../src/lib/access';
import { SessionNotEstablishedError } from '../src/lib/errors';
import { queryClient } from '../src/lib/queryClient';
import { api, resetCsrf, setUnauthorizedHandler } from '../src/services/api';
import * as auth from '../src/services/auth';

interface Call { method: string; url: string; csrf: string | undefined; body: unknown }
type Reply = { status: number; data?: unknown };

const USER = { id: '0f6f5b1e-6b57-4c36-9d58-6c2f0a0b1c11', email: 'persona@demo.invalid', displayName: 'Persona demo', roles: ['DIRECTOR'] };
let calls: Call[] = [];
let replies: Record<string, Reply[]> = {};

/** Adaptador falso: registra cada solicitud y responde en orden según `replies["MÉTODO /ruta"]`. */
function fakeAdapter(config: InternalAxiosRequestConfig) {
  const method = (config.method ?? 'get').toUpperCase();
  const url = config.url ?? '';
  calls.push({ method, url, csrf: config.headers.get('X-CSRF-Token') as string | undefined, body: config.data ? JSON.parse(config.data as string) : undefined });
  const reply = replies[`${method} ${url}`]?.shift() ?? { status: 200, data: {} };
  const response = { data: reply.data ?? {}, status: reply.status, statusText: '', headers: {}, config };
  if (reply.status >= 400) return Promise.reject(new AxiosError('fallo', 'ERR_BAD_REQUEST', config, null, response));
  return Promise.resolve(response);
}

beforeEach(() => {
  calls = [];
  replies = {};
  resetCsrf();
  queryClient.clear();
  api.defaults.adapter = fakeAdapter;
  setUnauthorizedHandler(null);
});
afterEach(() => setUnauthorizedHandler(null));

describe('inicio de sesión', () => {
  it('hace POST sin CSRF y luego confirma la sesión con GET /auth/me', async () => {
    replies['POST /auth/login'] = [{ status: 201, data: { user: USER } }];
    replies['GET /auth/me'] = [{ status: 200, data: { user: USER } }];
    const session = await auth.login({ email: USER.email, password: 'una-clave-larga-1' });
    expect(session).toEqual(USER);
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['POST /auth/login', 'GET /auth/me']);
    expect(calls[0]!.csrf).toBeUndefined();
    expect(calls[0]!.body).toEqual({ email: USER.email, password: 'una-clave-larga-1' });
  });

  it('informa si la cookie de sesión no quedó establecida', async () => {
    replies['POST /auth/login'] = [{ status: 201, data: { user: USER } }];
    replies['GET /auth/me'] = [{ status: 401 }];
    await expect(auth.login({ email: USER.email, password: 'una-clave-larga-1' })).rejects.toBeInstanceOf(SessionNotEstablishedError);
  });

  it('propaga el 401 de credenciales inválidas sin tratarlo como sesión caducada', async () => {
    let expired = 0;
    setUnauthorizedHandler(() => { expired += 1; });
    replies['POST /auth/login'] = [{ status: 401 }];
    await expect(auth.login({ email: USER.email, password: 'incorrecta-123456' })).rejects.toMatchObject({ response: { status: 401 } });
    expect(expired).toBe(0);
  });
});

describe('CSRF en escrituras', () => {
  it('obtiene el token de /auth/csrf y lo envía en el cierre de sesión', async () => {
    replies['GET /auth/csrf'] = [{ status: 200, data: { token: 'token-1' } }];
    await auth.logout();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /auth/csrf', 'POST /auth/logout']);
    expect(calls[1]!.csrf).toBe('token-1');
  });

  it('reintenta una sola vez con un token nuevo si la API responde 403', async () => {
    replies['GET /auth/csrf'] = [{ status: 200, data: { token: 'viejo' } }, { status: 200, data: { token: 'nuevo' } }];
    replies['POST /users'] = [{ status: 403 }, { status: 201, data: {} }];
    await api.post('/users', { email: 'a@demo.invalid' });
    const posts = calls.filter((c) => c.method === 'POST');
    expect(posts.map((c) => c.csrf)).toEqual(['viejo', 'nuevo']);
  });

  it('no reintenta más de una vez ante un 403 persistente', async () => {
    replies['GET /auth/csrf'] = [{ status: 200, data: { token: 'a' } }, { status: 200, data: { token: 'b' } }];
    replies['POST /users'] = [{ status: 403 }, { status: 403 }];
    await expect(api.post('/users', {})).rejects.toMatchObject({ response: { status: 403 } });
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(2);
  });

  it('no usa CSRF en la recuperación de contraseña (rutas públicas)', async () => {
    await auth.requestPasswordReset('persona@demo.invalid');
    await auth.resetPassword({ token: 't'.repeat(40), password: 'otra-clave-larga-1' });
    await auth.acceptInvitation({ token: 't'.repeat(40), password: 'otra-clave-larga-1' });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['POST /auth/forgot-password', 'POST /auth/reset-password', 'POST /auth/accept-invitation']);
    expect(calls.every((c) => c.csrf === undefined)).toBe(true);
  });

  it('considera cerrada la sesión si el cierre responde 401', async () => {
    replies['GET /auth/csrf'] = [{ status: 401 }];
    await expect(auth.logout()).resolves.toBeUndefined();
  });
});

describe('sesión y rutas protegidas', () => {
  it('ensureSession devuelve null ante 401 y el usuario cuando hay sesión', async () => {
    replies['GET /auth/me'] = [{ status: 401 }];
    expect(await ensureSession()).toBeNull();
    clearSession();
    queryClient.removeQueries({ queryKey: SESSION_KEY });
    replies['GET /auth/me'] = [{ status: 200, data: { user: USER } }];
    expect(await ensureSession()).toEqual(USER);
  });

  it('no confunde una API caída con una sesión cerrada', async () => {
    replies['GET /auth/me'] = [{ status: 503 }];
    await expect(ensureSession()).rejects.toMatchObject({ response: { status: 503 } });
  });

  it('avisa una sola vez al recibir 401 en una llamada autenticada', async () => {
    let expired = 0;
    setUnauthorizedHandler(() => { expired += 1; });
    replies['GET /users'] = [{ status: 401 }];
    await expect(api.get('/users')).rejects.toMatchObject({ response: { status: 401 } });
    expect(expired).toBe(1);
  });

  it('limpia por completo el estado local al cerrar sesión', () => {
    queryClient.setQueryData(['users'], [{ id: 'dato-sensible' }]);
    queryClient.setQueryData(SESSION_KEY, USER);
    clearSession();
    expect(queryClient.getQueryData(['users'])).toBeUndefined();
    expect(queryClient.getQueryData(SESSION_KEY)).toBeNull();
  });
});

describe('opciones del menú según roles', () => {
  it('solo orienta la interfaz con la matriz inicial documentada', () => {
    expect(roleHintAllows(['DIRECTOR'], 'users.read')).toBe(true);
    expect(roleHintAllows(['DIRECTOR'], 'users.create')).toBe(false);
    expect(roleHintAllows(['AUDITOR'], 'audit.read')).toBe(true);
    expect(roleHintAllows(['DOCENTE'], 'audit.read')).toBe(false);
    expect(roleHintAllows(['SYSTEM_ADMIN'], 'roles.assign')).toBe(true);
    expect(roleHintAllows([], undefined)).toBe(true);
    // Un permiso que la tabla no conoce nunca se oculta: decide el servidor.
    expect(roleHintAllows(['DOCENTE'], 'cases.read')).toBe(true);
  });
});

describe('cliente HTTP', () => {
  it('envía las cookies de sesión y no guarda nada en el navegador', () => {
    expect(api.defaults.withCredentials).toBe(true);
    expect(new AxiosHeaders(api.defaults.headers as never).has('Authorization')).toBe(false);
  });
});
