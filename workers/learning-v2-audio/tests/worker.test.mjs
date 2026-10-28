import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createSign, generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { createLearningV2AudioWorker } from "../src/index.mjs";

const PROJECT_ID = "phraseman-ea0b3";
const ORIGIN = "https://learning-v2-audio.example.workers.dev";

const base64Url = (value) => Buffer.from(value).toString("base64url");

function keyFixture(kid = "firebase-key-1") {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  return {
    kid,
    privateKey,
    jwk: {
      ...publicKey.export({ format: "jwk" }),
      alg: "RS256",
      kid,
      use: "sig",
    },
  };
}

function token(key, claims = {}, header = {}) {
  const now = 1_800_000_000;
  const encodedHeader = base64Url(
    JSON.stringify({ alg: "RS256", kid: key.kid, typ: "JWT", ...header }),
  );
  const encodedPayload = base64Url(
    JSON.stringify({
      aud: PROJECT_ID,
      auth_time: now - 60,
      exp: now + 3_600,
      iat: now - 30,
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
      sub: "firebase-user-1",
      ...claims,
    }),
  );
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .end()
    .sign(key.privateKey)
    .toString("base64url");
  return `${signingInput}.${signature}`;
}

function request(path, idToken, init = {}) {
  return new Request(`${ORIGIN}/${path}`, {
    method: "GET",
    headers: idToken ? { Authorization: `Firebase ${idToken}` } : {},
    ...init,
  });
}

function bucketFixture(bytes = Uint8Array.from([1, 2, 3])) {
  const calls = [];
  return {
    calls,
    bucket: {
      get: async (key) => {
        calls.push(key);
        return {
          body: bytes,
          size: bytes.byteLength,
          httpEtag: '"etag"',
          httpMetadata: { contentType: "application/json" },
        };
      },
    },
  };
}

test("serves one exact private object after Firebase JWT verification", async () => {
  const key = keyFixture();
  let jwksCalls = 0;
  const fetcher = async () => {
    jwksCalls += 1;
    return new Response(JSON.stringify({ keys: [key.jwk] }), {
      headers: { "cache-control": "public, max-age=3600" },
    });
  };
  const { bucket, calls } = bucketFixture();
  const worker = createLearningV2AudioWorker({
    fetcher,
    now: () => 1_800_000_000_000,
  });
  const path = "learning-v2/voice-audio/v1/es/current.json";

  const response = await worker.fetch(request(path, token(key)), {
    AUDIO_BUCKET: bucket,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [path]);
  assert.equal(jwksCalls, 1);
  assert.equal(response.headers.get("content-length"), "3");
  assert.equal(response.headers.get("x-phraseman-content-length"), "3");
  assert.equal(response.headers.get("cache-control"), "private, no-cache");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.deepEqual(
    new Uint8Array(await response.arrayBuffer()),
    Uint8Array.from([1, 2, 3]),
  );
});

test("reuses cached JWKS and rate-limits refresh for an unknown kid", async () => {
  const trusted = keyFixture("trusted");
  const unknown = keyFixture("unknown");
  let now = 1_800_000_000_000;
  let jwksCalls = 0;
  const worker = createLearningV2AudioWorker({
    now: () => now,
    fetcher: async () => {
      jwksCalls += 1;
      return new Response(JSON.stringify({ keys: [trusted.jwk] }), {
        headers: { "cache-control": "max-age=3600" },
      });
    },
  });
  const { bucket } = bucketFixture();
  const env = { AUDIO_BUCKET: bucket };
  const path = "learning-v2/voice-audio/v1/es/current.json";

  assert.equal((await worker.fetch(request(path, token(trusted)), env)).status, 200);
  assert.equal((await worker.fetch(request(path, token(trusted)), env)).status, 200);
  assert.equal(jwksCalls, 1);
  assert.equal((await worker.fetch(request(path, token(unknown)), env)).status, 403);
  assert.equal((await worker.fetch(request(path, token(unknown)), env)).status, 403);
  assert.equal(jwksCalls, 2);
  now += 60_000;
  assert.equal((await worker.fetch(request(path, token(unknown)), env)).status, 403);
  assert.equal(jwksCalls, 3);
});

test("rejects malformed access before touching R2 or JWKS", async () => {
  let jwksCalls = 0;
  const { bucket, calls } = bucketFixture();
  const worker = createLearningV2AudioWorker({
    fetcher: async () => {
      jwksCalls += 1;
      return new Response("unreachable");
    },
    now: () => 1_800_000_000_000,
  });
  const env = { AUDIO_BUCKET: bucket };
  const cases = [
    new Request(`${ORIGIN}/learning-v2/voice-audio/v1/es/current.json`, {
      method: "POST",
    }),
    new Request(`${ORIGIN}/learning-v2/voice-audio/v1/es/current.json?list=1`),
    new Request(`${ORIGIN}/learning-v2/voice-audio/v1/es/../secret`),
    new Request(`${ORIGIN}/learning-v2/voice-audio/v1/es/packs/not-valid.bin`),
  ];

  for (const candidate of cases) {
    const response = await worker.fetch(candidate, env);
    assert.ok(response.status === 404 || response.status === 405);
  }
  assert.deepEqual(calls, []);
  assert.equal(jwksCalls, 0);
});

test("fails closed for absent, expired, wrong-audience, and invalid-signature tokens", async () => {
  const key = keyFixture();
  const attacker = keyFixture(key.kid);
  const { bucket, calls } = bucketFixture();
  const worker = createLearningV2AudioWorker({
    now: () => 1_800_000_000_000,
    fetcher: async () =>
      new Response(JSON.stringify({ keys: [key.jwk] }), {
        headers: { "cache-control": "max-age=3600" },
      }),
  });
  const env = { AUDIO_BUCKET: bucket };
  const path = "learning-v2/voice-audio/v1/es/current.json";
  const candidates = [
    undefined,
    token(key, { exp: 1_799_999_999 }),
    token(key, { aud: "another-project" }),
    token(key, { auth_time: undefined }),
    token(key, { auth_time: 1_800_000_001 }),
    token(key, { auth_time: 1_799_999_980, iat: 1_799_999_970 }),
    token(attacker),
  ];

  for (const candidate of candidates) {
    const response = await worker.fetch(request(path, candidate), env);
    assert.ok(response.status === 401 || response.status === 403);
  }
  assert.deepEqual(calls, []);
});

test("returns deterministic 404 for an allowed missing object", async () => {
  const key = keyFixture();
  const worker = createLearningV2AudioWorker({
    now: () => 1_800_000_000_000,
    fetcher: async () =>
      new Response(JSON.stringify({ keys: [key.jwk] }), {
        headers: { "cache-control": "max-age=3600" },
      }),
  });
  const response = await worker.fetch(
    request(
      "learning-v2/voice-audio/v1/es/packs/base-sessions-1-" +
        "a".repeat(64) +
        ".bin",
      token(key),
    ),
    { AUDIO_BUCKET: { get: async () => null } },
  );
  assert.equal(response.status, 404);
});
