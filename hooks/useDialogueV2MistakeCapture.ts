/**
 * Итог диалога → «Мои ошибки» + «Добить» (владелец 13.10: «Да, пусть попадают в Мои ошибки»).
 *
 * зачем: экран итога (app/dialogue_v2_completion.tsx) знает поправки «было → стало»; хук один раз на сессию кладёт их в журнал
 * ошибок (app/dialogue_v2_mistake_capture.ts) и отдаёт id записанных ошибок — по ним кнопка «Добить: Ещё учу (N)» (рисует Дизайн)
 * открывает отработку ровно этих ошибок, как итог урока (lesson_complete.tsx finishMistakes).
 * Запись локальная (журнал на диске) — счётчик N появляется сразу, сеть не ждём; синк уходит обычным путём фоном.
 * Повторная запись той же сессии безопасна: id стабильны, дублей нет.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';

import { hapticTap } from './use-haptics';
import { markNextNavigationAsReplace } from '../app/navigation_back';
import { getDevDialogCompletion } from '../app/dev_dialog_state';
import { useMistakePracticeStartGate } from './useMistakePracticeStartGate';
import {
  captureDialogueV2Mistakes,
  type DialogueCorrectionRow,
} from '../app/dialogue_v2_mistake_capture';

export type DialogueV2MistakeCapture = Readonly<{
  /** Id записанных ошибок этой сессии (пусто — ещё пишем / ошибок нет / запись не легла). */
  mistakeIds: readonly string[];
  status: 'waiting' | 'ready' | 'empty' | 'skipped';
  /** «Добить»: отработка ошибок этого диалога. Без id — ничего не делает (и пишет почему). */
  openPractice: () => void;
  /** Гейт «Добить» не пустил из-за энергии на платную сессию: экран показывает NoEnergyModal, попытка дня цела. */
  noEnergy: boolean;
  dismissNoEnergy: () => void;
  /** Попытка дня «Ошибок» у Free кончилась: тап «Добить» уведёт в пейвол — экран заранее ставит метку Plus. */
  locked: boolean;
}>;

export function useDialogueV2MistakeCapture(input: Readonly<{
  sessionId: string | null;
  studyTarget: unknown;
  rows: readonly DialogueCorrectionRow[];
  /** Итог решён (локальный разбор или ответ сервера) — поправки больше не поменяются. */
  ready: boolean;
}>): DialogueV2MistakeCapture {
  const { sessionId, studyTarget, rows, ready } = input;
  const router = useRouter();
  // зачем (Ревизор 2.76, координатор 15.10): «Добить» после диалога шёл в тренировку мимо дневной квоты — теперь общий гейт «Ошибок»
  const gate = useMistakePracticeStartGate('dialogue_v2_finish_mistakes');
  const [state, setState] = useState<{ mistakeIds: readonly string[]; status: DialogueV2MistakeCapture['status'] }>({
    mistakeIds: [],
    status: 'waiting',
  });
  const capturedKeyRef = useRef<string | null>(null);
  const openingRef = useRef(false);
  const rowsKey = rows.map((row) => `${row.original}\u0000${row.corrected}`).join('\u0001');

  useEffect(() => {
    if (!sessionId) {
      if (capturedKeyRef.current !== 'no_session') {
        capturedKeyRef.current = 'no_session';
        console.warn('[DIALOG-MISTAKES] skip reason=no_session_id'); // guard-ok: ранний выход
        setState({ mistakeIds: [], status: 'skipped' });
      }
      return;
    }
    if (!ready) return;
    const key = `${sessionId}\u0002${rowsKey}`;
    if (capturedKeyRef.current === key) return;
    capturedKeyRef.current = key;
    if (rows.length === 0) {
      console.log(`[DIALOG-MISTAKES] skip reason=no_corrections session=${sessionId.slice(0, 24)}`);
      setState({ mistakeIds: [], status: 'empty' });
      return;
    }
    // зачем (Дизайн 13.10): подставной итог съёмки (dev_dialog_completion=…) не должен писать выдуманные поправки в НАСТОЯЩИЙ
    // журнал ошибок тестового аккаунта. Отдаём заглушки по числу поправок — кнопка «Добить (N)» рисуется, но ничего не пишет.
    if (getDevDialogCompletion()) {
      console.log(`[DIALOG-MISTAKES] skip reason=dev_fixture rows=${rows.length} — журнал не трогаем`);
      setState({ mistakeIds: rows.map((_, index) => `dev-fixture:${index + 1}`), status: 'ready' });
      return;
    }
    let alive = true;
    void captureDialogueV2Mistakes({ sessionId, studyTarget, rows }).then((summary) => {
      if (!alive) {
        console.log('[DIALOG-MISTAKES] result_after_unmount — записано, экран уже закрыт'); // guard-ok: ранний выход
        return;
      }
      setState({ mistakeIds: summary.mistakeIds, status: summary.mistakeIds.length > 0 ? 'ready' : 'empty' });
    }).catch((error: unknown) => {
      console.warn('[DIALOG-MISTAKES] capture_crashed', error instanceof Error ? error.message : String(error));
      if (alive) setState({ mistakeIds: [], status: 'empty' });
    });
    return () => { alive = false; };
  }, [sessionId, studyTarget, ready, rowsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mistakeIds } = state;
  const openPractice = useCallback(() => {
    if (openingRef.current) {
      console.log('[DIALOG-MISTAKES] open skip reason=double_tap'); // guard-ok: ранний выход
      return;
    }
    if (mistakeIds.some((id) => id.startsWith('dev-fixture:'))) {
      console.log('[DIALOG-MISTAKES] open skip reason=dev_fixture — подставной итог, отработку не открываем'); // guard-ok: ранний выход
      return;
    }
    if (mistakeIds.length < 1) {
      console.warn(`[DIALOG-MISTAKES] open skip reason=no_ids status=${state.status}`); // guard-ok: ранний выход
      return;
    }
    void hapticTap();
    if (!gate.tryStartSession(mistakeIds.length)) {
      console.log(`[DIALOG-MISTAKES] open skip reason=gate (пейвол или «Нужна энергия») ids=${mistakeIds.length}`); // guard-ok: ранний выход
      return;
    }
    openingRef.current = true;
    const receipt = gate.takeQuotaReceiptParam();
    console.log(`[DIALOG-MISTAKES] open ids=${mistakeIds.length} receipt=${receipt.quotaReceipt ?? 'none'} → /mistake_practice_session`);
    markNextNavigationAsReplace();
    router.replace({ pathname: '/mistake_practice_session', params: { mistakeIds: mistakeIds.join(','), length: 'all', ...receipt } } as never);
  }, [gate, mistakeIds, router, state.status]);

  return { mistakeIds, status: state.status, openPractice, noEnergy: gate.noEnergy, dismissNoEnergy: gate.dismissNoEnergy, locked: gate.locked };
}
