# Rutas del frontend

Todas las vistas se cargan de forma diferida. "Pública" significa que no exige sesión. La columna "Permiso" es el indicio que usa el menú según la matriz inicial de roles; el servidor siempre decide (403).

## Públicas (AuthLayout)

| Ruta | Nombre | Vista | Endpoint |
| --- | --- | --- | --- |
| `/login` | `login` | Iniciar sesión (redirige al panel si ya hay sesión) | `POST /auth/login`, `GET /auth/me` |
| `/recuperar-contrasena` | `forgot-password` | Recuperar contraseña | `POST /auth/forgot-password` |
| `/restablecer-contrasena` | `reset-password` | Restablecer contraseña (código pegado) | `POST /auth/reset-password` |
| `/establecer-contrasena` | `accept-invitation` | Activar cuenta por invitación | `POST /auth/accept-invitation` |
| `/sesion-expirada` | `session-expired` | Sesión expirada | — |
| `/acceso-denegado` | `forbidden` | Acceso denegado (403) | — |
| cualquier otra | `not-found` | Página no encontrada (404) | — |

## Privadas (AppLayout, exigen sesión)

| Ruta | Vista | Permiso (indicio) |
| --- | --- | --- |
| `/` | Panel de inicio | — |
| `/casos` | Listado de casos (`?estado=`, `?prioridad=`) | `cases.read` |
| `/casos/nuevo` | Nuevo caso (con denuncia opcional) | `cases.create` |
| `/casos/:id` | Expediente. `?tab=`: `resumen`, `linea`, `denuncias`, `involucrados`, `entrevistas`, `documentos`, `protocolos`, `medidas`, `seguimientos`, `tareas`, `citaciones`, `derivaciones`, `acceso` | `cases.read` |
| `/denuncias`, `/denuncias/nueva` | Denuncias recibidas y registro de una denuncia (crea el expediente) | `reports.read`, `reports.create` |
| `/medidas` | Medidas de resguardo | `measures.read` |
| `/protocolos` | Catálogo de protocolos | `protocols.read` |
| `/seguimientos` | Seguimientos | `follow-ups.read` |
| `/tareas` | Tareas | `tasks.read` |
| `/entrevistas` | Entrevistas | `interviews.read` |
| `/calendario` | Calendario de plazos | `cases.read` |
| `/documentos` | Documentos y evidencias | `documents.read` |
| `/reportes` | Reportes | `cases.read` |
| `/notificaciones` | Notificaciones | `notifications.read` |
| `/estudiantes`, `/estudiantes/:id` | Estudiantes (búsqueda, carga masiva CSV) y ficha con apoderados y expedientes | `students.read` |
| `/apoderados`, `/apoderados/:id` | Apoderados y ficha con sus estudiantes | `guardians.read` |
| `/funcionarios` | Funcionarios del establecimiento | `staff.read` |
| `/cursos` | Cursos por año académico | `courses.read` |
| `/citaciones` | Citaciones de los expedientes visibles | `summons.read` |
| `/derivaciones` | Derivaciones de los expedientes visibles | `referrals.read` |
| `/administracion/usuarios`, `/administracion/usuarios/:id` | Usuarios y ficha | `users.read` |
| `/administracion/roles` (`?rol=`) | Roles y permisos | `roles.read` |
| `/administracion/establecimientos` | Establecimientos, membresías y etapas | `institutions.read` |
| `/administracion/auditoria` | Auditoría | `audit.read` |
| `/configuracion`, `/configuracion/estado-servicio` | Configuración y estado del servicio | — |

Los identificadores de ruta son UUID opacos; no se ponen nombres ni datos personales en la URL.
