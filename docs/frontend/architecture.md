# Arquitectura del frontend

`apps/web` es una SPA en Vue 3 con Vite, TypeScript estricto, PrimeVue 4 (preset Aura), Tailwind CSS 4, Vue Router, TanStack Vue Query y Axios. La Fase 1B construye la interfaz completa sin conectarla todavía al backend: cada pantalla está lista para recibir datos reales y, mientras tanto, muestra el estado **Integración pendiente** en lugar de simular respuestas.

## Estructura

```text
apps/web/src/
├── assets/              logo.png (pendiente de copiar, ver "Recursos institucionales")
├── components/          componentes reutilizables y tipos de configuración (types.ts)
├── composables/         useResource, useSession, useSidebar, useHealth
├── config/preview.ts    bandera del modo de previsualización
├── layouts/             AppLayout, AuthLayout, sidebar, header, migas, menú de usuario
├── lib/                 formato de fechas, RUT, validación, errores, estados, roles, auditoría
├── modules/<dominio>/   vistas de ruta y configuración (`*.config.ts`) por dominio
├── preview/             datos sintéticos (solo modo ui-preview)
├── router/              rutas, navegación lateral y guardia de sesión
├── services/            auth.ts, resources.ts, integration.ts, api.ts
├── types/models.ts      modelos de presentación y mapa de recursos
├── theme.ts             preset institucional de PrimeVue y textos es-CL
└── style.css            capas CSS, fuente y ajustes globales
```

Se mantuvo `src/modules/` de la Fase 0 (y de la skill `convivencia-vue-ui`) en lugar de crear `features/`.

## Flujo de datos

```text
services/*.ts  →  composables/use*.ts (TanStack Query)  →  vista
```

- `services/resources.ts` declara el endpoint de cada recurso en `ENDPOINTS` (`null` si el backend aún no lo define) y expone `fetchResource`, `fetchResourceItem` y `submitResource`.
- Hoy todas esas funciones llaman a `pendingIntegration()`, que lanza `IntegrationPendingError` con el endpoint previsto. Ninguna escritura informa éxito sin respuesta del servidor.
- `composables/useResource.ts` decide la fuente: datos sintéticos en previsualización o el servicio real en cualquier otro caso.
- `components/QueryState.vue` resuelve los cuatro estados (cargando, error o integración pendiente, vacío y con datos) para todas las vistas.
- Los modelos de `types/models.ts` son **de presentación**, no contratos. Al conectar cada recurso, el servicio adaptará la respuesta del backend a esos modelos, o se reemplazarán por tipos publicados en `packages/shared`.

## Autenticación y sesión

- `services/auth.ts` declara `login`, `fetchSession` (`GET /api/auth/me`), `logout`, `requestPasswordReset`, `resetPassword` y `acceptInvitation` según `docs/api/auth-contract.md` y `docs/api/password-recovery-contract.md`. Todas están pendientes de conexión.
- `useSession` guarda la sesión solo en la caché de TanStack Query (memoria). No se usa `localStorage`, `sessionStorage` ni cookies legibles para la sesión.
- La guardia del router (`router/index.ts`) deja pasar las rutas públicas; para las privadas consulta la sesión (`ensureSession`) y, sin sesión, redirige a `/login?redirect=…`. `lib/redirect.ts` solo acepta destinos internos.
- Las rutas con `meta.permission` requieren que la sesión declare ese permiso; si no, se redirige a `/acceso-denegado`. Los permisos se **deniegan por defecto**.
- Los códigos de recuperación e invitación se pegan en un formulario y viajan en el cuerpo del `POST`, nunca en la URL, como exige el contrato.

## Modo de previsualización

Sirve para revisar el diseño sin backend ni sesión.

```powershell
pnpm --filter @backoffice/web dev:preview   # Vite en modo ui-preview
```

- `vite.config.ts` define `__UI_PREVIEW__` como `true` solo cuando `command === 'serve'` y `mode === 'ui-preview'`. En `vite build` es el literal `false`.
- `preview/index.ts` y la guardia del router usan `__UI_PREVIEW__` directamente, por lo que el `import()` de `preview/demo-data.ts` y la omisión de la guardia se eliminan del paquete de producción. Se verificó que `dist/` no contiene el chunk `demo-data` ni sus textos.
- En previsualización: no hay sesión (el menú dice "Sin sesión"), las rutas privadas se abren, los ítems con permiso muestran un candado, un aviso ámbar recorre la parte superior y cada vista con datos lleva la insignia "Datos de demostración".
- Los datos sintéticos usan marcadores ("Estudiante demo 07"), correos `@demo.invalid` y no incluyen RUT ni contactos reales.

## Integración posterior con Codex

1. Revisar `docs/api/*.md` vigentes y el Swagger local.
2. En `services/api.ts`, agregar `withCredentials: true` y un interceptor que obtenga `GET /auth/csrf` y envíe `X-CSRF-Token` en `POST`/`PATCH`; ante `401`, limpiar `SESSION_KEY` y redirigir a `/sesion-expirada`.
3. Reemplazar cada `pendingIntegration()` de `services/auth.ts` y `services/resources.ts` por la llamada real y adaptar la respuesta al modelo de `types/models.ts`.
4. Mover filtrado, búsqueda y paginación de `ResourceListPage` a parámetros de servidor (`page`, `limit`, `search`, `role`, `active`).
5. Resolver las observaciones de contrato listadas en `docs/phase-1b-report.md`.
