import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import EnergyBar from '../components/EnergyBar';
import DialogsTabContent from '../components/DialogsTabContent';
import { dialogueV2HubCopy } from '../components/dialogs/DialogueV2HubNotices';
import { DialogueGlassQuotaPill } from '../components/dialogs/glass/DialogueGlassSessionParts';
import { useDialogueGlass } from '../components/dialogs/glass/DialogueGlassKit';
import { useDialogueHubQuota } from '../hooks/use_dialogue_hub_quota';
import { V2IconButton, V2LargeTitle } from '../components/v2/V2Kit';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { safeRouterBack } from './navigation_back';
import { HubHeaderCollapseProvider, useHubHeaderCollapsed } from '../components/dialogs/hub_header_collapse';

// зачем (dialogs-003, координатор 13.10): состояние «шапка схлопнута, пока открыта категория» живёт в провайдере над экраном — перерисовывается только шапка, список миров нет.
export default function AiDialogHome() {
  return (
    <HubHeaderCollapseProvider>
      <AiDialogHomeBody />
    </HubHeaderCollapseProvider>
  );
}

function AiDialogHomeBody() {
  const { lang } = useLang();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const subtitleHidden = useHubHeaderCollapsed();
  const isNarrowOrLargeText = width < 360 || fontScale >= 1.3;

  const backLabel = triLang(lang, {
    ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar',
    vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
  });

  // зачем: перевод на стиль 2.0 (владелец 24.09, референс «Диалоги»). Экран
  // без нативного хедера, поэтому маленькая круглая стеклянная «‹» сохранена
  // (иначе жест/аппаратная кнопка — единственный путь назад), но крупный
  // заголовок и подпись делят один верхний ряд с кнопкой назад и живой
  // энергией. На узком экране и при крупном шрифте текст получает полную
  // ширину под действиями. Квота — в шапке (quotaInHeader), не над каталогом.
  const title = triLang(lang, {
    ru: 'Диалоги', uk: 'Діалоги', en: 'Dialogues', es: 'Diálogos',
    'pt-BR': 'Diálogos', vi: 'Hội thoại', id: 'Dialog', tr: 'Diyaloglar', pl: 'Dialogi',
  });
  const subtitle = triLang(lang, {
    ru: 'Практикуй язык в жизненных ситуациях',
    uk: 'Практикуй мову в життєвих ситуаціях',
    en: 'Practice the language in real-life situations',
    es: 'Practica el idioma en situaciones de la vida real',
    'pt-BR': 'Pratique o idioma em situações reais',
    vi: 'Luyện ngôn ngữ trong các tình huống đời thường',
    id: 'Latih bahasa dalam situasi kehidupan nyata',
    tr: 'Dili gerçek hayat durumlarında pratik yap',
    pl: 'Ćwicz język w codziennych sytuacjach',
  });
  // зачем (макет dialogs.html hubHead): справа в шапке столбиком — энергия и «💬 N/30»
  // (месячный остаток Free, D111). У Plus остатка нет — пилюли нет.
  const quota = useDialogueHubQuota();
  const dialogueGlass = useDialogueGlass();
  const hubCopy = dialogueV2HubCopy(lang);
  const headerRight = (
    <View style={{ alignItems: 'flex-end', gap: 14 }}>
      {/* зачем (эмулятор 30.09): без glass тут жила старая тёмная капсула — в светлой теме чёрное пятно. */}
      <EnergyBar size={30} glass solidBolt />
      {quota ? (
        <DialogueGlassQuotaPill
          glass={dialogueGlass}
          testID="ai-dialog-home-quota"
          text={`${quota.remaining}/${quota.total}`}
          accessibilityLabel={hubCopy.quotaA11y(quota.remaining, quota.total)}
        />
      ) : null}
    </View>
  );
  // зачем (координатор 12.10, п.72): хаб открыт с Главной — стрелка назад остаётся, хаптик есть, testID нужен роботу съёмки
  const backButton = <V2IconButton testID="ai-dialog-home-back" icon="chevron-back" accessibilityLabel={backLabel} onPress={() => {
    hapticTap();
    safeRouterBack(router, '/(tabs)/home' as any);
  }} />;
  const header = (
    <View style={{ paddingHorizontal: V2.screenPad, paddingTop: 22 }}>
      {isNarrowOrLargeText ? (
        <View>
          <View testID="ai-dialog-home-header-actions" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {backButton}
            {headerRight}
          </View>
          <View style={{ marginTop: 12 }}>
            <V2LargeTitle title={title} subtitle={subtitle} subtitleHidden={subtitleHidden} />
          </View>
        </View>
      ) : (
        <View testID="ai-dialog-home-header-row" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {backButton}
          <View style={{ flex: 1, minWidth: 0 }}>
            <V2LargeTitle title={title} subtitle={subtitle} right={headerRight} subtitleHidden={subtitleHidden} />
          </View>
        </View>
      )}
    </View>
  );

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <DialogsTabContent headerSlot={header} quotaInHeader />
      </SafeAreaView>
    </ScreenGradient>
  );
}
