<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import AppIcon from '@/components/AppIcon.vue';
import AppTable from '@/components/AppTable.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import SearchToolbar from '@/components/SearchToolbar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef, FilterDef } from '@/components/types';
import { useCreateUser, useEstablishments, useUserList } from '@/composables/useAdmin';
import { useDebounced } from '@/composables/useDebounced';
import { useSession } from '@/composables/useSession';
import { formatDate } from '@/lib/format';
import { creatableRoleOptions, roleLabel, roleOptions } from '@/lib/roles';
import { email, maxLength, minLength, required, validateAll } from '@/lib/validation';
import type { AdminUser } from '@/types/api';

/**
 * Usuarios (`GET /users`, con búsqueda, filtros y paginación del servidor). Una cuenta nueva queda inactiva hasta que la persona
 * acepte la invitación enviada por correo; la API no distingue "invitación pendiente" de "desactivada", por eso ambas se muestran
 * como inactivas y el detalle ofrece las dos acciones.
 */
const { can } = useSession();
const canCreate = computed(() => can('users.create') && can('institutions.manage'));
const establishments = useEstablishments(canCreate);
const search = ref('');
const debounced = useDebounced(search);
const values = ref<Record<string, string | null>>({ role: null, active: null });
const page = ref(1);
watch([debounced, values], () => { page.value = 1; }, { deep: true });

const filters: FilterDef[] = [
  { field: 'active', label: 'Estado', options: [{ value: 'true', label: 'Activas' }, { value: 'false', label: 'Inactivas o pendientes' }] },
  { field: 'role', label: 'Rol', options: roleOptions }
];
const params = computed(() => ({ page: page.value, limit: 15, search: debounced.value.trim() || undefined, role: values.value.role ?? undefined, active: values.value.active === null ? undefined : values.value.active === 'true' }));
const query = useUserList(params);
const columns: ColumnDef[] = [
  { field: 'displayName', header: 'Nombre' }, { field: 'email', header: 'Correo', minScreen: 'md' }, { field: 'roles', header: 'Roles', minScreen: 'lg' },
  { field: 'isActive', header: 'Estado' }, { field: 'createdAt', header: 'Creación', minScreen: 'xl' }
];
const rowTo = (user: AdminUser) => ({ name: 'users-detail', params: { id: user.id } });

const createOpen = ref(false);
const create = useCreateUser();
const form = reactive({ displayName: '', email: '', roles: [] as string[], establishmentId: null as string | null });
const errors = ref<Record<string, string>>({});
const invited = ref<string | null>(null);
function openCreate() { Object.assign(form, { displayName: '', email: '', roles: [], establishmentId: null }); errors.value = {}; invited.value = null; create.reset(); createOpen.value = true; }
async function submit() {
  errors.value = validateAll(form, { displayName: [required('Escriba el nombre completo.'), minLength(2), maxLength(120)], email: [required('Escriba el correo institucional.'), email(), maxLength(254)], roles: [required('Seleccione al menos un rol.')], establishmentId: [required('Seleccione el establecimiento al que pertenecerá la persona.')] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    const user = await create.mutateAsync({ displayName: form.displayName.trim(), email: form.email.trim(), roles: form.roles, establishmentId: form.establishmentId! });
    invited.value = user.email;
    createOpen.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <div>
    <PageHeader title="Usuarios" description="Cuentas de acceso del personal. Las cuentas nuevas se activan mediante una invitación enviada por correo.">
      <template #actions><Button v-if="canCreate" label="Nuevo usuario" @click="openCreate"><template #icon><AppIcon name="user-plus" :size="16" /></template></Button></template>
    </PageHeader>

    <p v-if="invited" class="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
      <AppIcon name="check-circle" :size="16" class="mt-0.5 shrink-0" />Usuario creado, asignado a su establecimiento y con invitación enviada a {{ invited }}. La cuenta se activará cuando la persona cree su contraseña.
    </p>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Usuarios">
      <SearchToolbar v-model:search="search" v-model:values="values" :filters="filters" placeholder="Buscar por nombre o correo" :total="query.data.value?.total ?? null" />
      <QueryState :data="query.data.value?.items" :is-pending="query.isPending.value" :error="query.error.value" subject="los usuarios" empty-icon="user" empty-title="No hay usuarios" empty-description="No hay cuentas que coincidan con la búsqueda." :is-empty="(items) => items.length === 0 && !debounced && !values.role && values.active === null" @retry="query.refetch()">
        <template #default="{ data }">
          <AppTable :rows="data" :columns="columns" label="Usuarios" :total="query.data.value?.total" :page="page" :limit="15" :loading="query.isFetching.value" :row-to="rowTo" :detail-label="(u) => `Ver ${u.displayName}`" @page="page = $event">
            <template #cell-displayName="{ row }"><span class="font-medium">{{ row.displayName }}</span></template>
            <template #cell-roles="{ row }"><span class="flex flex-wrap gap-1"><span v-for="r in row.roles" :key="r" class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{{ roleLabel(r) }}</span></span></template>
            <template #cell-isActive="{ row }"><StatusBadge :status="row.isActive ? 'ACTIVO' : 'INACTIVO'" /></template>
            <template #cell-createdAt="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatDate(row.createdAt) }}</span></template>
            <template #empty><div class="px-6 py-10 text-center text-sm text-slate-600">Ningún usuario coincide con la búsqueda o los filtros.</div></template>
          </AppTable>
        </template>
      </QueryState>
    </section>

    <MutationDialog v-model:visible="createOpen" header="Nuevo usuario" submit-label="Crear, asignar e invitar" :pending="create.isPending.value" :error="create.error.value" @submit="submit">
      <p class="rounded-md bg-sky-50 px-3 py-2 text-sm leading-relaxed text-sky-900">En una sola acción se crea la cuenta, se asigna al establecimiento y se envía un código de un solo uso para crear la contraseña. La administración nunca define ni ve contraseñas.</p>
      <FormField id="nu-name" label="Nombre completo" required :error="errors.displayName"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.displayName" maxlength="120" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
      <FormField id="nu-email" label="Correo institucional" required :error="errors.email"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.email" type="email" maxlength="254" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
      <FormField id="nu-roles" label="Roles" required help="El rol de administración del sistema no se concede al crear cuentas." :error="errors.roles">
        <template #default="{ id, invalid, describedby }"><MultiSelect v-model="form.roles" :input-id="id" :options="creatableRoleOptions" option-label="label" option-value="value" display="chip" :invalid="invalid" :aria-describedby="describedby" placeholder="Seleccione uno o más roles" class="w-full" /></template>
      </FormField>
      <FormField id="nu-establishment" label="Establecimiento" required help="La persona podrá acceder solo a los datos de este establecimiento." :error="errors.establishmentId">
        <template #default="{ id, invalid, describedby }"><Select v-model="form.establishmentId" :input-id="id" :options="establishments.data.value?.filter((item) => item.isActive) ?? []" option-label="name" option-value="id" :loading="establishments.isPending.value" :invalid="invalid" :aria-describedby="describedby" placeholder="Seleccione el establecimiento" class="w-full" /></template>
      </FormField>
    </MutationDialog>
  </div>
</template>
