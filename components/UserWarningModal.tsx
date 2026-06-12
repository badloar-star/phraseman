import React, { memo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { hapticTap, hapticWarning } from '../hooks/use-haptics';
import type { Lang } from '../constants/i18n';
import CompassDepthSurface from './CompassDepthSurface';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';

interface Props {
  visible: boolean;
  message: string;
  lang: Lang;
  onClose: () => void;
}

function UserWarningModal({ visible, message, lang, onClose }: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const isCompassTheme = false;
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
          backgroundColor: 'rgba(0,0,0,0.60)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <View style={{
          backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
          borderRadius: isCompassTheme ? 14 : 16,
          padding: 24,
          width: '100%',
          maxWidth: 340,
          borderWidth: 1,
          borderColor: isCompassTheme ? COMPASS_RICH.copper : t.wrong,
          overflow: 'hidden',
          ...(isCompassTheme ? compassShadow(3) : null),
        }}>
          {isCompassTheme && <CompassDepthSurface radius={14} selected />}
          <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>⚠️</Text>
          <Text style={{ color: isCompassTheme ? COMPASS_RICH.peach : t.wrong, fontSize: f.h2, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
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
              backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : t.wrong,
              borderRadius: isCompassTheme ? 9 : 10,
              paddingVertical: 12,
              borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0,
              borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent',
              overflow: isCompassTheme ? 'hidden' : 'visible',
              ...(isCompassTheme ? compassShadow(1) : null),
            }}
          >
            {isCompassTheme && <CompassDepthSurface radius={9} cream />}
            <Text style={{ color: isCompassTheme ? COMPASS_RICH.textDark : t.correctText, fontWeight: '700', textAlign: 'center', fontSize: f.body }}>
              {okLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default memo(UserWarningModal);
