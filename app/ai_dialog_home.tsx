import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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

export default function AiDialogHome() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const activeCount = getPublicDialogScenarios().length;

  // зачем: фулл-редизайн Диалогов (2026-08-23) — шапка «кино-афиши»: крупный
  // заголовок ведёт, счётчик сцен живёт тихой мета-строкой рядом, кнопка
  // «назад» — тональная, без обводок.
  const header = (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 20,
          paddingBottom: 6,
        }}
      >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => {
          hapticTap();
          safeRouterBack(router, '/(tabs)/home' as any);
        }}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: t.bgCard,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 14,
        }}
      >
        <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
      </TouchableOpacity>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '700' }}
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
        <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
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
    </View>
  );

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <DialogsTabContent headerSlot={header} />
      </SafeAreaView>
    </ScreenGradient>
  );
}
