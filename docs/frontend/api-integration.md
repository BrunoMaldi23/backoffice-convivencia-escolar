# Integración del frontend con la API

Estado al 2026-10-23. Base de referencia: [backend-contracts.md](../api/backend-contracts.md), [community-contract.md](../api/community-contract.md) y [frontend-integration-guide.md](../api/frontend-integration-guide.md).

## Cobertura de las 93 operaciones

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
| Establecimiento propio | `GET /me/establishments`, `GET /establishments/:id/stages`, `GET /establishments/:id/members` | Conectadas (selector de establecimiento, nombre de etapa, directorio de responsables) |
| Cursos | `GET/POST /courses`, `PATCH /courses/:id` | Conectadas (Cursos) |
| Estudiantes | `GET/POST /students`, `GET/PATCH /students/:id`, `GET /students/:id/cases`, `POST /students/:id/guardians`, `POST …/guardians/:guardianId/unlink`, `POST /students/import` | Conectadas (Estudiantes, ficha y carga masiva CSV) |
| Apoderados | `GET/POST /guardians`, `GET/PATCH /guardians/:id` | Conectadas (Apoderados y ficha) |
| Funcionarios | `GET/POST /staff`, `PATCH /staff/:id` | Conectadas (Funcionarios) |
| Citaciones | `GET/POST /cases/:id/summons`, `POST …/summons/:id/update`, `GET /summons` | Conectadas (pestaña del expediente y listado global) |
| Derivaciones | `GET/POST /cases/:id/referrals`, `POST …/referrals/:id/update`, `GET /referrals` | Conectadas (pestaña del expediente y listado global) |

Resultado: 91 de 93 operaciones tienen pantalla; las 2 restantes (`GET /roles/:id` y `PATCH …/stages/:stageId`) están en la capa de servicios y no se usan porque el listado ya trae lo necesario.

## Pantallas conectadas

Panel de inicio, Casos (listado, creación, expediente con 13 pestañas), Denuncias, Medidas, Protocolos, Seguimientos, Tareas, Entrevistas, Citaciones, Derivaciones, Calendario, Documentos, Reportes, Notificaciones, Estudiantes (con ficha y carga masiva), Apoderados (con ficha), Funcionarios, Cursos, Usuarios (listado y ficha), Roles y permisos, Establecimientos, Auditoría y Configuración. El login y la recuperación de contraseña se integraron en la fase anterior.

Las pantallas globales (denuncias, medidas, seguimientos, tareas, entrevistas, documentos, calendario y los indicadores del panel) se componen consultando los expedientes autorizados más recientes (hasta 300 para el listado y 60 para el contenido) y, de cada uno, su contenido. Cada vista indica cuántos expedientes revisó. Es una composición de endpoints reales y autorizados, no una estimación, pero no es un listado global del servidor.

## Comunidad educativa

El directorio (cursos, estudiantes, apoderados y funcionarios) es la fuente de las personas involucradas en un caso: en la pestaña Involucrados se elige a la persona con un buscador por nombre o RUT (`PersonPicker`) y el servidor reutiliza el involucrado si ya participó en otro expediente. Si la persona no está registrada, se sigue pudiendo escribir una referencia de texto libre. Estudiantes, apoderados y funcionarios exigen permisos de lectura propios; los datos personales no se guardan en el navegador ni viajan en la URL, y el RUT se valida con su dígito verificador (7 u 8 dígitos) antes de enviarse.

La **carga masiva** lee un CSV en el navegador (separador `;` o `,`, columnas RUT, Nombres, Apellidos, Fecha de nacimiento y Curso), revisa cada fila y solo envía el archivo si no tiene errores; el servidor vuelve a validar y es "todo o nada".

## Necesidades de backend

Resueltas con el módulo de comunidad educativa (2026-10-23):

- **Listar etapas**: `GET /establishments/:id/stages` (la ficha del expediente muestra el nombre de la etapa y se puede cambiar).
- **Establecimientos del usuario**: `GET /me/establishments` (un encargado de convivencia ya conoce su establecimiento sin `institutions.read`).
- **Directorio de personas por establecimiento**: `GET /establishments/:id/members` (nombres de responsables, entrevistadores y autores; la asignación ya no pide pegar un UUID).
- **Módulos de comunidad, citaciones y derivaciones**: ver [community-contract.md](../api/community-contract.md).

Siguen pendientes en el backend:

1. **Permisos efectivos en `GET /auth/me`**. Solo entrega roles. El menú y los botones usan la matriz inicial del seed como indicio; si se altera la matriz en la base, la interfaz puede mostrar u ocultar de más (el servidor siempre decide con 403).
2. **Estado de invitación en el usuario**. `isActive: false` no distingue "desactivada" de "invitación pendiente". La ficha ofrece las dos acciones y muestra el 409 del servidor si no corresponde.
3. **Listados de accesos concedidos, borradores de protocolo y protocolos aplicados**. No existen: no se puede ver quién tiene acceso a un expediente, recuperar un borrador de protocolo sin publicar ni listar aplicaciones (se deducen de la línea de tiempo).
4. **Búsqueda por texto en `GET /cases`**. Hoy la búsqueda y los filtros por categoría y responsable se hacen en el navegador sobre hasta 300 expedientes.
5. **Listados globales y estadísticas** (tareas, medidas, seguimientos, denuncias, documentos, indicadores del panel): permitirían reemplazar la composición por expediente y evitar muchas llamadas. Citaciones y derivaciones ya tienen listado global.
6. **Catálogos**: categoría, prioridad, canal, clasificación, modalidad, participación, vínculo familiar y tipo de institución de derivación son texto libre en la API. La interfaz usa una convención (ver abajo); el establecimiento debe definir los catálogos oficiales.
7. **Entrevistas "programadas"**. El modelo solo guarda entrevistas ya realizadas (borrador o finalizada); no hay agenda ni asistentes. La interfaz informa entrevistas en borrador, no programadas.
8. **Documentos por entrevista**. Los documentos pertenecen al expediente; no existe el vínculo documento-entrevista.
9. **Generación de cartas de citación y notificación a apoderados**. La citación se registra y se sigue, pero el servidor no genera el documento ni envía correos.

## Problemas del backend

- **Límite de cuerpo JSON** (resuelto el 2026-10-23): el servidor rechazaba con 413 cualquier cuerpo de más de 100 KB, de modo que solo cabían archivos de ~75 KB aunque el contrato admite 10 MiB. Ahora la carga de documentos (`/api/cases/:caseId/documents`) acepta hasta 15 MB de JSON (un archivo de 10 MiB en base64 pesa ~13,4 MB) y el resto de la API mantiene 100 KB. Verificado contra la API real: 200 KB y 13 MB llegan a la autenticación (401) y 16 MB responde 413.

## Convenciones de la interfaz

- **Códigos de catálogo** (`lib/catalogs.ts`): categorías (`CONVIVENCIA`, `ACOSO`, `CIBERACOSO`, `VIOLENCIA`, `DISCRIMINACION`, `VULNERACION`, `OTRO`), prioridades (`BAJA`, `MEDIA`, `ALTA`, `CRITICA`), canales (`DIRECTO`, `CORREO`, `TELEFONO`, `BUZON`, `OTRO`), clasificaciones (`SIN_CLASIFICAR`, `LEVE`, `GRAVE`, `GRAVISIMA`), modalidades (`PRESENCIAL`, `VIDEOLLAMADA`, `TELEFONICA`) participaciones (`AFECTADO`, `DENUNCIANTE`, `IMPLICADO`, `TESTIGO`, `OTRO`), vínculos familiares (`MADRE`, `PADRE`, `TUTOR_LEGAL`, `ABUELO_A`, `HERMANO_A`, `OTRO`) y tipos de derivación (`SALUD`, `OPD`, `TRIBUNAL_FAMILIA`, `FISCALIA`, `SERVICIO_LOCAL`, `SUPERINTENDENCIA`, `OTRO`). Cualquier otro código recibido se muestra tal cual.
- **Folio**: el backend guarda un entero por establecimiento; se muestra como `EXP-0001`.
- **Contenido de protocolos**: JSON libre; la interfaz guarda `{ "descripcion": "…", "etapas": ["…"] }` y muestra cualquier otra estructura como JSON.
- **Anular o eliminar**: en cada registro del expediente, el ícono de prohibido (gris) anula, cancela o revoca conservando el antecedente con su motivo, y el basurero (rojo) elimina definitivamente un registro aún reversible, previa confirmación que explica la diferencia. Ver [backend-contracts.md](../api/backend-contracts.md).
- **Versiones**: toda edición envía `expectedVersion`. Un 409 muestra el motivo del servidor y "Recargar datos"; nunca se reintenta una escritura automáticamente.
- **Errores**: las reglas de negocio del servidor (texto en español) se muestran tal cual; los errores de validación de DTO se reemplazan por un mensaje genérico. Un 404 no distingue "inexistente" de "sin acceso".
- **Privacidad**: los documentos se descargan por la API y se entregan al navegador con una dirección temporal local (nunca pública); las notas restringidas de entrevistas se ocultan hasta que la persona decide mostrarlas; los identificadores de involucrados son códigos internos; nada sensible se guarda en el navegador.

## Previsualización con API simulada

`pnpm --filter @backoffice/web dev:preview` levanta la interfaz con `src/preview/fakeApi.ts`, un adaptador de Axios en memoria que replica el contrato (CSRF, versiones, 409, 403, 404, máquina de estados, límite de 100 KB, comunidad, citaciones y derivaciones). Sirve para revisar el diseño y probar flujos sin credenciales y sin tocar la base local. Los datos son sintéticos y rotulados, no existen cuentas ni contraseñas (el inicio de sesión real no está disponible; la sesión es sintética) y `window.__fakeApi` permite provocar situaciones como un cambio concurrente. `__UI_PREVIEW__` es el literal `false` en `vite build`: se verificó que `dist/` no contiene el simulador ni sus datos.

Las mismas reglas se prueban automáticamente en `tests/api-flows.spec.ts` contra ese simulador. Esas pruebas validan la lógica del frontend, **no** el comportamiento del backend real.
