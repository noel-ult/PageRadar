import {
  Injectable,
  OnApplicationBootstrap,
  NotFoundException,
} from "@nestjs/common";
import {
  ChangeType,
  InterestType,
  NotificationChannel,
  NotificationStatus,
  Prisma,
  Watch,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MonitoringQueueService } from "../monitoring/queue/monitoring-queue.service";
import { FetchFailure } from "../monitoring/security/url-validator";

export interface NotifyChangeParams {
  userId: string;
  changeId: string;
  watchTitle: string;
  changeType: ChangeType;
  importance: number;
  summary: string;
  oldValue: string;
  newValue: string;
  watch: Watch;
}
export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

@Injectable()
export class NotificationsService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: MonitoringQueueService,
  ) {}
  onApplicationBootstrap() {
    this.queue.setExecutor("notification-delivery", (id) => this.deliver(id));
  }

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, channel: NotificationChannel.IN_APP },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
    });
  }
  unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, channel: NotificationChannel.IN_APP, readAt: null },
    });
  }
  async markRead(userId: string, id?: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        readAt: null,
        ...(id ? { id } : {}),
      },
      data: { readAt: new Date() },
    });
    if (
      id &&
      !result.count &&
      !(await this.prisma.notification.findFirst({ where: { id, userId } }))
    )
      throw new NotFoundException("Notification not found");
    return true;
  }

  async createForChange(
    params: NotifyChangeParams,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const mapping: Partial<Record<ChangeType, InterestType>> = {
      DEADLINE_CHANGED: "DEADLINE",
      ELIGIBILITY_CHANGED: "ELIGIBILITY",
      STATUS_CHANGED: "STATUS",
      REQUIREMENT_CHANGED: "REQUIREMENT",
      PRICE_CHANGED: "PRICE",
      LINK_CHANGED: "LINK",
      ANNOUNCEMENT_ADDED: "ANNOUNCEMENT",
      DOCUMENT_ADDED: "DOCUMENT",
    };
    if (params.importance < params.watch.minimumImportance) return;
    const interest = mapping[params.changeType];
    if (
      params.watch.interests.length &&
      (!interest || !params.watch.interests.includes(interest))
    )
      return;
    const payload: Prisma.InputJsonValue = {
      watchTitle: params.watchTitle,
      summary: params.summary,
      oldValue: params.oldValue,
      newValue: params.newValue,
      changeType: params.changeType,
      importance: params.importance,
    };
    const data = {
      userId: params.userId,
      changeId: params.changeId,
      message: `[${params.watchTitle}] ${params.summary}`,
      payload,
    };
    await tx.notification.upsert({
      where: {
        userId_changeId_channel: {
          userId: params.userId,
          changeId: params.changeId,
          channel: NotificationChannel.IN_APP,
        },
      },
      create: {
        ...data,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
      update: {},
    });
    if (params.watch.emailEnabled)
      await tx.notification.upsert({
        where: {
          userId_changeId_channel: {
            userId: params.userId,
            changeId: params.changeId,
            channel: NotificationChannel.EMAIL,
          },
        },
        create: {
          ...data,
          channel: NotificationChannel.EMAIL,
          status: process.env.RESEND_API_KEY
            ? NotificationStatus.PENDING
            : NotificationStatus.DISABLED,
          error: process.env.RESEND_API_KEY
            ? null
            : "Email provider is not configured.",
        },
        update: {},
      });
  }

  async dispatchDue() {
    const deliveries = await this.prisma.notification.findMany({
      where: {
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.PENDING,
        nextAttemptAt: { lte: new Date() },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    for (const delivery of deliveries)
      await this.queue.enqueue("notification-delivery", delivery.id);
  }

  async deliver(id: string) {
    const owner = randomUUID();
    const claimed = await this.prisma.notification.updateMany({
      where: {
        id,
        status: NotificationStatus.PENDING,
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
      },
      data: {
        leaseOwner: owner,
        leaseUntil: new Date(Date.now() + 30_000),
        attempts: { increment: 1 },
      },
    });
    if (!claimed.count) return;
    let attempts = 1;
    try {
      const notification = await this.prisma.notification.findUniqueOrThrow({
        where: { id },
        include: { user: true },
      });
      attempts = notification.attempts;
      if (attempts > 3)
        throw new FetchFailure("Email delivery attempts exhausted");
      if (!process.env.RESEND_API_KEY) {
        await this.prisma.notification.updateMany({
          where: { id, leaseOwner: owner },
          data: {
            status: NotificationStatus.DISABLED,
            leaseOwner: null,
            leaseUntil: null,
            error: "Email provider is not configured.",
          },
        });
        return;
      }
      const payload = notification.payload as Record<string, string>;
      const changeUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/changes/${notification.changeId}`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Idempotency-Key": `pageradar-${id}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "alerts@pageradar.dev",
          to: notification.user.email,
          subject: `[PageRadar] ${payload.watchTitle.slice(0, 160)}`,
          text: `${payload.summary}\nPrevious: ${payload.oldValue}\nCurrent: ${payload.newValue}\n${changeUrl}`,
          html: `<h2>PageRadar update</h2><p>Hello ${escapeHtml(notification.user.name)},</p><h3>${escapeHtml(payload.watchTitle)}</h3><p>${escapeHtml(payload.summary)}</p><p><strong>Previous:</strong> ${escapeHtml(payload.oldValue)}</p><p><strong>Current:</strong> ${escapeHtml(payload.newValue)}</p><a href="${escapeHtml(changeUrl)}">View change details</a>`,
        }),
      });
      if (!response.ok)
        throw new FetchFailure(
          `Email provider returned HTTP ${response.status}`,
          response.status === 429 || response.status >= 500,
        );
      const result = (await response.json()) as { id?: string };
      if (!result.id)
        throw new FetchFailure(
          "Email provider returned no delivery identifier",
          true,
        );
      await this.prisma.notification.updateMany({
        where: { id, leaseOwner: owner },
        data: {
          status: NotificationStatus.ACCEPTED,
          providerId: result.id,
          sentAt: new Date(),
          leaseOwner: null,
          leaseUntil: null,
          error: null,
        },
      });
    } catch (error) {
      const failure =
        error instanceof FetchFailure
          ? error
          : new FetchFailure("Email delivery connection failed", true);
      const retry = failure.retryable && attempts < 3;
      await this.prisma.notification.updateMany({
        where: { id, leaseOwner: owner },
        data: {
          status: retry
            ? NotificationStatus.PENDING
            : NotificationStatus.FAILED,
          error: failure.message,
          leaseOwner: null,
          leaseUntil: null,
          nextAttemptAt: new Date(Date.now() + 2000 * 2 ** (attempts - 1)),
        },
      });
      if (retry) throw failure;
      throw new FetchFailure(failure.message);
    }
  }
}
