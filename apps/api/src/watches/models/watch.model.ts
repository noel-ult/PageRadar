import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLISODateTime } from '@nestjs/graphql';
import { ChangeModel } from '../../changes/models/change.model';

@ObjectType()
export class WatchModel {
  @Field(() => ID) id!: string;
  @Field() url!: string;
  @Field() title!: string;
  @Field(() => Int) checkInterval!: number;
  @Field() isActive!: boolean;
  @Field(() => GraphQLISODateTime, { nullable: true }) lastCheckedAt!: Date | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
  @Field(() => ChangeModel, { nullable: true }) latestChange?: ChangeModel | null;
}
