const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { randomUUID } = require("node:crypto");
const { mkdtemp } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");
const { Test } = require("@nestjs/testing");
const { ValidationPipe } = require("@nestjs/common");
const { AppModule } = require("../dist/src/app.module");
const { PrismaService } = require("../dist/src/prisma/prisma.service");
const {
  MonitoringService,
} = require("../dist/src/monitoring/monitoring.service");
const {
  UrlValidator,
} = require("../dist/src/monitoring/security/url-validator");
const {
  NotificationsService,
} = require("../dist/src/notifications/notifications.service");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(fn, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await fn();
    if (value) return value;
    await sleep(100);
  }
  throw new Error("Timed out waiting for integration state");
}
async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server.address().port;
}
async function main() {
  const { startLocalServices } =
    await import("../../../scripts/local-services.mjs");
  const directory = await mkdtemp(join(tmpdir(), "pageradar-integration-"));
  const services = await startLocalServices({
    directory,
    databasePort: 55432,
    redisPort: 56379,
    user: "postgres",
    password: randomUUID(),
  });
  let app;
  let fixture;
  const rootFetch = global.fetch;
  try {
    await require("./legacy-migration.cjs")(services.databaseUrl);
    Object.assign(process.env, {
      DATABASE_URL: services.databaseUrl,
      DIRECT_URL: services.databaseUrl,
      REDIS_URL: services.redisUrl,
      JWT_SECRET: randomUUID() + randomUUID(),
      NODE_ENV: "test",
      RUNTIME_ROLE: "all",
      RESEND_API_KEY: "integration-only",
      MAX_WATCHES_PER_USER: "1100",
    });
    const migrated = spawnSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      { cwd: join(__dirname, ".."), env: process.env, encoding: "utf8" },
    );
    assert.equal(migrated.status, 0, migrated.stderr || migrated.stdout);
    let deadline = "October 15, 2026";
    let failures = 0;
    fixture = createServer((req, res) => {
      if (req.url === "/redirect") {
        res.writeHead(302, { location: "http://169.254.169.254/" });
        return res.end();
      }
      if (req.url === "/flaky" && failures++ < 1) {
        res.writeHead(503);
        return res.end();
      }
      res.setHeader("content-type", "text/html");
      res.end(
        `<h1>Scholarship</h1><p>Application deadline is ${deadline}.</p><h2>Documents</h2><p><a href="/guide.pdf">Application guide</a></p>`,
      );
    });
    const fixturePort = await listen(fixture);
    const realValidator = new UrlValidator();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(UrlValidator)
      .useValue({
        validateAndResolve: async (raw) => {
          const url = new URL(raw);
          if (
            url.hostname !== "fixture.pageradar.test" &&
            !url.hostname.endsWith(".fixture.pageradar.test")
          )
            return realValidator.validateAndResolve(raw);
          return { url, resolvedIps: ["127.0.0.1"] };
        },
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
    const port = app.getHttpServer().address().port;
    let token = "";
    async function gql(query, variables = {}, bearer = token) {
      const response = await rootFetch(`http://127.0.0.1:${port}/graphql`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
      });
      return response.json();
    }
    const email = `integration-${randomUUID()}@example.com`;
    const registration = await gql(
      'mutation($email:String!){register(input:{name:"Integration",email:$email,password:"test-password-123"}){accessToken user{id}}}',
      { email },
    );
    assert.ok(!registration.errors, JSON.stringify(registration.errors));
    token = registration.data.register.accessToken;
    const userId = registration.data.register.user.id;
    const login = await gql(
      'mutation($email:String!){login(input:{email:$email,password:"test-password-123"}){accessToken}}',
      { email },
      "",
    );
    assert.ok(login.data.login.accessToken);
    const url = `http://fixture.pageradar.test:${fixturePort}/page`;
    const created = await gql(
      'mutation($url:String!){createWatch(input:{url:$url,title:"Scholarship",checkInterval:360,interests:[DEADLINE],minimumImportance:65,emailEnabled:true}){id interests nextCheckAt}}',
      { url },
    );
    assert.ok(!created.errors, JSON.stringify(created.errors));
    const watchId = created.data.createWatch.id;
    const prisma = app.get(PrismaService);
    const monitoring = app.get(MonitoringService);
    let delivered = 0;
    global.fetch = async (url, options) => {
      if (String(url) === "https://api.resend.com/emails") {
        delivered++;
        assert.ok(options.headers["Idempotency-Key"]);
        return new Response(JSON.stringify({ id: "test-provider-id" }), {
          status: 200,
        });
      }
      return rootFetch(url, options);
    };
    async function manual() {
      const result = await gql(
        "mutation($id:ID!){checkWatchNow(id:$id){id status}}",
        { id: watchId },
      );
      assert.ok(!result.errors, JSON.stringify(result.errors));
      return result.data.checkWatchNow.id;
    }
    const requests = await Promise.all([manual(), manual(), manual()]);
    assert.equal(new Set(requests).size, 1, "manual requests must coalesce");
    await monitoring.tick();
    await waitFor(
      async () =>
        (await prisma.checkRun.findUnique({ where: { id: requests[0] } }))
          ?.status === "SUCCESS",
    );
    assert.equal(await prisma.snapshot.count({ where: { watchId } }), 1);
    assert.equal(await prisma.change.count({ where: { watchId } }), 0);
    const unchanged = await manual();
    await monitoring.tick();
    await waitFor(
      async () =>
        (await prisma.checkRun.findUnique({ where: { id: unchanged } }))
          ?.status === "NO_CHANGE",
    );
    deadline = "November 2, 2026";
    const changeRun = await manual();
    await monitoring.tick();
    await waitFor(
      async () =>
        (await prisma.checkRun.findUnique({ where: { id: changeRun } }))
          ?.status === "CHANGE_DETECTED",
    );
    const changes = await prisma.change.findMany({ where: { watchId } });
    assert.equal(changes.length, 1);
    assert.equal(changes[0].type, "DEADLINE_CHANGED");
    assert.match(changes[0].reason, /18 days/);
    await app.get(NotificationsService).dispatchDue();
    await waitFor(
      async () =>
        !!(await prisma.notification.findFirst({
          where: {
            changeId: changes[0].id,
            channel: "EMAIL",
            status: "ACCEPTED",
          },
        })),
    );
    assert.equal(delivered, 1);
    const notifications = await gql(
      "{notifications{id readAt} unreadNotificationCount}",
    );
    assert.equal(notifications.data.unreadNotificationCount, 1);
    await gql("mutation {markAllNotificationsRead}");
    assert.equal(
      (await gql("{unreadNotificationCount}")).data.unreadNotificationCount,
      0,
    );
    const timeline = await gql(
      "query($id:ID!){checkRuns(watchId:$id,first:2){nodes{id status changes{id}} pageInfo{hasNextPage endCursor}}}",
      { id: watchId },
    );
    assert.ok(!timeline.errors, JSON.stringify(timeline.errors));
    assert.equal(timeline.data.checkRuns.nodes.length, 2);
    assert.equal(timeline.data.checkRuns.pageInfo.hasNextPage, true);
    const page2 = await gql(
      "query($id:ID!,$cursor:String!){checkRuns(watchId:$id,first:2,after:$cursor){nodes{id}}}",
      { id: watchId, cursor: timeline.data.checkRuns.pageInfo.endCursor },
    );
    assert.equal(page2.data.checkRuns.nodes.length, 1);
    const other = await gql(
      'mutation($email:String!){register(input:{name:"Other",email:$email,password:"test-password-123"}){accessToken}}',
      { email: `other-${email}` },
      "",
    );
    const denied = await gql(
      "query($id:ID!){watch(id:$id){id}}",
      { id: watchId },
      other.data.register.accessToken,
    );
    assert.ok(denied.errors);
    const security = await gql(
      'mutation{createWatch(input:{url:"http://169.254.169.254/",title:"Blocked",checkInterval:60}){id}}',
    );
    assert.ok(security.errors);
    const edit = await gql(
      "mutation($id:ID!,$url:String!){updateWatch(id:$id,input:{url:$url}){id}}",
      {
        id: watchId,
        url: `http://fixture.pageradar.test:${fixturePort}/flaky`,
      },
    );
    assert.ok(!edit.errors, JSON.stringify(edit.errors));
    const retryRun = await manual();
    await monitoring.tick();
    await waitFor(
      async () =>
        (await prisma.checkRun.findUnique({ where: { id: retryRun } }))
          ?.status === "SUCCESS",
    );
    assert.equal(
      (await prisma.checkRun.findUnique({ where: { id: retryRun } })).attempts,
      2,
    );
    const recovered = await prisma.checkRun.create({
      data: {
        watchId,
        revision: 2,
        status: "RUNNING",
        attempts: 1,
        leaseOwner: "dead-worker",
        leaseUntil: new Date(Date.now() - 1000),
      },
    });
    await monitoring.tick();
    await waitFor(
      async () =>
        (await prisma.checkRun.findUnique({ where: { id: recovered.id } }))
          ?.status === "NO_CHANGE",
    );
    const outageRun = await manual();
    await services.stopRedis();
    await monitoring.tick();
    assert.equal(
      (await prisma.checkRun.findUnique({ where: { id: outageRun } })).status,
      "QUEUED",
    );
    const queue = app.get(
      require("../dist/src/monitoring/queue/monitoring-queue.service")
        .MonitoringQueueService,
    );
    await assert.rejects(queue.health());
    await services.startRedis();
    await waitFor(async () => {
      try {
        await queue.health();
        return true;
      } catch {
        return false;
      }
    }, 10000);
    await monitoring.tick();
    await waitFor(
      async () =>
        (await prisma.checkRun.findUnique({ where: { id: outageRun } }))
          ?.status === "NO_CHANGE",
    );
    console.log(
      "PASS: real Redis outage preserves the database outbox and pending work resumes after reconnection.",
    );
    console.log(
      "PASS: real GraphQL auth, transactional migrations, baseline/no-change/deadline, BullMQ retries, expired-worker recovery, notifications, pagination and ownership.",
    );
    if (process.env.PAGERADAR_LOAD_TEST === "true") {
      const watches = Array.from({ length: 1000 }, (_, i) => ({
        userId,
        title: `Load ${i}`,
        url: `http://load-${i}.fixture.pageradar.test:${fixturePort}/page`,
        checkInterval: 360,
        nextCheckAt: new Date(),
      }));
      await prisma.watch.createMany({ data: watches });
      const start = Date.now();
      for (let i = 0; i < 5; i++) await monitoring.tick();
      const pending = await prisma.checkRun.count({
        where: { status: { in: ["QUEUED", "RUNNING", "RETRYING"] } },
      });
      await waitFor(
        async () =>
          (await prisma.watch.count({
            where: {
              userId,
              title: { startsWith: "Load " },
              lastCheckedAt: { not: null },
            },
          })) === 1000,
        180000,
      );
      const elapsed = Date.now() - start;
      assert.equal(
        await prisma.checkRun.count({
          where: {
            watch: { title: { startsWith: "Load " } },
            status: "FAILED",
          },
        }),
        0,
      );
      console.log(
        `LOAD: 1000 distinct-domain watches completed in ${elapsed}ms; ${pending} pending after initial scheduler batches, concurrency=5.`,
      );
    }
    if (process.env.PAGERADAR_BROWSER_TEST === "true") {
      // The browser test uses the real API; fixture validation is injected only into this test app.
      process.env.INTERNAL_API_URL = `http://127.0.0.1:${port}/graphql`;
      process.env.PAGERADAR_FIXTURE_URL = url;
      process.env.PAGERADAR_FIXTURE_UPDATE_URL = `http://127.0.0.1:${fixturePort}/update`;
      fixture.on("request", (req, res) => {
        if (req.url === "/update") deadline = "December 1, 2026";
      });
      const { spawn } = require("node:child_process");
      await new Promise((resolve, reject) => {
        const child = spawn("npm", ["run", "test:e2e:real"], {
          cwd: join(__dirname, "../../.."),
          env: process.env,
          stdio: "inherit",
        });
        child.on("exit", (code) =>
          code === 0
            ? resolve()
            : reject(new Error("Real browser flow failed")),
        );
      });
    }
  } finally {
    global.fetch = rootFetch;
    if (app) {
      const prisma = app.get(PrismaService);
      const runs = await prisma.checkRun.findMany({
        select: { status: true, attempts: true, error: true },
      });
      if (runs.some((r) => r.status === "FAILED"))
        console.log("Integration failure state:", runs);
      await app.close();
    }
    if (fixture) await new Promise((resolve) => fixture.close(resolve));
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
