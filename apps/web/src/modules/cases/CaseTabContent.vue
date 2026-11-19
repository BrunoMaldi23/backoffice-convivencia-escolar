<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import type { CaseRecord } from '@/types/api';

const props = defineProps<{ tab: string; caseId: string; caseRecord: CaseRecord }>();

// Cada pestaña se descarga recién cuando se abre. Así el ingreso a un expediente
// no arrastra formularios, tablas y selectores de las doce secciones restantes.
const SummaryTab = defineAsyncComponent(() => import('./tabs/SummaryTab.vue'));
const TimelineTab = defineAsyncComponent(() => import('./tabs/TimelineTab.vue'));
const ReportsTab = defineAsyncComponent(() => import('./tabs/ReportsTab.vue'));
const ParticipantsTab = defineAsyncComponent(() => import('./tabs/ParticipantsTab.vue'));
const InterviewsTab = defineAsyncComponent(() => import('./tabs/InterviewsTab.vue'));
const DocumentsTab = defineAsyncComponent(() => import('./tabs/DocumentsTab.vue'));
const ProtocolsTab = defineAsyncComponent(() => import('./tabs/ProtocolsTab.vue'));
const MeasuresTab = defineAsyncComponent(() => import('./tabs/MeasuresTab.vue'));
const FollowUpsTab = defineAsyncComponent(() => import('./tabs/FollowUpsTab.vue'));
const SummonsTab = defineAsyncComponent(() => import('./tabs/SummonsTab.vue'));
const ReferralsTab = defineAsyncComponent(() => import('./tabs/ReferralsTab.vue'));
const AccessTab = defineAsyncComponent(() => import('./tabs/AccessTab.vue'));
</script>

<template>
  <SummaryTab v-if="props.tab === 'resumen'" :case-record="props.caseRecord" />
  <TimelineTab v-else-if="props.tab === 'linea'" :case-id="props.caseId" />
  <ReportsTab v-else-if="props.tab === 'denuncias'" :case-id="props.caseId" />
  <ParticipantsTab v-else-if="props.tab === 'involucrados'" :case-record="props.caseRecord" />
  <InterviewsTab v-else-if="props.tab === 'entrevistas'" :case-id="props.caseId" />
  <DocumentsTab v-else-if="props.tab === 'documentos'" :case-record="props.caseRecord" />
  <ProtocolsTab v-else-if="props.tab === 'protocolos'" :case-record="props.caseRecord" />
  <MeasuresTab v-else-if="props.tab === 'medidas'" :case-record="props.caseRecord" />
  <FollowUpsTab v-else-if="props.tab === 'seguimientos'" :case-id="props.caseId" />
  <SummonsTab v-else-if="props.tab === 'citaciones'" :case-record="props.caseRecord" />
  <ReferralsTab v-else-if="props.tab === 'derivaciones'" :case-record="props.caseRecord" />
  <AccessTab v-else-if="props.tab === 'acceso'" :case-id="props.caseId" />
</template>
