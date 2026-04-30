import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { Theme } from '../../constants/theme';
import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import { FilterGroup } from './selectors';

type Props = {
  visible: boolean;
  lang: Lang;
  activeFilter: string;
  filterGroups: FilterGroup[];
  t: Theme;
  f: Record<string, number>;
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
  onClose,
  onSelect,
}: Props) {
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
          backgroundColor: t.bgSurface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: t.border,
          minWidth: 200,
          maxHeight: 420,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 50,
        }}
      >
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ borderRadius: 14, overflow: 'hidden' }}>
          <TouchableOpacity
            onPress={() => onSelect('all')}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}
          >
            <Text style={{ fontSize: f.body, color: activeFilter === 'all' ? t.accent : t.textPrimary, fontWeight: activeFilter === 'all' ? '700' : '400' }}>
              {triLang(lang, { ru: 'Все', uk: 'Всі', es: 'Todas' })}
            </Text>
            {activeFilter === 'all' && <Ionicons name="checkmark" size={16} color={t.accent} />}
          </TouchableOpacity>

          {filterGroups.map((group) => (
            <View key={group.groupKey}>
              <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.bgSurface }}>
                <Text style={{ fontSize: f.caption, color: t.textSecond, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>{group.groupLabel}</Text>
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
                      borderTopColor: t.border,
                    }}
                  >
                    <Text style={{ fontSize: f.body, color: active ? t.accent : t.textPrimary, fontWeight: active ? '700' : '400' }}>{opt.label}</Text>
                    {active && <Ionicons name="checkmark" size={16} color={t.accent} />}
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
