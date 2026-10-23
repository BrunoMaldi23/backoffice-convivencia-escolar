import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import * as ops from '@/services/caseOperations';
import { useApiMutation } from './useApiMutation';
import { useSession } from './useSession';

/**
 * Notificaciones de la persona autenticada (`GET /notifications`, hasta 100). Los textos los define el backend y no incluyen
 * datos de los expedientes; la interfaz solo muestra título, texto y fecha, y un acceso al expediente por su identificador.
 */
export function useNotifications() {
  const { can } = useSession();
  const query = useQuery({
    queryKey: ['notifications'], queryFn: ops.listNotifications, enabled: computed(() => can('notifications.read')),
    refetchInterval: 60_000, refetchIntervalInBackground: false, retry: false, staleTime: 30_000
  });
  const unread = computed(() => (query.data.value ?? []).filter((n) => !n.readAt));
  const markRead = useApiMutation((id: string) => ops.markNotificationRead(id), () => [['notifications']]);
  return { query, unread, unreadCount: computed(() => unread.value.length), markRead };
}
