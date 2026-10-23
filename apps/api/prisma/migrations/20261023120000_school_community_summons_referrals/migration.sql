-- CreateEnum
CREATE TYPE "SummonsStatus" AS ENUM ('PROGRAMADA', 'REALIZADA', 'NO_ASISTIO', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDIENTE', 'ENVIADA', 'CON_RESPUESTA', 'CERRADA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CaseEventType" ADD VALUE 'SUMMONS_CREATED';
ALTER TYPE "CaseEventType" ADD VALUE 'SUMMONS_UPDATED';
ALTER TYPE "CaseEventType" ADD VALUE 'REFERRAL_CREATED';
ALTER TYPE "CaseEventType" ADD VALUE 'REFERRAL_UPDATED';

-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "guardian_id" TEXT,
ADD COLUMN     "staff_member_id" TEXT,
ADD COLUMN     "student_id" TEXT;

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "establishment_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "academic_year" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "establishment_id" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "first_names" TEXT NOT NULL,
    "last_names" TEXT NOT NULL,
    "birth_date" DATE,
    "course_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" TEXT NOT NULL,
    "establishment_id" TEXT NOT NULL,
    "rut" TEXT,
    "first_names" TEXT NOT NULL,
    "last_names" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_guardians" (
    "student_id" TEXT NOT NULL,
    "guardian_id" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_guardians_pkey" PRIMARY KEY ("student_id","guardian_id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL,
    "establishment_id" TEXT NOT NULL,
    "rut" TEXT,
    "first_names" TEXT NOT NULL,
    "last_names" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "user_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_summons" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "participant_id" TEXT,
    "recipient_label" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "SummonsStatus" NOT NULL DEFAULT 'PROGRAMADA',
    "outcome_note" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_summons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_referrals" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "type_code" TEXT NOT NULL,
    "institution_name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDIENTE',
    "contact_name" TEXT,
    "sent_at" TIMESTAMP(3),
    "response_note" TEXT,
    "response_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_by_user_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courses_establishment_id_academic_year_name_key" ON "courses"("establishment_id", "academic_year", "name");

-- CreateIndex
CREATE INDEX "students_establishment_id_course_id_is_active_idx" ON "students"("establishment_id", "course_id", "is_active");

-- CreateIndex
CREATE INDEX "students_establishment_id_last_names_idx" ON "students"("establishment_id", "last_names");

-- CreateIndex
CREATE UNIQUE INDEX "students_establishment_id_rut_key" ON "students"("establishment_id", "rut");

-- CreateIndex
CREATE INDEX "guardians_establishment_id_last_names_idx" ON "guardians"("establishment_id", "last_names");

-- CreateIndex
CREATE UNIQUE INDEX "guardians_establishment_id_rut_key" ON "guardians"("establishment_id", "rut");

-- CreateIndex
CREATE INDEX "student_guardians_guardian_id_idx" ON "student_guardians"("guardian_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_user_id_key" ON "staff_members"("user_id");

-- CreateIndex
CREATE INDEX "staff_members_establishment_id_last_names_idx" ON "staff_members"("establishment_id", "last_names");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_establishment_id_rut_key" ON "staff_members"("establishment_id", "rut");

-- CreateIndex
CREATE INDEX "case_summons_case_id_scheduled_at_idx" ON "case_summons"("case_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "case_summons_status_scheduled_at_idx" ON "case_summons"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "case_referrals_case_id_status_idx" ON "case_referrals"("case_id", "status");

-- CreateIndex
CREATE INDEX "case_referrals_status_created_at_idx" ON "case_referrals"("status", "created_at");

-- CreateIndex
CREATE INDEX "participants_student_id_idx" ON "participants"("student_id");

-- CreateIndex
CREATE INDEX "participants_guardian_id_idx" ON "participants"("guardian_id");

-- CreateIndex
CREATE INDEX "participants_staff_member_id_idx" ON "participants"("staff_member_id");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_summons" ADD CONSTRAINT "case_summons_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_summons" ADD CONSTRAINT "case_summons_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_summons" ADD CONSTRAINT "case_summons_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

