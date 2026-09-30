// ═══ Свой текст на визитке «Про»: чистые правила записи (без Firestore) ═══════
// зачем (владелец 2026-09-30, макет profile-card-pro.html VC-EDIT): владелец «Про»
// пишет короткую подпись до 80 символов; её видят все, кто открывает его визитку.
// Правила вынесены из callable, чтобы тест проверял их без эмулятора:
//  • только владелец «Про» (флаг profileCardPro в его public_profiles);
//  • длина ≤ 80 символов (считаем символы Юникода, а не UTF-16 единицы — иначе
//    эмодзи «съедали» бы по два символа);
//  • пробелы по краям обрезаем, внутренние серии пробелов схлопываем;
//  • переносы строк и управляющие/невидимые символы — отказ (не молчаливая чистка:
//    человек должен понять, почему текст не сохранился);
//  • простой фильтр мата (functions/src/profile_card_profanity.ts);
//  • не чаще раза в минуту (антиспам и антиперебор фильтра).
import { containsProfanity } from './profile_card_profanity';

export const PROFILE_CARD_BIO_MAX_CHARS = 80;
export const PROFILE_CARD_BIO_MIN_INTERVAL_MS = 60_000;

export type ProfileCardBioRejectReason =
  | 'not_string'
  | 'too_long'
  | 'line_break'
  | 'control_char'
  | 'profanity';

export type ProfileCardBioValidation =
  | Readonly<{ ok: true; text: string }>
  | Readonly<{ ok: false; reason: ProfileCardBioRejectReason }>;

const LINE_BREAK_RE = /[\r\n\u2028\u2029\u0085\u000B\u000C]/u;
// Cc — управляющие, Cf — невидимые форматирующие (нулевая ширина, смена направления
// письма: ими подделывают текст «задом наперёд»), Co/Cn — частные/неназначенные.
const CONTROL_RE = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}]/u;

/** Длина в символах Юникода (эмодзи и суррогатные пары = 1). */
export function profileCardBioLength(text: string): number {
  return Array.from(text).length;
}

export function validateProfileCardBio(raw: unknown): ProfileCardBioValidation {
  if (typeof raw !== 'string') return { ok: false, reason: 'not_string' };
  // Сначала длина по сырому вводу с грубым запасом: не гоняем регулярки по мегабайту.
  if (raw.length > PROFILE_CARD_BIO_MAX_CHARS * 8) return { ok: false, reason: 'too_long' };
  const normalized = raw.normalize('NFC');
  if (LINE_BREAK_RE.test(normalized)) return { ok: false, reason: 'line_break' };
  if (CONTROL_RE.test(normalized.replace(/\t/g, ' '))) return { ok: false, reason: 'control_char' };
  const text = normalized.replace(/[\t   -   　]+/gu, ' ').trim();
  if (profileCardBioLength(text) > PROFILE_CARD_BIO_MAX_CHARS) return { ok: false, reason: 'too_long' };
  if (text && containsProfanity(text)) return { ok: false, reason: 'profanity' };
  return { ok: true, text };
}

export type ProfileCardBioProfileState = Readonly<{
  profileCardPro?: unknown;
  profileCardBio?: unknown;
  profileCardBioUpdatedAtMs?: unknown;
}>;

export type ProfileCardBioDecision =
  | Readonly<{ kind: 'write'; text: string }>
  | Readonly<{ kind: 'unchanged'; text: string }>
  | Readonly<{ kind: 'reject'; reason: ProfileCardBioRejectReason | 'pro_required' | 'rate_limited'; retryAfterMs?: number }>;

/**
 * Решение по записи. Порядок важен: «не Про» отвечаем раньше валидации, чтобы
 * фильтр нельзя было перебирать без покупки; одинаковый текст не тратит лимит.
 */
export function decideProfileCardBioWrite(
  profile: ProfileCardBioProfileState | null,
  rawText: unknown,
  nowMs: number,
): ProfileCardBioDecision {
  if (!profile || profile.profileCardPro !== true) return { kind: 'reject', reason: 'pro_required' };
  const validation = validateProfileCardBio(rawText);
  if (!validation.ok) return { kind: 'reject', reason: validation.reason };
  const current = typeof profile.profileCardBio === 'string' ? profile.profileCardBio : '';
  if (current === validation.text) return { kind: 'unchanged', text: validation.text };
  const last = Number(profile.profileCardBioUpdatedAtMs);
  if (Number.isFinite(last) && last > 0 && nowMs - last < PROFILE_CARD_BIO_MIN_INTERVAL_MS) {
    return {
      kind: 'reject',
      reason: 'rate_limited',
      retryAfterMs: Math.max(0, PROFILE_CARD_BIO_MIN_INTERVAL_MS - (nowMs - last)),
    };
  }
  return { kind: 'write', text: validation.text };
}
