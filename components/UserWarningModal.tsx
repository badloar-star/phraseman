import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { hapticTap, hapticWarning } from '../hooks/use-haptics';
import type { Lang } from '../constants/i18n';

interface Props {
  visible: boolean;
  message: string;
  lang: Lang;
  onClose: () => void;
}

export default function UserWarningModal({ visible, message, lang, onClose }: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const title =
    lang === 'uk'
      ? 'Важливе повідомлення'
      : lang === 'es'
        ? 'Aviso importante'
        : 'Важное уведомление';
  const okLabel = lang === 'uk' ? 'Зрозуміло' : lang === 'es' ? 'Entendido' : 'Понятно';
  React.useEffect(() => {
    if (visible) hapticWarning();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: themeMode === 'ocean' || themeMode === 'sakura' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.60)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <View style={{
          backgroundColor: t.bgCard,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 340,
          borderWidth: 1,
          borderColor: t.wrong,
        }}>
          <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>⚠️</Text>
          <Text style={{ color: t.wrong, fontSize: f.h2, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
            {title}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: f.body * 1.6, textAlign: 'center', marginBottom: 20 }}>
            {message}
          </Text>
          <TouchableOpacity
            onPress={() => {
              hapticTap();
              onClose();
            }}
            style={{
              backgroundColor: t.wrong,
              borderRadius: 10,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: t.correctText, fontWeight: '700', textAlign: 'center', fontSize: f.body }}>
              {okLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
