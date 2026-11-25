-- Additive, backward-compatible migration for Beta Sprint Foundations

ALTER TABLE "services"
  ADD COLUMN IF NOT EXISTS "eligibility_info" TEXT,
  ADD COLUMN IF NOT EXISTS "required_docs" JSONB,
  ADD COLUMN IF NOT EXISTS "expected_workflow" TEXT,
  ADD COLUMN IF NOT EXISTS "form_type" VARCHAR(50);

CREATE TABLE IF NOT EXISTS "service_packages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "service_id" UUID NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "visa_count" INTEGER,
  "base_price_aed" DECIMAL(12,2),
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "service_packages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "service_packages_service_id_slug_key" ON "service_packages"("service_id", "slug");
CREATE INDEX IF NOT EXISTS "service_packages_service_id_is_active_idx" ON "service_packages"("service_id", "is_active");

ALTER TABLE "commission_rules"
  ADD COLUMN IF NOT EXISTS "property_listing_id" UUID,
  ADD COLUMN IF NOT EXISTS "rule_type" VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
  ADD COLUMN IF NOT EXISTS "fixed_partner_amount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "fixed_agent_amount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "eligibility_conditions" TEXT,
  ADD COLUMN IF NOT EXISTS "requires_approval" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "updated_by_id" UUID,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "package_id" UUID,
  ADD COLUMN IF NOT EXISTS "structured_data" JSONB,
  ADD COLUMN IF NOT EXISTS "property_listing_id" UUID,
  ADD COLUMN IF NOT EXISTS "crm_lead_id" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "crm_sync_status" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "crm_last_synced_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "crm_stage" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "commission_rule_id" UUID,
  ADD COLUMN IF NOT EXISTS "commission_rule_version" INTEGER;

CREATE TABLE IF NOT EXISTS "property_listings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "external_source" VARCHAR(50) NOT NULL DEFAULT 'LEADRAT',
  "external_id" VARCHAR(128),
  "title" VARCHAR(255) NOT NULL,
  "project_name" VARCHAR(255),
  "developer" VARCHAR(255),
  "location" VARCHAR(255) NOT NULL,
  "classification" VARCHAR(30) NOT NULL DEFAULT 'OFF_PLAN',
  "property_type" VARCHAR(100) NOT NULL,
  "unit_type" VARCHAR(100),
  "bedrooms" VARCHAR(50),
  "area_sq_ft" DECIMAL(10,2),
  "price_aed" DECIMAL(14,2),
  "currency" VARCHAR(3) NOT NULL DEFAULT 'AED',
  "availability" VARCHAR(40) NOT NULL DEFAULT 'AVAILABLE',
  "images" JSONB,
  "source_payload" JSONB,
  "editorial_summary" TEXT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'IMPORTED',
  "commission_rule_id" UUID,
  "last_synced_at" TIMESTAMPTZ,
  "reviewed_by_id" UUID,
  "reviewed_at" TIMESTAMPTZ,
  "published_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_listings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "property_listings_external_source_external_id_key" ON "property_listings"("external_source", "external_id");
CREATE INDEX IF NOT EXISTS "property_listings_status_location_idx" ON "property_listings"("status", "location");

CREATE TABLE IF NOT EXISTS "crm_sync_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID NOT NULL,
  "direction" VARCHAR(20) NOT NULL,
  "event_type" VARCHAR(60) NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_retry_at" TIMESTAMPTZ,
  "external_id" VARCHAR(128),
  "payload" JSONB,
  "response_summary" JSONB,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_sync_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_sync_events_idempotency_key_key" ON "crm_sync_events"("idempotency_key");
CREATE INDEX IF NOT EXISTS "crm_sync_events_lead_id_created_at_idx" ON "crm_sync_events"("lead_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "crm_sync_events_status_next_retry_at_idx" ON "crm_sync_events"("status", "next_retry_at");

CREATE TABLE IF NOT EXISTS "legal_document_acceptances" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "document_key" VARCHAR(60) NOT NULL,
  "version" VARCHAR(32) NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "accepted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_address" VARCHAR(45),
  "user_agent" VARCHAR(512),
  CONSTRAINT "legal_document_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "legal_document_acceptances_user_id_document_key_version_key" ON "legal_document_acceptances"("user_id", "document_key", "version");
CREATE INDEX IF NOT EXISTS "legal_document_acceptances_user_id_document_key_idx" ON "legal_document_acceptances"("user_id", "document_key");
