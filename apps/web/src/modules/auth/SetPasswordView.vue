<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import AppIcon from '@/components/AppIcon.vue';
import FormField from '@/components/FormField.vue';
import PendingNotice from '@/components/PendingNotice.vue';
import { useAcceptInvitation, useResetPassword } from '@/composables/useSession';
import { minLength, required, validateAll } from '@/lib/validation';
import AuthTitle from './AuthTitle.vue';
import PasswordInput from './PasswordInput.vue';

/**
 * Restablecer contraseña (`reset`) o activar cuenta por invitación (`invite`).
 * Según el contrato, el código llega por correo separado de la URL y se pega aquí: nunca se lee
 * desde la ruta ni se guarda en el navegador. Mínimo de 12 caracteres definido por el backend.
 */
const props = defineProps<{ mode: 'reset' | 'invite' }>();
const MIN = 12;
const copy = computed(() => props.mode === 'invite'
  ? { title: 'Activar cuenta', intro: 'Pegue el código de invitación que recibió por correo y cree su contraseña.', submit: 'Activar cuenta', done: 'Su cuenta está activa. Ya puede iniciar sesión.' }
  : { title: 'Restablecer contraseña', intro: 'Pegue el código que recibió por correo y cree una nueva contraseña.', submit: 'Guardar contraseña', done: 'Su contraseña fue actualizada y se cerraron sus otras sesiones.' });

const reset = useResetPassword();
const accept = useAcceptInvitation();
const mutation = computed(() => (props.mode === 'invite' ? accept : reset));
const form = reactive({ token: '', password: '', confirm: '' });
const errors = ref<Partial<Record<keyof typeof form, string>>>({});

const checks = computed(() => [
  { ok: form.password.length >= MIN, text: `Al menos ${MIN} caracteres` },
  { ok: form.password.length > 0 && form.password === form.confirm, text: 'Ambas contraseñas coinciden' }
]);

function submit() {
  errors.value = validateAll(form, {
    token: [required('Pegue el código recibido por correo.'), minLength(32, 'El código está incompleto. Cópielo completo desde el correo.')],
    password: [required('Ingrese una contraseña nueva.'), minLength(MIN)],
    confirm: [required('Repita la contraseña nueva.')]
  });
  if (!errors.value.confirm && form.confirm !== form.password) errors.value.confirm = 'Las contraseñas no coinciden.';
  const first = (['token', 'password', 'confirm'] as const).find((k) => errors.value[k]);
  if (first) return document.getElementById(`set-${first}`)?.focus();
  mutation.value.mutate({ token: form.token.trim(), password: form.password });
}

onBeforeUnmount(() => Object.assign(form, { token: '', password: '', confirm: '' }));
</script>

<template>
  <div>
    <RouterLink :to="{ name: 'login' }" class="inline-flex items-center gap-1.5 rounded text-sm font-medium text-action hover:text-action-dark">
      <AppIcon name="arrow-left" :size="16" />Volver a iniciar sesión
    </RouterLink>
    <AuthTitle class="mt-6">{{ copy.title }}</AuthTitle>
    <p class="mt-4 text-sm leading-relaxed text-slate-600">{{ copy.intro }}</p>

    <template v-if="mutation.isSuccess.value">
      <Message severity="success" :closable="false" class="mt-6">{{ copy.done }}</Message>
      <RouterLink :to="{ name: 'login' }" custom>
        <template #default="{ navigate, href }"><Button as="a" :href="href" label="Ir a iniciar sesión" class="mt-5 w-full !border-action !bg-action hover:!bg-action-dark" @click="navigate" /></template>
      </RouterLink>
    </template>

    <form v-else novalidate class="mt-6 space-y-5" @submit.prevent="submit">
      <FormField id="set-token" label="Código recibido por correo" :error="errors.token" help="Vigente por 30 minutos y válido para un solo uso.">
        <template #default="{ id, invalid, describedby }">
          <InputText :id="id" v-model="form.token" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" :invalid="invalid" :aria-describedby="describedby" class="w-full font-mono text-sm" />
        </template>
      </FormField>
      <FormField id="set-password" label="Contraseña nueva" :error="errors.password">
        <template #default="{ id, invalid, describedby }">
          <PasswordInput :id="id" v-model="form.password" :invalid="invalid" :describedby="describedby ? `${describedby} set-rules` : 'set-rules'" autocomplete="new-password" />
        </template>
      </FormField>
      <FormField id="set-confirm" label="Repetir contraseña nueva" :error="errors.confirm">
        <template #default="{ id, invalid, describedby }">
          <PasswordInput :id="id" v-model="form.confirm" :invalid="invalid" :describedby="describedby" autocomplete="new-password" />
        </template>
      </FormField>
      <ul id="set-rules" class="space-y-1.5 text-sm" aria-label="Requisitos de la contraseña">
        <li v-for="c in checks" :key="c.text" :class="['flex items-center gap-2', c.ok ? 'text-emerald-800' : 'text-slate-600']">
          <AppIcon :name="c.ok ? 'check-circle' : 'circle'" :size="16" />{{ c.text }}<span class="sr-only">{{ c.ok ? '(cumplido)' : '(pendiente)' }}</span>
        </li>
      </ul>
      <PendingNotice :error="mutation.error.value" :action="mode === 'invite' ? 'la activación' : 'el cambio de contraseña'" />
      <Button type="submit" :label="copy.submit" class="w-full !border-action !bg-action hover:!border-action-dark hover:!bg-action-dark" :loading="mutation.isPending.value" />
    </form>
  </div>
</template>
