import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ObjectType,
  Context,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { CheckRunStatus } from "@prisma/client";
import { GqlAuthGuard } from "../auth/guards/gql-auth.guard";
import {
  CurrentUser,
  JwtUser,
} from "../common/decorators/current-user.decorator";
import { CreateWatchInput, UpdateWatchInput } from "./dto/watch.input";
import { WatchModel } from "./models/watch.model";
import { DashboardStatsModel } from "./models/dashboard-stats.model";
import { WatchesService } from "./watches.service";
import { ChangeModel } from "../changes/models/change.model";
import {
  PageArgs,
  Connection,
  cursorWhere,
  pageResult,
} from "../common/pagination/pagination";
import { RequestLoaders } from "../common/request-loaders";
import { PrismaService } from "../prisma/prisma.service";

@ObjectType()
class WatchConnection extends Connection(WatchModel) {}
@Resolver(() => WatchModel)
@UseGuards(GqlAuthGuard)
export class WatchesResolver {
  constructor(
    private readonly watchService: WatchesService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => [WatchModel])
  watches(@CurrentUser() user: JwtUser) {
    return this.watchService.list(user.sub);
  }

  @Query(() => WatchModel, { nullable: true })
  watch(
    @Args("id", { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.watchService.getOwned(id, user.sub);
  }

  @Query(() => WatchConnection)
  async watchesPage(@Args() args: PageArgs, @CurrentUser() user: JwtUser) {
    const rows = await this.prisma.watch.findMany({
      where: { userId: user.sub, ...cursorWhere(args, "createdAt") },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: args.first + 1,
    });
    return pageResult(rows, args, (row) => row.createdAt);
  }
  @Query(() => DashboardStatsModel)
  async dashboardStats(
    @CurrentUser() user: JwtUser,
  ): Promise<DashboardStatsModel> {
    const totalWatches = await this.prisma.watch.count({
      where: { userId: user.sub },
    });
    const activeWatches = await this.prisma.watch.count({
      where: { userId: user.sub, isActive: true },
    });
    const recentChanges = await this.prisma.change.count({
      where: {
        watch: { userId: user.sub },
        detectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    const importantChanges = await this.prisma.change.count({
      where: {
        watch: { userId: user.sub },
        importance: { gte: 75 },
      },
    });
    const failedChecks = await this.prisma.checkRun.count({
      where: {
        watch: { userId: user.sub },
        status: CheckRunStatus.FAILED,
      },
    });

    return {
      activeWatches,
      totalWatches,
      recentChanges,
      importantChanges,
      failedChecks,
    };
  }

  @ResolveField(() => ChangeModel, { nullable: true })
  latestChange(
    @Parent() watch: WatchModel,
    @Context() context: { loaders: RequestLoaders },
  ) {
    return context.loaders.latestChange.load(watch.id);
  }

  @Mutation(() => WatchModel)
  createWatch(
    @Args("input") input: CreateWatchInput,
    @CurrentUser() user: JwtUser,
  ) {
    return this.watchService.create(user.sub, input);
  }

  @Mutation(() => WatchModel)
  updateWatch(
    @Args("id", { type: () => ID }, ParseUUIDPipe) id: string,
    @Args("input") input: UpdateWatchInput,
    @CurrentUser() user: JwtUser,
  ) {
    return this.watchService.update(id, user.sub, input);
  }

  @Mutation(() => Boolean)
  deleteWatch(
    @Args("id", { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.watchService.remove(id, user.sub);
  }

  @Mutation(() => WatchModel)
  toggleWatch(
    @Args("id", { type: () => ID }, ParseUUIDPipe) id: string,
    @Args("isActive") isActive: boolean,
    @CurrentUser() user: JwtUser,
  ) {
    return this.watchService.toggle(id, user.sub, isActive);
  }
}
