// зачем (координатор 18.10 06:12, «без системных текстов»): код ошибки входа (Firebase Auth, Google, Apple) →
// фраза из словаря для человека, сам код — только в журнал [AUTH-…]. Общий модуль, чтобы окно входа и онбординг
// не разошлись в формулировках.
import { triLang, type Lang } from '../constants/i18n';

export type AuthErrorKind = 'network' | 'too_many' | 'other';

/** Вид ошибки по машинному коду (`firebase_auth_network-request-failed`, `native_7`, `dev_stub:…`). */
export function authErrorKind(rawCode: string | null | undefined): AuthErrorKind {
  const code = String(rawCode ?? '').toLowerCase();
  if (code.includes('too-many-requests') || code.includes('too_many_requests')) return 'too_many';
  // native_7 — NETWORK_ERROR нативного входа Google.
  if (code.includes('network') || code === 'native_7') return 'network';
  return 'other';
}

const SAFE_LOG_CODE = /^[A-Za-z0-9_./:-]{1,80}$/;

/** Код для журнала: только короткий машинный код, иначе `other` (текст исключения может нести почту). */
export function authErrorLogCode(rawCode: string | null | undefined): string {
  const code = String(rawCode ?? '');
  if (!code) return 'none';
  return SAFE_LOG_CODE.test(code) ? code : 'other';
}

export function authNetworkErrorText(lang: Lang): string {
  return triLang(lang, {
    ru: 'Связь пропала. Попробуй ещё раз.',
    uk: 'Зв’язок зник. Спробуй ще раз.',
    en: 'Connection lost. Try again.',
    es: 'Se perdió la conexión. Inténtalo de nuevo.',
    'pt-BR': 'A conexão caiu. Tente novamente.',
    vi: 'Mất kết nối. Hãy thử lại.',
    id: 'Koneksi terputus. Coba lagi.',
    tr: 'Bağlantı kesildi. Tekrar dene.',
    pl: 'Brak połączenia. Spróbuj ponownie.',
  });
}

export function authTooManyAttemptsText(lang: Lang): string {
  return triLang(lang, {
    ru: 'Слишком много попыток подряд. Подожди пару минут и попробуй снова.',
    uk: 'Забагато спроб поспіль. Зачекай кілька хвилин і спробуй знову.',
    en: 'Too many tries in a row. Wait a couple of minutes and try again.',
    es: 'Demasiados intentos seguidos. Espera un par de minutos y vuelve a intentarlo.',
    'pt-BR': 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
    vi: 'Bạn đã thử quá nhiều lần liên tiếp. Hãy đợi vài phút rồi thử lại.',
    id: 'Terlalu banyak percobaan berturut-turut. Tunggu beberapa menit, lalu coba lagi.',
    tr: 'Arka arkaya çok fazla deneme oldu. Birkaç dakika bekle ve tekrar dene.',
    pl: 'Za dużo prób z rzędu. Odczekaj kilka minut i spróbuj ponownie.',
  });
}

/** Словарная фраза для вида ошибки; `null` — у вида нет своей фразы, экран берёт свою общую. */
export function authErrorTextForKind(kind: AuthErrorKind, lang: Lang): string | null {
  if (kind === 'network') return authNetworkErrorText(lang);
  if (kind === 'too_many') return authTooManyAttemptsText(lang);
  return null;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __AuthErrorCopyRouteShim() {
  return null;
}
