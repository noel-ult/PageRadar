import { Field, ID, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { GraphQLISODateTime } from "@nestjs/graphql";
import { InterestType } from "@prisma/client";
import { ChangeModel } from "../../changes/models/change.model";

registerEnumType(InterestType, { name: "InterestType" });
@ObjectType()
export class WatchModel {
  @Field(() => ID) id!: string;
  @Field() url!: string;
  @Field() title!: string;
  @Field(() => Int) checkInterval!: number;
  @Field(() => [InterestType]) interests!: InterestType[];
  @Field(() => Int) minimumImportance!: number;
  @Field() emailEnabled!: boolean;
  @Field(() => String, { nullable: true }) includeSelector!: string | null;
  @Field(() => String, { nullable: true }) excludeSelector!: string | null;
  @Field(() => GraphQLISODateTime) nextCheckAt!: Date;
  @Field() isActive!: boolean;
  @Field(() => GraphQLISODateTime, { nullable: true })
  lastCheckedAt!: Date | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
  @Field(() => ChangeModel, { nullable: true })
  latestChange?: ChangeModel | null;
}
