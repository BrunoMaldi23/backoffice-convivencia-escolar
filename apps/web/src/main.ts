import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import { VueQueryPlugin } from '@tanstack/vue-query';
import App from './App.vue';
import router from './router';
import { clearSession, SESSION_KEY } from './composables/useSession';
import { queryClient } from './lib/queryClient';
import { api, setUnauthorizedHandler } from './services/api';
import { InstitucionalPreset, localeEsCl } from './theme';
import './style.css';

async function start() {
  // Solo en `dev:preview`: la API simulada reemplaza al servidor para revisar el diseño sin tocar la base local.
  // `__UI_PREVIEW__` es el literal `false` en `vite build`, por lo que este bloque y el simulador no llegan a producción.
  if (__UI_PREVIEW__) {
    const { createFakeApi } = await import('./preview/fakeApi');
    const fake = createFakeApi();
    api.defaults.adapter = fake.adapter;
    // Permite provocar situaciones (por ejemplo, un cambio concurrente) al revisar el diseño o probar a mano.
    (window as unknown as { __fakeApi: typeof fake }).__fakeApi = fake;
  }

  const app = createApp(App);
  app.use(PrimeVue, {
    locale: localeEsCl,
    theme: {
      preset: InstitucionalPreset,
      // La interfaz es solo clara por ahora; un selector inexistente evita el modo oscuro automático del sistema.
      options: { darkModeSelector: '.app-dark', cssLayer: { name: 'primevue', order: 'theme, base, primevue, components, utilities' } }
    }
  });
  // Cualquier llamada autenticada que responda 401 (sesión vencida o revocada) cierra el estado local y avisa.
  setUnauthorizedHandler(() => {
    if (!queryClient.getQueryData(SESSION_KEY)) return;
    clearSession();
    void router.replace({ name: 'session-expired' });
  });

  app.use(router);
  app.use(VueQueryPlugin, { queryClient });
  app.mount('#app');
}

void start();
