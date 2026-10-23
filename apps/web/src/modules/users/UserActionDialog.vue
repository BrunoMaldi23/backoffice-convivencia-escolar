<script setup lang="ts">
import { computed } from 'vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import { submitResource } from '@/services/resources';
import type { UserAccount } from '@/types/models';
import { USER_ACTIONS, type UserAction } from './users.config';

/** Confirmación de acciones administrativas sobre una cuenta. La acción se ejecuta solo al confirmar y nunca se simula. */
const props = defineProps<{ user: UserAccount | null; action: UserAction | null }>();
const emit = defineEmits<{ close: [] }>();
const def = computed(() => (props.action ? USER_ACTIONS[props.action] : null));
const visible = computed({ get: () => Boolean(props.user && props.action), set: (v) => { if (!v) emit('close'); } });
</script>

<template>
  <ConfirmActionDialog
    v-if="def && user" v-model:visible="visible" :header="def.header" :confirm-label="def.confirm" :danger="def.danger" :action-name="def.actionName"
    :message="def.message(user)" :action="() => submitResource('users', def!.method, def!.suffix(user!.id))"
  />
</template>
