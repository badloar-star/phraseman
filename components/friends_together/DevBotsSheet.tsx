// «Вместе» — DEV-панель ботов (только __DEV__): сквозная проверка всех сценариев
// фичи без реальных друзей и без единого чтения/записи Firestore.
// зачем: владелец попросил кнопку в разделе Друзья, которая заводит ботов и
// умеет прогонять их через все состояния — рост дружбы, каждый порог сундука,
// входящий зов, готовый подарок — руками, за секунды. Каркас — HybridSheetShell
// (тот же паттерн шторки, что и остальные шиты «Вместе»/«Награда за друга»).
import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
import type { DevBotFriend } from '../../app/friends_together/dev_bots';

export interface DevBotsSheetProps {
  visible: boolean;
  onClose: () => void;
  bots: DevBotFriend[];
  onAddBots: (count: number) => void;
  onAdvanceAll: () => void;
  onAdvanceOne: (uid: string) => void;
  onChestTier: (tier: 0 | 1 | 2 | 3) => void;
  onIncomingNudge: (uid: string) => void;
  onGiftReady: (uid: string) => void;
  onResetChest: () => void;
  onReset: () => void;
}

function Row({ label, icon, onPress, tone = 'default', testID }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; tone?: 'default' | 'danger'; testID?: string }) {
  const { theme: t, f, ds } = useTheme();
  const color = tone === 'danger' ? t.wrong : t.accent;
  return (
    <TapScale testID={testID} onPress={onPress} style={[styles.row, { backgroundColor: t.bgSurface }]} accessibilityLabel={label}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={{ color: t.textPrimary, fontSize: f.body ?? 14, fontFamily: ds.fontFamily, fontWeight: '700', flex: 1 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={t.textGhost} />
    </TapScale>
  );
}

function DevBotsSheet({
  visible, onClose, bots, onAddBots, onAdvanceAll, onAdvanceOne, onChestTier, onIncomingNudge, onGiftReady, onResetChest, onReset,
}: DevBotsSheetProps) {
  const { theme: t, f, ds } = useTheme();

  return (
    <HybridSheetShell visible={visible} onClose={onClose} closeLabel="Закрыть" testID="friends-together-dev-sheet">
      <View style={styles.header}>
        <Text style={{ color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily, fontWeight: '700', flex: 1 }}>
          DEV: боты «Вместе»
        </Text>
        <TapScale onPress={onClose} style={[styles.closeBtn, { backgroundColor: t.bgSurface2 }]} accessibilityLabel="Закрыть">
          <Ionicons name="close" size={20} color={t.textMuted} />
        </TapScale>
      </View>
      {/* зачем: инструмент только для __DEV__ (никогда не виден пользователю, как
          'DEV +1' в app/referrals.tsx) — намеренно на английском, без triLang. */}
      <ScrollView decelerationRate="fast" showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
        <Text style={[styles.eyebrow, { color: t.textSecond, fontFamily: ds.fontFamily }]}>Bots</Text>
        <Row testID="dev-bots-add-3" label="Add 3 bots (different levels)" icon="person-add-outline" onPress={() => onAddBots(3)} />
        <Row testID="dev-bots-advance-all" label="All bots did today's lesson" icon="checkmark-done-outline" onPress={onAdvanceAll} />
        <Row testID="dev-bots-reset" label="Reset all bots" icon="trash-outline" tone="danger" onPress={onReset} />

        <Text style={[styles.eyebrow, { color: t.textSecond, fontFamily: ds.fontFamily, marginTop: 16 }]}>Weekly chest</Text>
        <Row testID="dev-bots-chest-1" label="Force tier I (6,000)" icon="gift-outline" onPress={() => onChestTier(1)} />
        <Row testID="dev-bots-chest-2" label="Force tier II (12,000)" icon="gift-outline" onPress={() => onChestTier(2)} />
        <Row testID="dev-bots-chest-3" label="Force tier III (20,000)" icon="gift-outline" onPress={() => onChestTier(3)} />
        <Row testID="dev-bots-chest-reset" label="Сбросить сундук" icon="refresh-outline" onPress={onResetChest} />
        <Row testID="dev-bots-chest-clear" label="Clear chest progress" icon="close-circle-outline" onPress={() => onChestTier(0)} />

        {bots.length > 0 && (
          <>
            <Text style={[styles.eyebrow, { color: t.textSecond, fontFamily: ds.fontFamily, marginTop: 16 }]}>Per bot</Text>
            {bots.map((b) => (
              <View key={b.uid} testID={`dev-bot-card-${b.uid}`} style={[styles.botCard, { backgroundColor: t.bgSurface }]}>
                <Text style={{ color: t.textPrimary, fontSize: f.body ?? 14, fontFamily: ds.fontFamily, fontWeight: '700' }}>
                  {b.name} · {b.days}d · {b.weeklyXp} XP
                </Text>
                <View style={styles.statuses}>
                  {b.learnedToday && <Text testID={`dev-bot-today-${b.uid}`} style={[styles.status, { color: t.correct, backgroundColor: t.correctBg }]}>Today</Text>}
                  {b.incomingNudge && <Text testID={`dev-bot-incoming-${b.uid}`} style={[styles.status, { color: t.gold, backgroundColor: t.goldBg }]}>Incoming nudge</Text>}
                  {b.giftReady && <Text testID={`dev-bot-gift-${b.uid}`} style={[styles.status, { color: t.correct, backgroundColor: t.correctBg }]}>Gift ready</Text>}
                </View>
                <View style={styles.botActs}>
                  <TapScale onPress={() => onAdvanceOne(b.uid)} style={[styles.chip, { backgroundColor: t.accentBg }]} accessibilityLabel={`${b.name}: +1 day`}>
                    <Text style={{ color: t.accent, fontSize: f.caption ?? 12, fontFamily: ds.fontFamily, fontWeight: '700' }}>+1 day</Text>
                  </TapScale>
                  <TapScale onPress={() => onIncomingNudge(b.uid)} style={[styles.chip, { backgroundColor: t.goldBg }]} accessibilityLabel={`${b.name}: nudges me`}>
                    <Text style={{ color: t.gold, fontSize: f.caption ?? 12, fontFamily: ds.fontFamily, fontWeight: '700' }}>Nudges me</Text>
                  </TapScale>
                  <TapScale onPress={() => onGiftReady(b.uid)} style={[styles.chip, { backgroundColor: t.correctBg }]} accessibilityLabel={`${b.name}: gift ready`}>
                    <Text style={{ color: t.correct, fontSize: f.caption ?? 12, fontFamily: ds.fontFamily, fontWeight: '700' }}>Gift ready</Text>
                  </TapScale>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </HybridSheetShell>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2, marginBottom: 12 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderRadius: 14, paddingHorizontal: 14, marginBottom: 8 },
  botCard: { borderRadius: 14, padding: 12, marginBottom: 8 },
  statuses: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  status: { minHeight: 24, paddingHorizontal: 8, borderRadius: 8, textAlignVertical: 'center', fontSize: 11, fontWeight: '700' },
  botActs: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chip: { height: 30, paddingHorizontal: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});

export default memo(DevBotsSheet);
