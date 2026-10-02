-- Terminalize legacy jobs before adding the active-run invariant.
UPDATE "CheckRun" SET "status" = 'FAILED', "completedAt" = NOW(), "error" = 'Legacy check interrupted; monitoring will establish a fresh baseline.' WHERE "status" IN ('QUEUED', 'RUNNING');
CREATE UNIQUE INDEX "CheckRun_one_active_watch" ON "CheckRun" ("watchId") WHERE "status" IN ('QUEUED', 'RUNNING', 'RETRYING');
-- Historical notifications were marked sent without delivery evidence; preserve them as in-app history.
UPDATE "Notification" SET "channel" = 'IN_APP', "status" = 'SENT';

-- Legacy duplicate records are preserved but detached from the event before adding uniqueness.
UPDATE "Notification" SET "changeId" = NULL WHERE "id" IN (SELECT "id" FROM (SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId", "changeId", "channel" ORDER BY "createdAt", "id") AS ordinal FROM "Notification" WHERE "changeId" IS NOT NULL) n WHERE ordinal > 1);
CREATE UNIQUE INDEX "Notification_userId_changeId_channel_key" ON "Notification"("userId", "changeId", "channel");
UPDATE "Change" SET "severity" = CASE WHEN "importance" >= 80 THEN 'CRITICAL' WHEN "importance" >= 65 THEN 'HIGH' WHEN "importance" >= 40 THEN 'MEDIUM' ELSE 'LOW' END;
