import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import { VueQueryPlugin } from '@tanstack/vue-query';
import App from './App.vue';
import router from './router';
import { queryClient } from './lib/queryClient';
import { InstitucionalPreset, localeEsCl } from './theme';
import './style.css';

const app = createApp(App);
app.use(PrimeVue, {
  locale: localeEsCl,
  theme: {
    preset: InstitucionalPreset,
    // La interfaz es solo clara por ahora; un selector inexistente evita el modo oscuro automático del sistema.
    options: { darkModeSelector: '.app-dark', cssLayer: { name: 'primevue', order: 'theme, base, primevue, components, utilities' } }
  }
});
app.use(router);
app.use(VueQueryPlugin, { queryClient });
app.mount('#app');
