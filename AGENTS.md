# Guía para agentes de código

Backoffice interno para un establecimiento educacional chileno. La Fase 0 está terminada y el backend de Fase 1A implementa autenticación, usuarios, roles, permisos, auditoría, invitaciones y recuperación. Las interfaces Vue de estas funciones aún no están hechas. Toda interfaz y documentación debe escribirse en español de Chile.

## Estructura y contratos

- `apps/web`: Vue 3, Vite, TypeScript, PrimeVue 4, Tailwind 4, Router, Pinia, Vue Query y Axios.
- `apps/api`: NestJS 11, Prisma 6 y PostgreSQL 17. Prefijo `/api`, Swagger local en `/api/docs`.
- `packages/shared`: tipos públicos entre web y API, sin secretos.
- `docs/api`: contratos exactos para consumir el backend. Lea [autenticación](docs/api/auth-contract.md), [usuarios y roles](docs/api/users-roles-contract.md), [recuperación](docs/api/password-recovery-contract.md) y [auditoría](docs/api/audit-contract.md) antes de crear vistas.

## Comandos PowerShell

```powershell
pnpm install
pnpm --filter @backoffice/api build
pnpm --filter @backoffice/api typecheck
pnpm --filter @backoffice/api lint
docker compose up -d --build
docker compose exec -T api pnpm --filter @backoffice/api roles:seed
docker compose --profile test run --rm --no-deps api-test pnpm --filter @backoffice/api test
```

Para la primera ejecución de tests, aplique las migraciones y el seed en `convivencia_test` como indica el README. Nunca ejecute fixtures en `convivencia` ni en `convivencia_shadow`. Antes de cerrar cambios, ejecute build, typecheck, lint y pruebas pertinentes; registre PASS/FAIL/NOT RUN según resultados reales.

## Reglas obligatorias

- Nunca ejecute `docker compose down -v`, borre el volumen `postgres_data` ni reinicialice la base principal. No afecte contenedores de otros proyectos.
- No lea, imprima ni versione `.env`. Documente variables en `.env.example` con valores ficticios. No registre contraseñas, hashes, cookies, códigos, `DATABASE_URL` ni datos personales de estudiantes.
- Cree migraciones Prisma nuevas; no edite las ya aplicadas. Mantenga versiones exactas en `package.json`.
- No use servicios cloud como dependencia local. No haga push sin instrucción.
- Mantenga un módulo NestJS por dominio, DTO validados, Swagger y pruebas Jest. Los permisos efectivos se comprueban en el servidor; toda escritura administrativa exige CSRF.
- Si edita `apps/web`, use la skill `convivencia-vue-ui` en `.agents/skills/convivencia-vue-ui/SKILL.md`; mantenga idéntica su copia en `.claude/skills`.
