<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import ApiErrorMessage from '@/components/ApiErrorMessage.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import { useNotifications } from '@/composables/useNotifications';
import { formatDateTime } from '@/lib/format';

/**
 * Notificaciones de la persona autenticada. Los textos los define el backend y no incluyen datos de expedientes: se muestra el
 * aviso y un enlace al expediente, cuyo contenido solo ve quien tiene acceso.
 */
const { query, unread, markRead } = useNotifications();
const filter = ref<'all' | 'unread'>('all');
const marking = ref(false);
const shown = computed(() => (query.data.value ?? []).filter((n) => filter.value === 'all' || !n.readAt));

async function markAll() {
  marking.value = true; markRead.reset();
  try { for (const n of unread.value) await markRead.mutateAsync(n.id); } catch { /* se muestra abajo */ } finally { marking.value = false; }
}
</script>

<template>
  <div>
    <PageHeader title="Notificaciones" description="Avisos de tareas y expedientes que le conciernen. Se conservan las 100 más recientes.">
      <template #actions>
        <SelectButton v-model="filter" :options="[{ label: 'Todas', value: 'all' }, { label: `Sin leer (${unread.length})`, value: 'unread' }]" option-label="label" option-value="value" :allow-empty="false" aria-label="Filtrar notificaciones" />
        <Button label="Marcar todas como leídas" severity="secondary" outlined :disabled="!unread.length" :loading="marking" @click="markAll" />
      </template>
    </PageHeader>
    <ApiErrorMessage v-if="markRead.error.value" class="mb-4" :error="markRead.error.value" />
    <SectionCard dense flush>
      <QueryState :data="query.data.value ? shown : undefined" :is-pending="query.isPending.value" :error="query.error.value" empty-icon="bell" empty-title="No hay notificaciones" empty-description="Cuando le asignen una tarea o un expediente, el aviso aparecerá aquí." subject="las notificaciones" @retry="query.refetch()">
        <template #default="{ data }">
          <ul class="divide-y divide-slate-100">
            <li v-for="n in data" :key="n.id" class="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div class="flex min-w-0 gap-3">
                <span :class="['mt-2 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-slate-300' : 'bg-sky-600']" aria-hidden="true" />
                <div class="min-w-0">
                  <p :class="['text-sm', n.readAt ? 'text-slate-700' : 'font-semibold text-slate-900']">{{ n.title }}<span v-if="!n.readAt" class="sr-only"> (sin leer)</span></p>
                  <p class="mt-0.5 text-sm text-slate-600">{{ n.body }}</p>
                  <p class="mt-1 text-xs tabular-nums text-slate-500">{{ formatDateTime(n.createdAt) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <RouterLink v-if="n.caseId" :to="{ name: 'cases-detail', params: { id: n.caseId } }" class="rounded text-sm font-medium text-sky-700 hover:underline">Abrir expediente</RouterLink>
                <Button v-if="!n.readAt" label="Marcar como leída" size="small" severity="secondary" text :disabled="marking" @click="markRead.mutate(n.id)" />
              </div>
            </li>
          </ul>
        </template>
      </QueryState>
    </SectionCard>
  </div>
</template>
