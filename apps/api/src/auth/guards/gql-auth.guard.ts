import { ExecutionContext, Injectable, HttpException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { GqlExecutionContext } from "@nestjs/graphql";
import { MonitoringQueueService } from "../../monitoring/queue/monitoring-queue.service";
@Injectable()
export class GqlAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly queue: MonitoringQueueService) {
    super();
  }
  getRequest(context: ExecutionContext) {
    return GqlExecutionContext.create(context).getContext().req;
  }
  async canActivate(context: ExecutionContext) {
    const authenticated = await super.canActivate(context);
    const request = this.getRequest(context);
    request.pageradarRateCheck ??= this.queue.rateLimit(
      `api-user:${request.user.sub}`,
      120,
      60,
    );
    if (!(await request.pageradarRateCheck))
      throw new HttpException("Too many requests. Try again in a minute.", 429);
    return authenticated as boolean;
  }
}
