import {
  Args,
  ID,
  Mutation,
  Query,
  Resolver,
  ObjectType,
  Field,
  Parent,
  Context,
  ResolveField,
} from "@nestjs/graphql";
import {
  NotFoundException,
  BadRequestException,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import {
  CurrentUser,
  JwtUser,
} from "../common/decorators/current-user.decorator";
import { GqlAuthGuard } from "../auth/guards/gql-auth.guard";
import { MonitoringService } from "./monitoring.service";
import { CheckRunModel } from "./models/check-run.model";
import { PrismaService } from "../prisma/prisma.service";
import {
  WatchPageArgs,
  Connection,
  cursorWhere,
  pageResult,
} from "../common/pagination/pagination";
import { SafeFetcher } from "./fetch/safe-fetcher";
import { ContentNormalizer } from "./normalization/content-normalizer";
import { MonitoringQueueService } from "./queue/monitoring-queue.service";
import { ChangeModel } from "../changes/models/change.model";
import { RequestLoaders } from "../common/request-loaders";
import { CreateWatchInput } from "../watches/dto/watch.input";

@ObjectType()
class CheckRunConnection extends Connection(CheckRunModel) {}
@ObjectType()
class ContentPreview {
  @Field() text!: string;
  @Field(() => [String]) sections!: string[];
}
@Resolver(() => CheckRunModel)
@UseGuards(GqlAuthGuard)
export class MonitoringResolver {
  constructor(
    private readonly monitoring: MonitoringService,
    private readonly prisma: PrismaService,
    private readonly fetcher: SafeFetcher,
    private readonly normalizer: ContentNormalizer,
    private readonly queue: MonitoringQueueService,
  ) {}
  @ResolveField(() => [ChangeModel]) async changes(
    @Parent() run: CheckRunModel,
    @Context() context: { loaders: RequestLoaders },
  ) {
    return (await context.loaders.changesForRun.load(run.id)) ?? [];
  }
  @Mutation(() => CheckRunModel)
  async checkWatchNow(
    @Args("id", { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    const result = await this.monitoring.checkNow(id, user.sub);
    if (!result) throw new NotFoundException("Watch not found");
    return result;
  }
  @Query(() => CheckRunModel)
  async checkRun(
    @Args("id", { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    const run = await this.prisma.checkRun.findFirst({
      where: { id, watch: { userId: user.sub } },
    });
    if (!run) throw new NotFoundException("Check not found");
    return run;
  }
  @Query(() => CheckRunConnection)
  async checkRuns(@Args() args: WatchPageArgs, @CurrentUser() user: JwtUser) {
    const { watchId } = args;
    const rows = await this.prisma.checkRun.findMany({
      where: {
        watchId,
        watch: { userId: user.sub },
        ...cursorWhere(args, "startedAt"),
      },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      take: args.first + 1,
    });
    return pageResult(rows, args, (row) => row.startedAt);
  }
  @Mutation(() => ContentPreview)
  async previewWatch(
    @Args("input") input: CreateWatchInput,
    @CurrentUser() user: JwtUser,
  ) {
    if (!(await this.queue.rateLimit(`preview-user:${user.sub}`, 20, 3600)))
      throw new BadRequestException(
        "Content preview limit reached. Try again later.",
      );
    const fetched = await this.fetcher.fetchPage(input.url);
    const content = this.normalizer.normalize(fetched.html, {
      ...input,
      baseUrl: fetched.finalUrl,
    });
    return {
      text: content.normalizedText.slice(0, 10000),
      sections: content.sections.map((s) => s.title),
    };
  }
}
