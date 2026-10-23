ALTER TABLE "security_audits"
  ADD COLUMN "changes" JSONB,
  ADD COLUMN "ip_address" TEXT,
  ADD COLUMN "user_agent" TEXT;

CREATE INDEX "security_audits_target_type_target_id_created_at_idx"
  ON "security_audits" ("target_type", "target_id", "created_at");
