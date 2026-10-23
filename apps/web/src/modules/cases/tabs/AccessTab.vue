<script setup lang="ts">
import { reactive, ref } from 'vue';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import ApiErrorMessage from '@/components/ApiErrorMessage.vue';
import FormField from '@/components/FormField.vue';
import SectionCard from '@/components/SectionCard.vue';
import UserSelect from '@/components/UserSelect.vue';
import { useGrantCaseAccess, useRevokeCaseAccess } from '@/composables/useAdmin';
import { dateToIso } from '@/lib/format';
import { maxLength, required, validateAll } from '@/lib/validation';
import type { CaseAccessLevel } from '@/types/api';

/**
 * Accesos contextuales al expediente (`POST /cases/:id/access-grants` y `…/revoke`). La API no lista los accesos vigentes, así que
 * esta pantalla solo permite conceder y revocar: para revocar se elige a la persona. Ver docs/frontend/api-integration.md.
 */
const props = defineProps<{ caseId: string }>();
const grant = useGrantCaseAccess();
const revoke = useRevokeCaseAccess();
const today = new Date();
const form = reactive({ user: null as string | null, level: 'READ' as CaseAccessLevel | null, expiresAt: null as Date | null, reason: '' });
const errors = ref<Record<string, string>>({});
const done = ref<string | null>(null);
const LEVELS = [{ value: 'READ', label: 'Solo lectura' }, { value: 'WRITE', label: 'Lectura y escritura' }];

async function submitGrant() {
  done.value = null; grant.reset(); revoke.reset();
  errors.value = validateAll(form, { user: [required('Seleccione a la persona.')], level: [required('Seleccione el nivel de acceso.')], reason: [maxLength(500)] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    await grant.mutateAsync({ caseId: props.caseId, userId: form.user!, accessLevel: form.level!, ...(form.expiresAt ? { expiresAt: dateToIso(form.expiresAt, true) } : {}), ...(form.reason.trim() ? { reason: form.reason.trim() } : {}) });
    done.value = 'El acceso fue concedido.';
  } catch { /* se muestra abajo */ }
}
async function submitRevoke() {
  done.value = null; grant.reset(); revoke.reset();
  errors.value = validateAll(form, { user: [required('Seleccione a la persona.')] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try { await revoke.mutateAsync({ caseId: props.caseId, userId: form.user! }); done.value = 'El acceso fue revocado.'; } catch { /* se muestra abajo */ }
}
</script>

<template>
  <SectionCard dense title="Accesos al expediente" description="Conceda o revoque el acceso de personas del establecimiento a este caso.">
    <form class="grid gap-4 md:grid-cols-2" novalidate @submit.prevent="submitGrant">
      <FormField id="ac-user" label="Persona" required :error="errors.user" class="md:col-span-2">
        <template #default="{ id, invalid, describedby }"><UserSelect :id="id" v-model="form.user" :invalid="invalid" :describedby="describedby" /></template>
      </FormField>
      <FormField id="ac-level" label="Nivel de acceso" required :error="errors.level">
        <template #default="{ id, invalid }"><Select v-model="form.level" :input-id="id" :options="LEVELS" option-label="label" option-value="value" :invalid="invalid" class="w-full" /></template>
      </FormField>
      <FormField id="ac-expires" label="Vence" help="Opcional. Sin fecha, el acceso no vence.">
        <template #default="{ id }"><DatePicker v-model="form.expiresAt" :input-id="id" date-format="dd-mm-yy" :min-date="today" show-icon icon-display="input" show-button-bar class="w-full" /></template>
      </FormField>
      <FormField id="ac-reason" label="Motivo" :error="errors.reason" class="md:col-span-2">
        <template #default="{ id, invalid }"><InputText :id="id" v-model="form.reason" maxlength="500" :invalid="invalid" class="w-full" /></template>
      </FormField>
      <div class="flex flex-wrap gap-2 md:col-span-2">
        <Button type="submit" label="Conceder acceso" :loading="grant.isPending.value" />
        <Button type="button" label="Revocar el acceso de esta persona" severity="danger" outlined :loading="revoke.isPending.value" @click="submitRevoke" />
      </div>
    </form>
    <p v-if="done" class="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">{{ done }}</p>
    <ApiErrorMessage class="mt-4" :error="grant.error.value ?? revoke.error.value" />
  </SectionCard>
</template>
