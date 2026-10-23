# Rutas del frontend

Todas las vistas se cargan de forma diferida. "Pública" significa que no exige sesión. "Permiso" indica el permiso que la sesión debe declarar.

## Públicas (AuthLayout)

| Ruta | Nombre | Vista | Endpoint previsto |
| --- | --- | --- | --- |
| `/login` | `login` | Iniciar sesión | `POST /api/auth/login` |
| `/recuperar-contrasena` | `forgot-password` | Recuperar contraseña | `POST /api/auth/forgot-password` |
| `/restablecer-contrasena` | `reset-password` | Restablecer contraseña (código pegado) | `POST /api/auth/reset-password` |
| `/establecer-contrasena` | `accept-invitation` | Activar cuenta por invitación | `POST /api/auth/accept-invitation` |
| `/sesion-expirada` | `session-expired` | Sesión expirada | — |
| `/acceso-denegado` | `forbidden` | Acceso denegado (403) | — |
| cualquier otra | `not-found` | Página no encontrada (404) | — |

## Privadas (AppLayout)

| Ruta | Nombre | Vista | Permiso |
| --- | --- | --- | --- |
| `/` | `dashboard` | Panel de inicio | — |
| `/casos` | `cases` | Casos en curso | — |
| `/casos/cerrados` | `cases-closed` | Casos cerrados | — |
| `/casos/nuevo` | `cases-new` | Nuevo caso | — |
| `/casos/:id` | `cases-detail` | Expediente (`?tab=` resumen, involucrados, antecedentes, entrevistas, medidas, protocolos, evidencias, documentos, derivaciones, seguimientos, bitacora) | — |
| `/casos/:id/editar` | `cases-edit` | Editar caso | — |
| `/denuncias`, `/denuncias/nueva`, `/denuncias/:id` | `complaints*` | Listado, registro interno, detalle con clasificación | — |
| `/medidas`, `/medidas/nueva`, `/medidas/:id` | `measures*` | Medidas de resguardo | — |
| `/protocolos`, `/protocolos/:id` | `protocols*` | Biblioteca y detalle con etapas | — |
| `/seguimientos`, `/seguimientos/:id` | `followups*` | Listado, cronología, próximos y registro | — |
| `/estudiantes`, `/estudiantes/nuevo`, `/estudiantes/:id` | `students*` | Comunidad: estudiantes | — |
| `/apoderados`, `/apoderados/nuevo`, `/apoderados/:id` | `guardians*` | Comunidad: apoderados | — |
| `/funcionarios`, `/funcionarios/nuevo`, `/funcionarios/:id` | `staff*` | Comunidad: funcionarios | — |
| `/cursos`, `/cursos/nuevo`, `/cursos/:id` | `courses*` | Comunidad: cursos | — |
| `/tareas`, `/tareas/nueva`, `/tareas/:id` | `tasks*` | Lista y tablero, formulario, detalle | — |
| `/entrevistas`, `/entrevistas/nueva`, `/entrevistas/:id` | `interviews*` | Entrevistas, acuerdos y vista previa del acta | — |
| `/citaciones`, `/citaciones/nueva`, `/citaciones/:id` | `citations*` | Citaciones y vista previa del aviso | — |
| `/calendario` | `calendar` | Mes y semana, detalle de evento | — |
| `/derivaciones`, `/derivaciones/nueva`, `/derivaciones/:id` | `referrals*` | Derivaciones | — |
| `/documentos`, `/documentos/:id` | `documents*` | Biblioteca, plantillas y vista previa | — |
| `/reportes` | `reports` | Reportes | — |
| `/administracion/usuarios` | `users` | Usuarios | `users.read` |
| `/administracion/usuarios/nuevo` | `users-new` | Crear usuario e invitar | `users.create` |
| `/administracion/usuarios/:id` | `users-detail` | Detalle, roles y seguridad | `users.read` |
| `/administracion/usuarios/:id/editar` | `users-edit` | Editar nombre y correo | `users.update` |
| `/administracion/roles` | `roles` | Roles y matriz de permisos | `roles.read` |
| `/administracion/roles/:id` | `roles-detail` | Detalle de rol | `roles.read` |
| `/administracion/auditoria` | `audit` | Auditoría (solo lectura) | `audit.read` |
| `/configuracion` | `settings` | Configuración (`?seccion=`) | — |
| `/configuracion/estado-servicio` | `system-status` | Estado de API y PostgreSQL (vista de Fase 0) | — |

Los identificadores de ruta son opacos (`:id`); no se ponen nombres, RUT ni datos personales en la URL.
