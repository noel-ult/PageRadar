import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
export interface JwtUser { sub: string; email: string; }
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): JwtUser => GqlExecutionContext.create(context).getContext().req.user as JwtUser);
