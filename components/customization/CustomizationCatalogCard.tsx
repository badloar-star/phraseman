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
import { CUSTOM_AVATAR_RUNE_RATE } from '../../constants/custom_avatars';
import { RuneGlyph } from '../RuneGlyph';

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

// зачем: владелец 2026-08-26 — «иконки внутри плиток слишком мелкие, надо до самих
// рамок». Внутреннее поле плитки на телефоне ~107pt (3 колонки, GRID_PAD 16 + GAP 10).
// Аватар внутри ауры остаётся 52pt, а все кольца получают единый диаметр 91pt:
// round(52 x 2.05 x 0.85) — на 15% меньше прежнего максимума. Плитка и её
// зона нажатия не уменьшаются. Аватар без ауры берёт 88pt:
// крупно, но остаётся воздух под чип цены снизу и галочку выбора сверху.
const AURA_CATALOG_PREVIEW_SIZE = 52;
const AURA_CATALOG_VISUAL_SIZE = 91;
const AVATAR_CATALOG_PREVIEW_SIZE = 88;

interface Props {
  item: CatalogCardItem;
  selected: boolean;
  label: string;
  statusLabel: string;
  tierPrice?: number;
  tierCurrency?: 'pearls' | 'runes';
  onPress: (id: string) => void;
}

const TIER_ACCENT: Record<number, string> = {
  50: '#53D6C7',
  70: '#60A5FA',
  90: '#94A3B8',
  100: '#A78BFA',
  150: '#F472B6',
  300: '#F59E0B',
  500: '#22D3EE',
  1000: '#FDE047',
};

function alpha(color: string, value: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${value}` : color;
}

/**
 * зачем: владельцу не нравились «шумные» карточки — две строки текста и рамка на каждой.
 * Теперь плитка немая: только превью; имя показывает сцена, а цена/замок/награда — один
 * компактный чип. Тексты label/statusLabel остаются в accessibilityLabel для VoiceOver.
 */
function AvailabilityChip({
  item,
  pearlIcon,
  tierPrice,
  tierCurrency,
}: {
  item: CatalogCardItem;
  pearlIcon: ReturnType<typeof pearlIconForTheme>;
  tierPrice?: number;
  tierCurrency?: 'pearls' | 'runes';
}) {
  const a = item.availability;
  const price = a.kind === 'shards' || a.kind === 'runes' ? a.cost : tierPrice;
  if (price !== undefined) {
    return (
      <View style={styles.chip}>
        {a.kind === 'runes' || (a.kind !== 'shards' && tierCurrency === 'runes')
          ? <RuneGlyph size={12} color="#D7F7C2" />
          : <Image source={pearlIcon} style={styles.chipCoin} contentFit="contain" accessible={false} />}
        <Text style={[styles.chipText, styles.chipPrice]}>{price}</Text>
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
  item, selected, label, statusLabel, tierPrice, tierCurrency, onPress,
}: Props) {
  const { theme: t, themeMode } = useTheme();
  const owned = item.isOwned && !selected && item.kind !== 'none-aura';
  const normalizedTierPrice = tierCurrency === 'runes'
    ? (tierPrice ?? 0) / CUSTOM_AVATAR_RUNE_RATE
    : tierPrice;
  const tierAccent = normalizedTierPrice === undefined ? undefined : TIER_ACCENT[normalizedTierPrice];
  const prestige = (normalizedTierPrice ?? 0) >= 300;
  return (
    <TapScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}. ${statusLabel}`}
      onPress={() => onPress(item.id)}
      scaleTo={0.96}
      style={[
        styles.ring,
        tierAccent && {
          backgroundColor: alpha(tierAccent, prestige ? '40' : '22'),
          shadowColor: tierAccent,
          shadowOpacity: prestige ? 0.2 : 0,
          shadowRadius: prestige ? 10 : 0,
          elevation: prestige ? 3 : 0,
        },
        selected && { backgroundColor: t.accent, shadowColor: t.accent, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
      ]}
    >
      <LinearGradient
        colors={tierAccent && prestige
          ? [alpha(tierAccent, normalizedTierPrice === 1000 ? '2E' : '1E'), t.bgCard]
          : [t.bgSurface, t.bgCard]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.tile}
      >
        {item.kind === 'custom-avatar'
          ? <CustomAvatarBadge value={item.previewValue} size={AVATAR_CATALOG_PREVIEW_SIZE} />
              : <AvatarView
                  avatar={item.previewAvatar}
                  auraId={item.kind === 'aura' ? item.auraId : null}
                  size={item.kind === 'aura' ? AURA_CATALOG_PREVIEW_SIZE : AVATAR_CATALOG_PREVIEW_SIZE}
                  auraVisualSize={item.kind === 'aura' ? AURA_CATALOG_VISUAL_SIZE : undefined}
                  animateAura={false}
                />}
        {!selected ? (
          <AvailabilityChip
            item={item}
            pearlIcon={pearlIconForTheme(themeMode)}
            tierPrice={tierPrice}
            tierCurrency={tierCurrency}
          />
        ) : null}
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
