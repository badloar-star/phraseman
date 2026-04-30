import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import PRIVACY_POLICY_EN from '../legal/privacy_policy_en.json';

type PolicySection = { heading: string; body: string };

const PRIVACY_EN = PRIVACY_POLICY_EN as PolicySection[];

export default function PrivacyScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 0.5, borderBottomColor: t.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', flex: 1 }} numberOfLines={1}>
          Privacy Policy
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {PRIVACY_EN.map((s, i) => (
          <View key={i} style={{ marginBottom: 20 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginBottom: 6 }}>
              {s.heading}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.6 }}>
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
