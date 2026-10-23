# Plan de implementación y pruebas de casos

## Orden de migraciones futuro

1. `Establishment`, membresías y catálogo de etapas, con bootstrap explícito y aislado.
2. `Case`, secuencia de folio, responsable actual y control de versión.
3. `CaseEvent`, asignaciones y grants de acceso.
4. Permisos RBAC aprobados y seed versionado de manera aditiva.

Cada paso debe tener migración Prisma nueva, `prisma validate`, despliegue solo a `convivencia_test`, verificación de `migrate status` y pruebas de rollback lógico. No se usará `migrate reset` ni se modificarán migraciones de Fase 1.

## Plan de pruebas

- Folios concurrentes: dos creaciones para un establecimiento producen folios únicos consecutivos.
- Aislamiento: una membresía de establecimiento A no lee ni muta un UUID de B.
- IDOR: UUID válido sin alcance responde como inexistente.
- Optimistic locking: dos mutaciones con la misma versión dejan solo una aplicada y un único evento.
- Timeline: creación, asignación y transición generan eventos en la misma transacción; no existen eventos sin caso.
- Autorización: permisos globales sin membresía o grant no conceden acceso.
- Cierre/reapertura: motivos, transiciones prohibidas y permisos específicos.
- Sanitización: metadata no guarda contraseñas, tokens, cookies, hashes, CSRF ni contenido sensible no permitido.

## Decisiones institucionales pendientes

Debe confirmar el establecimiento: categorías, prioridades y SLA; etapas y protocolos; campos mínimos de recepción; facultades de cierre/reapertura; visibilidad de dirección; reglas de derivación; retención; exportación; y qué rol puede otorgar grants extraordinarios. Son decisiones de negocio, no valores a inferir por el backend.
