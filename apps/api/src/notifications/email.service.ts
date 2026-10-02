import {
  BadRequestException,
  HttpException,
  Injectable,
  OnApplicationBootstrap,
  ServiceUnavailableException,
} from "@nestjs/common";
import { EmailTokenPurpose, Prisma, Watch } from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import { Webhook } from "standardwebhooks";
import { PrismaService } from "../prisma/prisma.service";
import { MonitoringQueueService } from "../monitoring/queue/monitoring-queue.service";
import { FetchFailure } from "../monitoring/security/url-validator";
import { emailConfig, escapeHtml, hashToken } from "./email.config";

export interface AlertChange {
  id: string;
  importance: number;
  severity: string;
  reason: string | null;
  oldValue: string | null;
  newValue: string | null;
  detectedAt: Date;
}
interface ProviderMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
}
const RETRY_WINDOW = 23 * 60 * 60 * 1000;

@Injectable()
export class EmailService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: MonitoringQueueService,
  ) {}
  onApplicationBootstrap() {
    this.queue.setExecutor("notification-delivery", (id) => this.deliver(id));
  }
  async settings(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return {
      email: user.email,
      verifiedAt: user.emailVerifiedAt,
      enabled: user.emailAlertsEnabled,
      available: emailConfig().available,
      suppressed: Boolean(user.emailSuppressedAt),
      suppressionReason: user.emailSuppressionReason,
    };
  }
  private requireProvider() {
    const config = emailConfig();
    if (!config.available)
      throw new ServiceUnavailableException(
        "Email delivery is not available yet. You can continue using PageRadar and check back later.",
      );
    return config;
  }
  private async limit(userId: string, kind: string, ip?: string) {
    const checks = [this.queue.rateLimit(`email:${kind}:${userId}`, 5, 3600)];
    if (kind === "verify")
      checks.push(
        this.queue.rateLimit(`email:verify:cooldown:${userId}`, 1, 60),
      );
    if (ip)
      checks.push(this.queue.rateLimit(`email:${kind}:ip:${ip}`, 30, 3600));
    if ((await Promise.all(checks)).some((allowed) => !allowed))
      throw new HttpException(
        "Too many email requests. Please try again later.",
        429,
      );
  }
  async requestVerification(userId: string, ip?: string) {
    const config = this.requireProvider();
    await this.limit(userId, "verify", ip);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.emailVerifiedAt) return true;
      if (user.emailSuppressedAt)
        throw new BadRequestException(
          "Email delivery to this address is blocked. Contact support before requesting another message.",
        );
      await tx.emailActionToken.updateMany({
        where: { userId, purpose: "VERIFY", usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.notification.updateMany({
        where: {
          userId,
          channel: "EMAIL",
          purpose: "VERIFICATION",
          status: "PENDING",
        },
        data: {
          status: "DISABLED",
          error: "A newer verification email was requested.",
        },
      });
      const token = randomBytes(32).toString("base64url");
      const action = await tx.emailActionToken.create({
        data: {
          userId,
          purpose: "VERIFY",
          tokenHash: await hashToken(token),
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      const url = `${config.origin}/email/verify#token=${token}`;
      const text = `Confirm this email address for your PageRadar account. This link expires in 24 hours.\n${url}\nIf you did not request this, ignore this email.`;
      const message: ProviderMessage = {
        from: config.from!,
        to: user.email,
        subject: "Verify your PageRadar email",
        text,
        html: `<h2>Verify your PageRadar email</h2><p>Confirm this address before enabling alerts.</p><p><a href="${escapeHtml(url)}">Confirm email address</a></p><p>This link expires in 24 hours. If you did not request this, ignore this email.</p>`,
      };
      await tx.notification.create({
        data: {
          userId,
          channel: "EMAIL",
          purpose: "VERIFICATION",
          message: "Email verification",
          payload: { tokenId: action.id },
          providerMessage: message as unknown as Prisma.InputJsonValue,
        },
      });
      return true;
    });
  }
  async confirmVerification(token: string) {
    return this.consumeToken(token, "VERIFY", async (tx, userId) => {
      await tx.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: new Date() },
      });
      return true;
    });
  }
  private async consumeToken(
    token: string,
    purpose: EmailTokenPurpose,
    action: (tx: Prisma.TransactionClient, userId: string) => Promise<boolean>,
  ) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new BadRequestException("This link is invalid or has expired.");
    const tokenHash = await hashToken(token);
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.emailActionToken.findUnique({
        where: { tokenHash },
      });
      if (
        !found ||
        found.purpose !== purpose ||
        (found.expiresAt && found.expiresAt <= new Date())
      )
        throw new BadRequestException("This link is invalid or has expired.");
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${found.userId}::uuid FOR UPDATE`;
      const current = await tx.emailActionToken.findUniqueOrThrow({
        where: { tokenHash },
      });
      if (current.expiresAt && current.expiresAt <= new Date())
        throw new BadRequestException("This link is invalid or has expired.");
      if (purpose === "VERIFY" && current.usedAt)
        throw new BadRequestException(
          "This verification link has already been used.",
        );
      await tx.emailActionToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      });
      return action(tx, found.userId);
    });
  }
  async unsubscribe(token: string) {
    return this.consumeToken(token, "UNSUBSCRIBE", async (tx, userId) => {
      await tx.user.update({
        where: { id: userId },
        data: { emailAlertsEnabled: false },
      });
      await this.disableQueued(tx, userId);
      return true;
    });
  }
  private disableQueued(tx: Prisma.TransactionClient, userId: string) {
    return tx.notification.updateMany({
      where: {
        userId,
        channel: "EMAIL",
        purpose: "CHANGE_ALERT",
        status: "PENDING",
      },
      data: { status: "DISABLED", error: "Email alerts are turned off." },
    });
  }
  async setEnabled(userId: string, enabled: boolean) {
    if (enabled) this.requireProvider();
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (enabled && (!user.emailVerifiedAt || user.emailSuppressedAt))
        throw new BadRequestException(
          user.emailSuppressedAt
            ? "Email delivery to this address is blocked. Contact support."
            : "Verify your email address before enabling alerts.",
        );
      await tx.user.update({
        where: { id: userId },
        data: { emailAlertsEnabled: enabled },
      });
      if (!enabled) await this.disableQueued(tx, userId);
    });
    return this.settings(userId);
  }
  async sendTest(userId: string, ip?: string) {
    const config = this.requireProvider();
    await this.limit(userId, "test", ip);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!user.emailVerifiedAt || user.emailSuppressedAt)
      throw new BadRequestException(
        "Verify an available email address before sending a test.",
      );
    const url = `${config.origin}/notifications/settings`;
    const message: ProviderMessage = {
      from: config.from!,
      to: user.email,
      subject: "PageRadar test email",
      text: `Your PageRadar email connection is working. Important changes will be sent when account and watch email alerts are enabled.\n${url}`,
      html: `<h2>PageRadar test email</h2><p>Your email connection is working. Important changes will be sent when account and watch email alerts are enabled.</p><a href="${escapeHtml(url)}">Notification settings</a>`,
    };
    return this.prisma.notification.create({
      data: {
        userId,
        channel: "EMAIL",
        purpose: "TEST",
        message: "Test email",
        providerMessage: message as unknown as Prisma.InputJsonValue,
      },
    });
  }
  async createForCheck(
    watch: Watch,
    checkRunId: string,
    changes: AlertChange[],
    tx: Prisma.TransactionClient,
  ) {
    if (!changes.length || !watch.emailEnabled) return;
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${watch.userId}::uuid FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({
      where: { id: watch.userId },
    });
    const config = emailConfig();
    const reason = !config.available
      ? "Email provider is not configured."
      : !user.emailVerifiedAt
        ? "Verify your email address to receive alerts."
        : user.emailSuppressedAt
          ? "Email delivery to this address is blocked."
          : !user.emailAlertsEnabled
            ? "Account email alerts are turned off."
            : null;
    const existing = await tx.notification.findUnique({
      where: {
        userId_checkRunId_channel: {
          userId: user.id,
          checkRunId,
          channel: "EMAIL",
        },
      },
    });
    if (existing) return;
    let message: ProviderMessage | undefined;
    if (!reason) {
      const token = randomBytes(32).toString("base64url");
      await tx.emailActionToken.create({
        data: {
          userId: user.id,
          purpose: "UNSUBSCRIBE",
          tokenHash: await hashToken(token),
        },
      });
      const unsubscribeUrl = `${config.origin}/email/unsubscribe#token=${token}`;
      const oneClickUrl = `${config.origin}/api/email/unsubscribe?token=${token}`;
      const settingsUrl = `${config.origin}/notifications/settings`;
      const highest = [...changes].sort(
        (a, b) => b.importance - a.importance,
      )[0];
      const title = watch.title.replace(/[\r\n]/g, " ").slice(0, 160);
      const items = changes.map((change) => ({
        ...change,
        oldValue: change.oldValue?.slice(0, 2000),
        newValue: change.newValue?.slice(0, 2000),
        url: `${config.origin}/changes/${change.id}`,
      }));
      const text = `${watch.title}\n${highest.severity} priority · Detected ${highest.detectedAt.toISOString()}\n\n${items.map((c) => `${c.reason ?? "Page content changed"}\nPrevious: ${c.oldValue ?? "—"}\nCurrent: ${c.newValue ?? "—"}\n${c.url}`).join("\n\n")}\n\nPreferences: ${settingsUrl}\nUnsubscribe: ${unsubscribeUrl}`;
      const html = `<h2>${escapeHtml(watch.title)}</h2><p>${escapeHtml(highest.severity)} priority · Detected ${highest.detectedAt.toISOString()}</p>${items.map((c) => `<section><h3>${escapeHtml(c.reason ?? "Page content changed")}</h3><p><strong>Previous:</strong> ${escapeHtml(c.oldValue ?? "—")}</p><p><strong>Current:</strong> ${escapeHtml(c.newValue ?? "—")}</p><a href="${escapeHtml(c.url)}">View change details</a></section>`).join("<hr>")}<hr><a href="${escapeHtml(settingsUrl)}">Notification settings</a> · <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe from email alerts</a>`;
      message = {
        from: config.from!,
        to: user.email,
        subject: `[PageRadar] ${highest.severity}: ${title}`,
        text,
        html,
        headers: {
          "List-Unsubscribe": `<${oneClickUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      };
    }
    await tx.notification.create({
      data: {
        userId: user.id,
        channel: "EMAIL",
        purpose: "CHANGE_ALERT",
        checkRunId,
        watchId: watch.id,
        changeId: changes[0].id,
        status: reason ? "DISABLED" : "PENDING",
        error: reason,
        message: `[${watch.title}] ${changes.length} important change${changes.length === 1 ? "" : "s"}`,
        payload: { changeIds: changes.map((c) => c.id) },
        ...(message
          ? { providerMessage: message as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
  }
  async dispatchDue() {
    // Unknown callback IDs cannot block reconciliation of newer submissions.
    await this.prisma.emailWebhookEvent.updateMany({
      where: {
        processedAt: null,
        receivedAt: { lt: new Date(Date.now() - 86400000) },
      },
      data: { processedAt: new Date() },
    });
    // Reconcile early webhooks in bounded batches.
    const early = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT e."id" FROM "EmailWebhookEvent" e
      JOIN "Notification" n ON n."providerId" = e."providerId"
      WHERE e."processedAt" IS NULL ORDER BY e."receivedAt" ASC LIMIT 200`;
    for (const event of early) await this.applyEvent(event.id);
    const deliveries = await this.prisma.notification.findMany({
      where: {
        channel: "EMAIL",
        status: "PENDING",
        nextAttemptAt: { lte: new Date() },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    for (const item of deliveries)
      await this.queue.enqueue("notification-delivery", item.id);
  }
  async deliver(id: string) {
    const owner = randomUUID();
    const now = new Date();
    const claimed = await this.prisma.notification.updateMany({
      where: {
        id,
        channel: "EMAIL",
        status: "PENDING",
        nextAttemptAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      data: {
        leaseOwner: owner,
        leaseUntil: new Date(Date.now() + 30000),
        attempts: { increment: 1 },
      },
    });
    if (!claimed.count) return;
    let attempts = 1;
    try {
      const item = await this.prisma.notification.findUniqueOrThrow({
        where: { id },
        include: { user: true },
      });
      attempts = item.attempts;
      const config = emailConfig();
      let disabled = !config.available
        ? "Email provider is not configured."
        : item.user.emailSuppressedAt
          ? "Email delivery to this address is blocked."
          : null;
      if (item.purpose === "CHANGE_ALERT") {
        const watch = item.watchId
          ? await this.prisma.watch.findUnique({ where: { id: item.watchId } })
          : null;
        if (
          !item.user.emailVerifiedAt ||
          !item.user.emailAlertsEnabled ||
          !watch?.emailEnabled
        )
          disabled = "Email alerts are turned off or not verified.";
      } else if (item.purpose === "TEST" && !item.user.emailVerifiedAt)
        disabled = "Email address is not verified.";
      else if (item.purpose === "VERIFICATION") {
        const token = await this.prisma.emailActionToken.findUnique({
          where: { id: (item.payload as { tokenId: string }).tokenId },
        });
        if (
          !token ||
          token.usedAt ||
          !token.expiresAt ||
          token.expiresAt <= now ||
          item.user.emailVerifiedAt
        )
          disabled = "Verification email is no longer needed.";
      }
      const message = item.providerMessage as unknown as ProviderMessage | null;
      if (!message || message.to !== item.user.email)
        disabled = "Email recipient or message is no longer available.";
      if (disabled) {
        await this.prisma.notification.updateMany({
          where: { id, leaseOwner: owner, status: "PENDING" },
          data: {
            status: "DISABLED",
            error: disabled,
            leaseOwner: null,
            leaseUntil: null,
          },
        });
        return;
      }
      if (
        attempts > 3 ||
        (item.firstAttemptAt &&
          now.getTime() - item.firstAttemptAt.getTime() >= RETRY_WINDOW)
      )
        throw new FetchFailure(
          "Email submission needs review before retrying.",
        );
      const ready = await this.prisma.notification.updateMany({
        where: { id, leaseOwner: owner, status: "PENDING" },
        data: { firstAttemptAt: item.firstAttemptAt ?? now },
      });
      if (!ready.count) return;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.key}`,
          "Idempotency-Key": `pageradar-${id}`,
        },
        body: JSON.stringify(message),
      });
      if (!response.ok) {
        let concurrentSubmission = false;
        if (response.status === 409) {
          const providerError = (await response.json().catch(() => null)) as {
            name?: string;
          } | null;
          concurrentSubmission =
            providerError?.name === "concurrent_idempotent_requests";
        }
        const value = response.headers?.get("retry-after");
        const retryAfter = value
          ? /^\d+$/.test(value)
            ? Number(value) * 1000
            : Date.parse(value) - Date.now()
          : 0;
        throw new FetchFailure(
          `Email provider returned HTTP ${response.status}`,
          response.status === 429 ||
            response.status >= 500 ||
            concurrentSubmission,
          Number.isFinite(retryAfter)
            ? Math.max(0, Math.min(3600000, retryAfter))
            : 0,
        );
      }
      const result = (await response.json()) as { id?: string };
      if (!result.id || typeof result.id !== "string")
        throw new FetchFailure(
          "Email provider returned no delivery identifier",
          true,
        );
      // Persist the provider ID even if consent was revoked during an in-flight request.
      await this.prisma.notification.updateMany({
        where: { id, leaseOwner: owner },
        data: {
          status: "ACCEPTED",
          providerId: result.id,
          sentAt: new Date(),
          leaseOwner: null,
          leaseUntil: null,
          error: null,
        },
      });
      const events = await this.prisma.emailWebhookEvent.findMany({
        where: { providerId: result.id, processedAt: null },
        orderBy: { occurredAt: "asc" },
      });
      for (const event of events) await this.applyEvent(event.id);
    } catch (error) {
      const failure =
        error instanceof FetchFailure
          ? error
          : new FetchFailure("Email delivery connection failed", true);
      const retry = failure.retryable && attempts < 3;
      await this.prisma.notification.updateMany({
        where: { id, leaseOwner: owner, status: "PENDING" },
        data: {
          status: retry ? "PENDING" : "FAILED",
          error: failure.message,
          leaseOwner: null,
          leaseUntil: null,
          nextAttemptAt: new Date(
            Date.now() +
              Math.max(failure.retryAfterMs, 2000 * 2 ** (attempts - 1)),
          ),
        },
      });
      if (retry) throw failure;
      throw new FetchFailure(failure.message);
    }
  }
  async receiveWebhook(body: Buffer, headers: Record<string, string>) {
    const secret = emailConfig().secret;
    if (!secret)
      throw new ServiceUnavailableException(
        "Email callbacks are not configured.",
      );
    type ProviderEvent = {
      type: string;
      created_at: string;
      data: { email_id: string };
    };
    let event: ProviderEvent;
    try {
      event = new Webhook(secret).verify(body.toString("utf8"), {
        "webhook-id": headers["svix-id"],
        "webhook-timestamp": headers["svix-timestamp"],
        "webhook-signature": headers["svix-signature"],
      }) as ProviderEvent;
    } catch {
      throw new BadRequestException("Invalid webhook signature.");
    }
    const types = [
      "email.delivered",
      "email.bounced",
      "email.complained",
      "email.failed",
    ];
    if (!types.includes(event.type)) return;
    const occurredAt = new Date(event.created_at);
    if (!event.data?.email_id || Number.isNaN(occurredAt.getTime()))
      throw new BadRequestException("Invalid webhook event.");
    const id = headers["svix-id"];
    await this.prisma.emailWebhookEvent.upsert({
      where: { id },
      create: {
        id,
        providerId: event.data.email_id,
        type: event.type,
        occurredAt,
      },
      update: {},
    });
    await this.applyEvent(id);
  }
  async applyEvent(id: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "EmailWebhookEvent" WHERE "id" = ${id} FOR UPDATE`;
      const event = await tx.emailWebhookEvent.findUniqueOrThrow({
        where: { id },
      });
      if (event.processedAt) return;
      const owner = await tx.notification.findUnique({
        where: { providerId: event.providerId },
        select: { userId: true },
      });
      if (!owner) return;
      // Use the same user-before-message lock order as preference updates.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${owner.userId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "Notification" WHERE "providerId" = ${event.providerId} FOR UPDATE`;
      const item = await tx.notification.findUniqueOrThrow({
        where: { providerId: event.providerId },
      });
      const blocked =
        event.type === "email.bounced" || event.type === "email.complained";
      if (blocked) {
        await tx.user.update({
          where: { id: item.userId },
          data: {
            emailSuppressedAt: event.occurredAt,
            emailSuppressionReason:
              event.type === "email.bounced"
                ? "This email address could not receive messages."
                : "Email alerts were reported as unwanted.",
            emailAlertsEnabled: false,
          },
        });
        await tx.notification.updateMany({
          where: { userId: item.userId, channel: "EMAIL", status: "PENDING" },
          data: {
            status: "DISABLED",
            error: "Email delivery to this address is blocked.",
          },
        });
      }
      const status =
        event.type === "email.delivered"
          ? "DELIVERED"
          : event.type === "email.bounced"
            ? "BOUNCED"
            : event.type === "email.complained"
              ? "COMPLAINED"
              : "FAILED";
      // Suppression is terminal; late delivery callbacks cannot undo it.
      if (
        ((!item.lastProviderEventAt ||
          event.occurredAt >= item.lastProviderEventAt) &&
          !["BOUNCED", "COMPLAINED"].includes(item.status)) ||
        blocked
      ) {
        await tx.notification.update({
          where: { id: item.id },
          data: {
            status,
            lastProviderEventAt: event.occurredAt,
            ...(status === "DELIVERED"
              ? { deliveredAt: event.occurredAt, error: null }
              : { error: "Email delivery was not completed." }),
          },
        });
      }
      await tx.emailWebhookEvent.update({
        where: { id },
        data: { processedAt: new Date() },
      });
    });
  }
}
