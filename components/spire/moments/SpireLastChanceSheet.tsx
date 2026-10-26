// ═══════════════════════════════════════════════════════════════════════════
// SpireLastChanceSheet.tsx — момент m05 · вариант C «Последний шанс: отсчёт + док без энергии» (эталон engagement-moments-v3-all.html, `last3`).
//
// зачем (владелец 14.10: «перенести точно по макетам»; ТЗ ETALON_MOMENTS_V3_TRANSFER m05; координатор): воскресная шторка, когда человек близко к топ-5, а энергия закончилась — честная точка Plus (та же ссылка, что в доке
// SpireClimbDock). Шторка (KitSheetModal): «Воскресенье · до итога», отсчёт до конца недели ч:мм:сс (тикает каждую секунду, только пока шторка видна), «До топ-5 — N монет. Энергия вернётся через m:ss.»,
// недоступная кнопка «⚡ Энергия через m:ss» (энергия +1 за 10 мин — отсчёт тоже живой), ссылка «Играй без ожидания с Plus ›». Время — props (конец недели и момент возврата энергии считает вызывающий по часам
// сервера/кэшу); нет границы топ-5 (старый итог) — фраза про разрыв опускается. Ничего не пишет и не покупает: «Plus» и «закрыть» — колбэки.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { hapticTap } from '../../../hooks/use-haptics';
import { useRuntimeActive } from '../../../hooks/use_runtime_active';
import { playEvent } from '../../../modules/sound_v2/sound_bank';
import { useFireOnce } from '../../moments/use_fire_once';
import { KitSheetModal } from '../../v2/KitSheetModal';
import { V2_TYPE } from '../../../constants/v2Style';
import { V2Button } from '../../v2/V2Kit';
import { spireClock, spireGameText } from '../spire_game_strings';
import { useSpirePalette } from '../useSpirePalette';
import { positionClockHms, positionMomentText } from './position_moment_strings';

const GAP_MARK = '\u0001';

/**
 * Живое «сейчас» раз в секунду — только пока шторка открыта, экран в фокусе и приложение активно.
 * зачем (координатор 26.10, аудит скорости Моментов №13): раньше интервал жил в самой шторке и раз в секунду перерисовывал её целиком
 * (KitSheetModal, шапку, прокрутку, кнопку), хотя меняются только два времени. Теперь «сейчас» держат листья — часы и строка тела.
 */
function useLiveNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

const LastChanceClock = memo(function LastChanceClock({ weekEndsAtMs, active, color, testID }: { weekEndsAtMs: number; active: boolean; color: string; testID: string }) {
  const now = useLiveNow(active);
  const text = positionClockHms(weekEndsAtMs - now);
  return <Text style={[s.clock, { color }]} accessibilityLabel={text} testID={testID}>{text}</Text>;
});

type BodyProps = Readonly<{ lang: Lang; energyReadyAtMs: number; gapCoins?: number; gapSteps?: number; active: boolean; textColor: string; secondaryColor: string; testID: string }>;
const LastChanceBody = memo(function LastChanceBody({ lang, energyReadyAtMs, gapCoins, gapSteps, active, textColor, secondaryColor, testID }: BodyProps) {
  const now = useLiveNow(active);
  const energyClock = spireClock(Math.max(0, energyReadyAtMs - now));
  const [before, after] = positionMomentText(lang, 'lastBody', { gap: GAP_MARK, t: energyClock }).split(GAP_MARK);
  const body = gapCoins === undefined && gapSteps === undefined ? spireGameText(lang, 'energyIn', { t: energyClock }) : null;
  return (
    <Text style={[s.p, { color: secondaryColor }]} testID={testID}>
      {body ?? (
        <>
          {before}
          <Text style={[s.bold, { color: textColor }]}>{gapSteps !== undefined ? positionMomentText(lang, 'gapSteps', { steps: gapSteps }) : positionMomentText(lang, 'gapCoins', { n: gapCoins ?? 0 })}</Text>
          {after ?? ''}
        </>
      )}
    </Text>
  );
});

export type SpireLastChanceSheetProps = Readonly<{
  lang: Lang;
  visible: boolean;
  /** Момент конца недели (пн 00:00 UTC), мс эпохи. */
  weekEndsAtMs: number;
  /** Момент возврата +1 энергии, мс эпохи. */
  energyReadyAtMs: number;
  /** Сколько монет недели не хватает до топ-5; undefined — границы нет (фраза опускается). */
  gapCoins?: number;
  /** Комната по ступеням: сколько ступеней нужно до топ-5; есть — фраза ступенями (главнее gapCoins). */
  gapSteps?: number;
  /** «Играй без ожидания с Plus ›». */
  onPlus: () => void;
  onClose: () => void;
  testID?: string;
}>;

function SpireLastChanceSheet({ lang, visible, weekEndsAtMs, energyReadyAtMs, gapCoins, gapSteps, onPlus, onClose, testID = 'last-chance' }: SpireLastChanceSheetProps) {
  const p = useSpirePalette();
  const reduceMotion = useReducedMotion();
  const runtimeActive = useRuntimeActive(visible);
  const live = visible && runtimeActive;
  // зачем (координатор 14.10): Plus ведёт ТОЛЬКО через общий пейвол (D115) — onPlus родитель открывает сам; здесь тап срабатывает один раз на показ шторки
  const fire = useFireOnce('LAST-CHANCE', visible);

  useEffect(() => {
    if (!visible) return;
    console.log(`[LAST-CHANCE] показ: до_итога=${Math.max(0, weekEndsAtMs - Date.now())}мс энергия_через=${Math.max(0, energyReadyAtMs - Date.now())}мс разрыв=${gapSteps !== undefined ? `${gapSteps} ступ.` : String(gapCoins)} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    playEvent('sheet_open');
    void hapticTap();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: показ один раз на открытие
  }, [visible]);

  return (
    <KitSheetModal
      visible={visible}
      onRequestClose={onClose}
      closeLabel={spireGameText(lang, 'close')}
      testID={testID}
      header={(
        <View style={s.head}>
          <Text style={[s.ov, { color: p.textSecondary }]}>{positionMomentText(lang, 'lastOver').toUpperCase()}</Text>{/* зачем (Сверка Макетов r1): эталон .ov — var(--sc), серый, без акцента */}
          <LastChanceClock weekEndsAtMs={weekEndsAtMs} active={live} color={p.text} testID={`${testID}-clock`} />
        </View>
      )}
    >
      {/* зачем (координатор 18.10, проверка выпуска, шрифт 1,3): шторка ограничена 90 % высоты и обрезает лишнее — на тесном экране тело прокручивается, а не теряет нижнюю кнопку */}
      <ScrollView decelerationRate="fast" bounces={false} showsVerticalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 8 }}>{/* поля шторки (18) внутри прокрутки — тени плашки и кнопки не срезаются краем */}
        <LastChanceBody lang={lang} energyReadyAtMs={energyReadyAtMs} gapCoins={gapCoins} gapSteps={gapSteps} active={live} textColor={p.text} secondaryColor={p.textSecondary} testID={`${testID}-body`} />
        {/* зачем (Макеты 18.10, lastchance_open: «Энергия вернётся через 9:32» в тексте и неактивная кнопка «Энергия через 9:32» — дубль,
            кнопка должна быть действием): время энергии — только в тексте; единственное действие шторки — «Играй без ожидания с Plus». */}
        <View style={s.cta}>
          <V2Button label={positionMomentText(lang, 'plusLink')} icon="flash" iconPosition="leading" onPress={() => fire(onPlus, 'plus')} testID={`${testID}-plus`} />
        </View>
      </ScrollView>
    </KitSheetModal>
  );
}

const s = StyleSheet.create({
  // зачем (Сверка 18.10, m05-C «шторка по центру»): в эталоне last3 текст шторки идёт от левого края (.sheet без text-align), по центру — только ручка и ссылка Plus
  head: { alignItems: 'flex-start', paddingTop: 6 },
  // зачем (Макеты 15.10, CODE_VS_ETALON; решение координатора): типографика по листам приёмки m05: надзаголовок — V2_TYPE.overline (13/17 · 700 · трекинг 1,4)
  ov: { ...V2_TYPE.overline, textAlign: 'left' },
  // зачем (координатор 18.10): отсчёт — ровно эталонный `.cd` (34/40, 800, -0,6, цифры равной ширины); 48 появилось при создании m05 без слова владельца
  clock: { marginTop: 6, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, textAlign: 'left', fontVariant: ['tabular-nums'] },
  p: { marginTop: 8, fontSize: 16, lineHeight: 22, textAlign: 'left' },
  bold: { fontWeight: '700' },
  cta: { marginTop: 16 },
});

export default memo(SpireLastChanceSheet);
