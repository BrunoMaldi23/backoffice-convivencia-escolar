CREATE TYPE "DocumentStorageProvider" AS ENUM ('LOCAL', 'SUPABASE');

ALTER TABLE "case_documents"
  ADD COLUMN "storage_provider" "DocumentStorageProvider" NOT NULL DEFAULT 'LOCAL';

CREATE TABLE "document_upload_intents" (
  "id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "created_by_user_id" TEXT NOT NULL,
  "original_filename" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "declared_size_bytes" INTEGER NOT NULL,
  "storage_key" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_upload_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_upload_intents_storage_key_key" ON "document_upload_intents"("storage_key");
CREATE INDEX "document_upload_intents_expires_at_idx" ON "document_upload_intents"("expires_at");
CREATE INDEX "document_upload_intents_case_id_created_by_user_id_idx" ON "document_upload_intents"("case_id", "created_by_user_id");

ALTER TABLE "document_upload_intents"
  ADD CONSTRAINT "document_upload_intents_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_upload_intents"
  ADD CONSTRAINT "document_upload_intents_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
