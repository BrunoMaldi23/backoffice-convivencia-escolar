ALTER TABLE "cases"
  ADD COLUMN "archived_at" TIMESTAMP(3),
  ADD COLUMN "archived_by_user_id" TEXT,
  ADD COLUMN "archive_reason" TEXT;

CREATE INDEX "cases_establishment_id_archived_at_status_updated_at_idx"
  ON "cases"("establishment_id", "archived_at", "status", "updated_at");
