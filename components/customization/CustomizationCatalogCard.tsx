import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import TapScale from '../TapScale';
import AvatarView from '../AvatarView';
import CustomAvatarBadge from '../CustomAvatarBadge';
import { useTheme } from '../ThemeContext';
import type { CustomizationCatalogItem } from '../../app/customization_catalog';

interface Props {
  item: CustomizationCatalogItem;
  selected: boolean;
  label: string;
  statusLabel: string;
  onPress: (id: string) => void;
}

export const CustomizationCatalogCard = React.memo(function CustomizationCatalogCard({
  item, selected, label, statusLabel, onPress,
}: Props) {
  const { theme: t } = useTheme();
  return (
    <TapScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}. ${statusLabel}`}
      onPress={() => onPress(item.id)}
      scaleTo={0.96}
      style={[
        styles.card,
        { backgroundColor: t.bgCard, borderColor: selected ? t.accent : t.border },
        selected && { shadowColor: t.accent, shadowOpacity: 0.24, shadowRadius: 12, elevation: 4 },
      ]}
    >
      <View style={styles.preview}>
        {item.kind === 'custom-avatar'
          ? <CustomAvatarBadge value={item.previewValue} size={72} />
          : <AvatarView avatar={item.previewAvatar} auraId={item.kind === 'aura' ? item.auraId : null} size={66} animateAura={false} />}
      </View>
      <Text style={[styles.label, { color: t.textPrimary }]}>{label}</Text>
      <Text style={[styles.status, { color: selected ? t.accent : t.textMuted }]}>{statusLabel}</Text>
    </TapScale>
  );
});

const styles = StyleSheet.create({
  card: { flex: 1, height: 166, borderRadius: 18, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 12, alignItems: 'center' },
  preview: { height: 76, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 5, minHeight: 30, fontSize: 12, lineHeight: 15, fontWeight: '800', textAlign: 'center' },
  status: { marginTop: 3, minHeight: 26, fontSize: 10, lineHeight: 13, fontWeight: '700', textAlign: 'center' },
});
