import {
  Args,
  ArgsType,
  Field,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
  ObjectType,
  Context,
} from "@nestjs/graphql";
import { Type } from "class-transformer";
import { IsOptional, ValidateNested } from "class-validator";
import { ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../auth/guards/gql-auth.guard";
import {
  CurrentUser,
  JwtUser,
} from "../common/decorators/current-user.decorator";
import { ChangeFilterInput } from "./dto/change-filter.input";
import { ChangeModel } from "./models/change.model";
import { ChangesService } from "./changes.service";
import { WatchModel } from "../watches/models/watch.model";
import {
  PageArgs,
  Connection,
  cursorWhere,
  pageResult,
} from "../common/pagination/pagination";
import { RequestLoaders } from "../common/request-loaders";
import { PrismaService } from "../prisma/prisma.service";

@ObjectType()
class ChangeConnection extends Connection(ChangeModel) {}
@ArgsType()
class ChangePageArgs extends PageArgs {
  @Field(() => ChangeFilterInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChangeFilterInput)
  filter?: ChangeFilterInput;
}
@Resolver(() => ChangeModel)
@UseGuards(GqlAuthGuard)
export class ChangesResolver {
  constructor(
    private readonly changesService: ChangesService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => [ChangeModel])
  changes(
    @CurrentUser() user: JwtUser,
    @Args("filter", { nullable: true }) filter?: ChangeFilterInput,
  ) {
    return this.changesService.list(user.sub, filter);
  }

  @Query(() => ChangeConnection)
  async changesPage(
    @Args() args: ChangePageArgs,
    @CurrentUser() user: JwtUser,
  ) {
    const { filter } = args;
    const rows = await this.prisma.change.findMany({
      where: {
        AND: [
          this.changesService.where(user.sub, filter),
          cursorWhere(args, "detectedAt"),
        ],
      },
      orderBy: [{ detectedAt: "desc" }, { id: "desc" }],
      take: args.first + 1,
    });
    return pageResult(rows, args, (row) => row.detectedAt);
  }
  @Query(() => ChangeModel, { nullable: true })
  change(
    @Args("id", { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.changesService.get(id, user.sub);
  }

  @ResolveField(() => WatchModel, { nullable: true })
  watch(
    @Parent() change: ChangeModel,
    @Context() context: { loaders: RequestLoaders },
  ) {
    return context.loaders.watch.load(change.watchId);
  }
}
