ALTER TYPE "NotificationStatus" ADD VALUE 'PENDING';
ALTER TYPE "NotificationStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "NotificationStatus" ADD VALUE 'SKIPPED';

ALTER TABLE "notification_logs"
  ADD COLUMN "event_key" TEXT,
  ADD COLUMN "entity_id" UUID,
  ADD COLUMN "recipient_id" UUID,
  ADD COLUMN "reference" TEXT,
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "available_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "accepted_at" TIMESTAMPTZ;
CREATE UNIQUE INDEX "notification_logs_event_key_key" ON "notification_logs"("event_key");
CREATE INDEX "notification_logs_status_available_at_idx" ON "notification_logs"("status", "available_at");
