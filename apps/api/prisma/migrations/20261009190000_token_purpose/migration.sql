ALTER TABLE "password_reset_tokens" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'RESET';
CREATE INDEX "password_reset_tokens_user_id_purpose_used_at_idx" ON "password_reset_tokens" ("user_id", "purpose", "used_at");
