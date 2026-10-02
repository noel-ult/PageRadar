import { Injectable } from "@nestjs/common";
import { request as httpRequest, IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import {
  UrlValidator,
  FetchFailure,
  ValidatedUrl,
} from "../security/url-validator";
import { MonitoringQueueService } from "../queue/monitoring-queue.service";

export const MAX_CONTENT_BYTES = 3_000_000;
export interface FetchedPage {
  html: string;
  finalUrl: string;
  httpStatus: number;
}

@Injectable()
export class SafeFetcher {
  constructor(
    private readonly validator: UrlValidator,
    private readonly queue: MonitoringQueueService,
  ) {}

  async fetchPage(rawUrl: string): Promise<FetchedPage> {
    const signal = AbortSignal.timeout(15_000);
    let target = rawUrl;
    for (let redirects = 0; redirects <= 5; redirects++) {
      signal.throwIfAborted();
      const validated = await this.validator.validateAndResolve(target);
      const release = await this.queue.acquireDomain(
        validated.url.hostname,
        signal,
      );
      let response: IncomingMessage | undefined;
      try {
        response = await this.open(validated, signal);
        const status = response.statusCode ?? 0;
        if ([301, 302, 303, 307, 308].includes(status)) {
          const location = response.headers.location;
          response.destroy();
          if (!location || redirects === 5)
            throw new FetchFailure(
              "Redirect limit exceeded or missing destination",
            );
          target = new URL(location, validated.url).toString();
          continue;
        }
        if (status < 200 || status >= 300) {
          const retryHeader = response.headers["retry-after"];
          const retry =
            typeof retryHeader === "string"
              ? /^\d+$/.test(retryHeader)
                ? Number(retryHeader) * 1000
                : Date.parse(retryHeader) - Date.now()
              : 0;
          throw new FetchFailure(
            `Page returned HTTP ${status}`,
            status === 429 || status >= 500,
            Math.max(0, Math.min(3600_000, retry || 0)),
          );
        }
        const type = response.headers["content-type"]?.toLowerCase() ?? "";
        if (!/text\/html|application\/xhtml\+xml/.test(type))
          throw new FetchFailure("Watch URL did not return HTML");
        if (Number(response.headers["content-length"] ?? 0) > MAX_CONTENT_BYTES)
          throw new FetchFailure("Page exceeds the 3 MB monitoring limit");
        const encoding = response.headers["content-encoding"];
        const decompressor =
          encoding === "gzip"
            ? createGunzip()
            : encoding === "br"
              ? createBrotliDecompress()
              : encoding === "deflate"
                ? createInflate()
                : undefined;
        if (encoding && encoding !== "identity" && !decompressor)
          throw new FetchFailure("Unsupported response encoding");
        let wireSize = 0;
        response.on("data", (chunk: Buffer) => {
          wireSize += chunk.length;
          if (wireSize > MAX_CONTENT_BYTES)
            response?.destroy(
              new FetchFailure("Page exceeds the 3 MB monitoring limit"),
            );
        });
        if (decompressor)
          response.on("error", (error) => decompressor.destroy(error));
        const stream = decompressor ? response.pipe(decompressor) : response;
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of stream) {
          size += chunk.length;
          if (size > MAX_CONTENT_BYTES) {
            stream.destroy();
            throw new FetchFailure("Page exceeds the 3 MB monitoring limit");
          }
          chunks.push(Buffer.from(chunk));
        }
        return {
          html: Buffer.concat(chunks).toString("utf8"),
          finalUrl: validated.url.toString(),
          httpStatus: status,
        };
      } catch (error) {
        if (error instanceof FetchFailure) throw error;
        throw new FetchFailure(
          signal.aborted ? "Page fetch timed out" : "Page connection failed",
          true,
        );
      } finally {
        response?.destroy();
        await release();
      }
    }
    throw new FetchFailure("Redirect limit exceeded");
  }

  private open(
    { url, resolvedIps }: ValidatedUrl,
    signal: AbortSignal,
  ): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      const address = resolvedIps[0];
      const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
        url,
        {
          signal,
          agent: false,
          family: isIP(address),
          // DNS is pinned; TLS still verifies the original hostname and sends its SNI.
          lookup: (_hostname, _options, callback) =>
            callback(null, address, isIP(address)),
          headers: {
            "User-Agent": "PageRadar/1.0 (+web monitoring)",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Encoding": "identity",
          },
        },
        resolve,
      );
      request.on("error", reject);
      request.end();
    });
  }
}
