# Despliegue de staging: Vercel y Render

Esta guía prepara un entorno de pruebas con datos ficticios. No autoriza cargar datos de estudiantes ni credenciales reales.

## Arquitectura requerida

Use la interfaz Vercel como origen público y reenvíe su ruta `/api` al Web Service de Render:

| Componente | Ejemplo                               | Plataforma |
| ---------- | ------------------------------------- | ---------- |
| Interfaz y API pública | `https://<proyecto>.vercel.app` | Vercel |
| API interna de origen  | `https://<servicio>.onrender.com` | Render |

El navegador siempre consume `/api` desde Vercel. La regla de reescritura de Vercel la envía a Render, por lo que las cookies `SameSite=Strict` permanecen del mismo origen público.

## 1. Base de datos y archivos

1. Use Neon como PostgreSQL de staging.
2. Configure la URL pooled de Neon como `DATABASE_URL` para el tráfico de la aplicación.
3. Configure la URL directa como `DATABASE_URL_UNPOOLED` para las migraciones y una URL de la rama sombra como `SHADOW_DATABASE_URL`.
4. El Web Service Free de Render no tiene disco persistente: no habilite carga de documentos reales; cualquier archivo local se pierde al reiniciar o redesplegar.

## 2. Servicio API en Render

1. Cree el Blueprint desde este repositorio y seleccione la rama de staging.
2. Seleccione el plan `free` y configure el comando pre-deploy declarado en el Blueprint.
3. Complete las variables marcadas como secretas en el panel de Render:

   | Variable              | Valor de staging                                      |
   | --------------------- | ----------------------------------------------------- |
   | `WEB_ORIGIN`          | URL exacta de Vercel, sin barra final.                |
   | `DATABASE_URL`        | URL pooled de Neon.                                  |
   | `DATABASE_URL_UNPOOLED` | URL directa de Neon para migraciones.              |
   | `SHADOW_DATABASE_URL` | URL de base sombra aislada de staging.                |
   | `MAIL_*`              | SMTP sandbox o institucional autorizado para pruebas. |

   `PORT` lo proporciona Render; no lo declare. `NODE_ENV=production` y `TRUST_PROXY_HOPS=1` vienen declarados por el Blueprint.

4. El pre-deploy ejecuta solamente `prisma migrate deploy`. El Blueprint inicializa los roles una sola vez tras el primer despliegue; no mezcla datos ni creación de administrador con el arranque de cada despliegue.
5. Tras el primer despliegue y solo contra la base de staging, cree el administrador inicial con `pnpm --filter @backoffice/api admin:create` en una terminal interactiva. Nunca pegue la contraseña en logs ni variables.

## 3. Interfaz en Vercel

1. Importe el mismo repositorio como un proyecto Vercel usando la raíz del repositorio. `vercel.json` instala el workspace, construye `@backoffice/web` y publica `apps/web/dist`.
2. Agregue la reescritura `/api/(.*)` al URL del servicio Render antes de la regla SPA. El cliente usa `/api` automáticamente en producción.
3. No defina secretos de API, SMTP ni base de datos en Vercel. `VITE_*` es visible desde el navegador.

Las URLs preview de Vercel no son un sustituto del dominio de staging autenticado. Se pueden usar para comprobaciones visuales aisladas, no para ingreso o escrituras.

## 4. Verificación de salida

Ejecute y registre con cuentas y datos ficticios:

1. `GET https://<servicio>.onrender.com/api/health` responde 200 y `database: connected`.
2. `GET https://<proyecto>.vercel.app/api/health` responde el mismo resultado mediante la reescritura.
3. Ingreso, recarga de la página y cierre de sesión; la cookie debe ser `Secure`, `HttpOnly` y `SameSite=Strict`.
4. Invitación, reenvío y recuperación de contraseña llegan al buzón de prueba.
5. En el plan Free, compruebe que la interfaz no se use para adjuntos persistentes; éstos requieren almacenamiento de objetos antes de habilitarlos.
6. UAT completa con la matriz vigente, sin datos personales reales.

## Límites del entorno de prueba

Antes de datos reales siguen siendo obligatorios: SMTP institucional con SPF/DKIM/DMARC, respaldo cifrado de PostgreSQL y del disco, restauración ensayada, aprobación institucional de retención y UAT firmada.
