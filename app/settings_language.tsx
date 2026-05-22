import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import ReportErrorButton from '../components/ReportErrorButton';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { coerceInterfaceLang, INTERFACE_LANGUAGE_OPTIONS } from '../constants/i18n';

export default function SettingsLanguage() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { lang, setLang, s } = useLang();

  return (
    <ScreenGradient>
      <SafeAreaView testID="settings-language-screen" style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TouchableOpacity
              testID="settings-language-back"
              onPress={() => {
                hapticTap();
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)/settings' as any);
              }}
            >
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginLeft: 8 }}>
              {s.settings.lang}
            </Text>
            <View style={{ flex: 1 }} />
            <ReportErrorButton
              screen="settings_language"
              dataId="settings_language"
              dataText={s.settings.lang}
              variant="icon-flag"
              accessibilityLabel="Сообщить о баге на экране языка"
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border }}
            />
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36 }}>
            {INTERFACE_LANGUAGE_OPTIONS.map((item) => {
              const interfaceCode = coerceInterfaceLang(item.code);
              const enabled = interfaceCode === item.code;
              const active = lang === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  testID={`settings-language-row-${item.code}`}
                  activeOpacity={enabled ? 0.85 : 1}
                  disabled={!enabled}
                  onPress={() => {
                    if (!interfaceCode) return;
                    hapticTap();
                    void setLang(interfaceCode);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    borderRadius: 14,
                    borderWidth: active ? 2 : 0.5,
                    borderColor: active ? t.accent : t.border,
                    backgroundColor: t.bgCard,
                    marginBottom: 10,
                    opacity: enabled ? 1 : 0.42,
                  }}
                >
                  <Text style={{ flex: 1, color: t.textPrimary, fontSize: 15, fontWeight: active ? '800' : '600' }}>
                    {item.native}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={18} color={t.accent} />
                  ) : !enabled ? (
                    <Ionicons name="lock-closed" size={16} color={t.textMuted} style={{ opacity: 0.75 }} />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={t.textMuted} style={{ opacity: 0.7 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
