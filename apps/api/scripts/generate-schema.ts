import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from "@nestjs/graphql";
import { printSchema } from "graphql";
import { writeFileSync } from "node:fs";
import { AuthResolver } from "../src/auth/auth.resolver";
import { UsersResolver } from "../src/users/users.resolver";
import { WatchesResolver } from "../src/watches/watches.resolver";
import { ChangesResolver } from "../src/changes/changes.resolver";
import { SnapshotsResolver } from "../src/snapshots/snapshots.resolver";
import { InterestsResolver } from "../src/interests/interests.resolver";
import { NotificationsResolver } from "../src/notifications/notifications.resolver";
import { MonitoringResolver } from "../src/monitoring/monitoring.resolver";
async function main() {
  const app = await NestFactory.createApplicationContext(
    GraphQLSchemaBuilderModule,
    { logger: false },
  );
  try {
    const schema = await app
      .get(GraphQLSchemaFactory)
      .create([
        AuthResolver,
        UsersResolver,
        WatchesResolver,
        ChangesResolver,
        SnapshotsResolver,
        InterestsResolver,
        NotificationsResolver,
        MonitoringResolver,
      ]);
    writeFileSync("src/schema.gql", `${printSchema(schema)}\n`);
  } finally {
    await app.close();
  }
}
void main();
