import { Field, ID, ObjectType, registerEnumType } from "@nestjs/graphql";
import {
  EmailPurpose,
  NotificationChannel,
  NotificationStatus,
} from "@prisma/client";
import { GraphQLISODateTime } from "@nestjs/graphql";
registerEnumType(NotificationChannel, { name: "NotificationChannel" });
registerEnumType(NotificationStatus, { name: "NotificationStatus" });
@ObjectType()
export class NotificationModel {
  @Field(() => ID) id!: string;
  @Field(() => ID, { nullable: true }) changeId!: string | null;
  @Field(() => NotificationChannel) channel!: NotificationChannel;
  @Field(() => NotificationStatus) status!: NotificationStatus;
  @Field(() => GraphQLISODateTime, { nullable: true }) readAt!: Date | null;
  @Field() message!: string;
  @Field(() => GraphQLISODateTime, { nullable: true }) sentAt!: Date | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => EmailPurpose) purpose!: EmailPurpose;
  @Field(() => GraphQLISODateTime, { nullable: true })
  deliveredAt!: Date | null;
}
