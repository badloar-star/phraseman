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
import { RuneBalanceChip } from '../RuneBalanceChip';
import { triLang, type Lang } from '../../constants/i18n';
import { runeWord } from '../../constants/runes';
import { hapticTap } from '../../hooks/use-haptics';

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
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose: () => void;
  testID?: string;
}>;

const copy = (lang: Lang) => ({
  correct: triLang(lang, { ru: 'верно', uk: 'вірно', en: 'correct', es: 'correctas', 'pt-BR': 'certas', vi: 'đúng', id: 'benar', tr: 'doğru', pl: 'dobrze' }),
  wrong: triLang(lang, { ru: 'ошибок', uk: 'помилок', en: 'mistakes', es: 'errores', 'pt-BR': 'erros', vi: 'lỗi', id: 'salah', tr: 'hata', pl: 'błędów' }),
  accuracy: triLang(lang, { ru: 'точность', uk: 'точність', en: 'accuracy', es: 'precisión', 'pt-BR': 'precisão', vi: 'độ chính xác', id: 'akurasi', tr: 'doğruluk', pl: 'dokładność' }),
  errors: triLang(lang, { ru: 'Ошибки', uk: 'Помилки', en: 'Mistakes', es: 'Errores', 'pt-BR': 'Erros', vi: 'Lỗi', id: 'Kesalahan', tr: 'Hatalar', pl: 'Błędy' }),
  repeatErrors: triLang(lang, { ru: 'Повторить ошибки', uk: 'Повторити помилки', en: 'Practise mistakes', es: 'Repasar errores', 'pt-BR': 'Revisar erros', vi: 'Ôn lại lỗi', id: 'Ulangi kesalahan', tr: 'Hataları tekrarla', pl: 'Powtórz błędy' }),
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

const CoinAward = memo(function CoinAward({ amount, lang, g, animate }: { amount: number; lang: Lang; g: Lv2Glass; animate: boolean }) {
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

  return (
    <View testID={props.testID ?? 'v2-done-screen'} style={[s.root, { backgroundColor: g.bg }]}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 8, paddingBottom: 170 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
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
          <RuneBalanceChip color={g.text} interactive={false} testID="v2-done-balance" />
        </View>

        <View style={s.titleBox}>
          <Text accessibilityRole="header" style={[s.title, { color: g.text }]}>{props.title}</Text>
          {props.subtitle ? <Text style={[s.sub, { color: g.secondary }]}>{props.subtitle}</Text> : null}
        </View>

        {stars != null ? (
          <View style={s.stars} accessible accessibilityLabel={c.stars(stars)}>
            {[0, 1, 2].map((i) => <Star key={i} index={i} on={i < stars} g={g} animate={animate} />)}
          </View>
        ) : null}
        {props.starsNote ? <Text style={[s.starsNote, { color: g.secondary }]}>{props.starsNote}</Text> : null}

        {hasStats ? (
          <View style={[s.stats, { backgroundColor: g.opaqueCard, borderColor: g.line }]}>
            <View style={s.stat}>
              <Text style={[s.statNum, { color: g.good }]}>{correct}</Text>
              <Text style={[s.statLabel, { color: g.secondary }]}>{c.correct}</Text>
            </View>
            <View style={[s.stat, s.statDivider, { borderColor: g.line }]}>
              <Text style={[s.statNum, { color: g.bad }]}>{wrong}</Text>
              <Text style={[s.statLabel, { color: g.secondary }]}>{c.wrong}</Text>
            </View>
            <View style={[s.stat, s.statDivider, { borderColor: g.line }]}>
              <Text style={[s.statNum, { color: g.text }]}>{accuracy}%</Text>
              <Text style={[s.statLabel, { color: g.secondary }]}>{c.accuracy}</Text>
            </View>
          </View>
        ) : null}

        {/* guard-ok: только отображение начисленного, баланс не меняется */}
        <CoinAward amount={Math.max(0, Math.round(props.coinsGained))} lang={lang} g={g} animate={animate} />

        {props.plusNote ? (
          <View style={[s.panel, s.plusNote, { backgroundColor: g.opaqueCard, borderColor: g.line }]}>
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
          <View style={[s.panel, { backgroundColor: g.opaqueCard, borderColor: g.line }]}>
            <View style={s.errHead}>
              <Text style={[s.errTitle, { color: g.text }]}>{c.errors}</Text>
              <Text style={[s.errCount, { color: g.mutedText }]}>{props.errors.length}</Text>
            </View>
            {props.errors.map((e, i) => (
              <View key={`${e.label}-${i}`} style={s.errRow}>
                <Text style={[s.errLabel, { color: g.secondary }]}>{e.label}</Text>
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
                style={[s.ghost, { borderColor: g.line }]}
              >
                <Ionicons name="refresh" size={18} color={g.text} />
                <Text style={[s.ghostText, { color: g.text }]}>{c.repeatErrors}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {props.feedbackSlot ? <View style={{ marginTop: 14 }}>{props.feedbackSlot}</View> : null}
      </ScrollView>

      <View style={[s.dock, { paddingBottom: Math.max(24, insets.bottom + 16), backgroundColor: g.bg }]}>
        <Pressable
          testID="v2-done-primary"
          accessibilityRole="button"
          onPress={() => { hapticTap(); props.onPrimary(); }}
          style={({ pressed }) => [s.cta, { backgroundColor: g.cta, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
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
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titleBox: { alignItems: 'center', marginTop: 18 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  sub: { fontSize: 16, lineHeight: 22, marginTop: 6, textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 22 },
  starsNote: { textAlign: 'center', fontSize: 15, fontWeight: '600', marginTop: 10 },
  // guard-ok: 1px полупрозрачная обводка — по макету 2.0 (исключение владельца 24.09)
  stats: { flexDirection: 'row', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, marginTop: 20, paddingVertical: 15 },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth },
  statNum: { fontSize: 30, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  award: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12, height: 54 },
  awardCoin: { width: 44, height: 44 },
  awardNum: { fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  awardUnit: { fontSize: 16, fontWeight: '600' },
  // guard-ok: 1px полупрозрачная обводка — по макету 2.0
  panel: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, marginTop: 14, padding: 16 },
  plusNote: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tile: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  plusTitle: { fontSize: 16, fontWeight: '700' },
  plusBody: { fontSize: 14, lineHeight: 19, marginTop: 3 },
  errHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errTitle: { fontSize: 17, fontWeight: '700' },
  errCount: { fontSize: 17, fontWeight: '600' },
  errRow: { marginTop: 12 },
  errLabel: { fontSize: 13, fontWeight: '600' },
  errLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  errWas: { fontSize: 16, fontWeight: '600', textDecorationLine: 'line-through' },
  errOk: { fontSize: 16, fontWeight: '700' },
  // guard-ok: контурная кнопка «Повторить ошибки» — по макету 2.0
  ghost: { height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ghostText: { fontSize: 16, fontWeight: '600' },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12 },
  cta: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 17, fontWeight: '700' },
  ctaArrow: { position: 'absolute', right: 22 },
  quiet: { textAlign: 'center', fontSize: 16, fontWeight: '600', marginTop: 14, minHeight: 22 },
});
