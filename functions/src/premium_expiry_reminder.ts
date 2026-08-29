// ═══════════════════════════════════════════════════════════════════════════
// premium_expiry_reminder.ts — заботливое напоминание «твой Plus скоро истекает».
//
// Зачем: premium_expiry_cron.ts ГАСИТ уже просроченный доступ — это уборка
// постфактум. А тут — наоборот, ПРОФИЛАКТИКА оттока: за ~3 дня до конца платной
// подписки/VIP шлём тёплый push, чтобы человек успел осознанно продлить. Возврат
// уходящего подписчика дешевле привлечения нового — это самый быстрый рычаг MRR.
//
// Инвариант (зеркало premium_status/ premium_expiry_cron): напоминаем ТОЛЬКО про
// доступ с КОНКРЕТНЫМ серверным сроком в будущем. Бессрочное (lifetime, ручная
// выдача без срока, premium_expiry='0' без rc-срока, vip_until<=0) — НЕ трогаем:
// ему нечего «продлевать». Триал в это окно тоже попадёт (у него есть срок) — и
// это правильно: «после триала спишется» — честное, ожидаемое напоминание.
//
// Архитектура повторяет re_engage_push.ts: чистые функции отбора/текстов
// (unit-тестируемы без сети и Firestore) отделены от I/O (runPremiumExpiryReminder).
// Отправка — общий sendExpoPushMessages из admin_push_jobs.ts (тот же канал Expo).
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { parseProgressMs, type ProgressLike } from './premium_status';
import { isInQuietHours, isValidExpoPushToken } from './re_engage_push';
import { sendExpoPushMessages, type ExpoPushMessage } from './admin_push_jobs';

const DAY_MS = 24 * 60 * 60 * 1000;

// ── Политика окна напоминания ─────────────────────────────────────────────────
/** Нижняя граница: не раньше чем за 3 дня до конца (72ч). */
export const REMIND_MIN_MS = 3 * DAY_MS;
/** Верхняя граница: не позже чем за 4 дня (96ч) — окно ровно в одни сутки скана. */
export const REMIND_MAX_MS = 4 * DAY_MS;
/** Не повторять напоминание про один и тот же срок чаще раза в N дней (анти-спам). */
export const REMINDER_COOLDOWN_DAYS = 5;

const STORE_PLANS = new Set(['monthly', 'yearly', 'annual']);

function cleanStr(value: unknown): string {
  return String(value ?? '').trim();
}
function cleanPlan(value: unknown): string {
  return cleanStr(value).toLowerCase();
}
function isTruthyFlag(value: unknown): boolean {
  const v = cleanStr(value).toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}
function isFalsyFlag(value: unknown): boolean {
  const v = cleanStr(value).toLowerCase();
  return v === 'false' || v === '0' || v === 'no';
}
function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Что именно истекает — влияет на текст (подписка спишется / VIP-доступ закончится). */
export type ExpiringKind = 'subscription' | 'vip';

export interface ExpiryReminderUser {
  uid: string;
  expoPushToken?: string | null;
  pushTokenLang?: string | null;
  pushTokenTimezone?: string | null;
  progress: ProgressLike;
  lastExpiryReminderAt?: number | null; // users/{uid}.lastPremiumExpiryReminderAt (ms)
}

export interface ExpiryReminderCandidate {
  uid: string;
  token: string;
  lang: string;
  kind: ExpiringKind;
  subscriptionPlan?: 'plus' | 'max';
  /** До какого срока продлён доступ (ms) — для stamping (не слать повторно про тот же). */
  expiryMs: number;
}

/** Достаёт нужные поля из сырого Firestore-документа users/{uid}. */
export function parseExpiryReminderUser(
  uid: string,
  data: Record<string, unknown> | undefined,
): ExpiryReminderUser {
  return {
    uid,
    expoPushToken: typeof data?.expoPushToken === 'string' ? data.expoPushToken : null,
    pushTokenLang: typeof data?.pushTokenLang === 'string' ? data.pushTokenLang : null,
    pushTokenTimezone: typeof data?.pushTokenTimezone === 'string' ? data.pushTokenTimezone : null,
    progress: (data?.progress ?? {}) as Record<string, unknown>,
    lastExpiryReminderAt: num(data?.lastPremiumExpiryReminderAt),
  };
}

/**
 * Ближайший КОНКРЕТНЫЙ срок окончания платного доступа в БУДУЩЕМ (ms) и его тип,
 * либо null, если продлевать нечего (всё бессрочное / уже истекло / нет доступа).
 *
 * Зеркало семантики premium_status: store-план со сроком, либо VIP со сроком.
 * Бессрочное (expiry<=0 без rc-срока, vip_until<=0) осознанно исключаем.
 */
export function resolveExpiringAccess(
  progress: ProgressLike,
  now: number,
): { kind: ExpiringKind; expiryMs: number } | null {
  const data = progress ?? {};

  // ── Recurring store subscription (including MAX; lifetime is non-expiring) ──
  const plan = cleanPlan(data.premium_plan);
  const override = cleanStr(data.admin_premium_override).toLowerCase();
  if (STORE_PLANS.has(plan) && override !== 'true') {
    const expiryMs = parseProgressMs(data.premium_expiry);
    if (expiryMs > now) {
      // Конкретный собственный срок (напр. Telegram-оплата на период) в будущем.
      return { kind: 'subscription', expiryMs };
    }
    if (expiryMs <= 0) {
      // premium_expiry='0' = срок ведёт вебхук; авторитет — premium_rc_expiry_ms.
      // rc<=0 = бессрочный store-премиум (lifetime) → продлевать нечего.
      const rcExpiryMs = parseProgressMs(data.premium_rc_expiry_ms);
      if (rcExpiryMs > now) return { kind: 'subscription', expiryMs: rcExpiryMs };
    }
  }

  // ── VIP со сроком (рефералка / опрос / ручная выдача на период) ────────────────
  const vipRevoked = isFalsyFlag(data.vip_admin_override) || isFalsyFlag(data.vip_active);
  const vipGranted =
    isTruthyFlag(data.vip_active) ||
    isTruthyFlag(data.vip_admin_override) ||
    (cleanPlan(data.vip_plan) !== '' && cleanPlan(data.vip_plan) !== 'null');
  const vipUntilMs = parseProgressMs(data.vip_until ?? data.vip_expiry);
  if (!vipRevoked && vipGranted && vipUntilMs > now) {
    return { kind: 'vip', expiryMs: vipUntilMs };
  }

  return null;
}

/**
 * Решает, слать ли юзеру напоминание об истечении и по какому доступу.
 * Возвращает кандидата или null. Чистая функция.
 */
export function classifyExpiryReminder(
  u: ExpiryReminderUser,
  now: number,
): ExpiryReminderCandidate | null {
  if (!isValidExpoPushToken(u.expoPushToken)) return null;
  // Тихие часы 22:00–09:00 по локальному времени пользователя — не будим ночью.
  if (isInQuietHours(now, u.pushTokenTimezone)) return null;

  const access = resolveExpiringAccess(u.progress, now);
  if (!access) return null;

  // Окно [3, 4 дня) до конца: точечно за ~3 дня, ровно раз в сутки скана.
  const msLeft = access.expiryMs - now;
  if (msLeft < REMIND_MIN_MS || msLeft >= REMIND_MAX_MS) return null;

  // Анти-спам: уже напоминали недавно (в пределах cooldown) — пропускаем.
  // Cooldown (5 дней) > ширины окна (1 день), так что про один срок шлём один раз.
  if (
    u.lastExpiryReminderAt != null &&
    now - u.lastExpiryReminderAt < REMINDER_COOLDOWN_DAYS * DAY_MS
  ) {
    return null;
  }

  return {
    uid: u.uid,
    token: u.expoPushToken as string,
    lang: u.pushTokenLang || 'ru',
    kind: access.kind,
    ...(access.kind === 'subscription' ? {
      subscriptionPlan: 'plus',
    } : {}),
    expiryMs: access.expiryMs,
  };
}

/** Отбирает всех кандидатов на напоминание (чистая функция). */
export function selectExpiryReminderCandidates(
  users: ExpiryReminderUser[],
  now: number,
): ExpiryReminderCandidate[] {
  const out: ExpiryReminderCandidate[] = [];
  for (const u of users) {
    const c = classifyExpiryReminder(u, now);
    if (c) out.push(c);
  }
  return out;
}

// ── Локализованные тексты (8 языков, gain-framing, один эмодзи) ─────────────────
type Copy = { title: string; body: string };
const SUPPORTED_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type CopyLang = (typeof SUPPORTED_LANGS)[number];

function normLang(lang: string): CopyLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang) ? (lang as CopyLang) : 'ru';
}

// Подписка: мягко напоминаем, что скоро продление/списание — без давления и угроз.
const SUBSCRIPTION_COPY: Record<CopyLang, Copy> = {
  ru: { title: '💛 Твой Plus скоро продлится', body: 'Осталось около 3 дней. Если всё нравится — ничего делать не нужно, продолжаем вместе.' },
  uk: { title: '💛 Твій Plus скоро подовжиться', body: 'Лишилось близько 3 днів. Якщо все подобається — робити нічого не треба, продовжуємо разом.' },
  es: { title: '💛 Tu Plus se renovará pronto', body: 'Quedan unos 3 días. Si todo va bien, no tienes que hacer nada: seguimos juntos.' },
  'pt-BR': { title: '💛 Seu Plus vai renovar em breve', body: 'Faltam uns 3 dias. Se está tudo certo, não precisa fazer nada: seguimos juntos.' },
  vi: { title: '💛 Gói Plus của bạn sắp gia hạn', body: 'Còn khoảng 3 ngày. Nếu mọi thứ ổn, bạn không cần làm gì — ta tiếp tục cùng nhau.' },
  id: { title: '💛 Plus kamu akan segera diperpanjang', body: 'Tersisa sekitar 3 hari. Kalau semua baik, kamu tak perlu melakukan apa pun — kita lanjut bersama.' },
  tr: { title: '💛 Plus üyeliğin yakında yenilenecek', body: 'Yaklaşık 3 gün kaldı. Her şey yolundaysa bir şey yapmana gerek yok, birlikte devam ediyoruz.' },
  pl: { title: '💛 Twój Plus wkrótce się odnowi', body: 'Zostały około 3 dni. Jeśli wszystko gra, nie musisz nic robić — kontynuujemy razem.' },
};

const MAX_SUBSCRIPTION_COPY: Record<CopyLang, Copy> = {
  ru: { ...SUBSCRIPTION_COPY.ru, title: '💛 Твой MAX скоро продлится' },
  uk: { ...SUBSCRIPTION_COPY.uk, title: '💛 Твій MAX скоро подовжиться' },
  es: { ...SUBSCRIPTION_COPY.es, title: '💛 Tu MAX se renovará pronto' },
  'pt-BR': { ...SUBSCRIPTION_COPY['pt-BR'], title: '💛 Seu MAX vai renovar em breve' },
  vi: { ...SUBSCRIPTION_COPY.vi, title: '💛 Gói MAX của bạn sắp gia hạn' },
  id: { ...SUBSCRIPTION_COPY.id, title: '💛 MAX kamu akan segera diperpanjang' },
  tr: { ...SUBSCRIPTION_COPY.tr, title: '💛 MAX üyeliğin yakında yenilenecek' },
  pl: { ...SUBSCRIPTION_COPY.pl, title: '💛 Twój MAX wkrótce się odnowi' },
};

// VIP-доступ: не продлевается сам — мягко предупреждаем, что скоро закончится.
const VIP_COPY: Record<CopyLang, Copy> = {
  ru: { title: '💛 Твой доступ Plus скоро закончится', body: 'Осталось около 3 дней. Успей взять максимум — а захочешь остаться, продлить легко.' },
  uk: { title: '💛 Твій доступ Plus скоро завершиться', body: 'Лишилось близько 3 днів. Встигни взяти максимум — а схочеш лишитися, подовжити легко.' },
  es: { title: '💛 Tu acceso Plus termina pronto', body: 'Quedan unos 3 días. Aprovéchalo al máximo, y si quieres quedarte, renovar es fácil.' },
  'pt-BR': { title: '💛 Seu acesso Plus termina em breve', body: 'Faltam uns 3 dias. Aproveite ao máximo, e se quiser ficar, renovar é fácil.' },
  vi: { title: '💛 Quyền Plus của bạn sắp kết thúc', body: 'Còn khoảng 3 ngày. Tận dụng tối đa nhé, và nếu muốn ở lại, gia hạn rất dễ.' },
  id: { title: '💛 Akses Plus kamu akan segera berakhir', body: 'Tersisa sekitar 3 hari. Manfaatkan sepenuhnya, dan kalau mau tetap, memperpanjang itu mudah.' },
  tr: { title: '💛 Plus erişimin yakında sona erecek', body: 'Yaklaşık 3 gün kaldı. En iyi şekilde değerlendir; kalmak istersen yenilemek çok kolay.' },
  pl: { title: '💛 Twój dostęp Plus wkrótce się skończy', body: 'Zostały około 3 dni. Wykorzystaj go w pełni, a jeśli zechcesz zostać, odnowienie jest łatwe.' },
};

/** Локализованное сообщение для кандидата (чистая функция). */
export function buildExpiryReminderMessage(c: ExpiryReminderCandidate): ExpoPushMessage {
  const lang = normLang(c.lang);
  const copy = c.kind === 'vip'
    ? VIP_COPY[lang]
    : c.subscriptionPlan === 'max' ? MAX_SUBSCRIPTION_COPY[lang] : SUBSCRIPTION_COPY[lang];
  return {
    to: c.token,
    title: copy.title,
    body: copy.body,
    sound: 'default',
    data: { type: 'premium_expiry_reminder', kind: c.kind },
  };
}

// ── I/O: главный прогон cron ────────────────────────────────────────────────────
export interface ExpiryReminderSummary {
  scanned: number;
  candidates: number;
  sent: number;
  failed: number;
}

/**
 * Постраничный обход users/ С ФИЛЬТРОМ ПО НАЛИЧИЮ PUSH-ТОКЕНА (cursor по __name__):
 * отбирает кандидатов, шлёт push общим sendExpoPushMessages, штампует
 * lastPremiumExpiryReminderAt на успешных (идемпотентность + анти-спам).
 *
 * зачем orderBy('expoPushToken') (аудит 2026-08-26, экономия Firebase): раньше здесь
 * был скан ВСЕЙ коллекции users каждые сутки. Но первым же условием отбора стоит
 * `isValidExpoPushToken` (classifyExpiryReminder) — пользователь без токена не может
 * получить push В ПРИНЦИПЕ, и читать его документ бессмысленно. orderBy по полю
 * возвращает только документы, где поле СУЩЕСТВУЕТ, а при отзыве токена поле
 * физически удаляется (FieldValue.delete() в admin_push_jobs.ts / re_engage_push.ts),
 * а не обнуляется — значит выборка совпадает с множеством достижимых пользователей.
 * Вся дальнейшая фильтрация (валидность токена, тихие часы, окно срока, cooldown)
 * оставлена без изменений как страховка.
 */
export async function runPremiumExpiryReminder(
  now: number = Date.now(),
): Promise<ExpiryReminderSummary> {
  const db = admin.firestore();
  const PAGE_SIZE = 500;
  const STAMP_BATCH = 400;

  let scanned = 0;
  const allCandidates: ExpiryReminderCandidate[] = [];
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  // 1) Scan + отбор.
  for (;;) {
    let q: FirebaseFirestore.Query = db.collection('users')
      .orderBy('expoPushToken')
      .orderBy('__name__')
      .limit(PAGE_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;
    lastDoc = snap.docs[snap.docs.length - 1];

    const pageUsers = snap.docs.map((d) =>
      parseExpiryReminderUser(d.id, d.data() as Record<string, unknown>),
    );
    scanned += pageUsers.length;
    allCandidates.push(...selectExpiryReminderCandidates(pageUsers, now));

    if (snap.size < PAGE_SIZE) break;
  }

  if (allCandidates.length === 0) {
    return { scanned, candidates: 0, sent: 0, failed: 0 };
  }

  // 2) Отправка (общий хелпер сам чанкует по 100 и собирает сводку).
  const messages = allCandidates.map(buildExpiryReminderMessage);
  const uids = allCandidates.map((c) => c.uid);
  const sendSummary = await sendExpoPushMessages(messages, uids);

  // 3) Штампуем ВСЕХ кандидатов (важно: штампуем и тех, чей токен протух —
  //    иначе на следующем прогоне зря пересчитаем; пере-слать в это же 1-дневное
  //    окно всё равно не дадут cooldown и сдвиг expiry). Пишем и expiry-срок,
  //    про который напомнили, — для форензики.
  let batch = db.batch();
  let stamped = 0;
  for (const c of allCandidates) {
    batch.set(
      db.collection('users').doc(c.uid),
      { lastPremiumExpiryReminderAt: now, lastPremiumExpiryReminderForMs: c.expiryMs },
      { merge: true },
    );
    stamped++;
    if (stamped % STAMP_BATCH === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (stamped % STAMP_BATCH !== 0) await batch.commit();

  return {
    scanned,
    candidates: allCandidates.length,
    sent: sendSummary.sentCount,
    failed: sendSummary.failedCount,
  };
}
