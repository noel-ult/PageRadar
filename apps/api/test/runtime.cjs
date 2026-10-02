const assert = require("node:assert/strict");
const { mkdtemp } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { randomUUID } = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/src/app.module");
const { PrismaService } = require("../dist/src/prisma/prisma.service");
async function main() {
  const { startLocalServices } =
    await import("../../../scripts/local-services.mjs");
  const directory = await mkdtemp(join(tmpdir(), "pageradar-runtime-"));
  const services = await startLocalServices({
    directory,
    databasePort: 55433,
    redisPort: 56380,
    password: randomUUID(),
  });
  const children = [];
  let app;
  try {
    Object.assign(process.env, {
      DATABASE_URL: services.databaseUrl,
      DIRECT_URL: services.databaseUrl,
      REDIS_URL: services.redisUrl,
      JWT_SECRET: randomUUID() + randomUUID(),
      NODE_ENV: "test",
      RUNTIME_ROLE: "api",
    });
    const migrated = spawnSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      { cwd: join(__dirname, ".."), env: process.env, encoding: "utf8" },
    );
    assert.equal(migrated.status, 0, migrated.stderr);
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0, "127.0.0.1");
    const url = `http://127.0.0.1:${app.getHttpServer().address().port}/health`;
    assert.equal(
      (await fetch(url)).status,
      503,
      "API must report missing monitoring runtimes",
    );
    for (const role of ["scheduler", "worker"]) {
      const child = spawn(process.execPath, ["dist/src/runtime.js"], {
        cwd: join(__dirname, ".."),
        env: { ...process.env, RUNTIME_ROLE: role },
        stdio: ["ignore", "ignore", "pipe"],
      });
      child.details = "";
      child.stderr.on("data", (data) => {
        child.details = (child.details + data).slice(-2000);
      });
      children.push(child);
    }
    const deadline = Date.now() + 15000;
    while (true) {
      for (const child of children)
        if (child.exitCode !== null)
          throw new Error(`Runtime exited: ${child.details}`);
      if ((await fetch(url)).status === 200) break;
      if (Date.now() > deadline)
        throw new Error("Runtime heartbeats did not become healthy");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const roles = (await app.get(PrismaService).runtimeHeartbeat.findMany())
      .map((row) => row.role)
      .sort();
    assert.deepEqual(roles, ["scheduler", "worker"]);
    console.log(
      "PASS: independent API, scheduler and worker processes start, publish heartbeats and produce healthy readiness.",
    );
  } finally {
    await Promise.all(
      children.map(
        (child) =>
          new Promise((resolve) => {
            if (child.exitCode !== null) return resolve();
            child.once("exit", resolve);
            child.kill("SIGTERM");
          }),
      ),
    );
    if (app) await app.close();
    await services.stop();
  }
}
main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
