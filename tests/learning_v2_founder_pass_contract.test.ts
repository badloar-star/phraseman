import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LEARNING_V2_FOUNDER_PASS_VERSION,
  learningV2FounderPassReceiptKeyV1,
  normalizeLearningV2FounderNicknameV1,
  readLearningV2FounderPassReceiptV1,
  resolveLearningV2FounderPassGateV1,
  writeLearningV2FounderPassReceiptV1,
} from "../app/learning_v2_release_intro_receipt_v1";

const memory = new Map<string, string>();
const storage = {
  getItem: async (key: string) => memory.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    memory.set(key, value);
  },
};

async function main(): Promise<void> {
  assert.equal(LEARNING_V2_FOUNDER_PASS_VERSION, "founder-pass-v1");
  assert.equal(normalizeLearningV2FounderNicknameV1("  @Alex  "), "Alex");
  assert.equal(normalizeLearningV2FounderNicknameV1("   "), null);
  assert.notEqual(
    learningV2FounderPassReceiptKeyV1("account-a"),
    learningV2FounderPassReceiptKeyV1("account-b"),
    "receipt must be account-scoped",
  );
  assert.equal(await readLearningV2FounderPassReceiptV1(storage, "account-a"), false);
  await writeLearningV2FounderPassReceiptV1(storage, "account-a");
  assert.equal(await readLearningV2FounderPassReceiptV1(storage, "account-a"), true);
  assert.equal(await readLearningV2FounderPassReceiptV1(storage, "account-b"), false);

  const pendingProduction = resolveLearningV2FounderPassGateV1({
    active: true,
    isDev: false,
    nicknameReady: false,
    accountReady: false,
    receiptSeen: null,
    productionDismissed: false,
    devEntryOrdinal: 0,
    devDismissedEntryOrdinal: 0,
  });
  assert.deepEqual(pendingProduction, {
    visible: false,
    revealCourse: false,
    persistReceiptOnDismiss: true,
  }, "production must not reveal the lesson list before the one-time gate resolves");

  const firstProductionEntry = resolveLearningV2FounderPassGateV1({
    active: true,
    isDev: false,
    nicknameReady: true,
    accountReady: true,
    receiptSeen: false,
    productionDismissed: false,
    devEntryOrdinal: 0,
    devDismissedEntryOrdinal: 0,
  });
  assert.equal(firstProductionEntry.visible, true);
  assert.equal(firstProductionEntry.revealCourse, false);
  assert.equal(firstProductionEntry.persistReceiptOnDismiss, true);

  // Владелец 20.09 отменил повтор модала в DEV: «теперь он должен и в дев
  // показываться только единожды». Прежнее правило (повтор на каждый вход)
  // дважды дало баг «модал вернулся после закрытия»: счётчик входа рос на
  // каждый фокус экрана, а dismiss в DEV выходил, не сохранив чек.
  const devAfterDismiss = resolveLearningV2FounderPassGateV1({
    active: true,
    isDev: true,
    nicknameReady: true,
    accountReady: true,
    receiptSeen: true,
    productionDismissed: true,
    devEntryOrdinal: 7,
    devDismissedEntryOrdinal: 6,
  });
  assert.equal(devAfterDismiss.visible, false, "DEV must not replay the founder modal after it was dismissed");
  assert.equal(devAfterDismiss.revealCourse, true, "DEV must show the course once the modal was dismissed");
  assert.equal(devAfterDismiss.persistReceiptOnDismiss, true, "DEV dismiss must persist the receipt like production");
  // Счётчики входа больше ни на что не влияют.
  assert.equal(resolveLearningV2FounderPassGateV1({
    active: true,
    isDev: true,
    nicknameReady: true,
    accountReady: true,
    receiptSeen: true,
    productionDismissed: true,
    devEntryOrdinal: 7,
    devDismissedEntryOrdinal: 7,
  }).revealCourse, true);

  const modal = readFileSync("components/learning-v2/LearningV2FounderPassModal.tsx", "utf8");
  assert.match(modal, /@\{nickname\}/, "the founder pass must render the real nickname");
  assert.match(modal, /Мы открыли курс до завершения работ/);
  assert.match(modal, /оценку.+комментарий/);
  assert.match(modal, /useNativeDriver:\s*true/, "modal motion must stay on the native driver");
  assert.doesNotMatch(modal, /0001/, "internal founder pass number must never be visible");

  const mockup = readFileSync(
    "docs/v2/mockups/2026-09-19-learning-v2-release-modal/index.html",
    "utf8",
  );
  assert.doesNotMatch(mockup, /0001/);
  assert.match(mockup, /data-user-nickname/);
  assert.match(mockup, /URLSearchParams\(location\.search\).*nickname/);

  const lessons = readFileSync("app/(tabs)/lessons.tsx", "utf8");
  assert.match(lessons, /LearningV2FounderPassModal/);
  assert.match(lessons, /profile\?\.name/);
  assert.match(lessons, /writeLearningV2FounderPassReceiptV1/);
  assert.match(lessons, /learningV2FounderPassGate\.revealCourse/);
  assert.match(
    lessons,
    /setLearningV2FounderReceipt\(\{ accountScopeHash: null, seen: null \}\)/,
    "each entry must close the gate before resolving the current account receipt",
  );
  assert.doesNotMatch(
    lessons,
    /LearningV2FounderPassModal[\s\S]{0,800}nickname=\{(?:["']|triLang)/,
    "the modal must not fall back to a generic nickname",
  );

  console.log("LEARNING V2 FOUNDER PASS CONTRACT: PASS");
}

void main();
