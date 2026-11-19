import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import * as ops from '@/services/caseOperations';
import { useApiMutation } from './useApiMutation';
import { useSession } from './useSession';

/**
 * Notificaciones de la persona autenticada (`GET /notifications`, hasta 100). Los textos los define el backend y no incluyen
 * datos de los expedientes; la interfaz solo muestra título, texto y fecha, y un acceso al expediente por su identificador.
 */
export function useNotifications(pollWhenOpen: MaybeRefOrGetter<boolean> = false) {
  const { can } = useSession();
  const query = useQuery({
    queryKey: ['notifications'], queryFn: ({ signal }) => ops.listNotifications({ signal }), enabled: computed(() => can('notifications.read')),
    refetchInterval: computed(() => toValue(pollWhenOpen) ? 60_000 : false), refetchIntervalInBackground: false, retry: false, staleTime: 2 * 60_000
  });
  const unread = computed(() => (query.data.value ?? []).filter((n) => !n.readAt));
  const markRead = useApiMutation((id: string) => ops.markNotificationRead(id), () => [['notifications']]);
  return { query, unread, unreadCount: computed(() => unread.value.length), markRead };
}
