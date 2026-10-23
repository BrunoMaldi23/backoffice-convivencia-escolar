# Arquitectura del frontend

`apps/web` es una SPA en Vue 3 con Vite, TypeScript estricto, PrimeVue 4 (preset Aura), Tailwind CSS 4, Vue Router, TanStack Vue Query y Axios, conectada a la API real del backend NestJS. El detalle de endpoints, pendientes y problemas del backend está en [api-integration.md](api-integration.md).

## Estructura

```text
apps/web/src/
├── assets/              logo.png (original del colegio, sin modificar)
├── components/          componentes reutilizables y tipos de configuración (types.ts)
├── composables/         consultas y mutaciones con Vue Query (useCases, useCaseContent, useAdmin, useScoped, useSession…)
├── config/preview.ts    bandera del modo de previsualización
├── layouts/             AppLayout, AuthLayout, sidebar, header, migas, notificaciones, menú de usuario
├── lib/                 formato, RUT, validación, errores, estados, catálogos, roles, auditoría, indicadores, acceso
├── modules/<dominio>/   vistas de ruta y sus pestañas/diálogos por dominio
├── preview/fakeApi.ts   API simulada (solo `dev:preview` y pruebas)
├── router/              rutas, navegación lateral y guardia de sesión
├── services/            clientes HTTP tipados: api.ts, auth.ts, admin.ts, cases.ts, caseOperations.ts
├── types/api.ts         tipos de la API (contratos del backend)
├── theme.ts             preset institucional de PrimeVue y textos es-CL
└── style.css            capas CSS, fuente y ajustes globales
```

Se mantuvo `src/modules/` (y no `features/`) por coherencia con la skill `convivencia-vue-ui`. Pinia no se instaló: el estado del servidor vive en Vue Query y el de interfaz (sidebar, establecimiento elegido) en composables, sin necesidad de otra dependencia.

## Flujo de datos

```text
services/*.ts (funciones HTTP tipadas)  →  composables/use*.ts (Vue Query)  →  vista
```

- **Servicios**: funciones puras sobre la instancia `api` (Axios con cookies y CSRF). No guardan estado.
- **Consultas**: claves `['cases', …]`, `['case', id, <parte>]`, `['users', …]`, `['scoped', <tipo>]`, etc. Cada pestaña del expediente consulta su propio endpoint solo cuando se abre.
- **Mutaciones** (`useApiMutation`): al terminar bien invalidan por prefijo (`caseScope(id)` invalida el expediente, los listados, los agregados y las notificaciones). Nunca se actualizan datos "a ojo": la pantalla vuelve a leer del servidor.
- **Estados**: `QueryState` resuelve cargando, error (con "Reintentar"; sin botón ante 403), vacío y con datos.
- **Errores de escritura**: `MutationDialog` y `ConfirmActionDialog` mantienen el diálogo abierto y muestran el motivo real; un 409 ofrece "Recargar datos".
- **Vistas globales** (`useScoped`): la API solo entrega tareas, medidas, seguimientos, entrevistas, denuncias y documentos por expediente. Se componen consultando los expedientes autorizados más recientes (60 con contenido, hasta 300 para el listado) con 5 llamadas simultáneas, y cada vista informa su base (`ScopeNotice`).
- **Indicadores** (`lib/metrics.ts`): funciones puras sobre datos ya consultados; no existen estadísticas inventadas ni endpoints supuestos.

## Autenticación y sesión

Contratos: [auth-contract](../api/auth-contract.md), [password-recovery-contract](../api/password-recovery-contract.md) y [frontend-integration-guide](../api/frontend-integration-guide.md).

- **Cliente HTTP** (`services/api.ts`): Axios con `withCredentials: true`. La sesión es la cookie HttpOnly `bce_session`; el frontend no lee ni guarda tokens, y no usa `localStorage` ni `sessionStorage`.
- **CSRF**: las escrituras autenticadas (todo `POST`/`PATCH` salvo `/auth/login`, `forgot-password`, `reset-password` y `accept-invitation`) obtienen el token de `GET /auth/csrf` y lo envían en `X-CSRF-Token`. El token vive solo en memoria; ante un 403 en una escritura se pide uno nuevo y se reintenta una sola vez.
- **Ingreso**: `POST /auth/login` y luego `GET /auth/me`; si `/auth/me` responde 401, se informa que la sesión no quedó establecida (por ejemplo, cookies bloqueadas).
- **Persistencia tras recargar**: la guardia consulta `GET /auth/me` (`ensureSession`) y reutiliza el resultado en memoria. Un 401 es "sin sesión"; un fallo del servidor lleva a `/login?motivo=servidor`.
- **Rutas**: las privadas exigen sesión y redirigen a `/login?redirect=<ruta>`; quien ya tiene sesión que entra a `/login` vuelve al panel. `lib/redirect.ts` solo acepta destinos internos.
- **Permisos**: `/auth/me` solo entrega roles. El menú y los botones usan `lib/access.ts` (matriz inicial del seed) como indicio; el servidor decide con 403 y la interfaz lo muestra como "Acceso denegado".
- **Sesión caducada o revocada**: cualquier llamada autenticada que responda 401 limpia por completo el estado en memoria y lleva a `/sesion-expirada`.
- **Cierre de sesión**: `POST /auth/logout` con CSRF y limpieza total de la caché local.
- **Recuperación**: el código recibido por correo se pega en el formulario y viaja en el cuerpo del `POST`, nunca en la URL.

## Modo de previsualización

```powershell
pnpm --filter @backoffice/web dev:preview   # Vite en modo ui-preview, API simulada
```

`vite.config.ts` define `__UI_PREVIEW__` como `true` solo con `vite serve --mode ui-preview`; en `vite build` es el literal `false`, por lo que el `import()` de `preview/fakeApi.ts` y sus datos se eliminan del paquete de producción (verificado en `dist/`). El simulador replica el contrato real y la sesión es sintética: no hay cuentas ni contraseñas, y no se toca la base local.

## Pruebas

`pnpm --filter @backoffice/web test` (Vitest, 62 pruebas): validaciones, RUT, fechas, errores, indicadores, máquina de estados, capa HTTP y CSRF, y flujos de servicios contra el simulador (`tests/api-flows.spec.ts`). Esas pruebas validan la lógica del frontend; no sustituyen una prueba con el backend real.
