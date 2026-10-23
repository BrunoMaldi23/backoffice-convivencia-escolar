import type { SessionUser } from '@/types/models';
import { pendingIntegration } from './integration';

/**
 * Servicios de autenticación. Endpoints previstos en el backend de la Fase 1A:
 * POST /api/auth/login, GET /api/auth/me, GET /api/auth/csrf, POST /api/auth/logout,
 * POST /api/auth/forgot-password, POST /api/auth/reset-password y POST /api/auth/accept-invitation.
 *
 * La sesión viaja en cookie httpOnly; el frontend nunca guarda tokens ni contraseñas.
 * La conexión real se hará tras revisar el contrato (ver docs/frontend/architecture.md).
 */
export interface Credentials { email: string; password: string }
export interface PasswordTokenInput { token: string; password: string }

export async function login(_credentials: Credentials): Promise<SessionUser> {
  return pendingIntegration('POST /api/auth/login');
}

export async function fetchSession(): Promise<SessionUser> {
  return pendingIntegration('GET /api/auth/me');
}

export async function logout(): Promise<void> {
  return pendingIntegration('POST /api/auth/logout');
}

export async function requestPasswordReset(_email: string): Promise<void> {
  return pendingIntegration('POST /api/auth/forgot-password');
}

export async function resetPassword(_input: PasswordTokenInput): Promise<void> {
  return pendingIntegration('POST /api/auth/reset-password');
}

export async function acceptInvitation(_input: PasswordTokenInput): Promise<void> {
  return pendingIntegration('POST /api/auth/accept-invitation');
}
