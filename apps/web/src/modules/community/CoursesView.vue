<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import AppIcon from '@/components/AppIcon.vue';
import AppTable from '@/components/AppTable.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import NoEstablishment from '@/components/NoEstablishment.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef } from '@/components/types';
import { useCourses, useCreateCourse, useUpdateCourse } from '@/composables/useCommunity';
import { useEstablishmentContext } from '@/composables/useEstablishmentContext';
import { useSession } from '@/composables/useSession';
import { maxLength, required, validateAll } from '@/lib/validation';
import type { Course } from '@/types/api';

/** Cursos del establecimiento por año académico (`GET/POST/PATCH /courses`). Un curso se desactiva, nunca se elimina. */
const { can } = useSession();
const { currentId, isPending: contextPending } = useEstablishmentContext();
const thisYear = new Date().getFullYear();
const year = ref(thisYear);
const yearOptions = [thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((value) => ({ value, label: String(value) }));
const query = useCourses(() => ({ establishmentId: currentId.value, academicYear: year.value }));
const columns: ColumnDef[] = [
  { field: 'name', header: 'Curso', sortable: true }, { field: 'level', header: 'Nivel', minScreen: 'sm' }, { field: 'students', header: 'Estudiantes', align: 'right' }, { field: 'isActive', header: 'Estado' }
];

const open = ref(false);
const editing = ref<Course | null>(null);
const create = useCreateCourse();
const update = useUpdateCourse();
const mutation = computed(() => (editing.value ? update : create));
const form = reactive({ name: '', level: '', academicYear: thisYear, isActive: true });
const errors = ref<Record<string, string>>({});

function openForm(course: Course | null) {
  editing.value = course;
  Object.assign(form, course ? { name: course.name, level: course.level ?? '', academicYear: course.academicYear, isActive: course.isActive } : { name: '', level: '', academicYear: year.value, isActive: true });
  errors.value = {}; create.reset(); update.reset(); open.value = true;
}
async function submit() {
  errors.value = validateAll(form, { name: [required('Escriba el nombre del curso, por ejemplo «1° Básico A».'), maxLength(60)], level: [maxLength(60)], academicYear: [required('Indique el año académico.')] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    if (editing.value) await update.mutateAsync({ id: editing.value.id, expectedVersion: editing.value.version, name: form.name.trim(), level: form.level.trim() || null, isActive: form.isActive });
    else await create.mutateAsync({ establishmentId: currentId.value!, name: form.name.trim(), level: form.level.trim() || undefined, academicYear: form.academicYear });
    open.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <div>
    <PageHeader title="Cursos" description="Cursos del establecimiento por año académico. Los estudiantes se asignan a un curso desde su ficha o en la carga masiva.">
      <template #actions><Button v-if="can('courses.manage') && currentId" label="Nuevo curso" @click="openForm(null)"><template #icon><AppIcon name="plus" :size="16" /></template></Button></template>
    </PageHeader>

    <NoEstablishment v-if="!currentId && !contextPending" />
    <section v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Cursos">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <label for="course-year" class="text-sm font-medium text-slate-700">Año académico</label>
        <Select v-model="year" input-id="course-year" :options="yearOptions" option-label="label" option-value="value" class="w-32" />
        <p v-if="query.data.value" class="ml-auto text-sm tabular-nums text-slate-500" aria-live="polite">{{ query.data.value.length }} {{ query.data.value.length === 1 ? 'curso' : 'cursos' }}</p>
      </div>
      <QueryState :data="query.data.value" :is-pending="query.isPending.value || contextPending" :error="query.error.value" subject="los cursos" empty-icon="book" empty-title="No hay cursos en este año" empty-description="Cree los cursos del año o importe estudiantes con su curso para que se creen automáticamente." @retry="query.refetch()">
        <template #default="{ data }">
          <AppTable :rows="data" :columns="columns" label="Cursos" :page-size="15">
            <template #cell-name="{ row }"><span class="font-medium">{{ row.name }}</span></template>
            <template #cell-students="{ row }"><span class="tabular-nums">{{ row._count?.students ?? 0 }}</span></template>
            <template #cell-isActive="{ row }"><StatusBadge :status="row.isActive ? 'ACTIVO' : 'INACTIVO'" /></template>
            <template v-if="can('courses.manage')" #actions="{ row }"><Button :aria-label="`Editar ${row.name}`" severity="secondary" text rounded size="small" @click="openForm(row)"><template #icon><AppIcon name="pencil" :size="16" /></template></Button></template>
          </AppTable>
        </template>
      </QueryState>
    </section>

    <MutationDialog v-model:visible="open" :header="editing ? 'Editar curso' : 'Nuevo curso'" :submit-label="editing ? 'Guardar cambios' : 'Crear curso'" :pending="mutation.isPending.value" :error="mutation.error.value" @submit="submit" @reload="query.refetch()">
      <FormField id="co-name" label="Nombre del curso" required :error="errors.name"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.name" maxlength="60" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
      <FormField id="co-level" label="Nivel" help="Opcional. Por ejemplo: Básica, Media, Parvularia." :error="errors.level"><template #default="{ id, invalid }"><InputText :id="id" v-model="form.level" maxlength="60" :invalid="invalid" autocomplete="off" class="w-full" /></template></FormField>
      <FormField v-if="!editing" id="co-year" label="Año académico" required :error="errors.academicYear"><template #default="{ id, invalid }"><InputNumber v-model="form.academicYear" :input-id="id" :use-grouping="false" :min="2000" :max="2100" :invalid="invalid" fluid /></template></FormField>
      <div v-else class="flex items-center gap-3">
        <ToggleSwitch v-model="form.isActive" input-id="co-active" />
        <label for="co-active" class="text-sm text-slate-800"><span class="block font-medium">Curso activo</span><span class="block text-xs text-slate-500">Un curso inactivo no se ofrece al asignar estudiantes.</span></label>
      </div>
    </MutationDialog>
  </div>
</template>
