import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { Theme } from '../../constants/theme';
import { Category, CategoryId } from './types';

type Props = {
  categories: Category[];
  activeCat: CategoryId;
  lang: 'ru' | 'uk' | 'es';
  t: Theme;
  onSwitchCategory: (catId: CategoryId) => void;
};

export default function FlashcardsCategoryBar({
  categories,
  activeCat,
  lang,
  t,
  onSwitchCategory,
}: Props) {
  return (
    <View style={{ borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.bgPrimary }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 6, paddingBottom: 4 }}>
        {categories.map((cat) => {
          const active = cat.id === activeCat;
          const color = active ? t.textPrimary : t.textMuted;
          const label = lang === 'uk' ? cat.labelUK : lang === 'es' ? cat.labelES : cat.labelRU;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSwitchCategory(cat.id)}
              activeOpacity={0.7}
              style={{ width: 68, alignItems: 'center', gap: 2, position: 'relative' }}
            >
              {active && (
                <View style={{ position: 'absolute', bottom: -4, left: '25%', right: '25%', height: 2, borderRadius: 1, backgroundColor: t.textPrimary }} />
              )}
              <Ionicons name={cat.icon as any} size={33} color={color} />
              <Text style={{ fontSize: 10, color, fontWeight: active ? '600' : '400', letterSpacing: 0.1 }} numberOfLines={1} adjustsFontSizeToFit>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, flexDirection: 'row' }}>
        {[0, 0.15, 0.4, 0.75].map((opacity, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: t.bgPrimary, opacity }} />
        ))}
      </View>
    </View>
  );
}
