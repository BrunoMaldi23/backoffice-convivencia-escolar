import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, mode }) => ({
  plugins: [vue(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Previsualización de interfaz: solo con el servidor de desarrollo en modo `ui-preview`. En `vite build` es el literal
  // `false`, por lo que el código y los datos de demostración se eliminan del paquete de producción.
  define: { __UI_PREVIEW__: JSON.stringify(command === 'serve' && mode === 'ui-preview') },
  test: { environment: 'node', include: ['tests/**/*.spec.ts'] }
}));
