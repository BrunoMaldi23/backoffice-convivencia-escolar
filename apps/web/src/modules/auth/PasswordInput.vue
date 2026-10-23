<script setup lang="ts">
import { ref } from 'vue';
import InputText from 'primevue/inputtext';
import AppIcon from '@/components/AppIcon.vue';

/** Campo de contraseña con botón accesible para mostrar u ocultar. El valor vive solo en memoria del componente padre. */
defineProps<{ id: string; invalid?: boolean; describedby?: string; autocomplete: 'current-password' | 'new-password'; placeholder?: string }>();
const model = defineModel<string>({ default: '' });
const visible = ref(false);
</script>

<template>
  <div class="relative">
    <AppIcon name="lock" :size="19" class="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-500" />
    <InputText
      :id="id" v-model="model" :type="visible ? 'text' : 'password'" :invalid="invalid" :aria-describedby="describedby" :placeholder="placeholder"
      :autocomplete="autocomplete" autocapitalize="off" spellcheck="false" class="w-full !pl-11 !pr-11"
    />
    <button
      type="button" class="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 hover:text-slate-900"
      :aria-label="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'" :aria-pressed="visible" :aria-controls="id" @click="visible = !visible"
    >
      <AppIcon :name="visible ? 'eye-off' : 'eye'" :size="19" />
    </button>
  </div>
</template>
