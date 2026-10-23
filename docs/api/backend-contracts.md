# Contratos completos del backend

Base local: `http://localhost:3000/api`. JSON UTF-8, UUID v4 e ISO-8601. Salvo `health` y autenticación pública, cada ruta requiere `bce_session`; toda escritura requiere además `X-CSRF-Token`. Un DTO desconocido devuelve 400. La respuesta de error Nest es `{statusCode,message,error}`.

## Autenticación

| Método | Ruta | Entrada | Éxito | Errores |
|---|---|---|---|---|
| POST | `/auth/login` | `{email,password}` | 201, `{user}` y cookies | 400, 401, 429 |
| GET | `/auth/me` | — | 200 `{user:{id,email,displayName,roles}}` | 401 |
| GET | `/auth/csrf` | — | 200 `{token}` | 401 |
| POST | `/auth/logout` | header CSRF | 201 `{success:true}` | 401,403 |
| POST | `/auth/forgot-password` | `{email}` | 201 genérico | 400,429 |
| POST | `/auth/reset-password` | `{token,password}` | 201 | 400,401,429 |
| POST | `/auth/accept-invitation` | `{token,password}` | 201 | 400,401,429 |

`password` tiene mínimo 12 caracteres; las rutas públicas tienen throttling. Nunca se devuelven tokens, hashes ni contraseñas.

## Administración

| Método/ruta | Permiso | Entrada o query |
|---|---|---|
| GET `/users` | `users.read` | `page=1`, `limit=20` (1–100), `search?`, `role?`, `active=true|false` |
| GET `/users/:id` | `users.read` | UUID |
| POST `/users` | `users.create` e `institutions.manage` | `{email,displayName,roles:string[],establishmentId}`; crea cuenta, membresía activa e invitación en una sola operación |
| PATCH `/users/:id` | `users.update` | `{email?,displayName?}` |
| PATCH `/users/:id/status` | `users.disable` | `{isActive}` |
| PATCH `/users/:id/roles` | `roles.assign` | `{roles:string[]}` |
| POST `/users/:id/revoke-sessions` | `users.update` | — |
| POST `/users/:id/resend-invitation` | `users.update` | — |
| GET `/roles`, `/roles/:id`, `/permissions` | `roles.read` | UUID para detalle |
| GET `/audit` | `audit.read` | `page`, `limit`, `action?`, `targetType?` |

Los listados responden `{items,total,page,limit}`. Administración responde 400 por DTO/UUID, 401 sesión, 403 RBAC/CSRF, 404 recurso, 409 conflicto administrativo y 429 límite.

## Instituciones y expedientes

`GET /establishments` requiere `institutions.read`. Crear/editar establecimiento, membresía y etapas requiere `institutions.manage`. Grants: `POST /cases/:id/access-grants` y `/revoke` requieren `case-grants.manage`; entrada `{userId,accessLevel:"READ"|"WRITE",expiresAt?,reason?}`.

| Ruta | Permiso | Datos |
|---|---|---|
| POST/GET `/cases` | `cases.create`/`cases.read` | creación `{establishmentId,title,initialDescription?,receivedAt,categoryCode,priority,currentStageId?,responsibleUserId?,nextAction?,nextActionDueAt?}`; listado filtra `establishmentId,status,responsibleUserId,priority,stageId,from,to,page,limit` |
| GET/PATCH `/cases/:id` | `cases.read`/`cases.update` | PATCH exige `expectedVersion` y admite campos administrativos |
| POST `/cases/:id/assign` | `cases.assign` | `{responsibleUserId,expectedVersion,reason?}` |
| POST `/cases/:id/transition` | `cases.transition` más `cases.close` o `cases.reopen` | `{toStatus,expectedVersion,stageId?,reason?}` |
| GET `/cases/:id/timeline` | `cases.timeline.read` | `page`, `limit`, `mode` (`relevant` por defecto, o `all` para auditoría completa) |

Todo expediente exige membresía activa y creador, responsable o grant vigente; UUID sin alcance devuelve 404. `SYSTEM_ADMIN` no evita ese control. Versiones obsoletas devuelven 409. Estados: `ABIERTO`, `EN_EVALUACION`, `EN_PROCESO`, `PAUSADO`, `RESUELTO`, `CERRADO`.

## Denuncias, involucrados y entrevistas

| Método/ruta | Permiso | Entrada |
|---|---|---|
| GET/POST `/cases/:caseId/reports` | `reports.read`/`reports.create` | `{receivedAt,channelCode,classificationCode,factualDescription,background?}` |
| PATCH `/cases/:caseId/reports/:id` | `reports.update` | `{expectedVersion,channelCode?,classificationCode?,factualDescription?,background?}` |
| POST `/cases/:caseId/reports/:id/void` | `reports.update` | `{expectedVersion,reason}` |
| POST `/participants` | `participants.manage` | `{establishmentId,kind,referenceLabel}`; `kind`: ESTUDIANTE, APODERADO, FUNCIONARIO, TERCERO |
| GET/POST `/cases/:caseId/participants` | `participants.read`/`participants.manage` | POST `{participantId,participationCode}` |
| PATCH `/cases/:caseId/participants/:linkId` | `participants.manage` | `{expectedVersion,participationCode}` |
| POST `/cases/:caseId/participants/:linkId/unlink` | `participants.manage` | — |
| GET/POST `/cases/:caseId/interviews` | `interviews.read`/`interviews.create` | POST `{occurredAt,modalityCode,summary,restrictedNotes?,agreements?}` |
| PATCH `/cases/:caseId/interviews/:id` | `interviews.update` | anterior más `expectedVersion` |
| POST `.../:id/finalize` / `.../:id/correct` | `interviews.finalize` / `interviews.correct` | `{expectedVersion}` / `{reason}` |
| POST `/cases/:caseId/interviews/:id/void` | `interviews.correct` | `{expectedVersion,reason}` |

Entrevistas finalizadas requieren corrección antes de editar. Todas estas rutas usan autorización contextual y CSRF en mutaciones.

## Operación de expediente

| Método/ruta | Permiso | Entrada |
|---|---|---|
| GET/POST `/cases/:caseId/documents` | `documents.read`/`documents.create` | Documento: `{kind:"DOCUMENTO",originalFilename,contentType,base64Content}`; evidencia audiovisual: `{kind:"EVIDENCIA",originalFilename,externalUrl}` de OneDrive/SharePoint |
| GET `/cases/:caseId/documents/:id/download` | `documents.read` | binario autorizado |
| POST `/cases/:caseId/documents/:id/void` | `documents.create` | `{expectedVersion,reason}` |
| GET `/protocols/:establishmentId`, POST `/protocols` | `protocols.read`/`protocols.manage` | POST `{establishmentId,code,name,title,content}` donde `content` es JSON serializado |
| POST `/protocols/versions/:id/publish` | `protocols.manage` | `{establishmentId}` |
| POST `/cases/:caseId/protocols/:versionId` | `protocols.read` y escritura contextual | — |
| GET `/cases/:caseId/protocol-applications` | `protocols.read` | Aplicaciones vigentes y revocadas del expediente |
| POST `/cases/:caseId/protocol-applications/:id/revoke` | `protocols.read` y escritura contextual | `{expectedVersion,reason}`; conserva el registro en el historial |
| GET/POST `/cases/:caseId/measures` | `measures.read`/`measures.manage` | POST `{title,description?,dueAt?,responsibleUserIds}` |
| POST `/cases/:caseId/measures/:id/update` | `measures.manage` | `{expectedVersion,title?,description?,status?,dueAt?,responsibleUserIds?}` |
| GET/POST `/cases/:caseId/follow-ups` | `follow-ups.read`/`follow-ups.create` | `{occurredAt,note,nextAction?,nextActionDueAt?}` |
| POST `/cases/:caseId/follow-ups/:id/void` | `follow-ups.create` | `{expectedVersion,reason}` |
| GET/POST `/cases/:caseId/tasks` | `tasks.read`/`tasks.manage` | `{title,dueAt?,assignedToUserId?}` |
| POST `/cases/:caseId/tasks/:id/update` | `tasks.manage` | `{expectedVersion,title?,dueAt?,assignedToUserId?,status?:"CANCELADA"}` |
| POST `/cases/:caseId/tasks/:id/complete` | `tasks.manage` | — |
| GET `/notifications`; POST `/notifications/:id/read` | `notifications.read` | — |

### Anular, cancelar, revocar y eliminar registros del expediente

Hay dos acciones distintas y la interfaz las separa con íconos diferentes:

- **Anular, cancelar o revocar** (`POST …/void`, `…/update` con `status:"CANCELADA"`, `…/revoke`): el registro deja de mostrarse en la operación pero se conserva con su motivo (mínimo 5 caracteres) en la línea de tiempo completa y en la auditoría.
- **Eliminar definitivamente** (`DELETE`, con cuerpo `{expectedVersion}`): solo para registros aún reversibles. El registro sale del expediente y de su línea de tiempo y solo queda la auditoría de seguridad (acción `*_DELETED`, con el identificador y el expediente, sin contenido). Los archivos de documentos también se borran del almacenamiento privado.

| Ruta | Permiso | Se puede eliminar si… |
|---|---|---|
| DELETE `/cases/:caseId/reports/:id` | `reports.update` | no está anulada |
| DELETE `/cases/:caseId/interviews/:id` | `interviews.update` | sigue en borrador |
| DELETE `/cases/:caseId/documents/:id` | `documents.create` | no está anulado |
| DELETE `/cases/:caseId/follow-ups/:id` | `follow-ups.create` | no está anulado |
| DELETE `/cases/:caseId/tasks/:id` | `tasks.manage` | sigue pendiente |
| DELETE `/cases/:caseId/protocol-applications/:id` | `protocols.read` | no está revocada |

Todas exigen un expediente abierto y la versión vigente (409 si cambió o si ya no corresponde eliminar). Las medidas, citaciones y derivaciones no se eliminan: se cancelan o se cierran con su estado.

Los documentos aceptan sólo PDF, JPEG y PNG, máximo 10 MiB, con firma binaria y SHA-256. La evidencia audiovisual guarda un enlace HTTPS de OneDrive o SharePoint, no el video: el enlace se entrega sólo a quien tiene acceso contextual al expediente, no se incluye en auditoría y se abre desde la interfaz. Las anulaciones son lógicas: requieren versión y motivo, dejan de mostrarse y conservan su evento y auditoría. Descarga, listados y operaciones dependen del alcance contextual. Las mutaciones devuelven 201 salvo PATCH (200); 400 validación, 401, 403, 404 sin alcance, 409 concurrencia/estado y 500 sólo ante falla interna de almacenamiento.
