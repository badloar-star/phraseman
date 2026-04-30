import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BETA_TESTERS } from '../constants/beta_testers_roll';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { triLang } from '../constants/i18n';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';

export default function BetaTesters() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'Бета-тестеры',
                uk: 'Бета-тестери',
                es: 'Beta testers',
              })}
            </Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}>
          {BETA_TESTERS.map((tester, index) => {
            const isExpanded = expanded === tester.name;
            const isLast = index === BETA_TESTERS.length - 1;
            const bio =
              lang === 'uk' ? tester.bio_uk : lang === 'es' ? tester.bio_es : tester.bio;
            return (
              <View key={tester.name}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: (isExpanded || isLast) ? 0 : 0.5,
                    borderBottomColor: t.border,
                  }}
                  onPress={() => { hapticTap(); setExpanded(isExpanded ? null : tester.name); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-circle-outline" size={24} color={t.textSecond} style={{ marginRight: 14 }} />
                  <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '500' }}>{tester.name}</Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={t.textGhost} />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={{
                    paddingHorizontal: 20,
                    paddingTop: 10,
                    paddingBottom: 18,
                    borderBottomWidth: isLast ? 0 : 0.5,
                    borderBottomColor: t.border,
                  }}>
                    <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.6 }}>{bio}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>

    </ScreenGradient>
  );
}
