# Comunidad educativa, citaciones y derivaciones

Complementa [backend-contracts.md](backend-contracts.md). Todo requiere sesión; toda escritura exige `X-CSRF-Token`. Los listados paginados responden `{items,total,page,limit}` (`page` desde 1, `limit` 1–100, 25 por omisión). Las ediciones envían `expectedVersion`; una versión obsoleta devuelve 409. Los identificadores son UUID v4.

Los datos de personas (RUT, nombres, contacto) solo se devuelven con el permiso de lectura correspondiente y nunca se escriben en la auditoría.

## Alcance

Cursos, estudiantes, apoderados y funcionarios pertenecen a un establecimiento. Se accede únicamente con **membresía activa** en él; sin membresía la API responde 404 (no distingue inexistente de sin acceso). `SYSTEM_ADMIN` tampoco evita este control.

Las citaciones y derivaciones pertenecen a un expediente y siguen su alcance (creador, responsable o acceso concedido). Un expediente `CERRADO` no admite nuevas citaciones ni derivaciones (409).

## Establecimientos del usuario

| Método/ruta | Permiso | Respuesta |
|---|---|---|
| GET `/me/establishments` | sesión | Establecimientos activos de los que la persona es miembro |
| GET `/establishments/:id/stages` | membresía o `institutions.read` | Etapas ordenadas por `displayOrder` |
| GET `/establishments/:id/members` | membresía o `institutions.read` | `[{id,displayName,roles[]}]` de las cuentas activas |

## Cursos

| Método/ruta | Permiso | Entrada |
|---|---|---|
| GET `/courses` | `courses.read` | `establishmentId`, `academicYear?`, `active?=true\|false`. Cada curso incluye `_count.students` (activos) |
| POST `/courses` | `courses.manage` | `{establishmentId,name,level?,academicYear}`; único por establecimiento, año y nombre (409) |
| PATCH `/courses/:id` | `courses.manage` | `{expectedVersion,name?,level?,isActive?}` |

## Estudiantes

| Método/ruta | Permiso | Entrada |
|---|---|---|
| GET `/students` | `students.read` | `establishmentId`, `search?` (nombre, apellido o RUT), `courseId?`, `active?`, `page`, `limit` |
| POST `/students` | `students.manage` | `{establishmentId,rut,firstNames,lastNames,birthDate?,courseId?}` |
| GET `/students/:id` | `students.read` | Ficha con `course` y `guardianLinks[{relationship,isPrimary,guardian}]` |
| PATCH `/students/:id` | `students.manage` | `{expectedVersion,rut?,firstNames?,lastNames?,birthDate?\|null,courseId?\|null,isActive?}` |
| GET `/students/:id/cases` | `students.read` y `cases.read` | Expedientes visibles donde figura como involucrado: `[{id,folio,title,status,priority,receivedAt,participationCode}]` |
| POST `/students/:id/guardians` | `students.manage` y `guardians.manage` | `{guardianId,relationship,isPrimary}`; si `isPrimary`, los demás dejan de serlo |
| POST `/students/:id/guardians/:guardianId/unlink` | `students.manage` y `guardians.manage` | — |
| POST `/students/import` | `students.manage` | `{establishmentId,academicYear,rows:[{rut,firstNames,lastNames,birthDate?,courseName?}]}` (1–500 filas) |

El RUT se valida con su dígito verificador y se guarda normalizado (`12345678-5`); un RUT inválido responde 400 y uno repetido en el establecimiento, 409.

**Carga masiva**: todo o nada. Si alguna fila es inválida (RUT, nombres vacíos, fecha, RUT repetido en el archivo) responde 400 con `errors:[{row,message}]` (máximo 50) y no escribe nada. Si todo es válido crea los estudiantes nuevos, actualiza nombres y curso de los existentes (por RUT, reactivándolos) y crea los cursos que falten para `academicYear`. Responde `{created,updated,createdCourses}`.

## Apoderados y funcionarios

| Método/ruta | Permiso | Entrada |
|---|---|---|
| GET `/guardians` | `guardians.read` | `establishmentId`, `search?`, `studentId?`, `active?`, paginación |
| POST `/guardians` | `guardians.manage` | `{establishmentId,rut?,firstNames,lastNames,email?,phone?}` |
| GET `/guardians/:id` | `guardians.read` | Ficha con `studentLinks[{relationship,isPrimary,student}]` |
| PATCH `/guardians/:id` | `guardians.manage` | `{expectedVersion,rut?,firstNames?,lastNames?,email?,phone?,isActive?}` |
| GET `/staff` | `staff.read` | `establishmentId`, `search?`, `active?`, paginación |
| POST `/staff` | `staff.manage` | `{establishmentId,rut?,firstNames,lastNames,position,email?,phone?,userId?}`; `userId` debe ser miembro y no estar usado por otro funcionario |
| PATCH `/staff/:id` | `staff.manage` | `{expectedVersion,…,position?,userId?\|null,isActive?}` |

## Involucrados desde el directorio

`POST /participants` (`participants.manage`) acepta ahora `studentId`, `guardianId` o `staffMemberId` (solo uno). El tipo debe corresponder (`ESTUDIANTE`, `APODERADO`, `FUNCIONARIO`) y la persona debe estar activa en el establecimiento. Si no se envía `referenceLabel`, se usa el nombre de la persona. Si ya existe un involucrado activo para esa persona se devuelve el mismo. Sin persona del directorio sigue exigiéndose `referenceLabel`.

## Citaciones

| Método/ruta | Permiso | Entrada |
|---|---|---|
| GET `/cases/:caseId/summons` | `summons.read` | — |
| POST `/cases/:caseId/summons` | `summons.manage` | `{participantId?,recipientLabel?,scheduledAt,location,reason}`; se exige uno de los dos destinatarios |
| POST `/cases/:caseId/summons/:id/update` | `summons.manage` | `{expectedVersion,status?,scheduledAt?,location?,reason?,outcomeNote?}` |
| GET `/summons` | `summons.read` | `establishmentId?`, `status?`, `from?`, `to?` (sobre `scheduledAt`), paginación; cada ítem incluye `case:{id,folio,title,status,establishmentId}` |

Estados: `PROGRAMADA` → `REALIZADA` \| `NO_ASISTIO` \| `CANCELADA`. Solo una citación `PROGRAMADA` admite cambios (reprogramar, cambiar lugar o motivo, cerrar); las demás responden 409. Cancelar exige `outcomeNote` (400).

## Derivaciones

| Método/ruta | Permiso | Entrada |
|---|---|---|
| GET `/cases/:caseId/referrals` | `referrals.read` | — |
| POST `/cases/:caseId/referrals` | `referrals.manage` | `{typeCode,institutionName,reason,contactName?}` |
| POST `/cases/:caseId/referrals/:id/update` | `referrals.manage` | `{expectedVersion,status?,contactName?,responseNote?}` |
| GET `/referrals` | `referrals.read` | `establishmentId?`, `status?`, paginación; cada ítem incluye `case` |

Estados: `PENDIENTE` → `ENVIADA` \| `CERRADA`; `ENVIADA` → `CON_RESPUESTA` \| `CERRADA`; `CON_RESPUESTA` → `CERRADA`. El servidor registra `sentAt`, `responseAt` y `closedAt` al cambiar de estado. Una derivación `CERRADA` no admite cambios (409). `typeCode` es texto libre en mayúsculas; la interfaz propone `SALUD`, `OPD`, `TRIBUNAL_FAMILIA`, `FISCALIA`, `SERVICIO_LOCAL`, `SUPERINTENDENCIA`, `OTRO`.

## Línea de tiempo

Nuevos eventos: `SUMMONS_CREATED`, `SUMMONS_UPDATED`, `REFERRAL_CREATED`, `REFERRAL_UPDATED`.

## Permisos nuevos (seed `rbac_seed_v4`)

`courses.read|manage`, `students.read|manage`, `guardians.read|manage`, `staff.read|manage`, `summons.read|manage`, `referrals.read|manage`. Se aplican con `roles:seed` (idempotente; no quita permisos existentes). Matriz inicial: `SYSTEM_ADMIN` y `CONVIVENCIA` todos; `DIRECTOR` lectura de cursos, estudiantes, apoderados y funcionarios; `PSICOLOGO` y `TRABAJADOR_SOCIAL` lectura del directorio, citaciones y derivaciones y gestión de derivaciones; `INSPECTOR_GENERAL` lectura del directorio y gestión de citaciones; `INSPECTOR` y `ORIENTADOR` cursos y estudiantes (lectura); `DOCENTE` cursos (lectura).
