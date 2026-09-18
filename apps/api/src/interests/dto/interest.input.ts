import { Field, InputType } from '@nestjs/graphql'; import { InterestType } from '@prisma/client'; import { IsBoolean, IsEnum } from 'class-validator';
@InputType() export class InterestInput { @Field(() => InterestType) @IsEnum(InterestType) type!: InterestType; @Field() @IsBoolean() enabled!: boolean; }
