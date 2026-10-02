import { readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { spawn } from "node:child_process";
import dotenv from "../apps/api/node_modules/dotenv/lib/main.js";
import { startLocalServices } from "./local-services.mjs";
const settings = dotenv.parse(readFileSync(".env"));
const database = new URL(settings.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(database.hostname))
  throw new Error(
    "dev:local only starts a local database. Use your configured external services with dev and dev:api.",
  );
console.log("Starting local PostgreSQL and Redis; data is retained in .local.");
const services = await startLocalServices({
  directory: ".local/dev",
  databasePort: Number(database.port || 5432),
  redisPort: 6379,
  user: decodeURIComponent(database.username),
  password: decodeURIComponent(database.password),
  database: database.pathname.slice(1),
});
const env = {
  ...process.env,
  ...settings,
  DATABASE_URL: services.databaseUrl,
  DIRECT_URL: services.databaseUrl,
  REDIS_URL: services.redisUrl,
  RUNTIME_ROLE: "all",
  NODE_ENV: "development",
  NEXT_PUBLIC_GRAPHQL_URL: "/graphql",
  INTERNAL_API_URL: "http://127.0.0.1:3001/graphql",
};
const children = [];
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      if (process.platform !== "win32") process.kill(-child.pid, "SIGTERM");
      else child.kill("SIGTERM");
    } catch {
      /* already stopped */
    }
  }
  await Promise.all(
    children.map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null)
            return resolve();
          const timer = setTimeout(resolve, 10000);
          child.once("exit", () => {
            clearTimeout(timer);
            resolve();
          });
        }),
    ),
  );
  await services.stop();
}
async function listening(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
try {
  await new Promise((resolve, reject) => {
    const child = spawn(
      "npm",
      ["--workspace", "@pageradar/api", "run", "prisma:migrate"],
      { env, stdio: "inherit" },
    );
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error("Local migrations failed")),
    );
  });
  const commands = [["run", "dev:api"]];
  if (!(await listening(3000))) commands.push(["run", "dev"]);
  else console.log("Using the existing frontend on port 3000.");
  for (const args of commands) {
    const child = spawn("npm", args, {
      env: { ...env, PORT: args[1] === "dev" ? "3000" : "3001" },
      stdio: "inherit",
      detached: process.platform !== "win32",
    });
    children.push(child);
    child.once("exit", () => void stop());
  }
  console.log(
    "PageRadar: http://localhost:3000 — local database and Redis are running.",
  );
} catch (error) {
  await stop();
  throw error;
}
