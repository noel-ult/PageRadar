import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql'; import { InterestType } from '@prisma/client';
registerEnumType(InterestType, { name: 'InterestType' });
@ObjectType() export class UserInterestModel { @Field(() => ID) id!: string; @Field(() => InterestType) type!: InterestType; @Field() enabled!: boolean; }
