import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WatchesModule } from './watches/watches.module';
import { SnapshotsModule } from './snapshots/snapshots.module';
import { ChangesModule } from './changes/changes.module';
import { InterestsModule } from './interests/interests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'], validationSchema: Joi.object({ DATABASE_URL: Joi.string().pattern(/^postgres(ql)?:\/\/\S+$/).required(), DIRECT_URL: Joi.string().pattern(/^postgres(ql)?:\/\/\S+$/).optional(), JWT_SECRET: Joi.string().min(32).required(), JWT_EXPIRES_IN: Joi.string().default('7d'), PORT: Joi.number().port().default(3001) }) }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({ driver: ApolloDriver, inject: [ConfigService], useFactory: (config: ConfigService) => ({ autoSchemaFile: config.get('NODE_ENV') === 'production' ? true : join(process.cwd(), 'src/schema.gql'), sortSchema: true, path: '/graphql', playground: config.get('NODE_ENV') !== 'production', introspection: true }) }),
    PrismaModule, AuthModule, UsersModule, WatchesModule, SnapshotsModule, ChangesModule, InterestsModule, NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
