<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import AppIcon from '@/components/AppIcon.vue';
import PersonPicker, { type PickedPerson } from '@/components/PersonPicker.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import { useCaseParticipants, useCreateParticipant, useUnlinkParticipant, useUpdateParticipantLink } from '@/composables/useCaseContent';
import { useSession } from '@/composables/useSession';
import { PARTICIPANT_KIND_OPTIONS, PARTICIPATION_OPTIONS, participantKindLabel, participationLabel } from '@/lib/catalogs';
import { formatDate } from '@/lib/format';
import { maxLength, minLength, required, validateAll } from '@/lib/validation';
import type { CaseParticipantLink, CaseRecord, ParticipantKind } from '@/types/api';

/**
 * Involucrados del expediente. Un estudiante, apoderado o funcionario se elige del directorio (se reutiliza si ya participó en otro
 * caso); si la persona no está registrada, o no es de la comunidad, se escribe un identificador de referencia (texto libre: use un
 * código interno, no datos de contacto). Luego se asocia al caso y puede desvincularse.
 */
const props = defineProps<{ caseRecord: CaseRecord }>();
const { can } = useSession();
const query = useCaseParticipants(() => props.caseRecord.id);
const create = useCreateParticipant(props.caseRecord.id);
const unlink = useUnlinkParticipant(props.caseRecord.id);
const updateLink = useUpdateParticipantLink(props.caseRecord.id);

const open = ref(false);
const toUnlink = ref<CaseParticipantLink | null>(null);
const unlinkOpen = computed({ get: () => Boolean(toUnlink.value), set: (v: boolean) => { if (!v) toUnlink.value = null; } });
const editingLink = ref<CaseParticipantLink | null>(null);
const editOpen = computed({ get: () => Boolean(editingLink.value), set: (v: boolean) => { if (!v) editingLink.value = null; } });
const editCode = ref<string | null>(null);
const DIRECTORY_PERMISSION: Partial<Record<ParticipantKind, string>> = { ESTUDIANTE: 'students.read', APODERADO: 'guardians.read', FUNCIONARIO: 'staff.read' };
const PERSON_FIELD = { ESTUDIANTE: 'studentId', APODERADO: 'guardianId', FUNCIONARIO: 'staffMemberId' } as const;
const form = reactive({ kind: 'ESTUDIANTE' as ParticipantKind | null, label: '', code: 'AFECTADO' as string | null, person: null as PickedPerson | null, manual: false });
const canPickFromDirectory = computed(() => Boolean(form.kind && DIRECTORY_PERMISSION[form.kind] && can(DIRECTORY_PERMISSION[form.kind])));
const pickerKind = computed(() => form.kind as keyof typeof PERSON_FIELD);
const pickFromDirectory = computed(() => canPickFromDirectory.value && !form.manual);
const errors = ref<Record<string, string>>({});

function openForm() { Object.assign(form, { kind: 'ESTUDIANTE', label: '', code: 'AFECTADO', person: null, manual: false }); errors.value = {}; create.reset(); open.value = true; }
function openEdit(link: CaseParticipantLink) { editingLink.value = link; editCode.value = link.participationCode; updateLink.reset(); }
watch(() => form.kind, () => { form.person = null; });
async function submit() {
  errors.value = validateAll(form, {
    kind: [required('Seleccione el tipo de involucrado.')], code: [required('Seleccione la participación.')],
    ...(pickFromDirectory.value ? { person: [required('Busque y elija a la persona en el directorio.')] } : { label: [required('Escriba el identificador de referencia.'), minLength(2), maxLength(160)] })
  }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    const person = pickFromDirectory.value ? { [PERSON_FIELD[form.kind as keyof typeof PERSON_FIELD]]: form.person!.id } : { referenceLabel: form.label.trim() };
    await create.mutateAsync({ establishmentId: props.caseRecord.establishmentId, kind: form.kind!, ...person, participationCode: form.code! });
    open.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <SectionCard dense title="Involucrados" description="Personas vinculadas al caso y su participación.">
    <template v-if="can('participants.manage')" #actions>
      <Button label="Agregar involucrado" size="small" @click="openForm"><template #icon><AppIcon name="user-plus" :size="15" /></template></Button>
    </template>
    <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" compact empty-title="Sin involucrados" empty-description="Agregue a las personas involucradas usando un código interno de referencia." empty-icon="users" subject="los involucrados" @retry="query.refetch()">
      <template #default="{ data }">
        <ul class="divide-y divide-slate-100">
          <li v-for="link in data" :key="link.id" class="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div class="min-w-0">
              <p class="break-words text-sm font-medium text-slate-900">{{ link.participant.referenceLabel }}</p>
              <p class="mt-0.5 text-xs text-slate-500">{{ participantKindLabel(link.participant.kind) }} · {{ participationLabel(link.participationCode) }} · asociado el {{ formatDate(link.linkedAt) }}</p>
            </div>
            <div v-if="can('participants.manage')" class="flex items-center gap-1">
              <Button size="small" severity="secondary" text aria-label="Editar participación" title="Editar participación" @click="openEdit(link)"><template #icon><AppIcon name="pencil" :size="16" /></template></Button>
              <Button size="small" severity="danger" text aria-label="Desvincular involucrado" title="Desvincular involucrado" @click="toUnlink = link"><template #icon><AppIcon name="trash" :size="16" /></template></Button>
            </div>
          </li>
        </ul>
      </template>
    </QueryState>
  </SectionCard>

  <MutationDialog v-model:visible="open" header="Agregar involucrado" submit-label="Agregar" :pending="create.isPending.value" :error="create.error.value" @submit="submit" @reload="query.refetch()">
    <p class="rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-900">{{ pickFromDirectory ? 'Elija a la persona del directorio: no hace falta escribir sus datos de nuevo.' : 'Use un código interno o iniciales como identificador. No escriba teléfonos, direcciones ni otros datos de contacto.' }}</p>
    <FormField id="pt-kind" label="Tipo" required :error="errors.kind">
      <template #default="{ id, invalid }"><Select v-model="form.kind" :input-id="id" :options="PARTICIPANT_KIND_OPTIONS" option-label="label" option-value="value" :invalid="invalid" class="w-full" /></template>
    </FormField>
    <template v-if="pickFromDirectory">
      <FormField id="pt-person" label="Persona" required :error="errors.person">
        <template #default="{ id, invalid, describedby }"><PersonPicker :id="id" v-model="form.person" :kind="pickerKind" :establishment-id="caseRecord.establishmentId" :invalid="invalid" :describedby="describedby" /></template>
      </FormField>
      <p class="-mt-2 text-sm text-slate-600">¿No está en el directorio? <Button label="Escribir una referencia" link size="small" class="!p-0" type="button" @click="form.manual = true" /></p>
    </template>
    <template v-else>
      <FormField id="pt-label" label="Identificador de referencia" required :error="errors.label">
        <template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.label" maxlength="160" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template>
      </FormField>
      <p v-if="canPickFromDirectory" class="-mt-2 text-sm text-slate-600"><Button label="Buscar en el directorio" link size="small" class="!p-0" type="button" @click="form.manual = false" /></p>
    </template>
    <FormField id="pt-code" label="Participación en el caso" required :error="errors.code">
      <template #default="{ id, invalid }"><Select v-model="form.code" :input-id="id" :options="PARTICIPATION_OPTIONS" option-label="label" option-value="value" :invalid="invalid" class="w-full" /></template>
    </FormField>
  </MutationDialog>

  <MutationDialog v-model:visible="editOpen" header="Editar participación" submit-label="Guardar cambios" :pending="updateLink.isPending.value" :error="updateLink.error.value" :disabled="!editCode" @submit="updateLink.mutateAsync({ id: editingLink!.id, expectedVersion: editingLink!.version, participationCode: editCode! }).then(() => (editOpen = false)).catch(() => undefined)" @reload="query.refetch()">
    <p class="text-sm text-slate-700">{{ editingLink?.participant.referenceLabel }}</p>
    <FormField id="pt-edit-code" label="Participación en el caso" required>
      <template #default="{ id }"><Select v-model="editCode" :input-id="id" :options="PARTICIPATION_OPTIONS" option-label="label" option-value="value" class="w-full" /></template>
    </FormField>
  </MutationDialog>

  <ConfirmActionDialog
    v-model:visible="unlinkOpen" header="Desvincular involucrado" confirm-label="Desvincular" danger
    :message="`Se quitará a «${toUnlink?.participant.referenceLabel ?? ''}» de este expediente. La asociación queda en el historial.`"
    :action="() => unlink.mutateAsync(toUnlink!.id)"
  />
</template>
