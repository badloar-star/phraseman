// Governance-ID: TG-CC8FDE405D86
import type { Lang } from '../../constants/i18n';

// зачем (правка владельца 05.11 через координатора): серая строка набора из видео — «N карточек · 12 окт 2026»:
// дата ПУБЛИКАЦИИ, коротко, на языке интерфейса, без времени. Нет даты (нет поля, эпоха 0, мусор) — подписи с датой нет вовсе.
const LOCALE: Record<string, string> = {
  ru: 'ru-RU', uk: 'uk-UA', en: 'en-US', es: 'es-ES', 'pt-BR': 'pt-BR', vi: 'vi-VN', id: 'id-ID', tr: 'tr-TR', pl: 'pl-PL',
};

/** Короткая дата публикации; пустая строка, если даты нет. */
export function formatPackPublishDate(iso: unknown, lang: Lang): string {
  const ms = typeof iso === 'string' ? Date.parse(iso) : typeof iso === 'number' ? iso : NaN;
  // 2000-01-01 — нижняя граница: эпоха 0 («поля нет») и мусор не должны показать «1 янв 1970»
  if (!Number.isFinite(ms) || ms < Date.UTC(2000, 0, 1)) return '';
  const date = new Date(ms);
  try {
    return new Intl.DateTimeFormat(LOCALE[lang] ?? 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      .format(date)
      .replace(/\s*г\.$/, ''); // «12 окт. 2026 г.» → «12 окт. 2026»
  } catch (error) {
    console.warn('[VIDEO-PACK] date_format_failed', error instanceof Error ? error.message : String(error)); // Intl недоступен — запасной формат
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${date.getUTCFullYear()}`;
  }
}
