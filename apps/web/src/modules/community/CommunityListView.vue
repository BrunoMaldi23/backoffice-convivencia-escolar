<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import ResourceListPage from '@/components/ResourceListPage.vue';
import { COMMUNITY, type CommunityEntity } from './community.config';

const props = defineProps<{ entity: CommunityEntity }>();
const cfg = computed(() => COMMUNITY[props.entity]);
</script>

<template>
  <ResourceListPage
    :key="entity" :resource="entity" :title="cfg.title" :description="cfg.description" :columns="cfg.columns" :filters="cfg.filters"
    :search-fields="cfg.searchFields" :search-placeholder="cfg.searchPlaceholder" :detail-route="`${entity}-detail`" :subject="cfg.subject" :empty-icon="cfg.icon"
    :create="{ to: { name: `${entity}-new` }, label: cfg.createLabel }" :empty-title="`No hay ${cfg.title.toLowerCase()} registrados`"
    empty-description="Los registros se sincronizarán con la información institucional cuando el servicio esté disponible."
  >
    <template v-if="cfg.privacy" #before>
      <p class="mb-4 flex items-start gap-2.5 rounded-lg border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-slate-700">
        <AppIcon name="lock" :size="16" class="mt-0.5 text-sky-800" />{{ cfg.privacy }}
      </p>
    </template>
  </ResourceListPage>
</template>
