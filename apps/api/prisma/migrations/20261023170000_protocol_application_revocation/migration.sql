-- Conserva el historial de aplicación de protocolos; una revocación nunca borra el registro original.
ALTER TYPE "CaseEventType" ADD VALUE 'PROTOCOL_REVOKED';

ALTER TABLE "case_protocol_applications"
  ADD COLUMN "revoked_at" TIMESTAMP(3),
  ADD COLUMN "revocation_reason" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
