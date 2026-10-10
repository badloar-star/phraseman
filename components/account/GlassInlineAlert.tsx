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
// зачем (Сверка overlays-runtime 002–005, 05.10): сама карточка — общая GlassAlertCard (`.or-alert`:
// поля 24, r25, кромка, заголовок 23/29, кнопка 44 с глянцем), затемнение .62 как `.or-dim`.
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlassAlertCard } from '../v2/GlassAlertDialog';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  okLabel?: string;
  onClose: () => void;
};

function GlassInlineAlert({ visible, title, message, okLabel = 'OK', onClose }: Props) {
  if (!visible) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.scrim]} accessibilityViewIsModal testID="glass-inline-alert">
      <View style={styles.wrap}>
        <GlassAlertCard key={`${title}:${message ?? ''}`}title={title} message={message} actions={[{ label: okLabel, onPress: onClose }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.62)' }, // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
  wrap: { width: '100%', maxWidth: 360 },
});

export default memo(GlassInlineAlert);
