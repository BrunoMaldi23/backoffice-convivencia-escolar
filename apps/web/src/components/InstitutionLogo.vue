<script setup lang="ts">
import { computed } from 'vue';

/**
 * Logo institucional real (`src/assets/logo.png`, copia sin modificar del original de 600 × 293 px).
 * El archivo trae el nombre del establecimiento en blanco sobre fondo transparente, por lo que:
 * - `full` solo debe usarse sobre el azul institucional (`bg-brand`);
 * - `emblem` recorta con CSS únicamente el escudo (primer 39 % del ancho) para usarlo sobre fondo claro.
 * Si el archivo no existe, se muestra un espacio neutro en lugar de inventar un logo.
 */
const props = withDefaults(defineProps<{ size?: number; variant?: 'full' | 'emblem'; alt?: string }>(), { size: 48, variant: 'full', alt: 'Logo del establecimiento' });

const RATIO = 600 / 293;
const EMBLEM_RATIO = 0.39;
const files = import.meta.glob<string>('../assets/logo.png', { eager: true, query: '?url', import: 'default' });
const src = Object.values(files)[0] ?? null;
const boxWidth = computed(() => Math.round(props.size * (props.variant === 'emblem' ? RATIO * EMBLEM_RATIO : RATIO)));
</script>

<template>
  <span v-if="src" class="block shrink-0 overflow-hidden" :style="{ height: `${size}px`, width: `${boxWidth}px` }">
    <img :src="src" :alt="alt" :style="{ height: `${size}px`, width: `${Math.round(size * RATIO)}px`, maxWidth: 'none' }" class="block object-contain object-left">
  </span>
  <span
    v-else
    role="img"
    :aria-label="`${alt} (pendiente de incorporar)`"
    :style="{ height: `${size}px`, width: `${boxWidth}px` }"
    class="inline-flex shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-[10px] font-medium leading-tight text-slate-500"
    title="Copie el logo original en apps/web/src/assets/logo.png"
  >Logo</span>
</template>
