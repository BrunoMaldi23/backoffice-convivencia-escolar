<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import AppIcon from '@/components/AppIcon.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import ErrorState from '@/components/ErrorState.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageHeader from '@/components/PageHeader.vue';
import PriorityBadge from '@/components/PriorityBadge.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { DetailItem } from '@/components/types';
import { useStudent, useStudentCases, useUnlinkStudentGuardian } from '@/composables/useCommunity';
import { useSession } from '@/composables/useSession';
import { formatFolio, participationLabel, relationshipLabel } from '@/lib/catalogs';
import { isNotFound } from '@/lib/errors';
import { formatCalendarDate, formatDate, fullName } from '@/lib/format';
import { formatRut } from '@/lib/rut';
import type { StudentGuardianLink } from '@/types/api';
import LinkGuardianDialog from './LinkGuardianDialog.vue';
import StudentFormDialog from './StudentFormDialog.vue';

/**
 * Ficha del estudiante: datos (`GET /students/:id`), apoderados asociados y expedientes visibles donde figura como involucrado
 * (`GET /students/:id/cases`, limitado a los casos que la persona puede ver).
 */
const props = defineProps<{ id: string }>();
const { can } = useSession();
const query = useStudent(() => props.id);
const student = computed(() => query.data.value);
const casesQuery = useStudentCases(() => props.id, () => can('cases.read'));
const unlink = useUnlinkStudentGuardian();

const editOpen = ref(false);
const linkOpen = ref(false);
const toUnlink = ref<StudentGuardianLink | null>(null);
const unlinkOpen = computed({ get: () => Boolean(toUnlink.value), set: (v: boolean) => { if (!v) toUnlink.value = null; } });

const details = computed<DetailItem[]>(() => {
  const s = student.value;
  return s ? [
    { key: 'rut', label: 'RUT', value: formatRut(s.rut) }, { key: 'birth', label: 'Fecha de nacimiento', value: formatCalendarDate(s.birthDate) },
    { key: 'course', label: 'Curso', value: s.course ? `${s.course.name} (${s.course.academicYear})` : 'Sin curso' }, { key: 'created', label: 'Registrado el', value: formatDate(s.createdAt) }
  ] : [];
});
const reload = () => { void query.refetch(); };
</script>

<template>
  <div>
    <LoadingState v-if="query.isPending.value" :rows="5" />
    <template v-else-if="student">
      <PageHeader :title="fullName(student)" :back="{ to: { name: 'students' }, label: 'Volver a estudiantes' }">
        <template #badges><StatusBadge :status="student.isActive ? 'ACTIVO' : 'INACTIVO'" /></template>
        <template v-if="can('students.manage')" #actions><Button label="Editar" severity="secondary" outlined @click="editOpen = true"><template #icon><AppIcon name="pencil" :size="15" /></template></Button></template>
      </PageHeader>

      <div class="grid gap-4 lg:grid-cols-2">
        <SectionCard dense title="Datos del estudiante"><DetailPanel :items="details" /></SectionCard>

        <SectionCard dense title="Apoderados" description="Personas responsables del estudiante.">
          <template v-if="can('students.manage') && can('guardians.manage')" #actions><Button label="Agregar" size="small" @click="linkOpen = true"><template #icon><AppIcon name="user-plus" :size="15" /></template></Button></template>
          <EmptyState v-if="!student.guardianLinks.length" compact icon="users" title="Sin apoderados asociados" description="Agregue al menos un apoderado/a para poder citarle y contactarle." />
          <ul v-else class="divide-y divide-slate-100">
            <li v-for="link in student.guardianLinks" :key="link.guardianId" class="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div class="min-w-0">
                <p class="break-words text-sm font-medium text-slate-900">
                  <RouterLink v-if="can('guardians.read')" :to="{ name: 'guardians-detail', params: { id: link.guardianId } }" class="rounded text-sky-800 hover:underline">{{ fullName(link.guardian) }}</RouterLink>
                  <template v-else>{{ fullName(link.guardian) }}</template>
                  <span v-if="link.isPrimary" class="ml-2 rounded bg-sky-50 px-1.5 py-0.5 text-xs font-medium text-sky-800">Principal</span>
                </p>
                <p class="mt-0.5 break-words text-xs text-slate-500">{{ relationshipLabel(link.relationship) }}<template v-if="link.guardian.phone"> · {{ link.guardian.phone }}</template><template v-if="link.guardian.email"> · {{ link.guardian.email }}</template></p>
              </div>
              <Button v-if="can('students.manage') && can('guardians.manage')" label="Quitar" size="small" severity="danger" text @click="toUnlink = link" />
            </li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard v-if="can('cases.read')" class="mt-4" dense title="Expedientes" description="Casos a los que tiene acceso donde este estudiante figura como involucrado.">
        <QueryState :data="casesQuery.data.value" :is-pending="casesQuery.isPending.value" :error="casesQuery.error.value" compact empty-icon="folder" empty-title="Sin expedientes visibles" empty-description="No hay expedientes a su alcance donde figure este estudiante." subject="los expedientes" @retry="casesQuery.refetch()">
          <template #default="{ data }">
            <ul class="divide-y divide-slate-100">
              <li v-for="item in data" :key="item.id" class="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div class="min-w-0">
                  <RouterLink :to="{ name: 'cases-detail', params: { id: item.id } }" class="break-words text-sm font-medium text-sky-800 hover:underline">{{ formatFolio(item.folio) }} · {{ item.title }}</RouterLink>
                  <p class="mt-0.5 text-xs text-slate-500">{{ participationLabel(item.participationCode) }} · recibido el {{ formatDate(item.receivedAt) }}</p>
                </div>
                <div class="flex items-center gap-2"><StatusBadge :status="item.status" /><PriorityBadge :priority="item.priority" /></div>
              </li>
            </ul>
          </template>
        </QueryState>
      </SectionCard>

      <StudentFormDialog v-model:visible="editOpen" :establishment-id="student.establishmentId" :student="student" @reload="reload" />
      <LinkGuardianDialog v-model:visible="linkOpen" :student-id="student.id" :establishment-id="student.establishmentId" @reload="reload" />
      <ConfirmActionDialog
        v-model:visible="unlinkOpen" header="Quitar apoderado/a" confirm-label="Quitar" danger
        :message="`Se quitará la relación entre ${fullName(student)} y ${toUnlink ? fullName(toUnlink.guardian) : ''}. La persona seguirá registrada como apoderado/a.`"
        :action="() => unlink.mutateAsync({ studentId: student!.id, guardianId: toUnlink!.guardianId })"
      />
    </template>
    <div v-else class="rounded-xl border border-slate-200 bg-white">
      <h1 class="sr-only">Estudiante no disponible</h1>
      <EmptyState v-if="isNotFound(query.error.value)" icon="search" title="No se encontró al estudiante" description="El registro no existe o usted no pertenece a su establecimiento." />
      <ErrorState v-else :error="query.error.value" subject="la ficha del estudiante" @retry="reload" />
    </div>
  </div>
</template>
