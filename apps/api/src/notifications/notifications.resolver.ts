import {
  Args,
  ID,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "@nestjs/graphql";
import { ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../auth/guards/gql-auth.guard";
import {
  CurrentUser,
  JwtUser,
} from "../common/decorators/current-user.decorator";
import { NotificationModel } from "./models/notification.model";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  Connection,
  PageArgs,
  cursorWhere,
  pageResult,
} from "../common/pagination/pagination";
@ObjectType()
class NotificationConnection extends Connection(NotificationModel) {}
@Resolver(() => NotificationModel)
@UseGuards(GqlAuthGuard)
export class NotificationsResolver {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}
  @Query(() => [NotificationModel]) notifications(
    @CurrentUser() user: JwtUser,
  ) {
    return this.notificationsService.list(user.sub);
  }
  @Query(() => Int) unreadNotificationCount(@CurrentUser() user: JwtUser) {
    return this.notificationsService.unreadCount(user.sub);
  }
  @Mutation(() => Boolean) markNotificationRead(
    @Args("id", { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notificationsService.markRead(user.sub, id);
  }
  @Mutation(() => Boolean) markAllNotificationsRead(
    @CurrentUser() user: JwtUser,
  ) {
    return this.notificationsService.markRead(user.sub);
  }
  @Query(() => NotificationConnection)
  async notificationsPage(
    @Args() args: PageArgs,
    @CurrentUser() user: JwtUser,
  ) {
    const rows = await this.prisma.notification.findMany({
      where: {
        userId: user.sub,
        channel: "IN_APP",
        ...cursorWhere(args, "createdAt"),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: args.first + 1,
    });
    return pageResult(rows, args, (row) => row.createdAt);
  }
}
