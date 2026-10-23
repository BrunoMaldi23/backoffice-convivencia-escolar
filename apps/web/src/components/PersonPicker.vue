<script setup lang="ts">
import { ref, watch } from 'vue';
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete';
import { formatRut } from '@/lib/rut';
import { fullName } from '@/lib/format';
import * as community from '@/services/community';

/**
 * Buscador de personas del directorio (estudiantes, apoderados o funcionarios) por nombre o RUT. Consulta al servidor mientras se
 * escribe y devuelve la persona elegida; no precarga listados completos de menores.
 */
type Kind = 'ESTUDIANTE' | 'APODERADO' | 'FUNCIONARIO';
export interface PickedPerson { id: string; label: string; detail: string }

const props = withDefaults(defineProps<{ id: string; kind: Kind; establishmentId: string; invalid?: boolean; describedby?: string; placeholder?: string }>(), { invalid: false, describedby: undefined, placeholder: 'Escriba un nombre o RUT' });
const model = defineModel<PickedPerson | null>({ default: null });
const suggestions = ref<PickedPerson[]>([]);
const text = ref<string | PickedPerson>(model.value ?? '');
const failed = ref(false);

watch(() => props.kind, () => { model.value = null; text.value = ''; suggestions.value = []; });
watch(model, (value) => { if (value) text.value = value; else if (typeof text.value !== 'string') text.value = ''; });

async function search(event: AutoCompleteCompleteEvent) {
  const query = { establishmentId: props.establishmentId, search: event.query.trim(), active: true, limit: 10 };
  failed.value = false;
  try {
    if (props.kind === 'ESTUDIANTE') suggestions.value = (await community.listStudents(query)).items.map((p) => ({ id: p.id, label: fullName(p), detail: [formatRut(p.rut), p.course?.name].filter(Boolean).join(' · ') }));
    else if (props.kind === 'APODERADO') suggestions.value = (await community.listGuardians(query)).items.map((p) => ({ id: p.id, label: fullName(p), detail: p.rut ? formatRut(p.rut) : '' }));
    else suggestions.value = (await community.listStaff(query)).items.map((p) => ({ id: p.id, label: fullName(p), detail: p.position }));
  } catch {
    suggestions.value = [];
    failed.value = true;
  }
}
</script>

<template>
  <div>
    <AutoComplete
      v-model="text" :input-id="id" :suggestions="suggestions" option-label="label" :invalid="invalid" :aria-describedby="describedby" :placeholder="placeholder" :min-length="2" :delay="300"
      fluid force-selection @complete="search" @option-select="model = $event.value as PickedPerson" @clear="model = null"
    >
      <template #option="{ option }"><span class="flex flex-col"><span class="text-sm font-medium text-slate-900">{{ option.label }}</span><span v-if="option.detail" class="text-xs text-slate-500">{{ option.detail }}</span></span></template>
      <template #empty><span class="px-3 py-2 text-sm text-slate-600">Sin coincidencias en el directorio.</span></template>
    </AutoComplete>
    <p v-if="failed" class="mt-1 text-xs text-red-700">No se pudo buscar en el directorio. Intente nuevamente.</p>
  </div>
</template>
