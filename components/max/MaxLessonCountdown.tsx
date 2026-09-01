// ═══════════════════════════════════════════════════════════════════════════
// MaxLessonCountdown — отсчёт перед началом урока, макет 09 «Отсчёт».
//
// зачем (владелец 2026-09-01): «я просил таймер точно как на макете, в
// точности всё должно быть как я просил». Прежняя версия была строкой текста
// «Урок начнётся через 4» — это не то, что владелец выбрал и утвердил.
//
// По макету: тающее кольцо, крупная цифра в центре, надпись «УРОК НАЧИНАЕТСЯ»
// акцентом, название урока и кнопка «Отменить». Экран звонка виден позади
// приглушённым — человек понимает, куда попал, и что выйти можно.
//
// Деньги в безопасности: сервер считает секунды от АКТИВАЦИИ
// (voiceSessionClockStartMs → activatedAtMs, то есть от первой реплики MAX),
// а не от соединения. Отмена во время отсчёта не стоит ни минуты.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../ThemeContext';
import { triLang, type Lang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

const R = 21;
const CIRC = 2 * Math.PI * R;

interface Props {
  /** Сколько секунд осталось. 0 — отсчёт кончился, оверлей не рисуется. */
  secondsLeft: number;
  /** Полная длительность отсчёта — от неё считается доля кольца. */
  totalSeconds: number;
  /** Название урока: человек должен видеть, что именно сейчас начнётся. */
  lessonTitle: string;
  lang: Lang;
  onCancel: () => void;
}

export default function MaxLessonCountdown({
  secondsLeft, totalSeconds, lessonTitle, lang, onCancel,
}: Props) {
  const { theme: t, f } = useTheme();

  // Кольцо тает непрерывно, а не рывками по секунде: цифра меняется скачком
  // (так её легче прочитать), дуга — плавно (так видно, что время идёт).
  const progress = useSharedValue(secondsLeft / Math.max(1, totalSeconds));
  useEffect(() => {
    progress.value = withTiming(Math.max(0, (secondsLeft - 1) / Math.max(1, totalSeconds)), {
      duration: 1000,
      easing: Easing.linear,
    });
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, totalSeconds]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - progress.value),
  }));

  const c = {
    starting: triLang(lang, {
      ru: 'УРОК НАЧИНАЕТСЯ', uk: 'УРОК ПОЧИНАЄТЬСЯ', en: 'LESSON STARTING',
      es: 'LA CLASE EMPIEZA', 'pt-BR': 'A AULA COMEÇA', vi: 'BÀI HỌC BẮT ĐẦU',
      id: 'PELAJARAN DIMULAI', tr: 'DERS BAŞLIYOR', pl: 'LEKCJA SIĘ ZACZYNA',
    }),
    cancel: triLang(lang, {
      ru: 'Отменить', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar',
      'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj',
    }),
  };

  return (
    <View
      testID="max-lesson-countdown"
      accessibilityViewIsModal
      style={{
        position: 'absolute',
        left: 0, right: 0, top: 0, bottom: 0,
        // ПЛОТНЫЙ фон, не полупрозрачный. Прозрачность (была 0.82) показывала
        // сквозь отсчёт весь экран звонка — «Цель урока», микрофон, кнопку
        // назад: выглядело как наложение двух экранов, а не как отсчёт.
        // Цвет берём из темы, чтобы он совпал с фоном приложения.
        backgroundColor: t.bgPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        paddingHorizontal: 26,
      }}
    >
      <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={132} height={132} viewBox="0 0 48 48" style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={24} cy={24} r={R} fill="none" stroke={t.bgSurface} strokeWidth={3} />
          <AnimatedCircle
            cx={24} cy={24} r={R}
            fill="none" stroke={t.accent} strokeWidth={3} strokeLinecap="round"
            strokeDasharray={CIRC}
            animatedProps={animatedProps}
          />
        </Svg>
        <View style={{ position: 'absolute' }}>
          <Text
            testID="max-lesson-countdown-seconds"
            accessibilityLiveRegion="polite"
            style={{ color: t.textPrimary, fontSize: f.numLg + 8, fontWeight: '900' }}
            maxFontSizeMultiplier={1.4}
          >
            {secondsLeft}
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: 10 }}>
        <Text
          style={{ color: t.accent, fontSize: f.caption, fontWeight: '900', letterSpacing: 1.4 }}
          maxFontSizeMultiplier={1.6}
        >
          {c.starting}
        </Text>
        {lessonTitle !== '' ? (
          <Text
            style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900', textAlign: 'center', lineHeight: f.numMd * 1.25 }}
            numberOfLines={3}
            maxFontSizeMultiplier={1.6}
          >
            {lessonTitle}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        testID="max-lesson-countdown-cancel"
        accessibilityRole="button"
        accessibilityLabel={c.cancel}
        onPressIn={() => { void hapticTap(); }}
        onPress={onCancel}
        style={{
          minHeight: 54,
          borderRadius: 20,
          backgroundColor: t.bgSurface,
          paddingHorizontal: 34,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: t.textSecond, fontSize: f.bodyLg, fontWeight: '900' }} maxFontSizeMultiplier={1.6}>
          {c.cancel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
