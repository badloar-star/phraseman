const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appPath = require.resolve("../knowly-www/english-level-test/app.js");
const i18nPath = path.join(path.dirname(appPath), "i18n.js");
const htmlPath = path.join(path.dirname(appPath), "index.html");

function loadI18nRegistry() {
  const context = vm.createContext({ URL, URLSearchParams });
  vm.runInContext(fs.readFileSync(i18nPath, "utf8"), context, { filename: i18nPath });
  return context.EnglishTestI18n;
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    value: (key) => values.get(key),
    keys: () => [...values.keys()],
  };
}

function loadHooks({ fetchImpl, storage = memoryStorage(), uiLocale = "ru" } = {}) {
  let source = fs.readFileSync(appPath, "utf8");
  source = source.replace(
    /\s+renderLanding\(\);\s*\}\)\(\);\s*$/,
    `\n  globalThis.__counterHooks = {\n      queueCompletion, flushCompletionOutbox, reportTestCompletion, applyCompletedCount, refreshLandingCounter,\n      getPendingIdsForTest() { return typeof pendingCompletionIds === 'function' ? pendingCompletionIds() : readCompletionOutbox(); },\n      setState(value) { consent = value.consent; attemptToken = value.attemptToken; },\n      activateLandingForTest(node) { currentView = node; landingCounterNode = node; }\n    };\n  })();`,
  );
  const context = {
    console,
    TextEncoder,
    URL,
    JSON,
    Date,
    Promise,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (callback) => callback(1000),
    cancelAnimationFrame: () => {},
    performance: { now: () => 0 },
    fetch: fetchImpl || (async () => ({ ok: false, json: async () => null })),
    localStorage: storage,
    navigator: { language: uiLocale === "ru" ? "ru-RU" : "en-US", userAgent: "test" },
    location: { href: `https://example.test/level?ui=${uiLocale}`, get search() { return new URL(this.href).search; } },
    history: { replaceState() {} },
    screen: { width: 100, height: 100 },
    crypto: { subtle: {}, getRandomValues: (value) => value.fill(1) },
    document: { getElementById: () => ({}), addEventListener: () => {} },
    window: {
      matchMedia: () => ({ matches: true }),
      addEventListener: () => {},
      removeEventListener: () => {},
      scrollTo: () => {},
    },
  };
  context.globalThis = context;
  vm.runInNewContext(fs.readFileSync(i18nPath, "utf8"), context, { filename: i18nPath });
  vm.runInNewContext(source, context, { filename: appPath });
  return { hooks: context.__counterHooks, storage };
}

test("completion POST is sent even when analytics consent is false and contains no analytics fields", async () => {
  const requests = [];
  const { hooks } = loadHooks({
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        json: async () => ({ ok: true, completed: 124001, duplicate: false }),
      };
    },
  });
  hooks.setState({ consent: false, attemptToken: "a".repeat(48) });
  hooks.reportTestCompletion();
  await hooks.flushCompletionOutbox();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/english-test");
  const body = JSON.parse(requests[0].options.body);
  assert.deepEqual(body, {
    action: "count_complete",
    completionId: "a".repeat(48),
  });
});

test("outbox keeps a pending completion after network failure", async () => {
  const { hooks } = loadHooks({
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });
  hooks.queueCompletion("b".repeat(48));
  await hooks.flushCompletionOutbox();
  assert.deepEqual(Array.from(hooks.getPendingIdsForTest()), ["b".repeat(48)]);
});

test("outbox removes a pending completion only after an accepted or duplicate 2xx response", async () => {
  const storage = memoryStorage();
  const { hooks } = loadHooks({
    storage,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ ok: true, completed: 124001, duplicate: true }),
    }),
  });
  hooks.queueCompletion("c".repeat(48));
  await hooks.flushCompletionOutbox();
  assert.equal(
    storage.keys().some((key) => key.includes("c".repeat(48))),
    false,
  );
  const legacyValue = storage.value("english_test_completion_outbox_v1");
  assert.ok(legacyValue === undefined || legacyValue === "[]");
});

test("storage SecurityError still keeps completion in memory and POSTs immediately", async () => {
  const requests = [];
  const denied = () => {
    const error = new Error("denied");
    error.name = "SecurityError";
    throw error;
  };
  const storage = {
    get length() {
      return denied();
    },
    key: denied,
    getItem: denied,
    setItem: denied,
    removeItem: denied,
  };
  const { hooks } = loadHooks({
    storage,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        json: async () => ({ ok: true, completed: 124001, duplicate: false }),
      };
    },
  });
  hooks.setState({ consent: false, attemptToken: "d".repeat(48) });
  hooks.reportTestCompletion();
  await hooks.flushCompletionOutbox();
  assert.equal(requests.length, 1);
});

test("outbox retains more than twenty offline completions without eviction", () => {
  const { hooks } = loadHooks();
  for (let index = 0; index < 25; index += 1) {
    hooks.queueCompletion(index.toString(16).padStart(48, "0"));
  }
  assert.equal(hooks.getPendingIdsForTest().length, 25);
});

test("two tabs use distinct per-completion keys instead of overwriting an outbox blob", () => {
  const storage = memoryStorage();
  const firstTab = loadHooks({ storage }).hooks;
  const secondTab = loadHooks({ storage }).hooks;
  firstTab.queueCompletion("e".repeat(48));
  secondTab.queueCompletion("f".repeat(48));
  const pendingKeys = storage
    .keys()
    .filter((key) => key.startsWith("english_test_completion_pending_v1:"));
  assert.equal(pendingKeys.length, 2);
  assert.equal(firstTab.getPendingIdsForTest().length, 2);
  assert.equal(secondTab.getPendingIdsForTest().length, 2);
});

test("legacy array outbox migrates to per-completion keys without dropping IDs", () => {
  const first = "1".repeat(48);
  const second = "2".repeat(48);
  const storage = memoryStorage({
    english_test_completion_outbox_v1: JSON.stringify([first, second]),
  });
  const { hooks } = loadHooks({ storage });
  assert.deepEqual(Array.from(hooks.getPendingIdsForTest()).sort(), [
    first,
    second,
  ]);
  assert.equal(storage.value("english_test_completion_outbox_v1"), undefined);
  assert.equal(
    storage
      .keys()
      .filter((key) => key.startsWith("english_test_completion_pending_v1:"))
      .length,
    2,
  );
});

test("accepted legacy completion is not requeued when legacy persistence and removal fail", async () => {
  const completionId = "3".repeat(48);
  let requestCount = 0;
  const storage = {
    get length() {
      return 1;
    },
    key: () => "english_test_completion_outbox_v1",
    getItem: (key) =>
      key === "english_test_completion_outbox_v1"
        ? JSON.stringify([completionId])
        : null,
    setItem() {
      throw new Error("quota denied");
    },
    removeItem() {
      throw new Error("removal denied");
    },
  };
  const { hooks } = loadHooks({
    storage,
    fetchImpl: async () => {
      requestCount += 1;
      if (requestCount > 1) throw new Error("duplicate hot loop");
      return {
        ok: true,
        json: async () => ({ ok: true, completed: 124001, duplicate: false }),
      };
    },
  });
  await hooks.flushCompletionOutbox();
  assert.equal(requestCount, 1);
  assert.deepEqual(Array.from(hooks.getPendingIdsForTest()), []);
});

test("landing applies the server completion total to visible text and truthful ARIA copy", () => {
  const { hooks } = loadHooks();
  const counter = { textContent: "124 000" };
  const wrapper = {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
  const landing = {
    querySelector(selector) {
      if (selector === "#proofCounter") return counter;
      if (selector === ".elt-counter") return wrapper;
      return null;
    },
  };
  hooks.applyCompletedCount(landing, 124321);
  assert.equal(Number(counter.textContent.replace(/\D/g, "")), 124321);
  assert.match(wrapper.attributes["aria-label"], /124[\s\u00a0]?321/);
  assert.match(wrapper.attributes["aria-label"], /\u0443\u0447\u0435\u043d\u0438\u043a\u043e\u0432.*\u0443\u0440\u043e\u0432\u0435\u043d\u044c/i);
});

test("late counter updates retain the active UI locale in visible and ARIA text", async () => {
  for (const [uiLocale, expectedNumber, expectedCopy] of [
    ["ru", /124[\s\u00a0]321/, /учеников уже проверили свой уровень/i],
    ["en", /124,321/, /learners have already checked their level/i],
  ]) {
    const { hooks } = loadHooks({
      uiLocale,
      fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true, completed: 124321 }) }),
    });
    const counter = { textContent: "0" };
    const wrapper = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
    const landing = { isConnected: true, querySelector(selector) { return selector === "#proofCounter" ? counter : wrapper; } };
    hooks.activateLandingForTest(landing);
    await hooks.refreshLandingCounter(landing);
    assert.match(counter.textContent, expectedNumber);
    assert.match(wrapper.attributes["aria-label"], expectedNumber);
    assert.match(wrapper.attributes["aria-label"], expectedCopy);
  }
});

test("parallel refresh requests for the same visible landing share one GET", async () => {
  let requestCount = 0;
  let resolveResponse;
  const responsePromise = new Promise((resolve) => {
    resolveResponse = resolve;
  });
  const { hooks } = loadHooks({
    fetchImpl: async () => {
      requestCount += 1;
      return responsePromise;
    },
  });
  const counter = { textContent: "124 000" };
  const landing = {
    isConnected: true,
    querySelector(selector) {
      if (selector === "#proofCounter") return counter;
      if (selector === ".elt-counter") return { setAttribute() {} };
      return null;
    },
  };
  hooks.activateLandingForTest(landing);
  const first = hooks.refreshLandingCounter(landing);
  const second = hooks.refreshLandingCounter(landing);
  assert.equal(requestCount, 1);
  resolveResponse({
    ok: true,
    json: async () => ({ ok: true, completed: 124002 }),
  });
  await Promise.all([first, second]);
});

test("landing copy describes completed tests and the unified asset revision is 20260801-2", () => {
  const source = fs.readFileSync(appPath, "utf8");
  const html = fs.readFileSync(htmlPath, "utf8");
  const counterBlock =
    source.match(/<div class="elt-counter"[\s\S]*?<\/div>/)?.[0] || "";
  assert.match(counterBlock, /copy\('socialProof\.text'/);
  assert.doesNotMatch(
    counterBlock,
    /\u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0432 \u0443\u0436\u0435 \u0432\u044b\u0434\u0430\u043d\u043e/i,
  );
  assert.match(source, /fetch\(EnglishTestI18n\.TESTS\[language\]\.bankUrl\)/);
  assert.doesNotMatch(source, /const BANK_URL/);
  const i18n = loadI18nRegistry();
  assert.deepEqual([...i18n.TEST_LANGUAGES], ["en", "de", "fr", "it", "es"]);
  for (const code of i18n.TEST_LANGUAGES) assert.equal(i18n.TESTS[code].bankUrl, `./data/questions.${code}.json?v=20260801-2`);
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((match) => match[1]);
  const expectedScripts = [
    "./engine.js?v=20260801-2",
    "./i18n.js?v=20260801-2",
    "./certificate.js?v=20260801-2",
    "./app.js?v=20260801-2",
  ];
  assert.deepEqual(scripts, expectedScripts);
  assert.equal(new Set(scripts).size, expectedScripts.length);
  const stylesheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1]);
  const expectedStylesheets = [
    "./styles.css?v=20260801-2",
    "/assets/site-background.css?v=20260729-1",
  ];
  assert.deepEqual(stylesheets, expectedStylesheets);
  assert.equal(new Set(stylesheets).size, expectedStylesheets.length);
  assert.deepEqual(
    stylesheets.filter((asset) => asset.endsWith("?v=20260801-2")),
    ["./styles.css?v=20260801-2"],
  );
  assert.equal(stylesheets[1], "/assets/site-background.css?v=20260729-1");
  assert.equal(html.includes("?v=20260801-1"), false);
  assert.equal((html.match(/v=20260722-1/g) || []).length, 0);
});
