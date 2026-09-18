import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLISODateTime } from '@nestjs/graphql';
@ObjectType()
export class UserModel { @Field(() => ID) id!: string; @Field() name!: string; @Field() email!: string; @Field(() => GraphQLISODateTime) createdAt!: Date; }
