const FIREBASE_PROJECT_ID = "phraseman-ea0b3";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const JWKS_TIMEOUT_MS = 5_000;
const UNKNOWN_KID_REFRESH_MS = 60_000;
const MAX_JWKS_BYTES = 64 * 1024;
const MAX_TOKEN_BYTES = 16 * 1024;
const MAX_CLOCK_SKEW_SECONDS = 300;
const OBJECT_PATH =
  /^learning-v2\/voice-audio\/v1\/(?:en|es)\/(?:current\.json|packs\/(?:base|delta)-[a-z0-9-]{1,96}-[a-f0-9]{64}\.bin|releases\/[a-f0-9]{64}\/lessons\/l\d{3}-[a-f0-9]{64}\.json)$/u;

class AccessError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

const response = (status, code, headers = {}) =>
  new Response(code, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });

const jsonObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function decodeBase64UrlJson(segment) {
  if (
    typeof segment !== "string" ||
    segment.length < 2 ||
    segment.length > MAX_TOKEN_BYTES ||
    !/^[A-Za-z0-9_-]+$/u.test(segment)
  )
    throw new AccessError(403, "invalid_token");
  const padded = segment.replace(/-/gu, "+").replace(/_/gu, "/").padEnd(
    Math.ceil(segment.length / 4) * 4,
    "=",
  );
  let binary;
  try {
    binary = atob(padded);
  } catch {
    throw new AccessError(403, "invalid_token");
  }
  const bytes = Uint8Array.from(binary, (value) => value.charCodeAt(0));
  try {
    const parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes),
    );
    if (!jsonObject(parsed)) throw new Error("not_object");
    return parsed;
  } catch {
    throw new AccessError(403, "invalid_token");
  }
}

function decodeBase64UrlBytes(segment) {
  if (
    typeof segment !== "string" ||
    segment.length < 2 ||
    segment.length > MAX_TOKEN_BYTES ||
    !/^[A-Za-z0-9_-]+$/u.test(segment)
  )
    throw new AccessError(403, "invalid_token");
  try {
    const padded = segment.replace(/-/gu, "+").replace(/_/gu, "/").padEnd(
      Math.ceil(segment.length / 4) * 4,
      "=",
    );
    return Uint8Array.from(atob(padded), (value) => value.charCodeAt(0));
  } catch {
    throw new AccessError(403, "invalid_token");
  }
}

function maxAgeMs(value) {
  const match = /(?:^|,)\s*max-age=(\d+)\b/iu.exec(value ?? "");
  const seconds = match ? Number(match[1]) : 300;
  if (!Number.isSafeInteger(seconds)) return 300_000;
  return Math.min(6 * 60 * 60_000, Math.max(60_000, seconds * 1_000));
}

function exactObjectPath(request) {
  if (request.method !== "GET") throw new AccessError(405, "method_not_allowed");
  const url = new URL(request.url);
  if (url.search || url.hash || request.headers.has("range"))
    throw new AccessError(404, "object_not_found");
  const path = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  if (!OBJECT_PATH.test(path)) throw new AccessError(404, "object_not_found");
  return path;
}

function firebaseBearer(request) {
  const authorization = request.headers.get("authorization");
  const match = /^Firebase ([A-Za-z0-9._-]+)$/u.exec(authorization ?? "");
  if (!match || match[1].length > MAX_TOKEN_BYTES)
    throw new AccessError(401, "authentication_required");
  return match[1];
}

export function createLearningV2AudioWorker(dependencies = {}) {
  const fetcher = dependencies.fetcher ?? fetch;
  const clock = dependencies.now ?? Date.now;
  const subtle = dependencies.subtle ?? crypto.subtle;
  let cachedKeys = new Map();
  let keysExpireAt = 0;
  let refreshInFlight = null;
  let nextUnknownKidRefreshAt = 0;

  const refreshKeys = async () => {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), JWKS_TIMEOUT_MS);
      try {
        const result = await fetcher(FIREBASE_JWKS_URL, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!result.ok) throw new Error("jwks_http");
        const declared = Number(result.headers.get("content-length"));
        if (Number.isFinite(declared) && declared > MAX_JWKS_BYTES)
          throw new Error("jwks_too_large");
        const text = await result.text();
        if (text.length > MAX_JWKS_BYTES) throw new Error("jwks_too_large");
        const parsed = JSON.parse(text);
        if (!jsonObject(parsed) || !Array.isArray(parsed.keys) || parsed.keys.length > 16)
          throw new Error("jwks_invalid");
        const imported = new Map();
        for (const jwk of parsed.keys) {
          if (
            !jsonObject(jwk) ||
            typeof jwk.kid !== "string" ||
            !/^[A-Za-z0-9._-]{1,160}$/u.test(jwk.kid) ||
            jwk.kty !== "RSA" ||
            (jwk.alg !== undefined && jwk.alg !== "RS256") ||
            (jwk.use !== undefined && jwk.use !== "sig")
          )
            continue;
          const key = await subtle.importKey(
            "jwk",
            jwk,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false,
            ["verify"],
          );
          imported.set(jwk.kid, key);
        }
        if (imported.size < 1) throw new Error("jwks_empty");
        cachedKeys = imported;
        keysExpireAt = clock() + maxAgeMs(result.headers.get("cache-control"));
        return imported;
      } catch {
        throw new AccessError(503, "authentication_temporarily_unavailable");
      } finally {
        clearTimeout(timer);
      }
    })();
    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  };

  const keyFor = async (kid) => {
    const hadFreshCache = cachedKeys.size > 0 && clock() < keysExpireAt;
    let keys = hadFreshCache ? cachedKeys : await refreshKeys();
    let key = keys.get(kid);
    if (!key && hadFreshCache && clock() >= nextUnknownKidRefreshAt) {
      nextUnknownKidRefreshAt = clock() + UNKNOWN_KID_REFRESH_MS;
      keys = await refreshKeys();
      key = keys.get(kid);
    }
    if (!key) throw new AccessError(403, "invalid_token");
    return key;
  };

  const verifyToken = async (jwt) => {
    const parts = jwt.split(".");
    if (parts.length !== 3) throw new AccessError(403, "invalid_token");
    const header = decodeBase64UrlJson(parts[0]);
    const claims = decodeBase64UrlJson(parts[1]);
    if (
      header.alg !== "RS256" ||
      typeof header.kid !== "string" ||
      !/^[A-Za-z0-9._-]{1,160}$/u.test(header.kid) ||
      (header.typ !== undefined && header.typ !== "JWT")
    )
      throw new AccessError(403, "invalid_token");
    const nowSeconds = Math.floor(clock() / 1_000);
    if (
      claims.aud !== FIREBASE_PROJECT_ID ||
      claims.iss !== FIREBASE_ISSUER ||
      typeof claims.sub !== "string" ||
      claims.sub.length < 1 ||
      claims.sub.length > 128 ||
      !Number.isSafeInteger(claims.exp) ||
      claims.exp <= nowSeconds ||
      !Number.isSafeInteger(claims.auth_time) ||
      claims.auth_time < 0 ||
      claims.auth_time > nowSeconds ||
      !Number.isSafeInteger(claims.iat) ||
      claims.auth_time > claims.iat ||
      claims.iat > nowSeconds + MAX_CLOCK_SKEW_SECONDS
    )
      throw new AccessError(403, "invalid_token");
    const key = await keyFor(header.kid);
    const valid = await subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      decodeBase64UrlBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid) throw new AccessError(403, "invalid_token");
  };

  return Object.freeze({
    fetch: async (request, env) => {
      try {
        const path = exactObjectPath(request);
        await verifyToken(firebaseBearer(request));
        if (!env?.AUDIO_BUCKET || typeof env.AUDIO_BUCKET.get !== "function")
          return response(503, "audio_store_unavailable");
        let object;
        try {
          object = await env.AUDIO_BUCKET.get(path);
        } catch {
          return response(503, "audio_store_unavailable");
        }
        if (!object) return response(404, "object_not_found");
        const immutable = path !== "learning-v2/voice-audio/v1/es/current.json" &&
          path !== "learning-v2/voice-audio/v1/en/current.json";
        return new Response(object.body, {
          status: 200,
          headers: {
            "cache-control": immutable
              ? "private, max-age=31536000, immutable"
              : "private, no-cache",
            "content-length": String(object.size),
            "x-phraseman-content-length": String(object.size),
            "content-type":
              object.httpMetadata?.contentType ??
              (path.endsWith(".json") ? "application/json" : "application/octet-stream"),
            ...(object.httpEtag ? { etag: object.httpEtag } : {}),
            "x-content-type-options": "nosniff",
          },
        });
      } catch (error) {
        if (error instanceof AccessError)
          return response(error.status, error.code, error.status === 401
            ? { "www-authenticate": 'Firebase realm="phraseman-ea0b3"' }
            : {});
        return response(503, "audio_service_unavailable");
      }
    },
  });
}

export default createLearningV2AudioWorker();
