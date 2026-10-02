import { Args, ID, Query, Resolver, ObjectType } from "@nestjs/graphql";
import { ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../auth/guards/gql-auth.guard";
import {
  CurrentUser,
  JwtUser,
} from "../common/decorators/current-user.decorator";
import { SnapshotModel } from "./models/snapshot.model";
import { PrismaService } from "../prisma/prisma.service";
import {
  WatchPageArgs,
  Connection,
  cursorWhere,
  pageResult,
} from "../common/pagination/pagination";
import { SnapshotsService } from "./snapshots.service";
@ObjectType()
class SnapshotConnection extends Connection(SnapshotModel) {}
@Resolver(() => SnapshotModel)
@UseGuards(GqlAuthGuard)
export class SnapshotsResolver {
  constructor(
    private readonly snapshotService: SnapshotsService,
    private readonly prisma: PrismaService,
  ) {}
  @Query(() => [SnapshotModel]) snapshots(
    @Args("watchId", { type: () => ID }, ParseUUIDPipe) watchId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.snapshotService.listForWatch(watchId, user.sub);
  }
  @Query(() => SnapshotConnection) async snapshotsPage(
    @Args() args: WatchPageArgs,
    @CurrentUser() user: JwtUser,
  ) {
    const { watchId } = args;
    const rows = await this.prisma.snapshot.findMany({
      where: {
        watchId,
        watch: { userId: user.sub },
        ...cursorWhere(args, "capturedAt"),
      },
      select: { id: true, contentHash: true, capturedAt: true },
      orderBy: [{ capturedAt: "desc" }, { id: "desc" }],
      take: args.first + 1,
    });
    return pageResult(rows, args, (row) => row.capturedAt);
  }
}
