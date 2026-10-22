/**
 * «Очистить все ошибки» — ход действия: экран пустеет сразу, запись журнала идёт фоном, тост «Вернуть» откатывает.
 *
 * зачем (владелец 22.10; Optimistic UI): пользователь жмёт «Удалить» — список пустеет в тот же кадр (локальная пометка), журнал
 * пишется одной записью (hideAllMistakes), при сбое всё возвращается с понятным тостом. Тост «Ошибки удалены» живёт ~5 с и
 * переживает уход с экрана — поэтому откат не зависит от экрана: он пишет 'restored' сам, а экран узнаёт через колбэки.
 * Защита от двойного нажатия: одна очистка/откат за раз на весь процесс. Журнал [MISTAKE-CLEAR-ALL]: вход, число, результат
 * записи, откат, сбои.
 */
import type { Lang } from '../constants/i18n';
import type { MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { actionToastTri, emitAppEvent } from './events';
import { hideAllMistakes, restoreMistakes, type ClearedMistake } from './mistake_clear_all';
import { MISTAKE_CLEAR_ALL_COPY } from './mistake_clear_all_copy';
import { markMistakesHiddenLocally, unmarkMistakesHiddenLocally } from './mistake_local_hidden';
import { trackMistakePracticeEvent } from './mistake_practice_analytics';
import { getStableId } from './stable_id';

const LOG = '[MISTAKE-CLEAR-ALL]';

export type ClearAllMistakesInput = Readonly<{
  studyTarget: MistakeStudyTarget;
  lang: Lang;
  /** Ошибки, которые человек видит на экране («ждут»): убираются из показа до записи. */
  visibleMistakeIds: readonly string[];
  /** Экран пустеет сразу, до записи журнала. */
  onOptimistic: () => void;
  /** Откат на экране сразу (при сбое записи и при «Вернуть»), до перечитывания журнала. */
  onRevertOptimistic: () => void;
}>;

export type ClearAllMistakesOutcome = 'cleared' | 'failed' | 'nothing' | 'busy';

let inFlight = false;

const journalListeners = new Set<() => void>();

/** Экран подписывается на «журнал ошибок изменился (очистка записана, откачена или не удалась)»: перечитывает снимок. Возвращает отписку. */
export function subscribeMistakeClearAllChanged(listener: () => void): () => void {
  journalListeners.add(listener);
  return () => { journalListeners.delete(listener); };
}

function notifyJournalChanged(): void {
  for (const listener of [...journalListeners]) {
    try {
      listener();
    } catch (error: unknown) {
      console.warn(`${LOG} listener:catch`, error instanceof Error ? error.message : String(error));
    }
  }
}

type ToastLangKey = 'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
const LANGS: readonly ToastLangKey[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

const pick = (field: 'done' | 'failed' | 'undoFailed' | 'undo'): Readonly<Record<ToastLangKey, string>> =>
  Object.fromEntries(LANGS.map((key) => [key, MISTAKE_CLEAR_ALL_COPY[key][field]])) as Record<ToastLangKey, string>;

const toastTexts = (field: 'done' | 'failed' | 'undoFailed') => {
  const m = pick(field);
  return { ru: m.ru, uk: m.uk, en: m.en, es: m.es, 'pt-BR': m['pt-BR'], vi: m.vi, id: m.id, tr: m.tr, pl: m.pl };
};

const failureToast = (field: 'failed' | 'undoFailed') => actionToastTri('error', toastTexts(field));

const doneToast = (onUndo: () => void) => {
  const label = pick('undo');
  return {
    ...actionToastTri('success', toastTexts('done')),
    action: {
      labelRu: label.ru, labelUk: label.uk, labelEn: label.en, labelEs: label.es, labelPtBr: label['pt-BR'],
      labelVi: label.vi, labelId: label.id, labelTr: label.tr, labelPl: label.pl,
      onPress: onUndo,
    },
  };
};

export async function clearAllMistakesWithUndo(input: ClearAllMistakesInput): Promise<ClearAllMistakesOutcome> {
  const { studyTarget, visibleMistakeIds, onOptimistic, onRevertOptimistic } = input;
  if (inFlight) {
    console.warn(`${LOG} busy`, JSON.stringify({ reason: 'already_running', studyTarget }));
    return 'busy';
  }
  inFlight = true;
  const startedAt = Date.now();
  console.log(`${LOG} enter`, JSON.stringify({ studyTarget, shown: visibleMistakeIds.length, lang: input.lang }));
  // Optimistic UI: список пустеет до записи журнала.
  markMistakesHiddenLocally(visibleMistakeIds);
  onOptimistic();
  try {
    const accountScope = await getStableId();
    const result = await hideAllMistakes({ accountScope, studyTarget });
    if (!result.ok) {
      unmarkMistakesHiddenLocally(visibleMistakeIds);
      onRevertOptimistic();
      notifyJournalChanged();
      console.warn(`${LOG} result`, JSON.stringify({ ok: false, reason: result.reason, ms: Date.now() - startedAt }));
      if (result.reason === 'write_failed') emitAppEvent('action_toast', failureToast('failed'));
      return result.reason === 'nothing_to_clear' ? 'nothing' : 'failed';
    }
    // зачем: журнал теперь источник правды. Пометка в памяти больше не нужна — иначе та же ошибка, сделанная снова после очистки,
    // оставалась бы невидимой до перезапуска («новые ошибки появляются как обычно»).
    unmarkMistakesHiddenLocally(visibleMistakeIds);
    unmarkMistakesHiddenLocally(result.mistakes.map((mistake) => mistake.mistakeId));
    trackMistakePracticeEvent('mistake_practice_hidden', { study_target: studyTarget, reason: 'clear_all', count: result.mistakes.length });
    console.log(`${LOG} result`, JSON.stringify({ ok: true, cleared: result.mistakes.length, appended: result.appendedCount, ms: Date.now() - startedAt }));
    notifyJournalChanged();
    emitAppEvent('action_toast', doneToast(() => undoClear({ studyTarget, accountScope, mistakes: result.mistakes, onRevertOptimistic })));
    return 'cleared';
  } catch (error: unknown) {
    console.warn(`${LOG} catch`, error instanceof Error ? error.message : String(error));
    unmarkMistakesHiddenLocally(visibleMistakeIds);
    onRevertOptimistic();
    notifyJournalChanged();
    emitAppEvent('action_toast', failureToast('failed'));
    return 'failed';
  } finally {
    inFlight = false;
  }
}

let undoing = false;

function undoClear(input: Readonly<{
  studyTarget: MistakeStudyTarget;
  accountScope: string;
  mistakes: readonly ClearedMistake[];
  onRevertOptimistic: () => void;
}>): void {
  if (undoing || inFlight) {
    console.warn(`${LOG} undo:ignored`, JSON.stringify({ undoing, inFlight }));
    return;
  }
  undoing = true;
  const startedAt = Date.now();
  console.log(`${LOG} undo:tap`, JSON.stringify({ count: input.mistakes.length }));
  // Optimistic UI: ошибки возвращаются на экран сразу, запись 'restored' идёт фоном.
  input.onRevertOptimistic();
  void restoreMistakes({ accountScope: input.accountScope, studyTarget: input.studyTarget, mistakes: input.mistakes })
    .then((result) => {
      if (!result.ok) {
        console.warn(`${LOG} undo:failed`, JSON.stringify({ reason: result.reason, ms: Date.now() - startedAt }));
        emitAppEvent('action_toast', failureToast('undoFailed'));
      } else {
        trackMistakePracticeEvent('mistake_practice_restored', { study_target: input.studyTarget, reason: 'clear_all_undo', count: input.mistakes.length });
        console.log(`${LOG} undo:done`, JSON.stringify({ appended: result.appendedCount, ms: Date.now() - startedAt }));
      }
      notifyJournalChanged();
    })
    .catch((error: unknown) => {
      console.warn(`${LOG} undo:catch`, error instanceof Error ? error.message : String(error));
      emitAppEvent('action_toast', failureToast('undoFailed'));
      notifyJournalChanged();
    })
    .finally(() => { undoing = false; });
}

/** Только для тестов. */
export function __resetClearAllFlowForTests(): void {
  inFlight = false;
  undoing = false;
  journalListeners.clear();
}

/* expo-router: утилита, не экран */
export default function __MistakeClearAllFlowRouteShim() {
  return null;
}
