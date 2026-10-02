import { Module } from "@nestjs/common";
import { MonitoringResolver } from "./monitoring.resolver";
import { MonitoringService } from "./monitoring.service";
import { UrlValidator } from "./security/url-validator";
import { ContentNormalizer } from "./normalization/content-normalizer";
import { DiffEngine } from "./diff/diff-engine";
import { SemanticAnalyzer } from "./classification/semantic-analyzer";
import { ChangeClassifier } from "./classification/change-classifier";
import { QueueModule } from "./queue/queue.module";
import { SafeFetcher } from "./fetch/safe-fetcher";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule, QueueModule],
  providers: [
    MonitoringService,
    MonitoringResolver,
    UrlValidator,
    ContentNormalizer,
    DiffEngine,
    SemanticAnalyzer,
    ChangeClassifier,
    SafeFetcher,
  ],
  exports: [MonitoringService, SafeFetcher, ContentNormalizer, UrlValidator],
})
export class MonitoringModule {}
