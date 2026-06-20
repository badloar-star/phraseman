import React, { useCallback, useState } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useFeatureAccess } from './PremiumContext';
import SpeakingPanel, { buildSpeakingPanelTheme } from './SpeakingPanel';
import { useTheme } from './ThemeContext';
import { isSpeakingEnabled } from '../app/remote_flags';
import { hapticTap } from '../hooks/use-haptics';

/**
 * Drop-in "Устно" (speaking) control + paywall gate + panel overlay.
 *
 * One component for every surface (lessons use the panel directly; quizzes /
 * trainer / personal-plan use this wrapper). Free users are routed to the
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
};

export interface SpeakingButtonProps {
  /** Canonical English phrase to practice. If empty, the button hides. */
  targetText: string;
  lang: string;
  /** Visual variant: 'pill' (default, standalone) or 'footer' (icon+label column). */
  variant?: 'pill' | 'footer';
  style?: StyleProp<ViewStyle>;
  onPass?: (result: { score: number; transcript: string }) => void;
}

export function SpeakingButton({
  targetText,
  lang,
  variant = 'pill',
  style,
  onPass,
}: SpeakingButtonProps) {
  const router = useRouter();
  const { theme: t } = useTheme();
  const isPremium = useFeatureAccess('speaking');
  const [open, setOpen] = useState(false);

  const cleaned = (targetText ?? '').trim();

  const onPress = useCallback(() => {
    hapticTap();
    if (!isPremium) {
      router.push({ pathname: '/premium_modal', params: { context: 'speaking' } } as any);
      return;
    }
    setOpen(true);
  }, [isPremium, router]);

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
          onPress={onPress}
          style={[{ alignItems: 'center' }, style]}
        >
          <View style={{ position: 'relative' }}>
            <Ionicons name="mic-outline" size={26} color={t.textSecond} />
            {!isPremium && (
              <View style={{ position: 'absolute', top: -4, right: -8 }}>
                <Ionicons name="lock-closed" size={12} color={t.accent} />
              </View>
            )}
          </View>
          <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 4 }}>{label}</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11y}
          onPress={onPress}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'center',
              gap: 8,
              paddingVertical: 10,
              paddingHorizontal: 18,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: t.border,
              backgroundColor: t.bgCard,
            },
            style,
          ]}
        >
          <Ionicons name="mic" size={18} color={t.accent} />
          <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '600' }}>{label}</Text>
          {!isPremium && <Ionicons name="lock-closed" size={13} color={t.textMuted} />}
        </Pressable>
      )}

      {open && (
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
