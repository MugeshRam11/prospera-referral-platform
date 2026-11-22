CREATE TYPE "AgencyReviewStage" AS ENUM ('PENDING_AGENCY_APPROVAL', 'AGENCY_CHANGES_REQUESTED', 'AGENCY_APPROVED');

ALTER TABLE "leads"
  ADD COLUMN "originating_agency_id" UUID,
  ADD COLUMN "agency_review_stage" "AgencyReviewStage",
  ADD COLUMN "consent_at" TIMESTAMPTZ,
  ADD COLUMN "requirements" TEXT,
  ADD COLUMN "demo_property_id" VARCHAR(64),
  ADD COLUMN "submission_key" UUID,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "leads_partner_id_submission_key_key" ON "leads" ("partner_id", "submission_key");

CREATE TABLE "orientations" (
  "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "step" INTEGER NOT NULL DEFAULT 0,
  "state" VARCHAR(12) NOT NULL DEFAULT 'active'
);
