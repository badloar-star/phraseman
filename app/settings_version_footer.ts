// Подвал «Версия» в Настройках (раунд 2 удобств, Настройки п.1, одобрено владельцем 05.11):
// 7 тапов подряд — тост «Спасибо, что учишься с нами N дней»; долгое нажатие копирует «версия + сборка».
// зачем: чистая логика без UI — сторож tests/settings_version_footer_2026_11_05.test.ts проверяет счёт тапов и тексты напрямую; данных из сети нет
// (дата регистрации — синхронный peek Firebase Auth, app/account_created_at.ts).
import { triLang, type Lang } from '../constants/i18n';

export const VERSION_TAPS_NEEDED = 7;
/** Окно между тапами: пауза дольше — счёт начинается заново. */
export const VERSION_TAP_WINDOW_MS = 2000;
const DAY_MS = 86_400_000;

export type VersionTapState = Readonly<{ count: number; lastAtMs: number }>;

/** Следующее состояние счётчика тапов и сработал ли порог (7 тапов подряд, каждый не позже окна от прошлого). */
export function nextVersionTap(prev: VersionTapState, nowMs: number): Readonly<{ state: VersionTapState; fired: boolean }> {
  const count = prev.count > 0 && nowMs - prev.lastAtMs <= VERSION_TAP_WINDOW_MS ? prev.count + 1 : 1;
  if (count >= VERSION_TAPS_NEEDED) return { state: { count: 0, lastAtMs: nowMs }, fired: true };
  return { state: { count, lastAtMs: nowMs }, fired: false };
}

/** Целых дней «с нами»; нет даты или она в будущем — null (тост без числа не показываем). */
export function daysWithUs(createdAtMs: number | null, nowMs: number): number | null {
  if (createdAtMs === null || !Number.isFinite(createdAtMs) || createdAtMs <= 0 || createdAtMs > nowMs) return null;
  return Math.max(1, Math.floor((nowMs - createdAtMs) / DAY_MS));
}

export function versionThanksText(lang: Lang, days: number): string {
  return triLang(lang, {
    ru: `Спасибо, что учишься с нами ${days} ${dayWordRu(days)}`,
    uk: `Дякуємо, що вчишся з нами ${days} ${dayWordUk(days)}`,
    en: `Thanks for learning with us for ${days} ${days === 1 ? 'day' : 'days'}`,
    es: `Gracias por aprender con nosotros ${days} ${days === 1 ? 'día' : 'días'}`,
    'pt-BR': `Obrigado por aprender com a gente há ${days} ${days === 1 ? 'dia' : 'dias'}`,
    vi: `Cảm ơn bạn đã học cùng chúng tôi ${days} ngày`,
    id: `Terima kasih sudah belajar bersama kami selama ${days} hari`,
    tr: `Bizimle ${days} gündür öğrendiğin için teşekkürler`,
    pl: `Dziękujemy, że uczysz się z nami od ${days} ${days === 1 ? 'dnia' : 'dni'}`,
  });
}

export function versionCopiedText(lang: Lang): string {
  return triLang(lang, {
    ru: 'Версия скопирована', uk: 'Версію скопійовано', en: 'Version copied', es: 'Versión copiada', 'pt-BR': 'Versão copiada',
    vi: 'Đã sao chép phiên bản', id: 'Versi disalin', tr: 'Sürüm kopyalandı', pl: 'Skopiowano wersję',
  });
}

function dayWordRu(n: number): string {
  const m10 = n % 10; const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'день';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дня';
  return 'дней';
}

function dayWordUk(n: number): string {
  const m10 = n % 10; const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'день';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дні';
  return 'днів';
}
