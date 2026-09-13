import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useSpeakingAttemptGate } from '../hooks/useSpeakingAttemptGate';
import PlusBadge from './PlusBadge';
import SpeakingQuotaDots from './SpeakingQuotaDots';
import SpeakingPanel, { buildSpeakingPanelTheme } from './SpeakingPanel';
import { useTheme } from './ThemeContext';
import { isSpeakingEnabled } from '../app/remote_flags';
import { hapticTap } from '../hooks/use-haptics';

/**
 * Drop-in "Устно" (speaking) control + paywall gate + panel overlay.
 *
 * One component for every active surface (lessons use the panel directly;
 * trainer sessions use this wrapper). Free users are routed to the
 * paywall with context 'speaking'; premium users open the SpeakingPanel.
 *
 * Render it anywhere near the answer area. It renders its own button AND the
 * overlay, so the host only supplies the target phrase.
 */

const SPEAKING_LABELS: Record<string, string> = {
  ru: 'Устно',
  uk: 'Усно',
  es: 'Hablar',
  'pt-BR': 'Falar',
  vi: 'Nói',
  id: 'Ucap',
  tr: 'Sesli',
  pl: 'Mów',
};

const SPEAKING_A11Y: Record<string, string> = {
  ru: 'Сказать фразу вслух',
  uk: 'Сказати фразу вголос',
  es: 'Decir la frase en voz alta',
  'pt-BR': 'Dizer a frase em voz alta',
  vi: 'Nói cụm từ thành tiếng',
  id: 'Ucapkan frasa dengan lantang',
  tr: 'Cümleyi sesli söyle',
  pl: 'Powiedz frazę na głos',
};

export interface SpeakingButtonProps {
  /** Canonical English phrase to practice. If empty, the button hides. */
  targetText: string;
  lang: string;
  /** Visual variant: 'pill' (default, standalone) or 'footer' (icon+label column). */
  variant?: 'pill' | 'footer';
  style?: StyleProp<ViewStyle>;
  onPass?: (result: { score: number; transcript: string }) => void;
  /** Host-owned inline slot: this button remains the premium-gated hold target. */
  inlineHold?: SpeakingInlineHoldControl;
}

export interface SpeakingInlineHoldControl {
  onStart: () => void;
  onEnd: () => void;
}

export function SpeakingButton({
  targetText,
  lang,
  variant = 'pill',
  style,
  onPass,
  inlineHold,
}: SpeakingButtonProps) {
  const { theme: t, themeMode } = useTheme();
  // зачем (владелец, 2026-09-13): вместо глухого «только в Plus» — дневной лимит
  // голосовых попыток обычного аккаунта. Решение в кадре тапа, чек — фоном.
  const gate = useSpeakingAttemptGate({ context: 'speaking', source: 'lesson_speaking' });
  const isPremium = !gate.locked;
  const [open, setOpen] = useState(false);
  const holdStartedRef = useRef(false);

  const cleaned = (targetText ?? '').trim();

  const onPress = useCallback(() => {
    hapticTap();
    if (!gate.tryStartAttempt()) return;
    setOpen(true);
  }, [gate]);

  const onPressIn = useCallback(() => {
    if (!inlineHold) return;
    hapticTap();
    if (!gate.tryStartAttempt()) {
      holdStartedRef.current = false;
      return;
    }
    holdStartedRef.current = true;
    inlineHold.onStart();
  }, [inlineHold, gate]);

  const onPressOut = useCallback(() => {
    if (!holdStartedRef.current) return;
    holdStartedRef.current = false;
    inlineHold?.onEnd();
  }, [inlineHold]);

  if (!cleaned) return null;
  // Remote kill-switch: ops can disable speaking app-wide (e.g. a recognizer
  // regression) without a release. Default is ON, so this only hides the entry
  // point when explicitly flipped off in Remote Config.
  if (!isSpeakingEnabled()) return null;

  const label = SPEAKING_LABELS[lang] ?? SPEAKING_LABELS.ru;
  const a11y = SPEAKING_A11Y[lang] ?? SPEAKING_A11Y.ru;

  return (
    <>
      {variant === 'footer' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11y}
          onPress={inlineHold ? undefined : onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          style={[{ alignItems: 'center', justifyContent: 'center', minHeight: 44 }, style]}
        >
          <View style={{ position: 'relative' }}>
            <Ionicons name="mic-outline" size={26} color={t.textSecond} />
            {!isPremium && (
              <View style={{ position: 'absolute', top: -8, right: -22 }}>
                <PlusBadge themeMode={themeMode} size="xs" showIcon={false} />
              </View>
            )}
          </View>
          <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 4 }}>{label}</Text>{/* guard-ok: подпись иконки футера, а не расшифровка под названием */}
          {/* зачем (владелец 2026-09-13): остаток дневных попыток виден заранее,
              а не в момент отказа. Высота ряда постоянна (компонент сам держит
              распорку), поэтому подпись и соседи по футеру не сдвигаются. */}
          <SpeakingQuotaDots
            quota={gate.quota}
            spentColor={t.textMuted}
            remainingColor={t.accent}
            style={{ marginTop: 3 }}
          />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11y}
          onPress={inlineHold ? undefined : onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'center',
              gap: 8,
              paddingVertical: 10,
              paddingHorizontal: 18,
              borderRadius: 999,
              borderWidth: 0,
              borderColor: t.border,
              backgroundColor: t.bgCard,
            },
            style,
          ]}
        >
          <Ionicons name="mic" size={18} color={t.accent} />
          <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '600' }}>{label}</Text>
          {/* В пилюле точки идут в один ряд с подписью: высота строки задана
              иконкой и текстом, поэтому ряд точек её не меняет ни в одном состоянии. */}
          <SpeakingQuotaDots
            quota={gate.quota}
            spentColor={t.textMuted}
            remainingColor={t.accent}
          />
          {!isPremium && <PlusBadge themeMode={themeMode} size="xs" />}
        </Pressable>
      )}

      {open && !inlineHold && (
        <SpeakingPanel
          targetText={cleaned}
          lang={lang}
          theme={buildSpeakingPanelTheme(t)}
          onPass={onPass}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default SpeakingButton;
