-- Preserva antecedentes de convivencia: las anulaciones son lógicas y auditables.
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'REPORT_VOIDED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'INTERVIEW_VOIDED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'DOCUMENT_VOIDED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_VOIDED';

ALTER TABLE "case_reports"
  ADD COLUMN "voided_at" TIMESTAMP(3),
  ADD COLUMN "void_reason" TEXT;

ALTER TABLE "interviews"
  ADD COLUMN "voided_at" TIMESTAMP(3),
  ADD COLUMN "void_reason" TEXT;

ALTER TABLE "case_documents"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "voided_at" TIMESTAMP(3),
  ADD COLUMN "void_reason" TEXT;

ALTER TABLE "case_follow_ups"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "voided_at" TIMESTAMP(3),
  ADD COLUMN "void_reason" TEXT;
