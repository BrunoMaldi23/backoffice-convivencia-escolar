import { computed, ref } from 'vue';
import { useEstablishments } from './useAdmin';
import { useCaseList } from './useCases';
import { useSession } from './useSession';

/**
 * Establecimiento de trabajo. `GET /establishments` exige `institutions.read` (solo SYSTEM_ADMIN en la matriz inicial). Sin
 * ese permiso, los establecimientos se deducen de los expedientes autorizados; si no hay ninguno, no hay forma de conocer el
 * identificador y la creación de expedientes queda a la espera de un endpoint (ver docs/frontend/api-integration.md).
 * La selección vive solo en memoria.
 */
const selected = ref<string | null>(null);

export function useEstablishmentContext() {
  const { can } = useSession();
  const list = useEstablishments(() => can('institutions.read'));
  const cases = useCaseList({ page: 1, limit: 100 });

  const options = computed(() => {
    const named = (list.data.value ?? []).filter((e) => e.isActive).map((e) => ({ value: e.id, label: e.name }));
    if (named.length) return named;
    const ids = [...new Set((cases.data.value?.items ?? []).map((c) => c.establishmentId))];
    return ids.map((id, index) => ({ value: id, label: ids.length > 1 ? `Establecimiento ${index + 1}` : 'Establecimiento' }));
  });
  const currentId = computed(() => (selected.value && options.value.some((o) => o.value === selected.value) ? selected.value : options.value[0]?.value ?? null));
  const nameOf = (id: string) => options.value.find((o) => o.value === id)?.label ?? 'Establecimiento';

  return { options, currentId, nameOf, select: (id: string) => { selected.value = id; }, isPending: computed(() => list.isPending.value && cases.isPending.value), establishments: list };
}
