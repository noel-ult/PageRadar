import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'; import { PrismaService } from '../prisma/prisma.service'; import { CreateWatchInput, UpdateWatchInput } from './dto/watch.input';
@Injectable() export class WatchesService {
  constructor(private readonly prisma: PrismaService) {}
  list(userId: string) { return this.prisma.watch.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }); }
  async getOwned(id: string, userId: string) { const watch = await this.prisma.watch.findUnique({ where: { id } }); if (!watch) throw new NotFoundException('Watch not found'); if (watch.userId !== userId) throw new ForbiddenException('You do not have access to this watch'); return watch; }
  create(userId: string, input: CreateWatchInput) { return this.prisma.watch.create({ data: { userId, url: input.url, title: input.title.trim(), checkInterval: input.checkInterval } }); }
  async update(id: string, userId: string, input: UpdateWatchInput) { await this.getOwned(id, userId); return this.prisma.watch.update({ where: { id }, data: { ...input, title: input.title?.trim() } }); }
  async toggle(id: string, userId: string, isActive: boolean) { await this.getOwned(id, userId); return this.prisma.watch.update({ where: { id }, data: { isActive } }); }
  async remove(id: string, userId: string) { await this.getOwned(id, userId); await this.prisma.watch.delete({ where: { id } }); return true; }
}
