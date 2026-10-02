import { cp } from "node:fs/promises";

// Match Docker's standalone layout, including browser assets.
await Promise.all([
  cp(
    new URL("../public", import.meta.url),
    new URL("../.next/standalone/public", import.meta.url),
    { recursive: true },
  ),
  cp(
    new URL("../.next/static", import.meta.url),
    new URL("../.next/standalone/.next/static", import.meta.url),
    { recursive: true },
  ),
]);
await import("../.next/standalone/server.js");
