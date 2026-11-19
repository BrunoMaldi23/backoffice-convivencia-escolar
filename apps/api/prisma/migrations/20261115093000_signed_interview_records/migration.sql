ALTER TABLE "interviews"
  ADD COLUMN "student_name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "guardian_name" TEXT,
  ADD COLUMN "course_name" TEXT,
  ADD COLUMN "requested_by" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "reason_categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "interview_reason" TEXT,
  ADD COLUMN "final_document_id" TEXT;

CREATE UNIQUE INDEX "interviews_final_document_id_key" ON "interviews"("final_document_id");
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_final_document_id_fkey"
  FOREIGN KEY ("final_document_id") REFERENCES "case_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
