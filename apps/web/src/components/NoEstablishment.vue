<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import { useEstablishments, useSetMembership } from '@/composables/useAdmin';
import { useSession } from '@/composables/useSession';
import ApiErrorMessage from './ApiErrorMessage.vue';
import EmptyState from './EmptyState.vue';

/**
 * Aviso cuando la cuenta no es miembro de ningún establecimiento: sin membresía activa la API no entrega los datos del colegio.
 * Quien administra instituciones (`institutions.manage`) puede agregarse con un clic si ya existe un establecimiento, o crearlo.
 */
const { can, user } = useSession();
const manage = computed(() => can('institutions.manage'));
const list = useEstablishments(() => manage.value);
const active = computed(() => (list.data.value ?? []).filter((e) => e.isActive));
const join = useSetMembership();

const joinAs = (establishmentId: string) => join.mutateAsync({ establishmentId, userId: user.value!.id, isActive: true }).catch(() => undefined);
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white">
    <EmptyState icon="building" title="Su cuenta aún no pertenece a un establecimiento" description="Los datos del colegio solo se muestran a quienes son miembros del establecimiento.">
      <template v-if="manage && list.isSuccess.value">
        <Button v-for="e in active" :key="e.id" :label="`Agregarme a ${e.name}`" size="small" :loading="join.isPending.value" @click="joinAs(e.id)" />
        <RouterLink v-if="!active.length" :to="{ name: 'establishments' }"><Button label="Crear el establecimiento" size="small" /></RouterLink>
      </template>
      <p v-else-if="!manage" class="text-sm text-slate-600">Pida a la administración que la agregue en Administración → Establecimientos.</p>
    </EmptyState>
    <ApiErrorMessage v-if="join.error.value" class="mx-6 mb-6" :error="join.error.value" />
  </div>
</template>
