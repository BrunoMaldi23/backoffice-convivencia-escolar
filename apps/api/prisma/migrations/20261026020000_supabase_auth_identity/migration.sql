ALTER TABLE "users"
  ADD COLUMN "supabase_auth_user_id" TEXT;

CREATE UNIQUE INDEX "users_supabase_auth_user_id_key"
  ON "users"("supabase_auth_user_id");
