/**
 * Микрофон «Устно» — «Карточки 2.0» (макет docs/design/v2-app/cards-v2.html, `.mic`, `oral()`).
 *
 * зачем (владелец 12.10: cards-v2 утверждён целиком; координатор: «микрофон 92 и ручное «Дальше» ДЕЛАЕМ»): круглая
 * кнопка 92 вместо «зажми и говори» 76 — касание включает запись, повторное касание заканчивает; платформенный
 * распознаватель сам завершает по тишине. Пока идёт запись, вокруг пульсирует двойное кольцо (`@keyframes ring`, 1,6 с).
 * Гейт тот же, что у SpeakHoldButton (дневной лимит голосовых попыток, устройство без распознавателя, авторизованная
 * карточная сессия не списывает). SpeakHoldButton остаётся для Learning V2 (hold-to-talk) и не тронут.
 * Волна «от уровня звука» живёт в SpeakingPanel (VoiceEqualizer получает реальный volumechange) — здесь не дублируется.
 */
import React, { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useVoiceAttemptGate } from '../../hooks/use_voice_attempt_gate';
import MicAllowanceBadge from '../../components/MicAllowanceBadge';
import { hapticTap } from '../../hooks/use-haptics';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';
import { speechUnavailableOnDeviceText, useSpeechUnavailableOnDevice } from '../speech_device_availability';
import { actionBoxShadow } from '../../components/v2/ShadowSurface';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';

export const SPEAK_MIC_SIZE = 92;
/** Внешнее кольцо уходит на 26 от края кнопки (`ring` макета: 12 и 26 px). */
const RING_NEAR = 12;
const RING_FAR = 26;
const PRESS_SPRING = { damping: 16, stiffness: 320, mass: 0.6 } as const;

export type SpeakMicButtonProps = Readonly<{
  g: GlassTokens;
  /** Идёт запись — кнопка «горит», кольца пульсируют. */
  listening: boolean;
  disabled?: boolean;
  /** Эта карточная сессия уже прошла квоту тренировок — голосовые попытки не списываются. */
  sessionAuthorized?: boolean;
  reduceMotion?: boolean;
  onStart: () => void;
  onStop: () => void;
  testID?: string;
}>;

function SpeakMicButtonBase({
  g,
  listening,
  disabled: disabledProp = false,
  reduceMotion = false,
  onStart,
  onStop,
  testID = 'fc-speak-mic',
}: SpeakMicButtonProps) {
  const { lang } = useLang();
  // зачем (владелец 15.10, D196): общий дневной счётчик голоса на все микрофоны — гейт и цифра остатка; прежняя серверная квота «speaking» и значок PLUS по ней убраны
  const voiceGate = useVoiceAttemptGate({ surface: 'cards_speaking', source: 'flashcards_speak_hold' });
  const speechNa = useSpeechUnavailableOnDevice();
  const disabled = disabledProp || speechNa;
  // зачем: кольцо крутится только пока экран в фокусе и приложение на переднем плане (перф-контракт: вечные циклы под гардом)
  const runtimeActive = useRuntimeActive();
  const press = useSharedValue(0);
  const ring = useSharedValue(0);
  const ringOn = useSharedValue(0);

  useEffect(() => {
    // зачем: бесконечный цикл допустим только пока идёт запись (allowlist «идёт звук»); при «уменьшить движение» кольцо статично.
    ringOn.value = withTiming(listening ? 1 : 0, { duration: listening ? 220 : 160 });
    cancelAnimation(ring);
    if (listening && !reduceMotion && runtimeActive) {
      ring.value = 0;
      ring.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
    } else {
      ring.value = 0;
    }
    return () => cancelAnimation(ring);
  }, [listening, reduceMotion, runtimeActive, ring, ringOn]);

  const nearStyle = useAnimatedStyle(() => ({
    opacity: ringOn.value * interpolate(ring.value, [0, 1], [0.16, 0.12]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [1, 1.035]) }],
  }));
  const farStyle = useAnimatedStyle(() => ({
    opacity: ringOn.value * interpolate(ring.value, [0, 1], [0.08, 0.04]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [1, 1.05]) }],
  }));
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.06 }] }));

  const onPress = useCallback(() => {
    void hapticTap();
    if (listening) {
      onStop();
      return;
    }
    if (speechNa) {
      console.warn('[SPEECH-AVAIL] SpeakMicButton: press ignored — speech unavailable on device', JSON.stringify({ testID })); // guard-ok: ранний выход пишет причину, лог на жест, не на кадр
      return;
    }
    if (!voiceGate.tryStartAttempt()) {
      console.warn('[SPEECH-GATE] SpeakMicButton: attempt gate refused', JSON.stringify({ testID, locked: voiceGate.locked })); // guard-ok: ранний выход пишет причину, лог на жест, не на кадр
      return;
    }
    onStart();
  }, [listening, onStart, onStop, speechNa, testID, voiceGate]);

  const label = speechNa
    ? speechUnavailableOnDeviceText(lang)
    : triLang(lang, {
      ru: 'Микрофон. Ответить устно', uk: 'Мікрофон. Відповісти вголос', en: 'Microphone. Answer aloud',
      es: 'Micrófono. Responder en voz alta', 'pt-BR': 'Microfone. Responder em voz alta', vi: 'Micrô. Trả lời thành tiếng',
      id: 'Mikrofon. Jawab dengan suara', tr: 'Mikrofon. Sesli yanıtla', pl: 'Mikrofon. Odpowiedz na głos',
    });
  const hint = triLang(lang, listening ? {
    ru: 'Нажми, чтобы закончить.', uk: 'Натисни, щоб завершити.', en: 'Tap to finish.',
    es: 'Toca para terminar.', 'pt-BR': 'Toque para terminar.', vi: 'Chạm để kết thúc.',
    id: 'Ketuk untuk selesai.', tr: 'Bitirmek için dokun.', pl: 'Stuknij, aby zakończyć.',
  } : {
    ru: 'Нажми и говори.', uk: 'Натисни й говори.', en: 'Tap and speak.',
    es: 'Toca y habla.', 'pt-BR': 'Toque e fale.', vi: 'Chạm và nói.',
    id: 'Ketuk dan bicara.', tr: 'Dokun ve konuş.', pl: 'Stuknij i mów.',
  });

  return (
    <View style={styles.stage}>
      <Reanimated.View pointerEvents="none" style={[styles.ring, { backgroundColor: g.cta, width: SPEAK_MIC_SIZE + RING_FAR * 2, height: SPEAK_MIC_SIZE + RING_FAR * 2, borderRadius: (SPEAK_MIC_SIZE + RING_FAR * 2) / 2 }, farStyle]} />
      <Reanimated.View pointerEvents="none" style={[styles.ring, { backgroundColor: g.cta, width: SPEAK_MIC_SIZE + RING_NEAR * 2, height: SPEAK_MIC_SIZE + RING_NEAR * 2, borderRadius: (SPEAK_MIC_SIZE + RING_NEAR * 2) / 2 }, nearStyle]} />
      <Pressable
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ disabled, selected: listening }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => { press.value = reduceMotion ? withTiming(1, { duration: 50 }) : withSpring(1, PRESS_SPRING); }}
        onPressOut={() => { press.value = reduceMotion ? withTiming(0, { duration: 80 }) : withSpring(0, PRESS_SPRING); }}
        hitSlop={12}
      >
        <Reanimated.View
          style={[
            styles.btn,
            // зачем (владелец 13.10, №35): отключённая — токен buttonFillDisabled (читается и отличима от активной), а не «45–55 % прозрачности»; главная — ctaFill
            { backgroundColor: disabled ? g.buttonFillDisabled : g.ctaFill, boxShadow: actionBoxShadow({ accent: g.ctaFill }) },
            btnStyle,
          ]}
        >
          <Ionicons name={speechNa ? 'mic-off-outline' : 'mic'} size={28} color={disabled ? g.secondary : g.ctaInk} />
        </Reanimated.View>
      </Pressable>
      {!speechNa ? <MicAllowanceBadge testID={`${testID}-allowance`} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: SPEAK_MIC_SIZE, height: SPEAK_MIC_SIZE, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  ring: { position: 'absolute' },
  btn: { width: SPEAK_MIC_SIZE, height: SPEAK_MIC_SIZE, borderRadius: SPEAK_MIC_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
});

export default memo(SpeakMicButtonBase);
