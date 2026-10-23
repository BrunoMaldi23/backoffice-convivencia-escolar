import { computed, ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { listMyEstablishments } from '@/services/admin';

/**
 * Establecimiento de trabajo: los establecimientos de los que la persona es miembro activa (`GET /me/establishments`). Todos los
 * datos del colegio (casos, protocolos, estudiantes, etc.) exigen esa membresía; sin ella la API responde 404, por eso no se
 * ofrece ningún establecimiento al que la persona no pertenezca y las vistas muestran `NoEstablishment`. La selección vive solo
 * en memoria.
 */
const selected = ref<string | null>(null);

export function useEstablishmentContext() {
  const mine = useQuery({ queryKey: ['establishments', 'mine'], queryFn: listMyEstablishments, staleTime: 5 * 60_000, retry: false });
  const options = computed(() => (mine.data.value ?? []).filter((e) => e.isActive).map((e) => ({ value: e.id, label: e.name })));
  const currentId = computed(() => (selected.value && options.value.some((o) => o.value === selected.value) ? selected.value : options.value[0]?.value ?? null));
  const nameOf = (id: string) => options.value.find((o) => o.value === id)?.label ?? 'Establecimiento';
  return { options, currentId, nameOf, select: (id: string) => { selected.value = id; }, isPending: computed(() => mine.isPending.value) };
}
