import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { CheckRunStatus } from '@prisma/client';
import { GraphQLISODateTime } from '@nestjs/graphql';

registerEnumType(CheckRunStatus, { name: 'CheckRunStatus' });

@ObjectType()
export class CheckRunModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) watchId!: string;
  @Field(() => CheckRunStatus) status!: CheckRunStatus;
  @Field(() => GraphQLISODateTime) startedAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) completedAt!: Date | null;
  @Field({ nullable: true }) error!: string | null;
}
