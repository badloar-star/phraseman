import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import HybridSheetShell from '../../modal_fx/HybridSheetShell';
import PressableHybrid from '../../PressableHybrid';
import type { DialogueGlass } from './DialogueGlassKit';
import { nestedBoxShadow } from '../../v2/ShadowSurface';

// зачем (владелец 2026-09-30, макет dialogs.html, шторка «Диалог» за кнопкой «⋯»):
// «Завершить» переехал из шапки в шторку, как в макете, — заголовок сцены в шапке больше
// не обрезается. Завершение — то же действие, что и раньше.
// зачем (координатор 28.10, слово владельца: «Пожаловаться везде, где её нет — Диалоги во время диалога»): пункт «Сообщить об ошибке» из макета теперь рисуется, когда экран поставляет жалобу
// (onReport) — открывает форму тем же ContentReportFlag; без onReport пункта нет (мёртвых пунктов не показываем).

export interface DialogueGlassMenuSheetProps {
  glass: DialogueGlass;
  visible: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  completeLabel: string;
  completeDisabled: boolean;
  onComplete: () => void;
  /** Пункт «Задания» (шторка со списком заданий сцены); без обоих пропсов не рисуется. */
  tasksLabel?: string;
  onOpenTasks?: () => void;
  /** Пункт «Сообщить об ошибке» (жалоба на диалог целиком); без обоих пропсов не рисуется. */
  reportLabel?: string;
  onReport?: () => void;
}

export function DialogueGlassMenuSheet({
  glass, visible, onClose, title, closeLabel, completeLabel, completeDisabled, onComplete,
  tasksLabel, onOpenTasks, reportLabel, onReport,
}: DialogueGlassMenuSheetProps) {
  // зачем: переход к итогу / открытие «Заданий» — только когда нативная шторка реально
  // закрылась (onDismissed), иначе две модалки наложатся друг на друга.
  const pendingRef = React.useRef<'complete' | 'tasks' | 'report' | null>(null);
  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      onDismissed={() => {
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending === 'complete') onComplete();
        else if (pending === 'tasks') onOpenTasks?.();
        else if (pending === 'report') onReport?.(); // зачем: форма жалобы — своя модалка, открываем её только когда шторка реально закрылась
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
          {tasksLabel && onOpenTasks ? (
            <PressableHybrid
              testID="dialogue-v2-session-menu-tasks"
              variant="secondary"
              withSound={false}
              accessibilityRole="button"
              accessibilityLabel={tasksLabel}
              onPress={() => {
                pendingRef.current = 'tasks';
                requestDismiss();
              }}
              contentStyle={styles.item}
            >
              <View style={[styles.tile, { backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }]}>
                <Ionicons name="list-outline" size={20} color={glass.text} />
              </View>
              <Text maxFontSizeMultiplier={1.3} style={[styles.itemText, { color: glass.text }]}>{tasksLabel}</Text>
              <Ionicons name="chevron-forward" size={20} color={glass.secondary} />
            </PressableHybrid>
          ) : null}
          {/* зачем (R1_DIFF_ONE_FIX, dialogs-gap-015, образец dialogs.html): между пунктами меню тонкий разделитель */}
          {tasksLabel && onOpenTasks ? <View testID="dialogue-v2-session-menu-divider" style={[styles.divider, { backgroundColor: glass.dividerTone }]} /> : null}
          <PressableHybrid
            testID="dialogue-v2-session-menu-complete"
            variant="secondary"
            withSound={false}
            disabled={completeDisabled}
            accessibilityRole="button"
            accessibilityLabel={completeLabel}
            accessibilityState={{ disabled: completeDisabled }}
            onPress={() => {
              pendingRef.current = 'complete';
              requestDismiss();
            }}
            contentStyle={[styles.item, { opacity: completeDisabled ? 0.55 : 1 }]}
          >
            <View style={[styles.tile, { backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }]}>
              <Ionicons name="close" size={20} color={glass.text} />
            </View>
            <Text maxFontSizeMultiplier={1.3} style={[styles.itemText, { color: glass.text }]}>{completeLabel}</Text>
            <Ionicons name="chevron-forward" size={20} color={glass.secondary} />
          </PressableHybrid>
          {reportLabel && onReport ? (
            <>
              <View testID="dialogue-v2-session-menu-report-divider" style={[styles.divider, { backgroundColor: glass.dividerTone }]} />
              <PressableHybrid
                testID="dialogue-v2-session-menu-report"
                variant="secondary"
                withSound={false}
                accessibilityRole="button"
                accessibilityLabel={reportLabel}
                onPress={() => {
                  pendingRef.current = 'report';
                  requestDismiss();
                }}
                contentStyle={styles.item}
              >
                <View style={[styles.tile, { backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }]}>
                  <Ionicons name="flag-outline" size={20} color={glass.text} />
                </View>
                <Text maxFontSizeMultiplier={1.3} style={[styles.itemText, { color: glass.text }]}>{reportLabel}</Text>
                <Ionicons name="chevron-forward" size={20} color={glass.secondary} />
              </PressableHybrid>
            </>
          ) : null}
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
  divider: { height: StyleSheet.hairlineWidth, marginTop: 14, marginHorizontal: 4 },
  itemText: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '700' },
});
