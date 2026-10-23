<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { isAxiosError } from 'axios';
import Button from 'primevue/button';
import Message from 'primevue/message';
import AppIcon from '@/components/AppIcon.vue';
import FormField from '@/components/FormField.vue';
import IconInput from '@/components/IconInput.vue';
import { useLogin } from '@/composables/useSession';
import { describeError } from '@/lib/errors';
import { safeRedirect } from '@/lib/redirect';
import { email, required, validateAll } from '@/lib/validation';
import AuthTitle from './AuthTitle.vue';
import PasswordInput from './PasswordInput.vue';

const route = useRoute();
const router = useRouter();
const login = useLogin();
const form = reactive({ email: '', password: '' });
const errors = ref<Partial<Record<'email' | 'password', string>>>({});
const alertBox = ref<HTMLElement | null>(null);

const schema = { email: [required('Ingrese su correo institucional.'), email()], password: [required('Ingrese su contraseña.')] };

/** Credenciales inválidas responden 400/401; el mensaje no revela si el correo existe. */
const failure = computed(() => {
  const error = login.error.value;
  if (!error) return null;
  if (isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 401)) return 'Correo o contraseña incorrectos. Revise los datos e intente nuevamente.';
  return describeError(error);
});

/** Avisos al llegar desde la guardia de rutas (por ejemplo, la API no respondió al verificar la sesión). */
const notice = computed(() => (route.query.motivo === 'servidor' ? 'No se pudo verificar su sesión porque el servidor no responde. Intente nuevamente en unos minutos.' : null));

onMounted(() => document.getElementById('login-email')?.focus());

async function submit() {
  if (login.isPending.value) return;
  errors.value = validateAll(form, schema);
  if (Object.keys(errors.value).length) {
    await nextTick();
    document.getElementById(errors.value.email ? 'login-email' : 'login-password')?.focus();
    return;
  }
  login.mutate({ email: form.email.trim(), password: form.password }, {
    onSuccess: () => router.replace(safeRedirect(route.query.redirect)),
    onError: async () => {
      form.password = '';
      await nextTick();
      alertBox.value?.focus();
    }
  });
}
</script>

<template>
  <div>
    <AuthTitle>Iniciar sesión</AuthTitle>
    <p class="mt-4 text-sm leading-relaxed text-slate-600">Ingrese con su correo institucional y su contraseña para acceder al panel.</p>

    <div ref="alertBox" tabindex="-1" class="mt-4 outline-none empty:mt-0" aria-live="assertive">
      <Message v-if="failure" severity="error" :closable="false">{{ failure }}</Message>
      <Message v-else-if="notice" severity="warn" :closable="false">{{ notice }}</Message>
    </div>

    <form novalidate class="mt-5 space-y-4" @submit.prevent="submit">
      <FormField id="login-email" label="Correo electrónico" :error="errors.email">
        <template #default="{ id, invalid, describedby }">
          <IconInput :id="id" v-model="form.email" icon="mail" type="email" inputmode="email" autocomplete="username" placeholder="nombre@colegio.cl" :invalid="invalid" :describedby="describedby" />
        </template>
      </FormField>

      <div>
        <FormField id="login-password" label="Contraseña" :error="errors.password">
          <template #default="{ id, invalid, describedby }">
            <PasswordInput :id="id" v-model="form.password" :invalid="invalid" :describedby="describedby" autocomplete="current-password" placeholder="Ingrese su contraseña" />
          </template>
        </FormField>
        <div class="mt-2.5 flex justify-end">
          <RouterLink :to="{ name: 'forgot-password' }" class="rounded text-sm font-medium text-action hover:text-action-dark hover:underline">¿Olvidaste tu contraseña?</RouterLink>
        </div>
      </div>

      <Button type="submit" class="w-full !border-action !bg-action hover:!border-action-dark hover:!bg-action-dark" :loading="login.isPending.value">
        <span class="inline-flex items-center gap-2">Iniciar sesión<AppIcon name="arrow-right" :size="18" /></span>
      </Button>
    </form>

    <div class="mt-6 space-y-2 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
      <p class="flex items-center gap-2"><AppIcon name="lock" :size="14" />Acceso exclusivo para personal autorizado.</p>
      <p class="pl-6">Si no puede ingresar, contacte a la administración del sistema del establecimiento.</p>
    </div>

  </div>
</template>
