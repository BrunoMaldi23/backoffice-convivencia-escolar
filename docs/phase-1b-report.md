# Informe técnico: Fase 1B (frontend institucional)

Fecha: 2026-10-09 (America/Santiago).

**ESTADO: COMPLETADA.** Interfaz, logo institucional, validaciones técnicas y documentación terminados. Las conexiones con la API quedan para la siguiente fase, según lo acordado.

## 1. Vistas construidas

48 componentes de vista (`*View.vue`) que cubren 60 rutas: los cuatro módulos de comunidad educativa comparten tres vistas parametrizadas.

- **Autenticación (7):** ingreso, recuperar contraseña, restablecer contraseña, activar cuenta por invitación, sesión expirada, acceso denegado 403 y página no encontrada 404.
- **Inicio:** panel con 8 indicadores, evolución de casos, alertas, casos que requieren atención, tareas prioritarias, actividad reciente y próximas actividades.
- **Casos:** listado, casos cerrados, nuevo, edición y expediente con 11 pestañas (resumen, involucrados, antecedentes, entrevistas, medidas, protocolos, evidencias, documentos, derivaciones, seguimientos y bitácora).
- **Denuncias:** listado, registro interno y detalle con clasificación, estado, seguimiento y evidencias.
- **Medidas de resguardo:** listado con resumen de vigentes, pendientes y vencidas; formulario y detalle.
- **Protocolos:** biblioteca por categoría y detalle con etapas, tareas e historial.
- **Seguimientos:** listado, cronología, próximos y detalle con registro de resultado.
- **Comunidad educativa:** estudiantes, apoderados, funcionarios y cursos, cada uno con listado, ficha y formulario (RUT con dígito verificador).
- **Gestión:** tareas (lista y tablero), entrevistas (con acuerdos y vista previa del acta), citaciones (con vista previa del aviso), calendario (mes, semana y agenda móvil), derivaciones, documentos (biblioteca, plantillas y vista previa).
- **Análisis:** reportes con filtros por período y categoría, gráficos y tabla resumen.
- **Administración:** usuarios (listado, creación con invitación, edición, detalle, roles, activación, revocación de sesiones y reenvío de invitación), roles (tarjetas, matriz de permisos y detalle), auditoría (solo lectura, filtros y panel de detalle) y configuración (7 secciones).

## 2. Rutas

Ver [docs/frontend/routes.md](frontend/routes.md). Todas se cargan de forma diferida, con títulos de documento y migas de pan.

## 3. Componentes reutilizables

`AppIcon`, `InstitutionLogo`, `PageHeader`, `SectionCard`, `StatCard`, `StatusBadge`, `PriorityBadge`, `QueryState`, `LoadingState`, `ErrorState`, `EmptyState`, `SearchToolbar`, `ResourceTable`, `ResourceListPage`, `ResourceForm`, `FormField`, `ResourceDetailShell`, `DetailPanel`, `RelatedTable`, `Timeline`, `ConfirmActionDialog`, `PendingNotice`, `BarChart` y `PreviewBadge`. Layouts: `AppLayout`, `AuthLayout`, `AppSidebar`, `AppHeader`, `AppBreadcrumbs`, `UserMenu` y `NotificationsButton`. Detalle en [design-system.md](frontend/design-system.md).

## 4. Logo institucional

- El original está en la raíz del repositorio (`logo.png`, 600 × 293 px, sin modificar). Se copió tal cual a `apps/web/src/assets/logo.png`, la ruta de recursos de Vite.
- El archivo trae el nombre "Colegio Bautista" en blanco sobre transparente. Por eso `InstitutionLogo` tiene dos variantes: `full` (solo sobre el azul del escudo, `#10256B`, usado en la columna izquierda del ingreso) y `emblem` (recorte CSS del escudo para fondos claros: sidebar, 404 y acta).
- Si el archivo faltara, se muestra un espacio neutro rotulado "Logo".

## 5. Skills utilizadas

- `convivencia-vue-ui`: estructura en `src/modules`, flujo servicio → composable → vista, paleta slate/sky, fechas `dd-mm-aaaa`, RUT, accesibilidad y privacidad.
- `frontend-design`: dirección visual (columna institucional con regla vertical sky, Public Sans, superficies sin sombras, prioridad con barras de forma).
- `dataviz`: barras de una sola serie y un solo tono, sin leyenda, con tooltip, foco de teclado y vista de tabla.

## 6. Responsive

- Escritorio (≥ 1280 px): sidebar completa.
- Tablet (768–1279 px): sidebar plegada a íconos y expandible.
- Móvil (< 768 px): drawer, header compacto, filtros en dos columnas, tablas con columnas secundarias ocultas y desplazamiento horizontal interno, sin desbordar la página.
- El ingreso pasa de dos columnas a una franja superior con logo.

## 7. Validaciones

| Validación | Resultado | Evidencia |
| --- | --- | --- |
| `pnpm --filter @backoffice/web typecheck` | PASS | `vue-tsc --noEmit -p tsconfig.app.json`, código 0 |
| `pnpm --filter @backoffice/web lint` | PASS | 0 errores, 0 advertencias |
| `pnpm --filter @backoffice/web test` | PASS | 4 archivos, 19 pruebas |
| `pnpm --filter @backoffice/web build` | PASS | 564 módulos, sin errores |
| Exclusión de datos de demostración en `dist/` | PASS | Sin chunk `demo-data` ni textos sintéticos |
| Recorrido de rutas en navegador (modo ui-preview) | PASS | Las 59 rutas probadas renderizan su título sin errores de consola |
| Login: validación, mostrar/ocultar, envío | PASS | Errores por campo; `aria-pressed` cambia; el envío muestra "no conectado" y limpia la contraseña |
| Revisión visual de escritorio | PASS | Login, panel de inicio, usuarios, expediente y roles |
| Revisión visual móvil (375 px) | PASS con observación | Login y casos revisados; la captura del drawer quedó incompleta porque la ventana del navegador estaba oculta, pero su estructura se verificó en el DOM |
| Pruebas del backend | NOT RUN | Fuera del alcance (no se modificó `apps/api`) |

## 8. Problemas encontrados y corregidos

1. `typecheck` no verificaba nada: `tsconfig.json` es de solución (`files: []`). El script ahora usa `-p tsconfig.app.json`.
2. El lint no podía leer `<script setup lang="ts">` porque faltaba el parser de TypeScript. Se agregó `typescript-eslint` 8.43.0, la misma versión de la API y ya presente en el lockfile; el lockfile solo suma 3 líneas para `apps/web`. Se desactivaron cinco reglas de maquetación que chocaban con el estilo compacto existente.
3. En el primer build, los datos de demostración llegaban a producción porque Vite 8 no reducía `import.meta.env.DEV` a una constante. Se reemplazó por la constante de compilación `__UI_PREVIEW__`.
4. La ruta `/` coincidía con el layout de autenticación y el inicio aparecía vacío. Cada ruta pública tiene ahora su propio padre.
5. En tablet se veían dos logos en el ingreso por un conflicto de clases `hidden`/`inline-flex`.
6. En móvil, los folios se partían en los guiones y la columna de acciones se salía de la tabla.
7. Una advertencia de Vue por pasar `class` a un componente sin raíz única (`QueryState`) en reportes.
8. Faltaba un `h1` en la vista "registro no encontrado".

## 9. Pendientes de integración y observaciones al contrato

No se conectó la API, según lo indicado. Cada servicio declara su endpoint en `services/auth.ts` y `services/resources.ts`. Observaciones para Codex (no se modificó el backend):

1. **`GET /auth/me` no devuelve permisos.** La guardia de rutas y la visibilidad del menú necesitan `permissions: string[]`. Sin ese campo, toda ruta con permiso redirigirá a 403 (los permisos se niegan por defecto).
2. **El usuario no indica si su invitación está pendiente.** Solo trae `isActive`, que no distingue una cuenta desactivada de una invitación sin aceptar. Esa distinción decide si se ofrece "Reactivar" (que el backend rechaza con 409) o "Reenviar invitación". Se sugiere un campo `invitationPending` o un `status`.
3. **El usuario no trae `lastLoginAt`.** La ficha muestra "Último ingreso"; puede quitarse si el dato no se publicará.
4. **La auditoría entrega `actorUserId` (UUID) y el resultado dentro de `metadata`.** La tabla necesita el nombre visible del actor y un campo `result` normalizado. También falta un filtro por fechas en el servidor.
5. **Los roles no incluyen cantidad de usuarios.** Se puede derivar con `GET /users?role=`, pero cuesta una consulta por rol.
6. **Login con contraseña de menos de 12 caracteres responde 400, no 401.** El frontend trata ambos como credenciales incorrectas, pero conviene unificarlo.
7. **No hay endpoints** para casos, denuncias, medidas, protocolos, seguimientos, comunidad, tareas, entrevistas, citaciones, calendario, derivaciones, documentos, reportes, notificaciones ni configuración.
8. **La API solo permite el origen `localhost:5173` en CORS.** El modo de previsualización corre en 5174 (para no chocar con el contenedor `web`), por lo que la vista "Estado del servicio" muestra la API no disponible en ese modo. Es el comportamiento esperado.

## 10. Archivos

- **Modificados:** `apps/web/index.html`, `package.json`, `eslint.config.js`, `vite.config.ts`, `src/main.ts`, `src/App.vue`, `src/style.css`, `src/vite-env.d.ts`, `src/router/index.ts`, `src/layouts/AppLayout.vue`, `src/modules/HomeView.vue` (ahora "Estado del servicio") y `src/modules/NotFoundView.vue`; además `pnpm-lock.yaml` (+3 líneas).
- **Creados en `apps/web`:** `src/theme.ts`, `src/config/`, `src/lib/` (format, rut, validation, errors, status, roles, audit, redirect, queryClient), `src/types/models.ts`, `src/services/` (auth, resources, integration), `src/composables/` (useResource, useSession, useSidebar), `src/preview/`, `src/components/` (24 archivos), `src/layouts/` (6 nuevos), `src/router/navigation.ts`, `src/modules/<dominio>/` (vistas y configuraciones) y `tests/` (format, validation, integration).
- **Fuera de `apps/web`:** `docs/frontend/architecture.md`, `docs/frontend/design-system.md`, `docs/frontend/routes.md`, este informe y `.claude/launch.json` (servidor de previsualización en el puerto 5174).
- **No modificados:** `apps/api`, Prisma, migraciones, Docker, Compose, infraestructura, `packages/shared` y las skills.

## 11. Rama y aislamiento

Se trabajó en `main`, en el directorio local, sin cambiar de rama ni hacer commit, merge o push. No se usó un worktree porque todo el proyecto está sin versionar (el único commit contiene solo `README.md`): un worktree habría quedado vacío. Para no interferir con Codex, los cambios se limitaron a `apps/web`, `docs/frontend`, este informe y `.claude/launch.json`.

Pinia no se usó: no está instalada en `apps/web`, aunque `AGENTS.md` la menciona. El estado de servidor vive en TanStack Query y el estado de interfaz (sidebar) en un composable, sin necesidad de una dependencia nueva.

## 12. Cómo integrar los cambios de Codex

1. Confirmar que Codex no editó `apps/web` en paralelo (`git status` y una revisión de `apps/web`), y versionar ambos trabajos en commits separados.
2. Copiar el logo original a `apps/web/src/assets/logo.png`.
3. Seguir los pasos de "Integración posterior con Codex" en [architecture.md](frontend/architecture.md): Axios con credenciales, interceptor CSRF, manejo de 401 y reemplazo de `pendingIntegration()` recurso por recurso, empezando por autenticación, usuarios, roles y auditoría.
4. Acordar con Codex las observaciones 1 a 6 de la sección 9 antes de conectar usuarios y auditoría.
5. Volver a ejecutar `pnpm --filter @backoffice/web typecheck`, `lint`, `test` y `build`, y recorrer las vistas con sesión real desde `http://localhost:5173`.
