import { MonitoringModule } from "../monitoring/monitoring.module";
import { Module } from "@nestjs/common";
import { WatchesResolver } from "./watches.resolver";
import { WatchesService } from "./watches.service";
@Module({
  imports: [MonitoringModule],
  providers: [WatchesResolver, WatchesService],
  exports: [WatchesService],
})
export class WatchesModule {}
