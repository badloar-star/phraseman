// ═══════════════════════════════════════════════════════════════════════════
// SpireWeekMomentHost.tsx — окно итога недели на Главной (D191): по решению Ядра рисует m01 «повысили», m02 «удержались» или m03 «понизили».
//
// зачем (владелец 14.10, D191; Ядро: app/spire/use_spire_week_moment.ts): окно — при первом открытии после закрытия недели, раньше всех окон Главной, поверх всего (прозрачная нативная модалка с
// полупрозрачной строкой статуса, чтобы закрывать и вкладки). Слот в очереди окон и отметку «показано» держит хук Ядра — здесь только вид. Все числа — из итога недели сервера (SpireWeekResultView):
// место, монеты недели, награда за повышение (promotionCoins — 0 → строки нет, «+100» в коде не живёт). Лестница комнаты (ladder) и граница зоны повышения (promotionLineCoins) приходят с 17.10:
// нет полей — m01 без акта «лестница» (с места сразу к башне), m02 без строки «до топ-5 не хватило», ничего не выдумываем. «Играть» и закрытие — один обработчик (close хука).
// «Напомнить вечером» (m03) — только если хук Ядра сказал, что напоминание доступно (weekMoment.remind.available); иначе второй кнопки нет.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSpirePalette } from '../useSpirePalette';
import type { Lang } from '../../../constants/i18n';
import type { SpireWeekMomentShow } from '../../../app/spire/spire_week_moment_gate';
import { SheetSwipeRoot } from '../../modal_fx/SheetSwipeClose';
import MomentDown from './MomentDown';
import MomentPromotion, { type MomentRoomRow } from './MomentPromotion';
import MomentPromotionShort from './MomentPromotionShort';
import { momentNumber, momentText } from './moments_strings';
import { spireTierName } from '../../../modules/spire/tier_names';
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
  // зачем (аудит Optimistic UI 17.10, п.11): защёлка привязана к самому решению — новое решение в том же окне снова даёт «Играть»
  const playedRef = useRef<SpireWeekMomentShow | null>(null);
  const handlePlay = useCallback(() => {
    if (playedRef.current === decision) { console.log('[WEEK-MOMENT] кнопка Играть повторно — пропуск'); return; } // guard-ok: ранний выход — двойной тап
    playedRef.current = decision;
    console.log(`[WEEK-MOMENT] кнопка Играть: окно закрыто, переход в Пик=${String(Boolean(onPlay))}`); // guard-ok: единичный лог действия
    onClose();
    onPlay?.();
  }, [decision, onClose, onPlay]);
  const rows = useMemo(() => spireWeekLadderRows(result.ladder), [result.ladder]);
  // зачем (координатор 15.10, m01 вариант B): «Поделиться» — системное окно с текстом из строк (лига, место, монеты недели; без имени и идентификаторов), на наш сервер ничего не уходит; пока окно открыто, второе не открываем
  const sharingRef = useRef(false);
  // зачем (координатор 17.10): сбой «Поделиться» — короткая подсказка ВНУТРИ окна (общий тост рисуется под нативной модалкой и не виден), сама гаснет через 2,6 с
  const [shareFailed, setShareFailed] = useState(false);
  const p = useSpirePalette();
  const shareHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showShareFailed = useCallback(() => {
    setShareFailed(true);
    if (shareHintTimerRef.current) clearTimeout(shareHintTimerRef.current);
    shareHintTimerRef.current = setTimeout(() => { shareHintTimerRef.current = null; setShareFailed(false); }, 2600);
  }, []);
  useEffect(() => () => { if (shareHintTimerRef.current) clearTimeout(shareHintTimerRef.current); }, []);
  const handleShare = useCallback(() => {
    if (sharingRef.current) { console.log('[WEEK-MOMENT] share: окно уже открыто — пропуск'); return; }
    sharingRef.current = true;
    const message = momentText(lang, 'promoShareText', { league: spireTierName(result.newTier, lang), place: result.roomRank, coins: momentNumber(result.weekCoins ?? 0) });
    console.log(`[WEEK-MOMENT] share: открываю системное окно, символов=${message.length}`); // guard-ok: единичный лог действия
    Share.share({ message })
      .then((r) => { console.log(`[WEEK-MOMENT] share: результат action=${String(r.action)}`); }) // guard-ok: итог
      .catch((e: unknown) => { console.warn(`[WEEK-MOMENT] share: сбой ${e instanceof Error ? e.message : String(e)} — показана подсказка`); showShareFailed(); }) // guard-ok: catch называет причину
      .finally(() => { sharingRef.current = false; });
  }, [lang, result.newTier, result.roomRank, result.weekCoins, showShareFailed]);
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <SheetSwipeRoot>
        <View style={{ flex: 1 }} testID={testID}>
          {outcome === 'promoted' ? (
            decision.isRepeatPromotion === true ? (
              <MomentPromotionShort lang={lang} toTier={result.newTier} myPlace={result.roomRank} myCoinRank={coinRank} weekCoins={result.weekCoins} bonusCoins={result.promotionCoins} onPlay={handlePlay} onShare={handleShare} />
            ) : (
              <MomentPromotion lang={lang} fromTier={result.prevTier} toTier={result.newTier} rows={rows} myPlace={result.roomRank} myCoinRank={coinRank} bonusCoins={result.promotionCoins} onPlay={handlePlay} />
            )
          ) : outcome === 'stayed' ? (
            <MomentStay lang={lang} tier={result.newTier} coinRank={coinRank} place={result.roomRank} weekCoins={result.weekCoins ?? 0} gapToTop5={spireWeekGapToTop5(result)} onPlay={handlePlay} />
          ) : (
            <MomentDown lang={lang} newTier={result.newTier} coinRank={coinRank} onPlay={handlePlay} onRemind={onRemind} />
          )}
          {shareFailed ? (
            <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(200)} pointerEvents="none" style={[s.toast, { backgroundColor: p.card }]} testID={`${testID}-share-failed`}>
              <Text style={[s.toastText, { color: p.text }]}>{momentText(lang, 'shareFailed')}</Text>
            </Animated.View>
          ) : null}
        </View>
      </SheetSwipeRoot>
    </Modal>
  );
}

const s = StyleSheet.create({
  toast: { position: 'absolute', left: 24, right: 24, bottom: 56, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  toastText: { fontSize: 15, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
});

export default memo(SpireWeekMomentHost);
