const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

function subject() {
  return require("./request_security");
}

test("trusted external-LB client IP ignores every attacker-controlled left prefix", () => {
  const { getTrustedExternalClientIp } = subject();
  const baseRequest = {
    socket: { remoteAddress: "10.0.0.2" },
    headers: { "x-forwarded-for": "198.51.100.77, 35.191.0.8" },
  };
  const prefixedRequest = {
    socket: { remoteAddress: "10.0.0.2" },
    headers: {
      "x-forwarded-for": "1.1.1.1, garbage, 198.51.100.77, 35.191.0.8",
    },
  };
  const baseIp = getTrustedExternalClientIp(baseRequest);
  const prefixedIp = getTrustedExternalClientIp(prefixedRequest);
  assert.equal(baseIp, "198.51.100.77");
  assert.equal(prefixedIp, "198.51.100.77");
  const rateKey = (ipAddress) =>
    crypto
      .createHmac("sha256", "rate-limit-secret")
      .update(`completion-ip:${ipAddress}`)
      .digest("hex");
  assert.equal(rateKey(baseIp), rateKey(prefixedIp));
});

test("absent or malformed forwarded headers fall back to the validated socket address", () => {
  const { getTrustedExternalClientIp } = subject();
  const malformedValues = [
    undefined,
    "",
    "198.51.100.1",
    "not-an-ip, 35.191.0.8",
    "198.51.100.1, not-an-lb-ip",
    ["198.51.100.1, 35.191.0.8"],
  ];
  for (const value of malformedValues) {
    const headers = {};
    if (value !== undefined) headers["x-forwarded-for"] = value;
    assert.equal(
      getTrustedExternalClientIp({
        headers,
        socket: { remoteAddress: "::ffff:10.0.0.2" },
      }),
      "::ffff:10.0.0.2",
    );
  }
});

test("rawBody byte length rejects an oversized body even without Content-Length", () => {
  const { requestBodyByteLength } = subject();
  assert.equal(
    requestBodyByteLength({ headers: {}, rawBody: Buffer.alloc(32769) }),
    32769,
  );
});

test("rawBody byte length overrides a forged smaller Content-Length", () => {
  const { requestBodyByteLength } = subject();
  assert.equal(
    requestBodyByteLength({
      headers: { "content-length": "1" },
      rawBody: Buffer.alloc(32769),
    }),
    32769,
  );
});
