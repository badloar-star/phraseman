// зачем: владелец: «замени v2 в уроках на раздел со ВСЕМИ режимами, чтобы протестировать
// каждый». Лаборатория показывает: (1) живой юнит E1 — 12 сессий из настоящего
// компилятора, (2) все 17 семей режимов по четырём группам; тап — интерактивное демо.
// Экран монтируется только на странице V2 (ENABLE_DEV_TOOLS) и не трогает сеть вообще.
import React, { memo, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
import { LAB_GROUPS, LAB_MODE_CATALOG, type LabModeEntry } from './mode_catalog';
import { getDemoUnit } from './demo_content';
// зачем: владелец забраковал первую версию режимов («написана из головы») — теперь
// открываются ПОРТИРОВАННЫЕ поверхности Kimi V5 вместо старого ModeDemoPlayer.
import { KimiSurfacePlayer } from './kimi/KimiSurfacePlayer';
import { kimiSurfaceFor } from './kimi/registry';

interface LearningV2ModesLabProps {
  readonly bottomPadding?: number;
}

const ZONE_LABEL: Record<'understand' | 'use' | 'master', string> = {
  understand: 'Понять',
  use: 'Применить',
  master: 'Освоить',
};

const LearningV2ModesLab = memo(function LearningV2ModesLab({ bottomPadding = 0 }: LearningV2ModesLabProps) {
  const { theme: t, f, ds } = useTheme();
  const [openMode, setOpenMode] = useState<LabModeEntry | null>(null);
  // Синхронная гидратация первого кадра: чистый компилятор, ~10 фраз — без спиннеров.
  const unit = useMemo(() => getDemoUnit(), []);

  if (openMode) {
    // Все живые семьи покрыты реестром; describe_scene снят и не открывается
    // (тап по нему заблокирован в списке, поэтому сюда он не доходит).
    const surface = kimiSurfaceFor(openMode.family);
    if (surface) {
      return <KimiSurfacePlayer entry={surface} title={openMode.title} onClose={() => setOpenMode(null)} />;
    }
  }

  const zoneTone = (zone: 'understand' | 'use' | 'master'): string =>
    zone === 'understand' ? t.accent : zone === 'use' ? t.gold : t.correct;

  return (
    <ScrollView
      // guard-ok: фиксированные маленькие списки (12 чипов + 17 строк), виртуализация дороже
      style={{ backgroundColor: t.bgPrimary }}
      contentContainerStyle={[styles.body, { paddingBottom: bottomPadding + 32 }]}
      showsVerticalScrollIndicator={false}
      testID="v2-modes-lab"
    >
      <Text style={[styles.heading, { color: t.textPrimary, fontSize: f.h2 }]}>Learning V2 — режимы</Text>

      <View style={[styles.unitCard, { backgroundColor: t.bgCard, borderRadius: ds.radius.xl }, ds.shadow.soft]}>
        <Text style={[styles.unitTitle, { color: t.textPrimary, fontSize: f.h3 }]}>Юнит E1 · 12 сессий</Text>
        {/* guard-ok: ровно 12 чипов, размер фиксирован контрактом session-set */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessionRow}>
          {unit.sessions.map((session) => (
            <View
              key={session.sessionId}
              style={[styles.sessionChip, { backgroundColor: t.bgSurface, borderRadius: ds.radius.md }]}
              testID={`v2-lab-session-${session.ordinal}`}
            >
              <Text style={[styles.sessionOrdinal, { color: zoneTone(session.zone), fontSize: f.h3 }]}>{session.ordinal}</Text>
              <Text style={[styles.sessionZone, { color: t.textMuted }]}>{ZONE_LABEL[session.zone]}</Text>
              <Text style={[styles.sessionCards, { color: t.textSecond }]}>{session.cards.length} карт</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {LAB_GROUPS.map((group) => (
        <View key={group.id} style={styles.groupBlock}>
          <Text style={[styles.groupTitle, { color: t.textSecond, fontSize: f.body }]}>{group.title}</Text>
          <View style={[styles.groupCard, { backgroundColor: t.bgCard, borderRadius: ds.radius.xl }, ds.shadow.soft]}>
            {LAB_MODE_CATALOG.filter((mode) => mode.group === group.id).map((mode, index, list) => (
              <TapScale
                key={mode.family}
                onPress={() => { if (!mode.removedByOwner) setOpenMode(mode); }}
                disabled={Boolean(mode.removedByOwner)}
                scaleTo={0.97}
                accessibilityLabel={mode.title}
                testID={`v2-lab-mode-${mode.family}`}
              >
                <View style={[
                  styles.modeRow,
                  index < list.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.borderLight } : null,
                ]}>
                  <View style={[styles.modeIcon, { backgroundColor: t.bgSurface }]}>
                    <Ionicons name={mode.icon} size={19} color={mode.removedByOwner ? t.textMuted : zoneToneForGroup(group.id, t)} />
                  </View>
                  {/* зачем: без numberOfLines — название переносится, не режется (запрет обрезания текста) */}
                  <Text
                    style={[styles.modeTitle, { color: mode.removedByOwner ? t.textMuted : t.textPrimary, fontSize: f.body }]}
                  >
                    {mode.title}
                  </Text>
                  {mode.removedByOwner ? (
                    <View style={[styles.removedChip, { backgroundColor: t.bgSurface2 }]}>
                      <Text style={[styles.removedChipText, { color: t.textMuted }]}>СНЯТ</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={17} color={t.textMuted} />
                  )}
                </View>
              </TapScale>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
});

// зачем: тон группы = тон зоны, где семья чаще всего живёт в юните — карта и лаборатория
// говорят на одном цветовом языке.
function zoneToneForGroup(group: string, t: { accent: string; gold: string; correct: string }): string {
  return group === 'understand' ? t.accent : group === 'sound' ? t.gold : group === 'build' ? t.correct : t.accent;
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 12, gap: 18 },
  heading: { fontWeight: '900' },
  unitCard: { padding: 18, gap: 12 },
  unitTitle: { fontWeight: '800' },
  sessionRow: { gap: 8 },
  sessionChip: { width: 74, paddingVertical: 10, alignItems: 'center', gap: 2 },
  sessionOrdinal: { fontWeight: '900' },
  sessionZone: { fontSize: 11, fontWeight: '700' },
  sessionCards: { fontSize: 11, fontWeight: '600' },
  groupBlock: { gap: 8 },
  groupTitle: { fontWeight: '800' },
  groupCard: { paddingHorizontal: 6 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 10 },
  modeIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  modeTitle: { flex: 1, fontWeight: '700' },
  removedChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  removedChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});

export default LearningV2ModesLab;
