import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CheckRunStatus } from "@prisma/client";
import * as cheerio from "cheerio";
import { PrismaService } from "../prisma/prisma.service";
import { UrlValidator } from "../monitoring/security/url-validator";
import { CreateWatchInput, UpdateWatchInput } from "./dto/watch.input";

@Injectable()
export class WatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: UrlValidator,
  ) {}
  list(userId: string) {
    return this.prisma.watch.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });
  }
  async getOwned(id: string, userId: string) {
    const watch = await this.prisma.watch.findUnique({ where: { id } });
    if (!watch) throw new NotFoundException("Watch not found");
    if (watch.userId !== userId)
      throw new ForbiddenException("You do not have access to this watch");
    return watch;
  }
  private validate(input: UpdateWatchInput) {
    if (
      input.title !== undefined &&
      (input.title === null || !input.title.trim())
    )
      throw new BadRequestException("Watch name cannot be blank");
    for (const key of [
      "url",
      "checkInterval",
      "interests",
      "minimumImportance",
      "emailEnabled",
    ] as const)
      if (input[key] === null)
        throw new BadRequestException(`${key} cannot be null`);
    for (const selector of [input.includeSelector, input.excludeSelector])
      if (selector) {
        try {
          cheerio.load("<main></main>")(selector);
        } catch {
          throw new BadRequestException("Invalid content selector");
        }
      }
  }
  async create(userId: string, input: CreateWatchInput) {
    this.validate(input);
    await this.validator.validateAndResolve(input.url);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      if (
        (await tx.watch.count({ where: { userId } })) >=
        Number(process.env.MAX_WATCHES_PER_USER ?? 100)
      )
        throw new BadRequestException("Watch limit reached");
      const defaults = await tx.userInterest.findMany({
        where: { userId, enabled: true },
      });
      return tx.watch.create({
        data: {
          ...input,
          userId,
          title: input.title.trim(),
          interests: input.interests ?? defaults.map((i) => i.type),
          includeSelector: input.includeSelector || null,
          excludeSelector: input.excludeSelector || null,
        },
      });
    });
  }
  async update(id: string, userId: string, input: UpdateWatchInput) {
    await this.getOwned(id, userId);
    this.validate(input);
    if (input.url) await this.validator.validateAndResolve(input.url);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Watch" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const current = await tx.watch.findFirstOrThrow({
        where: { id, userId },
      });
      const reset =
        (input.url !== undefined && input.url !== current.url) ||
        (input.includeSelector !== undefined &&
          (input.includeSelector || null) !== current.includeSelector) ||
        (input.excludeSelector !== undefined &&
          (input.excludeSelector || null) !== current.excludeSelector);
      if (reset)
        await tx.checkRun.updateMany({
          where: {
            watchId: id,
            status: { in: ["QUEUED", "RUNNING", "RETRYING"] },
          },
          data: {
            status: CheckRunStatus.CANCELLED,
            completedAt: new Date(),
            error: "Watch content settings changed",
            leaseOwner: null,
            leaseUntil: null,
          },
        });
      return tx.watch.update({
        where: { id },
        data: {
          ...input,
          title: input.title?.trim(),
          includeSelector:
            input.includeSelector === undefined
              ? undefined
              : input.includeSelector || null,
          excludeSelector:
            input.excludeSelector === undefined
              ? undefined
              : input.excludeSelector || null,
          ...(reset ? { revision: { increment: 1 }, lastCheckedAt: null } : {}),
          nextCheckAt: new Date(),
        },
      });
    });
  }
  async toggle(id: string, userId: string, isActive: boolean) {
    await this.getOwned(id, userId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Watch" WHERE "id" = ${id}::uuid FOR UPDATE`;
      if (!isActive)
        await tx.checkRun.updateMany({
          where: {
            watchId: id,
            manual: false,
            status: { in: ["QUEUED", "RUNNING", "RETRYING"] },
          },
          data: {
            status: CheckRunStatus.CANCELLED,
            completedAt: new Date(),
            error: "Monitoring paused",
            leaseOwner: null,
            leaseUntil: null,
          },
        });
      return tx.watch.update({
        where: { id },
        data: { isActive, ...(isActive ? { nextCheckAt: new Date() } : {}) },
      });
    });
  }
  async remove(id: string, userId: string) {
    await this.getOwned(id, userId);
    await this.prisma.watch.delete({ where: { id } });
    return true;
  }
}
