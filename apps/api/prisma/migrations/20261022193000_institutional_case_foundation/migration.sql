CREATE TYPE "CaseStatus" AS ENUM ('ABIERTO', 'EN_EVALUACION', 'EN_PROCESO', 'PAUSADO', 'RESUELTO', 'CERRADO');
CREATE TYPE "CaseAccessLevel" AS ENUM ('READ', 'WRITE');
CREATE TYPE "CaseEventType" AS ENUM ('CASE_CREATED', 'CASE_UPDATED', 'CASE_ASSIGNED', 'CASE_STAGE_CHANGED', 'CASE_TRANSITIONED', 'CASE_PAUSED', 'CASE_RESUMED', 'CASE_RESOLVED', 'CASE_CLOSED', 'CASE_REOPENED');

CREATE TABLE "establishments" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "institutional_identifier" TEXT, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "next_case_sequence" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "establishments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "establishments_code_key" ON "establishments"("code");
CREATE UNIQUE INDEX "establishments_institutional_identifier_key" ON "establishments"("institutional_identifier");

CREATE TABLE "establishment_memberships" (
  "establishment_id" TEXT NOT NULL, "user_id" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "establishment_memberships_pkey" PRIMARY KEY ("establishment_id", "user_id")
);
CREATE INDEX "establishment_memberships_user_id_is_active_idx" ON "establishment_memberships"("user_id", "is_active");
ALTER TABLE "establishment_memberships" ADD CONSTRAINT "establishment_memberships_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "establishment_memberships" ADD CONSTRAINT "establishment_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "case_stages" (
  "id" TEXT NOT NULL, "establishment_id" TEXT NOT NULL, "code" TEXT NOT NULL,
  "name" TEXT NOT NULL, "display_order" INTEGER NOT NULL, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "case_stages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "case_stages_establishment_id_code_key" ON "case_stages"("establishment_id", "code");
CREATE UNIQUE INDEX "case_stages_establishment_id_display_order_key" ON "case_stages"("establishment_id", "display_order");
ALTER TABLE "case_stages" ADD CONSTRAINT "case_stages_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "cases" (
  "id" TEXT NOT NULL, "establishment_id" TEXT NOT NULL, "folio" INTEGER NOT NULL,
  "title" TEXT NOT NULL, "initial_description" TEXT NOT NULL, "received_at" TIMESTAMP(3) NOT NULL,
  "category_code" TEXT NOT NULL, "priority" TEXT NOT NULL, "status" "CaseStatus" NOT NULL DEFAULT 'ABIERTO',
  "current_stage_id" TEXT, "responsible_user_id" TEXT, "created_by_user_id" TEXT NOT NULL,
  "closed_at" TIMESTAMP(3), "closure_reason" TEXT, "next_action" TEXT, "next_action_due_at" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cases_establishment_id_folio_key" ON "cases"("establishment_id", "folio");
CREATE INDEX "cases_establishment_id_status_updated_at_idx" ON "cases"("establishment_id", "status", "updated_at");
CREATE INDEX "cases_establishment_id_responsible_user_id_idx" ON "cases"("establishment_id", "responsible_user_id");
ALTER TABLE "cases" ADD CONSTRAINT "cases_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "case_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "case_assignments" (
  "id" TEXT NOT NULL, "case_id" TEXT NOT NULL, "user_id" TEXT NOT NULL,
  "assigned_by_user_id" TEXT NOT NULL, "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unassigned_at" TIMESTAMP(3), "reason" TEXT,
  CONSTRAINT "case_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "case_assignments_case_id_unassigned_at_idx" ON "case_assignments"("case_id", "unassigned_at");
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "case_events" (
  "id" TEXT NOT NULL, "case_id" TEXT NOT NULL, "actor_user_id" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "event_type" "CaseEventType" NOT NULL,
  "previous_status" "CaseStatus", "new_status" "CaseStatus", "previous_stage_id" TEXT, "new_stage_id" TEXT,
  "correlation_id" TEXT NOT NULL, "related_entity_type" TEXT, "related_entity_id" TEXT, "metadata" JSONB,
  CONSTRAINT "case_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "case_events_case_id_occurred_at_id_idx" ON "case_events"("case_id", "occurred_at", "id");
CREATE INDEX "case_events_correlation_id_idx" ON "case_events"("correlation_id");
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "case_access_grants" (
  "id" TEXT NOT NULL, "case_id" TEXT NOT NULL, "user_id" TEXT NOT NULL,
  "access_level" "CaseAccessLevel" NOT NULL, "granted_by_user_id" TEXT NOT NULL,
  "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expires_at" TIMESTAMP(3), "revoked_at" TIMESTAMP(3), "reason" TEXT,
  CONSTRAINT "case_access_grants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "case_access_grants_case_id_user_id_key" ON "case_access_grants"("case_id", "user_id");
CREATE INDEX "case_access_grants_user_id_revoked_at_expires_at_idx" ON "case_access_grants"("user_id", "revoked_at", "expires_at");
ALTER TABLE "case_access_grants" ADD CONSTRAINT "case_access_grants_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_access_grants" ADD CONSTRAINT "case_access_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_access_grants" ADD CONSTRAINT "case_access_grants_granted_by_user_id_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
