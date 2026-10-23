<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import Message from 'primevue/message';
import AppIcon from '@/components/AppIcon.vue';
import FormField from '@/components/FormField.vue';
import IconInput from '@/components/IconInput.vue';
import { useForgotPassword } from '@/composables/useSession';
import { describeError } from '@/lib/errors';
import { email, required, validate } from '@/lib/validation';
import AuthTitle from './AuthTitle.vue';

const request = useForgotPassword();
const value = ref('');
const error = ref<string | null>(null);

function submit() {
  if (request.isPending.value) return;
  error.value = validate(value.value, [required('Ingrese su correo institucional.'), email()]);
  if (error.value) return document.getElementById('forgot-email')?.focus();
  request.mutate(value.value.trim());
}
</script>

<template>
  <div>
    <RouterLink :to="{ name: 'login' }" class="inline-flex items-center gap-1.5 rounded text-sm font-medium text-action hover:text-action-dark">
      <AppIcon name="arrow-left" :size="16" />Volver a iniciar sesión
    </RouterLink>
    <AuthTitle class="mt-6">Recuperar contraseña</AuthTitle>
    <p class="mt-4 text-sm leading-relaxed text-slate-600">
      Ingrese su correo institucional. Si la cuenta existe, recibirá un código de un solo uso para crear una nueva contraseña.
    </p>

    <Message v-if="request.isSuccess.value" severity="success" :closable="false" class="mt-6">
      Si la cuenta existe, recibirá instrucciones por correo. El código vence en 30 minutos.
    </Message>

    <form v-else novalidate class="mt-6 space-y-5" @submit.prevent="submit">
      <FormField id="forgot-email" label="Correo electrónico" :error="error">
        <template #default="{ id, invalid, describedby }">
          <IconInput :id="id" v-model="value" icon="mail" type="email" autocomplete="username" placeholder="nombre@colegio.cl" :invalid="invalid" :describedby="describedby" />
        </template>
      </FormField>
      <Message v-if="request.error.value" severity="error" :closable="false" role="alert">{{ describeError(request.error.value) }}</Message>
      <Button type="submit" label="Enviar código" class="w-full !border-action !bg-action hover:!border-action-dark hover:!bg-action-dark" :loading="request.isPending.value" />
    </form>

    <p class="mt-8 text-sm text-slate-600">
      ¿Ya tiene un código?
      <RouterLink :to="{ name: 'reset-password' }" class="rounded font-semibold text-action hover:underline">Ingresar código</RouterLink>
    </p>
  </div>
</template>
