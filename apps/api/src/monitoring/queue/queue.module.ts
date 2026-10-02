import { Global, Module } from "@nestjs/common";
import { MonitoringQueueService } from "./monitoring-queue.service";
@Global()
@Module({
  providers: [MonitoringQueueService],
  exports: [MonitoringQueueService],
})
export class QueueModule {}
