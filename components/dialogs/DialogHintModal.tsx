/**
 * DialogHintModal — окно «Подсказка» по центру экрана диалога (лампочка).
 *
 * зачем (владелец 2026-09-17/18): подсказка ПОКАЗЫВАЕТСЯ, а не вставляется в
 * поле ввода; текст — шаг сценария на языке интерфейса, бесплатно, без сети и
 * модели. Простое окно, а не шторка: одна фраза, жесты и каркас ради неё лишние.
 *
 * Liquid Glass 2.0 (владелец 2026-09-29, макет dialogs.html C5): непрозрачная
 * стеклянная карточка по центру, лампочка + «Подсказка», ниже текст шага;
 * закрытие тапом по фону. Цвета — токены активной из 13 тем.
 *
 * Вынесено из app/ai_dialog_session.tsx, чтобы огромный экран сессии не
 * разрастался; пропсы и поведение (открыть/закрыть/текст) прежние.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import HybridAlertShell from '../modal_fx/HybridAlertShell';
import { plateBoxShadow } from '../v2/ShadowSurface';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';

const EXEMPT_COLOR_1 = '#000000'; // theme-exempt: тень окна — чёрная в любой теме

interface DialogHintModalProps {
  visible: boolean;
  onClose: () => void;
  lang: Lang;
  /** Текст шага сценария (presentation.hint). */
  hint: string;
  testID?: string;
}

export default function DialogHintModal({ visible, onClose, lang, hint, testID }: DialogHintModalProps) {
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);

  return (
    // зачем HybridAlertShell: общий гибридный вход окон по центру (вуаль, «выход из света»,
    // закрытие тапом по фону, Android «назад», доступность модального окна).
    <HybridAlertShell visible={visible} onRequestClose={onClose} shadowColor={EXEMPT_COLOR_1} scrollContent={false}>
      <View
        testID={testID}
        // зачем: VoiceOver не достаёт до фона — жест «escape» закрывает окно.
        onAccessibilityEscape={onClose}
        // зачем (стиль «Тень», владелец 12.10): окно по центру без кромки и без внутренних фасок — отделяет тень плашки.
        style={[styles.card, { backgroundColor: glass.opaqueSheet, boxShadow: plateBoxShadow(glass) }]}
      >
        <View style={styles.head}>
          <Ionicons name="bulb-outline" size={24} color={glass.text} accessibilityElementsHidden />
          <Text
            accessibilityRole="header"
            style={{ color: glass.text, fontSize: f.h2, fontWeight: '700', flex: 1 }}
            maxFontSizeMultiplier={1.2}
          >
            {triLang(lang, {
              ru: 'Подсказка', uk: 'Підказка', en: 'Hint', es: 'Pista', 'pt-BR': 'Dica',
              vi: 'Gợi ý', id: 'Petunjuk', tr: 'İpucu', pl: 'Podpowiedź',
            })}
          </Text>
        </View>
        {/* Подсказка БЕСПЛАТНА (владелец 2026-09-18: «она бесплатна, там
            ничего не надо платить»). Платная механика живёт в «Почему так». */}
        <Text
          style={{ color: glass.secondary, fontSize: f.bodyLg, lineHeight: Math.round(f.bodyLg * 1.4), marginTop: 12 }}
          maxFontSizeMultiplier={1.2}
        >
          {hint}
        </Text>
      </View>
    </HybridAlertShell>
  );
}

const styles = StyleSheet.create({
  // зачем (Сверка dialogs-017, dialogs.html .modal): окно подсказки по центру, как в макете; без кромки (стиль «Тень»).
  card: { borderRadius: 26, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 22 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
