/**
 * OnboardingWelcomeSheet — приветственная шторка сразу после последнего экрана
 * онбординга.
 *
 * зачем: владелец (2026-07-26) — «после последнего экрана хочу модалку-лист,
 * которая благодарит и вводит в курс дела». Исследование поведения новичков:
 * работает только КОРОТКОЕ приветствие с ОДНИМ понятным следующим шагом —
 * многостраничные фиче-туры пролистывают, не читая. Поэтому здесь строго:
 * спасибо по имени → одна мысль (заниматься понемногу каждый день) → одна
 * кнопка, закрывающая шторку. Свайп вниз тоже закрывает.
 *
 * Каркас (выезд снизу, drag-to-dismiss, подложка) переиспользован из
 * ReferralSheetShell — единый паттерн шторок по DESIGN.md, ничего не изобретаем.
 * Токены темы, без обводок (тон), fontWeight только 400/700.
 */
import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ReferralSheetShell from './referral_sheet_shell';
import TapScale from './TapScale';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';

interface Props {
  visible: boolean;
  /** Имя из онбординга. Пустое/пробелы → безличный тёплый заголовок. */
  userName?: string | null;
  onClose: () => void;
  testID?: string;
}

/** Заголовок с именем, но без «Спасибо, !», если имя пустое. */
export function welcomeSheetTitle(userName?: string | null): string {
  const name = String(userName ?? '').trim();
  return name ? `Спасибо, ${name}!` : 'Спасибо!';
}

function OnboardingWelcomeSheet({ visible, userName, onClose, testID }: Props) {
  const { theme: t, f } = useTheme();

  // зачем: закрытие — единственное действие шторки; хаптика на управляющем
  // элементе (по правилам владельца — не на плитках), состояние локальное,
  // никакой сети, поэтому отклик мгновенный и откатывать нечего.
  const handleClose = useCallback(() => {
    void hapticTap();
    onClose();
  }, [onClose]);

  return (
    <ReferralSheetShell
      visible={visible}
      onClose={onClose}
      title={welcomeSheetTitle(userName)}
      closeLabel="Закрыть приветствие"
      testID={testID ?? 'onboarding-welcome-sheet'}
    >
      <View style={styles.body}>
        <Text
          style={[styles.lead, { color: t.textPrimary, fontSize: f.body }]}
          maxFontSizeMultiplier={1.2}
        >
          Всё готово — план собран под твои ответы.
        </Text>
        <Text
          style={[styles.note, { color: t.textSecond, fontSize: f.body }]}
          maxFontSizeMultiplier={1.2}
        >
          Занимайся понемногу, но каждый день: несколько минут ежедневно дают
          больше, чем редкие длинные подходы.
        </Text>

        <TapScale
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Начать"
          testID="onboarding-welcome-sheet-cta"
          style={[styles.cta, { backgroundColor: t.accent }]}
        >
          <Text
            style={[styles.ctaLabel, { color: t.correctText, fontSize: f.bodyLg }]}
            maxFontSizeMultiplier={1.2}
          >
            Понятно, начнём
          </Text>
        </TapScale>
      </View>
    </ReferralSheetShell>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingTop: 4 },
  lead: { fontWeight: '700', lineHeight: 22 },
  note: { fontWeight: '400', lineHeight: 22 },
  cta: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { fontWeight: '700' },
});

export default React.memo(OnboardingWelcomeSheet);
