<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import ApiErrorMessage from '@/components/ApiErrorMessage.vue';
import FormField from '@/components/FormField.vue';
import PageHeader from '@/components/PageHeader.vue';
import SectionCard from '@/components/SectionCard.vue';
import UserSelect from '@/components/UserSelect.vue';
import { caseScope, useApiMutation } from '@/composables/useApiMutation';
import { useCreateCase } from '@/composables/useCases';
import { useEstablishmentContext } from '@/composables/useEstablishmentContext';
import { useSession } from '@/composables/useSession';
import { CATEGORY_OPTIONS, CHANNEL_OPTIONS, CLASSIFICATION_OPTIONS, formatFolio } from '@/lib/catalogs';
import { dateToIso } from '@/lib/format';
import { priorityOptions } from '@/lib/status';
import { maxLength, minLength, required, validateAll } from '@/lib/validation';
import * as casesApi from '@/services/cases';
import type { CaseRecord } from '@/types/api';

/**
 * Crea un expediente (`POST /cases`) y, opcionalmente, registra su denuncia (`POST /cases/:id/reports`). Son dos escrituras:
 * si la segunda falla, el expediente ya existe y la pantalla lo indica y permite reintentar solo la denuncia.
 */
const props = withDefaults(defineProps<{ withReport?: boolean }>(), { withReport: false });
const router = useRouter();
const { can } = useSession();
const establishment = useEstablishmentContext();
const createCase = useCreateCase();
const createReport = useApiMutation((v: { caseId: string; input: Parameters<typeof casesApi.createReport>[1] }) => casesApi.createReport(v.caseId, v.input), (_d, v) => caseScope(v.caseId));

const today = new Date();
const form = reactive({
  establishmentId: null as string | null, title: '', category: null as string | null, priority: 'MEDIA' as string | null, receivedAt: today as Date | null,
  description: '', responsibleUserId: null as string | null, nextAction: '', nextActionDueAt: null as Date | null,
  channel: 'DIRECTO' as string | null, classification: 'SIN_CLASIFICAR' as string | null, factual: '', background: ''
});
const includeReport = ref(props.withReport && can('reports.create'));
const errors = ref<Record<string, string>>({});
const created = ref<CaseRecord | null>(null);
const selectedEstablishment = computed(() => form.establishmentId ?? establishment.currentId.value);
const reportAllowed = computed(() => can('reports.create'));
const pending = computed(() => createCase.isPending.value || createReport.isPending.value);
const failure = computed(() => createReport.error.value ?? createCase.error.value);

const caseRules = {
  establishmentId: [required('Seleccione el establecimiento.')], title: [required('Escriba un título para el caso.'), minLength(3), maxLength(180)], category: [required('Seleccione una categoría.')],
  priority: [required('Seleccione la prioridad.')], receivedAt: [required('Indique la fecha de recepción.')], description: [maxLength(4000)], nextAction: [maxLength(500)]
};
const reportRules = { channel: [required('Seleccione el canal de recepción.')], classification: [required('Seleccione la clasificación.')], factual: [required('Describa los hechos informados.'), minLength(3), maxLength(4000)], background: [maxLength(4000)] };

async function submit() {
  if (pending.value) return;
  const view = { ...form, establishmentId: selectedEstablishment.value };
  errors.value = validateAll(view, { ...caseRules, ...(includeReport.value ? reportRules : {}) }) as Record<string, string>;
  if (Object.keys(errors.value).length) {
    const first = Object.keys(errors.value)[0]!;
    document.getElementById(`nc-${first}`)?.focus();
    return;
  }
  if (!created.value) {
    try {
      created.value = await createCase.mutateAsync({
        establishmentId: view.establishmentId!, title: form.title.trim(), categoryCode: form.category!, priority: form.priority!, receivedAt: dateToIso(form.receivedAt!),
        ...(form.description.trim() ? { initialDescription: form.description.trim() } : {}), ...(form.responsibleUserId ? { responsibleUserId: form.responsibleUserId } : {}),
        ...(form.nextAction.trim() ? { nextAction: form.nextAction.trim() } : {}), ...(form.nextActionDueAt ? { nextActionDueAt: dateToIso(form.nextActionDueAt) } : {})
      });
    } catch {
      return;
    }
  }
  if (includeReport.value) {
    try {
      await createReport.mutateAsync({ caseId: created.value.id, input: { receivedAt: dateToIso(form.receivedAt!), channelCode: form.channel!, classificationCode: form.classification!, factualDescription: form.factual.trim(), ...(form.background.trim() ? { background: form.background.trim() } : {}) } });
    } catch {
      return;
    }
  }
  await router.push({ name: 'cases-detail', params: { id: created.value.id }, query: includeReport.value ? { tab: 'denuncias' } : {} });
}
</script>

<template>
  <div class="max-w-4xl">
    <PageHeader :title="withReport ? 'Registrar denuncia' : 'Nuevo caso'" :description="withReport ? 'Registre la denuncia recibida; se creará el expediente que la contiene.' : 'Registre un caso de convivencia escolar. Los campos con asterisco son obligatorios.'" :back="{ to: withReport ? { name: 'complaints' } : { name: 'cases' }, label: withReport ? 'Volver a denuncias' : 'Volver a casos' }" />

    <Message v-if="!establishment.isPending.value && !establishment.currentId.value" severity="warn" :closable="false" class="mb-5">
      No se pudo determinar el establecimiento. Su rol no puede consultar los establecimientos y todavía no tiene expedientes a los que deducirlo. Solicite a la administración que le conceda acceso a los datos institucionales.
    </Message>

    <Message v-if="created" severity="warn" :closable="false" class="mb-5" role="status">
      El expediente <strong>{{ formatFolio(created.folio) }}</strong> ya fue creado, pero la denuncia no se pudo registrar. Corrija lo indicado y vuelva a enviar: solo se reintentará la denuncia.
      <RouterLink :to="{ name: 'cases-detail', params: { id: created.id } }" class="ml-1 font-medium underline">Abrir el expediente</RouterLink>
    </Message>

    <form novalidate class="space-y-6" @submit.prevent="submit">
      <SectionCard title="Identificación del caso" description="El folio se asigna automáticamente al guardar.">
        <fieldset :disabled="Boolean(created)" class="grid gap-5 md:grid-cols-2">
          <FormField v-if="establishment.options.value.length > 1" id="nc-establishmentId" label="Establecimiento" required :error="errors.establishmentId" class="md:col-span-2">
            <template #default="{ id, invalid, describedby }">
              <Select v-model="form.establishmentId" :input-id="id" :options="establishment.options.value" option-label="label" option-value="value" :invalid="invalid" :aria-describedby="describedby" :placeholder="establishment.nameOf(selectedEstablishment ?? '')" class="w-full" />
            </template>
          </FormField>
          <FormField id="nc-title" label="Título" required help="Describa la situación sin incluir datos personales innecesarios." :error="errors.title" class="md:col-span-2">
            <template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.title" maxlength="180" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
          </FormField>
          <FormField id="nc-category" label="Categoría" required :error="errors.category">
            <template #default="{ id, invalid, describedby }"><Select v-model="form.category" :input-id="id" :options="CATEGORY_OPTIONS" option-label="label" option-value="value" :invalid="invalid" :aria-describedby="describedby" placeholder="Seleccione una categoría" class="w-full" /></template>
          </FormField>
          <FormField id="nc-priority" label="Prioridad" required :error="errors.priority">
            <template #default="{ id, invalid, describedby }"><Select v-model="form.priority" :input-id="id" :options="priorityOptions" option-label="label" option-value="value" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
          </FormField>
          <FormField id="nc-receivedAt" label="Fecha de recepción" required :error="errors.receivedAt">
            <template #default="{ id, invalid, describedby }"><DatePicker v-model="form.receivedAt" :input-id="id" date-format="dd-mm-yy" :max-date="today" :invalid="invalid" :aria-describedby="describedby" show-icon icon-display="input" class="w-full" /></template>
          </FormField>
          <FormField id="nc-responsibleUserId" label="Responsable" help="Opcional. Puede asignarlo después desde el expediente.">
            <template #default="{ id, describedby }"><UserSelect :id="id" v-model="form.responsibleUserId" :describedby="describedby" show-clear /></template>
          </FormField>
          <FormField id="nc-description" label="Descripción inicial" :error="errors.description" class="md:col-span-2">
            <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="form.description" rows="4" auto-resize maxlength="4000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
          </FormField>
          <FormField id="nc-nextAction" label="Próxima acción" :error="errors.nextAction">
            <template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.nextAction" maxlength="500" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
          </FormField>
          <FormField id="nc-nextActionDueAt" label="Plazo de la próxima acción">
            <template #default="{ id }"><DatePicker v-model="form.nextActionDueAt" :input-id="id" date-format="dd-mm-yy" :min-date="today" show-icon icon-display="input" class="w-full" /></template>
          </FormField>
        </fieldset>
      </SectionCard>

      <SectionCard v-if="reportAllowed" title="Denuncia" description="Registro interno de lo informado. No existe un portal público de denuncias.">
        <div class="flex items-center gap-3">
          <Checkbox v-model="includeReport" input-id="nc-includeReport" binary :disabled="withReport && !created" />
          <label for="nc-includeReport" class="text-sm font-medium text-slate-800">Registrar una denuncia junto con el caso</label>
        </div>
        <div v-if="includeReport" class="mt-5 grid gap-5 md:grid-cols-2">
          <FormField id="nc-channel" label="Canal de recepción" required :error="errors.channel">
            <template #default="{ id, invalid, describedby }"><Select v-model="form.channel" :input-id="id" :options="CHANNEL_OPTIONS" option-label="label" option-value="value" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
          </FormField>
          <FormField id="nc-classification" label="Clasificación" required :error="errors.classification">
            <template #default="{ id, invalid, describedby }"><Select v-model="form.classification" :input-id="id" :options="CLASSIFICATION_OPTIONS" option-label="label" option-value="value" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
          </FormField>
          <FormField id="nc-factual" label="Relato de los hechos" required help="Transcriba lo informado sin interpretar ni incluir información innecesaria." :error="errors.factual" class="md:col-span-2">
            <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="form.factual" rows="5" auto-resize maxlength="4000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
          </FormField>
          <FormField id="nc-background" label="Antecedentes" :error="errors.background" class="md:col-span-2">
            <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="form.background" rows="3" auto-resize maxlength="4000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
          </FormField>
        </div>
      </SectionCard>

      <ApiErrorMessage :error="failure" />

      <div class="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        <RouterLink :to="withReport ? { name: 'complaints' } : { name: 'cases' }" custom>
          <template #default="{ navigate, href }"><Button as="a" :href="href" label="Cancelar" severity="secondary" text @click="navigate" /></template>
        </RouterLink>
        <Button type="submit" :label="created ? 'Reintentar el registro de la denuncia' : includeReport ? 'Crear caso y registrar denuncia' : 'Crear caso'" :loading="pending" :disabled="!selectedEstablishment" />
      </div>
    </form>
  </div>
</template>
