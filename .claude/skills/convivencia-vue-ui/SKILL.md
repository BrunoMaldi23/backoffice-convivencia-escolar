---
name: convivencia-vue-ui
description: Convenciones de interfaz para apps/web del backoffice de convivencia escolar (Vue 3, PrimeVue 4, Tailwind 4, TanStack Vue Query). Úsela al crear o modificar vistas, componentes, formularios, tablas, navegación, estilos o llamadas a la API desde el frontend.
---

# Interfaz Vue del backoffice de convivencia escolar

Aplica a todo lo que esté bajo `apps/web`. El usuario final es personal del establecimiento (encargado de convivencia, inspectoría, dirección), en escritorio y a veces en tablet.

## Stack y dónde va cada cosa

| Carpeta | Contenido |
| --- | --- |
| `src/modules/<dominio>/` | Vistas de ruta (`*View.vue`) y componentes propios del dominio. |
| `src/components/` | Componentes reutilizables entre dominios. |
| `src/composables/` | `use*` que envuelven `useQuery` / `useMutation`. |
| `src/services/` | Funciones HTTP sobre la instancia `api` de `services/api.ts`. |
| `src/stores/` | Estado global de UI (solo si no es estado del servidor). |
| `src/layouts/` | `AppLayout.vue` con barra lateral y `RouterView`. |
| `src/router/index.ts` | Rutas; las vistas nuevas se cargan con `() => import(...)`. |

Importe siempre con el alias `@/`.

## Componentes

- Siempre `<script setup lang="ts">`, en orden `script` → `template` → `style` (solo si es imprescindible).
- Tipar `defineProps<...>()` y `defineEmits<...>()`; nada de `any`.
- Un componente por archivo, nombre en PascalCase. Las vistas terminan en `View`.
- Derivar con `computed`, no duplicar estado.
- Prefiera componentes de PrimeVue (`Button`, `InputText`, `Select`, `DatePicker`, `DataTable`, `Dialog`, `Toast`, `Message`, `Tag`) antes que reescribirlos. Impórtelos por componente: `import Button from 'primevue/button'`.

## Datos del servidor

- Nunca llame a `axios` ni a `api` directamente desde un componente. Flujo: `services/*.ts` (función tipada) → `composables/use*.ts` (`useQuery`/`useMutation`) → componente.
- Las claves de consulta son arreglos que empiezan por el dominio: `['casos', id]`.
- Tras una mutación, invalide las consultas afectadas con `queryClient.invalidateQueries`.
- Los tipos de respuesta compartidos con la API se definen en `packages/shared`.
- Cada vista que consulta datos muestra **cuatro estados**: cargando (`isPending`), error (con acción para reintentar), vacío y con datos. `src/modules/HomeView.vue` muestra el patrón básico de cargando/éxito/error.

## Estilo visual

- Tailwind 4 para layout y espaciado; PrimeVue (Aura) para controles. No mezcle CSS propio salvo en `src/style.css`.
- Paleta: fondo `slate-50`, superficies blancas con `border-slate-200` y `shadow-sm`, texto `slate-900` / `slate-600`, acento `sky-700`. Estados: éxito `emerald-700`, advertencia `amber-700`, error `red-700`.
- Tarjetas: `rounded-xl border border-slate-200 bg-white p-5 shadow-sm`.
- Encabezado de vista: subtítulo `text-sm font-medium text-sky-700`, título `h2` con `text-3xl font-bold tracking-tight text-slate-900`, contenido en `mx-auto max-w-*`.
- Diseño responsivo desde 320 px; la barra lateral se apila en móvil (`md:flex`).

## Lenguaje y formato

- Todo texto visible en español de Chile, tono institucional y claro. Use "estudiante", "apoderado/a", "funcionario/a", "caso", "medida", "entrevista".
- Fechas `dd-mm-aaaa` y horas de 24 h con `Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago' })`.
- RUT con formato `12.345.678-5` y validación de dígito verificador.
- Mensajes de error accionables: qué pasó y qué hacer, sin detalles técnicos ni trazas.

## Accesibilidad

- Cada control de formulario tiene `<label>` asociado; los botones solo con ícono llevan `aria-label`.
- Contraste mínimo AA; no comunique estado solo con color (agregue texto o ícono).
- Navegable con teclado; los `Dialog` devuelven el foco al cerrar.

## Privacidad (datos de menores)

- No guarde datos personales en `localStorage`, `sessionStorage` ni en la URL; use identificadores opacos en rutas (`/casos/:id`).
- No haga `console.log` de respuestas de la API.
- Use solo datos ficticios en pruebas, ejemplos y capturas.

## Pruebas y verificación

- Pruebas en `apps/web/tests/**/*.spec.ts` con Vitest (entorno `node`). Cubra al menos servicios y lógica de composables.
- Antes de terminar: `pnpm --filter @backoffice/web typecheck`, `pnpm --filter @backoffice/web lint` y `pnpm --filter @backoffice/web test`.
