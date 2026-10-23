import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { listMembers, listUsers } from '@/services/admin';
import { useEstablishmentContext } from './useEstablishmentContext';
import { useSession } from './useSession';

/**
 * Directorio de personas para mostrar nombres de responsables y elegir a quién asignar.
 *
 * Fuente principal: las personas con cuenta activa del establecimiento de trabajo (`GET /establishments/:id/members`), que
 * cualquier miembro puede leer. Con `users.read` se suma el listado general solo para resolver nombres de cuentas que ya no
 * pertenecen al establecimiento. Si ninguna fuente responde, se muestra "Usted" para la propia cuenta y un identificador corto
 * para el resto, y la asignación se hace pegando el identificador.
 */
export function useDirectory() {
  const { user, can } = useSession();
  const { currentId } = useEstablishmentContext();
  const members = useQuery({ queryKey: computed(() => ['establishments', currentId.value, 'members']), queryFn: () => listMembers(currentId.value!), enabled: computed(() => Boolean(currentId.value)), staleTime: 5 * 60_000, retry: false });
  const usersEnabled = computed(() => can('users.read'));
  const users = useQuery({ queryKey: ['users', 'directory'], queryFn: () => listUsers({ page: 1, limit: 100 }), enabled: usersEnabled, staleTime: 5 * 60_000, retry: false });

  const names = computed(() => {
    const map = new Map<string, string>();
    for (const u of users.data.value?.items ?? []) map.set(u.id, u.displayName);
    for (const m of members.data.value ?? []) map.set(m.id, m.displayName);
    return map;
  });
  const available = computed(() => members.isSuccess.value || (usersEnabled.value && users.isSuccess.value));

  const nameOf = (id: string | null | undefined, empty = 'Sin asignar'): string => {
    if (!id) return empty;
    if (id === user.value?.id) return 'Usted';
    return names.value.get(id) ?? `Usuario ${id.slice(0, 8)}`;
  };
  /** Personas activas para elegir como responsables: las del establecimiento y, si no se pudo leer, las cuentas activas. */
  const options = computed(() => {
    if (members.data.value) return members.data.value.map((m) => ({ value: m.id, label: m.displayName }));
    return (users.data.value?.items ?? []).filter((u) => u.isActive).map((u) => ({ value: u.id, label: u.displayName }));
  });
  /** Todas las cuentas activas, exclusivamente para la administración de membresías. */
  const activeUserOptions = computed(() => (users.data.value?.items ?? [])
    .filter((u) => u.isActive)
    .map((u) => ({ value: u.id, label: u.displayName })));
  /** Compatibilidad con las vistas que esperaban la consulta de usuarios: refleja la fuente que esté disponible. */
  const query = computed(() => (members.isSuccess.value || !usersEnabled.value ? members : users));
  return { query, available, nameOf, options, activeUserOptions, names };
}
