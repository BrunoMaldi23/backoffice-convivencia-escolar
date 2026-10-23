# Preparación operativa antes de datos reales

La plataforma está validada mediante build, lint y pruebas automatizadas. Esta lista define lo que falta para una operación institucional formal; no debe resolverse con supuestos técnicos.

## Decisiones obligatorias

| Tema | Decisión requerida | Responsable sugerido |
| --- | --- | --- |
| Correo institucional | Proveedor SMTP (Google Workspace o Microsoft 365), remitente, dominio y responsables de reenvío. | TI / Dirección |
| Evidencia audiovisual | Biblioteca OneDrive/SharePoint, grupos autorizados, dueño del enlace y proceso de revocación. | TI / Convivencia |
| Retención documental | Plazos, eliminación autorizada, custodia y base legal. | Dirección / sostenedor / asesoría jurídica |
| Respaldo y restauración | Frecuencia, ubicación cifrada, responsable y prueba de recuperación. | TI |
| Roles y catálogos | Matriz final de permisos, etapas, protocolos, categorías y códigos institucionales. | Dirección / Convivencia |
| Incidentes | Canal de reporte, responsable, tiempo de respuesta y comunicación. | TI / Dirección |

## Correo de invitaciones y recuperación

En desarrollo, los correos se reciben en Mailpit y no llegan a Gmail ni Outlook reales. Antes de habilitar personas reales se debe configurar el SMTP institucional, probar invitación, reenvío, recuperación de contraseña y rebote, y verificar el dominio remitente con el equipo de TI. No registre contraseñas ni tokens en actas de prueba.

## Respaldo y recuperación

Defina un respaldo cifrado de base de datos y de archivos privados. Una copia no es suficiente: realice y documente una restauración en un entorno aislado, verificando que el acceso contextual continúe funcionando. No elimine volúmenes para simular una restauración.

## Revisión previa a la salida

1. Ejecutar y firmar la [matriz UAT](matriz-uat.md).
2. Capacitar por rol usando los manuales de esta carpeta.
3. Confirmar políticas de retención y evidencia externa.
4. Configurar y probar correo institucional.
5. Aprobar responsables de soporte, respaldo y revisión de accesos.
6. Registrar versión liberada, fecha, responsables y plan de reversión.
