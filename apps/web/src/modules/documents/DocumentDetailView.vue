<script setup lang="ts">
import Button from 'primevue/button';
import AppIcon from '@/components/AppIcon.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import ResourceDetailShell from '@/components/ResourceDetailShell.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatDate } from '@/lib/format';

/** Los documentos privados se descargarán solo mediante enlaces firmados del servidor; aquí no se generan URL públicas. */
defineProps<{ id: string }>();
</script>

<template>
  <ResourceDetailShell :id="id" resource="documents" subject="el documento" :back="{ to: { name: 'documents' }, label: 'Volver a documentos' }" :title="(d) => d.title" :description="(d) => `${d.category}. Actualizado el ${formatDate(d.updatedAt)}.`">
    <template #badges="{ item }"><StatusBadge :status="item.status" /></template>
    <template #actions>
      <Button label="Descargar" severity="secondary" outlined disabled title="Requiere descarga segura desde el servidor"><template #icon><AppIcon name="download" :size="16" /></template></Button>
    </template>
    <template #default="{ item }">
      <div class="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Vista previa" class="lg:col-span-2">
          <div class="mx-auto flex aspect-[1/1.3] max-w-md flex-col rounded-md border border-slate-200 bg-white p-8 shadow-sm">
            <div class="h-3 w-1/3 rounded bg-slate-200" />
            <div class="mt-6 space-y-2"><div v-for="n in 9" :key="n" class="h-2 rounded bg-slate-100" :style="{ width: `${70 + ((n * 13) % 30)}%` }" /></div>
            <p class="mt-auto text-center text-xs text-slate-500">Vista previa no disponible: el contenido se mostrará desde el almacenamiento seguro.</p>
          </div>
        </SectionCard>
        <SectionCard title="Información">
          <DetailPanel :columns="1" :items="[
            { key: 'category', label: 'Categoría', value: item.category }, { key: 'case', label: 'Caso', value: item.caseFolio ?? 'Documento institucional' },
            { key: 'format', label: 'Formato', value: item.format }, { key: 'updated', label: 'Última actualización', value: formatDate(item.updatedAt) }
          ]" />
        </SectionCard>
      </div>
    </template>
  </ResourceDetailShell>
</template>
