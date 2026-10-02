import { QueueModule } from "../monitoring/queue/queue.module";
import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsResolver } from "./notifications.resolver";

@Module({
  imports: [QueueModule],
  providers: [NotificationsService, NotificationsResolver],
  exports: [NotificationsService],
})
export class NotificationsModule {}
