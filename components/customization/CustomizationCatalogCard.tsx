import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../TapScale';
import AvatarView from '../AvatarView';
import CustomAvatarBadge from '../CustomAvatarBadge';
import { useTheme } from '../ThemeContext';
import { pearlIconForTheme } from '../../app/coin_icons';
import { LinearGradient } from '../SafeLinearGradient';
import type { CustomizationCatalogItem } from '../../app/customization_catalog';

/**
 * зачем: «Вернуть аватар уровня» переехал из скрытого меню-трёх-точек в первую плитку
 * каталога — выбор уровня работает так же, как выбор любого другого аватара.
 */
export type LevelAvatarTileItem = {
  kind: 'level-avatar';
  id: 'level-avatar';
  previewAvatar: string;
  isOwned: true;
  isActive: boolean;
  availability: { kind: 'owned' };
};

export type CatalogCardItem = CustomizationCatalogItem | LevelAvatarTileItem;

// At the approved 38% avatar-to-aura ratio this keeps the full generated art
// inside a three-column phone tile. Non-aura previews retain their old size.
const AURA_CATALOG_PREVIEW_SIZE = 48;

interface Props {
  item: CatalogCardItem;
  selected: boolean;
  label: string;
  statusLabel: string;
  onPress: (id: string) => void;
}

/**
 * зачем: владельцу не нравились «шумные» карточки — две строки текста и рамка на каждой.
 * Теперь плитка немая: только превью; имя показывает сцена, а цена/замок/награда — один
 * компактный чип. Тексты label/statusLabel остаются в accessibilityLabel для VoiceOver.
 */
function AvailabilityChip({ item, pearlIcon }: { item: CatalogCardItem; pearlIcon: ReturnType<typeof pearlIconForTheme> }) {
  const a = item.availability;
  if (a.kind === 'shards') {
    return (
      <View style={styles.chip}>
        <Image source={pearlIcon} style={styles.chipCoin} contentFit="contain" accessible={false} />
        <Text style={[styles.chipText, styles.chipPrice]}>{a.cost}</Text>
      </View>
    );
  }
  if (a.kind === 'level') {
    return (
      <View style={styles.chip}>
        <Ionicons name="lock-closed" size={10} color="#CFE2D4" />
        <Text style={[styles.chipText, styles.chipLevel]}>{a.level}</Text>
      </View>
    );
  }
  if (a.kind === 'reward') {
    return (
      <View style={styles.chip}>
        <Ionicons name="trophy" size={11} color="#FFD98A" />
      </View>
    );
  }
  if (a.kind === 'plus') {
    return (
      <View style={styles.chip}>
        <Ionicons name="sparkles" size={10} color="#FACC15" />
        <Text style={[styles.chipText, styles.chipPlus]}>Plus</Text>
      </View>
    );
  }
  return null;
}

export const CustomizationCatalogCard = React.memo(function CustomizationCatalogCard({
  item, selected, label, statusLabel, onPress,
}: Props) {
  const { theme: t, themeMode } = useTheme();
  const owned = item.isOwned && !selected && item.kind !== 'none-aura';
  return (
    <TapScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}. ${statusLabel}`}
      onPress={() => onPress(item.id)}
      scaleTo={0.96}
      style={[
        styles.ring,
        selected && { backgroundColor: t.accent, shadowColor: t.accent, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
      ]}
    >
      <LinearGradient colors={[t.bgSurface, t.bgCard]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.tile}>
        {item.kind === 'custom-avatar'
          ? <CustomAvatarBadge value={item.previewValue} size={68} />
              : <AvatarView
                  avatar={item.previewAvatar}
                  auraId={item.kind === 'aura' ? item.auraId : null}
                  size={item.kind === 'aura' ? AURA_CATALOG_PREVIEW_SIZE : 64}
                  animateAura={false}
                />}
        {!selected ? <AvailabilityChip item={item} pearlIcon={pearlIconForTheme(themeMode)} /> : null}
        {selected ? (
          <View style={[styles.mark, { backgroundColor: t.accent }]}>
            <Ionicons name="checkmark" size={12} color={t.correctText} />
          </View>
        ) : owned ? (
          <View style={[styles.mark, styles.markOwned, { backgroundColor: t.bgSurface2 }]}>
            <Ionicons name="checkmark" size={10} color={t.textMuted} />
          </View>
        ) : null}
      </LinearGradient>
    </TapScale>
  );
});

const styles = StyleSheet.create({
  // зачем: «кольцо выбора» — это подложка с отступом, а не borderWidth (запрет владельца
  // на обводки); отступ одинаков в обоих состояниях, чтобы выбор не сдвигал сетку.
  ring: { borderRadius: 22, padding: 2.5 },
  tile: {
    aspectRatio: 1, borderRadius: 19.5, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  chip: {
    position: 'absolute', bottom: 7, alignSelf: 'center',
    minHeight: 21, borderRadius: 11, paddingHorizontal: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(2,7,3,0.55)',
  },
  chipCoin: { width: 12, height: 12 },
  chipText: { fontSize: 11, lineHeight: 15, fontWeight: '800' },
  chipPrice: { color: '#FFE9A8' },
  chipLevel: { color: '#CFE2D4' },
  chipPlus: { color: '#FACC15' },
  mark: {
    position: 'absolute', top: 7, right: 7, width: 20, height: 20, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  markOwned: { width: 18, height: 18 },
});
