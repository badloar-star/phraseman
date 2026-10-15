// ═══════════════════════════════════════════════════════════════════════════
// SpireOutcomeMomentHost.tsx — окно итога ступени / этажа / вершины (m06/m07) поверх экрана Пика.
//
// зачем (владелец 14.10, ТЗ ETALON_MOMENTS_V3_TRANSFER; Авторизация №11: экран Пика ≤ 400 строк): модальное окно с экраном-моментом вынесено из SpireHomeScreen без изменения поведения.
// Экран показывает его только при включённом флаге moments_v3 и когда есть итог (кроме save_failed — там прежняя плашка). Сами моменты грузятся лениво — после первого кадра Пика их в бандле запуска нет.
// Закрытие свайпом вниз и «назад» ведут в onLater (как прежнее «Потом»); кнопки результата зовут climb / dismissOutcome из игры.
// ═══════════════════════════════════════════════════════════════════════════
import React, { Suspense, lazy, memo } from 'react';
import { Modal } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import type { SpireCoinsConfig } from '../../../modules/spire/config_contract';
import type { SpireStepOutcome } from '../../../app/spire/use_spire_game';
import { SheetSwipeRoot } from '../../modal_fx/SheetSwipeClose';

const SpireStepResultMoment = lazy(() => import('./SpireStepResultMoment'));
const SpireFloorMoment = lazy(() => import('./SpireFloorMoment'));

export type SpireOutcomeMomentHostProps = Readonly<{
  lang: Lang;
  outcome: SpireStepOutcome;
  coins: SpireCoinsConfig;
  coinRank: number | null;
  busy: boolean;
  /** «Ещё раз» / «Дальше» — новая ступень. */
  onClimb: () => void;
  /** «Потом» и закрытие окна. */
  onLater: () => void;
}>;

function SpireOutcomeMomentHost({ lang, outcome, coins, coinRank, busy, onClimb, onLater }: SpireOutcomeMomentHostProps) {
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onLater}>
      <SheetSwipeRoot>
        <Suspense fallback={null}>
          {outcome.kind === 'passed' || outcome.kind === 'failed' ? (
            <SpireStepResultMoment lang={lang} outcome={outcome} coins={coins} coinRank={coinRank} busy={busy} onAgain={onClimb} onLater={onLater} />
          ) : (
            <SpireFloorMoment lang={lang} outcome={outcome} coins={coins} coinRank={coinRank} busy={busy} onNext={onClimb} onLater={onLater} />
          )}
        </Suspense>
      </SheetSwipeRoot>
    </Modal>
  );
}

export default memo(SpireOutcomeMomentHost);
