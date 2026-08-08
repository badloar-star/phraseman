import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import SectionSheetHeader from '../components/SectionSheetHeader';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { coerceInterfaceLang, getVisibleInterfaceLanguageOptions } from '../constants/i18n';
import { IS_STORE_RELEASE } from './config';
import { safeRouterBack } from './navigation_back';

export default function SettingsLanguage() {
  const router = useRouter();
  const { theme: t, themeMode } = useTheme();
  const { lang, setLang, s } = useLang();

  return (
    <ScreenGradient>
      <SafeAreaView testID="settings-language-screen" style={{ flex: 1 }}>
        <ContentWrap>
          {/* зачем: стандарт «шторки раздела» — экран выезжает снизу как модал,
              шапка = заголовок по центру + крестик (закрытие вниз), не «назад». */}
          <SectionSheetHeader
            title={s.settings.lang}
            closeTestID="settings-language-back"
            onClose={() => safeRouterBack(router, '/(tabs)/settings' as any)}
          />

          <BouncyScrollView decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36 }} scrollEventThrottle={16}>
            {getVisibleInterfaceLanguageOptions(IS_STORE_RELEASE).map((item) => {
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
                    borderWidth: 0,
                    borderColor: active ? t.accent : t.border,
                    backgroundColor: t.bgCard,
                    marginBottom: 10,
                    opacity: enabled ? 1 : 0.42,
                    overflow: 'hidden',
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
          </BouncyScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
