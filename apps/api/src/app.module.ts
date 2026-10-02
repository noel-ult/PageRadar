import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import * as Joi from "joi";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { WatchesModule } from "./watches/watches.module";
import { SnapshotsModule } from "./snapshots/snapshots.module";
import { ChangesModule } from "./changes/changes.module";
import { InterestsModule } from "./interests/interests.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { RequestLoaders } from "./common/request-loaders";
import { queryLimits } from "./common/graphql-limits";
import { QueueModule } from "./monitoring/queue/queue.module";
import { MonitoringModule } from "./monitoring/monitoring.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string()
          .pattern(/^postgres(ql)?:\/\/\S+$/)
          .required(),
        DIRECT_URL: Joi.string()
          .pattern(/^postgres(ql)?:\/\/\S+$/)
          .required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default("7d"),
        PORT: Joi.number().port().default(3001),
      }),
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [PrismaModule],
      inject: [ConfigService, PrismaService],
      useFactory: (config: ConfigService, prisma: PrismaService) => ({
        autoSchemaFile: true,
        sortSchema: true,
        path: "/graphql",
        playground: config.get("NODE_ENV") !== "production",
        introspection: config.get("NODE_ENV") !== "production",
        validationRules: [queryLimits],
        context: ({
          req,
        }: {
          req: { headers: { authorization?: string } };
        }) => {
          let userId: string | undefined;
          try {
            userId = new JwtService({
              secret: config.getOrThrow("JWT_SECRET"),
            }).verify(
              req.headers.authorization?.replace(/^Bearer /, "") ?? "",
            ).sub;
          } catch {
            /* guard rejects unauthenticated requests */
          }
          return { req, loaders: new RequestLoaders(prisma, userId) };
        },
      }),
    }),
    QueueModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    WatchesModule,
    SnapshotsModule,
    ChangesModule,
    InterestsModule,
    NotificationsModule,
    MonitoringModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
