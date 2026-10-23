CREATE TABLE "system_control" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_control_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "system_control_key_key" ON "system_control"("key");
