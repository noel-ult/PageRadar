import {
  Field,
  ID,
  Int,
  Float,
  ObjectType,
  registerEnumType,
} from "@nestjs/graphql";
import { ChangeType } from "@prisma/client";
import { GraphQLISODateTime } from "@nestjs/graphql";
import { WatchModel } from "../../watches/models/watch.model";

registerEnumType(ChangeType, { name: "ChangeType" });

@ObjectType()
export class ChangeModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) watchId!: string;
  @Field(() => ChangeType) type!: ChangeType;
  @Field(() => String, { nullable: true }) oldValue!: string | null;
  @Field(() => String, { nullable: true }) newValue!: string | null;
  @Field(() => String, { nullable: true }) section!: string | null;
  @Field(() => Int) importance!: number;
  @Field(() => String, { nullable: true }) reason!: string | null;
  @Field() severity!: string;
  @Field(() => Float) confidence!: number;
  @Field() isMeaningful!: boolean;
  @Field(() => Float) changePercentage!: number;
  @Field(() => [String]) affectedSections!: string[];
  @Field(() => GraphQLISODateTime) detectedAt!: Date;
  @Field(() => WatchModel, { nullable: true }) watch?: WatchModel | null;
}
