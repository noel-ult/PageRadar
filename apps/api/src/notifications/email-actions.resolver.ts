import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { BadRequestException, HttpException } from "@nestjs/common";
import { EmailService } from "./email.service";
import { MonitoringQueueService } from "../monitoring/queue/monitoring-queue.service";
import { hashToken } from "./email.config";

@Resolver()
export class EmailActionsResolver {
  constructor(
    private readonly email: EmailService,
    private readonly queue: MonitoringQueueService,
  ) {}
  private async limit(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new BadRequestException("This link is invalid or has expired.");
    if (
      !(await this.queue.rateLimit(
        `email-action:${await hashToken(token)}`,
        10,
        60,
      ))
    )
      throw new HttpException("Too many requests. Try again in a minute.", 429);
  }
  @Mutation(() => Boolean) async confirmEmailVerification(
    @Args("token") token: string,
  ) {
    await this.limit(token);
    return this.email.confirmVerification(token);
  }
  @Mutation(() => Boolean) async unsubscribeEmailAlerts(
    @Args("token") token: string,
  ) {
    await this.limit(token);
    return this.email.unsubscribe(token);
  }
}
