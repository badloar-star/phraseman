import fs from "fs";
import path from "path";

const root = path.join(__dirname, "..");

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

describe("OpenAI runtime cost controls", () => {
  test("Theo sessions render local greetings and do not call OpenAI before the first user turn", () => {
    const scenario = read("app/ai_dialog_session.tsx");
    const companion = read("app/ai_companion_session.tsx");

    expect(scenario).toContain("buildScenarioGreeting(scenario)");
    expect(companion).toContain("LOCAL_COMPANION_GREETING");
    expect(scenario).not.toContain(
      "(start the conversation with your greeting)",
    );
    expect(companion).not.toContain("sendToTheo(null, [])");
    expect(companion).not.toContain("(start the conversation: greet me warmly");
  });

  test("weekly review callable is Plus-only and stats insights remain local", () => {
    const weekly = read("app/weekly_review_client.ts");
    const stats = read("app/stats_insights_client.ts");

    expect(weekly).toContain("'weeklyReviewGenerate'");
    expect(weekly).toContain("if (!options.isPremium)");
    expect(weekly.indexOf("if (!options.isPremium)")).toBeLessThan(
      weekly.indexOf("import('@react-native-firebase/functions')"),
    );
    expect(stats).toContain("buildLocalStatsInsights");
    expect(stats).not.toContain("statsInsightsGenerate'");
    expect(stats).not.toContain('"statsInsightsGenerate"');
  });

  test("cache-warm AI clients dedupe identical in-flight callable requests", () => {
    const clients = [
      {
        source: read("app/ai_dialog_client.ts"),
        map: "premiumDialogSendInFlight",
        key: "premiumDialogSendRequestKey",
      },
      {
        source: read("app/ai_dialog_client.ts"),
        map: "premiumDialogTranslateInFlight",
        key: "premiumDialogTranslateRequestKey",
      },
      {
        source: read("app/ai_mistake_explain_client.ts"),
        map: "explainMistakeInFlight",
        key: "explainMistakeRequestKey",
      },
      {
        source: read("app/explain_phrase_client.ts"),
        map: "explainPhraseInFlight",
        key: "explainPhraseRequestKey",
      },
      {
        source: read("app/explain_choice_client.ts"),
        map: "explainChoiceInFlight",
        key: "explainChoiceRequestKey",
      },
    ];

    for (const { source, map, key } of clients) {
      expect(source).toContain(`const ${map} = new Map`);
      expect(source).toContain(`function ${key}`);
      expect(source).toContain(`const existing = ${map}.get(key);`);
      expect(source).toContain("if (existing) return existing;");
      expect(source).toContain(`${map}.set(key, request);`);
      expect(source).toContain(`${map}.delete(key);`);
    }
  });

  test("Explain clients serve completed local answers before reaching a callable", () => {
    const phrase = read("app/explain_phrase_client.ts");
    const mistake = read("app/ai_mistake_explain_client.ts");

    for (const source of [phrase, mistake]) {
      expect(source).toContain("from './explain_local_cache'");
      expect(source).toContain("readExplainLocalCache");
      expect(source).toContain("writeExplainLocalCache");
      expect(
        source.indexOf("const localCached = await readExplainLocalCache"),
      ).toBeLessThan(source.lastIndexOf("const fn = httpsCallable"));
    }
  });

  test("explain callable clients time out stalled requests so retry can recover", () => {
    const timeout = read("app/explain_callable_timeout.ts");
    expect(timeout).toContain("ExplainCallableTimeoutError");
    expect(timeout).toContain("explain_callable_timeout");
    expect(timeout).toContain("Promise.race([promise, timeout])");
    expect(timeout).toContain(
      "const DEFAULT_EXPLAIN_CALLABLE_TIMEOUT_MS = 35000",
    );

    for (const { source, callable } of [
      {
        source: read("app/ai_mistake_explain_client.ts"),
        callable: "explainMistake",
      },
      {
        source: read("app/explain_phrase_client.ts"),
        callable: "explainPhrase",
      },
      {
        source: read("app/explain_choice_client.ts"),
        callable: "explainChoice",
      },
    ]) {
      expect(source).toContain(
        "import { withExplainCallableTimeout } from './explain_callable_timeout'",
      );
      expect(source).toMatch(
        new RegExp(
          `withExplainCallableTimeout\\(\\s*fn\\(req\\),\\s*'${callable}'`,
        ),
      );
      expect(source).toContain("finally(() =>");
    }
  });

  test("legacy pronunciation OpenAI callable is no longer exported from Cloud Functions", () => {
    const index = read("functions/src/index.ts");

    expect(index).not.toContain("pronunciation_scoring");
    expect(index).not.toContain("scorePronunciationAttempt");
  });

  test("Theo runtime uses admin-configured model/quota and records the exact model billed", () => {
    const premiumDialog = read("functions/src/premium_dialog.ts");
    const modelConfig = read("functions/src/openai_dialog_model_config.ts");
    const functionsIndex = read("functions/src/index.ts");

    expect(premiumDialog).toContain("process.env.OPENAI_DIALOG_MODEL");
    expect(premiumDialog).toContain("resolveConfiguredDialogModel");
    expect(premiumDialog).toContain("resolveConfiguredDialogQuota");
    expect(premiumDialog).toContain(
      "const [dialogModel, dialogQuota, stableUid, aiDialogGatedByPremium] = await Promise.all([",
    );
    expect(premiumDialog).toContain(
      "resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL),",
    );
    expect(premiumDialog).toContain("resolveConfiguredDialogQuota(db),");
    expect(premiumDialog).toContain("dialogQuota.freeDailyReplies");
    expect(premiumDialog).toContain("dialogQuota.premiumDailyReplies");
    expect(premiumDialog).toContain("model: dialogModel");
    expect(premiumDialog).toContain("modelSupportsJsonObject(dialogModel)");
    expect(modelConfig).toContain("const MODEL_DEFAULT = 'gpt-4o-mini'");
    expect(modelConfig).toContain("ALLOWED_DIALOG_MODELS");
    expect(modelConfig).toContain("'gpt-4.1-nano': false");
    expect(modelConfig).toContain("DIALOG_FREE_DAILY_REPLIES_DEFAULT = 3");
    expect(modelConfig).toContain("DIALOG_PREMIUM_DAILY_REPLIES_DEFAULT = 100");
    expect(modelConfig).toContain("admin_runtime_config");
    expect(modelConfig).toContain("openAiDialogModelConfig");
    expect(modelConfig).toContain("openAiDialogQuotaConfig");
    expect(modelConfig).toContain("request.auth?.token?.admin");
    expect(functionsIndex).toContain("openAiDialogQuotaConfig");
  });

  test("high-risk dev OpenAI batch scripts require an explicit spend guard", () => {
    for (const rel of [
      "scripts/generate_audio.mjs",
      "scripts/regen_phrase_audio.mjs",
      "tools/generate_venga_openai_audio.py",
      "tools/generate_chains_unique_v3_openai_audio.py",
    ]) {
      expect(read(rel)).toContain("PHRASEMAN_ALLOW_OPENAI_DEV_SPEND");
    }
  });

  test("Codex sessions are firewalled from local OpenAI API use except TTS voiceover generation", () => {
    const agents = read("AGENTS.md");
    const nodeGuard = read("scripts/openai-dev-guard.mjs");
    const pythonGuard = read("tools/openai_dev_guard.py");

    expect(agents).toContain("Codex OpenAI API Firewall");
    expect(agents).toContain(
      "The only OpenAI API use allowed from Codex is TTS/voiceover generation through `/v1/audio/speech`",
    );
    expect(agents).toContain("OPENAI_TTS_API_KEY");
    expect(agents).toContain("not the generic `OPENAI_API_KEY`");

    expect(nodeGuard).toContain("requireCodexOpenAiTtsOnly");
    expect(nodeGuard).toContain("CODEX_THREAD_ID");
    expect(nodeGuard).toContain("endpoint === 'audio/speech'");
    expect(pythonGuard).toContain("require_codex_openai_tts_only");
    expect(pythonGuard).toContain("CODEX_THREAD_ID");
    expect(pythonGuard).toContain('endpoint == "audio/speech"');

    for (const rel of [
      "scripts/ai-pr-reviewer.mjs",
      "scripts/generate-clean-onboarding-dalle-assets.mjs",
      "scripts/gustav_execute_fr_lesson_llm_review_batch.mjs",
      "functions/scripts/eval_explain_prompt.mjs",
      "tools/generate_youtube_pack_dalle.py",
      "tools/generate_chains_unique_phrase_pack_openai_v3.py",
      "tools/generate_chains_unique_explanations.py",
    ]) {
      expect(read(rel)).toContain(
        rel.endsWith(".py")
          ? "require_codex_openai_tts_only"
          : "requireCodexOpenAiTtsOnly",
      );
    }

    expect(read("scripts/generate_audio.mjs")).toContain("OPENAI_TTS_API_KEY");
    expect(read("scripts/regen_phrase_audio.mjs")).toContain(
      "OPENAI_TTS_API_KEY",
    );
    expect(read("tools/fix_venga_first_en_audio.py")).toContain(
      "OPENAI_TTS_API_KEY",
    );
    expect(read("tools/generate_chains_unique_explanations.py")).not.toContain(
      "OPENAI_TTS_API_KEY",
    );
  });

  test("the unified admin has a read-only OpenAI budget dashboard backed by billing collections", () => {
    const adminHtml = read("admin/legacy.html");
    const budgetFn = read("functions/src/openai_budget_dashboard.ts");

    expect(adminHtml).toContain('id="tab-openai-budget"');
    expect(adminHtml).toContain(
      "httpsCallable(functionsUs, 'openAiBudgetDashboard')",
    );
    expect(adminHtml).toContain(
      "window.loadOpenAiBudgetDashboard = async function loadOpenAiBudgetDashboard",
    );
    expect(adminHtml).toContain('id="openai-budget-summary"');
    expect(adminHtml).toContain('id="openai-budget-grid"');
    expect(adminHtml).toContain("OpenAI estimated month");
    expect(adminHtml).toContain(
      "httpsCallable(functionsUs, 'openAiDialogModelConfig')",
    );
    expect(adminHtml).toContain(
      "httpsCallable(functionsUs, 'openAiDialogQuotaConfig')",
    );
    expect(adminHtml).not.toContain("collection(db, 'premium_dialog_billing'");
    expect(adminHtml).not.toContain('collection(db, "premium_dialog_billing"');
    expect(budgetFn).toContain("request.auth?.token?.admin");
    // Дашборд должен покрывать ВСЕ billing-коллекции проекта (раньше было 4 из 11,
    // из-за чего суммарная цифра недосчитывала >60% трат). Проверяем каждую.
    const REQUIRED_BILLING_COLLECTIONS = [
      "premium_dialog_billing",
      "explain_billing",
      "weekly_review_billing",
      "stats_insights_billing",
      "compass_billing",
      "league_compass_daily_billing",
      "choice_explain_billing",
      "mistake_explain_billing",
      "tournament_ai_billing",
    ];
    for (const collectionName of REQUIRED_BILLING_COLLECTIONS) {
      expect(budgetFn).toContain(`collection: '${collectionName}'`);
    }
    // График расхода по дням (series) отдаётся клиенту.
    expect(budgetFn).toContain("series");
  });
});
