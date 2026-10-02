import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
async function bootstrap() {
  if (!["scheduler", "worker"].includes(process.env.RUNTIME_ROLE ?? ""))
    throw new Error("Set RUNTIME_ROLE=scheduler or worker");
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
}
void bootstrap();
