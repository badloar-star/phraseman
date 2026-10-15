// ═══════════════════════════════════════════════════════════════════════════
// LessonPerfectHost.tsx — окно m09 «Идеальный урок» поверх итога урока (app/lesson_complete.tsx), только при включённом moments_v3.
//
// зачем (координатор 15.10): подключение момента к итогу. Экран грузит этот файл ЛЕНИВО и только когда решение decidePerfectMoment сказало «показать», поэтому при выключенном флаге
// в бандле запуска ничего нового нет. Окно открывается один раз на прохождение (claimPerfectMoment, память процесса), число монет — ровно то, что итог показывает как «+N»
// (practiceRunes.runes из расчёта рун урока), без второго подсчёта. «Дальше» (и системная «назад») СНАЧАЛА закрывают окно — под ним обычный экран итога; никакой записи и навигации здесь нет.
// onOpenChange сообщает экрану, что окно открыто: оценка приложения (ReviewPromptModal) ждёт, чтобы два модальных окна не встали друг на друга (на iOS второе не откроется).
// Журнал: [LESSON-PERFECT] — показ (с причиной), пропуск повторного захода, закрытие.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Modal } from 'react-native';
import type { Lang } from '../../constants/i18n';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { useFireOnce } from '../moments/use_fire_once';
import LessonPerfectMoment from './LessonPerfectMoment';
import { claimPerfectMoment } from './perfect_moment_gate';

export type LessonPerfectHostProps = Readonly<{
  lang: Lang;
  /** Ключ прохождения (perfectMomentKey): один показ на ключ. */
  onceKey: string;
  /** Заданий в проходе (верных без ошибок). */
  total: number;
  /** Монеты за урок — то же число, что «+N» на экране итога. */
  coinsEarned: number;
  onOpenChange?: (open: boolean) => void;
}>;

function LessonPerfectHost({ lang, onceKey, total, coinsEarned, onOpenChange }: LessonPerfectHostProps) {
  const coinRank = useMyCoinRank();
  const [open, setOpen] = useState<boolean>(() => claimPerfectMoment(onceKey));
  const fire = useFireOnce('LESSON-PERFECT-HOST');

  useEffect(() => {
    console.log(`[LESSON-PERFECT] ${open ? 'показ' : 'пропуск: этот проход уже праздновали'} key=${onceKey} заданий=${total} монет=${coinsEarned} ранг=${String(coinRank)}`); // guard-ok: единичный журнал решения
    if (open) onOpenChange?.(true);
    return () => { if (open) onOpenChange?.(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: решение принимается один раз на показ
  }, []);

  const next = useCallback(() => {
    fire(() => {
      console.log(`[LESSON-PERFECT] закрыто кнопкой Дальше key=${onceKey}`); // guard-ok: единичный журнал закрытия
      setOpen(false);
      onOpenChange?.(false);
    }, 'next');
  }, [fire, onOpenChange, onceKey]);

  if (!open) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={next}>
      <LessonPerfectMoment lang={lang} coinRank={coinRank} total={total} coinsEarned={coinsEarned} onNext={next} />
    </Modal>
  );
}

export default memo(LessonPerfectHost);
