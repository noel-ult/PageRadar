import {
  Field,
  GraphQLISODateTime,
  ObjectType,
  registerEnumType,
} from "@nestjs/graphql";
import { EmailPurpose } from "@prisma/client";
registerEnumType(EmailPurpose, { name: "EmailPurpose" });
@ObjectType()
export class EmailSettings {
  @Field() email!: string;
  @Field(() => GraphQLISODateTime, { nullable: true }) verifiedAt!: Date | null;
  @Field() enabled!: boolean;
  @Field() available!: boolean;
  @Field() suppressed!: boolean;
  @Field(() => String, { nullable: true }) suppressionReason!: string | null;
}
