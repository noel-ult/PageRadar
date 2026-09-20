import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { ChangeFilterInput } from './dto/change-filter.input';
import { ChangeModel } from './models/change.model';
import { ChangesService } from './changes.service';
import { WatchModel } from '../watches/models/watch.model';
import { PrismaService } from '../prisma/prisma.service';

@Resolver(() => ChangeModel)
@UseGuards(GqlAuthGuard)
export class ChangesResolver {
  constructor(
    private readonly changesService: ChangesService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => [ChangeModel])
  changes(@CurrentUser() user: JwtUser, @Args('filter', { nullable: true }) filter?: ChangeFilterInput) {
    return this.changesService.list(user.sub, filter);
  }

  @Query(() => ChangeModel, { nullable: true })
  change(@Args('id', { type: () => ID }, ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.changesService.get(id, user.sub);
  }

  @ResolveField(() => WatchModel, { nullable: true })
  watch(@Parent() change: ChangeModel) {
    return this.prisma.watch.findUnique({ where: { id: change.watchId } });
  }
}
