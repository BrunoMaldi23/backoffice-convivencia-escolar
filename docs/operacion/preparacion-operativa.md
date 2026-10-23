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

Variables (en `.env`, nunca en el repositorio; los valores de ejemplo están en `.env.example`):

| Variable | Uso |
| --- | --- |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE` | Servidor SMTP. Puerto 587 con `MAIL_SECURE=false` (STARTTLS) o 465 con `MAIL_SECURE=true`. En producción se exige TLS. |
| `MAIL_USER`, `MAIL_PASSWORD` | Cuenta de envío. Si se indica el usuario, la contraseña es obligatoria; ambas vacías envían sin autenticación (solo Mailpit o un relé autorizado). Google Workspace requiere una contraseña de aplicación; Microsoft 365 puede exigir SMTP autenticado habilitado para la cuenta. |
| `MAIL_FROM` | Remitente autorizado para esa cuenta. |
| `WEB_ORIGIN` | Dirección pública del sistema: es la que aparece en el enlace del correo. |

Después de cambiar el `.env`, recree el contenedor (`docker compose up -d api`; un simple reinicio no relee las variables) y pruebe una invitación con una cuenta de prueba. Pida a TI que configure SPF, DKIM y DMARC del dominio remitente para que los correos no lleguen a spam.

## Respaldo y recuperación

Defina un respaldo cifrado de base de datos y de archivos privados. Una copia no es suficiente: realice y documente una restauración en un entorno aislado, verificando que el acceso contextual continúe funcionando. No elimine volúmenes para simular una restauración.

## Revisión previa a la salida

1. Ejecutar y firmar la [matriz UAT](matriz-uat.md).
2. Capacitar por rol usando los manuales de esta carpeta.
3. Confirmar políticas de retención y evidencia externa.
4. Configurar y probar correo institucional.
5. Aprobar responsables de soporte, respaldo y revisión de accesos.
6. Registrar versión liberada, fecha, responsables y plan de reversión.
