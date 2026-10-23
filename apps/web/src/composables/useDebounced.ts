import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

/** Copia de un valor que se actualiza tras `ms` sin cambios; evita consultar al servidor en cada tecla. */
export function useDebounced<T>(source: Ref<T>, ms = 350): Ref<T> {
  const debounced = ref(source.value) as Ref<T>;
  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(source, (value) => { clearTimeout(timer); timer = setTimeout(() => { debounced.value = value; }, ms); });
  onBeforeUnmount(() => clearTimeout(timer));
  return debounced;
}
