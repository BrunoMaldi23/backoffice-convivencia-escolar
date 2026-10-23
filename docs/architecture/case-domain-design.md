# Diseño del dominio de casos de convivencia escolar

Estado: propuesta de Fase 2A. Este documento no crea tablas, rutas ni permisos efectivos.

## Límites y aislamiento institucional

`Establishment` representa al establecimiento educacional. `EstablishmentMembership` vincula un `User` existente con un establecimiento, estado activo y ámbito institucional. Todas las entidades de expediente deben llevar `establishmentId` obligatorio; toda consulta debe filtrarlo antes de evaluar el identificador solicitado. Esto impide IDOR y mezcla accidental de datos entre establecimientos sin convertir esta fase en un SaaS complejo.

El sistema parte con un establecimiento bootstrap, pero no debe usar una constante global ni asumirlo en los servicios. El usuario sin membresía activa no puede entrar a expedientes aunque tenga un permiso RBAC global.

## Agregados propuestos

| Modelo | Responsabilidad | Relaciones e integridad propuesta |
| --- | --- | --- |
| `Establishment` | Identidad institucional y secuencia de folios. | `id UUID`; `code` único; `nextCaseSequence`; activo. |
| `EstablishmentMembership` | Acceso institucional del usuario. | Único `(establishmentId,userId)`; baja lógica por `isActive`. |
| `Case` | Expediente mínimo, sin datos personales extensos. | UUID interno; único `(establishmentId,folio)`; creador, responsable y etapa actual. |
| `CaseAssignment` | Historial de responsabilidades. | Un responsable actual en `Case`; historial con `assignedAt/unassignedAt`. |
| `CaseStage` | Catálogo institucional de etapas. | Único `(establishmentId,code)`; orden y activo. |
| `CaseEvent` | Línea de tiempo append-only. | FK a caso y actor; orden cronológico y `correlationId`. |
| `CaseAccessGrant` | Excepción explícita de acceso al expediente. | Único `(caseId,userId)`; alcance de lectura/escritura y vencimiento opcional. |

No se proponen aún tablas de denuncia, estudiante, apoderado, entrevista, documento, evidencia, protocolo o medida. El caso solo mantiene antecedentes iniciales minimizados.

## Expediente propuesto

`Case` debe incluir: `id`, `establishmentId`, `folio`, `title`, `initialDescription`, `receivedAt`, `categoryCode`, `priority`, `status`, `currentStageId`, `responsibleUserId`, `createdByUserId`, `createdAt`, `updatedAt`, `closedAt`, `closureReason`, `nextAction`, `nextActionDueAt` y `version` entero.

`title`, `initialDescription`, `nextAction` y `closureReason` no deben contener identificadores de menores ni antecedentes sensibles innecesarios. Los datos personales y documentos se modelarán separadamente en fases posteriores, con permisos más restrictivos.

## Folio y concurrencia

El folio visible es secuencial por establecimiento, no global ni reutilizable. La creación debe correr en una transacción PostgreSQL: bloquear la fila de `Establishment`, leer e incrementar `nextCaseSequence`, crear el caso y su primer evento. El índice único `(establishmentId,folio)` es la última barrera ante colisiones.

`version` permite concurrencia optimista: cada mutación exige el valor observado; el `UPDATE` usa `WHERE id = :id AND version = :expectedVersion` e incrementa el valor. Si afecta cero filas, responder `409 Conflict` sin insertar evento.

## Prisma propuesto, no ejecutado

```prisma
model Case {
  id String @id @default(uuid())
  establishmentId String @map("establishment_id")
  folio Int
  status CaseStatus
  version Int @default(1)
  establishment Establishment @relation(fields: [establishmentId], references: [id])
  events CaseEvent[]
  @@unique([establishmentId, folio])
  @@index([establishmentId, status, updatedAt])
}
```

La migración futura debe ser aditiva: catálogos y membresías primero; después casos y eventos. No editará migraciones existentes ni deducirá establecimiento desde el rol.
