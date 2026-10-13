// ════════════════════════════════════════════════════════════════════════════
// PackMoreMenu.tsx — меню «⋮» на экране набора сообщества: «Пожаловаться на набор» / «Скрыть набор».
//
// зачем (решение владельца 13.10; Apple Guideline 1.2 — пользователь может пожаловаться на контент и скрыть его):
// раньше «⋮» открывало жалобу сразу, а действие «Не показывать мне» жило только на шаге после жалобы. Теперь это два пункта меню,
// плашка в стиле «Тень» (как меню действий над набором в каталоге, cards-v2 №15): без обводок, тень плашки из темы.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { plateBoxShadow } from './v2/ShadowSurface';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useReduceMotion } from '../hooks/use_reduce_motion';

type Props = Readonly<{
  visible: boolean;
  lang: Lang;
  onClose: () => void;
  onReport: () => void;
  onHide: () => void;
}>;

function PackMoreMenu({ visible, lang, onClose, onReport, onHide }: Props) {
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const closeLabel = triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });
  const reportLabel = triLang(lang, { ru: 'Пожаловаться на набор', uk: 'Поскаржитися на набір', en: 'Report the pack', es: 'Reportar el pack', 'pt-BR': 'Denunciar o pack', vi: 'Báo cáo bộ thẻ', id: 'Laporkan pack', tr: 'Paketi şikayet et', pl: 'Zgłoś pakiet' });
  const hideLabel = triLang(lang, { ru: 'Скрыть набор', uk: 'Приховати набір', en: 'Hide the pack', es: 'Ocultar el pack', 'pt-BR': 'Ocultar o pack', vi: 'Ẩn bộ thẻ', id: 'Sembunyikan pack', tr: 'Paketi gizle', pl: 'Ukryj zestaw' });
  const row = (testID: string, icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void) => (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      onPress={() => { hapticTap(); onPress(); }}
      style={{ minHeight: 52, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <Ionicons name={icon} size={20} color={glass.text} />
      <Text style={{ color: glass.text, fontSize: f.body, fontWeight: '600', flexShrink: 1 }}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable testID="pack-more-menu-backdrop" accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={{ flex: 1 }} />
        <View
          testID="pack-more-menu"
          accessibilityRole="menu"
          style={{
            position: 'absolute',
            top: insets.top + 56,
            right: 16,
            width: 280,
            maxWidth: '90%',
            padding: 6,
            borderRadius: 18,
            backgroundColor: glass.opaqueSheet,
            boxShadow: plateBoxShadow(glass),
          }}
        >
          {row('pack-more-report', 'flag-outline', reportLabel, onReport)}
          {row('pack-more-hide', 'eye-off-outline', hideLabel, onHide)}
        </View>
      </View>
    </Modal>
  );
}

export default memo(PackMoreMenu);
