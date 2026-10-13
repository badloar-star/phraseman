/**
 * Итог тренировки Карточек — макет docs/design/v2-app/cards-v2.html, блок «Итог» (`result(clean)`; кадры «Итог с ошибками» и «Без ошибок»).
 *
 * зачем (владелец 12.10, «Карточки 2.0 все в работу»): шапка — только крестик справа; надпись «режим · набор»; крупное «18 из 20» и вердикт
 * («Почти идеально» / «Без единой ошибки»); три плитки «Верно / Ошибки / Время»; пилюля «+монеты»; секция «Ошибки N» — карточки, которые
 * переворачиваются по тапу (EN → RU, 560 мс); внизу «Готово» и «Повторить ошибки» (без ошибок — «Готово» и «Ещё раз»).
 * Данных, которых у режима нет, экран не выдумывает: нет времени — в плитке тире, нет списка ошибок — нет секции, нет повтора — одна «Готово».
 * Отступление от макета (решение на владельце): слева в шапке макет пуст, здесь — плашка баланса: в неё долетают монеты из пилюли «+N» (правило наград PM-052, сторож fc_recall_session_contract).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing as REasing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { LinearGradient } from '../../components/SafeLinearGradient';
import PressableHybrid from '../../components/PressableHybrid';
import { BalancePill } from '../../components/completion/V2DoneScreen';
import { HOME_RUNE_ICON_SOURCE } from '../../components/home/homeRuneAsset';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { KitSectionHead } from '../../components/cards-grid/CardsKit';
import { ThemeAccentFill } from '../../components/v2/ThemeAccentFill';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow } from '../../components/v2/ShadowSurface';
import { triLang, type Lang } from '../../constants/i18n';
import { KIT_MOTION } from '../../constants/motionHybrid';
import { runeWord } from '../../constants/runes';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { AnimatedCountUpText } from '../../components/AnimatedCountUpText';
import { CoinRewardFlight } from '../../components/rewards/CoinRewardFlight';
import { useCoinRewardFlight } from '../../hooks/useCoinRewardFlight';
import { useLineScale } from '../../hooks/useLineScale';

import { inferExpoSpeechLanguage, useAudio } from '../../hooks/use-audio';
import { CardFlipV2 } from './CardFlipV2';
import type { CardsResultMistake } from './session_result_mistakes';

export type { CardsResultMistake };

export type CardsSessionResultV2Props = Readonly<{
  /** «Блиц · B2 глаголы» — режим и набор (макет `.ov`). */
  overline?: string;
  correct: number;
  wrong: number;
  coinsGained: number;
  /** Длительность тренировки в секундах; нет — в плитке «Время» тире. */
  durationSec?: number | null;
  mistakes?: readonly CardsResultMistake[];
  /** Повтор: «Повторить ошибки» (с ошибками) или «Ещё раз» — основная кнопка справа; нет — только «Готово». */
  retryLabel?: string;
  onRetry?: () => void;
  onDone: () => void;
  feedbackSlot?: ReactNode;
  testID?: string;
}>;

const copy = (lang: Lang) => ({
  of: (total: number) => triLang(lang, { ru: `из ${total}`, uk: `з ${total}`, en: `of ${total}`, es: `de ${total}`, 'pt-BR': `de ${total}`, vi: `trên ${total}`, id: `dari ${total}`, tr: `/ ${total}`, pl: `z ${total}` }),
  perfect: triLang(lang, { ru: 'Без единой ошибки', uk: 'Без жодної помилки', en: 'Not a single mistake', es: 'Sin un solo error', 'pt-BR': 'Sem nenhum erro', vi: 'Không sai câu nào', id: 'Tanpa satu kesalahan pun', tr: 'Tek bir hata bile yok', pl: 'Bez ani jednego błędu' }),
  // зачем (Карточки 2.0 12.10): в макете один вердикт с ошибками — «Почти идеально»; для более слабых результатов тексты ждут правки владельца
  almost: triLang(lang, { ru: 'Почти идеально', uk: 'Майже ідеально', en: 'Almost perfect', es: 'Casi perfecto', 'pt-BR': 'Quase perfeito', vi: 'Gần như hoàn hảo', id: 'Hampir sempurna', tr: 'Neredeyse mükemmel', pl: 'Prawie idealnie' }),
  good: triLang(lang, { ru: 'Хороший результат', uk: 'Хороший результат', en: 'Good result', es: 'Buen resultado', 'pt-BR': 'Bom resultado', vi: 'Kết quả tốt', id: 'Hasil bagus', tr: 'İyi sonuç', pl: 'Dobry wynik' }),
  low: triLang(lang, { ru: 'Есть куда расти', uk: 'Є куди рости', en: 'Room to grow', es: 'Hay margen de mejora', 'pt-BR': 'Dá para melhorar', vi: 'Còn có thể tốt hơn', id: 'Masih bisa lebih baik', tr: 'Gelişmeye açık', pl: 'Jest co poprawiać' }),
  right: triLang(lang, { ru: 'Верно', uk: 'Вірно', en: 'Correct', es: 'Correctas', 'pt-BR': 'Certas', vi: 'Đúng', id: 'Benar', tr: 'Doğru', pl: 'Dobrze' }),
  mistakes: triLang(lang, { ru: 'Ошибки', uk: 'Помилки', en: 'Mistakes', es: 'Errores', 'pt-BR': 'Erros', vi: 'Lỗi', id: 'Salah', tr: 'Hata', pl: 'Błędy' }),
  time: triLang(lang, { ru: 'Время', uk: 'Час', en: 'Time', es: 'Tiempo', 'pt-BR': 'Tempo', vi: 'Thời gian', id: 'Waktu', tr: 'Süre', pl: 'Czas' }),
  done: triLang(lang, { ru: 'Готово', uk: 'Готово', en: 'Done', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe' }),
  close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }),
  listen: triLang(lang, { ru: 'Послушать', uk: 'Послухати', en: 'Listen', es: 'Escuchar', 'pt-BR': 'Ouvir', vi: 'Nghe', id: 'Dengarkan', tr: 'Dinle', pl: 'Posłuchaj' }),
});

/** «EN» / «RU» / «PT»: код языка для подписи грани карточки (pt-BR → PT). */
const langChip = (code: string): string => code.split('-')[0].toUpperCase();

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '—';
  const total = Math.round(sec);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Макет `.rise > *`: появление снизу 520 мс cubic-bezier(.2,.8,.2,1), шаг задержки 50 мс. «Уменьшить движение» — без сдвига и задержки. */
const RISE_EASE = REasing.bezier(0.2, 0.8, 0.2, 1);
const Rise = memo(function Rise({ index, children }: Readonly<{ index: number; children: ReactNode }>) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) { p.value = 1; return; }
    p.value = withDelay(index * 50, withTiming(1, { duration: 520, easing: RISE_EASE }));
  }, [index, p, reduce]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 10 }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
});

function CardsSessionResultV2Impl(props: CardsSessionResultV2Props) {
  const g = useLv2Glass();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const lh = useLineScale();
  const insets = useStableSafeAreaInsets();
  const c = useMemo(() => copy(lang), [lang]);
  const total = props.correct + props.wrong;
  const accuracy = total > 0 ? props.correct / total : 0;
  const perfect = total > 0 && props.wrong === 0;
  const verdict = perfect ? c.perfect : accuracy >= 0.8 ? c.almost : accuracy >= 0.5 ? c.good : c.low;
  const coins = Math.max(0, Math.round(props.coinsGained)); // guard-ok: только показ начисленного, баланс не меняется
  const mistakes = props.mistakes ?? [];
  const audio = useAudio();
  // зачем: тот же путь озвучки, что в тренировке (язык набора → голос), чтобы слово в итоге звучало так же.
  const speak = React.useCallback((item: CardsResultMistake) => {
    audio.speak(item.en, undefined, { language: inferExpoSpeechLanguage(item.en, item.packLanguage), cardAudio: true });
  }, [audio]);
  // зачем: нижняя панель абсолютная — прокрутке нужен запас ровно под её высоту (48 + отступы макета 18/34).
  const [dockH, setDockH] = useState(48 + 18 + 34);
  const hasRetry = Boolean(props.retryLabel && props.onRetry);
  // зачем (PM-052, правило наград): начисленные монеты долетают из пилюли «+N» в плашку баланса — один раз,
  // когда обе точки измерены. Reduce motion — fly() ничего не показывает (внутри хука).
  const coinFlight = useCoinRewardFlight();
  const [originReady, setOriginReady] = useState(false);
  const [targetReady, setTargetReady] = useState(false);
  const flownRef = useRef(false);
  useEffect(() => {
    if (coins <= 0 || !originReady || !targetReady || flownRef.current) return undefined;
    flownRef.current = true;
    const frame = requestAnimationFrame(() => coinFlight.fly(coins));
    return () => cancelAnimationFrame(frame);
  }, [coinFlight, coins, originReady, targetReady]);
  const frontChip = langChip(studyTarget);
  const backChip = langChip(lang);

  return (
    <View testID={props.testID ?? 'fc-session-result'} style={[s.root, { backgroundColor: g.bg }]}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 8, paddingBottom: dockH + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets decelerationRate="fast"
      >
        {/* макет: справа крестик (`.rb` 42). Слева в макете пусто; здесь стоит плашка баланса — точка прилёта монет (правило наград PM-052, сторож fc_recall_session_contract) */}
        <View style={s.topbar}>
          <View ref={coinFlight.counterRef} collapsable={false} onLayout={() => setTargetReady(true)}>
            <BalancePill g={g} lang={lang} />
          </View>
          <PressableHybrid
            testID={`${props.testID ?? 'fc-session-result'}-close`}
            accessibilityRole="button"
            accessibilityLabel={c.close}
            hitSlop={8}
            onPress={props.onDone}
            variant="icon"
            pressScaleTo={KIT_MOTION.pressScale}
            withSound={false}
            style={s.closeHit}
            contentStyle={[s.close, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }]}
          >
            <Ionicons name="close" size={20} color={g.text} />
          </PressableHybrid>
        </View>

        <View style={s.center}>
          {props.overline ? (
            <Rise index={0}><Text style={[s.ov, { color: g.secondary, lineHeight: lh(17) }]}>{props.overline}</Text></Rise>
          ) : null}
          <Rise index={1}>
            <Text
              accessibilityRole="header"
              accessibilityLabel={`${props.correct} ${c.of(total)}`}
              style={[s.big, { color: g.text, lineHeight: lh(76), marginTop: props.overline ? 14 : 0 }]}
            >
              {props.correct}
              <Text style={[s.bigOf, { color: g.mutedText }]}>{` ${c.of(total)}`}</Text>
            </Text>
          </Rise>
          <Rise index={2}><Text style={[s.verdict, { color: g.secondary, lineHeight: lh(22) }]}>{verdict}</Text></Rise>
        </View>

        {/* макет `.stats`: три плитки в ряд, зазор 10 */}
        <View style={s.stats}>
          {[
            { key: 'right', num: String(props.correct), label: c.right },
            { key: 'wrong', num: String(props.wrong), label: c.mistakes },
            { key: 'time', num: formatDuration(props.durationSec), label: c.time },
          ].map((tile) => (
            <View key={tile.key} style={[s.stt, { boxShadow: plateBoxShadow(g) }]}>
              <PlateFill g={g} radius={18} />
              <Text style={[s.statNum, { color: g.text, lineHeight: lh(30) }]}>{tile.num}</Text>
              <Text style={[s.statLabel, { color: g.secondary, lineHeight: lh(18) }]}>{tile.label}</Text>
            </View>
          ))}
        </View>

        {/* guard-ok: только отображение начисленного, баланс не меняется */}
        <View style={s.coinRow}>
          <View ref={coinFlight.originRef} collapsable={false} onLayout={() => setOriginReady(true)} style={[s.pill, { backgroundColor: g.opaqueControl, boxShadow: nestedBoxShadow(g) }]} accessible accessibilityLabel={`+${coins} ${runeWord(lang, coins)}`}>
            <Image source={HOME_RUNE_ICON_SOURCE} style={s.coin} contentFit="contain" accessible={false} />
            <View style={s.plusNum}>
              <Text style={[s.pillText, { color: g.text }]}>+</Text>
              <AnimatedCountUpText value={coins} durationMs={KIT_MOTION.counterMs} style={[s.pillText, { color: g.text }]} accessible={false} importantForAccessibility="no-hide-descendants" />
            </View>
          </View>
        </View>

        {!perfect && mistakes.length > 0 ? (
          <>
            <KitSectionHead g={g} title={c.mistakes} count={mistakes.length} />
            <View style={s.stack}>
              {mistakes.map((m) => (
                <CardFlipV2
                  key={m.id}
                  g={g}
                  front={m.en}
                  back={m.translation}
                  frontLabel={frontChip}
                  backLabel={backChip}
                  height={132}
                  // D127: карточку «без языка» не озвучиваем — кнопки нет.
                  onSpeak={m.packLanguage !== 'none' ? () => speak(m) : undefined}
                  speakLabel={`${c.listen}: ${m.en}`}
                  testID={`fc-result-mistake-${m.id}`}
                />
              ))}
            </View>
          </>
        ) : null}

        {props.feedbackSlot ? <View style={{ marginTop: 22 }}>{props.feedbackSlot}</View> : null}
      </ScrollView>

      <View
        onLayout={(e) => setDockH(e.nativeEvent.layout.height)}
        style={[s.dock, { paddingBottom: Math.max(34, insets.bottom + 16) }]}
      >
        <LinearGradient pointerEvents="none" colors={['transparent', g.bg]} locations={[0, 0.3]} style={StyleSheet.absoluteFill} />
        {/* макет: слева «Готово» (контурная → плашка), справа главная «Повторить ошибки» / «Ещё раз»; без повтора — одна главная «Готово» */}
        <View style={s.two}>
          {hasRetry ? (
            <PressableHybrid
              testID="fc-result-done"
              accessibilityRole="button"
              onPress={props.onDone}
              variant="secondary"
              pressScaleTo={KIT_MOTION.pressScale}
              style={s.flex}
              contentStyle={[s.cta, s.ghost, { backgroundColor: g.opaqueControl, boxShadow: nestedBoxShadow(g) }]}
            >
              <Text style={[s.ctaText, { color: g.text }]}>{c.done}</Text>
            </PressableHybrid>
          ) : null}
          <PressableHybrid
            testID={hasRetry ? 'fc-result-retry' : 'fc-result-done'}
            accessibilityRole="button"
            onPress={hasRetry ? props.onRetry : props.onDone}
            variant="primary"
            pressScaleTo={KIT_MOTION.pressScale}
            style={s.flex}
            contentStyle={[s.cta, { backgroundColor: g.accent, boxShadow: actionBoxShadow(g) }]}
          >
            <ThemeAccentFill glass={g} radius={24} />
            <Text style={[s.ctaText, { color: g.accentInk }]}>{hasRetry ? props.retryLabel : c.done}</Text>
          </PressableHybrid>
        </View>
      </View>
      {coinFlight.flight ? (
        <CoinRewardFlight
          key={coinFlight.flight.key}
          from={coinFlight.flight.from}
          to={coinFlight.flight.to}
          count={coinFlight.flight.count}
          onDone={coinFlight.clearFlight}
        />
      ) : null}
    </View>
  );
}

export const CardsSessionResultV2 = memo(CardsSessionResultV2Impl);
export default CardsSessionResultV2;

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  // kit `.topbar` 44, `.rb` 42 круглая; макет — крестик справа
  topbar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeHit: { width: 42, height: 42, alignSelf: 'auto' },
  close: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', marginTop: 30 },
  // kit `.ov`
  ov: { fontSize: 13, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center' },
  // cards-v2 `.big` 72/76 800, «из N» 28 приглушённым
  big: { fontSize: 72, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'], textAlign: 'center' },
  bigOf: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4 },
  verdict: { fontSize: 16, marginTop: 6, textAlign: 'center' },
  // `.stats`: сетка 3, зазор 10, сверху 26; `.stt` r18, поля 14/14/12
  stats: { flexDirection: 'row', gap: 10, marginTop: 26 },
  stt: { flex: 1, minWidth: 0, borderRadius: 18, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 12 },
  statNum: { fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 13 },
  coinRow: { marginTop: 16, alignItems: 'center' },
  // `.pill`: 35 высотой, поля 17, зазор 9
  pill: { minHeight: 35, borderRadius: 18, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 9 },
  pillText: { fontSize: 16, lineHeight: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  plusNum: { flexDirection: 'row', alignItems: 'center' },
  coin: { width: 20, height: 20 },
  stack: { gap: 13 }, // макет `.stack.g13`
  // cards-section `.bot`: 18/20/34, затухание к фону
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 18, paddingHorizontal: 20 },
  two: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  // kit `.cta` 48/r24, текст 17/700 → 16/700, зазор значка 12
  cta: { minHeight: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, overflow: 'hidden' },
  // зачем (Тень 12.10): контурная `.cta.gh` заменена плашкой с малой тенью; overflow снят, чтобы тень не клипалась
  ghost: { overflow: 'visible' },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
