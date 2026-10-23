<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import PageHeader from '@/components/PageHeader.vue';
import SectionCard from '@/components/SectionCard.vue';

/**
 * Módulos sin API en el backend. No se muestran datos ni formularios que no puedan guardarse: la pantalla explica qué falta y
 * dónde puede trabajarse mientras tanto. El detalle está en docs/frontend/api-integration.md ("Necesidades de backend").
 */
const props = defineProps<{ module: 'students' | 'guardians' | 'staff' | 'courses' | 'citations' | 'referrals' }>();

const CONTENT = {
  students: { title: 'Estudiantes', icon: 'student', summary: 'Ficha del estudiantado (matrícula, curso y vínculos con casos).', alternative: 'Por ahora, cada estudiante involucrado se agrega dentro del expediente como involucrado, con un código interno de referencia.', missing: ['Catálogo de estudiantes del establecimiento (listado, búsqueda y ficha).', 'Cursos y matrícula para asociar a cada estudiante.', 'Reglas de acceso a datos de menores de edad.'] },
  guardians: { title: 'Apoderados', icon: 'users', summary: 'Registro de apoderados y su relación con los estudiantes.', alternative: 'Por ahora, el apoderado involucrado se agrega dentro del expediente como involucrado (tipo apoderado/a).', missing: ['Catálogo de apoderados y su vínculo con estudiantes.', 'Datos de contacto con resguardo de privacidad.'] },
  staff: { title: 'Funcionarios', icon: 'briefcase', summary: 'Registro de docentes y asistentes de la educación.', alternative: 'Las cuentas de acceso del personal se gestionan en Administración, Usuarios.', missing: ['Catálogo de funcionarios (cargos y áreas) separado de las cuentas de acceso.'] },
  courses: { title: 'Cursos', icon: 'book', summary: 'Cursos del año escolar con su profesor o profesora jefe.', alternative: 'Los expedientes todavía no se asocian a un curso.', missing: ['Catálogo de cursos y año escolar.', 'Relación entre cursos, estudiantes y expedientes.'] },
  citations: { title: 'Citaciones', icon: 'mail', summary: 'Citaciones a apoderados con confirmación y asistencia.', alternative: 'Mientras tanto, registre la gestión como seguimiento del expediente y su próxima acción con plazo.', missing: ['Endpoints de citaciones (crear, enviar, confirmar y registrar asistencia).', 'Generación de documentos oficiales en el servidor.'] },
  referrals: { title: 'Derivaciones', icon: 'referral', summary: 'Derivaciones a instituciones externas y su respuesta.', alternative: 'Mientras tanto, registre la derivación como seguimiento del expediente.', missing: ['Endpoints de derivaciones e instituciones receptoras.', 'Definición del flujo de comunicación con redes externas.'] }
} as const;
const content = computed(() => CONTENT[props.module]);
</script>

<template>
  <div>
    <PageHeader :title="content.title" :description="content.summary">
      <template #badges><span class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"><AppIcon name="clock" :size="13" />Pendiente de backend</span></template>
    </PageHeader>
    <div class="grid gap-4 lg:grid-cols-2">
      <SectionCard dense title="Estado">
        <p class="text-sm leading-relaxed text-slate-700">Este módulo todavía no está disponible porque el backend aún no publica sus operaciones. Para no mostrar datos ni formularios que no puedan guardarse, la pantalla permanece desactivada.</p>
        <p class="mt-3 rounded-md bg-sky-50 px-3 py-2 text-sm leading-relaxed text-sky-900">{{ content.alternative }}</p>
        <RouterLink :to="{ name: 'cases' }" class="mt-4 inline-flex items-center gap-1.5 rounded text-sm font-medium text-sky-700 hover:underline"><AppIcon name="folder" :size="15" />Ir a casos</RouterLink>
      </SectionCard>
      <SectionCard dense title="Qué falta en el backend">
        <ul class="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700"><li v-for="item in content.missing" :key="item">{{ item }}</li></ul>
      </SectionCard>
    </div>
  </div>
</template>
