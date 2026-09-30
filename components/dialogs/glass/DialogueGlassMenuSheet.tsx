import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import HybridSheetShell from '../../modal_fx/HybridSheetShell';
import PressableHybrid from '../../PressableHybrid';
import type { DialogueGlass } from './DialogueGlassKit';

// зачем (владелец 2026-09-30, макет dialogs.html, шторка «Диалог» за кнопкой «⋯»):
// «Завершить» переехал из шапки в шторку, как в макете, — заголовок сцены в шапке больше
// не обрезается. Пункт «Сообщить об ошибке» из макета НЕ рисуется: V2-маршрут не поставляет
// жалобу, а мёртвых пунктов не показываем. Завершение — то же действие, что и раньше.

export interface DialogueGlassMenuSheetProps {
  glass: DialogueGlass;
  visible: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  completeLabel: string;
  completeDisabled: boolean;
  onComplete: () => void;
}

export function DialogueGlassMenuSheet({
  glass, visible, onClose, title, closeLabel, completeLabel, completeDisabled, onComplete,
}: DialogueGlassMenuSheetProps) {
  // зачем: переход к итогу — только когда нативная шторка реально закрылась (onDismissed),
  // иначе модалка может остаться висеть поверх нового экрана.
  const completeRequestedRef = React.useRef(false);
  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      onDismissed={() => {
        if (!completeRequestedRef.current) return;
        completeRequestedRef.current = false;
        onComplete();
      }}
      closeLabel={closeLabel}
      testID="dialogue-v2-session-menu"
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
              accessibilityLabel={closeLabel}
              style={styles.closeHit}
              contentStyle={[styles.closeBtn, { backgroundColor: glass.opaqueControl }]}
            >
              <Ionicons name="close" size={18} color={glass.secondary} />
            </PressableHybrid>
          </View>
          <PressableHybrid
            testID="dialogue-v2-session-menu-complete"
            variant="secondary"
            withSound={false}
            disabled={completeDisabled}
            accessibilityRole="button"
            accessibilityLabel={completeLabel}
            accessibilityState={{ disabled: completeDisabled }}
            onPress={() => {
              completeRequestedRef.current = true;
              requestDismiss();
            }}
            contentStyle={[styles.item, { opacity: completeDisabled ? 0.55 : 1 }]}
          >
            <View style={[styles.tile, { backgroundColor: glass.opaqueControl }]}>
              <Ionicons name="close" size={20} color={glass.text} />
            </View>
            <Text maxFontSizeMultiplier={1.3} style={[styles.itemText, { color: glass.text }]}>{completeLabel}</Text>
            <Ionicons name="chevron-forward" size={20} color={glass.secondary} />
          </PressableHybrid>
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
  item: { marginTop: 14, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 4, paddingVertical: 8 },
  tile: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '600' },
});
