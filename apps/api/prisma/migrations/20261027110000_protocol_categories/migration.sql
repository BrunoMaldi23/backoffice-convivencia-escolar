ALTER TABLE "protocol_templates" ADD COLUMN "category_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "protocol_templates_category_codes_idx" ON "protocol_templates" USING GIN ("category_codes");
