import EmbeddedPostgres from "embedded-postgres";
import { RedisMemoryServer } from "redis-memory-server";
import { Client } from "pg";
import { mkdir, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

export async function startLocalServices({
  directory,
  databasePort = 5432,
  redisPort = 6379,
  user = "postgres",
  password = "password",
  database = "postgres",
}) {
  // npm may skip optional package postinstall scripts. Hydrate the native library links
  // with the dependency's own script before starting its PostgreSQL binary.
  if (process.platform !== "win32") {
    const require = createRequire(import.meta.url);
    const nativeDir = resolve(
      dirname(
        require.resolve(
          `@embedded-postgres/${process.platform}-${process.arch}`,
        ),
      ),
      "..",
    );
    execFileSync(process.execPath, ["scripts/hydrate-symlinks.js"], {
      cwd: nativeDir,
    });
  }
  const data = resolve(directory);
  await mkdir(data, { recursive: true });
  const postgres = new EmbeddedPostgres({
    databaseDir: `${data}/postgres`,
    user,
    password,
    port: databasePort,
    persistent: true,
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: () => {},
    onError: () => {},
  });
  let initialized = false;
  try {
    await access(`${data}/postgres/PG_VERSION`);
    initialized = true;
  } catch {
    /* new local cluster */
  }
  if (!initialized) await postgres.initialise();
  await postgres.start();
  try {
    if (database !== "postgres") {
      const client = new Client({
        host: "127.0.0.1",
        port: databasePort,
        user,
        password,
        database: "postgres",
      });
      await client.connect();
      try {
        if (
          !(
            await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
              database,
            ])
          ).rowCount
        )
          await client.query(
            `CREATE DATABASE "${database.replaceAll('"', '""')}"`,
          );
      } finally {
        await client.end();
      }
    }
    await mkdir(`${data}/redis`, { recursive: true });
    const redis = await RedisMemoryServer.create({
      instance: {
        ip: "127.0.0.1",
        port: redisPort,
        args: ["--appendonly", "yes", "--dir", `${data}/redis`],
      },
      binary: {
        version: "7.4.2",
        downloadDir: resolve(".local/redis-binaries"),
      },
    });
    const pgUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${databasePort}/${encodeURIComponent(database)}`;
    return {
      databaseUrl: pgUrl,
      redisUrl: `redis://127.0.0.1:${await redis.getPort()}`,
      stopRedis: () => redis.stop(),
      startRedis: () => redis.start(),
      stop: async () => {
        await redis.stop();
        await postgres.stop();
      },
    };
  } catch (error) {
    await postgres.stop();
    throw error;
  }
}
