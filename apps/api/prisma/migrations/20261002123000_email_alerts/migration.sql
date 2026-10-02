-- CreateEnum
CREATE TYPE "EmailPurpose" AS ENUM ('CHANGE_ALERT', 'VERIFICATION', 'TEST');

-- CreateEnum
CREATE TYPE "EmailTokenPurpose" AS ENUM ('VERIFY', 'UNSUBSCRIBE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationStatus" ADD VALUE 'BOUNCED';
ALTER TYPE "NotificationStatus" ADD VALUE 'COMPLAINED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailSuppressedAt" TIMESTAMP(3),
ADD COLUMN     "emailSuppressionReason" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "checkRunId" UUID,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "firstAttemptAt" TIMESTAMP(3),
ADD COLUMN     "lastProviderEventAt" TIMESTAMP(3),
ADD COLUMN     "providerMessage" JSONB,
ADD COLUMN     "purpose" "EmailPurpose" NOT NULL DEFAULT 'CHANGE_ALERT',
ADD COLUMN     "watchId" UUID;

-- CreateTable
CREATE TABLE "EmailActionToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "EmailTokenPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailActionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailWebhookEvent" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "EmailWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailActionToken_tokenHash_key" ON "EmailActionToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailActionToken_userId_purpose_idx" ON "EmailActionToken"("userId", "purpose");

-- CreateIndex
CREATE INDEX "EmailWebhookEvent_providerId_processedAt_idx" ON "EmailWebhookEvent"("providerId", "processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_checkRunId_channel_key" ON "Notification"("userId", "checkRunId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_providerId_key" ON "Notification"("providerId");

-- AddForeignKey
ALTER TABLE "EmailActionToken" ADD CONSTRAINT "EmailActionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Application JWT ownership is enforced through NestJS, never the public Data API.
ALTER TABLE "EmailActionToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailWebhookEvent" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "EmailActionToken", "EmailWebhookEvent" FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "EmailActionToken", "EmailWebhookEvent" FROM authenticated;
  END IF;
END $$;

-- Activating the new provider must never replay legacy alerts without consent.
UPDATE "Notification" SET "status" = 'DISABLED', "error" = 'Legacy alert requires new verified opt-in.',
  "leaseOwner" = NULL, "leaseUntil" = NULL
WHERE "channel" = 'EMAIL' AND "status" = 'PENDING';
