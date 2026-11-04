// ═══════════════════════════════════════════════════════════════════════════
// Learning V2 заморожен решением владельца 04.11: виден ТОЛЬКО тем, у кого есть хотя бы одно завершённое занятие V2 (порог V2_UNLOCK_MIN_COMPLETED_EPISODES = 1).
//
// Решение 02.11 («V2 скрыт у всех») ослаблено: по умолчанию V2 скрыт — кнопка «V2» и чип «Новые уроки» на вкладке «Обучение», запомненная
// вкладка V2, маршрут курса /learning-v2/course, занятие /learning-v2/session/[id], внешние ссылки /learning-v2/… и /learning_v2_…,
// карточка «Продолжить» V2 на Главной, прогрев и индексация. Старые ссылки ведут в классический Курс со строкой [V2-HIDDEN].
// Открывает V2 одна локальная проверка app/learning_v2_progress_gate.ts (без сети и Firestore): setLearningV2Unlocked(true).
// Дев-сборка тоже прячет — чтобы Сверка видела ровно то, что увидит человек. Фоновые досылки завершённых занятий у тех,
// у кого прогресс есть, продолжают работать: прогресс не теряется.
//
// LEARNING_V2_HIDDEN — ЖИВАЯ привязка модуля (export let): код, читающий её в теле функции или при рендере, видит актуальное значение.
// Константы уровня модуля, посчитанные при импорте, от неё зависеть не могут — для них есть isLearningV2Hidden().
// Сторож: tests/learning_v2_visibility_switch_contract.test.ts.
// ═══════════════════════════════════════════════════════════════════════════
import { peekResolvedUiLang } from './ui_lang_resolved';

// зачем (владелец 04.11, «заморозка Learning V2»): true до тех пор, пока проверка прогресса не нашла завершённое занятие.
export let LEARNING_V2_HIDDEN: boolean = true;

// зачем (R92, координатор 17.10): у выпуска курса пояснения есть только на ru и uk (intro.json / learner.uk.json); для остальных
// языков интерфейса показ подставлял РУССКИЙ (FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1). Решение: курс виден только там, где он
// на языке человека; для es/pt-BR/vi/id/tr/pl/en вкладка «Обучение» открывает классический курс, входов в V2 нет.
export const LEARNING_V2_EXPLANATION_UI_LANGS: readonly string[] = Object.freeze(['ru', 'uk']);

type VisibilityListener = () => void;
const visibilityListeners = new Set<VisibilityListener>();
let visibilityVersion = 0;

/** Ставит результат проверки прогресса. Возвращает true, если значение изменилось (подписчики уже уведомлены). */
export function setLearningV2Unlocked(unlocked: boolean, from: string): boolean {
  const nextHidden = !unlocked;
  if (LEARNING_V2_HIDDEN === nextHidden) {
    console.log(`[V2-GATE] visibility unchanged hidden=${String(nextHidden)} from=${from}`); // guard-ok: одна строка на проверку
    return false;
  }
  LEARNING_V2_HIDDEN = nextHidden;
  visibilityVersion += 1;
  console.warn(`[V2-GATE] visibility changed hidden=${String(nextHidden)} version=${visibilityVersion} from=${from}`); // guard-ok: смена видимости — редкое событие
  visibilityListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn('[V2-GATE] listener failed', error instanceof Error ? error.message : String(error));
    }
  });
  return true;
}

export function subscribeLearningV2Visibility(listener: VisibilityListener): () => void {
  visibilityListeners.add(listener);
  return () => {
    visibilityListeners.delete(listener);
  };
}

export function getLearningV2VisibilityVersion(): number {
  return visibilityVersion;
}

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

/** Синхронно, без сети: V2 скрыт, пока нет пройденного урока целиком, и на языках интерфейса без пояснений. */
export function isLearningV2Hidden(): boolean {
  if (LEARNING_V2_HIDDEN) return true;
  return !isLearningV2OpenForUiLangV1(peekResolvedUiLang(), 'resolved_ui_lang');
}

/** Единая строка журнала для каждого закрытого входа: какой вход и куда увели. */
export function logLearningV2Hidden(entry: string, redirectTo: string, detail?: string): void {
  console.warn(`[V2-HIDDEN] entry=${entry} redirect=${redirectTo}${detail ? ` ${detail}` : ''}`); // guard-ok: ранний выход входа V2 логируется
}

export const LEARNING_V2_HIDDEN_REDIRECT = '/lessons_list' as const;
