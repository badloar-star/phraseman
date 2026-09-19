/**
 * Режим «Говорить» (раздел «Карточки») — большая круглая кнопка «зажми и говори».
 *
 * зачем (владелец, 2026-08-17): «в отработке есть блиц и слушать — надо ещё речь».
 * Это тот же приём, что у кнопки «Устно» в уроках/тренажёре (`SpeakingButton`
 * с `inlineHold`): удержание — запись, отпускание — оценка. Но здесь кнопка —
 * главный элемент экрана (как ⏯ у слушания), поэтому она круглая, крупная и
 * живёт в транспортном ряду, а не пилюлей у поля ответа.
 *
 * Гейт тот же, что у всех речевых поверхностей: дневной лимит голосовых попыток
 * обычного аккаунта (`useSpeakingAttemptGate`, 2026-09-13); при исчерпании тап ведёт
 * на пейвол с контекстом 'speaking', а у кнопки — бейдж Plus. Авторизованная
 * карточная сессия (sessionAuthorized) уже заплатила квотой тренировок.
 * Хост владеет состоянием удержания (`onHoldStart`/`onHoldEnd`) и сам монтирует
 * `SpeakingPanel presentation="inline"` — как трейнер фраз.
 *
 * Движение: пружина на нажатие (scale) + мягкое «дыхание» тона пока идёт запись —
 * без вечных циклов (withRepeat -1 запрещён перф-контрактом), только timing на
 * смену состояния.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSpeakingAttemptGate } from '../../hooks/useSpeakingAttemptGate';
import PlusBadge from '../../components/PlusBadge';
import SpeakingQuotaDots from '../../components/SpeakingQuotaDots';
import type { RevenueDailyQuotaResult } from '../revenue_daily_quota';
import { useTheme } from '../../components/ThemeContext';
import { hapticTap } from '../../hooks/use-haptics';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';

const PRESS_SPRING = { damping: 16, stiffness: 320, mass: 0.6 } as const;
/**
 * Квота «без лимита» для авторизованной карточной сессии.
 *
 * зачем: сессия уже оплачена квотой ТРЕНИРОВОК, голосовые попытки внутри неё не
 * списываются. Показать здесь ряд голосовых точек значило бы соврать про остаток,
 * поэтому подставляем limit=null — компонент рисует распорку той же высоты и
 * геометрия кнопки остаётся неизменной.
 */
const SESSION_AUTHORIZED_QUOTA: RevenueDailyQuotaResult = Object.freeze({
  status: 'allowed', used: 0, limit: null, extra: 0, resetAt: null, period: null, bypass: null,
});
export const SPEAK_HOLD_BUTTON_SIZE = 76;
const HALO_SIZE = SPEAK_HOLD_BUTTON_SIZE + 22;
/** Высота всего, что нарисовано ПОД кругом — соседи в транспортном ряду
 *  используют это, чтобы выровнять свои круги по низу HALO_SIZE, а не по низу
 *  всего компонента.
 *
 *  Складывается из подписи (marginTop 4 + height 18 = 22) и ряда точек остатка
 *  (marginTop 4 + height 5 = 9). Ряд точек занимает свою высоту ВСЕГДА, даже
 *  когда точек не видно (распорка внутри SpeakingQuotaDots), поэтому константа
 *  постоянна и ряд не разъезжается ни в одном состоянии. */
export const SPEAK_HOLD_LABEL_HEIGHT = 31;

export type SpeakHoldButtonProps = {
  accent: string;
  /** Идёт запись — кнопка «горит» ярче и растёт ореол. */
  listening: boolean;
  /** Кнопка недоступна (нет карточки / показываем результат сессии). */
  disabled?: boolean;
  /** This mounted flashcard session already passed its authoritative quota gate. */
  sessionAuthorized?: boolean;
  reduceMotion?: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  /** Screen-reader activation toggles the same capture owned by the host. */
  onAccessibilityActivate?: () => void;
  /** Подпись под кнопкой (фиксированной высоты — без прыжков вёрстки). */
  label: string;
  testID?: string;
};

export default function SpeakHoldButton({
  accent,
  listening,
  disabled = false,
  sessionAuthorized = false,
  reduceMotion = false,
  onHoldStart,
  onHoldEnd,
  onAccessibilityActivate,
  label,
  testID = 'fc-speak-hold',
}: SpeakHoldButtonProps) {
  const { theme: t, themeMode } = useTheme();
  // зачем (владелец, 2026-09-13): вне авторизованной карточной сессии действует
  // дневной лимит голосовых попыток обычного аккаунта (не глухой пейвол).
  // Авторизованная сессия уже заплатила квотой тренировок — гейт не спрашиваем.
  const speakingGate = useSpeakingAttemptGate({ context: 'speaking', source: 'flashcards_speak_hold' });
  const speakingAllowed = sessionAuthorized || !speakingGate.locked;
  const holdStartedRef = useRef(false);
  const { lang } = useLang();
  const microphoneLabel = triLang(lang, {
    ru: 'Микрофон. Ответить устно', uk: 'Мікрофон. Відповісти вголос', en: 'Microphone. Answer aloud',
    es: 'Micrófono. Responder en voz alta', 'pt-BR': 'Microfone. Responder em voz alta', vi: 'Micrô. Trả lời thành tiếng',
    id: 'Mikrofon. Jawab dengan suara', tr: 'Mikrofon. Sesli yanıtla', pl: 'Mikrofon. Odpowiedz na głos',
  });
  const microphoneHint = triLang(lang, {
    ru: 'Удерживай, пока говоришь; отпусти, чтобы закончить.', uk: 'Утримуй, поки говориш; відпусти, щоб завершити.',
    en: 'Hold while speaking; release to finish.', es: 'Mantén pulsado mientras hablas; suelta para terminar.',
    'pt-BR': 'Segure enquanto fala; solte para terminar.', vi: 'Giữ khi nói; thả để kết thúc.',
    id: 'Tahan saat berbicara; lepaskan untuk selesai.', tr: 'Konuşurken basılı tut; bitirmek için bırak.', pl: 'Przytrzymaj podczas mówienia; puść, aby zakończyć.',
  });
  const microphoneAssistiveHint = triLang(lang, listening ? {
    ru: 'Нажми дважды, чтобы закончить.', uk: 'Натисни двічі, щоб завершити.', en: 'Double tap to finish.',
    es: 'Toca dos veces para terminar.', 'pt-BR': 'Toque duas vezes para terminar.', vi: 'Chạm hai lần để kết thúc.',
    id: 'Ketuk dua kali untuk selesai.', tr: 'Bitirmek için iki kez dokun.', pl: 'Stuknij dwukrotnie, aby zakończyć.',
  } : {
    ru: 'Нажми дважды, чтобы начать; ещё раз — чтобы закончить.', uk: 'Натисни двічі, щоб почати; ще раз — щоб завершити.', en: 'Double tap to start; double tap again to finish.',
    es: 'Toca dos veces para empezar; repite para terminar.', 'pt-BR': 'Toque duas vezes para começar; repita para terminar.', vi: 'Chạm hai lần để bắt đầu; chạm lại để kết thúc.',
    id: 'Ketuk dua kali untuk mulai; ketuk lagi untuk selesai.', tr: 'Başlamak için iki kez dokun; bitirmek için tekrar dokun.', pl: 'Stuknij dwukrotnie, aby zacząć; ponownie, aby zakończyć.',
  });

  const press = useSharedValue(0);
  const halo = useSharedValue(0);

  useEffect(() => {
    // Ореол появляется на время записи; на reduceMotion — просто включается.
    halo.value = reduceMotion
      ? withTiming(listening ? 1 : 0, { duration: 60 })
      : withTiming(listening ? 1 : 0, { duration: listening ? 220 : 160 });
  }, [listening, reduceMotion, halo]);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.06 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: halo.value * 0.28,
    transform: [{ scale: 0.7 + halo.value * 0.3 }],
  }));

  const onPressIn = useCallback(() => {
    press.value = reduceMotion ? withTiming(1, { duration: 50 }) : withSpring(1, PRESS_SPRING);
    void hapticTap();
    if (!sessionAuthorized && !speakingGate.tryStartAttempt()) {
      holdStartedRef.current = false;
      return;
    }
    holdStartedRef.current = true;
    onHoldStart();
  }, [sessionAuthorized, speakingGate, press, reduceMotion, onHoldStart]);

  const onPressOut = useCallback(() => {
    press.value = reduceMotion ? withTiming(0, { duration: 80 }) : withSpring(0, PRESS_SPRING);
    if (!holdStartedRef.current) return;
    holdStartedRef.current = false;
    onHoldEnd();
  }, [press, reduceMotion, onHoldEnd]);

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <Reanimated.View
          pointerEvents="none"
          style={[styles.halo, { backgroundColor: accent }, haloStyle]}
        />
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={microphoneLabel}
          accessibilityHint={onAccessibilityActivate ? microphoneAssistiveHint : microphoneHint}
          accessibilityState={{ disabled, selected: listening }}
          accessibilityActions={onAccessibilityActivate ? [{ name: 'activate' }] : undefined}
          onAccessibilityAction={(event) => {
            if (!disabled && event.nativeEvent.actionName === 'activate') {
              onAccessibilityActivate?.();
            }
          }}
          accessible
          disabled={disabled}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          hitSlop={12}
          pressRetentionOffset={{ top: 40, right: 40, bottom: 40, left: 40 }}
        >
          <Reanimated.View
            style={[
              styles.btn,
              {
                backgroundColor: disabled ? t.bgSurface : accent,
                opacity: disabled ? 0.55 : 1,
                shadowColor: accent,
              },
              btnStyle,
            ]}
          >
            <Ionicons name={listening ? 'mic' : 'mic-outline'} size={34} color={disabled ? t.textMuted : '#07110A'} />
          </Reanimated.View>
        </Pressable>
        {!speakingAllowed ? (
          <View pointerEvents="none" style={styles.badge}>
            <PlusBadge themeMode={themeMode} size="xs" />
          </View>
        ) : null}
      </View>
      {/* Подпись фиксированной высоты: состояния меняются, геометрия — нет. */}
      <Text
        style={[styles.label, { color: listening ? accent : t.textMuted }]}
        testID={`${testID}-label`}
      >
        {label}
      </Text>
      {/* зачем (владелец 2026-09-13): остаток дневных голосовых попыток виден
          на всех микрофонах. В авторизованной карточной сессии точек нет: она
          уже оплачена квотой тренировок, и ряд голосовых попыток там был бы
          ложью. Высота ряда постоянна в обоих случаях — транспортный ряд и
          соседние круги не сдвигаются. */}
      <SpeakingQuotaDots
        quota={sessionAuthorized ? SESSION_AUTHORIZED_QUOTA : speakingGate.quota}
        spentColor={t.textMuted}
        remainingColor={accent}
        style={styles.dots}
        testID={`${testID}-quota-dots`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  stage: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
  },
  btn: {
    width: SPEAK_HOLD_BUTTON_SIZE,
    height: SPEAK_HOLD_BUTTON_SIZE,
    borderRadius: SPEAK_HOLD_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  badge: { position: 'absolute', top: 2, right: -6 },
  dots: { marginTop: 4 },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    height: 18,
    lineHeight: 18,
    textAlign: 'center',
  },
});
