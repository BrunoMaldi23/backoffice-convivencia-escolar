# Máquina de estados y etapas de casos

Estado y etapa son conceptos distintos. El estado gobierna la disponibilidad administrativa; la etapa describe el punto del procedimiento institucional y proviene de `CaseStage`.

## Estados y transiciones

| Desde | Hacia permitidos | Requisito mínimo |
| --- | --- | --- |
| `ABIERTO` | `EN_EVALUACION`, `PAUSADO` | `cases.transition`; motivo al pausar. |
| `EN_EVALUACION` | `EN_PROCESO`, `PAUSADO`, `RESUELTO` | `cases.transition`; motivo para pausar o resolver. |
| `EN_PROCESO` | `PAUSADO`, `RESUELTO` | `cases.transition`; motivo para pausar o resolver. |
| `PAUSADO` | `EN_EVALUACION`, `EN_PROCESO` | `cases.transition`; motivo de reanudación obligatorio. |
| `RESUELTO` | `CERRADO`, `EN_PROCESO` | `cases.close` para cierre; motivo de retorno obligatorio. |
| `CERRADO` | `EN_EVALUACION` | `cases.reopen`; motivo de reapertura obligatorio. |

Se prohíben saltos a `CERRADO` desde estados distintos de `RESUELTO`, pausar un caso cerrado y reabrir a un estado distinto de `EN_EVALUACION`. La reapertura es una transición, no un séptimo estado persistente.

## Responsabilidad y permisos

El responsable actual o un usuario con grant de escritura puede ejecutar transiciones ordinarias si posee el permiso global. Cierre y reapertura requieren además el permiso específico; no deben depender solo de que el usuario sea responsable. La política institucional de quién puede cerrar se define en la matriz de autorización.

Toda transición exige `expectedVersion`, se ejecuta en una transacción y crea un `CaseEvent` con estado y etapa anterior/nueva. La modificación que no supere el control de versión responde `409` y no deja eventos huérfanos.

## Eventos mínimos

`CASE_CREATED`, `CASE_UPDATED`, `CASE_ASSIGNED`, `CASE_STAGE_CHANGED`, `CASE_TRANSITIONED`, `CASE_PAUSED`, `CASE_RESOLVED`, `CASE_CLOSED` y `CASE_REOPENED`. El tipo específico complementa al estado, no lo reemplaza.
