import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserModel } from './models/user.model';
import { UsersService } from './users.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
@Resolver(() => UserModel)
export class UsersResolver { constructor(private readonly users: UsersService) {} @Query(() => UserModel) @UseGuards(GqlAuthGuard) async me(@CurrentUser() user: JwtUser) { return this.users.findById(user.sub); } }
