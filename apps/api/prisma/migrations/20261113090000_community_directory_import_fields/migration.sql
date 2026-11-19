-- Datos que vienen de la nómina institucional y permiten conservar la ficha
-- completa de estudiante y apoderado/a durante la carga masiva.
ALTER TABLE "students"
  ADD COLUMN "sex" TEXT,
  ADD COLUMN "email" TEXT;

ALTER TABLE "guardians"
  ADD COLUMN "birth_date" DATE,
  ADD COLUMN "address" TEXT;
