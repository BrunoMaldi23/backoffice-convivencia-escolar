<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import AppIcon from '@/components/AppIcon.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useCaseReferrals, useCreateReferral, useUpdateReferral } from '@/composables/useCaseActions';
import { useSession } from '@/composables/useSession';
import { REFERRAL_TYPE_OPTIONS, referralTypeLabel } from '@/lib/catalogs';
import { formatDate } from '@/lib/format';
import { maxLength, minLength, required, validateAll } from '@/lib/validation';
import type { CaseRecord, CaseReferral, ReferralStatus } from '@/types/api';

/**
 * Derivaciones a la red externa (salud, OPD, tribunales, etc.). Avanzan por estados: pendiente → enviada → con respuesta →
 * cerrada, con control de versión. Una derivación cerrada ya no se modifica; el servidor valida las transiciones.
 */
const props = defineProps<{ caseRecord: CaseRecord }>();
const { can } = useSession();
const query = useCaseReferrals(() => props.caseRecord.id);
const create = useCreateReferral(props.caseRecord.id);
const update = useUpdateReferral(props.caseRecord.id);
const closed = computed(() => props.caseRecord.status === 'CERRADO');

const open = ref(false);
const form = reactive({ typeCode: 'SALUD' as string | null, institutionName: '', reason: '', contactName: '' });
const errors = ref<Record<string, string>>({});
function openForm() { Object.assign(form, { typeCode: 'SALUD', institutionName: '', reason: '', contactName: '' }); errors.value = {}; create.reset(); open.value = true; }
async function submit() {
  errors.value = validateAll(form, { typeCode: [required('Seleccione el tipo de institución.')], institutionName: [required('Indique la institución o el centro.'), minLength(2), maxLength(200)], reason: [required('Indique el motivo de la derivación.'), minLength(3), maxLength(2000)], contactName: [maxLength(160)] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    await create.mutateAsync({ typeCode: form.typeCode!, institutionName: form.institutionName.trim(), reason: form.reason.trim(), ...(form.contactName.trim() ? { contactName: form.contactName.trim() } : {}) });
    open.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}

const NEXT: Record<ReferralStatus, { status: ReferralStatus; label: string }[]> = {
  PENDIENTE: [{ status: 'ENVIADA', label: 'Marcar como enviada' }, { status: 'CERRADA', label: 'Cerrar sin enviar' }],
  ENVIADA: [{ status: 'CON_RESPUESTA', label: 'Registrar respuesta' }, { status: 'CERRADA', label: 'Cerrar derivación' }],
  CON_RESPUESTA: [{ status: 'CERRADA', label: 'Cerrar derivación' }], CERRADA: []
};
const acting = ref<{ referral: CaseReferral; status: ReferralStatus; label: string } | null>(null);
const actOpen = computed({ get: () => Boolean(acting.value), set: (v: boolean) => { if (!v) acting.value = null; } });
const act = reactive({ note: '', contact: '' });
const actErrors = ref<Record<string, string>>({});
function openAct(referral: CaseReferral, next: { status: ReferralStatus; label: string }) { acting.value = { referral, ...next }; Object.assign(act, { note: referral.responseNote ?? '', contact: referral.contactName ?? '' }); actErrors.value = {}; update.reset(); }
async function submitAct() {
  const current = acting.value;
  if (!current) return;
  actErrors.value = validateAll(act, { note: [current.status === 'CON_RESPUESTA' ? required('Resuma la respuesta recibida.') : maxLength(2000), maxLength(2000)], contact: [maxLength(160)] }) as Record<string, string>;
  if (Object.keys(actErrors.value).length) return;
  try {
    await update.mutateAsync({ id: current.referral.id, expectedVersion: current.referral.version, status: current.status, contactName: act.contact.trim() || null, responseNote: act.note.trim() || null });
    actOpen.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <SectionCard dense title="Derivaciones" description="Casos derivados a instituciones de la red y su respuesta.">
    <template v-if="can('referrals.manage')" #actions>
      <Button label="Nueva derivación" size="small" :disabled="closed" :title="closed ? 'Reabra el expediente para registrar derivaciones' : undefined" @click="openForm"><template #icon><AppIcon name="plus" :size="15" /></template></Button>
    </template>
    <p v-if="closed" class="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">El expediente está cerrado: reábralo para registrar derivaciones nuevas.</p>
    <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" compact empty-title="Sin derivaciones" empty-description="Registre cuando el caso se derive a salud, OPD, tribunales u otra institución." empty-icon="referral" subject="las derivaciones" @retry="query.refetch()">
      <template #default="{ data }">
        <ul class="space-y-3">
          <li v-for="r in data" :key="r.id" class="rounded-lg border border-slate-200 p-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0"><p class="break-words text-sm font-semibold text-slate-900">{{ r.institutionName }}</p><p class="text-xs text-slate-500">{{ referralTypeLabel(r.typeCode) }}</p></div>
              <StatusBadge :status="r.status" />
            </div>
            <p class="mt-1 whitespace-pre-line text-sm text-slate-700">{{ r.reason }}</p>
            <dl class="mt-3 grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
              <div class="flex gap-1"><dt class="text-slate-500">Registrada:</dt><dd class="tabular-nums">{{ formatDate(r.createdAt) }}</dd></div>
              <div v-if="r.contactName" class="flex gap-1"><dt class="text-slate-500">Contacto:</dt><dd class="break-words">{{ r.contactName }}</dd></div>
              <div v-if="r.sentAt" class="flex gap-1"><dt class="text-slate-500">Enviada:</dt><dd class="tabular-nums">{{ formatDate(r.sentAt) }}</dd></div>
              <div v-if="r.responseAt" class="flex gap-1"><dt class="text-slate-500">Respuesta:</dt><dd class="tabular-nums">{{ formatDate(r.responseAt) }}</dd></div>
              <div v-if="r.closedAt" class="flex gap-1"><dt class="text-slate-500">Cerrada:</dt><dd class="tabular-nums">{{ formatDate(r.closedAt) }}</dd></div>
              <div v-if="r.responseNote" class="flex gap-1 sm:col-span-2"><dt class="text-slate-500">Respuesta recibida:</dt><dd class="whitespace-pre-line break-words">{{ r.responseNote }}</dd></div>
            </dl>
            <div v-if="can('referrals.manage') && NEXT[r.status].length && !closed" class="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Button v-for="(next, index) in NEXT[r.status]" :key="next.status" :label="next.label" size="small" :severity="index === 0 ? undefined : 'secondary'" :outlined="index !== 0" @click="openAct(r, next)" />
            </div>
          </li>
        </ul>
      </template>
    </QueryState>
  </SectionCard>

  <MutationDialog v-model:visible="open" header="Nueva derivación" submit-label="Registrar derivación" :pending="create.isPending.value" :error="create.error.value" @submit="submit" @reload="query.refetch()">
    <FormField id="rf-type" label="Tipo de institución" required :error="errors.typeCode"><template #default="{ id, invalid }"><Select v-model="form.typeCode" :input-id="id" :options="REFERRAL_TYPE_OPTIONS" option-label="label" option-value="value" :invalid="invalid" class="w-full" /></template></FormField>
    <FormField id="rf-inst" label="Institución o centro" required :error="errors.institutionName"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.institutionName" maxlength="200" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
    <FormField id="rf-contact" label="Persona de contacto" help="Opcional." :error="errors.contactName"><template #default="{ id, invalid }"><InputText :id="id" v-model="form.contactName" maxlength="160" :invalid="invalid" autocomplete="off" class="w-full" /></template></FormField>
    <FormField id="rf-why" label="Motivo de la derivación" required :error="errors.reason"><template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="form.reason" rows="3" auto-resize maxlength="2000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template></FormField>
  </MutationDialog>

  <MutationDialog v-model:visible="actOpen" :header="acting?.label ?? ''" submit-label="Guardar" :pending="update.isPending.value" :error="update.error.value" @submit="submitAct" @reload="query.refetch()">
    <p v-if="acting" class="text-sm text-slate-700">{{ acting.referral.institutionName }} · {{ referralTypeLabel(acting.referral.typeCode) }}</p>
    <FormField id="ra-contact" label="Persona de contacto" :error="actErrors.contact"><template #default="{ id, invalid }"><InputText :id="id" v-model="act.contact" maxlength="160" :invalid="invalid" autocomplete="off" class="w-full" /></template></FormField>
    <FormField id="ra-note" :label="acting?.status === 'CON_RESPUESTA' ? 'Respuesta recibida' : 'Respuesta o nota (opcional)'" :required="acting?.status === 'CON_RESPUESTA'" :error="actErrors.note"><template #default="{ id, invalid }"><Textarea :id="id" v-model="act.note" rows="3" auto-resize maxlength="2000" :invalid="invalid" class="w-full" /></template></FormField>
    <p v-if="acting?.status === 'CERRADA'" class="text-xs text-slate-500">Al cerrar la derivación ya no podrá modificarse.</p>
  </MutationDialog>
</template>
