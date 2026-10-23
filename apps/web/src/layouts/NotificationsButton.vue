<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import Popover from 'primevue/popover';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useNotifications } from '@/composables/useNotifications';
import { useSession } from '@/composables/useSession';
import { formatDateTime } from '@/lib/format';
import type { AppNotification } from '@/types/api';

/**
 * Campana de notificaciones. Muestra el contador de no leídas y las más recientes. Los textos los define el backend y no incluyen
 * datos del expediente; al abrir una notificación se marca como leída (confirmado por el servidor) y se navega al expediente.
 */
const { can } = useSession();
const { query, unread, unreadCount, markRead } = useNotifications();
const router = useRouter();
const panel = ref<InstanceType<typeof Popover> | null>(null);
const latest = computed(() => (query.data.value ?? []).slice(0, 6));

async function open(notification: AppNotification) {
  panel.value?.hide();
  if (!notification.readAt) await markRead.mutateAsync(notification.id).catch(() => undefined);
  if (notification.caseId) await router.push({ name: 'cases-detail', params: { id: notification.caseId } });
}
</script>

<template>
  <div v-if="can('notifications.read')">
    <button
      type="button" class="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      :aria-label="unreadCount ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'" aria-haspopup="dialog" @click="panel?.toggle($event)"
    >
      <AppIcon name="bell" :size="19" />
      <span v-if="unreadCount" class="absolute right-0.5 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-700 px-1 text-[0.625rem] font-semibold leading-none text-white" aria-hidden="true">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
    </button>
    <Popover ref="panel" :pt="{ content: { class: 'p-0' } }">
      <div class="w-[min(22rem,calc(100vw-2rem))]">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p class="text-sm font-semibold text-slate-900">Notificaciones</p>
          <p v-if="unread.length" class="text-xs text-slate-500">{{ unread.length }} sin leer</p>
        </div>
        <p v-if="query.isError.value" class="px-4 py-6 text-center text-sm text-slate-600">No se pudieron cargar las notificaciones.</p>
        <EmptyState v-else-if="!latest.length" compact icon="bell" title="Sin notificaciones" description="Aquí aparecerán los avisos de tareas y expedientes que le asignen." />
        <ul v-else class="max-h-80 divide-y divide-slate-100 overflow-y-auto">
          <li v-for="n in latest" :key="n.id">
            <button type="button" class="flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50" @click="open(n)">
              <span :class="['mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-sky-600']" aria-hidden="true" />
              <span class="min-w-0">
                <span :class="['block text-sm', n.readAt ? 'text-slate-700' : 'font-semibold text-slate-900']">{{ n.title }}<span v-if="!n.readAt" class="sr-only"> (sin leer)</span></span>
                <span class="mt-0.5 block text-xs text-slate-600">{{ n.body }}</span>
                <span class="mt-1 block text-xs tabular-nums text-slate-500">{{ formatDateTime(n.createdAt) }}</span>
              </span>
            </button>
          </li>
        </ul>
        <div class="border-t border-slate-100 px-4 py-2.5 text-right">
          <RouterLink :to="{ name: 'notifications' }" class="rounded text-sm font-medium text-sky-700 hover:underline" @click="panel?.hide()">Ver todas</RouterLink>
        </div>
      </div>
    </Popover>
  </div>
</template>
