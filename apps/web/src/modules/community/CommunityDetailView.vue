<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import AppIcon from '@/components/AppIcon.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import RelatedTable from '@/components/RelatedTable.vue';
import ResourceDetailShell from '@/components/ResourceDetailShell.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { DetailItem } from '@/components/types';
import { caseColumns } from '../cases/cases.config';
import { COMMUNITY, type CommunityEntity } from './community.config';

/** Ficha de comunidad educativa. Las columnas del listado definen los datos visibles; no se agregan datos sensibles. */
const props = defineProps<{ entity: CommunityEntity; id: string }>();
const cfg = computed(() => COMMUNITY[props.entity]);
const items = (row: object): DetailItem[] => cfg.value.columns.map((c) => ({ key: c.field, label: c.header, value: c.kind === 'status' ? undefined : (row as Record<string, string | number>)[c.field] }));
const statusOf = (row: object) => (row as { status?: string }).status;
const titleOf = (row: object) => String((row as Record<string, unknown>)[cfg.value.titleField]);
</script>

<template>
  <ResourceDetailShell
    :id="id" :key="`${entity}-${id}`" :resource="entity" :subject="`el ${cfg.singular}`" :back="{ to: { name: entity }, label: `Volver a ${cfg.title.toLowerCase()}` }"
    :title="titleOf"
  >
    <template #badges="{ item }"><StatusBadge v-if="statusOf(item)" :status="statusOf(item)!" /></template>
    <template #actions><Button label="Editar" severity="secondary" outlined disabled title="Integración pendiente" /></template>
    <template #default="{ item }">
      <p v-if="cfg.privacy" class="mb-5 flex items-start gap-2.5 rounded-lg border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-slate-700">
        <AppIcon name="lock" :size="16" class="mt-0.5 text-sky-800" />{{ cfg.privacy }}
      </p>
      <div class="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Ficha" class="lg:col-span-2">
          <DetailPanel :items="items(item)">
            <template #item-status><StatusBadge v-if="statusOf(item)" :status="statusOf(item)!" /></template>
          </DetailPanel>
        </SectionCard>
        <SectionCard :title="entity === 'courses' ? 'Estudiantes del curso' : entity === 'guardians' ? 'Estudiantes a cargo' : 'Vínculos'">
          <EmptyState compact :icon="cfg.icon" title="Sin vínculos disponibles" description="Las relaciones entre estudiantes, apoderados y cursos se cargarán desde el servidor." />
        </SectionCard>
        <SectionCard v-if="entity === 'students' || entity === 'courses'" title="Casos de convivencia relacionados" flush class="lg:col-span-3">
          <RelatedTable
            v-if="entity === 'courses'" resource="cases" field="course" :value="titleOf(item)" :columns="caseColumns.filter((c) => c.field !== 'course')"
            detail-route="cases-detail" label="Casos del curso" empty-title="Sin casos en curso" empty-icon="check-circle"
          />
          <EmptyState v-else compact icon="folder" title="Casos visibles solo para perfiles autorizados" description="La relación entre estudiantes y casos se mostrará según los permisos de su rol." />
        </SectionCard>
      </div>
    </template>
  </ResourceDetailShell>
</template>
