import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import HybridSheetShell from '../../modal_fx/HybridSheetShell';
import PressableHybrid from '../../PressableHybrid';
import { DialogueGlassCta, type DialogueGlass } from './DialogueGlassKit';

// зачем (сверка dialogs-036, макет dialogs.html `exitSheet`): «Выйти из диалога?» — шторка снизу с ручкой и ✕, заголовок слева, пояснение вторичным,
// кнопки друг под другом во всю ширину: главная «Остаться», под ней приглушённая «Выйти». Раньше это было системное окно по центру,
// кнопки в ряд и главной была «Выйти». Только вид: тексты и действия те же (onStay / onLeave); выход срабатывает после закрытия шторки.

export interface DialogueGlassExitSheetProps {
  glass: DialogueGlass;
  visible: boolean;
  title: string;
  message: string;
  stayLabel: string;
  leaveLabel: string;
  onStay: () => void;
  onLeave: () => void;
  testIDPrefix?: string;
}

export function DialogueGlassExitSheet({
  glass, visible, title, message, stayLabel, leaveLabel, onStay, onLeave, testIDPrefix = 'dialogue-v2-session-exit',
}: DialogueGlassExitSheetProps) {
  // выход — только когда нативная шторка реально закрылась (иначе экран уходит под открытой модалкой)
  const leaveRef = React.useRef(false);
  return (
    <HybridSheetShell
      visible={visible}
      onClose={onStay}
      onDismissed={() => {
        if (leaveRef.current) {
          leaveRef.current = false;
          onLeave();
        }
      }}
      closeLabel={stayLabel}
      testID={testIDPrefix}
      material="liquid-glass-opaque"
    >
      {({ requestDismiss }) => (
        <View>
          <View style={styles.header}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[styles.title, { color: glass.text }]}>{title}</Text>
            <PressableHybrid
              variant="icon"
              withSound={false}
              onPress={requestDismiss}
              accessibilityRole="button"
              accessibilityLabel={stayLabel}
              style={styles.closeHit}
              contentStyle={[styles.closeBtn, { backgroundColor: glass.opaqueControl }]}
            >
              <Ionicons name="close" size={18} color={glass.secondary} />
            </PressableHybrid>
          </View>
          <Text maxFontSizeMultiplier={1.3} style={[styles.message, { color: glass.secondary }]}>{message}</Text>
          <DialogueGlassCta
            glass={glass}
            label={stayLabel}
            testID={`${testIDPrefix}-cancel`}
            onPress={requestDismiss}
            style={styles.stay}
          />
          <DialogueGlassCta
            glass={glass}
            ghost
            label={leaveLabel}
            testID={`${testIDPrefix}-confirm`}
            onPress={() => {
              leaveRef.current = true;
              requestDismiss();
            }}
            style={styles.leave}
          />
        </View>
      )}
    </HybridSheetShell>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  title: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  closeHit: { width: 44, height: 44 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  message: { marginTop: 12, paddingHorizontal: 4, fontSize: 16, lineHeight: 22 },
  stay: { marginTop: 24 },
  leave: { marginTop: 10 },
});
