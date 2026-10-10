/**
 * Итог тренировки Карточек — макет docs/design/v2-app/cards-section.html, блок «Итог тренировки»
 * (`result`, `resMix`, `resBlitz`, `resPerfect`).
 *
 * зачем (владелец 05.10 11:10 через координатора, решение 3): итог Карточек — свой экран раздела,
 * а не общий экран завершения: шапка (✕ + монеты), надпись «режим · набор», крупное «17/20»,
 * карточка «точность · время · монеты», список «Что исправить», внизу «Ошибки · N» и «Готово».
 * Без ошибок — плитка с галочкой и «Без единой ошибки». Данных, которых у режима нет, экран
 * не выдумывает: нет времени — в ячейке тире, нет списка ошибок — нет секции.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from '../../components/SafeLinearGradient';
import PressableHybrid from '../../components/PressableHybrid';
import { BalancePill } from '../../components/completion/V2DoneScreen';
import { HOME_RUNE_ICON_SOURCE } from '../../components/home/homeRuneAsset';
import { useLang } from '../../components/LangContext';
import { useLv2Glass, type Lv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { ThemeAccentFill } from '../../components/v2/ThemeAccentFill';
import { triLang, type Lang } from '../../constants/i18n';
import { KIT_MOTION } from '../../constants/motionHybrid';
import { runeWord } from '../../constants/runes';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { AnimatedCountUpText } from '../../components/AnimatedCountUpText';
import { CoinRewardFlight } from '../../components/rewards/CoinRewardFlight';
import { useCoinRewardFlight } from '../../hooks/useCoinRewardFlight';

import { inferExpoSpeechLanguage, useAudio } from '../../hooks/use-audio';
import type { CardsResultMistake } from './session_result_mistakes';

export type { CardsResultMistake };

export type CardsSessionResultV2Props = Readonly<{
  /** «Блиц · B2 глаголы» — режим и набор (макет `.ov`). */
  overline?: string;
  correct: number;
  wrong: number;
  coinsGained: number;
  /** Длительность тренировки в секундах; нет — в ячейке «время» тире. */
  durationSec?: number | null;
  mistakes?: readonly CardsResultMistake[];
  /** Повтор: «Ошибки · N» (с ошибками) или «Ещё раз» (Блиц) — макет `.cta.gh` с значком refresh. */
  retryLabel?: string;
  onRetry?: () => void;
  onDone: () => void;
  feedbackSlot?: ReactNode;
  testID?: string;
}>;

const copy = (lang: Lang) => ({
  correctOf: triLang(lang, { ru: 'верных ответов', uk: 'правильних відповідей', en: 'correct answers', es: 'respuestas correctas', 'pt-BR': 'respostas certas', vi: 'câu trả lời đúng', id: 'jawaban benar', tr: 'doğru cevap', pl: 'poprawnych odpowiedzi' }),
  perfect: triLang(lang, { ru: 'Без единой ошибки', uk: 'Без жодної помилки', en: 'Not a single mistake', es: 'Sin un solo error', 'pt-BR': 'Sem nenhum erro', vi: 'Không sai câu nào', id: 'Tanpa satu kesalahan pun', tr: 'Tek bir hata bile yok', pl: 'Bez ani jednego błędu' }),
  accuracy: triLang(lang, { ru: 'точность', uk: 'точність', en: 'accuracy', es: 'precisión', 'pt-BR': 'precisão', vi: 'độ chính xác', id: 'akurasi', tr: 'doğruluk', pl: 'dokładność' }),
  time: triLang(lang, { ru: 'время', uk: 'час', en: 'time', es: 'tiempo', 'pt-BR': 'tempo', vi: 'thời gian', id: 'waktu', tr: 'süre', pl: 'czas' }),
  coins: triLang(lang, { ru: 'монет', uk: 'монет', en: 'coins', es: 'monedas', 'pt-BR': 'moedas', vi: 'xu', id: 'koin', tr: 'jeton', pl: 'monet' }),
  fix: triLang(lang, { ru: 'Что исправить', uk: 'Що виправити', en: 'What to fix', es: 'Qué corregir', 'pt-BR': 'O que corrigir', vi: 'Cần sửa gì', id: 'Yang perlu diperbaiki', tr: 'Düzeltilecekler', pl: 'Co poprawić' }),
  done: triLang(lang, { ru: 'Готово', uk: 'Готово', en: 'Done', es: 'Listo', 'pt-BR': 'Pronto', vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe' }),
  close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }),
  listen: triLang(lang, { ru: 'Послушать', uk: 'Послухати', en: 'Listen', es: 'Escuchar', 'pt-BR': 'Ouvir', vi: 'Nghe', id: 'Dengarkan', tr: 'Dinle', pl: 'Posłuchaj' }),
});

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '—';
  const total = Math.round(sec);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const FixRow = memo(function FixRow({ item, g, listenLabel, onSpeak }: { item: CardsResultMistake; g: Lv2Glass; listenLabel: string; onSpeak: (item: CardsResultMistake) => void }) {
  // D127: карточку «без языка» не озвучиваем — кнопки нет.
  const canSpeak = item.packLanguage !== 'none';
  // макет `wordRow`: карточка r14, мин. 68, слово 17/600, перевод 15 вторичным, справа кнопка озвучки `.rb.fill` 35.
  return (
    <View style={[s.fixRow, { backgroundColor: g.opaqueCard, borderColor: g.line }]}>
      <View style={s.fixText}>
        <Text style={[s.fixWord, { color: g.text }]}>{item.en}</Text>
        <Text style={[s.fixTr, { color: g.secondary }]}>{item.translation}</Text>
      </View>
      {canSpeak ? (
        <PressableHybrid
          accessibilityRole="button"
          accessibilityLabel={`${listenLabel}: ${item.en}`}
          hitSlop={6}
          onPress={() => onSpeak(item)}
          variant="icon"
          pressScaleTo={KIT_MOTION.pressScale}
          withSound={false}
          style={s.volHit}
          contentStyle={[s.vol, { backgroundColor: g.opaqueControl, borderColor: g.line }]}
        >
          <Ionicons name="volume-high-outline" size={18} color={g.text} />
        </PressableHybrid>
      ) : null}
    </View>
  );
});

function CardsSessionResultV2Impl(props: CardsSessionResultV2Props) {
  const g = useLv2Glass();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const c = useMemo(() => copy(lang), [lang]);
  const total = props.correct + props.wrong;
  const accuracy = total > 0 ? Math.round((props.correct / total) * 100) : 0;
  const perfect = total > 0 && props.wrong === 0;
  const coins = Math.max(0, Math.round(props.coinsGained)); // guard-ok: только показ начисленного, баланс не меняется
  const mistakes = props.mistakes ?? [];
  const audio = useAudio();
  // зачем: тот же путь озвучки, что в тренировке (язык набора → голос), чтобы слово в итоге звучало так же.
  const speak = React.useCallback((item: CardsResultMistake) => {
    audio.speak(item.en, undefined, { language: inferExpoSpeechLanguage(item.en, item.packLanguage), cardAudio: true });
  }, [audio]);
  // зачем: нижняя панель абсолютная — прокрутке нужен запас ровно под её высоту (48 + отступы макета 18/34).
  const [dockH, setDockH] = useState(48 + 18 + 34);
  // зачем (PM-052, правило наград): начисленные монеты долетают из ячейки «монет» в плашку баланса — один раз,
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

  return (
    <View testID={props.testID ?? 'fc-session-result'} style={[s.root, { backgroundColor: g.bg }]}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 8, paddingBottom: dockH + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets decelerationRate="fast"
      >
        <View style={s.topbar}>
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
            contentStyle={[s.close, { backgroundColor: g.opaqueControl, borderColor: g.line }]}
          >
            <Ionicons name="close" size={20} color={g.text} />
          </PressableHybrid>
          <View ref={coinFlight.counterRef} collapsable={false} onLayout={() => setTargetReady(true)}>
            <BalancePill g={g} lang={lang} />
          </View>
        </View>

        <View style={[s.center, { marginTop: perfect ? 90 : 34 }]}>
          {perfect ? (
            <View style={[s.okTile, { backgroundColor: g.opaqueControl }]}>
              <Ionicons name="checkmark" size={28} color={g.good} />
            </View>
          ) : null}
          {props.overline ? (
            <Text style={[s.ov, { color: g.secondary, marginTop: perfect ? 26 : 0 }]}>{props.overline}</Text>
          ) : null}
          <Text
            accessibilityRole="header"
            style={[s.big, { color: g.text, marginTop: props.overline ? (perfect ? 12 : 14) : perfect ? 26 : 0 }]}
          >
            {`${props.correct}/${total}`}
          </Text>
          <Text style={[s.sub, { color: g.secondary }]}>{perfect ? c.perfect : c.correctOf}</Text>
        </View>

        <View style={[s.stats, { backgroundColor: g.opaqueSheet, borderColor: g.line }]}>
          <View style={s.stat}>
            <Text style={[s.statNum, { color: g.text }]}>{`${accuracy}%`}</Text>
            <Text style={[s.statLabel, { color: g.secondary }]}>{c.accuracy}</Text>
          </View>
          <View style={[s.stat, s.statDivider, { borderColor: g.line }]}>
            <Text style={[s.statNum, { color: g.text }]}>{formatDuration(props.durationSec)}</Text>
            <Text style={[s.statLabel, { color: g.secondary }]}>{c.time}</Text>
          </View>
          {/* guard-ok: только отображение начисленного, баланс не меняется */}
          <View style={[s.stat, s.statDivider, { borderColor: g.line }]} accessible accessibilityLabel={`+${coins} ${runeWord(lang, coins)}`}>
            <View ref={coinFlight.originRef} collapsable={false} onLayout={() => setOriginReady(true)} style={s.coinLine}>
              <Image source={HOME_RUNE_ICON_SOURCE} style={s.coin} contentFit="contain" accessible={false} />
              <View style={s.plusNum}>
                <Text style={[s.statNum, { color: g.text }]}>+</Text>
                <AnimatedCountUpText value={coins} durationMs={KIT_MOTION.counterMs} style={[s.statNum, { color: g.text }]} accessible={false} importantForAccessibility="no-hide-descendants" />
              </View>
            </View>
            <Text style={[s.statLabel, { color: g.secondary }]}>{c.coins}</Text>
          </View>
        </View>

        {!perfect && mistakes.length > 0 ? (
          <>
            <View style={s.sec}>
              <Text style={[s.secTitle, { color: g.text }]}>
                {c.fix}
                <Text style={[s.secCount, { color: g.mutedText }]}>{`  ${mistakes.length}`}</Text>
              </Text>
            </View>
            <View style={s.stack}>
              {mistakes.map((m) => <FixRow key={m.id} item={m} g={g} listenLabel={c.listen} onSpeak={speak} />)}
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
        <View style={s.two}>
          {!perfect && props.retryLabel && props.onRetry ? (
            <PressableHybrid
              testID="fc-result-retry"
              accessibilityRole="button"
              onPress={props.onRetry}
              variant="secondary"
              pressScaleTo={KIT_MOTION.pressScale}
              style={s.flex}
              contentStyle={[s.cta, s.ghost, { borderColor: `${g.text}4D` }]}
            >
              <Ionicons name="refresh" size={18} color={g.text} />
              <Text style={[s.ctaText, { color: g.text }]}>{props.retryLabel}</Text>
            </PressableHybrid>
          ) : null}
          <PressableHybrid
            testID="fc-result-done"
            accessibilityRole="button"
            onPress={props.onDone}
            variant="primary"
            pressScaleTo={KIT_MOTION.pressScale}
            style={s.flex}
            contentStyle={[s.cta, { backgroundColor: g.accent }]}
          >
            <ThemeAccentFill glass={g} radius={24} />
            <Text style={[s.ctaText, { color: g.accentInk }]}>{c.done}</Text>
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
  // kit `.topbar` 44, `.rb` 42 круглая с кромкой
  topbar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeHit: { width: 42, height: 42, alignSelf: 'auto' },
  // guard-ok: 1px кромка `.rb` — по макету 2.0
  close: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  // kit `.tile.t61`
  okTile: { width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  // kit `.ov`
  ov: { fontSize: 13, lineHeight: 16, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center' },
  // cards-section `.big`
  big: { fontSize: 64, lineHeight: 70, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  sub: { fontSize: 16, lineHeight: 22, marginTop: 4, textAlign: 'center' },
  // guard-ok: 1px кромка `.card.c2` — по макету 2.0
  stats: { flexDirection: 'row', marginTop: 30, borderRadius: 22, borderWidth: 1, paddingVertical: 18, paddingHorizontal: 8 },
  stat: { flex: 1, minWidth: 0, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1 },
  statNum: { fontSize: 22, lineHeight: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 13, marginTop: 2 },
  coinLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  plusNum: { flexDirection: 'row', alignItems: 'center' },
  coin: { width: 20, height: 20 },
  // kit `.sec`: отступ 30 сверху, 14 снизу, заголовок 20/26, число приглушённое 600 через 10
  sec: { marginTop: 30, marginBottom: 14, marginHorizontal: 2 },
  secTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  secCount: { fontWeight: '600' },
  stack: { gap: 9 },
  // guard-ok: 1px кромка `.card` — по макету 2.0
  fixRow: { minHeight: 68, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 9, paddingLeft: 18, paddingRight: 16 },
  fixText: { flex: 1, minWidth: 0 },
  fixWord: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  fixTr: { fontSize: 16, lineHeight: 19, marginTop: 1 },
  volHit: { width: 35, height: 35, alignSelf: 'auto' },
  // guard-ok: 1px кромка `.rb.fill` — по макету 2.0
  vol: { width: 35, height: 35, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  // cards-section `.bot`: 18/20/34, затухание к фону
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 18, paddingHorizontal: 20 },
  two: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  // kit `.cta` 48/r24, текст 17/700, зазор значка 12
  cta: { height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, overflow: 'hidden' },
  // guard-ok: контур `.cta.gh` 1px — по макету 2.0
  ghost: { borderWidth: 1, backgroundColor: 'transparent' },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
