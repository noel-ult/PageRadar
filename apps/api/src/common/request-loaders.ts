import { Prisma, Watch, Change } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

class BatchLoader<T> {
  private pending = new Map<
    string,
    { resolve: (value: T | null) => void; reject: (error: unknown) => void }[]
  >();
  private cache = new Map<string, Promise<T | null>>();
  constructor(
    private readonly fetch: (keys: string[]) => Promise<Map<string, T>>,
  ) {}
  load(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    if (cached) return cached;
    const promise = new Promise<T | null>((resolve, reject) => {
      const start = !this.pending.size;
      this.pending.set(key, [
        ...(this.pending.get(key) ?? []),
        { resolve, reject },
      ]);
      if (start) queueMicrotask(() => void this.flush());
    });
    this.cache.set(key, promise);
    return promise;
  }
  private async flush() {
    const pending = this.pending;
    this.pending = new Map();
    try {
      const result = await this.fetch([...pending.keys()]);
      for (const [key, callbacks] of pending)
        for (const callback of callbacks)
          callback.resolve(result.get(key) ?? null);
    } catch (error) {
      for (const callbacks of pending.values())
        for (const callback of callbacks) callback.reject(error);
    }
  }
}
export class RequestLoaders {
  readonly changesForRun: BatchLoader<Change[]>;
  readonly watch: BatchLoader<Watch>;
  readonly latestChange: BatchLoader<Change>;
  constructor(prisma: PrismaService, userId?: string) {
    this.changesForRun = new BatchLoader(async (ids) => {
      const rows = await prisma.change.findMany({
        where: {
          checkRunId: { in: ids },
          watch: { userId: userId ?? "00000000-0000-0000-0000-000000000000" },
        },
        orderBy: { detectedAt: "desc" },
      });
      const groups = new Map<string, Change[]>();
      for (const row of rows)
        groups.set(row.checkRunId!, [
          ...(groups.get(row.checkRunId!) ?? []),
          row,
        ]);
      return groups;
    });
    this.watch = new BatchLoader(
      async (ids) =>
        new Map(
          (
            await prisma.watch.findMany({
              where: {
                id: { in: ids },
                userId: userId ?? "00000000-0000-0000-0000-000000000000",
              },
            })
          ).map((w) => [w.id, w]),
        ),
    );
    this.latestChange = new BatchLoader(async (ids) => {
      const rows = await prisma.$queryRaw<
        Change[]
      >`SELECT DISTINCT ON (c."watchId") c.* FROM "Change" c JOIN "Watch" w ON w."id" = c."watchId" WHERE c."watchId" IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))}) AND w."userId" = ${userId ?? "00000000-0000-0000-0000-000000000000"}::uuid ORDER BY c."watchId", c."detectedAt" DESC, c."id" DESC`;
      return new Map(rows.map((c) => [c.watchId, c]));
    });
  }
}
