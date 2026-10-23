import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { isUiPreview } from '../src/config/preview';
import { describeError, IntegrationPendingError, isIntegrationPending } from '../src/lib/errors';
import { PRIORITIES, statusOf } from '../src/lib/status';
import { loadDemo } from '../src/preview';
import { ENDPOINTS, fetchResource, submitResource } from '../src/services/resources';

const httpError = (status?: number) =>
  new AxiosError('x', 'ERR', undefined, undefined, status ? { status, statusText: '', data: {}, headers: {}, config: { headers: new AxiosHeaders() } } : undefined);

describe('recursos sin integración', () => {
  it('informan el endpoint previsto según el contrato', async () => {
    await expect(fetchResource('users')).rejects.toMatchObject({ endpoint: 'GET /api/users' });
    await expect(submitResource('users', 'POST', '/abc/revoke-sessions')).rejects.toMatchObject({ endpoint: 'POST /api/users/abc/revoke-sessions' });
    await expect(fetchResource('cases')).rejects.toMatchObject({ endpoint: null });
    expect(ENDPOINTS.audit).toBe('/api/audit');
  });

  it('no cargan datos de demostración fuera del modo de previsualización', () => {
    expect(isUiPreview).toBe(false);
    expect(loadDemo).toBeNull();
  });
});

describe('mensajes de error', () => {
  it('distinguen integración pendiente de fallos reales', () => {
    expect(isIntegrationPending(new IntegrationPendingError(null))).toBe(true);
    expect(describeError(new IntegrationPendingError('GET /x'))).toMatch(/no está conectada/);
    expect(describeError(httpError())).toMatch(/conectar con el servidor/);
    expect(describeError(httpError(403))).toMatch(/permisos/);
    expect(describeError(httpError(429))).toMatch(/demasiados intentos/i);
  });
});

describe('catálogo de estados', () => {
  it('traduce códigos conocidos y conserva un texto legible para desconocidos', () => {
    expect(statusOf('invitado')).toEqual({ label: 'Invitación pendiente', tone: 'warning' });
    expect(statusOf('nuevo_estado').label).toBe('Nuevo estado');
    expect(PRIORITIES.critica.rank).toBeGreaterThan(PRIORITIES.alta.rank);
  });
});
