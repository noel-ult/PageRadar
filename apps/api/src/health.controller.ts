import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async health() { try { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ok', database: 'ok' }; } catch { throw new ServiceUnavailableException({ status: 'unavailable', database: 'unavailable' }); } }
}
