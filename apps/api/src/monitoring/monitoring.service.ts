import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CheckRunStatus, ChangeType } from '@prisma/client';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { PrismaService } from '../prisma/prisma.service';

const MAX_CONTENT_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 15_000;
const TICK_MS = 30_000;

@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly processing = new Set<string>();
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.checkDueWatches();
    this.timer = setInterval(() => void this.checkDueWatches(), TICK_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async checkNow(watchId: string, userId: string) {
    const watch = await this.prisma.watch.findFirst({ where: { id: watchId, userId } });
    if (!watch) return null;
    return this.checkWatch(watch);
  }

  private async checkDueWatches() {
    const watches = await this.prisma.watch.findMany({ where: { isActive: true } });
    const now = Date.now();
    await Promise.all(
      watches
        .filter((watch) => !watch.lastCheckedAt || now - watch.lastCheckedAt.getTime() >= watch.checkInterval * 60_000)
        .map((watch) => this.checkWatch(watch)),
    );
  }

  private async checkWatch(watch: { id: string; url: string }) {
    if (this.processing.has(watch.id)) return null;
    this.processing.add(watch.id);
    const checkRun = await this.prisma.checkRun.create({ data: { watchId: watch.id, status: CheckRunStatus.RUNNING } });

    try {
      const content = await this.fetchPage(watch.url);
      const contentHash = createHash('sha256').update(content).digest('hex');
      const previous = await this.prisma.snapshot.findFirst({ where: { watchId: watch.id }, orderBy: { capturedAt: 'desc' } });
      const checkedAt = new Date();

      if (!previous) {
        await this.prisma.$transaction([
          this.prisma.snapshot.create({ data: { watchId: watch.id, content, contentHash } }),
          this.prisma.watch.update({ where: { id: watch.id }, data: { lastCheckedAt: checkedAt } }),
          this.prisma.checkRun.update({ where: { id: checkRun.id }, data: { status: CheckRunStatus.SUCCESS, completedAt: checkedAt } }),
        ]);
      } else if (previous.contentHash === contentHash) {
        await this.prisma.$transaction([
          this.prisma.watch.update({ where: { id: watch.id }, data: { lastCheckedAt: checkedAt } }),
          this.prisma.checkRun.update({ where: { id: checkRun.id }, data: { status: CheckRunStatus.NO_CHANGE, completedAt: checkedAt } }),
        ]);
      } else {
        const currentExcerpt = this.excerpt(content);
        const previousExcerpt = this.excerpt(previous.content);
        await this.prisma.$transaction(async (tx) => {
          const snapshot = await tx.snapshot.create({ data: { watchId: watch.id, content, contentHash } });
          await tx.change.create({ data: { watchId: watch.id, oldSnapshotId: previous.id, newSnapshotId: snapshot.id, type: ChangeType.CONTENT_CHANGED, oldValue: previousExcerpt, newValue: currentExcerpt, section: 'Page content', importance: 50, reason: 'The monitored page content changed.' } });
          await tx.watch.update({ where: { id: watch.id }, data: { lastCheckedAt: checkedAt } });
          await tx.checkRun.update({ where: { id: checkRun.id }, data: { status: CheckRunStatus.CHANGE_DETECTED, completedAt: checkedAt } });
        });
      }

      return this.prisma.checkRun.findUnique({ where: { id: checkRun.id } });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1_000) : 'Unknown monitoring error';
      this.logger.warn(`Watch ${watch.id} failed: ${message}`);
      const completedAt = new Date();
      await this.prisma.$transaction([
        this.prisma.watch.update({ where: { id: watch.id }, data: { lastCheckedAt: completedAt } }),
        this.prisma.checkRun.update({ where: { id: checkRun.id }, data: { status: CheckRunStatus.FAILED, error: message, completedAt } }),
      ]);
      return this.prisma.checkRun.findUnique({ where: { id: checkRun.id } });
    } finally {
      this.processing.delete(watch.id);
    }
  }

  private async fetchPage(rawUrl: string) {
    const url = new URL(rawUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Unsupported watch URL');
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => this.isPrivateAddress(address))) throw new Error('Watch URL resolves to a private network address');

    const response = await fetch(url, { redirect: 'manual', headers: { Accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`Page returned HTTP ${response.status}`);
    if (!response.headers.get('content-type')?.toLowerCase().includes('text/html')) throw new Error('Watch URL did not return HTML');
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (declaredSize > MAX_CONTENT_BYTES) throw new Error('Page exceeds the 1.5 MB monitoring limit');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_CONTENT_BYTES) throw new Error('Page exceeds the 1.5 MB monitoring limit');
    return new TextDecoder().decode(bytes).replace(/<!--[^]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/\s+/g, ' ').trim();
  }

  private excerpt(content: string) {
    return content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1_000);
  }

  private isPrivateAddress(address: string) {
    const ipv4 = address.startsWith('::ffff:') ? address.slice(7) : address;
    if (isIP(ipv4) === 4) {
      const [a, b] = ipv4.split('.').map(Number);
      return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19));
    }
    const normalized = address.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
  }
}
