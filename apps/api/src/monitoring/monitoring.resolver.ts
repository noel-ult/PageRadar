import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { NotFoundException, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { MonitoringService } from './monitoring.service';
import { CheckRunModel } from './models/check-run.model';

@Resolver(() => CheckRunModel)
@UseGuards(GqlAuthGuard)
export class MonitoringResolver {
  constructor(private readonly monitoring: MonitoringService) {}

  @Mutation(() => CheckRunModel)
  async checkWatchNow(@Args('id', { type: () => ID }, ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    const result = await this.monitoring.checkNow(id, user.sub);
    if (!result) throw new NotFoundException('Watch not found');
    return result;
  }
}
