-- Migration: 20261021150000_agency_kyc_settings
-- Additive migration for Agency Management, KYC extensions, and Banking Verification

-- 1. Create Enums
CREATE TYPE "AgentType" AS ENUM ('INDEPENDENT', 'AGENCY_MEMBER');
CREATE TYPE "AgencyRole" AS ENUM ('AGENCY_OWNER', 'AGENCY_ADMIN', 'AGENT');
CREATE TYPE "AgencyStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- 2. Extend Existing Enums
ALTER TYPE "KycDocumentType" ADD VALUE 'BANK_CONFIRMATION_LETTER';
ALTER TYPE "KycDocumentType" ADD VALUE 'BROKER_CARD_BRN';
ALTER TYPE "KycDocumentType" ADD VALUE 'ESTABLISHMENT_CARD';
ALTER TYPE "KycDocumentType" ADD VALUE 'POWER_OF_ATTORNEY';
ALTER TYPE "KycDocumentType" ADD VALUE 'OTHER';

ALTER TYPE "KycStatus" ADD VALUE 'CHANGES_REQUESTED';

-- 3. Alter Users Table
ALTER TABLE "users" ADD COLUMN "agent_type" "AgentType" NOT NULL DEFAULT 'INDEPENDENT';
ALTER TABLE "users" ADD COLUMN "whatsapp" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN "avatar_url" VARCHAR(512);
ALTER TABLE "users" ADD COLUMN "brn" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN "nationality" VARCHAR(100);
ALTER TABLE "users" ADD COLUMN "deletion_requested_at" TIMESTAMPTZ;

CREATE INDEX "users_agent_type_idx" ON "users"("agent_type");

-- 4. Create Agencies Table
CREATE TABLE "agencies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "legal_name" VARCHAR(255) NOT NULL,
    "trade_license_no" VARCHAR(100) NOT NULL,
    "orn" VARCHAR(50),
    "ded_license_no" VARCHAR(50),
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "address" TEXT,
    "po_box" VARCHAR(50),
    "status" "AgencyStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "rejection_reason" TEXT,
    "created_by_id" UUID NOT NULL,
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agencies_trade_license_no_key" UNIQUE ("trade_license_no"),
    CONSTRAINT "agencies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "agencies_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "agencies_status_idx" ON "agencies"("status");

-- 5. Create Agency Members Table
CREATE TABLE "agency_members" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "AgencyRole" NOT NULL DEFAULT 'AGENT',
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agency_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agency_members_agency_id_user_id_key" UNIQUE ("agency_id", "user_id"),
    CONSTRAINT "agency_members_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "agency_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "agency_members_user_id_idx" ON "agency_members"("user_id");
CREATE INDEX "agency_members_agency_id_idx" ON "agency_members"("agency_id");

-- 6. Create Agency Invitations Table
CREATE TABLE "agency_invitations" (
    "id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "AgencyRole" NOT NULL DEFAULT 'AGENT',
    "invite_token" VARCHAR(128) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agency_invitations_invite_token_key" UNIQUE ("invite_token"),
    CONSTRAINT "agency_invitations_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "agency_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "agency_invitations_agency_id_status_idx" ON "agency_invitations"("agency_id", "status");
CREATE INDEX "agency_invitations_email_idx" ON "agency_invitations"("email");

-- 7. Alter KYC Documents Table
ALTER TABLE "kyc_documents" ADD COLUMN "agency_id" UUID;
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "kyc_documents_agency_id_status_idx" ON "kyc_documents"("agency_id", "status");

-- 8. Alter Bank Accounts Table
ALTER TABLE "bank_accounts" ADD COLUMN "agency_id" UUID;
ALTER TABLE "bank_accounts" ADD COLUMN "bank_confirmation_doc_key" VARCHAR(512);
ALTER TABLE "bank_accounts" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "bank_accounts" ADD COLUMN "verified_at" TIMESTAMPTZ;

ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "bank_accounts_agency_id_idx" ON "bank_accounts"("agency_id");
