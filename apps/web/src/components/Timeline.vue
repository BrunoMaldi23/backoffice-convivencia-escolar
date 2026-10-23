<script setup lang="ts">
import { formatDateTime } from '@/lib/format';
import { TONE_ICONS, type Tone } from '@/lib/status';
import AppIcon from './AppIcon.vue';

import type { TimelineEntry } from './types';
defineProps<{ entries: TimelineEntry[] }>();

const dotClass: Record<Tone, string> = {
  neutral: 'text-slate-500 bg-slate-100', info: 'text-sky-700 bg-sky-50', progress: 'text-indigo-700 bg-indigo-50',
  success: 'text-emerald-700 bg-emerald-50', warning: 'text-amber-700 bg-amber-50', danger: 'text-red-700 bg-red-50'
};
</script>

<template>
  <ol class="relative">
    <li v-for="(entry, index) in entries" :key="entry.id" class="relative flex gap-4 pb-6 last:pb-0">
      <span v-if="index < entries.length - 1" class="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-slate-200" aria-hidden="true" />
      <span :class="['relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white', dotClass[entry.tone ?? 'neutral']]">
        <AppIcon :name="TONE_ICONS[entry.tone ?? 'neutral']" :size="15" />
      </span>
      <div class="min-w-0 pt-1">
        <p class="text-sm font-medium text-slate-900">{{ entry.title }}</p>
        <p v-if="entry.description" class="mt-0.5 text-sm text-slate-600">{{ entry.description }}</p>
        <p class="mt-1 text-xs tabular-nums text-slate-500">
          <time :datetime="entry.at">{{ formatDateTime(entry.at) }}</time><template v-if="entry.meta">, {{ entry.meta }}</template>
        </p>
      </div>
    </li>
  </ol>
</template>
