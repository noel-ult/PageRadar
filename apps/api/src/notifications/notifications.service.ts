import { Injectable, NotFoundException } from "@nestjs/common";
import {
  ChangeType,
  InterestType,
  NotificationChannel,
  NotificationStatus,
  Prisma,
  Watch,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService, AlertChange } from "./email.service";

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
export { escapeHtml } from "./email.config";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

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
    if (params.importance < params.watch.minimumImportance) return false;
    const interest = mapping[params.changeType];
    if (
      params.watch.interests.length &&
      (!interest || !params.watch.interests.includes(interest))
    )
      return false;
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
    return true;
  }

  createForCheck(
    watch: Watch,
    checkRunId: string,
    changes: AlertChange[],
    tx: Prisma.TransactionClient,
  ) {
    return this.email.createForCheck(watch, checkRunId, changes, tx);
  }
  dispatchDue() {
    return this.email.dispatchDue();
  }
  deliver(id: string) {
    return this.email.deliver(id);
  }
}
