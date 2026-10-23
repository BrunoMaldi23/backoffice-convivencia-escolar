import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useMutation, useQuery } from '@tanstack/vue-query';
import { loadDemo } from '@/preview';
import { fetchResource, fetchResourceItem, submitResource } from '@/services/resources';
import type { ListResourceName, ResourceItem, ResourceMap, ResourceName } from '@/types/models';

export class NotFoundError extends Error {}

/** Consulta un recurso completo. En previsualización usa datos sintéticos; si no, el servicio real. */
export function useResource<K extends ResourceName>(name: K) {
  return useQuery({
    queryKey: [name],
    queryFn: (): Promise<ResourceMap[K]> => (loadDemo ? loadDemo(name) : fetchResource(name))
  });
}

/** Consulta un elemento por identificador opaco. */
export function useResourceItem<K extends ListResourceName>(name: K, id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => [name, toValue(id)]),
    queryFn: async (): Promise<ResourceItem<K>> => {
      if (!loadDemo) return fetchResourceItem(name, toValue(id));
      // En la API habrá un único GET por caso; en la demostración los cerrados viven en otra lista.
      const lists = await Promise.all([name, ...(name === 'cases' ? ['closedCases' as const] : [])].map((n) => loadDemo!(n)));
      const list = lists.flat() as (ResourceItem<K> & { id?: string; name?: string })[];
      const item = list.find((entry) => (entry.id ?? entry.name) === toValue(id));
      if (!item) throw new NotFoundError();
      return item;
    }
  });
}

/** Envío de formularios. Siempre termina en error de integración pendiente: no hay guardado simulado. */
export function useResourceSubmit(name: ResourceName, method: 'POST' | 'PATCH' = 'POST', suffix = '') {
  return useMutation({ mutationFn: () => submitResource(name, method, suffix) });
}
