<script setup lang="ts">
import { computed } from 'vue';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { useDirectory } from '@/composables/useDirectory';

/**
 * Selector de persona. Con permiso `users.read` ofrece la lista de usuarios activos; sin él la API no permite listar usuarios,
 * por lo que se pide el identificador (UUID) de la persona, validado antes de enviarse.
 */
const props = withDefaults(defineProps<{ id: string; invalid?: boolean; describedby?: string; placeholder?: string; showClear?: boolean }>(), { invalid: false, describedby: undefined, placeholder: 'Seleccione una persona', showClear: false });
const model = defineModel<string | null>({ default: null });
const { available, options, query } = useDirectory();
const text = computed({ get: () => model.value ?? '', set: (value: string) => { model.value = value.trim() || null; } });
</script>

<template>
  <Select
    v-if="available" v-model="model" :input-id="id" :options="options" option-label="label" option-value="value" :invalid="invalid" :aria-describedby="describedby"
    :placeholder="placeholder" :show-clear="props.showClear" filter class="w-full"
  />
  <div v-else>
    <InputText :id="id" v-model="text" :invalid="invalid" :aria-describedby="describedby" placeholder="Identificador de la persona (UUID)" autocomplete="off" spellcheck="false" class="w-full font-mono text-sm" />
    <p v-if="!query.isPending.value" class="mt-1 text-xs text-slate-500">Su rol no puede listar usuarios; pegue el identificador de la persona.</p>
  </div>
</template>
