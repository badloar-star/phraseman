/**
 * Фактический язык интерфейса — тот, на котором экран РЕАЛЬНО нарисован.
 *
 * зачем (координатор 12.10, 🔴 Шпиль пропал у ru-интерфейса): `peekAppLang()` — это СЫРОЕ сохранённое `app_lang`.
 * Кто ни разу не выбирал язык вручную, у того его нет: peek навсегда null, а LangContext рисует язык устройства.
 * Замки вне React (Шпиль) брали null и закрывались. LangContext публикует сюда свой язык (первый кадр, гидрация,
 * смена в настройках), подписчики пересчитываются. Без тяжёлых импортов — модуль читается из любых замков.
 * Логи: [UI-LANG].
 */

export type ResolvedUiLangSource = 'initial' | 'state' | 'hydrated';

let resolvedLang: string | null = null;
let resolvedSource: ResolvedUiLangSource | null = null;
const listeners = new Set<(lang: string) => void>();

/** Язык, который сейчас показывает интерфейс; null — LangContext ещё не смонтирован. */
export function peekResolvedUiLang(): string | null {
  return resolvedLang;
}

export function peekResolvedUiLangSource(): ResolvedUiLangSource | null {
  return resolvedSource;
}

/** LangContext: язык интерфейса известен/сменился. Тот же язык повторно — без уведомлений. */
export function publishResolvedUiLang(lang: string, source: ResolvedUiLangSource): void {
  if (typeof lang !== 'string' || lang.length === 0) {
    console.warn('[UI-LANG]', JSON.stringify({ step: 'publish_ignored', reason: 'empty_lang', source }));
    return;
  }
  const previous = resolvedLang;
  resolvedSource = source;
  if (previous === lang) return;
  resolvedLang = lang;
  console.log('[UI-LANG]', JSON.stringify({ step: 'resolved', lang, previous, source, listeners: listeners.size }));
  for (const listener of [...listeners]) {
    try {
      listener(lang);
    } catch (error: unknown) {
      console.warn('[UI-LANG]', JSON.stringify({ step: 'listener_failed', reason: error instanceof Error ? error.message : String(error) }));
    }
  }
}

/** Подписка на смену фактического языка. Возвращает отписку. */
export function subscribeResolvedUiLang(listener: (lang: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Только для тестов. */
export function __resetResolvedUiLangForTests(): void {
  resolvedLang = null;
  resolvedSource = null;
  listeners.clear();
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
