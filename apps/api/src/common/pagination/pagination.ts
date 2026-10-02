import { ArgsType, Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { Type, BadRequestException } from "@nestjs/common";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

@ArgsType()
export class PageArgs {
  @Field(() => Int, { defaultValue: 25 }) @IsInt() @Min(1) @Max(100) first = 25;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  after?: string;
}
@ArgsType()
export class WatchPageArgs extends PageArgs {
  @Field(() => ID) @IsUUID() watchId!: string;
}
@ObjectType()
export class PageInfo {
  @Field() hasNextPage!: boolean;
  @Field(() => String, { nullable: true }) endCursor!: string | null;
}
export function Connection<T>(node: Type<T>) {
  @ObjectType(`${node.name}Connection`)
  class Result {
    @Field(() => [node]) nodes!: T[];
    @Field(() => PageInfo) pageInfo!: PageInfo;
  }
  return Result;
}
export function cursorWhere(args: PageArgs, field: string) {
  if (!args.after) return {};
  try {
    const { id, date } = JSON.parse(
      Buffer.from(args.after, "base64url").toString(),
    );
    if (
      typeof id !== "string" ||
      !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id) ||
      typeof date !== "string" ||
      !Number.isFinite(Date.parse(date))
    )
      throw new Error();
    return {
      OR: [
        { [field]: { lt: new Date(date) } },
        { [field]: new Date(date), id: { lt: id } },
      ],
    };
  } catch {
    throw new BadRequestException("Invalid pagination cursor");
  }
}
export function pageResult<T extends { id: string }>(
  rows: T[],
  args: PageArgs,
  date: (row: T) => Date,
) {
  const nodes = rows.slice(0, args.first);
  const last = nodes.at(-1);
  return {
    nodes,
    pageInfo: {
      hasNextPage: rows.length > args.first,
      endCursor: last
        ? Buffer.from(
            JSON.stringify({ id: last.id, date: date(last).toISOString() }),
          ).toString("base64url")
        : null,
    },
  };
}
