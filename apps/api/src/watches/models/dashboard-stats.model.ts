import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class DashboardStatsModel {
  @Field(() => Int)
  activeWatches!: number;

  @Field(() => Int)
  totalWatches!: number;

  @Field(() => Int)
  recentChanges!: number;

  @Field(() => Int)
  importantChanges!: number;

  @Field(() => Int)
  failedChecks!: number;
}
