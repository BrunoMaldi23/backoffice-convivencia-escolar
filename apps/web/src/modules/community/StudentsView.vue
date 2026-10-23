<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import AppIcon from '@/components/AppIcon.vue';
import AppTable from '@/components/AppTable.vue';
import NoEstablishment from '@/components/NoEstablishment.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import SearchToolbar from '@/components/SearchToolbar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef, FilterDef } from '@/components/types';
import { useCourses, useStudents } from '@/composables/useCommunity';
import { useDebounced } from '@/composables/useDebounced';
import { useEstablishmentContext } from '@/composables/useEstablishmentContext';
import { useSession } from '@/composables/useSession';
import { formatCalendarDate, fullName } from '@/lib/format';
import { formatRut } from '@/lib/rut';
import type { Student } from '@/types/api';
import ImportStudentsDialog from './ImportStudentsDialog.vue';
import StudentFormDialog from './StudentFormDialog.vue';

/**
 * Estudiantes del establecimiento (`GET /students`, con búsqueda por nombre o RUT, filtro por curso y paginación del servidor).
 * Los datos de menores se muestran solo a quien tiene el permiso de lectura; el RUT no viaja en la dirección de la página.
 */
const PAGE_SIZE = 20;
const { can } = useSession();
const router = useRouter();
const { currentId, isPending: contextPending } = useEstablishmentContext();
const search = ref('');
const debounced = useDebounced(search);
const values = ref<Record<string, string | null>>({ courseId: null, active: 'true' });
const page = ref(1);
watch([debounced, values], () => { page.value = 1; }, { deep: true });

const courses = useCourses(() => ({ establishmentId: currentId.value }));
const filters = computed<FilterDef[]>(() => [
  { field: 'active', label: 'Estado', options: [{ value: 'true', label: 'Activos' }, { value: 'false', label: 'Inactivos' }] },
  { field: 'courseId', label: 'Curso', options: (courses.data.value ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.academicYear})` })) }
]);
const params = computed(() => ({ establishmentId: currentId.value, page: page.value, limit: PAGE_SIZE, search: debounced.value.trim() || undefined, courseId: values.value.courseId ?? undefined, active: values.value.active === null ? undefined : values.value.active === 'true' }));
const query = useStudents(params);
const columns: ColumnDef[] = [
  { field: 'lastNames', header: 'Estudiante' }, { field: 'rut', header: 'RUT', minScreen: 'sm' }, { field: 'course', header: 'Curso', minScreen: 'md' },
  { field: 'birthDate', header: 'Nacimiento', minScreen: 'xl' }, { field: 'isActive', header: 'Estado' }
];
const rowTo = (student: Student) => ({ name: 'students-detail', params: { id: student.id } });

const createOpen = ref(false);
const importOpen = ref(false);
const emptyFresh = (items: Student[]) => items.length === 0 && !debounced.value && !values.value.courseId && values.value.active === 'true';
</script>

<template>
  <div>
    <PageHeader title="Estudiantes" description="Directorio de estudiantes del establecimiento. Sirve para identificar a las personas involucradas en un caso sin repetir sus datos.">
      <template v-if="can('students.manage') && currentId" #actions>
        <Button label="Importar CSV" severity="secondary" outlined @click="importOpen = true"><template #icon><AppIcon name="upload" :size="16" /></template></Button>
        <Button label="Nuevo estudiante" @click="createOpen = true"><template #icon><AppIcon name="plus" :size="16" /></template></Button>
      </template>
    </PageHeader>

    <NoEstablishment v-if="!currentId && !contextPending" />
    <section v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Estudiantes">
      <SearchToolbar v-model:search="search" v-model:values="values" :filters="filters" placeholder="Buscar por nombre o RUT" :total="query.data.value?.total ?? null" />
      <QueryState
        :data="query.data.value?.items" :is-pending="query.isPending.value || contextPending" :error="query.error.value" subject="los estudiantes" empty-icon="student" empty-title="Aún no hay estudiantes"
        empty-description="Registre estudiantes uno a uno o impórtelos desde un archivo CSV." :is-empty="emptyFresh" @retry="query.refetch()"
      >
        <template #default="{ data }">
          <AppTable :rows="data" :columns="columns" label="Estudiantes" :total="query.data.value?.total" :page="page" :limit="PAGE_SIZE" :loading="query.isFetching.value" :row-to="rowTo" :detail-label="(s) => `Ver ficha de ${fullName(s)}`" @page="page = $event">
            <template #cell-lastNames="{ row }"><span class="font-medium">{{ row.lastNames }}, {{ row.firstNames }}</span></template>
            <template #cell-rut="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatRut(row.rut) }}</span></template>
            <template #cell-course="{ row }">{{ row.course?.name ?? 'Sin curso' }}</template>
            <template #cell-birthDate="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatCalendarDate(row.birthDate) }}</span></template>
            <template #cell-isActive="{ row }"><StatusBadge :status="row.isActive ? 'ACTIVO' : 'INACTIVO'" /></template>
            <template #empty><div class="px-6 py-10 text-center text-sm text-slate-600">Ningún estudiante coincide con la búsqueda o los filtros.</div></template>
          </AppTable>
        </template>
      </QueryState>
    </section>

    <template v-if="currentId">
      <StudentFormDialog v-model:visible="createOpen" :establishment-id="currentId" :student="null" @saved="(s) => router.push({ name: 'students-detail', params: { id: s.id } })" @reload="query.refetch()" />
      <ImportStudentsDialog v-model:visible="importOpen" :establishment-id="currentId" />
    </template>
  </div>
</template>
