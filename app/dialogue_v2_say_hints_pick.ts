// dialogue_v2_say_hints_pick.ts — какие фразы «Можно сказать…» показать над полем ввода Диалогов сейчас.
// зачем (владелец 24.10 через координатора: «постоянно должны быть подсказки, потому что я ноль, но хочу учиться»): сценарный диалог
// берёт фразы по текущей цели шага, «Свободный разговор» — по тому, сколько реплик человек уже сказал. Источник — локальный набор Ядра
// (ноль сетевых вызовов); когда сервер начнёт присылать фразы в ответе хода, меняется только этот модуль, экраны принимают готовый список.
// Список кэшируется по ключу, чтобы на каждом кадре экран получал тот же объект и карточки не перерисовывались.
import { sanitizeDialogSayHints, type DialogSayHint } from '../components/dialogs/hints/dialog_say_hints_model';
import {
  localSayHints,
  sayHintGoalKindForFreeformTurn,
  sayHintGoalKindForObjectiveLabel,
  type SayHintGoalKind,
} from './dialogue_v2_say_hints_local';

const cache = new Map<string, readonly DialogSayHint[]>();
let lastLoggedKey = '';

function pick(source: 'scenario' | 'freeform', studyTarget: string, goalKind: SayHintGoalKind, interfaceLang: string): readonly DialogSayHint[] {
  const key = `${studyTarget}|${goalKind}|${interfaceLang}`;
  let hints = cache.get(key);
  const from = hints ? 'cache' : 'local_set';
  if (!hints) {
    hints = sanitizeDialogSayHints(localSayHints({ studyTarget, goalKind, interfaceLang }));
    cache.set(key, hints);
  }
  if (key !== lastLoggedKey) {
    lastLoggedKey = key;
    // текст фраз не пишем — только что выбрано и сколько показали
    console.log('[SAY-HINTS] pick', JSON.stringify({ source, studyTarget, goalKind, interfaceLang, from, count: hints.length }));
  }
  return hints;
}

/** Сценарный диалог: фразы по подписи текущей цели шага (нет цели → общие фразы). */
export function dialogueV2ScenarioSayHints(input: Readonly<{
  studyTarget: string;
  objectiveLabel: string | null | undefined;
  interfaceLang: string;
}>): readonly DialogSayHint[] {
  return pick('scenario', input.studyTarget, sayHintGoalKindForObjectiveLabel(input.objectiveLabel), input.interfaceLang);
}

/** «Свободный разговор»: первая реплика — приветствие, вторая — о себе, дальше — фразы для поддержания разговора. */
export function dialogueV2FreeformSayHints(input: Readonly<{
  studyTarget: string;
  learnerTurnsSent: number;
  interfaceLang: string;
}>): readonly DialogSayHint[] {
  return pick('freeform', input.studyTarget, sayHintGoalKindForFreeformTurn(input.learnerTurnsSent), input.interfaceLang);
}
