import { Injectable } from "@nestjs/common";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as ipaddr from "ipaddr.js";

export interface ValidatedUrl {
  url: URL;
  resolvedIps: string[];
}
export class FetchFailure extends Error {
  constructor(
    message: string,
    readonly retryable = false,
    readonly retryAfterMs = 0,
  ) {
    super(message);
  }
}

@Injectable()
export class UrlValidator {
  async validateAndResolve(rawUrl: string): Promise<ValidatedUrl> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new FetchFailure("Invalid URL format");
    }
    if (!["http:", "https:"].includes(url.protocol))
      throw new FetchFailure(
        "Unsupported URL protocol. Only HTTP and HTTPS are permitted.",
      );
    if (url.username || url.password)
      throw new FetchFailure("URLs with embedded credentials are not allowed.");
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (
      /^(localhost|metadata\.google\.internal|instance-data)$/.test(hostname) ||
      /\.(localhost|local|internal)$/.test(hostname)
    ) {
      throw new FetchFailure("Host is restricted and cannot be monitored.");
    }
    if (url.port && !["80", "443"].includes(url.port))
      throw new FetchFailure(
        "Only standard HTTP and HTTPS ports are permitted.",
      );
    let timer: NodeJS.Timeout | undefined;
    try {
      const addresses = isIP(hostname)
        ? [{ address: hostname }]
        : await Promise.race([
            lookup(hostname, { all: true, verbatim: true }),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () => reject(new FetchFailure("DNS lookup timed out", true)),
                3000,
              );
            }),
          ]);
      if (
        !addresses.length ||
        addresses.some(({ address }) =>
          this.isPrivateOrReservedAddress(address),
        )
      ) {
        throw new FetchFailure("URL resolved to a restricted network address.");
      }
      return { url, resolvedIps: addresses.map(({ address }) => address) };
    } catch (error) {
      if (error instanceof FetchFailure) throw error;
      throw new FetchFailure("DNS lookup failed", true);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  isPrivateOrReservedAddress(address: string): boolean {
    try {
      const parsed = ipaddr.process(address);
      // Includes private, loopback, multicast, transition, mapped and reserved ranges.
      if (parsed.range() !== "unicast") return true;
      if (
        parsed.kind() === "ipv4" &&
        (parsed as ipaddr.IPv4).match(
          ipaddr.parse("198.18.0.0") as ipaddr.IPv4,
          15,
        )
      )
        return true;
      if (parsed.kind() === "ipv6") {
        // Only ordinary global unicast; reject transition/reserved space conservatively.
        return (
          !(parsed as ipaddr.IPv6).match(
            ipaddr.parse("2000::") as ipaddr.IPv6,
            3,
          ) ||
          (parsed as ipaddr.IPv6).match(
            ipaddr.parse("2001::") as ipaddr.IPv6,
            23,
          )
        );
      }
      return false;
    } catch {
      return true;
    }
  }
}
