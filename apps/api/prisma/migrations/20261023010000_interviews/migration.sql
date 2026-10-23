ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'INTERVIEW_CREATED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'INTERVIEW_FINALIZED';
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'INTERVIEW_CORRECTED';
CREATE TYPE "InterviewStatus" AS ENUM ('BORRADOR', 'FINALIZADA');
CREATE TABLE "interviews" (
 "id" TEXT NOT NULL, "case_id" TEXT NOT NULL, "interviewer_user_id" TEXT NOT NULL,
 "occurred_at" TIMESTAMP(3) NOT NULL, "modality_code" TEXT NOT NULL, "summary" TEXT NOT NULL,
 "restricted_notes" TEXT, "agreements" TEXT, "status" "InterviewStatus" NOT NULL DEFAULT 'BORRADOR',
 "version" INTEGER NOT NULL DEFAULT 1, "finalized_at" TIMESTAMP(3),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "interview_corrections" (
 "id" TEXT NOT NULL, "interview_id" TEXT NOT NULL, "actor_user_id" TEXT NOT NULL,
 "reason" TEXT NOT NULL, "previous_version" INTEGER NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "interview_corrections_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "interviews_case_id_occurred_at_idx" ON "interviews"("case_id", "occurred_at");
CREATE INDEX "interview_corrections_interview_id_created_at_idx" ON "interview_corrections"("interview_id", "created_at");
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_interviewer_user_id_fkey" FOREIGN KEY ("interviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interview_corrections" ADD CONSTRAINT "interview_corrections_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interview_corrections" ADD CONSTRAINT "interview_corrections_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
