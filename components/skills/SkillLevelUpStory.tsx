/**
 * История «Новый уровень» — экран праздника, когда навык поднялся на уровень.
 * Эталон — docs/design/v2-app/elevate-skills.js, функция `story`; стили elevate-mechanics.css (`.lay`, `.top`, `.segs`, `.big`,
 * `.over`, `.sub`, `.wcta`, `.bar`, `.kv`, `.hid`) и elevate-extra.css (`.stry`, `.hugen`, `.lvb`). Движение — числами макета:
 *   • деление прогресса истории заполняется за 800 мс cubic-bezier(.2,.8,.2,1), стартует через 60 мс после показа кадра;
 *   • через 500 мс: звезда «было → стало» 1400 мс, число уровня считает за 500 мс (кубическое затухание) и подскакивает
 *     (650 мс, пружина), вспышка, пульс, подсветка луча (SkillLevelUpStar);
 *   • нажатие по экрану (не по кнопкам) — второй кадр «Что дальше»: кадры сменяются прозрачностью за 400 мс,
 *     полоска уровня через 300 мс доезжает за 1100 мс cubic-bezier(.2,.8,.2,1).
 *
 * зачем «глупый» экран: что праздновать, решает buildSkillLevelUpStory из ФАКТА (очки до и после) — правило владельца 01.09:
 * празднование не кладётся в постоянную очередь, показывается на своём экране. Экран ничего не читает и не пишет.
 * Пока никуда не подключён: где и когда его открыть, решает координатор.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useLang } from '../LangContext';
import { useV2Palette } from '../v2/useV2Palette';
import { useShadowGlass } from '../v2/ShadowSurface';
import { colorWithAlpha } from '../v2/plateAlpha';
import GameBumpText from '../games/GameBumpText';
import { GAME_EASE } from '../../constants/gameMotion';
import { triLang, type Lang } from '../../constants/i18n';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { SKILL_NAME, SKILL_SOURCE } from '../../modules/skills/skill_copy';
import { SKILL_IDS, STUDY_SKILL_IDS } from '../../modules/skills/skill_points_table';
import type { SkillLevelUpStory as StoryData } from '../../modules/skills/skill_level_up_story';
import SkillLevelUpStar from './SkillLevelUpStar';

const LOG = '[SKILL-LEVEL-UP]';
const STAR_SIZE = 230;
const GO_DELAY_MS = 500;
const COUNT_MS = 500;
const SEG_DELAY_MS = 60;
const SEG_MS = 800;
const FRAME_MS = 400;
const BAR_DELAY_MS = 300;
const BAR_MS = 1100;
const PROGRESS_EASE = Easing.bezier(...GAME_EASE.progress);

type Copy = Readonly<{ ru: string; uk: string; es: string; en: string }>;
const T = {
  over: { ru: 'Новый уровень', uk: 'Новий рівень', es: 'Nuevo nivel', en: 'New level' },
  longer: { ru: 'Луч «{name}» стал длиннее.', uk: 'Промінь «{name}» став довшим.', es: 'El rayo «{name}» es más largo.', en: 'The {name} ray got longer.' },
  share: { ru: 'Поделиться', uk: 'Поділитися', es: 'Compartir', en: 'Share' },
  next: { ru: 'Что дальше', uk: 'Що далі', es: 'Qué sigue', en: 'What’s next' },
  toLevel: { ru: 'До уровня {n}', uk: 'До рівня {n}', es: 'Hasta el nivel {n}', en: 'To level {n}' },
  level: { ru: 'уровень', uk: 'рівень', es: 'nivel', en: 'level' },
  fastest: { ru: 'Быстрее всего растёт', uk: 'Найшвидше зростає', es: 'Crece más rápido', en: 'Grows fastest' },
  train: { ru: 'Тренировать {name}', uk: 'Тренувати {name}', es: 'Entrenar {name}', en: 'Train {name}' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
} as const satisfies Record<string, Copy>;

// SKILL_SOURCE начинается со слов «Растёт от…» — под заголовком «Быстрее всего растёт» повтор глагола убираем (макет: «от карточек…»)
const SOURCE_HEAD: Copy = { ru: 'Растёт ', uk: 'Зростає ', es: 'Crece ', en: 'Grows ' };

const POINTS_LEFT: readonly Copy[] = [
  { ru: 'Нужно {n} очко', uk: 'Потрібно {n} очко', es: 'Faltan {n} puntos', en: '{n} points to go' },
  { ru: 'Нужно {n} очка', uk: 'Потрібно {n} очки', es: 'Faltan {n} puntos', en: '{n} points to go' },
  { ru: 'Нужно {n} очков', uk: 'Потрібно {n} очок', es: 'Faltan {n} puntos', en: '{n} points to go' },
];

function pointsWord(lang: Lang, n: number): string {
  // зачем: формы числа — словарём по языкам (сторож непереведённых строк), склонение только у ru/uk
  const n10 = n % 10;
  const n100 = n % 100;
  const form = n10 === 1 && n100 !== 11 ? 0 : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? 1 : 2;
  const copy: Copy = POINTS_LEFT[form] ?? POINTS_LEFT[2];
  return triLang(lang, copy).replace('{n}', String(n));
}

/** Когда число уровня меняет значение при отсчёте `from → to` за COUNT_MS по кривой 1 − (1 − p)³ (count() макета). */
function countSteps(from: number, to: number): { value: number; at: number }[] {
  const out: { value: number; at: number }[] = [];
  for (let v = from + 1; v <= to; v += 1) {
    const e = (v - 0.5 - from) / (to - from);
    out.push({ value: v, at: Math.round((1 - Math.cbrt(1 - e)) * COUNT_MS) });
  }
  return out;
}

const Segment = memo(function Segment({ state, track, fill }: Readonly<{ state: 'done' | 'now' | 'later'; track: string; fill: string }>) {
  const reduceMotion = useReduceMotion();
  const v = useSharedValue(state === 'done' ? 1 : 0);
  useEffect(() => {
    if (state !== 'now') { v.value = state === 'done' ? 1 : 0; return; }
    v.value = 0;
    v.value = reduceMotion ? 1 : withDelay(SEG_DELAY_MS, withTiming(1, { duration: SEG_MS, easing: PROGRESS_EASE }));
  }, [reduceMotion, state, v]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: v.value }] }));
  return (
    <View style={[s.seg, { backgroundColor: track }]}>
      <Reanimated.View style={[s.segFill, { backgroundColor: fill, transformOrigin: 'left' }, style]} />
    </View>
  );
});

type Props = Readonly<{
  story: StoryData;
  onClose: () => void;
  /** Кнопка второго кадра; нет — кнопки нет. «Социальный» не тренируется — для него кнопки нет всегда. */
  onTrain?: () => void;
  /** Правый край шапки (в макете — плашка монет); экран её сам не читает. */
  topRight?: React.ReactNode;
  testID?: string;
}>;

function SkillLevelUpStory({ story, onClose, onTrain, topRight, testID = 'skill-level-up-story' }: Props) {
  const p = useV2Palette();
  const glass = useShadowGlass();
  const { lang } = useLang();
  const L = lang as Lang;
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const hasNext = story.next !== null;
  const [slide, setSlide] = useState(0);
  const [go, setGo] = useState(reduceMotion);
  const [level, setLevel] = useState(reduceMotion ? story.toLevel : story.fromLevel);
  const [bumpAt, setBumpAt] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frame = useSharedValue(0);
  const bar = useSharedValue(0);

  const name = triLang(L, SKILL_NAME[story.skill]);
  const labels = useMemo(() => SKILL_IDS.map((id) => triLang(L, SKILL_NAME[id])), [L]);

  useEffect(() => {
    console.log(`${LOG} show ${JSON.stringify({ skill: story.skill, from: story.fromLevel, to: story.toLevel, hasNext })}`); // guard-ok: одна строка на показ праздника
    if (reduceMotion) return undefined;
    const list = timers.current;
    list.push(setTimeout(() => {
      setGo(true);
      setBumpAt(Date.now()); // макет: bump() на числе одновременно со стартом отсчёта
      countSteps(story.fromLevel, story.toLevel).forEach((step) => list.push(setTimeout(() => setLevel(step.value), step.at)));
    }, GO_DELAY_MS));
    return () => {
      list.forEach(clearTimeout);
      timers.current = [];
    };
  }, [hasNext, reduceMotion, story.fromLevel, story.skill, story.toLevel]);

  const showNext = useCallback(() => {
    if (slide !== 0 || !hasNext) return;
    setSlide(1);
    frame.value = withTiming(1, { duration: reduceMotion ? 0 : FRAME_MS });
    bar.value = reduceMotion ? story.next?.ratio ?? 0 : withDelay(BAR_DELAY_MS, withTiming(story.next?.ratio ?? 0, { duration: BAR_MS, easing: PROGRESS_EASE }));
    console.log(`${LOG} next_frame ${JSON.stringify({ skill: story.skill })}`); // guard-ok: переход ко второму кадру
  }, [bar, frame, hasNext, reduceMotion, slide, story.next, story.skill]);

  const onShare = useCallback((event: GestureResponderEvent) => {
    event.stopPropagation();
    void hapticTap();
    Share.share({ message: `${triLang(L, T.over)}: ${name} · ${story.toLevel}` }).catch((error: unknown) => {
      console.warn(`${LOG} share:failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch называет причину
    });
  }, [L, name, story.toLevel]);

  const firstStyle = useAnimatedStyle(() => ({ opacity: 1 - frame.value }));
  const secondStyle = useAnimatedStyle(() => ({ opacity: frame.value }));
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: bar.value }] }));

  const canTrain = !!onTrain && STUDY_SKILL_IDS.includes(story.skill);
  const source = triLang(L, SKILL_SOURCE[story.skill]);
  const head = triLang(L, SOURCE_HEAD);
  const sourceTail = source.startsWith(head) ? source.slice(head.length) : source;
  const starColors = useMemo(() => ({
    grid: colorWithAlpha(p.text, 0.16), axis: colorWithAlpha(p.text, 0.12),
    fill: colorWithAlpha(p.accent, 0.34), stroke: p.text,
    spark: p.text, ring: colorWithAlpha(p.text, 0.5), label: p.textSecondary, labelOn: p.text,
  }), [p]);
  const frameInsets = { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 };

  return (
    <View testID={testID} style={[s.root, { paddingTop: insets.top + 14 }]}>
      {/* кадры лежат под шапкой: нажатие по экрану ведёт дальше, кнопки шапки — сверху */}
      <Reanimated.View pointerEvents={slide === 0 ? 'auto' : 'none'} style={[s.frame, frameInsets, firstStyle]}>
        <Pressable style={s.frameTap} onPress={showNext} accessibilityRole={hasNext ? 'button' : undefined}>
          <Text style={[s.over, { color: p.textSecondary }]}>{triLang(L, T.over)}</Text>
          <Text style={[s.big, { color: p.text }]}>{name}</Text>
          <GameBumpText
            value={String(level)}
            trigger={bumpAt}
            style={[s.huge, { color: p.text }, glass.isLight ? null : { textShadowColor: colorWithAlpha(p.accent, 0.8), textShadowRadius: 44 }]}
          />
          <View style={s.starBox}>
            <SkillLevelUpStar size={STAR_SIZE} before={story.starBefore} after={story.starAfter} labels={labels} highlight={story.skillIndex} go={go} colors={starColors} />
          </View>
          <Text style={[s.sub, s.subCenter, { color: p.textSecondary }]}>{triLang(L, T.longer).replace('{name}', name)}</Text>
          <View style={s.spacer} />
          <Pressable testID={`${testID}-share`} onPress={onShare} style={[s.cta, { backgroundColor: p.cta }]} accessibilityRole="button">
            <Text style={[s.ctaText, { color: p.ctaText }]}>{triLang(L, T.share)}</Text>
          </Pressable>
        </Pressable>
      </Reanimated.View>

      {hasNext && story.next ? (
        <Reanimated.View pointerEvents={slide === 1 ? 'auto' : 'none'} style={[s.frame, frameInsets, secondStyle]}>
          <Text style={[s.over, { color: p.textSecondary }]}>{triLang(L, T.next)}</Text>
          <Text style={[s.big, { color: p.text }]}>{triLang(L, T.toLevel).replace('{n}', String(story.next.level))}</Text>
          <View style={[s.panel, s.panelFirst, { backgroundColor: p.glass }]}>
            <View style={s.kv}>
              <Text style={[s.kvName, { color: p.text }]}>{name}</Text>
              <Text style={[s.lvb, { color: p.textSecondary }]}>
                {triLang(L, T.level)} <Text style={[s.lvbValue, { color: p.text }]}>{story.toLevel}</Text>
              </Text>
            </View>
            <View style={[s.bar, { backgroundColor: p.track }]}>
              <Reanimated.View style={[s.barFill, { backgroundColor: p.text, transformOrigin: 'left' }, barStyle]} />
            </View>
            <Text style={[s.sub, s.subTop, { color: p.textSecondary }]}>{pointsWord(L, story.next.pointsLeft)}</Text>
          </View>
          <View style={[s.panel, { backgroundColor: p.glass }]}>
            <Text style={[s.panelHead, { color: p.text }]}>{triLang(L, T.fastest)}</Text>
            <Text style={[s.sub, s.subSmallTop, { color: p.textSecondary }]}>{sourceTail}</Text>
          </View>
          <View style={s.spacer} />
          {canTrain ? (
            <Pressable testID={`${testID}-train`} onPress={() => { void hapticTap(); onTrain?.(); }} style={[s.cta, { backgroundColor: p.cta }]} accessibilityRole="button">{/* guard-ok: кнопка 54 pt во всю ширину с текстом */}
              <Ionicons name="play" size={18} color={p.ctaText} />
              <Text style={[s.ctaText, { color: p.ctaText }]}>{triLang(L, T.train).replace('{name}', name.toLocaleLowerCase(L))}</Text>
            </Pressable>
          ) : null}
        </Reanimated.View>
      ) : null}

      <View style={s.segs} pointerEvents="none">
        <Segment state={slide === 0 ? 'now' : 'done'} track={colorWithAlpha(p.text, 0.2)} fill={p.text} />
        {hasNext ? <Segment state={slide === 1 ? 'now' : 'later'} track={colorWithAlpha(p.text, 0.2)} fill={p.text} /> : null}
      </View>
      <View style={s.top} pointerEvents="box-none">
        <Pressable testID={`${testID}-close`} onPress={() => { void hapticTap(); onClose(); }} hitSlop={2} style={[s.closeBtn, { backgroundColor: p.control }]} accessibilityRole="button" accessibilityLabel={triLang(L, T.close)}>
          <Ionicons name="close" size={20} color={p.text} />
        </Pressable>
        <View style={s.spacer} />
        {topRight}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // макет `.lay`: поля 58 (от верха телефона, считая строку состояния ≈ 44) · 20 · 34
  root: { flex: 1, paddingHorizontal: 20 },
  // `.segs`: деления по 4, шаг 6
  segs: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  segFill: { ...StyleSheet.absoluteFillObject, borderRadius: 2 },
  // `.top`: высота 44, отступ 10 после делений
  top: { flexDirection: 'row', alignItems: 'center', height: 44, marginTop: 10, gap: 12 },
  // `.gbtn`: круг 42
  closeBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  spacer: { flex: 1 },
  // `.stry`: весь экран, поля 104 (60 после строки состояния) · 24 · 40, по центру
  frame: { ...StyleSheet.absoluteFillObject, paddingHorizontal: 24, alignItems: 'center' },
  frameTap: { flex: 1, alignSelf: 'stretch', alignItems: 'center' },
  over: { fontSize: 14, lineHeight: 18, fontWeight: '500', textAlign: 'center' },
  big: { fontSize: 38, lineHeight: 42, fontWeight: '800', letterSpacing: -0.8, marginTop: 4, textAlign: 'center' },
  // `.hugen`: 124/124, 800, трекинг −6, табличные цифры
  huge: { fontSize: 124, lineHeight: 124, fontWeight: '800', letterSpacing: -6, fontVariant: ['tabular-nums'], marginTop: 6, textAlign: 'center' },
  starBox: { width: STAR_SIZE, height: STAR_SIZE, marginTop: 2 },
  sub: { fontSize: 15, lineHeight: 20 },
  subCenter: { marginTop: 14, maxWidth: 300, textAlign: 'center' },
  subTop: { marginTop: 8 },
  subSmallTop: { marginTop: 4 },
  // `.wcta`: 54, радиус 27, во всю ширину, 17/700
  cta: { alignSelf: 'stretch', height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 17, fontWeight: '700' },
  // `.panel2` второго кадра: во всю ширину, текст слева
  panel: { alignSelf: 'stretch', borderRadius: 22, padding: 16, marginTop: 12 },
  panelFirst: { marginTop: 26 },
  panelHead: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  kv: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kvName: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  // `.lvb`: 13/600, число 20/800
  lvb: { fontSize: 13, fontWeight: '600' },
  lvbValue: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  // `.bar`: 6, радиус 3, отступ 10
  bar: { height: 6, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  barFill: { ...StyleSheet.absoluteFillObject, borderRadius: 3 },
});

export default memo(SkillLevelUpStory);
