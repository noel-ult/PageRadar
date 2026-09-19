import { Module } from '@nestjs/common';
import { MonitoringResolver } from './monitoring.resolver';
import { MonitoringService } from './monitoring.service';

@Module({ providers: [MonitoringService, MonitoringResolver] })
export class MonitoringModule {}
