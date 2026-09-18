import { Field, ID, ObjectType } from '@nestjs/graphql'; import { GraphQLISODateTime } from '@nestjs/graphql';
@ObjectType() export class SnapshotModel { @Field(() => ID) id!: string; @Field() contentHash!: string; @Field(() => GraphQLISODateTime) capturedAt!: Date; }
