import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
import { hapticTap } from '../../hooks/use-haptics';
import type { CatalogFilter } from '../../app/customization_catalog';
import type { CustomizationAction, CustomizationTab } from '../../app/customization_draft';

type Segment<T extends string> = { id: T; label: string };

function Segmented<T extends string>({ items, value, onChange }: { items: Segment<T>[]; value: T; onChange: (value: T) => void }) {
  const { theme: t } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: t.bgSurface }]}>
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <TapScale key={item.id} onPress={() => onChange(item.id)} scaleTo={0.97} style={[styles.segment, selected && { backgroundColor: t.bgCard }]}
            accessibilityRole="button"
            accessibilityState={{ selected }} accessibilityLabel={item.label}>
            <Text style={{ color: selected ? t.textPrimary : t.textMuted, fontWeight: '800', fontSize: 14 }}>{item.label}</Text>
          </TapScale>
        );
      })}
    </View>
  );
}

export function CustomizationTabs({ value, onChange, avatarsLabel, aurasLabel }: {
  value: CustomizationTab; onChange: (value: CustomizationTab) => void; avatarsLabel: string; aurasLabel: string;
}) {
  return <Segmented items={[{ id: 'avatars', label: avatarsLabel }, { id: 'auras', label: aurasLabel }]} value={value} onChange={onChange} />;
}

export function OwnershipFilters({ value, onChange, allLabel, mineLabel }: {
  value: CatalogFilter; onChange: (value: CatalogFilter) => void; allLabel: string; mineLabel: string;
}) {
  return <Segmented items={[{ id: 'all', label: allLabel }, { id: 'mine', label: mineLabel }]} value={value} onChange={onChange} />;
}

export function CustomizationOverflowMenu({
  onOpenProfileCard, onResetLevelAvatar, profileCardLabel, levelAvatarLabel, showLevelAvatar,
}: {
  onOpenProfileCard: () => void; onResetLevelAvatar: () => void; profileCardLabel: string; levelAvatarLabel: string; showLevelAvatar: boolean;
}) {
  const { theme: t } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <TapScale onPress={() => setOpen(true)} style={[styles.menuButton, { backgroundColor: t.bgSurface }]} accessibilityRole="button" accessibilityLabel={profileCardLabel}>
        <Ionicons name="ellipsis-horizontal" size={22} color={t.textPrimary} />
      </TapScale>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.menu, { backgroundColor: t.bgCard }]}>
            <Pressable accessibilityRole="button" style={styles.menuRow} onPress={() => { setOpen(false); onOpenProfileCard(); }}>
              <Ionicons name="id-card-outline" size={20} color={t.textPrimary} />
              <Text style={[styles.menuText, { color: t.textPrimary }]}>{profileCardLabel}</Text>
            </Pressable>
            {showLevelAvatar ? (
              <Pressable accessibilityRole="button" style={styles.menuRow} onPress={() => { setOpen(false); onResetLevelAvatar(); }}>
                <Ionicons name="refresh-outline" size={20} color={t.textPrimary} />
                <Text style={[styles.menuText, { color: t.textPrimary }]}>{levelAvatarLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function CustomizationActionBar({ action, label, busy, onPress }: {
  action: CustomizationAction; label: string; busy: boolean; onPress: () => void;
}) {
  const { theme: t } = useTheme();
  const disabled = busy || action.kind === 'unchanged';
  return (
    <View style={[styles.actionShell, { backgroundColor: t.bgCard, borderColor: t.border }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
        onPressIn={() => { if (!disabled) hapticTap(); }}
        style={[styles.action, { backgroundColor: disabled ? t.bgSurface : t.accent }]}>
        <Text style={[styles.actionText, { color: disabled ? t.textMuted : t.correctText }]}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: 'row', borderRadius: 15, padding: 4, gap: 4 },
  segment: { minHeight: 44, flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  menuButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 84, paddingRight: 16 },
  menu: { width: 246, borderRadius: 18, padding: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, elevation: 8 },
  menuRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  menuText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  actionShell: { position: 'absolute', left: 12, right: 12, bottom: 8, borderRadius: 22, borderWidth: 1, padding: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, elevation: 10 },
  action: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  actionText: { fontSize: 16, lineHeight: 21, fontWeight: '900', textAlign: 'center' },
});
