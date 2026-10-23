# Informe técnico: cierre de Fase 1A

**Estado: FASE 1A COMPLETADA para desarrollo local.** El backend quedó disponible para que Claude Code implemente las interfaces Vue según los contratos de `docs/api`. No se modificó el frontend ni la cuenta administrativa institucional.

## Arquitectura y archivos principales

- `apps/api/src/modules/auth`: login, logout, sesión, CSRF, recuperación y aceptación de invitación.
- `apps/api/src/modules/users`: administración, invitación, estados, roles y revocación.
- `apps/api/src/modules/roles`: consulta de roles y permisos.
- `apps/api/src/modules/audit`: consulta paginada de auditoría.
- `apps/api/src/modules/mail`: transporte SMTP desacoplado hacia Mailpit local.
- `apps/api/src/common/security`: guards de sesión, CSRF, permisos y decorador.
- `apps/api/src/cli/seed-roles.ts`: inicialización idempotente de 10 roles y 8 permisos.
- `apps/api/prisma/migrations/20261009190000_token_purpose`: migración aditiva de `purpose` e índice en tokens; migraciones previas intactas.
- `compose.yaml`: servicio `api-test` aislado, Mailpit y sincronización de dependencias/Prisma Client al iniciar API. PostgreSQL 17.6 y su volumen se conservaron.
- `packages/shared/src/index.ts`: tipos públicos sin campos secretos.
- `AGENTS.md` y `README.md`: estado vigente, comandos y barrera de pruebas actualizados.

## Errores corregidos durante el cierre

El servicio anterior permitía establecer contraseñas de terceros y contenía una revocación de sesiones inoperante. Se sustituyó por invitación con código de un uso y revocación transaccional. El guard de permisos inicialmente no resolvía `AuthService` en el módulo de roles; se exportó correctamente el módulo de autenticación. Se corrigió el remitente SMTP ficticio para superar la validación Joi y la lectura de saltos de línea de Mailpit en la suite. Los volúmenes pnpm conservaban un Prisma Client antiguo: el inicio de API ahora sincroniza el lockfile y regenera el cliente antes de migrar/compilar. El harness evita cerrar una conexión sin inicializar si la barrera de `convivencia_test` aborta.

## Endpoints

`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/auth/csrf`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `POST /api/auth/accept-invitation`; `GET/POST /api/users`, `GET/PATCH /api/users/:id`, `PATCH /api/users/:id/status`, `PATCH /api/users/:id/roles`, `POST /api/users/:id/revoke-sessions`, `POST /api/users/:id/resend-invitation`; `GET /api/roles`, `GET /api/roles/:id`, `GET /api/permissions`, `GET /api/audit`, `GET /api/health`. Swagger describe 18 rutas en `/api/docs-json`.

## Roles, seguridad y datos

Roles: SYSTEM_ADMIN, DIRECTOR, CONVIVENCIA, PSICOLOGO, TRABAJADOR_SOCIAL, INSPECTOR_GENERAL, INSPECTOR, DOCENTE, ORIENTADOR, AUDITOR. Permisos: `dashboard.read`, `users.read`, `users.create`, `users.update`, `users.disable`, `roles.read`, `roles.assign`, `audit.read`. La matriz exacta está en `docs/api/users-roles-contract.md`. El seed deja intactas asignaciones posteriores tras su primera ejecución.

Sesión opaca y CSRF ligados a hashes en PostgreSQL, cookie HttpOnly/SameSite=Strict, Argon2id, roles efectivos consultados por guard, validación global de DTO, CORS de origen explícito, Helmet y rate limiting. Tokens de invitación/recuperación son aleatorios, separados por propósito, temporales y de un uso; la contraseña se establece por el funcionario. La auditoría excluye secretos. Transacción y bloqueo asesor de PostgreSQL protegen al último administrador ante cambios concurrentes. No hay permisos de expedientes confidenciales.

## Evidencia ejecutada

| Verificación | Resultado | Evidencia |
| --- | --- | --- |
| Prisma generate | PASS | Client 6.19.0 generado |
| Migración aditiva | PASS | Aplicada en `convivencia` y `convivencia_test` |
| Prisma migrate status | PASS | Cuatro migraciones; ambas bases al día |
| Build, typecheck y lint API | PASS | `pnpm --filter @backoffice/api` sin errores |
| Typecheck shared | PASS | `pnpm --filter @backoffice/shared typecheck` |
| Jest unitario e integración | PASS | 4 suites, 16 pruebas; 2 suites HTTP con PostgreSQL real y 2 suites unitarias con mocks |
| Auth, sesiones y CSRF | PASS | Supertest y PostgreSQL `convivencia_test`: login, fallos, cookie, expiración, CSRF y logout |
| Usuarios, RBAC y auditoría | PASS | HTTP contra `convivencia_test`: 401/403, creación, duplicado, filtros, edición, estado, roles, revocación y consulta de auditoría |
| Último administrador | PASS | Rechazo de desactivación/retiro y carrera entre dos cambios en `convivencia_test` |
| Invitación y recuperación | PASS | SMTP Mailpit, códigos consumidos/vencidos, activación, revocación y respuesta genérica |
| Rate limiting | PASS | Intentos repetidos de login reciben 429 en integración |
| Docker Compose config/build/up/ps | PASS | API, PostgreSQL, web y Mailpit en ejecución; PostgreSQL y Mailpit saludables |
| Salud, Swagger, frontend servido | PASS | HTTP 200, Swagger 18 rutas, web HTTP 200 |
| CORS | PASS | Preflight local permite PATCH con credenciales; origen ajeno carece de `Access-Control-Allow-Origin` |
| Git y secretos | PASS con alcance | `.env` ignorado; `git diff --check` sin errores. Gran parte del árbol sigue sin seguimiento en Git; revisar antes de crear un commit. |

Las pruebas nunca usaron la contraseña ni alteraron la cuenta institucional. En la base principal se verificó un `SYSTEM_ADMIN` activo, 10 roles y 8 permisos sin consultar credenciales. Las fixtures aleatorias se crean y limpian solo en `convivencia_test`. Mailpit recibió mensajes de pruebas locales; no se enviaron correos reales.

## Comandos PowerShell para reproducir

```powershell
docker compose config --quiet
docker compose up -d --build api db mailpit
docker compose exec -T api pnpm --filter @backoffice/api prisma:generate
docker compose exec -T api pnpm --filter @backoffice/api exec prisma migrate status
docker compose exec -T api pnpm --filter @backoffice/api roles:seed
docker compose --profile test run --rm api-test pnpm --filter @backoffice/api prisma:migrate
docker compose --profile test run --rm --no-deps api-test pnpm --filter @backoffice/api roles:seed
docker compose --profile test run --rm --no-deps api-test pnpm --filter @backoffice/api test
pnpm --filter @backoffice/api build
pnpm --filter @backoffice/api typecheck
pnpm --filter @backoffice/api lint
docker compose ps
git diff --check
```

## Pendientes y riesgos

- Las pantallas Vue de ingreso, usuarios, roles, auditoría e invitación corresponden a Claude Code; no se tocaron en esta fase.
- Antes de producción: configurar SMTP institucional con TLS, proteger acceso a Swagger/Mailpit, TLS HTTPS, gestión y rotación de secretos, respaldo y retención de auditoría. Mailpit es solo desarrollo.
- La respuesta de solicitud de recuperación es uniforme en código y cuerpo; el tiempo de envío SMTP puede variar para cuentas existentes. Para un despliegue externo, usar una cola asíncrona y revisar la política de rate limiting por IP detrás de un proxy.
- La mayor parte del proyecto está sin seguimiento en Git; antes de un commit, revisar archivo por archivo e incluir solo código/documentación apropiados. No hubo push.

Claude Code debe consumir los contratos de `docs/api/auth-contract.md`, `docs/api/users-roles-contract.md`, `docs/api/password-recovery-contract.md` y `docs/api/audit-contract.md`. Usar Axios `withCredentials: true`; obtener `GET /api/auth/csrf` antes de escrituras; enviar `X-CSRF-Token`; redirigir a ingreso ante 401 y mostrar autorización insuficiente ante 403. No almacenar la cookie de sesión ni códigos en `localStorage`.
