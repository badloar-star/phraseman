/**
 * Формат кодов, которые человек вводит руками: промокод и код друга (приглашения).
 *
 * зачем (решение владельца 12.10, журнал п.81(13), кадры overlays-campaigns-013/021): раньше кнопка была выключена, пока код не подходит
 * по формату, — человек не понимал, что не так, а состояние «неверный формат» из макета было недостижимо. Теперь кнопка активна при любом
 * непустом вводе, а экран проверяет формат ЭТИМИ функциями до сети и сразу пишет, что не так. Чистый модуль — проверяется обычным jest.
 */

/** Промокод: 3–32 знака, латиница/цифры/«-»/«_» после trim+upper — зеркало серверного CODE_RE (functions/src/promo_codes.ts). */
export const PROMO_CODE_FORMAT = /^[A-Z0-9_-]{3,32}$/;

/** Код друга короче этого — точно неверный (applyManualReferralCode отвечает 'invalid' без сети). */
export const REFERRAL_CODE_MIN_LENGTH = 4;

export function normalizeEnteredCode(raw: string): string {
  return String(raw ?? '').trim().toUpperCase();
}

export function isPromoCodeFormatValid(raw: string): boolean {
  return PROMO_CODE_FORMAT.test(normalizeEnteredCode(raw));
}

/**
 * Русские (и украинская «І») буквы-двойники латинских: в русской раскладке «САТ4» выглядит как код, но не находится.
 * зачем (координатор 15.10, overlays-campaigns-021): код друга — только латиница и цифры (referral_codes и friend-код —
 * 6 знаков base32), поэтому двойники молча переводим в латиницу, пробелы и дефисы внутри убираем.
 */
const CYRILLIC_LOOKALIKES: Readonly<Record<string, string>> = {
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X', 'У': 'Y', 'І': 'I',
};

/** Код друга в том виде, в каком он уходит на сервер: верхний регистр, двойники → латиница, без пробелов и «-» внутри. */
export function normalizeReferralCodeInput(raw: string): string {
  let out = '';
  for (const ch of normalizeEnteredCode(raw)) out += CYRILLIC_LOOKALIKES[ch] ?? ch;
  return out.replace(/[\s-]+/g, '');
}

/** Только латиница и цифры (точную длину и алфавит решает сервер — старые/другие коды не отсекаем). */
export const REFERRAL_CODE_CHARSET = /^[A-Z0-9]+$/;

export function isReferralCodeCharsetValid(raw: string): boolean {
  return REFERRAL_CODE_CHARSET.test(normalizeReferralCodeInput(raw));
}

export function isReferralCodeLongEnough(raw: string): boolean {
  return normalizeReferralCodeInput(raw).length >= REFERRAL_CODE_MIN_LENGTH;
}

/** Кнопка отправки активна при любом непустом вводе — проверка формата идёт по нажатию и объясняет, что не так. */
export function hasEnteredCode(raw: string): boolean {
  return normalizeEnteredCode(raw).length > 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
