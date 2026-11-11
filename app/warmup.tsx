/**
 * Разминка на 4 минуты — перенос утверждённого макета (docs/design/v2-app/elevate-mechanics.app.js, `workout()`).
 * Владелец 11.11.2026: «я хочу, чтобы юзеру особо не надо было выбирать»; разминка — отдельная строка каждый
 * день, в счёт трёх заданий дня не входит; отдельного списка игр нет.
 *
 * Экран показывает три игры дня и одну кнопку: «Начать · <следующая несыгранная игра>». Выбирать не нужно —
 * кнопка сама ведёт по порядку; карту можно пролистать и нажать, если хочется другую.
 * зачем так: состав и порядок игр — в modules/games/warmup_state; экран рисуется сразу из памяти, сети нет.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { V2Button, V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { WARMUP_GAMES, nextWarmupIndex, peekWarmup, subscribeWarmup, warmupPlayedCount } from '../modules/games/warmup_state';
import { SKILL_NAME } from '../modules/skills/skill_copy';
import { refreshSkills } from '../modules/skills/skill_store';
import { safeRouterBack } from './navigation_back';

const CARD_W = 268;
const CARD_GAP = 12;
const NAV_GUARD_MS = 700;

const COPY = {
  title: { ru: 'Разминка', uk: 'Розминка', es: 'Calentamiento', en: 'Warm-up' },
  headline: { ru: '3 игры\nна 4 минуты', uk: '3 гри\nна 4 хвилини', es: '3 juegos\nen 4 minutos', en: '3 games\nin 4 minutes' },
  start: { ru: 'Начать', uk: 'Почати', es: 'Empezar', en: 'Start' },
  again: { ru: 'Сыграть ещё раз', uk: 'Зіграти ще раз', es: 'Jugar otra vez', en: 'Play again' },
  complete: { ru: 'Разминка пройдена', uk: 'Розминку пройдено', es: 'Calentamiento completado', en: 'Warm-up complete' },
  of: { ru: 'из', uk: 'із', es: 'de', en: 'of' },
  back: { ru: 'Назад', uk: 'Назад', es: 'Atrás', en: 'Back' },
} as const;

const ICONS = { flow: 'flash', odd_word: 'checkmark', sort: 'layers' } as const;

export default function WarmupScreen() {
  const router = useRouter();
  const p = useV2Palette();
  const { lang } = useLang();
  const state = useSyncExternalStore(subscribeWarmup, peekWarmup, peekWarmup);
  const [index, setIndex] = useState(() => nextWarmupIndex(peekWarmup(), 0) ?? 0);
  const scroll = useRef<ScrollView>(null);
  const lastNavAt = useRef(0);

  useEffect(() => {
    // зачем: прогрев очков навыков до первой игры — итог игры покажет прирост без ожидания диска
    refreshSkills().catch((error: unknown) => {
      console.warn(`[WARMUP] skills_warm_failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: лог в catch обязателен
    });
  }, []);

  const played = warmupPlayedCount(state);
  const complete = played === WARMUP_GAMES.length;

  // после возвращения из игры карусель сама встаёт на следующую несыгранную игру
  useEffect(() => {
    const next = nextWarmupIndex(state, index);
    if (next !== null && next !== index && state.results[WARMUP_GAMES[index].id] !== undefined) {
      setIndex(next);
      scroll.current?.scrollTo({ x: next * (CARD_W + CARD_GAP), animated: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const game = WARMUP_GAMES[index];
  const date = useMemo(() => {
    try {
      const text = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
      return text.charAt(0).toUpperCase() + text.slice(1);
    } catch (error) {
      console.warn(`[WARMUP] date_format_failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: лог в catch обязателен
      return '';
    }
  }, [lang]);

  const onBack = useCallback(() => safeRouterBack(router, '/(tabs)/home' as never), [router]);
  const start = useCallback((target: number) => {
    const now = Date.now();
    if (now - lastNavAt.current < NAV_GUARD_MS) return; // защита от двойного тапа
    lastNavAt.current = now;
    router.push(WARMUP_GAMES[target].route as never);
  }, [router]);

  const onScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.max(0, Math.min(WARMUP_GAMES.length - 1, Math.round(e.nativeEvent.contentOffset.x / (CARD_W + CARD_GAP))));
    setIndex(next);
  }, []);

  const resultLabel = (raw: string | undefined): string | null => {
    if (!raw) return null;
    const [a, b] = raw.split('/');
    return `${a} ${triLang(lang, COPY.of)} ${b}`;
  };

  const cta = complete
    ? triLang(lang, COPY.complete)
    : `${triLang(lang, state.results[game.id] !== undefined ? COPY.again : COPY.start)} · ${triLang(lang, game.name)}`;

  return (
    <ScreenGradient>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.content}>
          <View style={s.top}>
            <V2IconButton icon="chevron-back" onPress={onBack} accessibilityLabel={triLang(lang, COPY.back)} testID="warmup-back" />
            <Text accessibilityRole="header" numberOfLines={1} style={[s.title, { color: p.text }]}>{triLang(lang, COPY.title)}</Text>
            <View style={s.topSpacer} />
          </View>

          <View style={s.head}>
            <Text style={[s.over, { color: p.textSecondary }]}>{date}</Text>
            <Text style={[s.big, { color: p.text }]}>{triLang(lang, COPY.headline)}</Text>
          </View>

          <ScrollView
            ref={scroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={CARD_W + CARD_GAP}
            contentContainerStyle={s.deck}
            contentOffset={{ x: index * (CARD_W + CARD_GAP), y: 0 }}
            onMomentumScrollEnd={onScrollEnd}
            style={s.deckScroll}
          >
            {WARMUP_GAMES.map((item, i) => { // guard-ok: карт всегда три, виртуализация не нужна
              const result = resultLabel(state.results[item.id]);
              return (
                <V2Card key={item.id} seed={i} raised={i === index} style={s.card} testID={`warmup-card-${item.id}`} accessibilityLabel={triLang(lang, item.name)} onPress={() => start(i)}>
                  <View style={s.tags}>
                    <View style={[s.tag, { backgroundColor: p.glassRaised }]}>
                      <Ionicons name={ICONS[item.id]} size={16} color={p.text} />
                      <Text style={[s.tagText, { color: p.text }]}>{triLang(lang, SKILL_NAME[item.skill])}</Text>
                    </View>
                    {result ? (
                      <View style={[s.tag, { backgroundColor: p.glassRaised }]}>
                        <Ionicons name="checkmark" size={16} color={p.correct} />
                        <Text style={[s.tagText, { color: p.text }]}>{result}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={s.flex} />
                  <Text style={[s.name, { color: p.text }]}>{triLang(lang, item.name)}</Text>
                  <Text style={[s.description, { color: p.textSecondary }]}>{triLang(lang, item.description)}</Text>
                </V2Card>
              );
            })}
          </ScrollView>

          <View style={s.dots}>
            {WARMUP_GAMES.map((item, i) => <View key={item.id} style={[s.dot, { backgroundColor: i === index ? p.text : p.track }]} />)}
          </View>
          <View style={s.segs}>
            {WARMUP_GAMES.map((item) => <View key={item.id} style={[s.seg, { backgroundColor: state.results[item.id] !== undefined ? p.text : p.track }]} />)}
          </View>
          <V2Button testID="warmup-start" label={cta} icon={complete ? undefined : 'play'} iconPosition="leading" disabled={complete} onPress={() => start(index)} />
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, paddingTop: 8, paddingBottom: 16, paddingHorizontal: V2.screenPad },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: V2.iconButton },
  title: { position: 'absolute', left: 64, right: 64, textAlign: 'center', fontSize: 17, lineHeight: 22, fontWeight: '700' },
  topSpacer: { width: V2.iconButton },
  head: { marginTop: 22, minHeight: 122 },
  over: { minHeight: 18, fontSize: 14, lineHeight: 18, fontWeight: '500' },
  big: { marginTop: 6, fontSize: 40, lineHeight: 46, fontWeight: '800', letterSpacing: -1 },
  deckScroll: { flexGrow: 1, marginHorizontal: -V2.screenPad, marginTop: 14 },
  deck: { paddingHorizontal: V2.screenPad, gap: CARD_GAP, alignItems: 'stretch' },
  card: { width: CARD_W, minHeight: 300, padding: 18 },
  tags: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 10, borderRadius: 15 },
  tagText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  name: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.4 },
  description: { marginTop: 6, fontSize: 15, lineHeight: 20, fontWeight: '400' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  segs: { flexDirection: 'row', gap: 6, marginTop: 14, marginBottom: 16 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
});
