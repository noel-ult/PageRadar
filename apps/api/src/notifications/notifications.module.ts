import { QueueModule } from "../monitoring/queue/queue.module";
import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsResolver } from "./notifications.resolver";
import { EmailService } from "./email.service";
import { EmailActionsResolver } from "./email-actions.resolver";
import { EmailController } from "./email.controller";

@Module({
  imports: [QueueModule],
  providers: [
    NotificationsService,
    NotificationsResolver,
    EmailService,
    EmailActionsResolver,
  ],
  controllers: [EmailController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
