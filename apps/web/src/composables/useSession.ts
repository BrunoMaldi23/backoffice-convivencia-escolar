import { computed } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { isUiPreview } from '@/config/preview';
import { queryClient } from '@/lib/queryClient';
import * as auth from '@/services/auth';
import type { SessionUser } from '@/types/models';

export const SESSION_KEY = ['auth', 'session'] as const;

/** Lee la sesión actual. Cualquier error (sin cookie, 401 o integración pendiente) equivale a "sin sesión". */
async function readSession(): Promise<SessionUser | null> {
  try {
    return await auth.fetchSession();
  } catch {
    return null;
  }
}

/** Usado por la guardia de rutas: reutiliza la sesión en caché y solo consulta al servidor si no existe. */
export function ensureSession(): Promise<SessionUser | null> {
  return queryClient.ensureQueryData({ queryKey: SESSION_KEY, queryFn: readSession, staleTime: 60_000 });
}

export function useSession() {
  const query = useQuery({ queryKey: SESSION_KEY, queryFn: readSession, staleTime: 60_000, enabled: !isUiPreview });
  const user = computed(() => query.data.value ?? null);
  /** Permisos denegados por defecto: solo se concede lo que la sesión declare explícitamente. */
  const can = (permission?: string) => !permission || (user.value?.permissions.includes(permission) ?? false);
  return { query, user, can, isPreview: isUiPreview };
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: auth.login,
    onSuccess: (user) => client.setQueryData(SESSION_KEY, user)
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: auth.logout,
    onSuccess: () => client.clear()
  });
}

export const useForgotPassword = () => useMutation({ mutationFn: auth.requestPasswordReset });
export const useResetPassword = () => useMutation({ mutationFn: auth.resetPassword });
export const useAcceptInvitation = () => useMutation({ mutationFn: auth.acceptInvitation });
