<script setup lang="ts">
import { computed } from 'vue';
import { statusOf, TONE_CLASSES, TONE_ICONS, type Tone } from '@/lib/status';
import AppIcon from './AppIcon.vue';

/** Insignia de estado: siempre ícono + texto, nunca solo color. Use `status` (código del catálogo) o `tone` + `label`. */
const props = defineProps<{ status?: string; tone?: Tone; label?: string }>();
const def = computed(() => (props.status ? statusOf(props.status) : { label: props.label ?? '', tone: props.tone ?? 'neutral' }));
</script>

<template>
  <span :class="['inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONE_CLASSES[def.tone]]">
    <AppIcon :name="TONE_ICONS[def.tone]" :size="13" :stroke-width="2" />{{ def.label }}
  </span>
</template>
