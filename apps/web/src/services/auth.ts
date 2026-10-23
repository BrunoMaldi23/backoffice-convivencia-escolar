import { isAxiosError } from 'axios';
import { SessionNotEstablishedError } from '@/lib/errors';
import type { SessionUser } from '@/types/api';
import { api, resetCsrf } from './api';

/**
 * Autenticación contra la API real (ver docs/api/auth-contract.md y password-recovery-contract.md).
 * La sesión es la cookie HttpOnly `bce_session`; aquí no se guardan tokens ni contraseñas.
 */
export interface Credentials { email: string; password: string }
export interface PasswordTokenInput { token: string; password: string }

interface ApiUser { id: string; email: string; displayName: string; roles: string[] }

const toSession = (user: ApiUser): SessionUser => ({ id: user.id, email: user.email, displayName: user.displayName, roles: [...user.roles] });

/** `GET /auth/me`: devuelve el usuario de la sesión actual o lanza el error HTTP (401 si no hay sesión). */
export async function fetchSession(): Promise<SessionUser> {
  const { data } = await api.get<{ user: ApiUser }>('/auth/me');
  return toSession(data.user);
}

/**
 * `POST /auth/login` y luego `GET /auth/me`. La segunda llamada confirma que el navegador guardó la cookie
 * de sesión y entrega el usuario canónico; si falla con 401, la sesión no quedó establecida.
 */
export async function login(credentials: Credentials): Promise<SessionUser> {
  await api.post('/auth/login', { email: credentials.email, password: credentials.password });
  resetCsrf();
  try {
    return await fetchSession();
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) throw new SessionNotEstablishedError();
    throw error;
  }
}

/** `POST /auth/logout` con CSRF. Un 401 significa que la sesión ya estaba cerrada y se considera exitoso. */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', {});
  } catch (error) {
    if (!(isAxiosError(error) && error.response?.status === 401)) throw error;
  } finally {
    resetCsrf();
  }
}

/** `POST /auth/forgot-password`: la API responde igual exista o no la cuenta. */
export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

/** `POST /auth/reset-password` con el código de un solo uso recibido por correo. */
export async function resetPassword(input: PasswordTokenInput): Promise<void> {
  await api.post('/auth/reset-password', { token: input.token, password: input.password });
}

/** `POST /auth/accept-invitation` con el código de invitación. */
export async function acceptInvitation(input: PasswordTokenInput): Promise<void> {
  await api.post('/auth/accept-invitation', { token: input.token, password: input.password });
}
