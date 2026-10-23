# Contrato propuesto de Casos

Estado: diseño Fase 2A. Ninguna ruta de este documento existe todavía.

Todas las rutas requieren cookie de sesión, `X-CSRF-Token` en escrituras, permiso RBAC y alcance por establecimiento/expediente. Los UUID sin alcance responden `404`.

| Método | Ruta | Permiso | Contrato propuesto |
| --- | --- | --- | --- |
| POST | `/api/cases` | `cases.create` | `{establishmentId,title,initialDescription?,receivedAt,categoryCode,priority,currentStageId?,responsibleUserId?,nextAction?,nextActionDueAt?}`; devuelve 201 con caso, folio y versión 1. |
| GET | `/api/cases` | `cases.read` | Filtros `establishmentId`, `status`, `responsibleUserId`, `priority`, `stageId`, `from`, `to`, `page`, `limit`; devuelve `{items,total,page,limit}`. |
| GET | `/api/cases/:id` | `cases.read` | Devuelve expediente mínimo, sin expandir datos personales futuros. |
| PATCH | `/api/cases/:id` | `cases.update` | Campos administrativos permitidos y `expectedVersion`; devuelve 200 con nueva versión. |
| POST | `/api/cases/:id/assign` | `cases.assign` | `{responsibleUserId,expectedVersion,reason?}`; responsable debe tener membresía activa. |
| POST | `/api/cases/:id/transition` | `cases.transition` o permiso específico | `{toStatus,stageId?,reason?,expectedVersion}`; valida máquina de estados. |
| GET | `/api/cases/:id/timeline` | `cases.timeline.read` | Paginado, orden cronológico estable, sin metadata sensible. |

Errores: `400` DTO o transición inválida; `401` sesión; `403` permiso/CSRF; `404` inexistente o sin alcance; `409` versión obsoleta, folio o regla concurrente; `429` límite; `422` regla de negocio que requiera datos obligatorios. El uso de `422` requiere acordarse con los contratos existentes antes de implementarlo.

`expectedVersion` es obligatorio en PATCH, asignación y transición. Los DTO deben limitar longitudes, normalizar códigos de catálogo y rechazar propiedades adicionales mediante el `ValidationPipe` existente.

## Timeline propuesto

`CaseEvent` contiene `caseId`, `eventType`, `actorUserId`, `occurredAt`, `previousStatus`, `newStatus`, `previousStageId`, `newStageId`, `metadata` mínima, `relatedEntityType`, `relatedEntityId` y `correlationId`. No expone contenido de expedientes en metadata.

Los servicios de negocio no tendrán update/delete de eventos. Caso y evento se escriben en la misma transacción. Esta inmutabilidad es de aplicación: no sustituye permisos directos de base de datos, WORM, firma criptográfica ni controles operacionales que podrían requerirse posteriormente.
