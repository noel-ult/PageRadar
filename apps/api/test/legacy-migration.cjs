const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const { join } = require("node:path");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");

// Upgrade populated legacy tables, including duplicate alerts and interrupted checks.
module.exports = async function verifyLegacyMigration(databaseUrl) {
  const admin = new Client({ connectionString: databaseUrl });
  await admin.connect();
  let legacy;
  try {
    await admin.query("CREATE DATABASE pageradar_legacy_test");
    const url = new URL(databaseUrl);
    url.pathname = "/pageradar_legacy_test";
    legacy = new Client({ connectionString: url.toString() });
    await legacy.connect();
    const migrate = (name) =>
      readFile(
        join(__dirname, "../prisma/migrations", name, "migration.sql"),
        "utf8",
      ).then((sql) => legacy.query(sql));
    await migrate("20260918000000_init");
    const user = randomUUID(),
      watch = randomUUID(),
      change = randomUUID();
    await legacy.query(
      "INSERT INTO \"User\" (id,name,email,\"passwordHash\",\"updatedAt\") VALUES ($1,'Legacy','legacy@example.com','preserved-hash',NOW())",
      [user],
    );
    await legacy.query(
      'INSERT INTO "Watch" (id,"userId",url,title,"checkInterval","updatedAt") VALUES ($1,$2,\'https://example.com\',\'Legacy watch\',360,NOW())',
      [watch, user],
    );
    await legacy.query(
      'INSERT INTO "Change" (id,"watchId",type,importance,"oldValue","newValue") VALUES ($1,$2,\'DEADLINE_CHANGED\',85,\'October 15\',\'November 2\')',
      [change, watch],
    );
    for (let i = 0; i < 2; i++) {
      await legacy.query(
        'INSERT INTO "Notification" (id,"userId","changeId",message,status) VALUES ($1,$2,$3,\'Legacy alert\',\'SENT\')',
        [randomUUID(), user, change],
      );
      await legacy.query(
        'INSERT INTO "CheckRun" (id,"watchId",status) VALUES ($1,$2,\'RUNNING\')',
        [randomUUID(), watch],
      );
    }
    await legacy.query(
      'INSERT INTO "UserInterest" (id,"userId",type,enabled) VALUES ($1,$2,\'DEADLINE\',true)',
      [randomUUID(), user],
    );
    await legacy.query(
      'CREATE TABLE "_prisma_migrations" (migration_name TEXT, started_at TIMESTAMPTZ)',
    );
    await legacy.query(
      "INSERT INTO \"_prisma_migrations\" VALUES ('20261002000000_reliable_beta',NOW())",
    );
    await migrate("20261002000000_reliable_beta");
    await migrate("20261002000001_beta_backfill");
    await migrate("20261002000002_runtime_security_and_preferences");
    assert.deepEqual(
      (await legacy.query('SELECT interests FROM "Watch" WHERE id=$1', [watch]))
        .rows[0].interests,
      "{DEADLINE}",
    );
    assert.equal(
      (
        await legacy.query(
          "SELECT relrowsecurity FROM pg_class WHERE relname='RuntimeHeartbeat'",
        )
      ).rows[0].relrowsecurity,
      true,
    );
    assert.equal(
      (
        await legacy.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
          user,
        ])
      ).rows[0].passwordHash,
      "preserved-hash",
    );
    assert.equal(
      (
        await legacy.query('SELECT title,revision FROM "Watch" WHERE id=$1', [
          watch,
        ])
      ).rows[0].revision,
      1,
    );
    assert.equal(
      (
        await legacy.query(
          'SELECT severity,"oldValue" FROM "Change" WHERE id=$1',
          [change],
        )
      ).rows[0].severity,
      "CRITICAL",
    );
    const alerts = (
      await legacy.query('SELECT channel,"changeId" FROM "Notification"')
    ).rows;
    assert.equal(alerts.length, 2);
    assert.ok(alerts.every((row) => row.channel === "IN_APP"));
    assert.equal(alerts.filter((row) => row.changeId === change).length, 1);
    assert.equal(
      (
        await legacy.query(
          "SELECT COUNT(*) FROM \"CheckRun\" WHERE status='FAILED'",
        )
      ).rows[0].count,
      "2",
    );
    await legacy.query('INSERT INTO "CheckRun" (id,"watchId") VALUES ($1,$2)', [
      randomUUID(),
      watch,
    ]);
    await assert.rejects(
      legacy.query('INSERT INTO "CheckRun" (id,"watchId") VALUES ($1,$2)', [
        randomUUID(),
        watch,
      ]),
      { code: "23505" },
    );
    console.log(
      "PASS: populated legacy migration preserves accounts, watches, changes and duplicate alert history; active-run uniqueness is enforced.",
    );
  } finally {
    if (legacy) await legacy.end();
    await admin.end();
  }
};
