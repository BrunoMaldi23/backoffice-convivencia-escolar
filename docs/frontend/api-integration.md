# Integración del frontend con la API

Estado al 2026-10-23. Base de referencia: [backend-contracts.md](../api/backend-contracts.md) y [frontend-integration-guide.md](../api/frontend-integration-guide.md).

## Cobertura de las 64 operaciones

| Dominio | Operaciones | Estado en la interfaz |
| --- | --- | --- |
| Salud | `GET /health` | Conectada (Configuración, Estado del servicio) |
| Autenticación | `POST /auth/login`, `GET /auth/me`, `GET /auth/csrf`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/accept-invitation` | Conectadas |
| Usuarios | `GET/POST /users`, `GET/PATCH /users/:id`, `PATCH …/status`, `PATCH …/roles`, `POST …/revoke-sessions`, `POST …/resend-invitation` | Conectadas (Administración, Usuarios) |
| Roles | `GET /roles`, `GET /permissions` | Conectadas (Roles y permisos) |
| Roles | `GET /roles/:id` | Solo en `services/admin.ts`: el listado ya trae el detalle completo |
| Auditoría | `GET /audit` | Conectada (Auditoría) |
| Instituciones | `GET/POST /establishments`, `PATCH /establishments/:id`, `POST …/memberships`, `POST …/stages`, `POST /cases/:id/access-grants`, `POST …/revoke` | Conectadas (Establecimientos y pestaña Accesos del expediente) |
| Instituciones | `PATCH …/stages/:stageId` | Solo en `services/admin.ts`: la API no lista etapas, no hay de dónde elegir una |
| Expedientes | `POST/GET /cases`, `GET/PATCH /cases/:id`, `POST …/assign`, `POST …/transition`, `GET …/timeline` | Conectadas (Casos) |
| Denuncias e involucrados | `GET/POST /cases/:id/reports`, `PATCH …/reports/:id`, `POST /participants`, `GET/POST /cases/:id/participants`, `POST …/unlink` | Conectadas |
| Entrevistas | `GET/POST /cases/:id/interviews`, `PATCH …/:id`, `POST …/finalize`, `POST …/correct` | Conectadas |
| Documentos | `GET/POST /cases/:id/documents`, `GET …/download` | Conectadas (ver "Problemas del backend") |
| Protocolos | `GET /protocols/:establishmentId`, `POST /protocols`, `POST …/versions/:id/publish`, `POST /cases/:id/protocols/:versionId` | Conectadas |
| Medidas, seguimientos y tareas | `GET/POST …/measures`, `POST …/measures/:id/update`, `GET/POST …/follow-ups`, `GET/POST …/tasks`, `POST …/tasks/:id/complete` | Conectadas |
| Notificaciones | `GET /notifications`, `POST /notifications/:id/read` | Conectadas (campana y página) |

Resultado: 62 de 64 operaciones tienen pantalla; las 2 restantes están implementadas en la capa de servicios y esperan datos que la API todavía no entrega.

## Pantallas conectadas

Panel de inicio, Casos (listado, creación, expediente con 11 pestañas), Denuncias, Medidas, Protocolos, Seguimientos, Tareas, Entrevistas, Calendario, Documentos, Reportes, Notificaciones, Usuarios (listado y ficha), Roles y permisos, Establecimientos, Auditoría y Configuración. El login y la recuperación de contraseña se integraron en la fase anterior.

Las pantallas globales (denuncias, medidas, seguimientos, tareas, entrevistas, documentos, calendario y los indicadores del panel) se componen consultando los expedientes autorizados más recientes (hasta 300 para el listado y 60 para el contenido) y, de cada uno, su contenido. Cada vista indica cuántos expedientes revisó. Es una composición de endpoints reales y autorizados, no una estimación, pero no es un listado global del servidor.

## Módulos sin API (pendientes)

Se conservan en el menú con la etiqueta "Pendiente" y una pantalla que explica qué falta; no muestran datos ni formularios simulados.

| Módulo | Qué falta en el backend |
| --- | --- |
| Estudiantes, apoderados, funcionarios y cursos | Catálogos, búsqueda, matrícula y relación con expedientes. Hoy solo existe el "involucrado" del expediente, con un identificador de referencia de texto libre |
| Citaciones | Endpoints de citaciones (crear, enviar, confirmar, asistencia) y generación de documentos en el servidor |
| Derivaciones | Endpoints de derivaciones e instituciones receptoras |

## Necesidades de backend

Detectadas al integrar; ninguna se modificó en el backend.

1. **Listar etapas** (`GET /establishments/:id/stages`). Sin él no se puede mostrar el nombre de la etapa de un expediente ni ofrecer el cambio de etapa (`PATCH /cases/:id` con `currentStageId` y `POST …/transition` con `stageId` ya están soportados en `services/cases.ts`). Hoy la ficha muestra "Etapa asignada" sin nombre.
2. **Establecimientos del usuario**. `GET /establishments` exige `institutions.read`, que en la matriz inicial solo tiene SYSTEM_ADMIN. Un encargado de convivencia no puede conocer el identificador del establecimiento para crear su primer expediente ni administrar protocolos. La interfaz lo deduce de los expedientes ya autorizados; con ninguno, no hay forma. Se necesita un `GET /me/establishments` (o equivalente).
3. **Directorio de personas por establecimiento**. `GET /users` exige `users.read`. Sin él no se resuelven los nombres de responsables, entrevistadores ni autores (se muestra "Usted" o un identificador corto) y la asignación pide pegar un UUID.
4. **Permisos efectivos en `GET /auth/me`**. Solo entrega roles. El menú y los botones usan la matriz inicial del seed como indicio; si se altera la matriz en la base, la interfaz puede mostrar u ocultar de más (el servidor siempre decide con 403).
5. **Estado de invitación en el usuario**. `isActive: false` no distingue "desactivada" de "invitación pendiente". La ficha ofrece las dos acciones y muestra el 409 del servidor si no corresponde.
6. **Listados de involucrados, accesos concedidos, borradores de protocolo y protocolos aplicados**. No existen: no se pueden reutilizar involucrados de otros casos, ver quién tiene acceso a un expediente, recuperar un borrador de protocolo sin publicar ni listar aplicaciones (se deducen de la línea de tiempo).
7. **Búsqueda por texto en `GET /cases`**. Hoy la búsqueda y los filtros por categoría y responsable se hacen en el navegador sobre hasta 300 expedientes.
8. **Listados globales y estadísticas** (tareas, medidas, seguimientos, denuncias, documentos, indicadores del panel): permitirían reemplazar la composición por expediente y evitar muchas llamadas.
9. **Catálogos**: categoría, prioridad, canal, clasificación, modalidad y participación son texto libre en la API. La interfaz usa una convención (ver abajo); el establecimiento debe definir los catálogos oficiales.
10. **Entrevistas "programadas"**. El modelo solo guarda entrevistas ya realizadas (borrador o finalizada); no hay agenda ni asistentes. La interfaz informa entrevistas en borrador, no programadas.
11. **Documentos por entrevista**. Los documentos pertenecen al expediente; no existe el vínculo documento-entrevista.

## Problemas del backend

- **Límite de cuerpo JSON de ~100 KB** (verificado contra la API real con un cuerpo sintético a un endpoint público: 200 KB → HTTP 413). Como la carga de documentos envía el archivo en base64 dentro de un JSON, solo caben archivos de hasta ~75 KB, aunque el contrato indica 10 MiB. La interfaz valida el máximo contractual (10 MB) y, si el servidor responde 413, explica el rechazo. Solución en el backend: elevar el límite de `express.json` en `main.ts` (o aceptar `multipart/form-data`).

## Convenciones de la interfaz

- **Códigos de catálogo** (`lib/catalogs.ts`): categorías (`CONVIVENCIA`, `ACOSO`, `CIBERACOSO`, `VIOLENCIA`, `DISCRIMINACION`, `VULNERACION`, `OTRO`), prioridades (`BAJA`, `MEDIA`, `ALTA`, `CRITICA`), canales (`DIRECTO`, `CORREO`, `TELEFONO`, `BUZON`, `OTRO`), clasificaciones (`SIN_CLASIFICAR`, `LEVE`, `GRAVE`, `GRAVISIMA`), modalidades (`PRESENCIAL`, `VIDEOLLAMADA`, `TELEFONICA`) y participaciones (`AFECTADO`, `DENUNCIANTE`, `IMPLICADO`, `TESTIGO`, `OTRO`). Cualquier otro código recibido se muestra tal cual.
- **Folio**: el backend guarda un entero por establecimiento; se muestra como `EXP-0001`.
- **Contenido de protocolos**: JSON libre; la interfaz guarda `{ "descripcion": "…", "etapas": ["…"] }` y muestra cualquier otra estructura como JSON.
- **Versiones**: toda edición envía `expectedVersion`. Un 409 muestra el motivo del servidor y "Recargar datos"; nunca se reintenta una escritura automáticamente.
- **Errores**: las reglas de negocio del servidor (texto en español) se muestran tal cual; los errores de validación de DTO se reemplazan por un mensaje genérico. Un 404 no distingue "inexistente" de "sin acceso".
- **Privacidad**: los documentos se descargan por la API y se entregan al navegador con una dirección temporal local (nunca pública); las notas restringidas de entrevistas se ocultan hasta que la persona decide mostrarlas; los identificadores de involucrados son códigos internos; nada sensible se guarda en el navegador.

## Previsualización con API simulada

`pnpm --filter @backoffice/web dev:preview` levanta la interfaz con `src/preview/fakeApi.ts`, un adaptador de Axios en memoria que replica el contrato (CSRF, versiones, 409, 403, 404, máquina de estados, límite de 100 KB). Sirve para revisar el diseño y probar flujos sin credenciales y sin tocar la base local. Los datos son sintéticos y rotulados, no existen cuentas ni contraseñas (el inicio de sesión real no está disponible; la sesión es sintética) y `window.__fakeApi` permite provocar situaciones como un cambio concurrente. `__UI_PREVIEW__` es el literal `false` en `vite build`: se verificó que `dist/` no contiene el simulador ni sus datos.

Las mismas reglas se prueban automáticamente en `tests/api-flows.spec.ts` contra ese simulador. Esas pruebas validan la lógica del frontend, **no** el comportamiento del backend real.
