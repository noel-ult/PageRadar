import { MonitoringService } from "./monitoring.service";
import {
  ContentNormalizer,
  EXTRACTION_VERSION,
} from "./normalization/content-normalizer";
import { ChangeClassifier } from "./classification/change-classifier";
import { SemanticAnalyzer } from "./classification/semantic-analyzer";
import { FetchFailure } from "./security/url-validator";

describe("Monitoring pipeline", () => {
  const html =
    "<h1>Scholarship</h1><p>Application deadline is October 15, 2026.</p>";
  let prisma: any;
  let queue: any;
  let notifications: any;
  let fetcher: any;
  let service: MonitoringService;
  let normalizer: ContentNormalizer;
  const watch = {
    id: "w1",
    userId: "u1",
    revision: 1,
    isActive: true,
    url: "https://example.com",
    title: "Scholarship",
    checkInterval: 360,
    interests: [],
    minimumImportance: 35,
    emailEnabled: true,
  };
  beforeEach(() => {
    normalizer = new ContentNormalizer();
    prisma = {
      $queryRaw: jest.fn(),
      watch: {
        findFirst: jest.fn().mockResolvedValue(watch),
        findUnique: jest.fn().mockResolvedValue(watch),
        update: jest.fn(),
      },
      checkRun: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: "r1",
          watch,
          revision: 1,
          manual: true,
          attempts: 1,
        }),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "r1", status: "QUEUED" }),
      },
      snapshot: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: "s2" }),
      },
      change: { create: jest.fn().mockResolvedValue({ id: "c1" }) },
    };
    prisma.$transaction = jest.fn(async (callback: any) => callback(prisma));
    queue = { enqueue: jest.fn() };
    notifications = {
      createForChange: jest.fn().mockResolvedValue(true),
      createForCheck: jest.fn(),
    };
    fetcher = {
      fetchPage: jest
        .fn()
        .mockResolvedValue({ html, finalUrl: watch.url, httpStatus: 200 }),
    };
    service = new MonitoringService(
      prisma,
      normalizer,
      new ChangeClassifier(new SemanticAnalyzer()),
      queue,
      notifications,
      fetcher,
    );
  });
  it("commits a queued request without depending on queue availability", async () => {
    expect(await service.checkNow("w1", "u1")).toMatchObject({
      status: "QUEUED",
    });
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
  it("coalesces requests for an existing active check", async () => {
    prisma.checkRun.findFirst.mockResolvedValue({ id: "existing" });
    expect(await service.checkNow("w1", "u1")).toEqual({ id: "existing" });
    expect(prisma.checkRun.create).not.toHaveBeenCalled();
  });
  it("captures a structured baseline without alerting", async () => {
    await service.executeCheck("r1");
    expect(prisma.snapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          extractionVersion: EXTRACTION_VERSION,
          sections: expect.any(Array),
        }),
      }),
    );
    expect(prisma.change.create).not.toHaveBeenCalled();
  });
  it("detects unchanged content without another snapshot", async () => {
    const old = normalizer.normalize(html, { baseUrl: watch.url });
    prisma.snapshot.findFirst.mockResolvedValue({
      ...old,
      id: "s1",
      content: old.normalizedText,
      extractionVersion: EXTRACTION_VERSION,
    });
    await service.executeCheck("r1");
    expect(prisma.snapshot.create).not.toHaveBeenCalled();
    expect(prisma.checkRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "NO_CHANGE" }),
      }),
    );
  });
  it("compares persisted sections and creates transactional alerts", async () => {
    const old = normalizer.normalize(html, { baseUrl: watch.url });
    prisma.snapshot.findFirst.mockResolvedValue({
      ...old,
      id: "s1",
      content: old.normalizedText,
      extractionVersion: EXTRACTION_VERSION,
    });
    fetcher.fetchPage.mockResolvedValue({
      html: html.replace("October 15", "November 2"),
      finalUrl: watch.url,
      httpStatus: 200,
    });
    await service.executeCheck("r1");
    expect(prisma.change.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "DEADLINE_CHANGED",
          section: "Scholarship",
          reason: expect.stringContaining("18 days"),
        }),
      }),
    );
    expect(notifications.createForChange).toHaveBeenCalledWith(
      expect.objectContaining({ changeId: "c1" }),
      prisma,
    );
  });
  it("rebaselines legacy extraction without a false alert", async () => {
    prisma.snapshot.findFirst.mockResolvedValue({
      id: "legacy",
      extractionVersion: 1,
    });
    await service.executeCheck("r1");
    expect(prisma.change.create).not.toHaveBeenCalled();
  });
  it("propagates transient failures to the queue and records RETRYING", async () => {
    fetcher.fetchPage.mockRejectedValue(new FetchFailure("HTTP 503", true));
    await expect(service.executeCheck("r1")).rejects.toThrow("HTTP 503");
    expect(prisma.checkRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "RETRYING",
          completedAt: null,
        }),
      }),
    );
  });
  it("marks an exhausted retry failed", async () => {
    prisma.checkRun.findUniqueOrThrow.mockResolvedValue({
      watch,
      revision: 1,
      manual: true,
      attempts: 3,
    });
    fetcher.fetchPage.mockRejectedValue(new FetchFailure("HTTP 503", true));
    await expect(service.executeCheck("r1")).rejects.toThrow();
    expect(prisma.checkRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });
  it("does not execute when another worker owns the lease", async () => {
    prisma.checkRun.updateMany.mockResolvedValue({ count: 0 });
    await service.executeCheck("r1");
    expect(fetcher.fetchPage).not.toHaveBeenCalled();
  });
  it("discards results after a URL revision change", async () => {
    prisma.watch.findUnique.mockResolvedValue({ ...watch, revision: 2 });
    await service.executeCheck("r1");
    expect(prisma.snapshot.create).not.toHaveBeenCalled();
  });
  it("preserves baseline when extraction fails", async () => {
    fetcher.fetchPage.mockResolvedValue({
      html: "<html><title>Access denied</title></html>",
      finalUrl: watch.url,
      httpStatus: 200,
    });
    await expect(service.executeCheck("r1")).rejects.toThrow();
    expect(prisma.snapshot.create).not.toHaveBeenCalled();
  });
});
