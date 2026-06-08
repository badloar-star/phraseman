import React from 'react';
import TapScale from '../components/TapScale';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import ReportErrorButton from '../components/ReportErrorButton';
import CompassDepthSurface from '../components/CompassDepthSurface';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { coerceInterfaceLang, getVisibleInterfaceLanguageOptions } from '../constants/i18n';
import { IS_STORE_RELEASE } from './config';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { safeRouterBack } from './navigation_back';

export default function SettingsLanguage() {
  const router = useRouter();
  const { theme: t, themeMode } = useTheme();
  const { lang, setLang, s } = useLang();
  const isCompassTheme = themeMode === 'compass';

  return (
    <ScreenGradient>
      <SafeAreaView testID="settings-language-screen" style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TapScale
              testID="settings-language-back"
              onPress={() => {
                hapticTap();
                safeRouterBack(router, '/(tabs)/settings' as any);
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: isCompassTheme ? 8 : 19,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : 'transparent',
                borderWidth: isCompassTheme ? 0.5 : 0,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent',
                overflow: 'hidden',
                ...(isCompassTheme ? compassShadow(1) : {}),
              }}
            >
              {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TapScale>
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
              style={{
                width: 38,
                height: 38,
                borderRadius: isCompassTheme ? 8 : 19,
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderWidth: 0.5,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                ...(isCompassTheme ? compassShadow(1) : {}),
              }}
            />
          </View>

          <ScrollView decelerationRate="normal" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36 }}>
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
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      borderRadius: isCompassTheme ? 8 : 14,
                      borderWidth: active ? (isCompassTheme ? 1 : 2) : 0.5,
                      borderColor: isCompassTheme ? (active ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairlineQuiet) : active ? t.accent : t.border,
                      backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                      marginBottom: 10,
                      opacity: enabled ? 1 : 0.42,
                      overflow: 'hidden',
                    },
                    isCompassTheme && compassShadow(active ? 2 : 1),
                  ]}
                >
                  {isCompassTheme ? <CompassDepthSurface radius={8} selected={active} quiet={!active} /> : null}
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
