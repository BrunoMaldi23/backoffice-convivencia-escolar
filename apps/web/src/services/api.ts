import axios, { type InternalAxiosRequestConfig } from 'axios';

/**
 * Cliente HTTP único. La sesión viaja en la cookie HttpOnly `bce_session` (por eso `withCredentials`);
 * el frontend nunca lee ni guarda tokens de sesión. Las escrituras autenticadas llevan el encabezado
 * `X-CSRF-Token` que entrega `GET /auth/csrf`.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  withCredentials: true,
  timeout: 15_000
});

export interface HealthResponse { status: 'ok' | 'error'; database: 'connected' | 'disconnected'; timestamp: string; }
export async function getHealth(): Promise<HealthResponse> { return (await api.get<HealthResponse>('/health')).data; }

const SAFE_METHODS = new Set(['get', 'head', 'options']);
/** Escrituras públicas: el contrato no exige CSRF (aún no hay sesión). */
const PUBLIC_WRITES = new Set(['/auth/login', '/auth/forgot-password', '/auth/reset-password', '/auth/accept-invitation']);
/** Un 401 en estas rutas es un resultado esperado, no una sesión caducada. */
const AUTH_PROBES = new Set(['/auth/me', ...PUBLIC_WRITES]);

type RetriableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean };
const needsCsrf = (config: InternalAxiosRequestConfig) =>
  !SAFE_METHODS.has((config.method ?? 'get').toLowerCase()) && !PUBLIC_WRITES.has(config.url ?? '');

// El token solo vive en memoria del módulo (no en localStorage ni sessionStorage).
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

export function resetCsrf(): void {
  csrfToken = null;
  csrfRequest = null;
}

async function loadCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  csrfRequest ??= api
    .get<{ token?: string }>('/auth/csrf')
    .then(({ data }) => {
      if (!data.token) throw new Error('La API no entregó un token CSRF.');
      csrfToken = data.token;
      return data.token;
    })
    .finally(() => { csrfRequest = null; });
  return csrfRequest;
}

api.interceptors.request.use(async (config) => {
  if (needsCsrf(config)) config.headers.set('X-CSRF-Token', await loadCsrf());
  return config;
});

let unauthorizedHandler: (() => void) | null = null;
/** Registra qué hacer cuando una llamada autenticada responde 401 (sesión expirada o revocada). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

api.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || !error.config) throw error;
  const config = error.config as RetriableConfig;
  const status = error.response?.status;
  // 403 en una escritura puede ser un token CSRF vencido: se pide uno nuevo y se reintenta una sola vez.
  if (status === 403 && needsCsrf(config) && !config._csrfRetried) {
    config._csrfRetried = true;
    resetCsrf();
    return api.request(config);
  }
  if (status === 401 && !AUTH_PROBES.has(config.url ?? '')) {
    resetCsrf();
    unauthorizedHandler?.();
  }
  throw error;
});
