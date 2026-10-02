import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
jest.mock("node:http", () => ({ request: jest.fn() }));
jest.mock("node:https", () => ({ request: jest.fn() }));
import { request } from "node:https";
import { SafeFetcher, MAX_CONTENT_BYTES } from "./safe-fetcher";
import { FetchFailure } from "../security/url-validator";

describe("SafeFetcher", () => {
  let validator: any;
  let queue: any;
  let service: SafeFetcher;
  function respond(
    body: Buffer,
    headers: Record<string, string>,
    statusCode = 200,
  ) {
    const response = Readable.from([body]);
    Object.assign(response, { headers, statusCode });
    (request as jest.Mock).mockImplementationOnce((_url, options, callback) => {
      const socket = new EventEmitter();
      Object.assign(socket, { end: () => callback(response) });
      const lookup = jest.fn();
      options.lookup("example.com", {}, lookup);
      expect(lookup).toHaveBeenCalledWith(null, "93.184.216.34", 4);
      return socket;
    });
  }
  beforeEach(() => {
    jest.clearAllMocks();
    validator = {
      validateAndResolve: jest.fn(async (raw) => ({
        url: new URL(raw),
        resolvedIps: ["93.184.216.34"],
      })),
    };
    queue = { acquireDomain: jest.fn().mockResolvedValue(jest.fn()) };
    service = new SafeFetcher(validator, queue);
  });
  it("pins DNS while fetching ordinary HTML", async () => {
    respond(Buffer.from("<p>Hello</p>"), { "content-type": "text/html" });
    expect((await service.fetchPage("https://example.com")).html).toContain(
      "Hello",
    );
  });
  it("validates every redirect before opening another connection", async () => {
    respond(Buffer.alloc(0), { location: "http://169.254.169.254" }, 302);
    validator.validateAndResolve.mockImplementation(async (raw: string) => {
      if (raw.includes("169.254")) throw new FetchFailure("restricted");
      return { url: new URL(raw), resolvedIps: ["93.184.216.34"] };
    });
    await expect(service.fetchPage("https://example.com")).rejects.toThrow(
      "restricted",
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("aborts streaming content above the limit", async () => {
    respond(Buffer.alloc(MAX_CONTENT_BYTES + 1), {
      "content-type": "text/html",
    });
    await expect(service.fetchPage("https://example.com")).rejects.toThrow(
      "3 MB",
    );
  });
  it("retries rate limits with Retry-After", async () => {
    respond(Buffer.alloc(0), { "retry-after": "5" }, 429);
    await expect(
      service.fetchPage("https://example.com"),
    ).rejects.toMatchObject({ retryable: true, retryAfterMs: 5000 });
  });
});
