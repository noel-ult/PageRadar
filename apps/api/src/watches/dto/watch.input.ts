import { Field, InputType, Int, PartialType } from "@nestjs/graphql";
import { InterestType } from "@prisma/client";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from "class-validator";
@InputType()
export class CreateWatchInput {
  @Field()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @MaxLength(2048)
  url!: string;
  @Field() @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @Field(() => Int) @IsInt() @Min(1) @Max(43200) checkInterval!: number;
  @Field(() => [InterestType], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(8)
  @IsEnum(InterestType, { each: true })
  interests?: InterestType[];
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minimumImportance?: number;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() emailEnabled?: boolean;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  includeSelector?: string | null;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  excludeSelector?: string | null;
}
@InputType()
export class UpdateWatchInput extends PartialType(CreateWatchInput) {}
