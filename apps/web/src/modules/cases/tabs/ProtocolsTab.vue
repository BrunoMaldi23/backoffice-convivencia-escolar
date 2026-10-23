<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import AppIcon from '@/components/AppIcon.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useProtocols } from '@/composables/useAdmin';
import { useApplyProtocol, useDeleteProtocolApplication, useProtocolApplications, useRevokeProtocolApplication } from '@/composables/useCaseContent';
import { useSession } from '@/composables/useSession';
import { formatDate } from '@/lib/format';
import type { CaseRecord, ProtocolApplication, ProtocolTemplate, ProtocolVersion } from '@/types/api';

/**
 * Protocolos publicados del establecimiento y su aplicación al expediente (`POST /cases/:id/protocols/:versionId`). Una versión
 * solo puede aplicarse una vez por expediente. El catálogo se administra en Gestión, Protocolos.
 */
const props = defineProps<{ caseRecord: CaseRecord }>();
const { can } = useSession();
const protocols = useProtocols(() => props.caseRecord.establishmentId);
const applications = useProtocolApplications(() => props.caseRecord.id, () => can('protocols.read'));
const apply = useApplyProtocol(props.caseRecord.id);
const revoke = useRevokeProtocolApplication(props.caseRecord.id);
const deleteApplication = useDeleteProtocolApplication(props.caseRecord.id);
const deleteTarget = ref<ProtocolApplication | null>(null);
const deleteOpen = computed({ get: () => Boolean(deleteTarget.value), set: (value: boolean) => { if (!value) deleteTarget.value = null; } });
const target = ref<{ template: ProtocolTemplate; version: ProtocolVersion } | null>(null);
const open = computed({ get: () => Boolean(target.value), set: (v: boolean) => { if (!v) target.value = null; } });
const applicationFor = (versionId: string) => applications.data.value?.find((item) => item.protocolVersionId === versionId) ?? null;
const activeApplicationFor = (versionId: string) => applicationFor(versionId)?.revokedAt ? null : applicationFor(versionId);
const published = (template: ProtocolTemplate) => template.versions.filter((v) => v.status === 'PUBLICADO');
const revokeTarget = ref<ProtocolApplication | null>(null);
const revokeOpen = computed({ get: () => Boolean(revokeTarget.value), set: (value: boolean) => { if (!value) revokeTarget.value = null; } });
const revokeForm = reactive({ reason: '' });
function openRevoke(application: ProtocolApplication) { revokeTarget.value = application; revokeForm.reason = ''; revoke.reset(); }
async function submitRevoke() { if (!revokeTarget.value || revokeForm.reason.trim().length < 5) return; await revoke.mutateAsync({ id: revokeTarget.value.id, expectedVersion: revokeTarget.value.version, reason: revokeForm.reason.trim() }); revokeOpen.value = false; }
</script>

<template>
  <SectionCard dense title="Protocolos" description="Protocolos publicados que pueden aplicarse a este expediente.">
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
                <span v-if="applicationFor(version.id)?.revokedAt" class="text-xs text-slate-500">Revocado</span>
                <div v-else-if="activeApplicationFor(version.id)" class="flex items-center gap-1"><StatusBadge tone="success" label="Aplicado" /><Button v-if="can('protocols.read')" size="small" severity="secondary" text :aria-label="'Revocar aplicación'" title="Revocar aplicación (se conserva en el historial)" @click="openRevoke(activeApplicationFor(version.id)!)"><template #icon><AppIcon name="ban" :size="16" /></template></Button><Button v-if="can('protocols.read')" size="small" severity="danger" text :aria-label="'Eliminar aplicación definitivamente'" title="Eliminar aplicación definitivamente" @click="deleteTarget = activeApplicationFor(version.id)!"><template #icon><AppIcon name="trash" :size="16" /></template></Button></div>
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
  <MutationDialog v-model:visible="revokeOpen" header="Revocar aplicación de protocolo" submit-label="Revocar" danger :pending="revoke.isPending.value" :error="revoke.error.value" @submit="submitRevoke" @reload="applications.refetch()">
    <FormField id="protocol-revoke-reason" label="Motivo de la revocación" required help="El protocolo seguirá visible en el historial del expediente."><template #default="{ id }"><Textarea :id="id" v-model="revokeForm.reason" rows="3" auto-resize maxlength="1000" class="w-full" /></template></FormField>
  </MutationDialog>

  <ConfirmActionDialog
    v-model:visible="deleteOpen" header="Eliminar aplicación del protocolo" confirm-label="Eliminar definitivamente" danger
    :message="`Se eliminará definitivamente la aplicación de este protocolo al expediente; el protocolo publicado no se modifica. Dejará de aparecer en el expediente y en su línea de tiempo; solo quedará la auditoría de seguridad. Si necesita conservar el antecedente, use «Revocar».`"
    :action="() => deleteApplication.mutateAsync({ id: deleteTarget!.id, expectedVersion: deleteTarget!.version })"
  />
</template>
