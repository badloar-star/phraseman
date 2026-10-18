/**
 * DialogGoalsSheet — список ВСЕХ заданий диалога.
 *
 * зачем (владелец 2026-09-17): «цели должно быть нажимабельным и открывать
 * модал лист и показывать какие цели все». Раньше строка целей в шапке была
 * мёртвой (`accessibilityRole="text"`) и показывала ТОЛЬКО текущую цель —
 * человек не видел, сколько всего осталось и что именно.
 *
 * Liquid Glass 2.0 (владелец 2026-09-29, макет dialogs.html C6): каркас —
 * общая HybridSheetShell (непрозрачная стеклянная основа, жест закрытия,
 * safe area), цвета — токены активной из 13 тем. Строка задания: номер или
 * галочка в круге, текст, справа «Выполнено» / «Ещё не выполнено»; внизу
 * кнопка «Закрыть».
 *
 * Данные локальные (objectives сценария + множество выполненных) — ни сети,
 * ни спиннера: список открывается мгновенно.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RowDivider } from '../v2/RowDivider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import PressableHybrid from '../PressableHybrid';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';
import type { DialogObjective } from '../../app/ai_dialog_scenarios';
import { formatDialogObjectiveLabel } from './dialog_objective_label';
import { dialogueCtaPaint } from './glass/dialogue_cta_paint';

interface DialogGoalsSheetProps {
  visible: boolean;
  onClose: () => void;
  lang: Lang;
  /** Все задания сценария по порядку разговора. */
  objectives: readonly DialogObjective[];
  /** id уже закрытых заданий. */
  objectivesMet: ReadonlySet<string>;
  /**
   * зачем (владелец 2026-09-30, V2-сессия): в V2 сервер не сообщает, какие задания закрыты,
   * поэтому там список показывается БЕЗ статусов и счётчика (`false`) — «не выдумывать данные».
   * Старая сессия ничего не передаёт, поведение прежнее.
   */
  showStatus?: boolean;
  testID?: string;
}

export default function DialogGoalsSheet({
  visible,
  onClose,
  lang,
  objectives,
  objectivesMet,
  showStatus = true,
  testID,
}: DialogGoalsSheetProps) {
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  // зачем (Ревизор 18.10, правило «кнопки нигде не сливаются»): сырой accent на opaqueSheet в 10 светлых градиентных темах давал 1,3–1,8:1
  const cta = dialogueCtaPaint(glass, [glass.opaqueSheet]);

  const closeLabel = triLang(lang, {
    ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
    vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
  });
  const doneLabel = triLang(lang, {
    ru: 'Выполнено', uk: 'Виконано', en: 'Done', es: 'Hecho', 'pt-BR': 'Concluído',
    vi: 'Xong', id: 'Selesai', tr: 'Tamamlandı', pl: 'Ukończono',
  });
  const notDoneLabel = triLang(lang, {
    ru: 'Ещё не выполнено', uk: 'Ще не виконано', en: 'Not done yet', es: 'Aún no',
    'pt-BR': 'Ainda não', vi: 'Chưa xong', id: 'Belum', tr: 'Henüz değil', pl: 'Jeszcze nie',
  });

  const doneCount = objectives.filter((o) => objectivesMet.has(o.id)).length;

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      closeLabel={closeLabel}
      testID={testID}
      material="liquid-glass-opaque"
    >
      {({ requestDismiss }) => (
        <View style={styles.body}>
          <View style={styles.header}>
            <Text
              accessibilityRole="header"
              style={{ color: glass.text, fontSize: f.h2, fontWeight: '700', flex: 1 }}
              maxFontSizeMultiplier={1.2}
            >
              {triLang(lang, {
                ru: 'Задания', uk: 'Завдання', en: 'Goals', es: 'Objetivos',
                'pt-BR': 'Objetivos', vi: 'Nhiệm vụ', id: 'Tugas', tr: 'Görevler', pl: 'Zadania',
              })}
            </Text>
            <PressableHybrid
              variant="icon"
              onPress={requestDismiss}
              accessibilityLabel={closeLabel}
              style={styles.closeHit}
              contentStyle={[styles.closeBtn, { backgroundColor: glass.opaqueControl }]}
            >
              <Ionicons name="close" size={20} color={glass.secondary} />
            </PressableHybrid>
          </View>

          {/* Счётчик: сколько закрыто из скольких. */}
          {showStatus ? (
            <Text
              style={{ color: glass.secondary, fontSize: f.body, fontWeight: '700', marginBottom: 8 }}
              maxFontSizeMultiplier={1.2}
            >
              {`${doneCount} / ${objectives.length}`}
            </Text>
          ) : null}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false} decelerationRate="fast"
          >
            {/* guard-ok: заданий 4–7 по контракту (ai_dialog_objectives_contract),
                FlatList на семи строках дороже, чем сам список. */}
            {objectives.map((objective, index) => {
              const done = showStatus && objectivesMet.has(objective.id);
              const status = done ? doneLabel : notDoneLabel;
              return (
                <View
                  key={objective.id}
                  style={styles.row}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={showStatus ? `${formatDialogObjectiveLabel(objective.labelRu)}. ${status}` : formatDialogObjectiveLabel(objective.labelRu)}
                >
                  {index > 0 ? <RowDivider color={glass.line} /> : null}
                  <View style={[styles.badge, { backgroundColor: done ? glass.cta : glass.opaqueControl }]}>
                    {done ? (
                      <Ionicons name="checkmark" size={16} color={glass.ctaInk} />
                    ) : (
                      <Text style={{ color: glass.secondary, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <View style={styles.rowText}>
                    <Text
                      style={{
                        color: done ? glass.secondary : glass.text,
                        fontSize: f.body,
                        // зачем (сверка dialogs-019, макет `.obj`): задания обычным весом (`.obj` без жирности), выполненные — вторичным цветом; жирными они были «заголовком»
                        fontWeight: '400',
                        lineHeight: Math.round(f.body * 1.35),
                      }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {formatDialogObjectiveLabel(objective.labelRu)}
                    </Text>
                    {showStatus ? (
                      <Text style={{ color: glass.mutedText, fontSize: f.sub, marginTop: 2 }} maxFontSizeMultiplier={1.2}>
                        {status}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <PressableHybrid
            variant="primary"
            onPress={requestDismiss}
            accessibilityLabel={closeLabel}
            style={styles.ctaHit}
            contentStyle={[styles.cta, { backgroundColor: cta.fill }]}
          >
            <Text style={{ color: cta.ink, fontSize: f.bodyLg, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
              {closeLabel}
            </Text>
          </PressableHybrid>
        </View>
      )}
    </HybridSheetShell>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1, minHeight: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, marginBottom: 6 },
  closeHit: { alignSelf: 'auto', width: 44, height: 44 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexShrink: 1, flexGrow: 0 },
  scrollContent: { paddingBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingVertical: 11,
  },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  ctaHit: { marginTop: 18 },
  cta: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
