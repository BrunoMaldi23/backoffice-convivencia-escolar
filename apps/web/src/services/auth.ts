import { isAxiosError } from 'axios';
import type { SessionUser } from '@/types/api';
import { api, resetCsrf } from './api';
import { setSupabasePassword } from './supabase';

/**
 * Autenticación contra la API real (ver docs/api/auth-contract.md y password-recovery-contract.md).
 * La sesión es la cookie HttpOnly `bce_session`; aquí no se guardan tokens ni contraseñas.
 */
export interface Credentials { email: string; password: string }
/** `token` se mantiene opcional sólo para compatibilidad de pruebas durante la transición; Supabase usa el enlace firmado. */
export interface PasswordTokenInput { password: string; token?: string }

interface ApiUser { id: string; email: string; displayName: string; roles: string[]; permissions: string[] }

const toSession = (user: ApiUser): SessionUser => ({ id: user.id, email: user.email, displayName: user.displayName, roles: [...user.roles], permissions: [...user.permissions] });

/** `GET /auth/me`: devuelve el usuario de la sesión actual o lanza el error HTTP (401 si no hay sesión). */
export async function fetchSession(): Promise<SessionUser> {
  const { data } = await api.get<{ user: ApiUser }>('/auth/me');
  return toSession(data.user);
}

/**
 * `POST /auth/login` ya instala la cookie HttpOnly y devuelve el usuario canónico. Reutilizar esa respuesta
 * evita una segunda vuelta a la API antes de mostrar el panel.
 */
export async function login(credentials: Credentials): Promise<SessionUser> {
  const { data } = await api.post<{ user: ApiUser }>('/auth/login', { email: credentials.email, password: credentials.password });
  resetCsrf();
  return toSession(data.user);
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
export const resetPassword = async (input: PasswordTokenInput): Promise<void> => setSupabasePassword(input.password);

/** `POST /auth/accept-invitation` con el código de invitación. */
export const acceptInvitation = async (input: PasswordTokenInput): Promise<void> => setSupabasePassword(input.password);
