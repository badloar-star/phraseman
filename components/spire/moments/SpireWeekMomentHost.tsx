// ═══════════════════════════════════════════════════════════════════════════
// SpireWeekMomentHost.tsx — окно итога недели на Главной (D191): по решению Ядра рисует m01 «повысили», m02 «удержались» или m03 «понизили».
//
// зачем (владелец 14.10, D191; Ядро: app/spire/use_spire_week_moment.ts): окно — при первом открытии после закрытия недели, раньше всех окон Главной, поверх всего (прозрачная нативная модалка с
// полупрозрачной строкой статуса, чтобы закрывать и вкладки). Слот в очереди окон и отметку «показано» держит хук Ядра — здесь только вид. Все числа — из итога недели сервера (SpireWeekResultView):
// место, монеты недели, награда за повышение (promotionCoins — 0 → строки нет, «+100» в коде не живёт). Лестница комнаты (ladder) и граница зоны повышения (promotionLineCoins) приходят с 17.10:
// нет полей — m01 без акта «лестница» (с места сразу к башне), m02 без строки «до топ-5 не хватило», ничего не выдумываем. «Играть» и закрытие — один обработчик (close хука).
// «Напомнить вечером» (m03) — только если хук Ядра сказал, что напоминание доступно (weekMoment.remind.available); иначе второй кнопки нет.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, useRef } from 'react';
import { Modal, View } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import type { SpireWeekMomentShow } from '../../../app/spire/spire_week_moment_gate';
import { SheetSwipeRoot } from '../../modal_fx/SheetSwipeClose';
import MomentDown from './MomentDown';
import MomentPromotion, { type MomentRoomRow } from './MomentPromotion';
import MomentStay from './MomentStay';

export type SpireWeekMomentHostProps = Readonly<{
  lang: Lang;
  /** Решение Ядра: исход недели + итог сервера. */
  decision: SpireWeekMomentShow;
  /** Ранг монеты человека 0…19; null — базовая монета. */
  coinRank: number | null;
  /** «Играть» и закрытие окна — освобождает слот в очереди окон (close хука Ядра). */
  onClose: () => void;
  /**
   * «Играть»: переход в Пик. Вызывается СРАЗУ ПОСЛЕ onClose в том же обработчике (окно закрыто синхронно, потом навигация).
   * Нет колбэка (Пик недоступен этому языку / вкладка выключена) — «Играть» только закрывает окно.
   */
  onPlay?: () => void;
  /** «Напомнить вечером» (только m03): хук Ядра отдаёт колбэк, когда напоминание доступно (разрешение уже дано, категория включена, ещё не поздно); нет колбэка — кнопки нет. Колбэк сам закрывает окно. */
  onRemind?: () => void;
  testID?: string;
}>;

/** Строки лестницы сервера → строки момента; нет лестницы → undefined (акт 1 пропускается). */
export function spireWeekLadderRows(ladder: SpireWeekMomentShow['result']['ladder']): readonly MomentRoomRow[] | undefined {
  if (!ladder || ladder.length === 0) return undefined;
  return ladder.map((row) => ({ uid: `ladder-${row.place}`, name: row.name, coinRank: row.coinRank, coins: row.coins, isMe: row.isMe }));
}

/** Сколько монет не хватило до зоны повышения: граница сервера минус мои монеты недели; нет границы — undefined (строки нет). */
export function spireWeekGapToTop5(result: SpireWeekMomentShow['result']): number | undefined {
  if (result.promotionLineCoins === undefined) return undefined;
  return Math.max(0, result.promotionLineCoins - (result.weekCoins ?? 0)); // guard-ok: разность только для показа «не хватило N»; баланс не меняется
}

function SpireWeekMomentHost({ lang, decision, coinRank, onClose, onPlay, onRemind, testID = 'spire-week-moment' }: SpireWeekMomentHostProps) {
  const { result, outcome } = decision;
  // зачем (координатор 14.10, аудит Optimistic UI; эталон v3-all: «Играть» — человек сам начинает новую неделю): сначала синхронно закрываем окно, потом ведём в Пик; повторный тап не уводит дважды
  const playedRef = useRef(false);
  const handlePlay = useCallback(() => {
    if (playedRef.current) { console.log('[WEEK-MOMENT] кнопка Играть повторно — пропуск'); return; }
    playedRef.current = true;
    console.log(`[WEEK-MOMENT] кнопка Играть: окно закрыто, переход в Пик=${String(Boolean(onPlay))}`); // guard-ok: единичный лог действия
    onClose();
    onPlay?.();
  }, [onClose, onPlay]);
  const rows = useMemo(() => spireWeekLadderRows(result.ladder), [result.ladder]);
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <SheetSwipeRoot>
        <View style={{ flex: 1 }} testID={testID}>
          {outcome === 'promoted' ? (
            <MomentPromotion lang={lang} fromTier={result.prevTier} toTier={result.newTier} rows={rows} myPlace={result.roomRank} myCoinRank={coinRank} bonusCoins={result.promotionCoins} onPlay={handlePlay} />
          ) : outcome === 'stayed' ? (
            <MomentStay lang={lang} tier={result.newTier} coinRank={coinRank} place={result.roomRank} weekCoins={result.weekCoins ?? 0} gapToTop5={spireWeekGapToTop5(result)} onPlay={handlePlay} />
          ) : (
            <MomentDown lang={lang} newTier={result.newTier} coinRank={coinRank} onPlay={handlePlay} onRemind={onRemind} />
          )}
        </View>
      </SheetSwipeRoot>
    </Modal>
  );
}

export default memo(SpireWeekMomentHost);
