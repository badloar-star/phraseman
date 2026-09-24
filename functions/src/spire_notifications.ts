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
const SUPPORTED_PUSH_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
export type SpirePushLang = (typeof SUPPORTED_PUSH_LANGS)[number];

export function normalizeSpirePushLang(lang: string | null | undefined): SpirePushLang {
  return (SUPPORTED_PUSH_LANGS as readonly string[]).includes(lang ?? '')
    ? (lang as SpirePushLang)
    : 'ru';
}

/** Имена 12 шпилей-камней (T29). Индекс = tier (0 = Гранит … 11 = Алмаз). */
export const SPIRE_PUSH_TIER_NAMES: Readonly<Record<SpirePushLang, readonly string[]>> = Object.freeze({
  ru: Object.freeze(['Гранит', 'Базальт', 'Мрамор', 'Нефрит', 'Кварц', 'Агат', 'Оникс', 'Аметист', 'Опал', 'Топаз', 'Обсидиан', 'Алмаз']),
  uk: Object.freeze(['Граніт', 'Базальт', 'Мармур', 'Нефрит', 'Кварц', 'Агат', 'Онікс', 'Аметист', 'Опал', 'Топаз', 'Обсидіан', 'Алмаз']),
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
