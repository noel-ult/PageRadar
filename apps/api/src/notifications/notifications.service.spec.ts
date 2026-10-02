import { NotificationsService, escapeHtml } from "./notifications.service";

describe("Important change eligibility", () => {
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
  let prisma: any;
  let service: NotificationsService;
  beforeEach(() => {
    prisma = { notification: { upsert: jest.fn() } };
    service = new NotificationsService(prisma, {} as any);
  });
  it("preserves in-app alerts and returns eligibility for check-level email grouping", async () => {
    expect(await service.createForChange(params)).toBe(true);
    expect(prisma.notification.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ channel: "IN_APP", status: "SENT" }),
      }),
    );
  });
  it("honors categories", async () => {
    expect(
      await service.createForChange({
        ...params,
        watch: { ...params.watch, interests: ["PRICE"] },
      }),
    ).toBe(false);
    expect(prisma.notification.upsert).not.toHaveBeenCalled();
  });
  it("honors importance without filtering the boundary value", async () => {
    expect(await service.createForChange({ ...params, importance: 64 })).toBe(
      false,
    );
    expect(await service.createForChange({ ...params, importance: 65 })).toBe(
      true,
    );
  });
  it("escapes all HTML special characters", () =>
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;"));
});
