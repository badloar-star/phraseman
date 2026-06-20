import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import EnergyBar from '../components/EnergyBar';
import DialogsTabContent from '../components/DialogsTabContent';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { getPublicDialogScenarios } from './ai_dialog_scenarios';
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';

/**
 * Standalone-маршрут «Диалоги» (/ai_dialog_home). Используется прямыми переходами
 * (QA-панель тестеров и т.п.). Внутри вкладки «Уроки» рендерится не он, а напрямую
 * `DialogsTabContent` — общий хедер/энергия там приходят от экрана уроков.
 */
export default function AiDialogHome() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const activeCount = getPublicDialogScenarios().length;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <DialogsTabContent
          headerSlot={
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 14,
                paddingBottom: 8,
              }}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Назад"
                onPress={() => {
                  hapticTap();
                  safeRouterBack(router, '/(tabs)/home' as any);
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: t.bgCard,
                  borderWidth: 0.5,
                  borderColor: t.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
              </TouchableOpacity>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800' }}
                  numberOfLines={1}
                >
                  {triLang(lang, {
                    ru: 'Диалоги',
                    uk: 'Діалоги',
                    es: 'Diálogos',
                    'pt-BR': 'Diálogos',
                    vi: 'Đối thoại',
                    id: 'Dialog',
                    tr: 'Diyaloglar',
                    pl: 'Dialogi',
                  })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }} numberOfLines={1}>
                  {triLang(lang, {
                    ru: `${activeCount} сценариев с Компасом`,
                    uk: `${activeCount} сценаріїв із Компасом`,
                    es: `${activeCount} escenarios con Compass`,
                    'pt-BR': `${activeCount} cenários com Compass`,
                    vi: `${activeCount} kịch bản với Compass`,
                    id: `${activeCount} skenario dengan Compass`,
                    tr: `Compass ile ${activeCount} senaryo`,
                    pl: `${activeCount} scenariuszy z Compass`,
                  })}
                </Text>
              </View>
              <EnergyBar size={30} />
            </View>
          }
        />
      </SafeAreaView>
    </ScreenGradient>
  );
}
