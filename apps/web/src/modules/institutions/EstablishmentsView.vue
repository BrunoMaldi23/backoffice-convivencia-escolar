<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import AppIcon from '@/components/AppIcon.vue';
import AppTable from '@/components/AppTable.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import UserSelect from '@/components/UserSelect.vue';
import type { ColumnDef } from '@/components/types';
import { useCreateEstablishment, useCreateStage, useEstablishments, useSetMembership, useUpdateEstablishment } from '@/composables/useAdmin';
import { useSession } from '@/composables/useSession';
import { formatDate } from '@/lib/format';
import { maxLength, minLength, required, validateAll } from '@/lib/validation';
import type { Establishment } from '@/types/api';

/**
 * Gestión institucional: establecimientos (`GET/POST/PATCH /establishments`), membresías de personas y etapas de expediente
 * (`POST …/stages`). La API no lista etapas ni membresías, así que esas dos acciones solo permiten crear o cambiar, no consultar.
 */
const { can } = useSession();
const query = useEstablishments();
const create = useCreateEstablishment();
const update = useUpdateEstablishment();
const membership = useSetMembership();
const stage = useCreateStage();
const canManage = computed(() => can('institutions.manage'));

const columns: ColumnDef[] = [{ field: 'name', header: 'Establecimiento' }, { field: 'code', header: 'Código', minScreen: 'sm' }, { field: 'institutionalIdentifier', header: 'Identificador', minScreen: 'lg' }, { field: 'isActive', header: 'Estado' }, { field: 'createdAt', header: 'Creación', minScreen: 'xl' }];
type Dialog = 'create' | 'edit' | 'members' | 'stage';
const dialog = ref<Dialog | null>(null);
const open = computed({ get: () => dialog.value !== null, set: (v: boolean) => { if (!v) dialog.value = null; } });
const target = ref<Establishment | null>(null);
const form = reactive({ code: '', name: '', identifier: '', isActive: true, user: null as string | null, memberActive: true, stageCode: '', stageName: '', stageOrder: 1 as number | null });
const errors = ref<Record<string, string>>({});
const notice = ref<string | null>(null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function show(kind: Dialog, row: Establishment | null = null) {
  target.value = row; dialog.value = kind; errors.value = {}; notice.value = null;
  create.reset(); update.reset(); membership.reset(); stage.reset();
  Object.assign(form, { code: '', name: row?.name ?? '', identifier: row?.institutionalIdentifier ?? '', isActive: row?.isActive ?? true, user: null, memberActive: true, stageCode: '', stageName: '', stageOrder: 1 });
}
const mutation = computed(() => (dialog.value === 'create' ? create : dialog.value === 'edit' ? update : dialog.value === 'members' ? membership : stage));
const header = computed(() => ({ create: 'Nuevo establecimiento', edit: 'Editar establecimiento', members: 'Membresía de una persona', stage: 'Nueva etapa de expediente' })[dialog.value ?? 'create']);
const submitLabel = computed(() => ({ create: 'Crear', edit: 'Guardar cambios', members: 'Guardar membresía', stage: 'Crear etapa' })[dialog.value ?? 'create']);

async function submit() {
  const kind = dialog.value!;
  const rules = {
    create: { code: [required('Escriba el código.'), minLength(2), maxLength(40)], name: [required('Escriba el nombre.'), minLength(3), maxLength(180)], identifier: [maxLength(80)] },
    edit: { name: [required('Escriba el nombre.'), minLength(3), maxLength(180)], identifier: [maxLength(80)] },
    members: { user: [required('Seleccione a la persona.')] },
    stage: { stageCode: [required('Escriba el código.'), minLength(2), maxLength(40)], stageName: [required('Escriba el nombre.'), minLength(2), maxLength(120)], stageOrder: [required('Indique el orden.')] }
  }[kind];
  errors.value = validateAll(form, rules as never) as Record<string, string>;
  if (kind === 'members' && form.user && !UUID.test(form.user)) errors.value.user = 'El identificador no es válido.';
  if (Object.keys(errors.value).length) return;
  try {
    if (kind === 'create') await create.mutateAsync({ code: form.code.trim(), name: form.name.trim(), ...(form.identifier.trim() ? { institutionalIdentifier: form.identifier.trim() } : {}) });
    else if (kind === 'edit') await update.mutateAsync({ id: target.value!.id, name: form.name.trim(), institutionalIdentifier: form.identifier.trim() || null, isActive: form.isActive });
    else if (kind === 'members') { await membership.mutateAsync({ establishmentId: target.value!.id, userId: form.user!, isActive: form.memberActive }); notice.value = 'La membresía fue actualizada.'; }
    else { await stage.mutateAsync({ establishmentId: target.value!.id, code: form.stageCode.trim(), name: form.stageName.trim(), displayOrder: form.stageOrder! }); notice.value = 'La etapa fue creada.'; }
    dialog.value = null;
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <div>
    <PageHeader title="Establecimientos" description="Establecimientos del sistema, las personas que pertenecen a cada uno y las etapas de sus expedientes.">
      <template #actions><Button v-if="canManage" label="Nuevo establecimiento" @click="show('create')"><template #icon><AppIcon name="plus" :size="16" /></template></Button></template>
    </PageHeader>
    <p v-if="notice" class="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status"><AppIcon name="check-circle" :size="16" class="mt-0.5 shrink-0" />{{ notice }}</p>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Establecimientos">
      <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" subject="los establecimientos" empty-icon="building" empty-title="No hay establecimientos" empty-description="Cree el primer establecimiento para comenzar a registrar expedientes." @retry="query.refetch()">
        <template #default="{ data }">
          <AppTable :rows="data" :columns="columns" label="Establecimientos" :page-size="10">
            <template #cell-name="{ row }"><span class="font-medium">{{ row.name }}</span></template>
            <template #cell-institutionalIdentifier="{ row }">{{ row.institutionalIdentifier ?? '—' }}</template>
            <template #cell-isActive="{ row }"><StatusBadge :status="row.isActive ? 'ACTIVO' : 'INACTIVO'" /></template>
            <template #cell-createdAt="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatDate(row.createdAt) }}</span></template>
            <template #actions="{ row }">
              <template v-if="canManage">
                <Button label="Editar" size="small" severity="secondary" text @click="show('edit', row)" />
                <Button label="Membresía" size="small" severity="secondary" text @click="show('members', row)" />
                <Button label="Nueva etapa" size="small" severity="secondary" text @click="show('stage', row)" />
              </template>
            </template>
          </AppTable>
        </template>
      </QueryState>
    </section>

    <MutationDialog v-model:visible="open" :header="header" :submit-label="submitLabel" :pending="mutation.isPending.value" :error="mutation.error.value" @submit="submit">
      <template v-if="dialog === 'create' || dialog === 'edit'">
        <FormField v-if="dialog === 'create'" id="es-code" label="Código" required :error="errors.code"><template #default="{ id, invalid }"><InputText :id="id" v-model="form.code" maxlength="40" :invalid="invalid" class="w-full uppercase" /></template></FormField>
        <FormField id="es-name" label="Nombre" required :error="errors.name"><template #default="{ id, invalid }"><InputText :id="id" v-model="form.name" maxlength="180" :invalid="invalid" class="w-full" /></template></FormField>
        <FormField id="es-ident" label="Identificador institucional" help="Opcional, por ejemplo el RBD." :error="errors.identifier"><template #default="{ id, invalid }"><InputText :id="id" v-model="form.identifier" maxlength="80" :invalid="invalid" class="w-full" /></template></FormField>
        <div v-if="dialog === 'edit'" class="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
          <label for="es-active" class="text-sm text-slate-800"><span class="block font-medium">Establecimiento activo</span><span class="block text-xs text-slate-500">Un establecimiento inactivo no permite crear ni consultar expedientes.</span></label>
          <ToggleSwitch v-model="form.isActive" input-id="es-active" />
        </div>
      </template>
      <template v-else-if="dialog === 'members'">
        <p class="text-sm text-slate-700">Establecimiento: <strong>{{ target?.name }}</strong>. La API no lista las membresías; aquí solo se incorpora o se retira a una persona.</p>
        <FormField id="es-user" label="Persona" required :error="errors.user"><template #default="{ id, invalid, describedby }"><UserSelect :id="id" v-model="form.user" :invalid="invalid" :describedby="describedby" all-active-users /></template></FormField>
        <div class="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3"><label for="es-member" class="text-sm font-medium text-slate-800">Membresía activa</label><ToggleSwitch v-model="form.memberActive" input-id="es-member" /></div>
      </template>
      <template v-else-if="dialog === 'stage'">
        <p class="text-sm text-slate-700">Establecimiento: <strong>{{ target?.name }}</strong>. La API no lista las etapas existentes; esta acción solo crea una nueva.</p>
        <div class="grid gap-4 sm:grid-cols-2">
          <FormField id="st-code" label="Código" required :error="errors.stageCode"><template #default="{ id, invalid }"><InputText :id="id" v-model="form.stageCode" maxlength="40" :invalid="invalid" class="w-full uppercase" /></template></FormField>
          <FormField id="st-order" label="Orden" required :error="errors.stageOrder"><template #default="{ id, invalid }"><InputNumber v-model="form.stageOrder" :input-id="id" :min="1" :invalid="invalid" show-buttons class="w-full" /></template></FormField>
        </div>
        <FormField id="st-name" label="Nombre de la etapa" required :error="errors.stageName"><template #default="{ id, invalid }"><InputText :id="id" v-model="form.stageName" maxlength="120" :invalid="invalid" class="w-full" /></template></FormField>
      </template>
    </MutationDialog>
  </div>
</template>
