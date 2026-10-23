<script setup lang="ts">
import { computed } from 'vue';

/** Etiqueta, ayuda y error accesibles para cualquier control. El slot recibe `id`, `invalid` y `describedby`. */
const props = withDefaults(defineProps<{ id: string; label: string; required?: boolean; help?: string; error?: string | null }>(), { required: false, help: undefined, error: null });
const describedby = computed(() => [props.help ? `${props.id}-help` : '', props.error ? `${props.id}-error` : ''].filter(Boolean).join(' ') || undefined);
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-sm font-medium text-slate-800">
      {{ label }}<span v-if="required" class="text-red-700" aria-hidden="true"> *</span><span v-if="required" class="sr-only"> (obligatorio)</span>
    </label>
    <slot :id="id" :invalid="Boolean(error)" :describedby="describedby" />
    <p v-if="help && !error" :id="`${id}-help`" class="text-xs text-slate-500">{{ help }}</p>
    <p v-if="error" :id="`${id}-error`" class="flex items-start gap-1 text-xs font-medium text-red-700">{{ error }}</p>
  </div>
</template>
