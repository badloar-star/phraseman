// LearningV2ChapterExamSheet.tsx — шторка «Экзамен главы N» перед стартом (макет chapter-exam-flow.html, `.xdim` + `.xsh`).
// зачем (координатор 22.10, шаг 1 экрана экзамена): окно поверх Сезона, как в макете. Это Modal, а не отдельный маршрут —
// так за затемнением виден сам Сезон, и общий стек навигации (Android/Fabric) не получает прозрачный экран. Вопросы — отдельный
// маршрут /learning-v2/chapter-exam (learningV2ChapterExamHrefV1). Числа — из движка экзамена, минуты — из данных курса.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { Easing as REasing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import V2Pressable from '../v2/V2Pressable';
import { useLang } from '../LangContext';
import { usePremium } from '../PremiumContext';
import { useEnergy } from '../EnergyContext';
import { useLv2Glass, lv2Alpha } from './LearningV2Glass';
import { lv2TaskTokens } from './learning_v2_task_theme_tokens';
import { learningV2ChapterExamCopy } from './learning_v2_chapter_exam_copy';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { KIT_MOTION, LUM } from '../../constants/motionHybrid';
import {
  CHAPTER_EXAM_PASS_CORRECT_V1,
  CHAPTER_EXAM_QUESTION_COUNT_V1,
  CHAPTER_EXAM_SESSIONS_PER_CHAPTER_V1,
} from '../../modules/learning-v2/exam/chapter_exam_v1';
import {
  LEARNING_V2_SESSION_STANDARD_INTERACTION_TARGET_V1,
  LEARNING_V2_SESSION_TARGET_MINUTES_V1,
} from '../../modules/learning-v2/content/course_topology_v1';

const LOG = '[CHAPTER-EXAM]';
const SHEET_EASE = REasing.bezier(...KIT_MOTION.sheetEase);
const CHAPTERS_PER_LESSON = 7;

/**
 * Минуты экзамена — из темпа курса: занятие 16 заданий ≈ 7 минут → 12 вопросов ≈ 5 минут.
 * зачем (координатор 22.10): «~7 минут пиши только если посчитано по данным» — в макете 7, по данным 5; показываем посчитанное.
 */
export const LEARNING_V2_CHAPTER_EXAM_MINUTES_V1 = Math.max(1, Math.round(
  (CHAPTER_EXAM_QUESTION_COUNT_V1 * LEARNING_V2_SESSION_TARGET_MINUTES_V1) / LEARNING_V2_SESSION_STANDARD_INTERACTION_TARGET_V1,
));

/** Эпизоды, по которым экзамен: занятия главы без восьмого («Проверка главы») — макет «По эпизодам 9–15» для главы 2. */
export function learningV2ChapterExamEpisodeRangeV1(chapterOrdinal: number): Readonly<{ first: number; last: number }> {
  const first = (chapterOrdinal - 1) * CHAPTER_EXAM_SESSIONS_PER_CHAPTER_V1 + 1;
  return { first, last: first + CHAPTER_EXAM_SESSIONS_PER_CHAPTER_V1 - 2 };
}

type Props = Readonly<{
  visible: boolean;
  lessonOrdinal: number;
  chapterOrdinal: number;
  /** «Позже», фон, «назад». */
  onClose: () => void;
  /** «Начать экзамен»: энергия есть (или Plus) — открыть вопросы. */
  onStart: () => void;
  /** «Начать экзамен» без энергии — окно «нет энергии» показывает родитель (свой вариант окна). */
  onNoEnergy: () => void;
}>;

export default function LearningV2ChapterExamSheet({ visible, lessonOrdinal, chapterOrdinal, onClose, onStart, onNoEnergy }: Props) {
  const g = useLv2Glass();
  const t = lv2TaskTokens(g);
  const { lang } = useLang();
  const { hasPremiumAccess } = usePremium();
  const { isUnlimited, predictStartRefusal } = useEnergy();
  const insets = useStableSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const free = hasPremiumAccess || isUnlimited;

  const [presented, setPresented] = useState(visible);
  const dim = useSharedValue(0);
  const slide = useSharedValue(1);
  const startedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      startedRef.current = false;
      setPresented(true);
      console.log(`${LOG} sheet:open`, JSON.stringify({ lessonOrdinal, chapterOrdinal, free, hasPremiumAccess, isUnlimited, minutes: LEARNING_V2_CHAPTER_EXAM_MINUTES_V1 })); // guard-ok: вход и флаги
      dim.value = withTiming(1, { duration: reduceMotion ? LUM.instantMs : KIT_MOTION.dimMs });
      slide.value = 1;
      slide.value = withTiming(0, { duration: reduceMotion ? LUM.instantMs : KIT_MOTION.sheetMs, easing: SHEET_EASE });
      return () => { cancelAnimation(dim); cancelAnimation(slide); };
    }
    const finish = () => setPresented(false);
    dim.value = withTiming(0, { duration: reduceMotion ? LUM.instantMs : KIT_MOTION.dimMs });
    slide.value = withTiming(1, { duration: reduceMotion ? LUM.instantMs : KIT_MOTION.sheetMs, easing: SHEET_EASE }, (done) => {
      if (done) runOnJS(finish)();
    });
    return () => { cancelAnimation(dim); cancelAnimation(slide); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: журнал и анимация только на смену visible
  }, [visible, reduceMotion]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value * viewportHeight }] }));

  const start = useCallback(() => {
    // зачем: двойной тап не открывает экзамен дважды
    if (startedRef.current) {
      console.log(`${LOG} sheet:start_ignored`, JSON.stringify({ reason: 'double_tap' })); // guard-ok: ранний выход
      return;
    }
    const verdict = free ? 'free' : predictStartRefusal('level_exam');
    console.log(`${LOG} sheet:start`, JSON.stringify({ lessonOrdinal, chapterOrdinal, verdict })); // guard-ok: ветка и значение
    if (verdict === 'insufficient') {
      onNoEnergy();
      return;
    }
    startedRef.current = true;
    onStart();
  }, [chapterOrdinal, free, lessonOrdinal, onNoEnergy, onStart, predictStartRefusal]);

  if (!presented) return null;
  const range = learningV2ChapterExamEpisodeRangeV1(chapterOrdinal);
  const next = chapterOrdinal < CHAPTERS_PER_LESSON ? chapterOrdinal + 1 : null;
  // зачем: у последней главы урока нет «следующей главы» — вторую фразу не выдумываем, а опускаем
  const body = [
    learningV2ChapterExamCopy(lang, 'scope', { a: range.first, b: range.last }),
    next ? learningV2ChapterExamCopy(lang, 'unlocks', { n: next }) : null,
  ].filter(Boolean).join(' ');
  const facts: readonly [string, string][] = [
    [String(CHAPTER_EXAM_QUESTION_COUNT_V1), learningV2ChapterExamCopy(lang, 'questions')],
    [String(CHAPTER_EXAM_PASS_CORRECT_V1), learningV2ChapterExamCopy(lang, 'toPass')],
    [`~${LEARNING_V2_CHAPTER_EXAM_MINUTES_V1}`, learningV2ChapterExamCopy(lang, 'minutes')],
  ];
  const later = learningV2ChapterExamCopy(lang, 'later');

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={later}>
          {/* `.xdim` — токен затемнения экзамена */}
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.examScrim }, dimStyle]} />
        </Pressable>
        <Animated.View
          accessibilityViewIsModal
          testID="chapter-exam-sheet"
          style={[styles.sheet, { backgroundColor: g.opaqueCard, boxShadow: t.examSheetShadow as never, paddingBottom: 40 + insets.bottom }, sheetStyle]}
        >
          <View style={[styles.grab, { backgroundColor: t.controlSoft }]} />
          <View style={[styles.icon, { backgroundColor: lv2Alpha(g.accent, 0.22) }]}>
            <Ionicons name="trophy" size={30} color={g.accentTextSafe} />
          </View>
          <Text style={[styles.title, { color: g.text }]}>{learningV2ChapterExamCopy(lang, 'title', { n: chapterOrdinal })}</Text>
          <View style={styles.facts}>
            {facts.map(([value, label]) => (
              <View key={label} style={[styles.fact, { backgroundColor: t.controlSoft }]}>
                <Text style={[styles.factValue, { color: g.text }]}>{value}</Text>
                <Text style={[styles.factLabel, { color: g.secondary }]}>{label}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.body, { color: g.secondary }]}>{body}</Text>
          <V2Pressable testID="chapter-exam-start" onPress={start} style={[styles.primary, { backgroundColor: g.text }]}>
            <Text style={[styles.primaryText, { color: g.opaqueCard }]}>{learningV2ChapterExamCopy(lang, 'start')}</Text>
            {free ? null : (
              <View style={[styles.energy, { backgroundColor: lv2Alpha(g.opaqueCard, 0.18) }]}>
                <Ionicons name="flash" size={14} color={g.opaqueCard} />
                <Text style={[styles.energyText, { color: g.opaqueCard }]}>1</Text>
              </View>
            )}
          </V2Pressable>
          {free ? <Text style={[styles.free, { color: g.accentTextSafe }]}>{learningV2ChapterExamCopy(lang, 'plusFree')}</Text> : null}
          <V2Pressable testID="chapter-exam-later" onPress={onClose} style={[styles.secondary, { backgroundColor: t.controlSoft }]}>
            <Text style={[styles.secondaryText, { color: g.text }]}>{later}</Text>
          </V2Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Размеры — 1:1 из chapter-exam-flow.html (`.xsh`, `.grab`, `.ic`, `.t`, `.facts`, `.p`, `.c1`, `.en`, `.free`, `.c2`).
const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 12,
    paddingHorizontal: 22,
  },
  grab: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center' },
  icon: { width: 64, height: 64, borderRadius: 18, marginTop: 22, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 16, fontSize: 25, lineHeight: 31, fontWeight: '700', textAlign: 'center' },
  facts: { flexDirection: 'row', gap: 10, marginTop: 18 },
  fact: { flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  factValue: { fontSize: 22, lineHeight: 26, fontWeight: '700' },
  factLabel: { fontSize: 13, lineHeight: 17, textAlign: 'center' },
  body: { marginTop: 16, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  primary: { marginTop: 20, height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  // D145 (владелец): обычный текст только 16 и 13 — макетные 17 и 15 здесь 16
  primaryText: { fontSize: 16, fontWeight: '700' },
  energy: { height: 28, paddingHorizontal: 10, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 2 },
  energyText: { fontSize: 16, fontWeight: '700' },
  free: { marginTop: 10, fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  secondary: { marginTop: 12, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '700' },
});
