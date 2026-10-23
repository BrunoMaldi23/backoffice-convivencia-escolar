# API

Contratos para Vue: [autenticación](auth-contract.md), [usuarios y roles](users-roles-contract.md), [recuperación e invitaciones](password-recovery-contract.md) y [auditoría](audit-contract.md). El prefijo es `/api`; las escrituras autenticadas requieren cookie y encabezado CSRF.

La API REST usa el prefijo global `/api`, JSON y nombres de recursos en minúsculas. Swagger se publica en `/api/docs` solo para desarrollo local.

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET | `/api/health` | Estado de API y conexión real a PostgreSQL |

La respuesta de salud no expone configuración, usuarios ni secretos. Los errores de validación usan el `ValidationPipe` global de NestJS.

El [contrato propuesto de Casos](cases-proposed-contract.md) es documental para Fase 2A; sus rutas todavía no están implementadas.
