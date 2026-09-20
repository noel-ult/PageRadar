import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { CreateWatchInput, UpdateWatchInput } from './dto/watch.input';
import { WatchModel } from './models/watch.model';
import { WatchesService } from './watches.service';
import { ChangeModel } from '../changes/models/change.model';
import { PrismaService } from '../prisma/prisma.service';

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
  watch(@Args('id', { type: () => ID }, ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.watchService.getOwned(id, user.sub);
  }

  @ResolveField(() => ChangeModel, { nullable: true })
  latestChange(@Parent() watch: WatchModel) {
    return this.prisma.change.findFirst({
      where: { watchId: watch.id },
      orderBy: { detectedAt: 'desc' },
    });
  }

  @Mutation(() => WatchModel)
  createWatch(@Args('input') input: CreateWatchInput, @CurrentUser() user: JwtUser) {
    return this.watchService.create(user.sub, input);
  }

  @Mutation(() => WatchModel)
  updateWatch(@Args('id', { type: () => ID }, ParseUUIDPipe) id: string, @Args('input') input: UpdateWatchInput, @CurrentUser() user: JwtUser) {
    return this.watchService.update(id, user.sub, input);
  }

  @Mutation(() => Boolean)
  deleteWatch(@Args('id', { type: () => ID }, ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.watchService.remove(id, user.sub);
  }

  @Mutation(() => WatchModel)
  toggleWatch(@Args('id', { type: () => ID }, ParseUUIDPipe) id: string, @Args('isActive') isActive: boolean, @CurrentUser() user: JwtUser) {
    return this.watchService.toggle(id, user.sub, isActive);
  }
}
