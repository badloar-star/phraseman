import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import type { Theme } from '../../constants/theme';
import { Category, CategoryId } from './types';

type Props = {
  categories: Category[];
  activeCat: CategoryId;
  lang: 'ru' | 'uk' | 'es';
  t: Theme;
  bottomInset: number;
  onSwitchCategory: (catId: CategoryId) => void;
};

const COLS = 3;
const H_PAD = 10;
const GAP = 8;

export default function FlashcardsCategoryTiles({
  categories,
  activeCat,
  lang,
  t,
  bottomInset,
  onSwitchCategory,
}: Props) {
  const { width: winW } = useWindowDimensions();
  const tileW = useMemo(() => {
    const inner = winW - H_PAD * 2 - GAP * (COLS - 1);
    return Math.max(56, Math.floor(inner / COLS));
  }, [winW]);

  return (
    <View
      style={{
        borderTopWidth: 0.5,
        borderTopColor: t.border,
        backgroundColor: t.bgPrimary,
        paddingHorizontal: H_PAD,
        paddingTop: 10,
        paddingBottom: Math.max(bottomInset, 8),
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, justifyContent: 'flex-start' }}>
        {categories.map((cat) => {
          const active = cat.id === activeCat;
          const label = lang === 'uk' ? cat.labelUK : lang === 'es' ? cat.labelES : cat.labelRU;
          const color = active ? t.textPrimary : t.textMuted;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSwitchCategory(cat.id)}
              activeOpacity={0.75}
              style={{
                width: tileW,
                alignItems: 'center',
                paddingBottom: 4,
              }}
            >
              <View
                style={{
                  width: tileW,
                  height: tileW,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: active ? t.accent : t.border,
                  backgroundColor: active ? `${t.accent}18` : t.bgSurface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {active && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: t.accent,
                    }}
                  />
                )}
                <Ionicons name={cat.icon as any} size={Math.min(30, Math.floor(tileW * 0.38))} color={color} />
              </View>
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  fontWeight: active ? '700' : '500',
                  color,
                  textAlign: 'center',
                  lineHeight: 12,
                }}
                numberOfLines={2}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
