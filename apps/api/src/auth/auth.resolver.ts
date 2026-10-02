import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { HttpException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { AuthService } from "./auth.service";
import { LoginInput, RegisterInput } from "./dto/auth.input";
import { AuthPayload } from "./models/auth.model";
import { MonitoringQueueService } from "../monitoring/queue/monitoring-queue.service";
@Resolver()
export class AuthResolver {
  constructor(
    private readonly auth: AuthService,
    private readonly queue: MonitoringQueueService,
  ) {}
  private async limit(email: string, context: { req: { ip?: string } }) {
    const identity = createHash("sha256")
      .update(email.toLowerCase())
      .digest("hex");
    const [ipAllowed, accountAllowed] = await Promise.all([
      this.queue.rateLimit(`auth-ip:${context.req.ip}`, 60, 60),
      this.queue.rateLimit(`auth-account:${identity}`, 10, 60),
    ]);
    if (!ipAllowed || !accountAllowed)
      throw new HttpException(
        "Too many authentication attempts; try again in a minute.",
        429,
      );
  }
  @Mutation(() => AuthPayload) async register(
    @Args("input") input: RegisterInput,
    @Context() context: { req: { ip?: string } },
  ) {
    await this.limit(input.email, context);
    return this.auth.register(input);
  }
  @Mutation(() => AuthPayload) async login(
    @Args("input") input: LoginInput,
    @Context() context: { req: { ip?: string } },
  ) {
    await this.limit(input.email, context);
    return this.auth.login(input);
  }
}
