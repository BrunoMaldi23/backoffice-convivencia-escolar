<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import AppIcon from '@/components/AppIcon.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import PriorityBadge from '@/components/PriorityBadge.vue';
import RelatedTable from '@/components/RelatedTable.vue';
import ResourceDetailShell from '@/components/ResourceDetailShell.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import Timeline from '@/components/Timeline.vue';
import type { TimelineEntry } from '@/components/types';
import { useResource } from '@/composables/useResource';
import { formatDate, formatDateTime } from '@/lib/format';
import { submitResource } from '@/services/resources';
import type { CaseSummary } from '@/types/models';
import { documentColumns } from '../documents/documents.config';
import { followUpColumns } from '../followups/followups.config';
import { interviewColumns } from '../interviews/interviews.config';
import { measureColumns } from '../measures/measures.config';
import { referralColumns } from '../referrals/referrals.config';

defineProps<{ id: string }>();
const route = useRoute();
const router = useRouter();

const TABS = [
  ['resumen', 'Resumen'], ['involucrados', 'Involucrados'], ['antecedentes', 'Antecedentes'], ['entrevistas', 'Entrevistas'], ['medidas', 'Medidas'],
  ['protocolos', 'Protocolos'], ['evidencias', 'Evidencias'], ['documentos', 'Documentos'], ['derivaciones', 'Derivaciones'], ['seguimientos', 'Seguimientos'], ['bitacora', 'Bitácora']
] as const;
type TabKey = (typeof TABS)[number][0];
const tab = computed<TabKey>({
  get: () => (TABS.some(([k]) => k === route.query.tab) ? (route.query.tab as TabKey) : 'resumen'),
  set: (value) => router.replace({ query: { ...route.query, tab: value === 'resumen' ? undefined : value } })
});

/** La bitácora se deriva de los registros vinculados; no se inventan eventos. */
const interviews = useResource('interviews');
const measures = useResource('measures');
const referrals = useResource('referrals');
const followUps = useResource('followUps');
function logFor(c: CaseSummary): TimelineEntry[] {
  const f = c.folio;
  return [
    { id: 'creado', title: 'Caso registrado', at: c.createdAt, tone: 'info' as const, meta: c.responsible },
    ...(interviews.data.value ?? []).filter((i) => i.caseFolio === f).map((i) => ({ id: i.id, title: `Entrevista ${i.status === 'realizada' ? 'realizada' : 'programada'} con ${i.participant.toLowerCase()}`, at: i.scheduledAt, tone: 'progress' as const, meta: i.folio })),
    ...(measures.data.value ?? []).filter((m) => m.caseFolio === f).map((m) => ({ id: m.id, title: `Medida de resguardo: ${m.type}`, at: m.startDate, tone: 'warning' as const, meta: m.folio })),
    ...(referrals.data.value ?? []).filter((r) => r.caseFolio === f).map((r) => ({ id: r.id, title: `Derivación a ${r.institution}`, at: r.sentAt, tone: 'neutral' as const, meta: r.folio })),
    ...(followUps.data.value ?? []).filter((s) => s.caseFolio === f).map((s) => ({ id: s.id, title: s.type, at: s.scheduledAt, tone: s.status === 'vencida' ? 'danger' as const : 'success' as const }))
  ].sort((a, b) => b.at.localeCompare(a.at));
}

const closeOpen = ref(false);
</script>

<template>
  <ResourceDetailShell
    :id="id" resource="cases" subject="el caso" :back="{ to: { name: 'cases' }, label: 'Volver a casos' }"
    :title="(c) => `Expediente ${c.folio}`" :description="(c) => `${c.type}, ${c.course}. Ingresado el ${formatDate(c.createdAt)}.`"
  >
    <template #badges="{ item }"><StatusBadge :status="item.status" /></template>
    <template #actions="{ item }">
      <template v-if="item.status !== 'cerrado'">
        <RouterLink :to="{ name: 'cases-edit', params: { id: item.id } }" custom>
          <template #default="{ navigate, href }">
            <Button as="a" :href="href" label="Editar" severity="secondary" outlined @click="navigate"><template #icon><AppIcon name="pencil" :size="15" /></template></Button>
          </template>
        </RouterLink>
        <Button label="Cerrar caso" severity="secondary" @click="closeOpen = true" />
      </template>
    </template>

    <template #default="{ item }">
      <div class="mb-5 flex items-start gap-3 rounded-lg border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-slate-700">
        <AppIcon name="lock" :size="16" class="mt-0.5 text-sky-800" />
        <p>Expediente confidencial. La identidad de estudiantes y familias solo es visible para perfiles autorizados y cada consulta queda registrada en auditoría.</p>
      </div>

      <Tabs v-model:value="tab" scrollable>
        <TabList>
          <Tab v-for="[key, label] in TABS" :key="key" :value="key">{{ label }}</Tab>
        </TabList>
        <TabPanels class="!px-0 !pb-0 !pt-5">
          <TabPanel value="resumen">
            <div class="grid gap-6 lg:grid-cols-3">
              <SectionCard title="Datos del caso" class="lg:col-span-2">
                <DetailPanel
                  :items="[
                    { key: 'folio', label: 'Folio', value: item.folio }, { key: 'type', label: 'Tipo de situación', value: item.type },
                    { key: 'course', label: 'Curso', value: item.course }, { key: 'priority', label: 'Prioridad' }, { key: 'status', label: 'Estado' },
                    { key: 'responsible', label: 'Responsable', value: item.responsible }, { key: 'createdAt', label: 'Fecha de ingreso', value: formatDate(item.createdAt) },
                    { key: 'updatedAt', label: 'Última actualización', value: formatDateTime(item.updatedAt) }
                  ]"
                >
                  <template #item-priority><PriorityBadge :priority="item.priority" /></template>
                  <template #item-status><StatusBadge :status="item.status" /></template>
                </DetailPanel>
              </SectionCard>
              <SectionCard title="Actividad reciente">
                <Timeline v-if="logFor(item).length > 1" :entries="logFor(item).slice(0, 4)" />
                <EmptyState v-else compact icon="history" title="Sin actividad posterior al ingreso" />
              </SectionCard>
            </div>
          </TabPanel>

          <TabPanel value="involucrados">
            <SectionCard title="Personas involucradas" description="Estudiantes, apoderados y funcionarios vinculados al caso, con su rol en los hechos." flush>
              <template #actions><Button label="Agregar involucrado" size="small" outlined disabled title="Disponible al conectar el expediente" /></template>
              <EmptyState icon="users" title="Sin involucrados registrados" description="Las personas se vinculan desde el registro de comunidad educativa. Sus datos se mostrarán con los resguardos de privacidad del rol." />
            </SectionCard>
          </TabPanel>

          <TabPanel value="antecedentes">
            <SectionCard title="Antecedentes" description="Relato de los hechos, lugar y origen del caso.">
              <EmptyState compact icon="file" title="Relato no disponible" description="El relato registrado al ingresar el caso se mostrará cuando el expediente esté conectado con el servidor." />
            </SectionCard>
          </TabPanel>

          <TabPanel value="entrevistas">
            <SectionCard title="Entrevistas del caso" flush>
              <template #actions>
                <RouterLink :to="{ name: 'interviews-new' }" class="rounded text-sm font-medium text-sky-700 hover:underline">Nueva entrevista</RouterLink>
              </template>
              <RelatedTable resource="interviews" field="caseFolio" :value="item.folio" :columns="interviewColumns.filter((c) => c.field !== 'caseFolio')" detail-route="interviews-detail" label="Entrevistas" empty-title="Sin entrevistas registradas" empty-icon="message" />
            </SectionCard>
          </TabPanel>

          <TabPanel value="medidas">
            <SectionCard title="Medidas de resguardo" flush>
              <template #actions><RouterLink :to="{ name: 'measures-new' }" class="rounded text-sm font-medium text-sky-700 hover:underline">Nueva medida</RouterLink></template>
              <RelatedTable resource="measures" field="caseFolio" :value="item.folio" :columns="measureColumns.filter((c) => c.field !== 'caseFolio')" detail-route="measures-detail" label="Medidas" empty-title="Sin medidas de resguardo" empty-icon="shield" />
            </SectionCard>
          </TabPanel>

          <TabPanel value="protocolos">
            <SectionCard title="Protocolo aplicado">
              <EmptyState icon="list-checks" title="Sin protocolo activado" description="La activación de un protocolo y el registro de sus etapas se habilitarán al conectar el módulo con el servidor.">
                <Button label="Activar protocolo" outlined disabled title="Integración pendiente" />
              </EmptyState>
            </SectionCard>
          </TabPanel>

          <TabPanel value="evidencias">
            <SectionCard title="Evidencias" description="Archivos y registros que respaldan los antecedentes. Solo visibles para el equipo del caso.">
              <EmptyState icon="paperclip" title="Sin evidencias adjuntas" description="La carga de archivos requiere almacenamiento seguro en el servidor y aún no está disponible.">
                <Button label="Adjuntar evidencia" outlined disabled title="Integración pendiente" />
              </EmptyState>
            </SectionCard>
          </TabPanel>

          <TabPanel value="documentos">
            <SectionCard title="Documentos del caso" flush>
              <RelatedTable resource="documents" field="caseFolio" :value="item.folio" :columns="documentColumns.filter((c) => c.field !== 'caseFolio')" detail-route="documents-detail" label="Documentos" empty-title="Sin documentos" empty-icon="file" />
            </SectionCard>
          </TabPanel>

          <TabPanel value="derivaciones">
            <SectionCard title="Derivaciones" flush>
              <template #actions><RouterLink :to="{ name: 'referrals-new' }" class="rounded text-sm font-medium text-sky-700 hover:underline">Nueva derivación</RouterLink></template>
              <RelatedTable resource="referrals" field="caseFolio" :value="item.folio" :columns="referralColumns.filter((c) => c.field !== 'caseFolio')" detail-route="referrals-detail" label="Derivaciones" empty-title="Sin derivaciones" empty-icon="referral" />
            </SectionCard>
          </TabPanel>

          <TabPanel value="seguimientos">
            <SectionCard title="Seguimientos" flush>
              <RelatedTable resource="followUps" field="caseFolio" :value="item.folio" :columns="followUpColumns.filter((c) => c.field !== 'caseFolio')" detail-route="followups-detail" label="Seguimientos" empty-title="Sin seguimientos" empty-icon="activity" />
            </SectionCard>
          </TabPanel>

          <TabPanel value="bitacora">
            <SectionCard title="Bitácora del caso" description="Historial cronológico construido a partir de los registros vinculados.">
              <Timeline :entries="logFor(item)" />
            </SectionCard>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <ConfirmActionDialog
        v-model:visible="closeOpen" header="Cerrar caso" confirm-label="Cerrar caso" action-name="el cierre del caso"
        :message="`El caso ${item.folio} pasará a casos cerrados y quedará en modo de solo lectura. Verifique que las medidas y seguimientos estén finalizados.`"
        :action="() => submitResource('cases', 'PATCH', `/${item.id}/close`)"
      />
    </template>
  </ResourceDetailShell>
</template>
