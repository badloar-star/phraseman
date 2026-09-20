export const LEARNING_V2_FOUNDER_PASS_VERSION = "founder-pass-v1" as const;

type FounderPassStorageV1 = Readonly<{
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}>;

export type LearningV2FounderPassGateInputV1 = Readonly<{
  active: boolean;
  // зачем: дев больше не отличается от прода — модал показывается один раз
  // и там, и там. Поле оставлено необязательным, чтобы старые вызовы и тесты
  // не падали; логика его не читает.
  isDev?: boolean;
  // зачем: владелец 20.09 — «1 раз каждый юзер при входе может увидеть модал».
  // nicknameReady БОЛЬШЕ НЕ УСЛОВИЕ показа: у человека без имени в профиле оно
  // оставалось false навсегда, и модал не показывался ни разу. Имя — украшение
  // пропуска, а не пропуск на модал. Поле необязательное и не читается.
  nicknameReady?: boolean;
  accountReady: boolean;
  receiptSeen: boolean | null;
  productionDismissed: boolean;
}>;

export function resolveLearningV2FounderPassGateV1(
  input: LearningV2FounderPassGateInputV1,
): Readonly<{
  visible: boolean;
  revealCourse: boolean;
  persistReceiptOnDismiss: boolean;
}> {
  // Ждём ТОЛЬКО аккаунт: без него неизвестно, чей это чек. Имя не ждём.
  const identityReady = input.accountReady;
  // зачем: владелец 20.09 — «открываем раздел, запускается анимация которая
  // была прописана при входе, это всё, никаких морганий быть не должно».
  // Курс ОТКРЫТ ВСЕГДА, как только раздел активен: revealCourse больше не
  // зависит ни от чека, ни от личности. Раньше он был false, пока чек
  // читался с диска, и экран показывал пустую заглушку; когда чек приходил,
  // карта монтировалась заново и вступление проигрывалось второй раз — это
  // и видел владелец как «моргает и открывается дважды».
  // Модал теперь ложится ПОВЕРХ уже отрисованного раздела и ничего не прячет.
  if (!input.active) {
    return { visible: false, revealCourse: false, persistReceiptOnDismiss: true };
  }
  const gateResolved = identityReady && input.receiptSeen !== null;
  const dismissed = input.productionDismissed || input.receiptSeen === true;
  return {
    visible: gateResolved && !dismissed,
    revealCourse: true,
    persistReceiptOnDismiss: true,
  };
}

export function normalizeLearningV2FounderNicknameV1(
  value: unknown,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/^@+/, "").trim();
  return normalized.length > 0 ? normalized : null;
}

export function learningV2FounderPassReceiptKeyV1(
  accountScopeHash: string,
): string {
  const normalized = accountScopeHash.trim();
  if (!normalized) throw new Error("learning_v2_founder_pass_scope_missing");
  return `learning_v2_release_intro:${LEARNING_V2_FOUNDER_PASS_VERSION}:${normalized}`;
}

export async function readLearningV2FounderPassReceiptV1(
  storage: FounderPassStorageV1,
  accountScopeHash: string,
): Promise<boolean> {
  return (await storage.getItem(
    learningV2FounderPassReceiptKeyV1(accountScopeHash),
  )) === LEARNING_V2_FOUNDER_PASS_VERSION;
}

export async function writeLearningV2FounderPassReceiptV1(
  storage: FounderPassStorageV1,
  accountScopeHash: string,
): Promise<void> {
  await storage.setItem(
    learningV2FounderPassReceiptKeyV1(accountScopeHash),
    LEARNING_V2_FOUNDER_PASS_VERSION,
  );
}
