-- Carta PDF y trazabilidad de envío para citaciones. La dirección de correo no se persiste.
ALTER TYPE "CaseEventType" ADD VALUE IF NOT EXISTS 'SUMMONS_EMAIL_SENT';

ALTER TABLE "case_summons"
  ADD COLUMN "email_sent_at" TIMESTAMP(3);
