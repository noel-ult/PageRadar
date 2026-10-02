jest.mock("node:dns/promises", () => ({
  lookup: jest
    .fn()
    .mockResolvedValue([{ address: "93.184.216.34", family: 4 }]),
}));
import { UrlValidator } from "./url-validator";

describe("UrlValidator", () => {
  let validator: UrlValidator;

  beforeEach(() => {
    validator = new UrlValidator();
  });

  describe("isPrivateOrReservedAddress", () => {
    it("should identify loopback IPv4 as private", () => {
      expect(validator.isPrivateOrReservedAddress("127.0.0.1")).toBe(true);
      expect(validator.isPrivateOrReservedAddress("127.1.2.3")).toBe(true);
    });

    it("should identify private RFC 1918 addresses", () => {
      expect(validator.isPrivateOrReservedAddress("10.0.0.1")).toBe(true);
      expect(validator.isPrivateOrReservedAddress("172.16.0.1")).toBe(true);
      expect(validator.isPrivateOrReservedAddress("172.31.255.255")).toBe(true);
      expect(validator.isPrivateOrReservedAddress("192.168.1.1")).toBe(true);
    });

    it("should identify AWS/cloud metadata address (169.254.169.254)", () => {
      expect(validator.isPrivateOrReservedAddress("169.254.169.254")).toBe(
        true,
      );
      expect(validator.isPrivateOrReservedAddress("169.254.1.1")).toBe(true);
    });

    it("should identify IPv6 loopback and private addresses", () => {
      expect(validator.isPrivateOrReservedAddress("::1")).toBe(true);
      expect(validator.isPrivateOrReservedAddress("fc00::1")).toBe(true);
      expect(validator.isPrivateOrReservedAddress("fe80::1")).toBe(true);
    });

    it("should identify IPv4-mapped IPv6 loopback", () => {
      expect(validator.isPrivateOrReservedAddress("::ffff:127.0.0.1")).toBe(
        true,
      );
      expect(validator.isPrivateOrReservedAddress("::ffff:10.0.0.5")).toBe(
        true,
      );
    });

    it("should allow valid public IP addresses", () => {
      expect(validator.isPrivateOrReservedAddress("8.8.8.8")).toBe(false);
      expect(validator.isPrivateOrReservedAddress("1.1.1.1")).toBe(false);
      expect(validator.isPrivateOrReservedAddress("93.184.216.34")).toBe(false);
    });
  });

  describe("validateAndResolve", () => {
    it("should reject non-HTTP(S) protocols", async () => {
      await expect(
        validator.validateAndResolve("ftp://example.com"),
      ).rejects.toThrow(/Unsupported URL protocol/);
      await expect(
        validator.validateAndResolve("javascript:alert(1)"),
      ).rejects.toThrow();
      await expect(
        validator.validateAndResolve("file:///etc/passwd"),
      ).rejects.toThrow();
    });

    it("should reject URLs with embedded credentials", async () => {
      await expect(
        validator.validateAndResolve("https://user:pass@example.com"),
      ).rejects.toThrow(/embedded credentials/);
    });

    it("should reject localhost and local hostnames", async () => {
      await expect(
        validator.validateAndResolve("http://localhost:3000"),
      ).rejects.toThrow(/restricted and cannot be monitored/);
      await expect(
        validator.validateAndResolve("http://app.internal"),
      ).rejects.toThrow(/restricted and cannot be monitored/);
      await expect(
        validator.validateAndResolve("http://metadata.google.internal"),
      ).rejects.toThrow(/restricted and cannot be monitored/);
    });

    it("should resolve and accept public URLs", async () => {
      const result = await validator.validateAndResolve("https://example.com");
      expect(result.url.hostname).toBe("example.com");
      expect(result.resolvedIps.length).toBeGreaterThan(0);
    });
  });
  it("blocks benchmarking, translation and IPv6 protocol-assignment addresses", () => {
    for (const address of [
      "198.18.0.1",
      "198.19.255.1",
      "2001:20::1",
      "64:ff9b::a00:1",
      "2002:7f00:1::1",
      "100.64.0.1",
    ])
      expect(validator.isPrivateOrReservedAddress(address)).toBe(true);
    expect(validator.isPrivateOrReservedAddress("2001:4860:4860::8888")).toBe(
      false,
    );
  });
});
