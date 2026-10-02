import { Field, ID, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { ChangeModel } from "../../changes/models/change.model";
import { CheckRunStatus } from "@prisma/client";
import { GraphQLISODateTime } from "@nestjs/graphql";

registerEnumType(CheckRunStatus, { name: "CheckRunStatus" });

@ObjectType()
export class CheckRunModel {
  @Field(() => ID) id!: string;
  @Field(() => [ChangeModel]) changes?: ChangeModel[];
  @Field(() => Int) attempts!: number;
  @Field(() => GraphQLISODateTime) nextAttemptAt!: Date;
  @Field(() => ID) watchId!: string;
  @Field(() => CheckRunStatus) status!: CheckRunStatus;
  @Field(() => GraphQLISODateTime) startedAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true })
  completedAt!: Date | null;
  @Field(() => String, { nullable: true }) error!: string | null;
}
