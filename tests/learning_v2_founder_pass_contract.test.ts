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

  // Владелец 20.09: «открываем раздел, запускается анимация которая была
  // прописана при входе — это всё, никаких морганий быть не должно».
  // Раздел НИКОГДА не прячется за модалом: пока чек читался с диска, экран
  // показывал пустую заглушку, а приход чека монтировал карту заново и
  // вступление играло второй раз. Модал лежит ПОВЕРХ открытого раздела.
  const pendingProduction = resolveLearningV2FounderPassGateV1({
    active: true,
    accountReady: false,
    receiptSeen: null,
    productionDismissed: false,
  });
  assert.deepEqual(pendingProduction, {
    visible: false,
    revealCourse: true,
    persistReceiptOnDismiss: true,
  }, "the course must be on screen while the one-time gate is still resolving");

  const firstProductionEntry = resolveLearningV2FounderPassGateV1({
    active: true,
    accountReady: true,
    receiptSeen: false,
    productionDismissed: false,
  });
  assert.equal(firstProductionEntry.visible, true);
  assert.equal(
    firstProductionEntry.revealCourse,
    true,
    "the modal must sit on top of the already-rendered course, never replace it",
  );
  assert.equal(firstProductionEntry.persistReceiptOnDismiss, true);

  const inactive = resolveLearningV2FounderPassGateV1({
    active: false,
    accountReady: true,
    receiptSeen: false,
    productionDismissed: false,
  });
  assert.equal(inactive.visible, false, "the modal must never show outside the section");

  // Владелец 20.09: «1 раз каждый юзер при входе может увидеть модал».
  // Имя НЕ условие показа: у человека без имени в профиле nicknameReady
  // оставался false навсегда и модал не показывался ни разу.
  const noNickname = resolveLearningV2FounderPassGateV1({
    active: true,
    accountReady: true,
    receiptSeen: false,
    productionDismissed: false,
  });
  assert.equal(
    noNickname.visible,
    true,
    "a learner without a profile name must still see the one-time modal",
  );

  // Владелец 20.09 отменил повтор модала в DEV: «теперь он должен и в дев
  // показываться только единожды». Прежнее правило (повтор на каждый вход)
  // дважды дало баг «модал вернулся после закрытия»: счётчик входа рос на
  // каждый фокус экрана, а dismiss в DEV выходил, не сохранив чек.
  const devAfterDismiss = resolveLearningV2FounderPassGateV1({
    active: true,
    accountReady: true,
    receiptSeen: true,
    productionDismissed: true,
  });
  assert.equal(devAfterDismiss.visible, false, "DEV must not replay the founder modal after it was dismissed");
  assert.equal(devAfterDismiss.revealCourse, true, "DEV must show the course once the modal was dismissed");
  assert.equal(devAfterDismiss.persistReceiptOnDismiss, true, "DEV dismiss must persist the receipt like production");

  // Закрытие оптимистично: productionDismissed гасит модал ещё до записи чека,
  // а курс при этом не мигает, потому что он и так был на экране.
  const optimisticDismiss = resolveLearningV2FounderPassGateV1({
    active: true,
    accountReady: true,
    receiptSeen: false,
    productionDismissed: true,
  });
  assert.equal(optimisticDismiss.visible, false);
  assert.equal(optimisticDismiss.revealCourse, true);

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
  // Раздел обязан рисоваться безусловно: никакой ветки, прячущей карту за
  // чеком, и никакой пустой заглушки вместо неё.
  assert.doesNotMatch(
    lessons,
    /learningV2FounderPassGate\.revealCourse \?/,
    "the course must never be hidden behind the founder modal",
  );
  assert.doesNotMatch(
    lessons,
    /learning-v2-founder-pass-gate/,
    "the empty placeholder that replaced the course must stay deleted",
  );
  // Безусловный сброс чека выполнялся на КАЖДЫЙ фокус и перерисовывал раздел.
  assert.doesNotMatch(
    lessons,
    // Только настоящий вызов в начале строки; useState-инициализатор и
    // объясняющий комментарий рядом — не нарушение.
    /^\s*setLearningV2FounderReceipt\(\{ accountScopeHash: null, seen: null \}\)/m,
    "resetting the receipt on every focus re-rendered the whole section",
  );
  // Дев-счётчики входа удалены: они дважды дали «модал вернулся после закрытия».
  assert.doesNotMatch(lessons, /devEntryOrdinal:/);
  assert.doesNotMatch(lessons, /setLearningV2FounderDevEntryOrdinal/);
  assert.doesNotMatch(
    lessons,
    /LearningV2FounderPassModal[\s\S]{0,800}nickname=\{(?:["']|triLang)/,
    "the modal must not fall back to a generic nickname",
  );
  // Модал рисуется безусловно: обёртка по нику гасила его у людей без имени.
  assert.doesNotMatch(
    lessons,
    /learningV2FounderNickname !== null \? \(/,
    "the modal must not be gated behind having a profile name",
  );
  // Без имени пропуск просто не печатает строку ника, а не исчезает.
  assert.match(modal, /nickname: string \| null/);
  assert.match(modal, /nickname \? \(/);

  console.log("LEARNING V2 FOUNDER PASS CONTRACT: PASS");
}

void main();
