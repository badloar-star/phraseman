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
import { isMaxVoiceEntryVisible } from './max_voice_flags';

export default function AiDialogHome() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const activeCount = getPublicDialogScenarios().length;
  // Гейт входа в MAX-звонок: kill switch «Пульта» И нативный webrtc-стек этого
  // бинарника. Оба условия стабильны на время жизни экрана — считаем один раз,
  // чтобы не дёргать guarded-require на каждом рендере.
  const maxVoiceVisible = React.useMemo(() => isMaxVoiceEntryVisible(), []);

  const header = (
    <View>
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
          borderWidth: 0,
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
      {maxVoiceVisible && (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            hapticTap();
            router.push('/max_call_prestart' as any);
          }}
          style={{
            marginHorizontal: 14,
            marginBottom: 10,
            borderRadius: 16,
            backgroundColor: t.bgCard,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: t.accentBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="call" size={20} color={t.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '800' }} numberOfLines={1}>
              {triLang(lang, {
                ru: 'Позвонить собеседнику',
                uk: 'Подзвонити співрозмовнику',
                es: 'Llamar a tu compañero',
                'pt-BR': 'Ligar para seu parceiro',
                vi: 'Gọi cho bạn đồng hành',
                id: 'Telepon teman bicara',
                tr: 'Konuşma arkadaşını ara',
                pl: 'Zadzwoń do partnera',
              })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }} numberOfLines={1}>
              {triLang(lang, {
                ru: 'Живой разговор голосом в реальном времени',
                uk: 'Жива розмова голосом у реальному часі',
                es: 'Conversación de voz en tiempo real',
                'pt-BR': 'Conversa de voz em tempo real',
                vi: 'Trò chuyện bằng giọng nói theo thời gian thực',
                id: 'Percakapan suara secara real-time',
                tr: 'Gerçek zamanlı sesli konuşma',
                pl: 'Rozmowa głosowa w czasie rzeczywistym',
              })}
            </Text>
          </View>
          <View style={{ backgroundColor: t.gold, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ color: t.textOnGold, fontSize: f.label, fontWeight: '900' }}>MAX</Text>
          </View>
        </TouchableOpacity>
      )}
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
