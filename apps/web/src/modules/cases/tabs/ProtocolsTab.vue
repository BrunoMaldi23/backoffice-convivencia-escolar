<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useProtocols } from '@/composables/useAdmin';
import { useApplyProtocol } from '@/composables/useCaseContent';
import { useAppliedProtocolVersions } from '@/composables/useCases';
import { useSession } from '@/composables/useSession';
import { formatDate } from '@/lib/format';
import type { CaseRecord, ProtocolTemplate, ProtocolVersion } from '@/types/api';

/**
 * Protocolos publicados del establecimiento y su aplicación al expediente (`POST /cases/:id/protocols/:versionId`). Una versión
 * solo puede aplicarse una vez por expediente. El catálogo se administra en Gestión, Protocolos.
 */
const props = defineProps<{ caseRecord: CaseRecord }>();
const { can } = useSession();
const protocols = useProtocols(() => props.caseRecord.establishmentId);
const applied = useAppliedProtocolVersions(() => props.caseRecord.id, () => can('cases.timeline.read'));
const apply = useApplyProtocol(props.caseRecord.id);
const target = ref<{ template: ProtocolTemplate; version: ProtocolVersion } | null>(null);
const open = computed({ get: () => Boolean(target.value), set: (v: boolean) => { if (!v) target.value = null; } });
const isApplied = (versionId: string) => applied.data.value?.has(versionId) ?? false;
const published = (template: ProtocolTemplate) => template.versions.filter((v) => v.status === 'PUBLICADO');
</script>

<template>
  <SectionCard dense title="Protocolos" description="Protocolos publicados que pueden aplicarse a este expediente.">
    <p v-if="!can('cases.timeline.read')" class="mb-3 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">Su rol no puede consultar la línea de tiempo, por lo que no se puede indicar cuáles ya están aplicados.</p>
    <QueryState
      :data="protocols.data.value?.filter((t) => published(t).length)" :is-pending="protocols.isPending.value" :error="protocols.error.value" compact
      empty-title="No hay protocolos publicados" empty-description="Un protocolo debe publicarse en el catálogo institucional antes de poder aplicarse." empty-icon="list-checks" subject="los protocolos" @retry="protocols.refetch()"
    >
      <template #default="{ data }">
        <ul class="divide-y divide-slate-100">
          <li v-for="template in data" :key="template.id" class="py-3 first:pt-0 last:pb-0">
            <p class="text-sm font-semibold text-slate-900">{{ template.name }} <span class="font-normal text-slate-500">· {{ template.code }}</span></p>
            <ul class="mt-2 space-y-2">
              <li v-for="version in published(template)" :key="version.id" class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2">
                <span class="text-sm text-slate-700">Versión {{ version.version }}: {{ version.title }} <span class="text-xs text-slate-500">(publicada el {{ formatDate(version.publishedAt) }})</span></span>
                <StatusBadge v-if="isApplied(version.id)" tone="success" label="Aplicado" />
                <Button v-else-if="can('protocols.read')" label="Aplicar al expediente" size="small" severity="secondary" outlined @click="target = { template, version }" />
              </li>
            </ul>
          </li>
        </ul>
      </template>
    </QueryState>
  </SectionCard>

  <ConfirmActionDialog
    v-model:visible="open" header="Aplicar protocolo" confirm-label="Aplicar"
    :message="`Se aplicará «${target?.template.name ?? ''}» (versión ${target?.version.version ?? ''}) a este expediente. La aplicación queda registrada en el historial y no puede repetirse.`"
    :action="() => apply.mutateAsync(target!.version.id)"
  />
</template>
