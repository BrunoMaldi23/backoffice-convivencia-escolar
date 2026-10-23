<script setup lang="ts">
import InputText from 'primevue/inputtext';
import AppIcon from './AppIcon.vue';

/** Campo de texto con ícono decorativo a la izquierda. */
defineProps<{
  id: string; icon: string; invalid?: boolean; describedby?: string; type?: string; placeholder?: string; autocomplete?: string; inputmode?: 'email' | 'text';
}>();
const model = defineModel<string>({ default: '' });
</script>

<template>
  <div class="relative">
    <AppIcon :name="icon" :size="19" class="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-500" />
    <InputText
      :id="id" v-model="model" :type="type ?? 'text'" :inputmode="inputmode" :invalid="invalid" :aria-describedby="describedby" :placeholder="placeholder"
      :autocomplete="autocomplete" autocapitalize="off" spellcheck="false" class="w-full !pl-11"
    />
  </div>
</template>
