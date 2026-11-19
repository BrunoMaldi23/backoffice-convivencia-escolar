-- Distingue una cuenta desactivada de una invitación aún no aceptada.
ALTER TABLE "users" ADD COLUMN "invitation_pending" BOOLEAN NOT NULL DEFAULT false;
