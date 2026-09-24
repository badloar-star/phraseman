import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import EnergyBar from '../components/EnergyBar';
import DialogsTabContent from '../components/DialogsTabContent';
import { V2IconButton, V2LargeTitle } from '../components/v2/V2Kit';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { safeRouterBack } from './navigation_back';

export default function AiDialogHome() {
  const { lang } = useLang();
  const router = useRouter();

  const backLabel = triLang(lang, {
    ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar',
    vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
  });

  // зачем: перевод на стиль 2.0 (владелец 24.09, референс «Диалоги»). Экран
  // без нативного хедера, поэтому маленькая круглая стеклянная «‹» сохранена
  // (иначе жест/аппаратная кнопка — единственный путь назад), но крупный
  // заголовок и подпись теперь ровно как на референсе — V2LargeTitle слева,
  // энергия справа от него отдельной пилюлью (квота — своей строкой внутри
  // списка, см. DialogsTabContent).
  const header = (
    <View style={{ paddingHorizontal: V2.screenPad, paddingTop: 12, gap: 12 }}>
      <V2IconButton icon="chevron-back" accessibilityLabel={backLabel} onPress={() => {
        hapticTap();
        safeRouterBack(router, '/(tabs)/home' as any);
      }} />
      <V2LargeTitle
        title={triLang(lang, {
          ru: 'Диалоги',
          uk: 'Діалоги',
          en: 'Dialogues',
          es: 'Diálogos',
          'pt-BR': 'Diálogos',
          vi: 'Đối thoại',
          id: 'Dialog',
          tr: 'Diyaloglar',
          pl: 'Dialogi',
        })}
        subtitle={triLang(lang, {
          ru: 'Практикуйте язык в жизненных ситуациях',
          uk: 'Практикуйте мову в життєвих ситуаціях',
          en: 'Practice the language in real-life situations',
          es: 'Practica el idioma en situaciones de la vida real',
          'pt-BR': 'Pratique o idioma em situações reais',
          vi: 'Luyện ngôn ngữ trong các tình huống đời thường',
          id: 'Latih bahasa dalam situasi kehidupan nyata',
          tr: 'Dili gerçek hayat durumlarında pratik yap',
          pl: 'Ćwicz język w codziennych sytuacjach',
        })}
        right={<EnergyBar size={30} />}
      />
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
