import { ForbiddenException } from "@nestjs/common";
import { WatchesService } from "./watches.service";
describe("WatchesService ownership and preferences", () => {
  const prisma: any = {
    $queryRaw: jest.fn(),
    watch: {
      findUnique: jest.fn(),
      findFirstOrThrow: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userInterest: { findMany: jest.fn().mockResolvedValue([]) },
    checkRun: { updateMany: jest.fn() },
  };
  prisma.$transaction = async (callback: any) => callback(prisma);
  const validator: any = { validateAndResolve: jest.fn() };
  const service = new WatchesService(prisma, validator);
  beforeEach(() => jest.clearAllMocks());
  it("saves per-watch preferences for the authenticated user", async () => {
    await service.create("owner", {
      url: "https://example.com",
      title: " Example ",
      checkInterval: 360,
      interests: ["PRICE"],
      minimumImportance: 65,
    });
    expect(prisma.watch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "owner",
          title: "Example",
          interests: ["PRICE"],
          minimumImportance: 65,
        }),
      }),
    );
  });
  it("blocks another user from modifying a watch", async () => {
    prisma.watch.findUnique.mockResolvedValue({ userId: "owner" });
    await expect(
      service.update("w1", "other", { title: "Nope" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it("rejects whitespace-only names", async () => {
    await expect(
      service.create("owner", {
        url: "https://example.com",
        title: "  ",
        checkInterval: 10,
      }),
    ).rejects.toThrow("blank");
  });
  it("starts a new baseline when extraction settings change", async () => {
    const watch = {
      userId: "owner",
      url: "https://example.com",
      includeSelector: null,
      excludeSelector: null,
    };
    prisma.watch.findUnique.mockResolvedValue(watch);
    prisma.watch.findFirstOrThrow.mockResolvedValue(watch);
    await service.update("w1", "owner", { includeSelector: "main" });
    expect(prisma.watch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          revision: { increment: 1 },
          lastCheckedAt: null,
        }),
      }),
    );
    expect(prisma.checkRun.updateMany).toHaveBeenCalled();
  });
});
