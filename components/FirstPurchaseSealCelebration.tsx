/**
 * Празднование ПЕРВОЙ покупки — вариант «Печать» (владелец выбрал 21.09.2026
 * из трёх макетов: docs/design/2026-09-21_first_purchase_celebration.html).
 *
 * Идея момента: монета падает сверху и ставит оттиск — от удара расходится
 * волна. ОДНА кульминация, как печать на документе: вещь стала твоей.
 * Не набор эффектов, а один понятный жест.
 *
 * Два товара, одна хореография:
 *   'dialog' — диалог за руны (иконка руны, зелёный акцент);
 *   'lesson' — урок за жемчужины (иконка жемчуга, сиреневый акцент).
 *
 * ПОЧЕМУ ЗДЕСЬ ВООБЩЕ УМЕСТЕН ДЕЛАЙТ: первая покупка — редкое событие.
 * Частые действия анимировать нельзя (они начинают ощущаться медленными),
 * но «первый раз» — ровно тот случай, где праздник оправдан.
 *
 * ПРАВИЛО ВЛАДЕЛЬЦА «празднование не ставится в durable-очередь»
 * (feedback_no_durable_celebration_queues) соблюдено по построению:
 *  1. durable здесь — САМА покупка (она уже записана до показа), а не «долг
 *     на показ». Пропущенная анимация не стоит ничего.
 *  2. поздравляем ФАКТОМ: компонент получает то, что реально куплено.
 *  3. живёт на СВОЁМ экране (брифинг диалога / список уроков), не всплывает
 *     глобальным оверлеем поверх чужого контента.
 *  4. удаление показа не уносит награду: доступ выдаёт покупка, а не эта
 *     модалка. `onDone` только продолжает навигацию.
 *
 * Тайминги — источник правды для звука. Те же миллисекунды обязаны попасть в
 * карту ударов docs/design/CELEBRATION_SOUND_PROMPTS.md: один удар на 660 мс,
 * совпадающий с оттиском. Менять здесь — менять и там, иначе звук разойдётся
 * с движением (известная ловушка проекта).
 *
 * Анимации КОНЕЧНЫЕ (ни одного withRepeat), поэтому реестр вечных циклов
 * (tests/perf_freeze_contract) не затрагивается.
 */
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PEARL_ICONS } from '../app/coin_icons';
import { useTheme } from './ThemeContext';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { hapticSuccess } from '../hooks/use-haptics';
import { HOME_RUNE_ICON_SOURCE } from './home/homeRuneAsset';

export type FirstPurchaseKind = 'dialog' | 'lesson';

export interface FirstPurchaseSealCelebrationProps {
  readonly visible: boolean;
  readonly kind: FirstPurchaseKind;
  /** Название купленного: сценарий диалога или номер урока. */
  readonly subjectTitle: string;
  readonly title: string;
  readonly subtitle: string;
  readonly ctaLabel: string;
  /** Продолжение пути: вход в диалог или в урок. */
  readonly onDone: () => void;
}

/**
 * Хореография из макета, вариант «Печать». Числа не круглые «на глаз», а
 * взятые из действующей системы: 620 мс и кривая (.33,.52,.25,.99) — те же,
 * что у полёта рун (components/LearningV2RuneFlight).
 */
const DROP_MS = 620;
const DROP_DELAY_MS = 120;
/** Момент оттиска. Сюда же ставится единственный удар звука и хаптика. */
const IMPACT_MS = DROP_DELAY_MS + DROP_MS - 80;
const SHOCK_MS = 900;
const SHOCK_SECOND_DELAY_MS = 100;
const TEXT_MS = 520;
const CTA_MS = 460;

const DROP_EASE = Easing.bezier(0.23, 1, 0.32, 1);
const SHOCK_EASE = Easing.bezier(0.33, 0.52, 0.25, 0.99);

/** Мягкое проявление вместо движения — для reduce motion. */
const SOFT_MS = 260;

function FirstPurchaseSealCelebrationImpl({
  visible,
  kind,
  subjectTitle,
  title,
  subtitle,
  ctaLabel,
  onDone,
}: FirstPurchaseSealCelebrationProps) {
  const { theme: t, themeMode } = useTheme();
  const reduceMotion = useReduceMotion();

  /**
   * Акцент берётся ИЗ ТЕМЫ, а не хардкодится: тем девять, и свой цвет сломал
   * бы восемь из них.
   *
   * Обе валюты используют один акцент темы намеренно: различает их иконка
   * (руна против жемчужины) и текст, а не вторая палитра. Отдельный «цвет
   * жемчуга» пришлось бы подбирать под каждую тему вручную — там и появляются
   * сочетания, которые выглядят чужими.
   */
  const accent = t.accent;
  const coinSource = kind === 'lesson'
    ? (PEARL_ICONS[themeMode] ?? PEARL_ICONS.indigo)
    : HOME_RUNE_ICON_SOURCE;

  const drop = useSharedValue(0);
  const shockA = useSharedValue(0);
  const shockB = useSharedValue(0);
  const text = useSharedValue(0);
  const cta = useSharedValue(0);

  // Хаптик ровно один раз за показ: повтор превратил бы удар в дребезг
  // (та же ошибка была у старого празднования Plus — 12 ударов подряд).
  const impactFiredRef = useRef(false);

  const reset = useCallback(() => {
    cancelAnimation(drop);
    cancelAnimation(shockA);
    cancelAnimation(shockB);
    cancelAnimation(text);
    cancelAnimation(cta);
    drop.value = 0;
    shockA.value = 0;
    shockB.value = 0;
    text.value = 0;
    cta.value = 0;
    impactFiredRef.current = false;
  }, [cta, drop, shockA, shockB, text]);

  useEffect(() => {
    if (!visible) {
      reset();
      return;
    }
    if (reduceMotion) {
      // Движение убрано, смысл сохранён: всё проявляется мягко и сразу.
      drop.value = withTiming(1, { duration: SOFT_MS });
      text.value = withTiming(1, { duration: SOFT_MS });
      cta.value = withTiming(1, { duration: SOFT_MS });
      return;
    }
    drop.value = withDelay(DROP_DELAY_MS, withTiming(1, { duration: DROP_MS, easing: DROP_EASE }));
    shockA.value = withDelay(IMPACT_MS, withTiming(1, { duration: SHOCK_MS, easing: SHOCK_EASE }));
    shockB.value = withDelay(
      IMPACT_MS + SHOCK_SECOND_DELAY_MS,
      withTiming(1, { duration: SHOCK_MS, easing: SHOCK_EASE }),
    );
    text.value = withDelay(IMPACT_MS + 120, withTiming(1, { duration: TEXT_MS, easing: DROP_EASE }));
    cta.value = withDelay(IMPACT_MS + 320, withTiming(1, { duration: CTA_MS, easing: DROP_EASE }));

    // Удар — в момент оттиска, а не на открытии модалки: иначе тактильный
    // отклик приходит раньше картинки и читается как сбой.
    const timer = setTimeout(() => {
      if (impactFiredRef.current) return;
      impactFiredRef.current = true;
      void hapticSuccess();
    }, IMPACT_MS);
    return () => clearTimeout(timer);
  }, [cta, drop, reduceMotion, reset, shockA, shockB, text, visible]);

  const coinStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: drop.value, transform: [] };
    return {
      opacity: interpolate(drop.value, [0, 0.12, 1], [0, 1, 1]),
      transform: [
        // Падение сверху и лёгкий перелёт: вещь приходит извне, а не
        // «появляется из ничего» — из ничего не появляется ничто реальное.
        { translateY: interpolate(drop.value, [0, 0.68, 1], [-120, 6, 0]) },
        { scale: interpolate(drop.value, [0, 0.68, 1], [0.86, 1.04, 1]) },
        { rotate: `${interpolate(drop.value, [0, 0.68, 1], [-14, 2, 0])}deg` },
      ],
    };
  });

  // зачем четыре отдельных useAnimatedStyle, а не фабрика: хук, вызванный
  // внутри обычной функции, нарушает правила хуков — порядок вызовов может
  // разойтись между рендерами и дать плавающий баг. Дублирование здесь
  // безопаснее «красивого» помощника.
  const shockAStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shockA.value, [0, 0.02, 1], [0, 0.32, 0]),
    transform: [{ scale: interpolate(shockA.value, [0, 1], [0.9, 5.4]) }],
  }));
  const shockBStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shockB.value, [0, 0.02, 1], [0, 0.32, 0]),
    transform: [{ scale: interpolate(shockB.value, [0, 1], [0.9, 5.4]) }],
  }));

  const textStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: text.value, transform: [] };
    return {
      opacity: text.value,
      transform: [{ translateY: interpolate(text.value, [0, 1], [14, 0]) }],
    };
  });
  const ctaStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: cta.value, transform: [] };
    return {
      opacity: cta.value,
      transform: [{ translateY: interpolate(cta.value, [0, 1], [14, 0]) }],
    };
  });

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      {/* Тон и глубина вместо обводок — запрет владельца на рамки контейнеров. */}
      <View style={[styles.root, { backgroundColor: t.bgPrimary }]}>
        <View style={styles.stage}>
          <View style={styles.sealArea}>
            <Animated.View
              pointerEvents="none"
              style={[styles.shock, { backgroundColor: accent }, shockAStyle]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.shock, { backgroundColor: accent }, shockBStyle]}
            />
            <Animated.View style={coinStyle}>
              {/* Монета декоративна: что именно куплено, произносит текст ниже
                  («Диалог открыт» + название). Дублировать картинкой значило бы
                  заставить человека слушать одно и то же дважды. */}
              <Image
                source={coinSource}
                style={styles.coin}
                resizeMode="contain"
                accessible={false}
              />
            </Animated.View>
          </View>

          <Animated.View style={textStyle}>
            {/* Заголовок самодостаточен: подписи-расшифровки мелким шрифтом
                под названием запрещены, поэтому вторая строка — это факт
                («что именно куплено»), а не пояснение к заголовку. */}
            <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
            <Text style={[styles.subject, { color: accent }]}>{subjectTitle}</Text>
            <Text style={[styles.subtitle, { color: t.textMuted }]}>
              {subtitle}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.ctaWrap, ctaStyle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
              onPress={onDone}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: accent },
                // Нажатие обязано отзываться мгновенно.
                pressed && styles.ctaPressed,
              ]}
            >
              {/* Текст на залитой CTA — всегда correctText, белый хардкодить
                  нельзя: на светлых темах он был бы нечитаем. */}
              <Text style={[styles.ctaText, { color: t.correctText }]}>
                {ctaLabel}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  stage: { alignItems: 'center' },
  sealArea: { alignItems: 'center', justifyContent: 'center', height: 96, marginBottom: 18 },
  shock: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    // зачем заливка, а не обводка: волна рисуется ТОНОМ (мягкое пятно, которое
    // растёт и тает), как того требует правило владельца «разделяем тоном, а
    // не рамками». Заодно мягкий круг честнее читается как ударная волна,
    // чем чёткое кольцо-контур.
  },
  coin: { width: 60, height: 60 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  subject: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 6 },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 8, opacity: 0.72 },
  ctaWrap: { marginTop: 22 },
  cta: { paddingVertical: 14, paddingHorizontal: 30, borderRadius: 16 },
  ctaPressed: { transform: [{ scale: 0.97 }] },
  ctaText: { fontSize: 16, fontWeight: '800' },
});

export const FirstPurchaseSealCelebration = memo(FirstPurchaseSealCelebrationImpl);
export default FirstPurchaseSealCelebration;
