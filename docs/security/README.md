# Seguridad inicial

- Las credenciales viven en `.env`, que está excluido de Git; `.env.example` solo contiene valores de ejemplo.
- PostgreSQL no publica el puerto 5432 al host. Solo la API puede acceder por la red interna de Compose.
- CORS permite exclusivamente el origen local configurado en `WEB_ORIGIN`.
- La validación global elimina campos no permitidos y rechaza campos inesperados.
- Los logs no registran `DATABASE_URL`, contraseñas ni cuerpos con datos personales.

Pendiente para Fase 1: autenticación, autorización por roles, auditoría, política de contraseñas, gestión de sesiones, protección CSRF según el mecanismo de sesión, retención de datos y revisión de encabezados HTTP para producción.
