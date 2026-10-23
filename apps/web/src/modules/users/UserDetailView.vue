<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import AppIcon from '@/components/AppIcon.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import ErrorState from '@/components/ErrorState.vue';
import FormField from '@/components/FormField.vue';
import LoadingState from '@/components/LoadingState.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import PageHeader from '@/components/PageHeader.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useAssignUserRoles, useResendInvitation, useRevokeSessions, useSetUserStatus, useUpdateUser, useUser } from '@/composables/useAdmin';
import { useSession } from '@/composables/useSession';
import { isNotFound } from '@/lib/errors';
import { formatDate, formatDateTime, initials } from '@/lib/format';
import { ROLE_LABELS, roleLabel, roleOptions } from '@/lib/roles';
import { email, maxLength, minLength, required, validateAll } from '@/lib/validation';

/**
 * Ficha de usuario: datos (`PATCH /users/:id`), roles (`PATCH …/roles`, que cierra las sesiones de la persona), activación
 * (`PATCH …/status`), revocación de sesiones y reenvío de invitación. Las reglas de protección (último administrador, no
 * autoasignarse SYSTEM_ADMIN) las aplica el servidor y se muestran tal cual si rechaza la operación.
 */
const props = defineProps<{ id: string }>();
const { user: session, can } = useSession();
const query = useUser(() => props.id);
const update = useUpdateUser();
const setStatus = useSetUserStatus();
const assignRoles = useAssignUserRoles();
const revoke = useRevokeSessions();
const resend = useResendInvitation();
const record = computed(() => query.data.value);
const isSelf = computed(() => record.value?.id === session.value?.id);
const sessionIsAdmin = computed(() => session.value?.roles.includes('SYSTEM_ADMIN') ?? false);

const editOpen = ref(false);
const rolesOpen = ref(false);
const confirm = ref<'disable' | 'enable' | 'revoke' | 'resend' | null>(null);
const confirmOpen = computed({ get: () => confirm.value !== null, set: (v: boolean) => { if (!v) confirm.value = null; } });
const form = reactive({ displayName: '', email: '' });
const roles = ref<string[]>([]);
const errors = ref<Record<string, string>>({});
const notice = ref<string | null>(null);

const roleChoices = computed(() => roleOptions.map((o) => (o.value === 'SYSTEM_ADMIN' && (!sessionIsAdmin.value || isSelf.value) && !record.value?.roles.includes('SYSTEM_ADMIN') ? { ...o, disabled: true, label: `${o.label} (solo otra persona administradora)` } : o)));

function openEdit() { if (!record.value) return; Object.assign(form, { displayName: record.value.displayName, email: record.value.email }); errors.value = {}; update.reset(); editOpen.value = true; }
async function saveEdit() {
  errors.value = validateAll(form, { displayName: [required('Escriba el nombre.'), minLength(2), maxLength(120)], email: [required('Escriba el correo.'), email(), maxLength(254)] }) as Record<string, string>;
  if (Object.keys(errors.value).length || !record.value) return;
  try { await update.mutateAsync({ id: record.value.id, displayName: form.displayName.trim(), email: form.email.trim() }); editOpen.value = false; notice.value = 'Los datos fueron actualizados.'; } catch { /* se muestra en el diálogo */ }
}
function openRoles() { if (!record.value) return; roles.value = [...record.value.roles]; assignRoles.reset(); rolesOpen.value = true; }
async function saveRoles() {
  if (!roles.value.length) { errors.value = { roles: 'Seleccione al menos un rol.' }; return; }
  errors.value = {};
  try { await assignRoles.mutateAsync({ id: record.value!.id, roles: roles.value }); rolesOpen.value = false; notice.value = 'Los roles fueron actualizados y se cerraron las sesiones de la persona.'; } catch { /* se muestra en el diálogo */ }
}
const CONFIRM = {
  disable: { header: 'Desactivar cuenta', label: 'Desactivar', danger: true, text: 'La persona no podrá iniciar sesión y se cerrarán sus sesiones activas. Su historial se conserva.', done: 'La cuenta fue desactivada.' },
  enable: { header: 'Reactivar cuenta', label: 'Reactivar', danger: false, text: 'La persona podrá volver a iniciar sesión con sus roles actuales. Si la cuenta aún no aceptó su invitación, el servidor lo rechazará: use "Reenviar invitación".', done: 'La cuenta fue reactivada.' },
  revoke: { header: 'Revocar sesiones', label: 'Revocar sesiones', danger: true, text: 'Se cerrarán todas las sesiones abiertas de la persona en todos sus dispositivos.', done: 'Las sesiones fueron revocadas.' },
  resend: { header: 'Reenviar invitación', label: 'Reenviar invitación', danger: false, text: 'Se enviará un nuevo código de activación por correo y el anterior dejará de ser válido.', done: 'La invitación fue reenviada.' }
} as const;
async function runConfirmed() {
  const action = confirm.value!;
  if (action === 'disable' || action === 'enable') await setStatus.mutateAsync({ id: record.value!.id, isActive: action === 'enable' });
  else if (action === 'revoke') await revoke.mutateAsync(record.value!.id);
  else await resend.mutateAsync(record.value!.id);
  notice.value = CONFIRM[action].done;
}
</script>

<template>
  <div>
    <LoadingState v-if="query.isPending.value" :rows="5" />
    <template v-else-if="record">
      <PageHeader :title="record.displayName" :description="record.email" :back="{ to: { name: 'users' }, label: 'Volver a usuarios' }">
        <template #badges><StatusBadge :status="record.isActive ? 'ACTIVO' : 'INACTIVO'" /></template>
        <template v-if="can('users.update')" #actions><Button label="Editar datos" severity="secondary" outlined @click="openEdit"><template #icon><AppIcon name="pencil" :size="15" /></template></Button></template>
      </PageHeader>
      <p v-if="notice" class="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status"><AppIcon name="check-circle" :size="16" class="mt-0.5 shrink-0" />{{ notice }}</p>

      <div class="grid gap-4 lg:grid-cols-3">
        <div class="space-y-4 lg:col-span-2">
          <SectionCard dense title="Cuenta">
            <div class="mb-5 flex items-center gap-4">
              <span class="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 font-semibold text-sky-800">{{ initials(record.displayName) }}</span>
              <div class="min-w-0"><p class="break-words font-semibold text-slate-900">{{ record.displayName }}</p><p class="break-all text-sm text-slate-600">{{ record.email }}</p></div>
            </div>
            <DetailPanel :items="[{ key: 'status', label: 'Estado' }, { key: 'created', label: 'Creación', value: formatDate(record.createdAt) }, { key: 'updated', label: 'Última modificación', value: formatDateTime(record.updatedAt) }]">
              <template #item-status><StatusBadge :status="record.isActive ? 'ACTIVO' : 'INACTIVO'" /></template>
            </DetailPanel>
            <p v-if="!record.isActive" class="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">La cuenta está inactiva: puede estar desactivada o con la invitación pendiente de aceptar. La API no distingue ambos casos; si es una invitación pendiente, use “Reenviar invitación”.</p>
          </SectionCard>

          <SectionCard dense title="Roles" description="Cambiar los roles cierra todas las sesiones de la persona.">
            <template v-if="can('roles.assign')" #actions><Button label="Cambiar roles" size="small" outlined @click="openRoles" /></template>
            <ul class="divide-y divide-slate-100">
              <li v-for="r in record.roles" :key="r" class="py-3 first:pt-0 last:pb-0">
                <p class="text-sm font-medium text-slate-900">{{ roleLabel(r) }} <span class="ml-1 text-xs font-normal text-slate-500">{{ r }}</span></p>
                <p class="mt-0.5 text-sm text-slate-600">{{ ROLE_LABELS[r]?.description }}</p>
              </li>
            </ul>
            <EmptyState v-if="!record.roles.length" compact icon="key" title="Sin roles asignados" />
          </SectionCard>
        </div>

        <SectionCard dense title="Seguridad">
          <ul class="space-y-4 text-sm">
            <li v-if="can('users.update')">
              <p class="font-medium text-slate-900">Invitación</p><p class="mt-0.5 text-slate-600">Envía un código nuevo e invalida el anterior.</p>
              <Button label="Reenviar invitación" size="small" outlined class="mt-2" :disabled="record.isActive" :title="record.isActive ? 'La cuenta ya está activa' : undefined" @click="confirm = 'resend'" />
            </li>
            <li v-if="can('users.update')">
              <p class="font-medium text-slate-900">Sesiones</p><p class="mt-0.5 text-slate-600">Cierra la sesión en todos los dispositivos.</p>
              <Button label="Revocar sesiones" size="small" outlined class="mt-2" @click="confirm = 'revoke'" />
            </li>
            <li v-if="can('users.disable')" class="border-t border-slate-100 pt-4">
              <p class="font-medium text-slate-900">Acceso</p>
              <template v-if="record.isActive"><p class="mt-0.5 text-slate-600">Impide el ingreso sin eliminar el historial.</p><Button label="Desactivar cuenta" size="small" severity="danger" outlined class="mt-2" :disabled="isSelf" :title="isSelf ? 'No puede desactivar su propia cuenta' : undefined" @click="confirm = 'disable'" /></template>
              <template v-else><p class="mt-0.5 text-slate-600">La cuenta no puede iniciar sesión.</p><Button label="Reactivar cuenta" size="small" outlined class="mt-2" @click="confirm = 'enable'" /></template>
            </li>
          </ul>
          <p class="mt-5 text-xs leading-relaxed text-slate-500">Las cuentas no se eliminan: se desactivan para conservar la trazabilidad. El servidor impide desactivar al último administrador.</p>
        </SectionCard>
      </div>

      <MutationDialog v-model:visible="editOpen" header="Editar datos de la cuenta" submit-label="Guardar cambios" :pending="update.isPending.value" :error="update.error.value" @submit="saveEdit">
        <FormField id="eu-name" label="Nombre completo" required :error="errors.displayName"><template #default="{ id: fid, invalid }"><InputText :id="fid" v-model="form.displayName" maxlength="120" :invalid="invalid" class="w-full" /></template></FormField>
        <FormField id="eu-email" label="Correo institucional" required :error="errors.email"><template #default="{ id: fid, invalid }"><InputText :id="fid" v-model="form.email" type="email" maxlength="254" :invalid="invalid" class="w-full" /></template></FormField>
      </MutationDialog>

      <MutationDialog v-model:visible="rolesOpen" header="Cambiar roles" submit-label="Guardar roles" :pending="assignRoles.isPending.value" :error="assignRoles.error.value" @submit="saveRoles">
        <p class="text-sm text-slate-700">Se cerrarán las sesiones de {{ record.displayName }} para que los nuevos permisos rijan de inmediato.</p>
        <FormField id="cr-roles" label="Roles" required :error="errors.roles" help="Nadie puede asignarse a sí mismo el rol de administración del sistema.">
          <template #default="{ id: fid, invalid }"><MultiSelect v-model="roles" :input-id="fid" :options="roleChoices" option-label="label" option-value="value" option-disabled="disabled" display="chip" :invalid="invalid" class="w-full" /></template>
        </FormField>
      </MutationDialog>

      <ConfirmActionDialog v-if="confirm" v-model:visible="confirmOpen" :header="CONFIRM[confirm].header" :confirm-label="CONFIRM[confirm].label" :danger="CONFIRM[confirm].danger" :message="`${record.displayName}: ${CONFIRM[confirm].text}`" :action="runConfirmed" />
    </template>
    <div v-else class="rounded-xl border border-slate-200 bg-white">
      <h1 class="sr-only">Usuario no disponible</h1>
      <EmptyState v-if="isNotFound(query.error.value)" icon="search" title="No se encontró el usuario" description="La cuenta no existe o fue eliminada." />
      <ErrorState v-else :error="query.error.value" subject="el usuario" @retry="query.refetch()" />
    </div>
  </div>
</template>
