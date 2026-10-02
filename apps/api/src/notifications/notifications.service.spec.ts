import { NotificationsService, escapeHtml } from "./notifications.service";

describe("Notification delivery", () => {
  let prisma: any;
  let service: NotificationsService;
  beforeEach(() => {
    prisma = {
      notification: {
        upsert: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({
            id: "n1",
            attempts: 1,
            changeId: "c1",
            user: { name: "<script>A</script>", email: "a@example.com" },
            payload: {
              watchTitle: "Scholarship",
              summary: '<a href="evil">Click</a>',
              oldValue: "October 15",
              newValue: "November 2",
            },
          }),
      },
    };
    service = new NotificationsService(prisma, {} as any);
    process.env.RESEND_API_KEY = "test-key";
  });
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    jest.restoreAllMocks();
  });
  const params: any = {
    userId: "u1",
    changeId: "c1",
    watchTitle: "Scholarship",
    changeType: "DEADLINE_CHANGED",
    importance: 90,
    summary: "Changed",
    oldValue: "Old",
    newValue: "New",
    watch: {
      minimumImportance: 65,
      interests: ["DEADLINE"],
      emailEnabled: true,
    },
  };
  it("queues external delivery without claiming it was sent", async () => {
    await service.createForChange(params);
    expect(prisma.notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          channel: "EMAIL",
          status: "PENDING",
          payload: expect.any(Object),
        }),
      }),
    );
  });
  it("honors per-watch categories", async () => {
    await service.createForChange({
      ...params,
      watch: { ...params.watch, interests: ["PRICE"] },
    });
    expect(prisma.notification.upsert).not.toHaveBeenCalled();
  });
  it("records disabled delivery when no provider is configured", async () => {
    delete process.env.RESEND_API_KEY;
    await service.createForChange(params);
    expect(prisma.notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          channel: "EMAIL",
          status: "DISABLED",
        }),
      }),
    );
  });
  it("escapes untrusted HTML and uses a stable provider idempotency key", async () => {
    const fetch = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({ id: "provider-1" }),
      } as Response);
    await service.deliver("n1");
    const options = fetch.mock.calls[0][1]!;
    const email = JSON.parse(options.body as string);
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<script>");
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
  it("persists retry state after a provider outage", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: false, status: 503 } as Response);
    await expect(service.deliver("n1")).rejects.toThrow("503");
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING",
          error: expect.stringContaining("503"),
        }),
      }),
    );
  });
  it("HTML escaping is complete", () =>
    expect(escapeHtml("<>&\"'")).toBe("&lt;&gt;&amp;&quot;&#39;"));
});
