-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChangeType" ADD VALUE 'ANNOUNCEMENT_ADDED';
ALTER TYPE "ChangeType" ADD VALUE 'DOCUMENT_ADDED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InterestType" ADD VALUE 'ANNOUNCEMENT';
ALTER TYPE "InterestType" ADD VALUE 'DOCUMENT';

-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'IN_APP';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "NotificationStatus" ADD VALUE 'DELIVERED';
ALTER TYPE "NotificationStatus" ADD VALUE 'DISABLED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CheckRunStatus" ADD VALUE 'RETRYING';
ALTER TYPE "CheckRunStatus" ADD VALUE 'CANCELLED';

-- DropIndex
DROP INDEX "Watch_isActive_idx";

-- DropIndex
DROP INDEX "Notification_userId_idx";

-- DropIndex
DROP INDEX "CheckRun_watchId_idx";

-- AlterTable
ALTER TABLE "Watch" ADD COLUMN     "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "excludeSelector" TEXT,
ADD COLUMN     "includeSelector" TEXT,
ADD COLUMN     "interests" "InterestType"[] DEFAULT ARRAY[]::"InterestType"[],
ADD COLUMN     "minimumImportance" INTEGER NOT NULL DEFAULT 35,
ADD COLUMN     "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Snapshot" ADD COLUMN     "extractionVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "finalUrl" TEXT,
ADD COLUMN     "httpStatus" INTEGER,
ADD COLUMN     "links" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "sections" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Change" ADD COLUMN     "affectedSections" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "changePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "checkRunId" UUID,
ADD COLUMN     "classifierVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "eventKey" TEXT,
ADD COLUMN     "isMeaningful" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "severity" TEXT NOT NULL DEFAULT 'LOW';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "error" TEXT,
ADD COLUMN     "leaseOwner" TEXT,
ADD COLUMN     "leaseUntil" TIMESTAMP(3),
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "payload" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CheckRun" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "enqueuedAt" TIMESTAMP(3),
ADD COLUMN     "leaseOwner" TEXT,
ADD COLUMN     "leaseUntil" TIMESTAMP(3),
ADD COLUMN     "manual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "RuntimeHeartbeat" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuntimeHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Watch_isActive_nextCheckAt_idx" ON "Watch"("isActive", "nextCheckAt");

-- CreateIndex
CREATE UNIQUE INDEX "Change_checkRunId_eventKey_key" ON "Change"("checkRunId", "eventKey");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_status_nextAttemptAt_idx" ON "Notification"("status", "nextAttemptAt");

-- CreateIndex


-- CreateIndex
CREATE INDEX "CheckRun_watchId_startedAt_idx" ON "CheckRun"("watchId", "startedAt");

-- CreateIndex
CREATE INDEX "CheckRun_status_nextAttemptAt_idx" ON "CheckRun"("status", "nextAttemptAt");


