import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { MonitoringQueueService } from "./monitoring/queue/monitoring-queue.service";
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: MonitoringQueueService,
  ) {}
  @Get() async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const queue = await this.queue.health();
      const heartbeats = await this.prisma.runtimeHeartbeat.findMany({
        where: { seenAt: { gte: new Date(Date.now() - 30_000) } },
        select: { role: true, seenAt: true },
      });
      const roles = new Set(heartbeats.map((h) => h.role));
      if (!roles.has("worker") || !roles.has("scheduler"))
        throw new Error("Monitoring runtime is unavailable");
      return { status: "ok", database: "ok", queue, heartbeats };
    } catch {
      throw new ServiceUnavailableException({
        status: "unavailable",
        message: "Database, queue, or monitoring runtime is unavailable.",
      });
    }
  }
}
