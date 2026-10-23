# Backoffice Convivencia Escolar

Sistema interno de un establecimiento educacional chileno para gestionar convivencia escolar. Incluye autenticación, usuarios, roles, invitaciones, establecimientos y membresías; expedientes, denuncias, entrevistas, medidas, tareas, seguimientos, documentos, evidencias audiovisuales por enlace institucional, comunidad educativa, citaciones, derivaciones, calendario y reportes.

La documentación de uso y formalización está en [docs/operacion](docs/operacion/README.md). Los contratos técnicos vigentes están en [docs/api](docs/api/README.md). Los informes de fases anteriores se preservan como antecedentes y no sustituyen los manuales operativos actuales.

## Requisitos

Windows PowerShell, Node.js 22 LTS, pnpm 9 y Docker Desktop iniciado. Copie `.env.example` a `.env` y configure una contraseña local segura para PostgreSQL. `.env` está ignorado por Git.

```powershell
Copy-Item .env.example .env
pnpm install
docker compose up -d --build
docker compose exec -T api pnpm --filter @backoffice/api roles:seed
docker compose ps
```

La API aplica migraciones existentes al arrancar. `roles:seed` es idempotente y no reescribe asignaciones después de la primera ejecución. Para verificar migraciones: `docker compose exec -T api pnpm --filter @backoffice/api exec prisma migrate status`.

URLs: [web](http://localhost:5173), [salud API](http://localhost:3000/api/health), [Swagger](http://localhost:3000/api/docs) y [Mailpit](http://localhost:8025). El SMTP solo es interno, en `mailpit:1025`. Swagger y Mailpit son herramientas de desarrollo local.

## Pruebas aisladas

Las fixtures HTTP se crean únicamente en `convivencia_test`; el harness aborta si el nombre de base no coincide. No usa la cuenta administrativa institucional.

```powershell
docker compose --profile test run --rm api-test pnpm --filter @backoffice/api prisma:migrate
docker compose --profile test run --rm --no-deps api-test pnpm --filter @backoffice/api roles:seed
docker compose --profile test run --rm --no-deps api-test pnpm --filter @backoffice/api exec prisma migrate status
docker compose --profile test run --rm --no-deps api-test pnpm --filter @backoffice/api test
pnpm --filter @backoffice/api build
pnpm --filter @backoffice/api typecheck
pnpm --filter @backoffice/api lint
```

## Operación y diagnóstico

```powershell
docker compose logs --tail=100 api
docker compose exec -T db pg_isready -U convivencia_app -d convivencia
docker compose config --quiet
docker compose stop
docker compose up -d
```

No ejecute `docker compose down -v`: borraría el volumen persistente. Compose monta el código de API y web para recarga, y mantiene `node_modules` Linux en volúmenes separados. La API sincroniza las dependencias del lockfile y regenera Prisma Client al arrancar, evitando enlaces obsoletos de pnpm.

Contratos para Vue: [autenticación](docs/api/auth-contract.md), [usuarios y roles](docs/api/users-roles-contract.md), [recuperación e invitación](docs/api/password-recovery-contract.md), [auditoría](docs/api/audit-contract.md), [expedientes](docs/api/backend-contracts.md) y [comunidad educativa](docs/api/community-contract.md). Decisiones de seguridad en [Fase 1A](docs/security/phase-1a-decisions.md).
