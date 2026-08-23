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
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';

export default function AiDialogHome() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();

  const backLabel = triLang(lang, {
    ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar',
    vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
  });

  // зачем (аудит 2026-08-23): подпись-расшифровка под заголовком нарушала
  // жёсткий запрет владельца («название самодостаточно, не добавляй подпись»)
  // — счётчик сценариев убран из шапки целиком; он и так виден на каждой
  // карточке-мире каталога («3/7» и т.п.), дублировать под заголовком незачем.
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
        accessibilityLabel={backLabel}
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
