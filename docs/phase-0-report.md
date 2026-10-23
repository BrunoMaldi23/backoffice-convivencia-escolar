# Informe técnico: Fase 0

Fecha de verificación: 2026-10-09 (America/Santiago).

## Inventario creado

- Raíz: `package.json`, `pnpm-workspace.yaml`, `compose.yaml`, `.env.example`, `.gitignore` y `.dockerignore`.
- `apps/web`: Vue 3, Vite, TypeScript, Router, TanStack Vue Query, Axios, PrimeVue 4, Tailwind 4, layout administrativo, bienvenida, estado de salud, 404 y prueba Vitest.
- `apps/api`: NestJS, validación global, CORS, Swagger, salud, Prisma, migración inicial y prueba Jest.
- `packages/shared`, `infra/docker/Dockerfile` y documentación de arquitectura, API, base de datos y seguridad.

## Versiones verificadas

| Componente | Versión |
| --- | --- |
| Node.js | 22.20.0 |
| pnpm | 9.14.0 |
| Git | 2.51.0.windows.2 |
| Docker CLI | 29.7.2 |
| Docker Compose | 5.4.0 |
| Vue | 3.5.43 |
| PrimeVue | 4.5.5 |
| NestJS | 11.1.11 |
| Prisma | 6.19.0 |
| PostgreSQL de Compose | 17.6 |

## Resultado de validaciones

| Validación | Resultado | Evidencia |
| --- | --- | --- |
| Instalación pnpm | PASS | `pnpm install` terminó con código 0. |
| Generación Prisma | PASS | Prisma Client 6.19.0 generado. |
| Compilación frontend | PASS | Vite construyó 238 módulos. |
| Compilación backend | PASS | `nest build` terminó con código 0. |
| Typecheck | PASS | Shared, web y API terminaron con código 0. |
| Lint | PASS | Código 0; ESLint Vue informa 33 advertencias de formato sin errores. |
| Prueba frontend | PASS | Vitest: 1 archivo, 1 prueba aprobada. |
| Prueba backend | PASS | Jest: 1 suite, 1 prueba aprobada. |
| Compose config | PASS | `docker compose config` resolvió la configuración. |
| Docker build/up | PASS | Se reconstruyeron y recrearon solo `api` y `web`; ambos siguen activos. |
| PostgreSQL healthcheck | PASS | `db` permanece `healthy` con PostgreSQL 17.6. |
| Migración Prisma | PASS | `20261009120000_initial` aplicada; `migrate status` indica esquema actualizado. |
| Health API | PASS | `GET /api/health` respondió 200 con `database: connected`. |
| Swagger | PASS | `GET /api/docs` respondió HTTP 200. |
| Frontend y conexión API | PASS | Vite respondió 200, entregó `VITE_API_BASE_URL=http://localhost:3000/api`; CORS permitió el origen y una petición desde el contenedor web respondió 200. |
| Persistencia PostgreSQL | PASS | Se recrearon solo API y web; el volumen `postgres_data` no se detuvo ni eliminó. |
| `git diff --check` | PASS | Terminó sin salida ni errores. |

## Correcciones aplicadas

- Se corrigió la sintaxis del esquema Prisma antes de generar el cliente.
- Se añadieron tipos Vite y un `computed` para el estado de salud de Vue.
- Se cambió NestJS 12 por NestJS 11.1.11, compatible con Jest CommonJS.
- Se corrigió el patrón de lint de backend que incluía una carpeta vacía.
- Se ajustó PrimeVue de 5 a 4.5.5, conforme al stack solicitado.
- Se añadió `@tailwindcss/vite`; el build dejó de emitir advertencias de directivas Tailwind.
- Se corrigieron los contenedores de desarrollo: los bind mounts ocultaban los enlaces pnpm dentro de cada aplicación. Los volúmenes `api_node_modules` y `web_node_modules` ahora aíslan esos directorios del host y los binarios se resuelven desde el workspace instalado en la imagen.
- La imagen instala `openssl`, `libssl3` y certificados CA; Prisma generó el cliente y aplicó la migración sin advertencias de compatibilidad OpenSSL.

## Operación local comprobada

Para iniciar los servicios desde PowerShell:

```powershell
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 api
Invoke-RestMethod http://localhost:3000/api/health
Invoke-WebRequest http://localhost:3000/api/docs -UseBasicParsing
Invoke-WebRequest http://localhost:5173 -UseBasicParsing
docker compose exec db pg_isready -U convivencia_app -d convivencia
```

No ejecute `docker compose down -v`: ese comando borraría el volumen de PostgreSQL. La inspección visual automatizada del navegador no se realizó porque este equipo no expone un navegador y la instalación local de Chrome fue rechazada por permisos; la integración se verificó mediante el módulo Vite servido, CORS y una solicitud real desde el contenedor web.
