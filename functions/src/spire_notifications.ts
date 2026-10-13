// ═══════════════════════════════════════════════════════════════════════════
// spire_notifications.ts — общие чистые куски для двух пушей Шпиля (PM-281).
//
// зачем (владелец 2026-09-24, TOWER.md T30/§4.7): «Пуши: понедельник (итог +
// новый шпиль), воскресенье (у края зоны). Больше ничего.» Этот модуль несёт
// то, что нужно ОБОИМ пушам — имена камней (12 шпилей) на языке интерфейса и
// общий отправитель через Expo Push API — чтобы не разводить два почти
// одинаковых куска в spire_week_result_push.ts и spire_zone_warning_push.ts.
//
// Имена камней — копия SPIRE_TIER_NAMES из modules/spire/tier_names.ts:
// functions/tsconfig.json ограничен include:["src"], импорт из modules/
// невозможен (та же граница, что у spire_config_contract.ts/spire_residents.ts
// — см. их шапки). Порядок менять НЕЛЬЗЯ (tier хранится числом). Сторож
// зеркала — spire_notifications_tier_names_mirror.test.ts (сверяет с client).
//
// Чистый модуль (имена/тексты) + один сетевой хелпер (sendExpoPushChunk),
// как в re_engage_push.ts/tournament_start_push.ts — вызывающий код кронов
// остаётся тонким и делает I/O (Firestore), а тексты и отбор кандидатов
// покрываются unit-тестами без сети.
// ═══════════════════════════════════════════════════════════════════════════

/** Сколько шпилей — равно числу лиг (условие переноса без потерь, T16/T29). */
export const SPIRE_PUSH_TIER_COUNT = 12;

/** Языки интерфейса, для которых есть готовый текст пушей (как у остальных серверных пушей). */
const SUPPORTED_PUSH_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
export type SpirePushLang = (typeof SUPPORTED_PUSH_LANGS)[number];

/**
 * зачем (владелец 11.10, по симуляции SPIRE_SIMULATION_2026-10-11): Шпиль в первом выпуске только для интерфейса
 * ru и uk — тексты пушей Шпиля есть только на них. Остальным пуши Шпиля не шлём вовсе (пропуск с причиной),
 * а не русский текст. Список расширяется вместе с переводами и клиентским SPIRE_UI_LANGS.
 */
export const SPIRE_PUSH_UI_LANGS: readonly string[] = Object.freeze(['ru', 'uk']);
export function isSpirePushUiLangAllowed(lang: string | null | undefined): boolean {
  return typeof lang === 'string' && SPIRE_PUSH_UI_LANGS.includes(lang);
}

export function normalizeSpirePushLang(lang: string | null | undefined): SpirePushLang {
  return (SUPPORTED_PUSH_LANGS as readonly string[]).includes(lang ?? '')
    ? (lang as SpirePushLang)
    : 'ru';
}

/** Имена 12 шпилей-камней (T29). Индекс = tier (0 = Гранит … 11 = Алмаз). */
export const SPIRE_PUSH_TIER_NAMES: Readonly<Record<SpirePushLang, readonly string[]>> = Object.freeze({
  ru: Object.freeze(['Гранит', 'Базальт', 'Мрамор', 'Нефрит', 'Кварц', 'Агат', 'Оникс', 'Аметист', 'Опал', 'Топаз', 'Обсидиан', 'Алмаз']),
  uk: Object.freeze(['Граніт', 'Базальт', 'Мармур', 'Нефрит', 'Кварц', 'Агат', 'Онікс', 'Аметист', 'Опал', 'Топаз', 'Обсидіан', 'Алмаз']),
  en: Object.freeze(['Granite', 'Basalt', 'Marble', 'Jade', 'Quartz', 'Agate', 'Onyx', 'Amethyst', 'Opal', 'Topaz', 'Obsidian', 'Diamond']),
  es: Object.freeze(['Granito', 'Basalto', 'Mármol', 'Jade', 'Cuarzo', 'Ágata', 'Ónix', 'Amatista', 'Ópalo', 'Topacio', 'Obsidiana', 'Diamante']),
  'pt-BR': Object.freeze(['Granito', 'Basalto', 'Mármore', 'Jade', 'Quartzo', 'Ágata', 'Ônix', 'Ametista', 'Opala', 'Topázio', 'Obsidiana', 'Diamante']),
  vi: Object.freeze(['Đá granit', 'Đá bazan', 'Cẩm thạch', 'Ngọc bích', 'Thạch anh', 'Mã não', 'Mã não đen', 'Thạch anh tím', 'Đá opal', 'Hoàng ngọc', 'Đá vỏ chai', 'Kim cương']),
  id: Object.freeze(['Granit', 'Basal', 'Marmer', 'Giok', 'Kuarsa', 'Akik', 'Oniks', 'Kecubung', 'Opal', 'Topas', 'Obsidian', 'Berlian']),
  tr: Object.freeze(['Granit', 'Bazalt', 'Mermer', 'Yeşim', 'Kuvars', 'Akik', 'Oniks', 'Ametist', 'Opal', 'Topaz', 'Obsidyen', 'Elmas']),
  pl: Object.freeze(['Granit', 'Bazalt', 'Marmur', 'Nefryt', 'Kwarc', 'Agat', 'Onyks', 'Ametyst', 'Opal', 'Topaz', 'Obsydian', 'Diament']),
});

export function clampSpirePushTier(tier: unknown): number {
  const n = Math.trunc(Number(tier));
  return Number.isFinite(n) ? Math.max(0, Math.min(SPIRE_PUSH_TIER_COUNT - 1, n)) : 0;
}

/** Имя шпиля на языке интерфейса (fallback — ru, как и весь остальной текст пушей проекта). */
export function spirePushTierName(tier: unknown, lang: string | null | undefined): string {
  const names = SPIRE_PUSH_TIER_NAMES[normalizeSpirePushLang(lang)];
  return names[clampSpirePushTier(tier)];
}

// ── Общий отправитель Expo Push (I/O) ────────────────────────────────────────
export interface SpireExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data: Record<string, unknown>;
}

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

/** Валиден ли Expo push token — та же проверка, что в re_engage_push.ts/tournament_start_push.ts. */
export function isValidSpireExpoPushToken(token: unknown): token is string {
  return typeof token === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(token.trim());
}

/** Разбивка на чанки — Expo Push API принимает до 100 сообщений за раз. */
export function chunkSpirePushMessages<T>(items: readonly T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Один HTTP-вызов Expo Push API на чанк ≤100 сообщений. */
export async function sendSpireExpoPushChunk(chunk: SpireExpoPushMessage[]): Promise<void> {
  const res = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(chunk),
  });
  if (!res.ok) throw new Error(`spire_expo_push_http_${res.status}`);
}

// ── Право на пуш и идемпотентность (PM-200) ──────────────────────────────────
export type SpirePushPrefs = Readonly<{ league?: boolean; streak?: boolean }>;

/** Достаёт из users/{uid}.pushPrefs только булевы league/streak; мусор игнорирует. */
export function readSpirePushPrefs(raw: unknown): SpirePushPrefs | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const league = typeof source.league === 'boolean' ? source.league : undefined;
  const streak = typeof source.streak === 'boolean' ? source.streak : undefined;
  if (league === undefined && streak === undefined) return null;
  return { ...(league !== undefined ? { league } : {}), ...(streak !== undefined ? { streak } : {}) };
}

/**
 * Выключил ли человек пуши Шпиля.
 *
 * зачем: PM-200 — пуши Шпиля смотрели только на `pushPrefs.league`, но клиент
 * это поле НЕ пишет и тумблера «Лига»/«Шпиль» в разделе «Уведомления» нет:
 * отключить их было нельзя ничем, кроме отзыва токена. Новый тумблер — это
 * новый UI (зона сессии Дизайн), поэтому берём ближайшую СУЩЕСТВУЮЩУЮ
 * категорию, которую клиент зеркалит на сервер: `pushPrefs.streak`
 * (= мастер-тумблер && «Серия под угрозой»). Шпиль — недельная мотивация
 * вернуться и позаниматься, того же рода, что напоминания о серии;
 * «Скидки и предложения» (offers) — про деньги, не подходит. Выключенный
 * мастер-тумблер даёт streak=false — значит общий «выкл» тоже работает.
 * `league === false` читаем дальше для обратной совместимости.
 * Нет поля = старый клиент = слать (как у остальных серверных пушей).
 */
export function isSpirePushOptedOut(prefs: SpirePushPrefs | null | undefined): boolean {
  // зачем (11.10, profile-006): у Шпиля появился свой тумблер «События Шпиля» → клиент пишет pushPrefs.league
  // (= мастер && тумблер). Если поле есть — решает только оно: иначе человек, выключивший «Серию под угрозой»,
  // молча терял и пуши Шпиля, хотя их тумблер включён. Нет поля (старый клиент) — прежнее правило через streak.
  if (typeof prefs?.league === 'boolean') return prefs.league === false;
  return prefs?.streak === false;
}

/** Поля-метки «уже отправлено за эту неделю» в users/{uid} (значение = weekId). */
export const SPIRE_WEEK_RESULT_PUSH_MARK_FIELD = 'spireWeekResultPushWeekId' as const;
export const SPIRE_ZONE_WARNING_PUSH_MARK_FIELD = 'spireZoneWarningPushWeekId' as const;

export function readSpirePushMark(data: Record<string, unknown> | undefined, field: string): string | null {
  const value = data?.[field];
  return typeof value === 'string' && value ? value : null;
}

/**
 * Ставит метку weekId тем, кому пуш реально ушёл (чанк принят Expo).
 *
 * зачем: PM-200 — повторный (ручной или retry) прогон крона слал тот же пуш
 * второй раз: ключа недели не было. Метка живёт в users/{uid}, который крон
 * и так читает через getAll ради токена, — проверка бесплатная, а цена — одна
 * запись на отправленный пуш в неделю (батчами по 400).
 */
export async function stampSpirePushMarks(
  db: FirebaseFirestore.Firestore,
  uids: readonly string[],
  field: string,
  weekId: string,
): Promise<number> {
  const BATCH = 400;
  let stamped = 0;
  for (let i = 0; i < uids.length; i += BATCH) {
    const batch = db.batch();
    for (const uid of uids.slice(i, i + BATCH)) {
      batch.set(db.collection('users').doc(uid), { [field]: weekId }, { merge: true });
    }
    await batch.commit();
    stamped += Math.min(BATCH, uids.length - i);
  }
  return stamped;
}
