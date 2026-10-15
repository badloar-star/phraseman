import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { memo, useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';

import { useLang } from '../LangContext';
import { useLv2Glass, type Lv2Glass } from '../learning-v2/LearningV2Glass';
import { HOME_RUNE_ICON_SOURCE } from '../home/homeRuneAsset';
import { nestedBoxShadow, plateBoxShadow } from '../v2/ShadowSurface';
import { peekRunes } from '../../app/runes_system';
import { subscribeAppSnapshot } from '../../app/app_snapshot_store';
import { triLang, type Lang } from '../../constants/i18n';
import { runeWord } from '../../constants/runes';
import { hapticTap } from '../../hooks/use-haptics';
import { V2_TYPE } from '../../constants/v2Style';
import type { DoneChainAfter, DoneChainBefore } from './done_chain_gate';

/**
 * Общий экран завершения 2.0 — макет docs/design/v2-app/learn.html раздел E
 * («Итог урока — общий экран завершения», D36/D64.1, PM-137).
 *
 * зачем (владелец 01.10): «старые экраны все должны быть заменены на макетные».
 * Один компонент для всех режимов: урок, карточки, ошибки, диалоги, сессии.
 * Порядок как в макете: шапка (закрыть + монеты) → заголовок и подзаголовок →
 * три звезды → подпись под звёздами → «верно / ошибок / точность» → начисление
 * монет → заметка Plus → ошибки → «Всё было понятно?» → главная кнопка и тихая ссылка.
 * Данных, которых у режима нет, экран не выдумывает: блок просто не рисуется.
 */

export type V2DoneError = Readonly<{ label: string; was: string; ok: string }>;

export type V2DoneScreenProps = Readonly<{
  title: string;
  subtitle?: string;
  /** Плашка «Счёт: 1 250» под заголовком (Блиц). */
  scoreLabel?: string;
  /** 0–3; null — у режима нет звёзд (комбо, карточки). */
  stars: number | null;
  starsNote?: string;
  correct: number | null;
  wrong: number | null;
  coinsGained: number;
  plusNote?: Readonly<{ title: string; body: string }>;
  errors?: readonly V2DoneError[];
  onRepeatErrors?: () => void;
  /** Форма «Всё было понятно?» и прочие вставки режима. */
  feedbackSlot?: ReactNode;
  primaryLabel: string;
  /** Основное действие уже выполняется (асинхронные проверки перед переходом): кнопка остаётся в нажатом состоянии и не принимает повторный тап. Без спиннера. */
  primaryBusy?: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose: () => void;
  testID?: string;
  /**
   * m10 «семь ударов» (moments_v3): блоки всплывают по очереди, монеты летят в баланс, серия и «Сегодня · Пройти урок» закрываются.
   * Нет — экран ровно прежний. before — снимок серии и задачи дня с первого кадра итога (captureDoneChainBefore).
   */
  chain?: Readonly<{ before: DoneChainBefore; onFinished?: () => void; previewAfter?: DoneChainAfter }>;
}>;

const copy = (lang: Lang) => ({
  correct: triLang(lang, { ru: 'верно', uk: 'вірно', en: 'correct', es: 'correctas', 'pt-BR': 'certas', vi: 'đúng', id: 'benar', tr: 'doğru', pl: 'dobrze' }),
  wrong: triLang(lang, { ru: 'ошибок', uk: 'помилок', en: 'mistakes', es: 'errores', 'pt-BR': 'erros', vi: 'lỗi', id: 'salah', tr: 'hata', pl: 'błędów' }),
  accuracy: triLang(lang, { ru: 'точность', uk: 'точність', en: 'accuracy', es: 'precisión', 'pt-BR': 'precisão', vi: 'độ chính xác', id: 'akurasi', tr: 'doğruluk', pl: 'dokładność' }),
  errors: triLang(lang, { ru: 'Ошибки', uk: 'Помилки', en: 'Mistakes', es: 'Errores', 'pt-BR': 'Erros', vi: 'Lỗi', id: 'Kesalahan', tr: 'Hatalar', pl: 'Błędy' }),
  repeatErrors: triLang(lang, { ru: 'Повторить ошибки', uk: 'Повторити помилки', en: 'Practice mistakes', es: 'Repasar errores', 'pt-BR': 'Revisar erros', vi: 'Ôn lại lỗi', id: 'Ulangi kesalahan', tr: 'Hataları tekrarla', pl: 'Powtórz błędy' }),
  close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }),
  stars: (n: number) => triLang(lang, { ru: `${n} из 3 звёзд`, uk: `${n} з 3 зірок`, en: `${n} of 3 stars`, es: `${n} de 3 estrellas`, 'pt-BR': `${n} de 3 estrelas`, vi: `${n}/3 sao`, id: `${n} dari 3 bintang`, tr: `3 yıldızdan ${n}`, pl: `${n} z 3 gwiazdek` }),
});

const Star = memo(function Star({ on, index, g, animate }: { on: boolean; index: number; g: Lv2Glass; animate: boolean }) {
  // Макет: звезда «выстреливает» по очереди (starpop 700 мс), выключенные — тёмные.
  const scale = useSharedValue(animate && on ? 0.3 : 1);
  const opacity = useSharedValue(animate && on ? 0 : 1);
  useEffect(() => {
    if (!animate || !on) return;
    scale.value = withDelay(220 + index * 180, withSpring(1, { damping: 9, stiffness: 180 }));
    opacity.value = withDelay(220 + index * 180, withTiming(1, { duration: 180 }));
  }, [animate, index, on, opacity, scale]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return (
    <Reanimated.View style={style}>
      <Ionicons name="star" size={46} color={on ? g.text : g.opaqueControl} />
    </Reanimated.View>
  );
});

// зачем (решение владельца 13.10, монеты за диалог): тот же блок «+N монет» нужен итогу диалога — не дублируем анимацию.
export const CoinAward = memo(function CoinAward({ amount, lang, g, animate }: { amount: number; lang: Lang; g: Lv2Glass; animate: boolean }) {
  // Макет: монета «пружинит», счёт растёт от 0 до суммы.
  const [shown, setShown] = useState(animate ? 0 : amount);
  const pop = useSharedValue(animate ? 0.5 : 1);
  useEffect(() => {
    if (!animate) { setShown(amount); return undefined; }
    pop.value = withDelay(700, withSpring(1, { damping: 8, stiffness: 160 }));
    const startedAt = Date.now() + 700;
    const DURATION = 800;
    const timer = setInterval(() => {
      const p = Math.min(1, Math.max(0, (Date.now() - startedAt) / DURATION));
      setShown(Math.round(amount * p));
      if (p >= 1) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [amount, animate, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <View style={s.award} accessible accessibilityLabel={`+${amount} ${runeWord(lang, amount)}`}>
      <Reanimated.View style={style}>
        <Image source={HOME_RUNE_ICON_SOURCE} style={s.awardCoin} contentFit="contain" accessible={false} />
      </Reanimated.View>
      <Text style={[s.awardNum, { color: g.text }]}>+{shown}</Text>
      <Text style={[s.awardUnit, { color: g.secondary }]}>{runeWord(lang, amount)}</Text>
    </View>
  );
});

// Плашка баланса в шапке — как .pill макета: фон, тонкая обводка, монета и число «1 285».
// Первый кадр синхронно из снапшота (Performance Bible), дальше — подписка на снапшот.
// зачем (итог Карточек, cards-section 05.10): та же плашка баланса нужна экрану итога раздела — не дублируем.
export const BalancePill = memo(function BalancePill({ g, lang }: { g: Lv2Glass; lang: Lang }) {
  const [balance, setBalance] = useState(() => peekRunes());
  useEffect(() => subscribeAppSnapshot(() => setBalance(peekRunes())), []);
  const value = Math.max(0, Math.round(Number(balance) || 0));
  // Hermes не всегда группирует toLocaleString — делим на тройки сами (неразрывный пробел).
  const text = String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (
    <View testID="v2-done-balance" accessible accessibilityLabel={`${value} ${runeWord(lang, value)}`} style={[s.balance, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }]}>
      <Image source={HOME_RUNE_ICON_SOURCE} style={s.balanceCoin} contentFit="contain" accessible={false} />
      <Text style={[s.balanceText, { color: g.text }]}>{text}</Text>
    </View>
  );
});

export default function V2DoneScreen(props: V2DoneScreenProps) {
  const g = useLv2Glass();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const reduced = useReducedMotion();
  const animate = !reduced;
  const c = copy(lang);
  const { stars, correct, wrong } = props;
  const total = (correct ?? 0) + (wrong ?? 0);
  const accuracy = total > 0 ? Math.round(((correct ?? 0) / total) * 100) : 0;
  const hasStats = correct != null && wrong != null;
  // зачем (координатор 15.10, m10 за флагом moments_v3): цепочка грузится require'ом только когда экран её попросил — прежние итоги (слова, глаголы, предлоги, диалоги) её не тянут
  const Chain = props.chain ? (require('./V2DoneChain') as typeof import('./V2DoneChain')) : null;
  const beat = (i: number, node: ReactNode): ReactNode => (Chain ? <Chain.ChainBeat index={i}>{node}</Chain.ChainBeat> : node);
  const FOOT = 7;
  const DOCK_BEAT = 1;

  if (Chain && props.chain) {
    return (
      <Chain.DoneChainProvider before={props.chain.before} lang={lang} onFinished={props.chain.onFinished} previewAfter={props.chain.previewAfter}>
        {(skip) => renderBody(skip)}
      </Chain.DoneChainProvider>
    );
  }
  return renderBody(undefined);

  function renderBody(skip: (() => void) | undefined) {
  return (
    <View testID={props.testID ?? 'v2-done-screen'} onTouchStart={skip} style={[s.root, { backgroundColor: g.bg }]}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 8, paddingBottom: 170 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        // зачем: в feedbackSlot живёт форма «Всё было понятно?» с полем ввода — клавиатура не должна её закрывать.
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets decelerationRate="fast"
      >
        <View style={s.head}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.close}
            hitSlop={8}
            onPress={() => { hapticTap(); props.onClose(); }}
            style={[s.round, { backgroundColor: g.opaqueCard }]}
          >
            <Ionicons name="close" size={20} color={g.text} />
          </Pressable>
          {/* зачем (эталон m10): в цепочке баланс живёт в строке монет — туда летят монеты; второй плашки в шапке нет */}
          {Chain ? null : <BalancePill g={g} lang={lang} />}
        </View>

        {Chain ? (
          <>
            {beat(0, <Text accessibilityRole="header" style={[s.chainOv, { color: g.secondary }]}>{props.title}</Text>)}
            {stars != null ? beat(1, <Chain.ChainStars stars={stars} g={g} accessibilityLabel={c.stars(stars)} />) : null}
            {beat(2, (
              <>
                {props.subtitle ? <Text style={[s.chainName, { color: g.text }]}>{props.subtitle}</Text> : null}
                {props.starsNote ? <Text style={[s.starsNote, { color: g.secondary }]}>{props.starsNote}</Text> : null}
              </>
            ))}
          </>
        ) : null}

        {Chain ? null : <View style={s.titleBox}>
          <Text accessibilityRole="header" style={[s.title, { color: g.text }]}>{props.title}</Text>
          {props.subtitle ? <Text style={[s.sub, { color: g.secondary }]}>{props.subtitle}</Text> : null}
          {props.scoreLabel ? (
            <View style={[s.scorePill, { backgroundColor: g.opaqueCard }]}>
              <Text style={[s.scoreText, { color: g.text }]}>{props.scoreLabel}</Text>
            </View>
          ) : null}
        </View>}

        {!Chain && stars != null ? (
          <View style={s.stars} accessible accessibilityLabel={c.stars(stars)}>
            {[0, 1, 2].map((i) => <Star key={i} index={i} on={i < stars} g={g} animate={animate} />)}
          </View>
        ) : null}
        {!Chain && props.starsNote ? <Text style={[s.starsNote, { color: g.secondary }]}>{props.starsNote}</Text> : null}

        {hasStats ? beat(3, (
          <View style={[s.stats, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }]}>
            <View style={s.stat}>
              <Text style={[s.statNum, { color: g.good }]}>{correct}</Text>
              <Text style={[s.statLabel, { color: g.secondary }]}>{c.correct}</Text>
            </View>
            <View style={[s.stat, s.statDivider, { borderColor: g.dividerTone }]}>
              <Text style={[s.statNum, { color: g.bad }]}>{wrong}</Text>
              <Text style={[s.statLabel, { color: g.secondary }]}>{c.wrong}</Text>
            </View>
            <View style={[s.stat, s.statDivider, { borderColor: g.dividerTone }]}>
              <Text style={[s.statNum, { color: g.text }]}>{accuracy}%</Text>
              <Text style={[s.statLabel, { color: g.secondary }]}>{c.accuracy}</Text>
            </View>
          </View>
        )) : null}

        {/* guard-ok: только отображение начисленного, баланс не меняется */}
        {Chain ? (
          <>
            {beat(4, <Chain.ChainCoinRow amount={Math.max(0, Math.round(props.coinsGained))} g={g} lang={lang} />)}
            {beat(5, <Chain.ChainStreakRow g={g} lang={lang} />)}
            {beat(6, <Chain.ChainTodayRow g={g} />)}
          </>
        ) : <CoinAward amount={Math.max(0, Math.round(props.coinsGained))} lang={lang} g={g} animate={animate} />}

        {beat(FOOT, (<>
        {props.plusNote ? (
          <View style={[s.panel, s.plusNote, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }]}>
            <View style={[s.tile, { backgroundColor: g.opaqueControl }]}>
              <Ionicons name="lock-closed" size={20} color={g.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.plusTitle, { color: g.text }]}>{props.plusNote.title}</Text>
              <Text style={[s.plusBody, { color: g.secondary }]}>{props.plusNote.body}</Text>
            </View>
          </View>
        ) : null}

        {props.errors && props.errors.length > 0 ? (
          <View style={[s.panel, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }]}>
            <View style={s.errHead}>
              <Text style={[s.errTitle, { color: g.text }]}>{c.errors}</Text>
              <Text style={[s.errCount, { color: g.mutedText }]}>{props.errors.length}</Text>
            </View>
            {props.errors.map((e, i) => (
              // зачем (practice.html `.er`): слово слева колонкой 92, справа «было → стало»; между строками тонкая линия.
              <View key={`${e.label}-${i}`} style={[s.errRow, i === 0 ? null : { borderTopWidth: StyleSheet.hairlineWidth /* shadow-ok: разделитель-линия между строками */, borderTopColor: g.dividerTone }]}>
                <Text style={[s.errLabel, { color: g.text }]}>{e.label}</Text>
                <View style={s.errLine}>
                  <Text style={[s.errWas, { color: g.bad }]}>{e.was}</Text>
                  <Ionicons name="arrow-forward" size={16} color={g.mutedText} />
                  <Text style={[s.errOk, { color: g.good }]}>{e.ok}</Text>
                </View>
              </View>
            ))}
            {props.onRepeatErrors ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => { hapticTap(); props.onRepeatErrors?.(); }}
                style={[s.ghost, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}
              >
                <Ionicons name="refresh" size={18} color={g.text} />
                <Text style={[s.ghostText, { color: g.text }]}>{c.repeatErrors}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {props.feedbackSlot ? <View style={{ marginTop: 14 }}>{props.feedbackSlot}</View> : null}
        </>))}
      </ScrollView>

      {dock(
        <>
        <Pressable
          testID="v2-done-primary"
          accessibilityRole="button"
          onPress={() => { if (props.primaryBusy) return; hapticTap(); props.onPrimary(); }}
          accessibilityState={{ busy: props.primaryBusy === true, disabled: props.primaryBusy === true }}
          // зачем (аудит Optimistic UI Уроков, 13.10): пока идут проверки перед переходом, кнопка держит нажатый вид (масштаб и приглушение) — тап не выглядит потерянным
          style={({ pressed }) => [s.cta, { backgroundColor: g.cta, transform: [{ scale: pressed || props.primaryBusy ? 0.98 : 1 }], opacity: props.primaryBusy ? 0.72 : 1 }]}
        >
          <Text style={[s.ctaText, { color: g.ctaInk }]}>{props.primaryLabel}</Text>
          <Ionicons name="arrow-forward" size={20} color={g.ctaInk} style={s.ctaArrow} />
        </Pressable>
        {props.secondaryLabel && props.onSecondary ? (
          <Pressable
            testID="v2-done-secondary"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => { hapticTap(); props.onSecondary?.(); }}
          >
            <Text style={[s.quiet, { color: g.secondary }]}>{props.secondaryLabel}</Text>
          </Pressable>
        ) : null}
        </>,
      )}
    </View>
  );
  }

  function dock(children: ReactNode) {
    // зачем (Ревизор 15.10): кнопки не ждут конца цепочки (было 4,6 с) — всплывают вторым ударом, на 0,92 с, и сразу принимают тап
    if (Chain) return <Chain.ChainBeat index={DOCK_BEAT} style={[s.dock, { paddingBottom: Math.max(24, insets.bottom + 16), backgroundColor: g.bg }]}>{children}</Chain.ChainBeat>;
    return <View style={[s.dock, { paddingBottom: Math.max(24, insets.bottom + 16), backgroundColor: g.bg }]}>{children}</View>;
  }
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  // зачем («Тень» 12.10): плашки без обводок — заливка и тень из ShadowSurface
  balance: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, borderRadius: 20, paddingHorizontal: 12 },
  balanceCoin: { width: 20, height: 20 },
  balanceText: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titleBox: { alignItems: 'center', marginTop: 18 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  sub: { fontSize: 16, lineHeight: 22, marginTop: 6, textAlign: 'center' },
  scorePill: { marginTop: 12, minHeight: 32, borderRadius: 16, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 22 },
  starsNote: { textAlign: 'center', fontSize: 16, fontWeight: '700', marginTop: 10 },
  stats: { flexDirection: 'row', borderRadius: 16, marginTop: 20, paddingVertical: 15 },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth }, // shadow-ok: вертикальный разделитель-линия между цифрами, не контейнер
  statNum: { fontSize: 30, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  // зачем (practice.html `.award`): монета → число 14, число 34/700; подпись «монет» в 10 от числа.
  award: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12, height: 54 },
  awardCoin: { width: 44, height: 44 },
  awardNum: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  awardUnit: { fontSize: 16, fontWeight: '600', marginLeft: -4 },
  panel: { borderRadius: 16, marginTop: 14, padding: 16 },
  plusNote: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tile: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  plusTitle: { fontSize: 16, fontWeight: '700' },
  plusBody: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  errHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errTitle: { fontSize: 16, fontWeight: '700' },
  errCount: { fontSize: 16, fontWeight: '700' },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  errLabel: { width: 92, fontSize: 16, fontWeight: '700' },
  errLine: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, columnGap: 10 },
  errWas: { fontSize: 16, fontWeight: '600', textDecorationLine: 'line-through' },
  errOk: { fontSize: 16, fontWeight: '600' },
  // зачем («Тень» 12.10): контурная кнопка «Повторить ошибки» стала вложенной плиткой с малой тенью
  ghost: { minHeight: 44, borderRadius: 22, marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ghostText: { fontSize: 16, fontWeight: '600' },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12 },
  cta: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700' },
  ctaArrow: { position: 'absolute', right: 22 },
  // зачем (эталон m10 `.ov` / `.h-lg`): «Урок пройден» — надстрочник, название урока — крупный заголовок под звёздами
  chainOv: { ...V2_TYPE.overline, textTransform: 'uppercase', textAlign: 'center', marginTop: 24 },
  chainName: { ...V2_TYPE.title, textAlign: 'center', marginTop: 14 },
  quiet: { textAlign: 'center', fontSize: 16, fontWeight: '600', marginTop: 14, minHeight: 22 },
});
