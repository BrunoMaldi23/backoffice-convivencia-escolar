<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import AppIcon from '@/components/AppIcon.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import ErrorState from '@/components/ErrorState.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageHeader from '@/components/PageHeader.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { DetailItem } from '@/components/types';
import { useGuardian } from '@/composables/useCommunity';
import { useSession } from '@/composables/useSession';
import { relationshipLabel } from '@/lib/catalogs';
import { isNotFound } from '@/lib/errors';
import { formatDate, fullName } from '@/lib/format';
import { formatRut } from '@/lib/rut';
import GuardianFormDialog from './GuardianFormDialog.vue';

/** Ficha del apoderado (`GET /guardians/:id`) con los estudiantes a su cargo. */
const props = defineProps<{ id: string }>();
const { can } = useSession();
const query = useGuardian(() => props.id);
const guardian = computed(() => query.data.value);
const editOpen = ref(false);
const details = computed<DetailItem[]>(() => {
  const g = guardian.value;
  return g ? [
    { key: 'rut', label: 'RUT', value: g.rut ? formatRut(g.rut) : '—' }, { key: 'phone', label: 'Teléfono', value: g.phone }, { key: 'email', label: 'Correo', value: g.email }, { key: 'created', label: 'Registrado el', value: formatDate(g.createdAt) }
  ] : [];
});
const reload = () => { void query.refetch(); };
</script>

<template>
  <div>
    <LoadingState v-if="query.isPending.value" :rows="5" />
    <template v-else-if="guardian">
      <PageHeader :title="fullName(guardian)" :back="{ to: { name: 'guardians' }, label: 'Volver a apoderados' }">
        <template #badges><StatusBadge :status="guardian.isActive ? 'ACTIVO' : 'INACTIVO'" /></template>
        <template v-if="can('guardians.manage')" #actions><Button label="Editar" severity="secondary" outlined @click="editOpen = true"><template #icon><AppIcon name="pencil" :size="15" /></template></Button></template>
      </PageHeader>
      <div class="grid gap-4 lg:grid-cols-2">
        <SectionCard dense title="Datos de contacto"><DetailPanel :items="details" /></SectionCard>
        <SectionCard dense title="Estudiantes a su cargo">
          <EmptyState v-if="!guardian.studentLinks.length" compact icon="student" title="Sin estudiantes asociados" description="Asocie al apoderado/a desde la ficha de cada estudiante." />
          <ul v-else class="divide-y divide-slate-100">
            <li v-for="link in guardian.studentLinks" :key="link.studentId" class="py-3 first:pt-0 last:pb-0">
              <p class="break-words text-sm font-medium text-slate-900">
                <RouterLink v-if="can('students.read')" :to="{ name: 'students-detail', params: { id: link.studentId } }" class="rounded text-sky-800 hover:underline">{{ fullName(link.student) }}</RouterLink>
                <template v-else>{{ fullName(link.student) }}</template>
                <span v-if="link.isPrimary" class="ml-2 rounded bg-sky-50 px-1.5 py-0.5 text-xs font-medium text-sky-800">Principal</span>
              </p>
              <p class="mt-0.5 text-xs text-slate-500">{{ relationshipLabel(link.relationship) }} · {{ link.student.course?.name ?? 'Sin curso' }}</p>
            </li>
          </ul>
        </SectionCard>
      </div>
      <GuardianFormDialog v-model:visible="editOpen" :establishment-id="guardian.establishmentId" :guardian="guardian" @reload="reload" />
    </template>
    <div v-else class="rounded-xl border border-slate-200 bg-white">
      <h1 class="sr-only">Apoderado no disponible</h1>
      <EmptyState v-if="isNotFound(query.error.value)" icon="search" title="No se encontró al apoderado/a" description="El registro no existe o usted no pertenece a su establecimiento." />
      <ErrorState v-else :error="query.error.value" subject="la ficha del apoderado" @retry="reload" />
    </div>
  </div>
</template>
