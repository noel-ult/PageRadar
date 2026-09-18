import { Field, InputType, Int, PartialType } from '@nestjs/graphql'; import { IsInt, IsNotEmpty, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';
@InputType() export class CreateWatchInput { @Field() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) url!: string; @Field() @IsString() @IsNotEmpty() @MaxLength(200) title!: string; @Field(() => Int) @IsInt() @Min(1) @Max(43_200) checkInterval!: number; }
@InputType() export class UpdateWatchInput extends PartialType(CreateWatchInput) {}
