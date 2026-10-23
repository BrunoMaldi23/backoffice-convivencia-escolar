<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import AppIcon from '@/components/AppIcon.vue';
import PageHeader from '@/components/PageHeader.vue';
import PreviewBadge from '@/components/PreviewBadge.vue';
import QueryState from '@/components/QueryState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useResource } from '@/composables/useResource';
import { formatDate } from '@/lib/format';

/** Biblioteca de protocolos del reglamento interno. Se presentan como documentos de referencia agrupados por categoría. */
const query = useResource('protocols');
const search = ref('');
const groups = computed(() => {
  const term = search.value.trim().toLowerCase();
  const list = (query.data.value ?? []).filter((p) => !term || `${p.code} ${p.name}`.toLowerCase().includes(term));
  return [...new Set(list.map((p) => p.category))].map((category) => ({ category, items: list.filter((p) => p.category === category) }));
});
</script>

<template>
  <div>
    <PageHeader title="Protocolos" description="Protocolos de actuación del reglamento interno. Cada protocolo define etapas, responsables y registros esperados.">
      <template #badges><PreviewBadge /></template>
    </PageHeader>

    <div class="mb-5 max-w-sm">
      <IconField>
        <InputIcon><AppIcon name="search" :size="16" class="text-slate-500" /></InputIcon>
        <InputText v-model="search" type="search" placeholder="Buscar protocolo" aria-label="Buscar protocolo" class="w-full" />
      </IconField>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white" :class="query.data.value?.length ? 'border-0 bg-transparent' : ''">
      <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" subject="los protocolos" empty-icon="list-checks" empty-title="No hay protocolos cargados" @retry="query.refetch()">
        <div v-if="!groups.length" class="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-600">Sin coincidencias para la búsqueda.</div>
        <section v-for="g in groups" :key="g.category" class="mb-8 last:mb-0" :aria-labelledby="`cat-${g.category}`">
          <h2 :id="`cat-${g.category}`" class="mb-3 text-sm font-semibold text-slate-600">{{ g.category }}</h2>
          <ul class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <li v-for="p in g.items" :key="p.id">
              <RouterLink :to="{ name: 'protocols-detail', params: { id: p.id } }" class="flex flex-col gap-2 px-5 py-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-6">
                <span class="w-14 text-sm font-semibold tabular-nums text-slate-500">{{ p.code }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block font-medium text-slate-900">{{ p.name }}</span>
                  <span class="mt-0.5 block text-xs text-slate-500">{{ p.stages }} etapas. Actualizado el {{ formatDate(p.updatedAt) }}.</span>
                </span>
                <span class="text-sm tabular-nums text-slate-600">{{ p.activeCases }} {{ p.activeCases === 1 ? 'caso activo' : 'casos activos' }}</span>
                <StatusBadge :status="p.status" />
              </RouterLink>
            </li>
          </ul>
        </section>
      </QueryState>
    </div>
  </div>
</template>
