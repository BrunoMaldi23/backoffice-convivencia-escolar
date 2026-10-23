# Decisiones de seguridad de Fase 1A

- No hay documento maestro de roles adicional en el repositorio. Se fijó una matriz administrativa mínima y versionada en `src/cli/seed-roles.ts`. El seed corre una sola vez mediante marcador técnico para preservar ajustes institucionales posteriores. `SYSTEM_ADMIN` administra configuración; no hereda acceso a expedientes futuros.
- Sesiones: 32 bytes aleatorios en cookie `bce_session` HttpOnly, SameSite=Strict, Secure en producción; PostgreSQL guarda solo SHA-256. Vigencia 12 horas. Revocación en logout, desactivación, cambio de roles o contraseña.
- CSRF: código independiente por sesión; PostgreSQL guarda su hash. El cliente lee `GET /api/auth/csrf` y envía `X-CSRF-Token` en escrituras autenticadas. Guard aplicado a todos los controladores administrativos.
- Contraseñas: Argon2id, memoria 19 MiB, dos iteraciones, paralelismo uno. Las cuentas invitadas reciben inicialmente un hash aleatorio inutilizable. El administrador nunca establece la contraseña de terceros.
- Recuperación e invitación: token separado por `purpose`, 32 bytes, hash persistido, uso único, 30 minutos. El código se envía por SMTP en el cuerpo del correo, sin incluirlo en la URL. Un cambio de contraseña revoca sesiones. La solicitud de recuperación ofrece respuesta genérica para evitar enumeración.
- Último administrador: las modificaciones de estado y rol comparten una transacción con `pg_advisory_xact_lock(17834,1)`; tras adquirir el bloqueo se cuenta otro `SYSTEM_ADMIN` activo. La base de pruebas ejercita solicitudes concurrentes.
- Autorización: `SessionGuard`, `CsrfGuard`, `PermissionsGuard` y `RequirePermissions`; permisos efectivos se leen desde PostgreSQL en cada llamada. No hay permisos comodín. 401 indica sesión inválida; 403 indica permiso o CSRF insuficiente.
- Auditoría: eventos técnicos de autenticación y administración con actor, acción, recurso, resultado y metadatos mínimos. No contiene credenciales, cookies ni información de estudiantes. Consulta solo con `audit.read`.
- Correo: Mailpit es exclusivo del entorno local. Antes de producción se debe configurar SMTP institucional con TLS y política de retención. La interfaz Mailpit no debe exponerse públicamente.
- CORS acepta solo `WEB_ORIGIN` y credenciales. Helmet añade cabeceras de seguridad; Swagger se usa en desarrollo. Las rutas públicas sensibles tienen límites de frecuencia.
