const PROJECT_ID = "demo-phraseman-progress-transport";
const FUNCTION_URL = `http://127.0.0.1:5012/${PROJECT_ID}/us-central1/v2ProgressTransport`;

// The Functions Emulator force-enables skipTokenVerification. These unsigned
// tokens prove header propagation and callable routing only; they are never
// described as authentic Auth/App Check verification evidence.
const emulatorDecodedToken = (subject: string): string =>
  `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ sub: subject })).toString("base64url")}.debug`;

const postCallable = async (headers: Record<string, string> = {}) => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ data: {} }),
  });
  return {
    status: response.status,
    body: await response.json().catch(() => undefined),
  };
};

describe("Learning V2 progress callable through the Functions Emulator network", () => {
  jest.setTimeout(120_000);

  it("rejects a network callable request that has no Auth or App Check", async () => {
    await expect(postCallable()).resolves.toMatchObject({
      status: 401,
      body: { error: { status: "UNAUTHENTICATED" } },
    });
  });

  it("records that the emulator bypass lets a malformed App Check token reach the handler", async () => {
    await expect(postCallable({
      Authorization: `Bearer ${emulatorDecodedToken("auth-user")}`,
      "X-Firebase-AppCheck": "not-a-jwt",
    })).resolves.toMatchObject({
      status: 400,
      body: { error: { status: "INVALID_ARGUMENT" } },
    });
  });

  it("rejects a structurally invalid Auth header over HTTP", async () => {
    await expect(postCallable({
      Authorization: "not-bearer",
      "X-Firebase-AppCheck": emulatorDecodedToken("debug-app"),
    })).resolves.toMatchObject({
      status: 401,
      body: { error: { status: "UNAUTHENTICATED" } },
    });
  });

  it("reaches the callable parser with emulator-decoded Auth and App Check headers", async () => {
    await expect(postCallable({
      Authorization: `Bearer ${emulatorDecodedToken("auth-user")}`,
      "X-Firebase-AppCheck": emulatorDecodedToken("debug-app"),
    })).resolves.toMatchObject({
      status: 400,
      body: { error: { status: "INVALID_ARGUMENT" } },
    });
  });
});
