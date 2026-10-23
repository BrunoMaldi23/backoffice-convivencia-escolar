import { computed } from 'vue';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { isUiPreview } from '@/config/preview';
import { roleHintAllows } from '@/lib/access';
import { queryClient } from '@/lib/queryClient';
import * as auth from '@/services/auth';
import type { SessionUser } from '@/types/api';

export const SESSION_KEY = ['auth', 'session'] as const;

/**
 * Lee la sesión actual con `GET /auth/me`. Un 401 significa "sin sesión" (`null`); cualquier otro fallo
 * (servidor caído, error 5xx) se propaga para no confundirlo con una sesión cerrada.
 */
async function readSession(): Promise<SessionUser | null> {
  try {
    return await auth.fetchSession();
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return null;
    throw error;
  }
}

/** Usado por la guardia de rutas: reutiliza la sesión en caché y solo consulta al servidor si no existe. */
export function ensureSession(): Promise<SessionUser | null> {
  return queryClient.ensureQueryData({ queryKey: SESSION_KEY, queryFn: readSession, staleTime: 5 * 60_000 });
}

/** Descarta todo dato en memoria (también el de otras personas) y deja registrada la ausencia de sesión. */
export function clearSession(client = queryClient): void {
  client.removeQueries();
  client.setQueryData(SESSION_KEY, null);
}

export function useSession() {
  const query = useQuery({ queryKey: SESSION_KEY, queryFn: readSession, staleTime: 5 * 60_000, enabled: !isUiPreview });
  const user = computed(() => query.data.value ?? null);
  /** Indicio de interfaz según roles (ver `lib/access.ts`); el servidor responde 403 si corresponde. */
  const can = (permission?: string) => roleHintAllows(user.value?.roles ?? [], permission);
  return { query, user, can, isPreview: isUiPreview };
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: auth.login,
    onSuccess: (user) => {
      client.removeQueries();
      client.setQueryData(SESSION_KEY, user);
    }
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({ mutationFn: auth.logout, onSuccess: () => clearSession(client) });
}

export const useForgotPassword = () => useMutation({ mutationFn: auth.requestPasswordReset });
export const useResetPassword = () => useMutation({ mutationFn: auth.resetPassword });
export const useAcceptInvitation = () => useMutation({ mutationFn: auth.acceptInvitation });
