# Usuarios, roles y permisos

Todas las rutas requieren `bce_session`; las escrituras también `X-CSRF-Token`. IDs son UUID. Respuesta de usuario: `{id,email,displayName,isActive,createdAt,updatedAt,roles:string[]}`. Nunca contiene `passwordHash`, cookies ni tokens. Fechas JSON ISO 8601.

| Método y ruta | Permiso | Entrada / respuesta |
| --- | --- | --- |
| GET `/api/users` | `users.read` | Query `page` (desde 1), `limit` (1–100, por defecto 20), `search`, `role`, `active=true|false`; `{items,total,page,limit}` |
| GET `/api/users/:id` | `users.read` | Usuario o 404 |
| POST `/api/users` | `users.create` | `{email,displayName,roles:string[]}`; 201 usuario inactivo e invitación SMTP |
| PATCH `/api/users/:id` | `users.update` | Solo `email` y/o `displayName`; 200 usuario |
| PATCH `/api/users/:id/status` | `users.disable` | `{isActive:boolean}`; 200 usuario |
| PATCH `/api/users/:id/roles` | `roles.assign` | `{roles:string[]}`; 200 usuario, revoca sesiones |
| POST `/api/users/:id/revoke-sessions` | `users.update` | 201 `{success:true}` |
| POST `/api/users/:id/resend-invitation` | `users.update` | 201 `{success:true}` para cuenta pendiente |
| GET `/api/roles` | `roles.read` | Lista `{id,name,description,permissions:string[]}` |
| GET `/api/roles/:id` | `roles.read` | Rol o 404 |
| GET `/api/permissions` | `roles.read` | Lista `{id,code,description}` |

La creación no recibe contraseña; el funcionario la establece con un código recibido por correo. El administrador no ve ese código. Una cuenta con invitación pendiente no puede activarse por el endpoint de estado. `SYSTEM_ADMIN` no puede autoasignarse y solo un administrador activo puede concederlo a otra cuenta. Los cambios de rol revocan sesiones. El último administrador activo no puede desactivarse ni perder ese rol; la operación responde 409. No existe DELETE.

Matriz inicial: `SYSTEM_ADMIN` tiene los ocho permisos administrativos listados abajo; `DIRECTOR` tiene `dashboard.read`, `users.read`, `roles.read`, `audit.read`; `AUDITOR` tiene `dashboard.read` y `audit.read`; los demás roles tienen solo `dashboard.read`. El seed no reasigna permisos después de su primera ejecución. Ningún rol obtiene acceso automático a expedientes futuros.

Permisos: `dashboard.read`, `users.read`, `users.create`, `users.update`, `users.disable`, `roles.read`, `roles.assign`, `audit.read`. El servidor consulta las relaciones `user_roles` → `role_permissions` → `permissions` en PostgreSQL, sin confiar en valores enviados por Vue.

Errores: 400 DTO/UUID, 401 sin sesión, 403 permiso/CSRF, 404 recurso, 409 correo duplicado o protección administrativa, 429 rate limit, 503 fallo SMTP al invitar. Si el correo falla después de crear una cuenta, use `resend-invitation` cuando Mailpit vuelva a estar disponible.

Inicialización idempotente: `docker compose exec -T api pnpm --filter @backoffice/api roles:seed`. Usa marcador `system_control.rbac_seed_v1`; ejecuciones posteriores no alteran asignaciones institucionales.
