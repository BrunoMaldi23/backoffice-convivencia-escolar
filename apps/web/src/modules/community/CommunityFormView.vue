<script setup lang="ts">
import { computed } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import ResourceForm from '@/components/ResourceForm.vue';
import { COMMUNITY, type CommunityEntity } from './community.config';

const props = defineProps<{ entity: CommunityEntity }>();
const cfg = computed(() => COMMUNITY[props.entity]);
</script>

<template>
  <div class="max-w-4xl">
    <PageHeader :title="cfg.createLabel" :description="`Registre los datos del ${cfg.singular}. Los campos con asterisco son obligatorios.`" :back="{ to: { name: entity }, label: `Volver a ${cfg.title.toLowerCase()}` }" />
    <ResourceForm
      :key="entity" :sections="cfg.form" :resource="entity" :submit-label="cfg.createLabel" :action-name="`el registro del ${cfg.singular}`"
      :cancel-to="{ name: entity }" :id-prefix="entity"
    />
  </div>
</template>
