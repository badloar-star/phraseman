// ═══════════════════════════════════════════════════════════════════════════
// Рубильник «Learning V2 скрыт» — план Б к сборке 16.10 (координатор 14.10).
//
// зачем: владелец 15.10 в 12:00 решает судьбу Learning V2 в сборке (рекомендация координатора — скрыть).
// Решение должно исполняться ОДНОЙ строкой без пересборки логики: true здесь прячет каждый вход в V2
// (кнопка «V2» и чип «Новые уроки» на вкладке «Обучение», запомненная вкладка V2, маршрут курса
// /learning-v2/course, занятие /learning-v2/session/[id], внешние ссылки /learning-v2/… и /learning_v2_…),
// а старые ссылки ведут на Главную со строкой [V2-HIDDEN]. Дев-сборка тоже прячет — чтобы Сверка видела
// ровно то, что увидит человек. Фоновые досылки завершённых занятий НЕ выключаются: прогресс не теряется.
//
// По умолчанию false — поведение не меняется, пока владелец не скажет «скрыть».
// Сторож: tests/learning_v2_visibility_switch_contract.test.ts.
// ═══════════════════════════════════════════════════════════════════════════

import { peekResolvedUiLang } from './ui_lang_resolved';

export const LEARNING_V2_HIDDEN: boolean = false;

// зачем (R92, координатор 17.10): у выпуска курса пояснения есть только на ru и uk (intro.json / learner.uk.json); для остальных
// языков интерфейса показ подставлял РУССКИЙ (FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1). Решение: курс виден только там, где он
// на языке человека; для es/pt-BR/vi/id/tr/pl/en вкладка «Обучение» открывает классический курс, входов в V2 нет.
// Перевод выпуска на остальные языки — после релиза; появился перевод — язык добавляется сюда.
export const LEARNING_V2_EXPLANATION_UI_LANGS: readonly string[] = Object.freeze(['ru', 'uk']);

let lastLocaleGateLogKey: string | null = null;
function logLocaleGate(lang: string | null, open: boolean, from: string): void {
  const key = `${String(lang)}:${String(open)}`;
  if (lastLocaleGateLogKey === key) return;
  lastLocaleGateLogKey = key;
  console.log(`[V2-LOCALE-GATE] uiLang=${String(lang)} decision=${open ? 'open' : 'hidden'} from=${from}${lang == null ? ' (язык ещё не известен — проверит маршрут)' : ''}`); // guard-ok: одна строка на смену языка
}

/** Есть ли у курса V2 пояснения на этом языке интерфейса. null — язык ещё не известен: вход не режем, его перепроверит маршрут. */
export function isLearningV2OpenForUiLangV1(lang: string | null | undefined, from = 'check'): boolean {
  const open = lang == null || LEARNING_V2_EXPLANATION_UI_LANGS.includes(lang);
  logLocaleGate(lang ?? null, open, from);
  return open;
}

/** Синхронно, без сети: вход в V2 виден/закрыт уже в первом кадре (рубильник + язык интерфейса). */
export function isLearningV2Hidden(): boolean {
  if (LEARNING_V2_HIDDEN) return true;
  return !isLearningV2OpenForUiLangV1(peekResolvedUiLang(), 'resolved_ui_lang');
}

/** Единая строка журнала для каждого закрытого входа: какой вход и куда увели. */
export function logLearningV2Hidden(entry: string, redirectTo: string, detail?: string): void {
  console.warn(`[V2-HIDDEN] entry=${entry} redirect=${redirectTo}${detail ? ` ${detail}` : ''}`); // guard-ok: ранний выход входа V2 логируется
}

export const LEARNING_V2_HIDDEN_REDIRECT = '/home' as const;
