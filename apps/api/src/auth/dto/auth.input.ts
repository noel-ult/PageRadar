import { Field, InputType } from '@nestjs/graphql'; import { IsEmail, IsNotEmpty, IsString, Length, MaxLength, MinLength } from 'class-validator';
@InputType() export class RegisterInput { @Field() @IsString() @IsNotEmpty() @MaxLength(100) name!: string; @Field() @IsEmail() email!: string; @Field() @IsString() @MinLength(8) @MaxLength(72) password!: string; }
@InputType() export class LoginInput { @Field() @IsEmail() email!: string; @Field() @IsString() @Length(8, 72) password!: string; }
