import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import type { Theme } from '../../constants/theme';
import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import { FilterGroup } from './selectors';

import { noAndroidOutline } from '../../constants/androidGlow';
type Props = {
  visible: boolean;
  lang: Lang;
  activeFilter: string;
  filterGroups: FilterGroup[];
  t: Theme;
  f: Record<string, number>;
  savedGlass?: boolean;
  onClose: () => void;
  onSelect: (key: string) => void;
};

export default function FlashcardsFilterDropdown({
  visible,
  lang,
  activeFilter,
  filterGroups,
  t,
  f,
  savedGlass = false,
  onClose,
  onSelect,
}: Props) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  if (!visible) return null;

  return (
    <>
      <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={onClose} />
      <View
        style={{
          position: 'absolute',
          top: 56,
          right: 16,
          zIndex: 9999,
          backgroundColor: savedGlass ? g.sheet : t.bgSurface,
          borderRadius: 14,
          borderWidth: savedGlass ? 1 : 0,
          borderColor: g.glassEdge,
          overflow: 'hidden',
          minWidth: 200,
          maxHeight: 420,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          ...noAndroidOutline,
        }}
      >
        {savedGlass ? <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <BlurView intensity={Platform.OS === 'android' ? 12 : 16} blurReductionFactor={3} experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
          <LinearGradient colors={[g.selected, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
        </View> : null}
        <ScrollView decelerationRate="fast" bounces={false} showsVerticalScrollIndicator={false} style={{ borderRadius: 14, overflow: 'hidden' }}>
          <TouchableOpacity
            onPress={() => onSelect('all')}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}
          >
            <Text style={{ fontSize: f.body, color: savedGlass ? g.text : activeFilter === 'all' ? t.accent : t.textPrimary, fontWeight: activeFilter === 'all' ? '700' : '400' }}>
              {triLang(lang, {
                ru: 'Все',
                uk: 'Всі',
                en: 'All',
                es: 'Todas',
                'pt-BR': 'Todas',
                vi: 'Tất cả',
                id: 'Semua',
                tr: 'Tümü',
                pl: 'Wszystkie',
              })}
            </Text>
            {activeFilter === 'all' && <Ionicons name="checkmark" size={16} color={savedGlass ? g.lightTint : t.accent} />}
          </TouchableOpacity>

          {filterGroups.map((group) => (
            <View key={group.groupKey}>
              <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, borderTopWidth: 0.5, borderTopColor: savedGlass ? g.glassEdge : t.border, backgroundColor: savedGlass ? g.card : t.bgSurface }}>
                <Text style={{ fontSize: f.caption, color: savedGlass ? g.secondary : t.textSecond, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>{group.groupLabel}</Text>
              </View>
              {group.items.map((opt) => {
                const active = activeFilter === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => onSelect(opt.key)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 24,
                      paddingVertical: 10,
                      borderTopWidth: 0.5,
                      borderTopColor: savedGlass ? g.glassEdge : t.border,
                    }}
                  >
                    <Text style={{ fontSize: f.body, color: savedGlass ? g.text : active ? t.accent : t.textPrimary, fontWeight: active ? '700' : '400' }}>{opt.label}</Text>
                    {active && <Ionicons name="checkmark" size={16} color={savedGlass ? g.lightTint : t.accent} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </>
  );
}
