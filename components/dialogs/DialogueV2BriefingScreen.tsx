import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { coinRankRowForDisplay } from '../../app/coin_rank_table_v1';
import {
  DialogueGlassBackButton,
  DialogueGlassCta,
  dialogueGlassCardStyle,
  useDialogueGlass,
} from './glass/DialogueGlassKit';

// зачем (владелец 2026-09-30): брифинг «1 в 1» по макету dialogs.html B1/B2 (Liquid Glass):
// медальон сцены 88, бейдж уровня, крупное название, карточка брифинга, карточка «Задания»
// с номерами в кругах, участники (реальные данные V2) и закреплённая кнопка «Начать диалог →».
// Закрытый по рангу: погашенная кнопка с замком «Откроется на ранге N» и под ней реальный
// ранг человека с монетой. Цен и состояний подписки здесь нет по контракту.

export type DialogueV2BriefingObjective = Readonly<{ id: string; label: string }>;
export type DialogueV2BriefingParticipant = Readonly<{
  id: string;
  displayName: string;
  styleNote: string;
}>;

export type DialogueV2BriefingScreenProps = Readonly<{
  title: string;
  cefr: string;
  briefing: string;
  objectives: readonly DialogueV2BriefingObjective[];
  participants: readonly DialogueV2BriefingParticipant[];
  rankRequired: number;
  /** The local rank gate decides this before render; no account entitlement is consulted. */
  unlocked: boolean;
  /** Реальный ранг монеты человека; null — ещё не известен, строку «Сейчас ранг» не рисуем. */
  currentRank: number | null;
  labels: Readonly<{
    back: string;
    tasks: string;
    participants: string;
    start: string;
    locked: (rankRequired: number) => string;
    currentRank: (rank: number) => string;
  }>;
  onBack: () => void;
  onStart: () => void;
}>;

/**
 * Design 2.0 briefing for a server-authorized V2 chat packet. It receives
 * only learner copy and the local rank result: prices and account-entitlement state
 * intentionally have no representation in this surface.
 */
export function DialogueV2BriefingScreen({
  title,
  cefr,
  briefing,
  objectives,
  participants,
  rankRequired,
  unlocked,
  currentRank,
  labels,
  onBack,
  onStart,
}: DialogueV2BriefingScreenProps) {
  const glass = useDialogueGlass();
  const startLabel = unlocked ? labels.start : labels.locked(rankRequired);
  const card = dialogueGlassCardStyle(glass);

  return (
    <View style={[styles.fill, { backgroundColor: glass.bg }]} testID="dialogue-v2-briefing-screen">
      <SafeAreaView edges={['top']} style={styles.fill}>
        <View style={styles.top}>
          <DialogueGlassBackButton glass={glass} onPress={onBack} accessibilityLabel={labels.back} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View testID="dialogue-v2-briefing-scene" style={styles.hero}>
            <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: glass.opaqueControl, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chatbubbles-outline" size={40} color={glass.text} />
            </View>
            <View style={[styles.level, { backgroundColor: glass.opaqueControl }]}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.levelText, { color: glass.text }]}>{cefr}</Text>
            </View>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[styles.title, { color: glass.text }]}>{title}</Text>
          </View>

          <View style={[card, styles.briefCard]}>
            <Text maxFontSizeMultiplier={1.4} style={[styles.briefText, { color: glass.text }]}>{briefing}</Text>
          </View>

          <View testID="dialogue-v2-briefing-tasks" style={[card, styles.listCard]}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.kicker, { color: glass.secondary }]}>{labels.tasks}</Text>
            {objectives.map((objective, index) => (
              <View
                key={objective.id}
                style={[styles.obj, index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: glass.line } : null]}
              >
                <View style={[styles.num, { backgroundColor: glass.opaqueControl }]}>
                  <Text maxFontSizeMultiplier={1.2} style={[styles.numText, { color: glass.secondary }]}>{index + 1}</Text>
                </View>
                <Text maxFontSizeMultiplier={1.4} style={[styles.objText, { color: glass.text }]}>{objective.label}</Text>
              </View>
            ))}
          </View>

          {participants.length > 0 ? (
            <View style={[card, styles.listCard]}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.kicker, { color: glass.secondary }]}>{labels.participants}</Text>
              {participants.map((participant, index) => (
                <View
                  key={participant.id}
                  style={[styles.obj, index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: glass.line } : null]}
                >
                  <View style={[styles.avatar, { backgroundColor: glass.opaqueControl }]}>
                    <Ionicons name="person-outline" size={18} color={glass.secondary} />
                  </View>
                  <View style={styles.fillRow}>
                    <Text maxFontSizeMultiplier={1.4} style={[styles.objText, { color: glass.text, fontWeight: '600' }]}>{participant.displayName}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.note, { color: glass.secondary }]}>{participant.styleNote}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
      <SafeAreaView edges={['bottom']} style={[styles.dock, { backgroundColor: glass.bg }]}>
        <DialogueGlassCta
          glass={glass}
          testID="dialogue-v2-briefing-start"
          label={startLabel}
          onPress={onStart}
          disabled={!unlocked}
          trailingArrow={unlocked}
          icon={unlocked ? undefined : 'lock-closed'}
        />
        {!unlocked && currentRank != null ? (
          <View style={styles.rankNow} accessible accessibilityLabel={labels.currentRank(currentRank)}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.rankNowText, { color: glass.secondary }]}>{labels.currentRank(currentRank)}</Text>
            <Image source={coinRankRowForDisplay(currentRank).source} style={styles.rankCoin} accessible={false} />
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  fillRow: { flex: 1, minWidth: 0 },
  top: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row' },
  scroll: { paddingHorizontal: 16, paddingBottom: 28 },
  hero: { alignItems: 'center', marginTop: 18 },
  level: { marginTop: 14, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 4 },
  levelText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  title: { marginTop: 10, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  briefCard: { marginTop: 22, padding: 18 },
  briefText: { fontSize: 16, lineHeight: 22 },
  listCard: { marginTop: 13, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  kicker: { paddingTop: 12, paddingBottom: 4, fontSize: 13, lineHeight: 17, letterSpacing: 3, fontWeight: '700', textTransform: 'uppercase' },
  obj: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, minHeight: 48 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 13, lineHeight: 16, fontWeight: '700' },
  objText: { flex: 1, fontSize: 16, lineHeight: 22 },
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: 2, fontSize: 13, lineHeight: 18 },
  dock: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  rankNow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  rankNowText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  rankCoin: { width: 18, height: 18 },
});

export default DialogueV2BriefingScreen;
