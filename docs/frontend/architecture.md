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

## Autenticación y sesión (integrada con la API real)

Contratos: [auth-contract](../api/auth-contract.md), [password-recovery-contract](../api/password-recovery-contract.md) y [frontend-integration-guide](../api/frontend-integration-guide.md).

- **Cliente HTTP** (`services/api.ts`): Axios con `withCredentials: true`. La sesión es la cookie HttpOnly `bce_session`; el frontend no lee ni guarda tokens, y no usa `localStorage` ni `sessionStorage`.
- **CSRF**: las escrituras autenticadas (todo `POST`/`PATCH` salvo `/auth/login`, `forgot-password`, `reset-password` y `accept-invitation`) obtienen el token de `GET /auth/csrf` y lo envían en `X-CSRF-Token`. El token vive solo en memoria del módulo; ante un 403 en una escritura se pide uno nuevo y se reintenta una sola vez.
- **Ingreso** (`services/auth.ts`): `POST /auth/login` y luego `GET /auth/me`. La segunda llamada confirma que el navegador guardó la cookie y entrega el usuario; si responde 401, se informa que la sesión no quedó establecida (por ejemplo, cookies bloqueadas).
- **Persistencia tras recargar**: la guardia del router consulta `GET /auth/me` (`ensureSession`) y reutiliza el resultado en memoria (TanStack Query). Un 401 es "sin sesión"; cualquier otro fallo (API caída, 5xx) no se confunde con sesión cerrada y lleva a `/login?motivo=servidor`.
- **Rutas**: las privadas exigen sesión y redirigen a `/login?redirect=<ruta>`; quien ya tiene sesión que entra a `/login` vuelve al panel. `lib/redirect.ts` solo acepta destinos internos.
- **Permisos**: `/auth/me` solo entrega roles (informativos). El menú usa `lib/access.ts` como indicio, con la matriz inicial documentada, pero nunca concede acceso: el servidor responde 403 y `ErrorState` lo muestra como "Acceso denegado" sin botón de reintento.
- **Sesión caducada o revocada**: cualquier llamada autenticada que responda 401 limpia por completo el estado en memoria (`clearSession`) y lleva a `/sesion-expirada`.
- **Cierre de sesión**: `POST /auth/logout` con CSRF y limpieza total de la caché local; un 401 se considera sesión ya cerrada.
- **Recuperación**: `forgot-password`, `reset-password` y `accept-invitation` usan los endpoints reales. El código se pega en el formulario y viaja en el cuerpo del `POST`, nunca en la URL; los mensajes distinguen código inválido o vencido (400/401), límite de intentos (429) y fallos del servidor.

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
2. (Hecho) `services/api.ts` ya envía credenciales, gestiona CSRF y avisa ante 401.
3. Reemplazar cada `pendingIntegration()` de `services/resources.ts` por la llamada real y adaptar la respuesta al modelo de `types/models.ts`, empezando por usuarios, roles y auditoría.
4. Mover filtrado, búsqueda y paginación de `ResourceListPage` a parámetros de servidor (`page`, `limit`, `search`, `role`, `active`).
5. Resolver las observaciones de contrato listadas en `docs/phase-1b-report.md`.
