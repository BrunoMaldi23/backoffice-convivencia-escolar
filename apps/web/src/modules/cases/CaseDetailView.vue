<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import ErrorState from '@/components/ErrorState.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageHeader from '@/components/PageHeader.vue';
import PriorityBadge from '@/components/PriorityBadge.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useCase } from '@/composables/useCases';
import { useSession } from '@/composables/useSession';
import { formatFolio, TRANSITIONS, transitionLabel } from '@/lib/catalogs';
import { isNotFound } from '@/lib/errors';
import type { CaseStatus } from '@/types/api';
import AssignCaseDialog from './AssignCaseDialog.vue';
import EditCaseDialog from './EditCaseDialog.vue';
import TransitionDialog from './TransitionDialog.vue';
import AccessTab from './tabs/AccessTab.vue';
import DocumentsTab from './tabs/DocumentsTab.vue';
import FollowUpsTab from './tabs/FollowUpsTab.vue';
import InterviewsTab from './tabs/InterviewsTab.vue';
import MeasuresTab from './tabs/MeasuresTab.vue';
import ParticipantsTab from './tabs/ParticipantsTab.vue';
import ProtocolsTab from './tabs/ProtocolsTab.vue';
import ReportsTab from './tabs/ReportsTab.vue';
import SummaryTab from './tabs/SummaryTab.vue';
import TasksTab from './tabs/TasksTab.vue';
import TimelineTab from './tabs/TimelineTab.vue';

/**
 * Expediente de un caso. Las pestañas se montan solo al abrirse (cada una consulta su propio endpoint) y se ocultan las que el
 * rol no puede usar según la matriz inicial; el servidor sigue siendo la autoridad. `?tab=` permite enlazar una pestaña.
 */
const props = defineProps<{ id: string }>();
const route = useRoute();
const router = useRouter();
const { can } = useSession();
const query = useCase(() => props.id);
const record = computed(() => query.data.value);

const TABS = [
  { key: 'resumen', label: 'Resumen', permission: undefined }, { key: 'linea', label: 'Línea de tiempo', permission: 'cases.timeline.read' }, { key: 'denuncias', label: 'Denuncias', permission: 'reports.read' },
  { key: 'involucrados', label: 'Involucrados', permission: 'participants.read' }, { key: 'entrevistas', label: 'Entrevistas', permission: 'interviews.read' }, { key: 'documentos', label: 'Documentos', permission: 'documents.read' },
  { key: 'protocolos', label: 'Protocolos', permission: 'protocols.read' }, { key: 'medidas', label: 'Medidas', permission: 'measures.read' }, { key: 'seguimientos', label: 'Seguimientos', permission: 'follow-ups.read' },
  { key: 'tareas', label: 'Tareas', permission: 'tasks.read' }, { key: 'acceso', label: 'Accesos', permission: 'case-grants.manage' }
] as const;
const tabs = computed(() => TABS.filter((tab) => can(tab.permission)));
const tab = computed<string>({
  get: () => (tabs.value.some((t) => t.key === route.query.tab) ? String(route.query.tab) : 'resumen'),
  set: (value) => { void router.replace({ query: { ...route.query, tab: value === 'resumen' ? undefined : value } }); }
});

const editOpen = ref(false);
const assignOpen = ref(false);
const target = ref<CaseStatus | null>(null);
const transitionOpen = computed({ get: () => Boolean(target.value), set: (v: boolean) => { if (!v) target.value = null; } });
const menu = ref<InstanceType<typeof Menu> | null>(null);

/** Cierre y reapertura exigen su propio permiso además del de cambiar estado. */
const transitions = computed(() => {
  const c = record.value;
  if (!c) return [];
  return TRANSITIONS[c.status].filter((to) => can(to === 'CERRADO' ? 'cases.close' : c.status === 'CERRADO' ? 'cases.reopen' : 'cases.transition'))
    .map((to) => ({ label: transitionLabel(c.status, to), to, command: () => { target.value = to; } }));
});
const reload = () => { void query.refetch(); };
</script>

<template>
  <div>
    <LoadingState v-if="query.isPending.value" :rows="6" />
    <template v-else-if="record">
      <PageHeader :title="`${formatFolio(record.folio)} · ${record.title}`" :back="{ to: { name: 'cases' }, label: 'Volver a casos' }">
        <template #badges><StatusBadge :status="record.status" /><PriorityBadge :priority="record.priority" /></template>
        <template #actions>
          <Button v-if="can('cases.update')" label="Editar" severity="secondary" outlined @click="editOpen = true"><template #icon><AppIcon name="pencil" :size="15" /></template></Button>
          <Button v-if="can('cases.assign')" label="Asignar" severity="secondary" outlined @click="assignOpen = true"><template #icon><AppIcon name="user-plus" :size="15" /></template></Button>
          <template v-if="transitions.length">
            <Button label="Cambiar estado" aria-haspopup="menu" @click="menu?.toggle($event)"><template #icon><AppIcon name="refresh" :size="15" /></template></Button>
            <Menu ref="menu" :model="transitions" popup aria-label="Cambiar estado del caso">
              <template #item="{ item, props: p }"><a v-bind="p.action" class="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700">{{ item.label }}</a></template>
            </Menu>
          </template>
        </template>
      </PageHeader>

      <p v-if="record.status === 'CERRADO'" class="mb-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" role="status">
        <AppIcon name="lock" :size="16" class="mt-0.5 shrink-0" />Expediente cerrado. Para registrar documentos o medidas nuevas debe reabrirse.
      </p>

      <Tabs v-model:value="tab" scrollable lazy>
        <TabList><Tab v-for="t in tabs" :key="t.key" :value="t.key">{{ t.label }}</Tab></TabList>
        <TabPanels class="!px-0 !pb-0 !pt-4">
          <TabPanel value="resumen"><SummaryTab :case-record="record" /></TabPanel>
          <TabPanel v-if="can('cases.timeline.read')" value="linea"><TimelineTab :case-id="id" /></TabPanel>
          <TabPanel v-if="can('reports.read')" value="denuncias"><ReportsTab :case-id="id" /></TabPanel>
          <TabPanel v-if="can('participants.read')" value="involucrados"><ParticipantsTab :case-record="record" /></TabPanel>
          <TabPanel v-if="can('interviews.read')" value="entrevistas"><InterviewsTab :case-id="id" /></TabPanel>
          <TabPanel v-if="can('documents.read')" value="documentos"><DocumentsTab :case-record="record" /></TabPanel>
          <TabPanel v-if="can('protocols.read')" value="protocolos"><ProtocolsTab :case-record="record" /></TabPanel>
          <TabPanel v-if="can('measures.read')" value="medidas"><MeasuresTab :case-record="record" /></TabPanel>
          <TabPanel v-if="can('follow-ups.read')" value="seguimientos"><FollowUpsTab :case-id="id" /></TabPanel>
          <TabPanel v-if="can('tasks.read')" value="tareas"><TasksTab :case-id="id" /></TabPanel>
          <TabPanel v-if="can('case-grants.manage')" value="acceso"><AccessTab :case-id="id" /></TabPanel>
        </TabPanels>
      </Tabs>

      <EditCaseDialog v-model:visible="editOpen" :case-record="record" @reload="reload" />
      <AssignCaseDialog v-model:visible="assignOpen" :case-record="record" @reload="reload" />
      <TransitionDialog v-model:visible="transitionOpen" :case-record="record" :target="target" @reload="reload" />
    </template>
    <div v-else class="rounded-xl border border-slate-200 bg-white">
      <h1 class="sr-only">Expediente no disponible</h1>
      <EmptyState v-if="isNotFound(query.error.value)" icon="search" title="No se encontró el expediente" description="El expediente no existe o usted no tiene acceso a él." />
      <ErrorState v-else :error="query.error.value" subject="el expediente" @retry="reload" />
    </div>
  </div>
</template>
