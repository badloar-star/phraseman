// ─── Окно ворот списка уроков — learn.html `dlg` (кадры A10–A12) ─────────────
// зачем (Сверка learn-011/012/013, 05.10): «Ещё рано», «Уровень пока закрыт», «Недоступно» в макете — окно ПО ЦЕНТРУ:
// круглая плитка 64 со значком 28 (замок / шапочка), заголовок 22/28 по центру, пояснение 16/22 --sec в 10, кнопки
// столбиком через 10 в 22 от текста (главная — белая пилюля 48 с глянцем). Раньше это была общая шторка выбора
// (system.html) — её не трогаем, у неё свой макет и свои потребители. Решения (когда открыть, что написать)
// остаются в app/(tabs)/lessons.tsx.
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { hapticTap } from '../../hooks/use-haptics';
import { useLineScale } from '../../hooks/useLineScale';
import HybridAlertShell from '../modal_fx/HybridAlertShell';
import { useTheme } from '../ThemeContext';
import { KitGlassLayer } from '../v2/KitLiquidGlass';
import { ThemeAccentFill } from '../v2/ThemeAccentFill';

const EXEMPT_COLOR_1 = '#000000'; // theme-exempt: тень окна — чёрная в любой теме

export type LessonsGateDialogIcon = 'lock' | 'school';

type Props = Readonly<{
  visible: boolean;
  icon: LessonsGateDialogIcon;
  title: string;
  message: string;
  closeLabel: string;
  onClose: () => void;
}>;

function LessonsGateDialogBase({ visible, icon, title, message, closeLabel, onClose }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const lh = useLineScale();
  return (
    <HybridAlertShell visible={visible} onRequestClose={onClose} placement="center" shadowColor={EXEMPT_COLOR_1} testID="lessons-gate-dialog">
      <View style={[styles.dlg, { backgroundColor: glass.opaqueSheet, borderColor: glass.line }]}>{/* guard-ok: 1 px кромка .dlg */}
        <KitGlassLayer radius={24} />
        <View style={[styles.icon, { backgroundColor: glass.opaqueControl }]}>
          <Ionicons name={icon === 'school' ? 'school-outline' : 'lock-closed'} size={icon === 'school' ? 28 : 26} color={glass.text} />
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: glass.text, lineHeight: lh(28) }]}>{title}</Text>
        {message ? <Text style={[styles.message, { color: glass.secondary, lineHeight: lh(22) }]}>{message}</Text> : null}
        <View style={styles.buttons}>
          <Pressable
            testID="lessons-gate-dialog-close"
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={() => { hapticTap(); onClose(); }}
            style={({ pressed }) => [styles.cta, { backgroundColor: glass.accent, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
          >
            <ThemeAccentFill glass={glass} radius={24} />
            <Text style={[styles.ctaText, { color: glass.accentInk }]}>{closeLabel}</Text>
          </Pressable>
        </View>
      </View>
    </HybridAlertShell>
  );
}

export const LessonsGateDialog = memo(LessonsGateDialogBase);

const styles = StyleSheet.create({
  // `.dlg`: на всю ширину в полях 28 (поля даёт оболочка), r24, поля 26/22/22, кромка --line, по центру.
  dlg: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1, // guard-ok: 1 px кромка .dlg (исключение 2.0)
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 22,
    alignItems: 'center',
    overflow: 'hidden',
  },
  // `.dlg .ic`: круг 64 #242426, значок 28, 16 до заголовка.
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 16, textAlign: 'center', marginTop: 10 },
  buttons: { alignSelf: 'stretch', gap: 10, marginTop: 22 },
  // `.dlg .cta`: 48, r24.
  cta: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
