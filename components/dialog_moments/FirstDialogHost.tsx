// ═══════════════════════════════════════════════════════════════════════════
// FirstDialogHost.tsx — окно m17 «Первый разговор — есть!» поверх итога диалога (app/dialogue_v2_completion.tsx), только при включённом moments_v3.
//
// зачем (координатор 15.10: «после завершения ПЕРВОГО диалога, 1 раз на изучаемый язык, ключ показа локально»): подключение момента к экрану итога. Экран монтирует этот файл ЛЕНИВО и только когда
// итог готов и флаг включён. Решение — first_dialog_gate (причина в журнал [FIRST-DIALOG]); отметка «показано» — first_dialog_shown_store, ставится в момент показа. 0 чтений и записей Firestore.
// «Следующий сценарий» СНАЧАЛА закрывает окно, потом зовёт onNext родителя (переход в хаб диалогов); системная «назад» только закрывает окно.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { hydrateDialogueV2DoneIds, peekDialogueV2DoneIds } from '../../app/dialogue_v2_done_store';
import type { Lang } from '../../constants/i18n';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { useFireOnce } from '../moments/use_fire_once';
import FirstDialogMoment from './FirstDialogMoment';
import { decideFirstDialogMoment } from './first_dialog_gate';
import { markFirstDialogShown, readFirstDialogShown } from './first_dialog_shown_store';

export type FirstDialogHostProps = Readonly<{
  lang: Lang;
  studyTarget: string;
  scenarioId: string | null;
  endedBy: 'bot' | 'limit' | 'manual';
  /** Реплик человека в диалоге. */
  turns: number;
  goalsDone: number;
  goalsTotal: number;
  /** «Следующий сценарий»: переход вызывающего, ПОСЛЕ закрытия окна. */
  onNext: () => void;
}>;

function FirstDialogHost({ lang, studyTarget, scenarioId, endedBy, turns, goalsDone, goalsTotal, onNext }: FirstDialogHostProps) {
  const coinRank = useMyCoinRank();
  const [open, setOpen] = useState(false);
  const fire = useFireOnce('FIRST-DIALOG-HOST');

  useEffect(() => {
    let alive = true;
    const doneIds = peekDialogueV2DoneIds(studyTarget);
    // зачем: дешёвые проверки без диска — первыми; диск читаем, только если момент вообще возможен
    const pre = decideFirstDialogMoment({ momentsV3: true, endedBy, learnerTurns: turns, scenarioId, doneIds, goalsTotal, alreadyShown: false });
    if (!pre.show) {
      console.log(`[FIRST-DIALOG] нет показа: ${pre.reason} target=${studyTarget} scenario=${String(scenarioId)}`); // guard-ok: решение называет причину
      return () => { alive = false; };
    }
    // зачем (Ревизор P18, 15.10): в памяти лежат только диалоги, пройденные за этот запуск, — диск подтягивает хаб. Диалог, открытый не из хаба
    // (пуш, Главная, ссылка), давал ложный «первый разговор». Если момент возможен, дочитываем пройденные с диска и решаем по полному списку.
    void Promise.all([hydrateDialogueV2DoneIds(studyTarget), readFirstDialogShown(studyTarget)]).then(([diskDoneIds, alreadyShown]) => {
      if (!alive) return;
      console.log(`[FIRST-DIALOG] пройденные: в памяти=${doneIds.size} после диска=${diskDoneIds.size} target=${studyTarget}`); // guard-ok: источник данных решения
      const final = decideFirstDialogMoment({ momentsV3: true, endedBy, learnerTurns: turns, scenarioId, doneIds: diskDoneIds, goalsTotal, alreadyShown });
      console.log(`[FIRST-DIALOG] ${final.show ? 'показ' : 'нет показа'}: ${final.reason} target=${studyTarget} scenario=${String(scenarioId)} цели=${goalsDone}/${goalsTotal}`); // guard-ok: итог решения
      if (!final.show) return;
      markFirstDialogShown(studyTarget);
      setOpen(true);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: решение один раз на открытие итога
  }, []);

  const next = useCallback(() => {
    fire(() => {
      console.log(`[FIRST-DIALOG] окно закрыто кнопкой, переход вызывающего target=${studyTarget}`); // guard-ok: единичный журнал закрытия
      setOpen(false);
      onNext();
    }, 'next');
  }, [fire, onNext, studyTarget]);

  const dismiss = useCallback(() => {
    fire(() => {
      console.log(`[FIRST-DIALOG] окно закрыто системной назад, без перехода target=${studyTarget}`); // guard-ok: единичный журнал закрытия
      setOpen(false);
    }, 'dismiss');
  }, [fire, studyTarget]);

  if (!open) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <FirstDialogMoment lang={lang} studyTarget={studyTarget} coinRank={coinRank} turns={turns} goalsDone={goalsDone} goalsTotal={goalsTotal} onNext={next} />
    </Modal>
  );
}

export default memo(FirstDialogHost);
