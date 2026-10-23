import { computed, ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { listMyEstablishments } from '@/services/admin';
import { useEstablishments } from './useAdmin';
import { useCaseList } from './useCases';
import { useSession } from './useSession';

/**
 * Establecimiento de trabajo. La fuente principal es `GET /me/establishments` (los establecimientos de los que la persona es
 * miembro, sin permisos administrativos). Si no pertenece a ninguno, la administración (`institutions.read`) ve la lista completa
 * y, como último recurso, se deducen del alcance de sus expedientes. La selección vive solo en memoria.
 */
const selected = ref<string | null>(null);

export function useEstablishmentContext() {
  const { can } = useSession();
  const mine = useQuery({ queryKey: ['establishments', 'mine'], queryFn: listMyEstablishments, staleTime: 10 * 60_000, retry: false });
  const mineActive = computed(() => (mine.data.value ?? []).filter((e) => e.isActive));
  const needFallback = computed(() => mine.isFetched.value && mineActive.value.length === 0);
  const list = useEstablishments(() => needFallback.value && can('institutions.read'));
  const cases = useCaseList(() => ({ page: 1, limit: needFallback.value ? 100 : 1 }));

  const options = computed(() => {
    if (mineActive.value.length) return mineActive.value.map((e) => ({ value: e.id, label: e.name }));
    const named = (list.data.value ?? []).filter((e) => e.isActive).map((e) => ({ value: e.id, label: e.name }));
    if (named.length) return named;
    const ids = [...new Set((cases.data.value?.items ?? []).map((c) => c.establishmentId))];
    return ids.map((id, index) => ({ value: id, label: ids.length > 1 ? `Establecimiento ${index + 1}` : 'Establecimiento' }));
  });
  const currentId = computed(() => (selected.value && options.value.some((o) => o.value === selected.value) ? selected.value : options.value[0]?.value ?? null));
  const nameOf = (id: string) => options.value.find((o) => o.value === id)?.label ?? 'Establecimiento';
  /** Verdadero mientras todavía no se sabe si la persona pertenece a algún establecimiento. */
  const isPending = computed(() => mine.isPending.value || (needFallback.value && (list.isPending.value || cases.isPending.value) && !options.value.length));

  return { options, currentId, nameOf, select: (id: string) => { selected.value = id; }, isPending, establishments: list };
}
