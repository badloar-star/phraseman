// ════════════════════════════════════════════════════════════════════════════
// GlassInlineAlert.tsx — стеклянное окно-сообщение ВНУТРИ уже открытой модалки.
//
// зачем: ошибки ввода имени раньше показывал нативный Alert.alert (системное серое окно),
// потому что второй RN-<Modal> поверх открытого <Modal> на iOS ломает стек презентаций
// (см. историю в settings.tsx). Это окно — НЕ <Modal>: обычный слой поверх содержимого
// той же модалки, поэтому конфликта презентаций нет, а вид — как стеклянные окна
// приложения (макет overlays-runtime, «native alert · empty/short/long/blocked name»).
// Тексты и кнопка «OK» те же, что были у системного алерта.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  okLabel?: string;
  onClose: () => void;
};

function GlassInlineAlert({ visible, title, message, okLabel = 'OK', onClose }: Props) {
  const { liquidGlassThemeId, f } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  if (!visible) return null;
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
      accessibilityViewIsModal
      testID="glass-inline-alert"
    >
      <View style={[styles.card, { backgroundColor: glass.opaqueSheet }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: glass.text, fontSize: f.h2 }]}>
          {title}
        </Text>
        {message ? (
          <Text style={[styles.message, { color: glass.secondary, fontSize: f.body, lineHeight: f.body * 1.45 }]}>
            {message}
          </Text>
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={okLabel}
          activeOpacity={0.8}
          onPress={onClose}
          style={[styles.button, { backgroundColor: glass.accent }]}
        >
          <Text style={[styles.buttonLabel, { color: glass.accentInk, fontSize: f.body }]}>{okLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 20 },
  card: { width: '100%', maxWidth: 340, borderRadius: 24, padding: 20 },
  title: { fontWeight: '700', textAlign: 'center' },
  message: { marginTop: 8, textAlign: 'center' },
  button: { marginTop: 18, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonLabel: { fontWeight: '700', textAlign: 'center' },
});

export default memo(GlassInlineAlert);
