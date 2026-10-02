import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { Queue, Worker, UnrecoverableError } from "bullmq";
import IORedis from "ioredis";
import { randomUUID, createHash } from "node:crypto";
import { FetchFailure } from "../security/url-validator";

export const runtimeRole = () =>
  process.env.RUNTIME_ROLE ??
  (process.env.NODE_ENV === "production" ? "api" : "all");
export const runsRole = (role: string) =>
  runtimeRole() === "all" || runtimeRole() === role;
type Executor = (id: string) => Promise<void>;

@Injectable()
export class MonitoringQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringQueueService.name);
  private redis?: IORedis;
  private workerRedis?: IORedis;
  private queues = new Map<string, Queue>();
  private workers: Worker[] = [];
  private memoryPending = new Map<string, { name: string; id: string }>();
  private memoryActive = new Set<string>();
  private executors = new Map<string, Executor>();
  private activeCount = 0;
  private destroyed = false;
  private domainLocks = new Map<string, number>();

  async onModuleInit() {
    if (!process.env.REDIS_URL) {
      if (
        process.env.NODE_ENV === "production" ||
        process.env.QUEUE_MODE !== "memory"
      )
        throw new Error(
          "REDIS_URL is required. QUEUE_MODE=memory is allowed only in development.",
        );
      this.logger.warn("Using explicit development memory queue.");
      return;
    }
    let connected = false;
    const client = new IORedis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      commandTimeout: 5000,
      retryStrategy: (attempts) =>
        connected ? Math.min(2000, attempts * 200) : null,
      connectTimeout: 5000,
    });
    client.on("error", () => this.logger.warn("Redis connection unavailable"));
    try {
      await client.connect();
      await client.ping();
    } catch {
      client.disconnect();
      throw new Error(
        "Redis is unavailable; refusing to accept non-durable jobs.",
      );
    }
    connected = true;
    this.redis = client;
    for (const name of ["page-monitoring", "notification-delivery"]) {
      this.queues.set(
        name,
        new Queue(name, {
          connection: client,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: "pageradar" },
            removeOnComplete: { age: 86400, count: 1000 },
            removeOnFail: { age: 604800, count: 1000 },
          },
        }),
      );
    }
  }

  setExecutor(name: string, executor: Executor) {
    this.executors.set(name, executor);
    if (this.redis && runsRole("worker")) {
      // BullMQ's blocking consumers reconnect indefinitely; API and outbox commands fail promptly.
      this.workerRedis ??= this.redis.duplicate({
        maxRetriesPerRequest: null,
        enableOfflineQueue: true,
        commandTimeout: undefined,
      });
      this.workerRedis.on("error", () =>
        this.logger.warn("Worker Redis connection unavailable"),
      );
      const worker = new Worker(
        name,
        async (job) => {
          try {
            await executor(job.data.id as string);
          } catch (error) {
            if (error instanceof FetchFailure && !error.retryable)
              throw new UnrecoverableError(error.message);
            throw error;
          }
        },
        {
          connection: this.workerRedis,
          concurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
          settings: {
            backoffStrategy: (attempt, _type, error) =>
              Math.max(
                2000 * 2 ** (attempt - 1),
                error instanceof FetchFailure ? error.retryAfterMs : 0,
              ),
          },
        },
      );
      worker.on("error", () =>
        this.logger.error("Worker queue connection failed"),
      );
      worker.on("failed", (job) =>
        this.logger.warn(`Queue job ${job?.id} failed`),
      );
      this.workers.push(worker);
    }
    this.pumpMemory();
  }

  async enqueue(name: string, id: string) {
    const queue = this.queues.get(name);
    if (queue) {
      const old = await queue.getJob(id);
      if (old) {
        const state = await old.getState();
        if (!["completed", "failed"].includes(state)) return;
        await old.remove();
      }
      await queue.add(name, { id }, { jobId: id });
      return;
    }
    const key = `${name}/${id}`;
    if (!this.memoryActive.has(key)) this.memoryPending.set(key, { name, id });
    this.pumpMemory();
  }

  private pumpMemory() {
    if (this.redis || this.destroyed || !runsRole("worker")) return;
    for (const [key, job] of this.memoryPending) {
      if (this.activeCount >= 5) break;
      const executor = this.executors.get(job.name);
      if (!executor) continue;
      this.memoryPending.delete(key);
      this.memoryActive.add(key);
      this.activeCount++;
      void executor(job.id)
        .catch(() => {
          /* DB outbox schedules the next attempt */
        })
        .finally(() => {
          this.activeCount--;
          this.memoryActive.delete(key);
          this.pumpMemory();
        });
    }
  }

  async acquireDomain(
    hostname: string,
    signal: AbortSignal,
  ): Promise<() => Promise<void>> {
    const key = `pageradar:domain:${createHash("sha256").update(hostname).digest("hex")}`;
    const token = randomUUID();
    while (true) {
      signal.throwIfAborted();
      if (
        this.redis
          ? await this.redis.set(key, token, "PX", 20000, "NX")
          : (this.domainLocks.get(key) ?? 0) < Date.now()
      ) {
        if (!this.redis) this.domainLocks.set(key, Date.now() + 20000);
        return async () => {
          // Keep one second spacing after a completed request; atomic compare protects newer leases.
          if (this.redis)
            await this.redis.eval(
              "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], 1000) end return 0",
              1,
              key,
              token,
            );
          else this.domainLocks.set(key, Date.now() + 1000);
        };
      }
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          reject(signal.reason);
        };
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", abort);
          resolve();
        }, 100);
        signal.addEventListener("abort", abort, { once: true });
      });
    }
  }

  private rates = new Map<string, { count: number; expires: number }>();
  async rateLimit(key: string, limit: number, seconds: number) {
    if (this.redis) {
      const count = (await this.redis.eval(
        "local n = redis.call('incr', KEYS[1]); if n == 1 then redis.call('expire', KEYS[1], ARGV[1]) end return n",
        1,
        `pageradar:limit:${createHash("sha256").update(key).digest("hex")}`,
        seconds,
      )) as number;
      return count <= limit;
    }
    if (this.rates.size > 2000)
      for (const [key, value] of this.rates)
        if (value.expires < Date.now()) this.rates.delete(key);
    const value = this.rates.get(key);
    if (!value || value.expires < Date.now()) {
      this.rates.set(key, { count: 1, expires: Date.now() + seconds * 1000 });
      return true;
    }
    return ++value.count <= limit;
  }

  async health() {
    if (!this.redis)
      return { mode: "development-memory", pending: this.memoryPending.size };
    await this.redis.ping();
    const counts = await Promise.all(
      [...this.queues].map(async ([name, queue]) => ({
        name,
        ...(await queue.getJobCounts("waiting", "active", "failed", "delayed")),
      })),
    );
    return { mode: "redis", queues: counts };
  }

  async onModuleDestroy() {
    this.destroyed = true;
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    this.workerRedis?.disconnect();
    this.redis?.disconnect();
  }
}
