<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import PriorityBadge from '@/components/PriorityBadge.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useDirectory } from '@/composables/useDirectory';
import { useSession } from '@/composables/useSession';
import { categoryLabel, formatFolio } from '@/lib/catalogs';
import { formatDate, formatDateTime, isOverdue } from '@/lib/format';
import { isActiveCase } from '@/lib/metrics';
import type { CaseRecord } from '@/types/api';

const props = defineProps<{ caseRecord: CaseRecord }>();
const { user } = useSession();
const { nameOf } = useDirectory();
const c = computed(() => props.caseRecord);
const overdue = computed(() => isActiveCase(c.value) && isOverdue(c.value.nextActionDueAt));
/** Solo quien creó el caso, es responsable o tiene un acceso de escritura puede registrar cambios; el servidor lo verifica. */
const maybeReadOnly = computed(() => user.value && c.value.createdByUserId !== user.value.id && c.value.responsibleUserId !== user.value.id);
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-3">
    <SectionCard dense title="Datos del caso" class="lg:col-span-2">
      <DetailPanel :items="[
        { key: 'folio', label: 'Folio', value: formatFolio(c.folio) }, { key: 'category', label: 'Categoría', value: categoryLabel(c.categoryCode) },
        { key: 'status', label: 'Estado' }, { key: 'priority', label: 'Prioridad' },
        { key: 'owner', label: 'Responsable', value: nameOf(c.responsibleUserId) }, { key: 'creator', label: 'Creado por', value: nameOf(c.createdByUserId, 'Persona no disponible') },
        { key: 'received', label: 'Fecha de recepción', value: formatDate(c.receivedAt) }, { key: 'updated', label: 'Última actualización', value: formatDateTime(c.updatedAt) },
        ...(c.currentStageId ? [{ key: 'stage', label: 'Etapa', value: 'Etapa asignada (su nombre no está disponible en la API)' }] : []),
        { key: 'description', label: 'Descripción inicial', value: c.initialDescription || 'Sin descripción', wide: true }
      ]">
        <template #item-status><StatusBadge :status="c.status" /></template>
        <template #item-priority><PriorityBadge :priority="c.priority" /></template>
      </DetailPanel>
    </SectionCard>

    <div class="space-y-4">
      <SectionCard dense title="Próxima acción">
        <template v-if="c.nextAction">
          <p class="text-sm font-medium text-slate-900">{{ c.nextAction }}</p>
          <p v-if="c.nextActionDueAt" :class="['mt-2 flex items-center gap-1.5 text-sm tabular-nums', overdue ? 'font-semibold text-red-800' : 'text-slate-600']">
            <AppIcon :name="overdue ? 'alert-circle' : 'calendar'" :size="15" />{{ overdue ? 'Vencida el' : 'Plazo:' }} {{ formatDate(c.nextActionDueAt) }}
          </p>
        </template>
        <p v-else class="text-sm text-slate-600">No hay una próxima acción definida. Puede registrarla desde “Editar”.</p>
      </SectionCard>
      <SectionCard v-if="c.status === 'CERRADO'" dense title="Cierre">
        <p class="text-sm text-slate-700">Cerrado el {{ formatDate(c.closedAt) }}.</p>
        <p v-if="c.closureReason" class="mt-2 text-sm text-slate-600">{{ c.closureReason }}</p>
      </SectionCard>
      <p v-if="maybeReadOnly" class="flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
        <AppIcon name="info" :size="14" class="mt-0.5 shrink-0" />
        Si usted no creó el caso ni es su responsable, solo podrá registrar cambios si tiene un acceso de escritura vigente. El servidor lo verifica en cada acción.
      </p>
    </div>
  </div>
</template>
