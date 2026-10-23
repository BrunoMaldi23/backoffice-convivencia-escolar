ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'REPORT_CREATED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'REPORT_UPDATED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'PARTICIPANT_LINKED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'PARTICIPANT_UNLINKED';

CREATE TYPE "ParticipantKind" AS ENUM ('ESTUDIANTE', 'APODERADO', 'FUNCIONARIO', 'TERCERO');

CREATE TABLE "case_reports" (
  "id" TEXT NOT NULL, "case_id" TEXT NOT NULL, "establishment_id" TEXT NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL, "channel_code" TEXT NOT NULL,
  "classification_code" TEXT NOT NULL, "factual_description" TEXT NOT NULL,
  "background" TEXT, "created_by_user_id" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "case_reports_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "participants" (
  "id" TEXT NOT NULL, "establishment_id" TEXT NOT NULL, "kind" "ParticipantKind" NOT NULL,
  "reference_label" TEXT NOT NULL, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "case_participants" (
  "id" TEXT NOT NULL, "case_id" TEXT NOT NULL, "participant_id" TEXT NOT NULL,
  "participation_code" TEXT NOT NULL, "linked_by_user_id" TEXT NOT NULL,
  "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "unlinked_at" TIMESTAMP(3),
  CONSTRAINT "case_participants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "case_reports_case_id_received_at_idx" ON "case_reports"("case_id", "received_at");
CREATE INDEX "participants_establishment_id_kind_is_active_idx" ON "participants"("establishment_id", "kind", "is_active");
CREATE INDEX "case_participants_case_id_unlinked_at_idx" ON "case_participants"("case_id", "unlinked_at");
CREATE INDEX "case_participants_participant_id_unlinked_at_idx" ON "case_participants"("participant_id", "unlinked_at");
ALTER TABLE "case_reports" ADD CONSTRAINT "case_reports_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_reports" ADD CONSTRAINT "case_reports_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_reports" ADD CONSTRAINT "case_reports_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "participants" ADD CONSTRAINT "participants_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_participants" ADD CONSTRAINT "case_participants_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_participants" ADD CONSTRAINT "case_participants_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_participants" ADD CONSTRAINT "case_participants_linked_by_user_id_fkey" FOREIGN KEY ("linked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
