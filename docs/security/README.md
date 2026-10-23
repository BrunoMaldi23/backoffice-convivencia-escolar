# Seguridad y operación

- Las credenciales viven en `.env`, que está excluido de Git; `.env.example` solo contiene valores de ejemplo.
- PostgreSQL no publica el puerto 5432 al host. Solo la API puede acceder por la red interna de Compose.
- CORS permite exclusivamente el origen local configurado en `WEB_ORIGIN`.
- La validación global elimina campos no permitidos y rechaza campos inesperados.
- Los logs no registran `DATABASE_URL`, contraseñas ni cuerpos con datos personales.
- Las sesiones son `HttpOnly` y las escrituras autenticadas exigen CSRF. El servidor aplica RBAC y acceso contextual al expediente; no se concede acceso global solo por tener un rol.

Autenticación, roles, auditoría, sesiones, CSRF y recuperación de contraseña están implementados. Antes de operar con datos reales siguen pendientes la definición institucional de retención y eliminación, respaldo/restauración verificada, revisión de encabezados y correo SMTP de producción. Vea [preparación operativa](../operacion/preparacion-operativa.md).
