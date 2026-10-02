import { EmailService } from "./email.service";
import { emailConfig } from "./email.config";
import { Webhook } from "standardwebhooks";

describe("Email delivery safety", () => {
  const initialEnv = { ...process.env };
  let prisma: any;
  let service: EmailService;
  const secret =
    "whsec_" + Buffer.from("test-signing-secret").toString("base64");
  const item = () => ({
    id: "n1",
    attempts: 1,
    purpose: "CHANGE_ALERT",
    watchId: "w1",
    firstAttemptAt: null,
    user: {
      email: "a@example.com",
      emailVerifiedAt: new Date(),
      emailAlertsEnabled: true,
    },
    providerMessage: {
      from: "alerts@notify.example.com",
      to: "a@example.com",
      subject: "Update",
      text: "Before and after",
      html: "&lt;script&gt;",
    },
  });
  beforeEach(() => {
    Object.assign(process.env, {
      NODE_ENV: "test",
      RESEND_API_KEY: "test-key",
      EMAIL_FROM: "alerts@notify.example.com",
      RESEND_WEBHOOK_SECRET: secret,
      FRONTEND_URL: "https://example.com",
    });
    prisma = {
      notification: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(item()),
      },
      watch: {
        findUnique: jest.fn().mockResolvedValue({ emailEnabled: true }),
      },
      emailWebhookEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
      },
    };
    service = new EmailService(prisma, {
      rateLimit: jest.fn().mockResolvedValue(true),
    } as any);
  });
  afterEach(() => {
    process.env = { ...initialEnv };
    jest.restoreAllMocks();
  });
  it("requires sender, origin and webhook configuration, and rejects unsafe origins", () => {
    expect(emailConfig().available).toBe(true);
    delete process.env.RESEND_WEBHOOK_SECRET;
    expect(emailConfig().available).toBe(false);
    process.env.RESEND_WEBHOOK_SECRET = secret;
    process.env.FRONTEND_URL = "https://user:password@example.com";
    expect(emailConfig().available).toBe(false);
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "http://example.com";
    expect(emailConfig().available).toBe(false);
  });
  it("submits immutable messages with a stable idempotency key", async () => {
    const fetch = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "provider-1" })));
    await service.deliver("n1");
    expect(fetch).toHaveBeenCalledTimes(1);
    const options = fetch.mock.calls[0][1]!;
    expect(JSON.parse(options.body as string)).toEqual(item().providerMessage);
    expect((options.headers as Record<string, string>)["Idempotency-Key"]).toBe(
      "pageradar-n1",
    );
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACCEPTED",
          providerId: "provider-1",
        }),
      }),
    );
  });
  it("does not send after global opt-out or a per-watch opt-out", async () => {
    const fetch = jest.spyOn(global, "fetch");
    prisma.notification.findUniqueOrThrow.mockResolvedValue({
      ...item(),
      user: { ...item().user, emailAlertsEnabled: false },
    });
    await service.deliver("n1");
    expect(fetch).not.toHaveBeenCalled();
    prisma.notification.findUniqueOrThrow.mockResolvedValue(item());
    prisma.watch.findUnique.mockResolvedValue({ emailEnabled: false });
    await service.deliver("n1");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("prevents duplicate workers from submitting the same claimed record", async () => {
    prisma.notification.updateMany.mockResolvedValueOnce({ count: 0 });
    const fetch = jest.spyOn(global, "fetch");
    await service.deliver("n1");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("honors Retry-After on 429 and stops after three attempts", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response("", { status: 429, headers: { "Retry-After": "60" } }),
      );
    await expect(service.deliver("n1")).rejects.toThrow("429");
    expect(prisma.notification.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING",
          nextAttemptAt: expect.any(Date),
        }),
      }),
    );
    const retry =
      prisma.notification.updateMany.mock.calls.at(-1)[0].data.nextAttemptAt;
    expect(retry.getTime() - Date.now()).toBeGreaterThan(58000);
    prisma.notification.findUniqueOrThrow.mockResolvedValue({
      ...item(),
      attempts: 3,
    });
    await expect(service.deliver("n1")).rejects.toThrow("429");
    expect(prisma.notification.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });
  it.each([
    ["concurrent_idempotent_requests", "PENDING"],
    ["invalid_idempotent_request", "FAILED"],
  ])(
    "handles provider conflict %s without changing the message or key",
    async (name, expectedStatus) => {
      jest
        .spyOn(global, "fetch")
        .mockResolvedValue(
          new Response(JSON.stringify({ name }), { status: 409 }),
        );
      await expect(service.deliver("n1")).rejects.toThrow("409");
      expect(prisma.notification.updateMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: expectedStatus }),
        }),
      );
    },
  );
  it("does not retry an uncertain submission outside the provider idempotency window", async () => {
    prisma.notification.findUniqueOrThrow.mockResolvedValue({
      ...item(),
      firstAttemptAt: new Date(Date.now() - 23 * 3600000),
    });
    const fetch = jest.spyOn(global, "fetch");
    await expect(service.deliver("n1")).rejects.toThrow("review");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("groups qualifying changes once and escapes evidence in a persisted message", async () => {
    const tx: any = {
      $queryRaw: jest.fn(),
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: "u1",
          email: "a@example.com",
          emailVerifiedAt: new Date(),
          emailAlertsEnabled: true,
        }),
      },
      notification: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      emailActionToken: { create: jest.fn() },
    };
    const changes = ["c1", "c2"].map((id) => ({
      id,
      severity: "HIGH",
      importance: 90,
      reason: "Deadline changed",
      oldValue: "<script>bad</script>",
      newValue: "November 2",
      detectedAt: new Date(),
    }));
    const watch: any = {
      id: "w1",
      userId: "u1",
      title: "Scholarship",
      emailEnabled: true,
    };
    await service.createForCheck(watch, "run1", changes, tx);
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    const data = tx.notification.create.mock.calls[0][0].data;
    expect(data.payload.changeIds).toEqual(["c1", "c2"]);
    expect(data.providerMessage.html).toContain("&lt;script&gt;");
    expect(data.providerMessage.html).not.toContain("<script>");
    expect(data.providerMessage.text).toContain("/changes/c1");
    expect(data.providerMessage.text).toContain("/changes/c2");
    expect(data.providerMessage.headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
    tx.notification.findUnique.mockResolvedValue({ id: "existing" });
    await service.createForCheck(watch, "run1", changes, tx);
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    expect(tx.emailActionToken.create).toHaveBeenCalledTimes(1);
  });
  it("records disabled alerts without creating a backlog or capability link", async () => {
    const tx: any = {
      $queryRaw: jest.fn(),
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: "u1",
          email: "a@example.com",
          emailVerifiedAt: new Date(),
          emailAlertsEnabled: false,
        }),
      },
      notification: { findUnique: jest.fn(), create: jest.fn() },
      emailActionToken: { create: jest.fn() },
    };
    await service.createForCheck(
      { id: "w1", userId: "u1", title: "Watch", emailEnabled: true } as any,
      "run1",
      [{ id: "c1" } as any],
      tx,
    );
    const data = tx.notification.create.mock.calls[0][0].data;
    expect(data.status).toBe("DISABLED");
    expect(data.providerMessage).toBeUndefined();
    expect(tx.emailActionToken.create).not.toHaveBeenCalled();
  });
  it("rejects forged callbacks before persisting them", async () => {
    await expect(service.receiveWebhook(Buffer.from("{}"), {})).rejects.toThrow(
      "signature",
    );
    expect(prisma.emailWebhookEvent.upsert).not.toHaveBeenCalled();
  });
  it("verifies signed raw callback bytes", async () => {
    const body = JSON.stringify({
      type: "email.delivered",
      created_at: new Date().toISOString(),
      data: { email_id: "provider-1" },
    });
    const now = new Date();
    const headers = {
      "svix-id": "evt1",
      "svix-timestamp": String(Math.floor(now.getTime() / 1000)),
      "svix-signature": new Webhook(secret).sign("evt1", now, body),
    };
    const apply = jest.spyOn(service, "applyEvent").mockResolvedValue();
    await service.receiveWebhook(Buffer.from(body), headers);
    expect(apply).toHaveBeenCalledWith("evt1");
    await expect(
      service.receiveWebhook(Buffer.from(body + " "), headers),
    ).rejects.toThrow("signature");
  });
});
