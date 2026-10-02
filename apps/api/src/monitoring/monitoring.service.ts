import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  BadRequestException,
} from "@nestjs/common";
import { CheckRunStatus, Prisma, Watch } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import {
  ContentNormalizer,
  EXTRACTION_VERSION,
  NormalizedSection,
} from "./normalization/content-normalizer";
import { ChangeClassifier } from "./classification/change-classifier";
import {
  MonitoringQueueService,
  runsRole,
} from "./queue/monitoring-queue.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SafeFetcher } from "./fetch/safe-fetcher";
import { FetchFailure } from "./security/url-validator";

const ACTIVE = [
  CheckRunStatus.QUEUED,
  CheckRunStatus.RUNNING,
  CheckRunStatus.RETRYING,
];
const LEASE_MS = 60_000;

@Injectable()
export class MonitoringService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(MonitoringService.name);
  private timer?: NodeJS.Timeout;
  private ticking = false;
  private stopping = false;
  private tickStopped?: () => void;
  private readonly instance = randomUUID();
  private lastCleanup = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: ContentNormalizer,
    private readonly classifier: ChangeClassifier,
    private readonly queue: MonitoringQueueService,
    private readonly notifications: NotificationsService,
    private readonly fetcher: SafeFetcher,
  ) {}

  onApplicationBootstrap() {
    this.queue.setExecutor("page-monitoring", (id) => this.executeCheck(id));
    if (runsRole("scheduler") || runsRole("worker")) {
      void this.tick();
      this.timer = setInterval(() => void this.tick(), 5000);
    }
  }
  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    if (this.ticking)
      await new Promise<void>((resolve) => {
        this.tickStopped = resolve;
      });
  }

  async checkNow(watchId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "Watch" WHERE "id" = ${watchId}::uuid FOR UPDATE`;
      const watch = await tx.watch.findFirst({
        where: { id: watchId, userId },
      });
      if (!watch) return null;
      const existing = await tx.checkRun.findFirst({
        where: { watchId, status: { in: ACTIVE } },
      });
      if (existing) return existing;
      const recent = await tx.checkRun.count({
        where: {
          watch: { userId },
          manual: true,
          startedAt: { gte: new Date(Date.now() - 3600_000) },
        },
      });
      if (recent >= Number(process.env.MANUAL_CHECKS_PER_HOUR ?? 60))
        throw new BadRequestException(
          "Hourly manual check limit reached. Scheduled checks will continue.",
        );
      // CheckRun is the durable enqueue outbox. Scheduler delivers it after commit.
      return tx.checkRun.create({
        data: { watchId, revision: watch.revision, manual: true },
      });
    });
  }

  private async schedule(watch: Watch) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Watch" WHERE "id" = ${watch.id}::uuid FOR UPDATE`;
      const current = await tx.watch.findUnique({ where: { id: watch.id } });
      if (!current?.isActive || current.nextCheckAt > new Date()) return;
      if (
        !(await tx.checkRun.findFirst({
          where: { watchId: watch.id, status: { in: ACTIVE } },
        }))
      ) {
        await tx.checkRun.create({
          data: { watchId: watch.id, revision: current.revision },
        });
      }
      await tx.watch.update({
        where: { id: watch.id },
        data: {
          nextCheckAt: new Date(Date.now() + current.checkInterval * 60_000),
        },
      });
    });
  }

  async tick() {
    if (this.ticking || this.stopping) return;
    this.ticking = true;
    try {
      for (const role of ["scheduler", "worker"])
        if (runsRole(role))
          await this.prisma.runtimeHeartbeat.upsert({
            where: { id: `${this.instance}-${role}` },
            create: { id: `${this.instance}-${role}`, role },
            update: { seenAt: new Date() },
          });
      if (!runsRole("scheduler")) return;
      const watches = await this.prisma.watch.findMany({
        where: { isActive: true, nextCheckAt: { lte: new Date() } },
        orderBy: [{ nextCheckAt: "asc" }, { id: "asc" }],
        take: 200,
      });
      for (const watch of watches) await this.schedule(watch);
      const pending = await this.prisma.checkRun.findMany({
        where: {
          status: { in: ACTIVE },
          nextAttemptAt: { lte: new Date() },
          OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
        },
        orderBy: { startedAt: "asc" },
        take: 200,
      });
      for (const run of pending) {
        // Stable job IDs plus execution leases make repeated outbox delivery safe.
        await this.queue.enqueue("page-monitoring", run.id);
        await this.prisma.checkRun.updateMany({
          where: { id: run.id, status: { in: ACTIVE } },
          data: { enqueuedAt: new Date() },
        });
      }
      await this.notifications.dispatchDue();
      if (Date.now() - this.lastCleanup > 3600_000) {
        await this.cleanup();
        this.lastCleanup = Date.now();
      }
    } catch {
      this.logger.error(
        "Scheduler tick failed; durable work remains pending for recovery.",
      );
    } finally {
      this.ticking = false;
      this.tickStopped?.();
    }
  }

  async executeCheck(checkRunId: string) {
    const owner = randomUUID();
    const claimed = await this.prisma.checkRun.updateMany({
      where: {
        id: checkRunId,
        status: { in: ACTIVE },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
      },
      data: {
        status: CheckRunStatus.RUNNING,
        leaseOwner: owner,
        leaseUntil: new Date(Date.now() + LEASE_MS),
        attempts: { increment: 1 },
        error: null,
      },
    });
    if (!claimed.count) return;
    const heartbeat = setInterval(() => {
      void this.prisma.checkRun
        .updateMany({
          where: {
            id: checkRunId,
            leaseOwner: owner,
            status: CheckRunStatus.RUNNING,
          },
          data: { leaseUntil: new Date(Date.now() + LEASE_MS) },
        })
        .catch(() => this.logger.warn("Check lease refresh failed"));
    }, 15_000);
    let attempt = 1;
    try {
      const run = await this.prisma.checkRun.findUniqueOrThrow({
        where: { id: checkRunId },
        include: { watch: true },
      });
      attempt = run.attempts;
      const watch = run.watch;
      if (attempt > 3)
        throw new FetchFailure(
          "Check attempts exhausted after worker recovery",
        );
      if (run.revision !== watch.revision || (!run.manual && !watch.isActive)) {
        await this.cancel(checkRunId, owner);
        return;
      }
      const fetched = await this.fetcher.fetchPage(watch.url);
      const normalized = this.normalizer.normalize(fetched.html, {
        includeSelector: watch.includeSelector,
        excludeSelector: watch.excludeSelector,
        baseUrl: fetched.finalUrl,
      });
      const previous = await this.prisma.snapshot.findFirst({
        where: { watchId: watch.id, revision: watch.revision },
        orderBy: [{ capturedAt: "desc" }, { id: "desc" }],
      });
      const baseline =
        !previous || previous.extractionVersion !== EXTRACTION_VERSION;
      const unchanged =
        !baseline && previous!.contentHash === normalized.contentHash;
      const events =
        baseline || unchanged
          ? []
          : await this.classifier.classifyMany(
              previous!.content,
              normalized.normalizedText,
              previous!.sections as unknown as NormalizedSection[],
              normalized.sections,
              normalized.title || watch.title,
            );
      const checkedAt = new Date();
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Watch" WHERE "id" = ${watch.id}::uuid FOR UPDATE`;
        const current = await tx.watch.findUnique({ where: { id: watch.id } });
        if (
          !current ||
          current.revision !== run.revision ||
          (!run.manual && !current.isActive)
        ) {
          await this.cancel(checkRunId, owner, tx);
          return;
        }
        const completed = await tx.checkRun.updateMany({
          where: {
            id: checkRunId,
            leaseOwner: owner,
            status: CheckRunStatus.RUNNING,
          },
          data: {
            status: baseline
              ? CheckRunStatus.SUCCESS
              : unchanged
                ? CheckRunStatus.NO_CHANGE
                : CheckRunStatus.CHANGE_DETECTED,
            completedAt: checkedAt,
            leaseUntil: null,
            leaseOwner: null,
          },
        });
        if (!completed.count)
          throw new FetchFailure("Execution lease lost", true);
        if (!unchanged) {
          const snapshot = await tx.snapshot.create({
            data: {
              watchId: watch.id,
              revision: run.revision,
              content: normalized.normalizedText,
              contentHash: normalized.contentHash,
              extractionVersion: EXTRACTION_VERSION,
              sections: normalized.sections as unknown as Prisma.InputJsonValue,
              links: normalized.links,
              finalUrl: fetched.finalUrl,
              httpStatus: fetched.httpStatus,
              capturedAt: checkedAt,
            },
          });
          const emailChanges = [];
          for (const event of events) {
            const c = event.result;
            const change = await tx.change.create({
              data: {
                watchId: watch.id,
                checkRunId,
                eventKey: event.eventKey,
                oldSnapshotId: previous!.id,
                newSnapshotId: snapshot.id,
                type: c.category,
                oldValue: c.oldValue,
                newValue: c.newValue,
                section: c.section,
                importance: c.importance,
                reason: c.summary,
                severity: c.severity,
                confidence: c.confidence,
                isMeaningful: c.isMeaningful,
                changePercentage: event.percentage,
                affectedSections: [c.section],
                classifierVersion: 2,
                detectedAt: checkedAt,
              },
            });
            if (c.isMeaningful) {
              const eligible = await this.notifications.createForChange(
                {
                  userId: watch.userId,
                  changeId: change.id,
                  watchTitle: current.title,
                  changeType: c.category,
                  importance: c.importance,
                  summary: c.summary,
                  oldValue: c.oldValue,
                  newValue: c.newValue,
                  watch: current,
                },
                tx,
              );
              if (eligible) emailChanges.push(change);
            }
          }
          await this.notifications.createForCheck(
            current,
            checkRunId,
            emailChanges,
            tx,
          );
        }
        await tx.watch.update({
          where: { id: watch.id },
          data: {
            lastCheckedAt: checkedAt,
            nextCheckAt: new Date(
              checkedAt.getTime() + current.checkInterval * 60_000,
            ),
          },
        });
      });
    } catch (error) {
      const failure =
        error instanceof FetchFailure
          ? error
          : new FetchFailure(
              "Monitoring failed; please try again later.",
              true,
            );
      const retry = failure.retryable && attempt < 3;
      const delay = Math.max(2000 * 2 ** (attempt - 1), failure.retryAfterMs);
      await this.prisma.checkRun.updateMany({
        where: { id: checkRunId, leaseOwner: owner },
        data: {
          status: retry ? CheckRunStatus.RETRYING : CheckRunStatus.FAILED,
          error: failure.message.slice(0, 500),
          leaseOwner: null,
          leaseUntil: null,
          nextAttemptAt: new Date(Date.now() + delay),
          completedAt: retry ? null : new Date(),
        },
      });
      if (retry) throw failure;
      throw new FetchFailure(failure.message);
    } finally {
      clearInterval(heartbeat);
    }
  }

  private cancel(
    id: string,
    owner: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.checkRun.updateMany({
      where: { id, leaseOwner: owner },
      data: {
        status: CheckRunStatus.CANCELLED,
        completedAt: new Date(),
        leaseOwner: null,
        leaseUntil: null,
        error: "Watch settings changed or monitoring was paused.",
      },
    });
  }

  private async cleanup() {
    const cutoff = new Date(
      Date.now() - Number(process.env.HISTORY_RETENTION_DAYS ?? 90) * 86400_000,
    );
    const oldRuns = await this.prisma.checkRun.findMany({
      where: { status: { notIn: ACTIVE }, completedAt: { lt: cutoff } },
      select: { id: true },
      take: 500,
    });
    await this.prisma.checkRun.deleteMany({
      where: { id: { in: oldRuns.map((r) => r.id) } },
    });
    // Keep snapshots referenced by changes and the latest snapshot of each watch/revision.
    await this.prisma
      .$executeRaw`DELETE FROM "Snapshot" WHERE "id" IN (SELECT s."id" FROM "Snapshot" s WHERE s."capturedAt" < ${cutoff} AND NOT EXISTS (SELECT 1 FROM "Change" c WHERE c."oldSnapshotId" = s."id" OR c."newSnapshotId" = s."id") AND EXISTS (SELECT 1 FROM "Snapshot" n WHERE n."watchId" = s."watchId" AND n."revision" = s."revision" AND n."capturedAt" > s."capturedAt") LIMIT 500)`;
    await this.prisma.runtimeHeartbeat.deleteMany({
      where: { seenAt: { lt: new Date(Date.now() - 86400_000) } },
    });
  }
}
