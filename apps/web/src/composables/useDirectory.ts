import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { listUsers } from '@/services/admin';
import { useSession } from './useSession';

/**
 * Directorio de personas para mostrar nombres de responsables y elegir a quién asignar.
 *
 * La API solo lista usuarios con el permiso `users.read` (no existe un directorio por establecimiento). Sin ese permiso, los
 * nombres no pueden resolverse: se muestra "Usted" para la propia cuenta y un identificador corto para el resto, y la
 * asignación se hace pegando el identificador. Ver docs/frontend/api-integration.md ("Necesidades de backend").
 */
export function useDirectory() {
  const { user, can } = useSession();
  const enabled = computed(() => can('users.read'));
  const query = useQuery({ queryKey: ['users', 'directory'], queryFn: () => listUsers({ page: 1, limit: 100 }), enabled, staleTime: 5 * 60_000, retry: false });
  const byId = computed(() => new Map((query.data.value?.items ?? []).map((u) => [u.id, u])));
  const available = computed(() => enabled.value && query.isSuccess.value);

  const nameOf = (id: string | null | undefined, empty = 'Sin asignar'): string => {
    if (!id) return empty;
    if (id === user.value?.id) return 'Usted';
    return byId.value.get(id)?.displayName ?? `Usuario ${id.slice(0, 8)}`;
  };
  /** Personas activas para elegir como responsables. */
  const options = computed(() => (query.data.value?.items ?? []).filter((u) => u.isActive).map((u) => ({ value: u.id, label: u.displayName })));
  return { query, available, nameOf, options, byId };
}
