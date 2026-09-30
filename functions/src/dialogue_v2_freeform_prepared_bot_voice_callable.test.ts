import { readFileSync } from "node:fs";
import path from "node:path";
import { HttpsError } from "firebase-functions/v2/https";

import * as resolverModuleExports from "./dialogue_v2_freeform_prepared_bot_voice_resolver";
import {
  DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_RESOLVE_OPTIONS,
  createDialogueV2FreeformPreparedBotVoiceProductionHandler,
  createDialogueV2FreeformPreparedBotVoicePublicHandler,
  dialogueV2FreeformPreparedBotVoiceResolve,
} from "./dialogue_v2_freeform_prepared_bot_voice_callable";

const SESSION_ID = `d2fs_${"S".repeat(32)}`;
const TURN_ID = `d2ft_${"T".repeat(16)}`;
const DATA = Object.freeze({
  sessionId: SESSION_ID,
  turnId: TURN_ID,
  studyTarget: "en",
});

async function captureError(work: () => Promise<unknown>): Promise<HttpsError> {
  try {
    await work();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpsError);
    return error as HttpsError;
  }
  throw new Error("expected_error");
}

function throwingRuntime(
  runTransaction = jest.fn(async () => {
    throw new Error("real_resolver_called");
  }),
) {
  return {
    runtime: {
      db: { runTransaction },
      nowMs: () => Date.UTC(2026, 8, 27, 12, 0, 0),
      bindOwner: () => "o".repeat(64),
      computeEligibilityHmac: () => "0".repeat(64),
      timestampFromMillis: (millis: number) => ({ toMillis: () => millis }),
    },
    runTransaction,
  };
}

describe("Dialogue V2 Freeform prepared bot voice public callable", () => {
  it("returns the exact text-only public shape while the reviewed catalog is null", async () => {
    const resolveInternal = jest.fn(async () => ({
      ok: true as const,
      selection: null,
    }));
    const handler = createDialogueV2FreeformPreparedBotVoicePublicHandler({
      resolveInternal,
    });

    const result = await handler({ auth: { uid: "auth-user" }, data: DATA });

    expect(result).toEqual({ selection: null });
    expect(Object.keys(result)).toEqual(["selection"]);
    expect(resolveInternal).toHaveBeenCalledWith({
      auth: { uid: "auth-user" },
      data: DATA,
    });
  });

  it.each([
    { ...DATA, stableAccountId: "victim" },
    { ...DATA, preparedResponseId: "client-choice" },
    { ...DATA, assetKey: "client-asset" },
    { ...DATA, replyTextSha256: "a".repeat(64) },
    { ...DATA, catalog: {} },
    { ...DATA, completedAtMs: 123 },
    { ...DATA, studyTarget: "it" },
    { ...DATA, sessionId: `d2s_${"S".repeat(32)}` },
    { ...DATA, turnId: `d2t_${"T".repeat(16)}` },
  ])(
    "rejects malformed or client-authority input before Firestore %#",
    async (data) => {
      const { runtime, runTransaction } = throwingRuntime();
      const handler = createDialogueV2FreeformPreparedBotVoiceProductionHandler(
        runtime as never,
      );

      await expect(
        handler({ auth: { uid: "auth-user" }, data }),
      ).rejects.toMatchObject({
        code: "invalid-argument",
        message: "dialogue_v2_freeform_bot_voice_request_invalid",
      });
      expect(runTransaction).not.toHaveBeenCalled();
    },
  );

  it("rejects Proxy request data without invoking Firestore", async () => {
    const { runtime, runTransaction } = throwingRuntime();
    const handler = createDialogueV2FreeformPreparedBotVoiceProductionHandler(
      runtime as never,
    );
    const hostile = new Proxy(
      { ...DATA },
      {
        ownKeys() {
          throw new Error("must_not_escape");
        },
      },
    );

    await expect(
      handler({ auth: { uid: "auth-user" }, data: hostile }),
    ).rejects.toMatchObject({ code: "invalid-argument" });
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it("requires auth but follows the owner App Check seal without a manual gate", async () => {
    const { runtime, runTransaction } = throwingRuntime();
    const handler = createDialogueV2FreeformPreparedBotVoiceProductionHandler(
      runtime as never,
    );

    await expect(handler({ data: DATA })).rejects.toMatchObject({
      code: "unauthenticated",
      message: "auth_required",
    });
    expect(runTransaction).not.toHaveBeenCalled();

    await expect(
      handler({ auth: { uid: "auth-user" }, data: DATA }),
    ).rejects.toMatchObject({
      code: "unavailable",
      message: "dialogue_v2_freeform_bot_voice_unavailable",
    });
    expect(runTransaction).toHaveBeenCalledTimes(1);
  });

  it("sanitizes allowed errors and maps all other failures to one non-enumerating error", async () => {
    const safe = createDialogueV2FreeformPreparedBotVoicePublicHandler({
      resolveInternal: async () => {
        throw new HttpsError("unauthenticated", "auth_required", {
          privatePath: "users/victim",
        });
      },
    });
    const safeError = await captureError(() => safe({ data: DATA }));
    expect(safeError).toMatchObject({
      code: "unauthenticated",
      message: "auth_required",
    });
    expect(safeError.details).toBeUndefined();

    const privateFailure =
      createDialogueV2FreeformPreparedBotVoicePublicHandler({
        resolveInternal: async () => {
          throw new Error("users/private-account/dialogue_v2_bot_voice_claims");
        },
      });
    const error = await captureError(() =>
      privateFailure({
        auth: { uid: "private-auth-id" },
        data: DATA,
      }),
    );
    expect(error).toMatchObject({
      code: "unavailable",
      message: "dialogue_v2_freeform_bot_voice_unavailable",
    });
    expect(JSON.stringify(error)).not.toContain("private-account");
    expect(JSON.stringify(error)).not.toContain("private-auth-id");
  });

  it.each([
    undefined,
    null,
    {},
    { ok: true, selection: { preparedResponseId: "must-not-leak" } },
    { ok: true, selection: null, assetKey: "must-not-leak" },
  ])(
    "fails closed for malformed or future internal output %#",
    async (internalResult) => {
      const handler = createDialogueV2FreeformPreparedBotVoicePublicHandler({
        resolveInternal: async () => internalResult as never,
      });

      const error = await captureError(() =>
        handler({
          auth: { uid: "auth-user" },
          data: DATA,
        }),
      );

      expect(error).toMatchObject({
        code: "unavailable",
        message: "dialogue_v2_freeform_bot_voice_unavailable",
      });
      expect(JSON.stringify(error)).not.toContain("preparedResponseId");
      expect(JSON.stringify(error)).not.toContain("assetKey");
    },
  );

  it("captures the accepted internal resolver lexically against post-load CJS mutation", async () => {
    const resolverExports = resolverModuleExports as unknown as Record<
      string,
      unknown
    >;
    const exportName =
      "createDialogueV2FreeformPreparedBotVoiceInternalResolver";
    const original = resolverExports[exportName];
    const injectedBuilder = jest.fn(() => async () => ({
      ok: true,
      selection: null,
    }));
    resolverExports[exportName] = injectedBuilder;
    const { runtime, runTransaction } = throwingRuntime();

    try {
      const handler = createDialogueV2FreeformPreparedBotVoiceProductionHandler(
        runtime as never,
      );
      await expect(
        handler({ auth: { uid: "auth-user" }, data: DATA }),
      ).rejects.toMatchObject({ code: "unavailable" });
      expect(runTransaction).toHaveBeenCalledTimes(1);
      expect(injectedBuilder).not.toHaveBeenCalled();
    } finally {
      resolverExports[exportName] = original;
    }
  });

  it("exports a bounded callable with no provider, TTS, fetch, OpenAI key or asset surface", () => {
    expect(dialogueV2FreeformPreparedBotVoiceResolve).toBeDefined();
    expect(
      DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_RESOLVE_OPTIONS,
    ).toMatchObject({
      region: "us-central1",
      enforceAppCheck: false,
      timeoutSeconds: 20,
      memory: "256MiB",
      minInstances: 0,
      maxInstances: 20,
    });

    const source = readFileSync(
      path.join(
        __dirname,
        "dialogue_v2_freeform_prepared_bot_voice_callable.ts",
      ),
      "utf8",
    );
    expect(source).not.toMatch(
      /OPENAI_API_KEY|defineSecret|fetch\s*\(|audio\/speech|TTS/i,
    );
    expect(source).not.toMatch(
      /assetKey|preparedResponseId|replyTextSha256|path:/,
    );
    expect(source).toContain(
      "createDialogueV2FreeformPreparedBotVoiceInternalResolver",
    );
    expect(source).toContain("ENFORCE_APP_CHECK_OPENAI");

    const indexSource = readFileSync(path.join(__dirname, "index.ts"), "utf8");
    expect(indexSource).toContain(
      'const { dialogueV2FreeformPreparedBotVoiceResolve } = require("./dialogue_v2_freeform_prepared_bot_voice_callable")',
    );
    expect(indexSource).toContain(
      "exports.dialogueV2FreeformPreparedBotVoiceResolve = dialogueV2FreeformPreparedBotVoiceResolve;",
    );
  });
});
