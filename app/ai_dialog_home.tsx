import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import EnergyBar from '../components/EnergyBar';
import DialogsTabContent from '../components/DialogsTabContent';
import { dialogueV2HubCopy } from '../components/dialogs/DialogueV2HubNotices';
import { DialogueGlassQuotaPill } from '../components/dialogs/glass/DialogueGlassSessionParts';
import { useDialogueGlass } from '../components/dialogs/glass/DialogueGlassKit';
import { useDialogueHubQuota } from '../hooks/use_dialogue_hub_quota';
import { V2LargeTitle } from '../components/v2/V2Kit';
import ScreenBackButton, { ScreenBackSlot } from '../components/v2/ScreenBackButton';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { HubHeaderCollapseProvider, useHubHeaderCollapsed } from '../components/dialogs/hub_header_collapse';
import DialogsSceneHub from '../components/dialogs/scene/DialogsSceneHub';
import { useDialogsSceneTheme } from '../components/dialogs/scene/use_dialogs_scene_theme';
import { DIALOGS_SCENE_V2_ENABLED } from '../components/dialogs/scene/dialogs_scene_flags';

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
  const { width, fontScale } = useWindowDimensions();
  const subtitleHidden = useHubHeaderCollapsed();
  const isNarrowOrLargeText = width < 360 || fontScale >= 1.3;
  const insets = useStableSafeAreaInsets();
  // зачем (4 · ТЕМЫ 7d5dceb94, g.backOnScene): круг «назад» лежит на сцене — верх цвета сцены нужен кнопке, чтобы круг и значок не сливались со сценой; место и размер кнопки не меняются
  const sceneTheme = useDialogsSceneTheme();

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
  const quotaPill = quota ? (
    <DialogueGlassQuotaPill
      glass={dialogueGlass}
      testID="ai-dialog-home-quota"
      // зачем (Ревизор 3.45): остаток неизвестен телефону — «—/30», а не выдуманный полный лимит.
      text={`${quota.remaining === null ? '—' : quota.remaining}/${quota.total}`}
      accessibilityLabel={quota.remaining === null ? hubCopy.quotaUnknownA11y(quota.total) : hubCopy.quotaA11y(quota.remaining, quota.total)}
    />
  ) : null;
  // зачем (Макеты 9e311920a, dialogs-004): у капсулы энергии зона нажатия 44 при видимой высоте 28 (по 8 сверху и снизу), поэтому
  // при gap 14 «N/30» вставала на 50 ниже верха капсулы — на уровень второй строки подписи. В образце hubHead — 42 (28 + 14), отсюда gap 6.
  const headerRight = (
    <View style={{ alignItems: 'flex-end', gap: 6 }}>
      {/* зачем (эмулятор 30.09): без glass тут жила старая тёмная капсула — в светлой теме чёрное пятно. */}
      <EnergyBar size={30} glass solidBolt />
      {subtitleHidden ? null : quotaPill}
    </View>
  );
  // зачем (Макеты 9e311920a, dialogs-006; образец openCat): пока категория раскрыта, шапка свёрнута — справа только энергия,
  // а «N/30» отдельной строкой по центру под заголовком (margin-top 10). Переход — та же layout-анимация хоста, что прячет подзаголовок.
  const centeredQuota = subtitleHidden && quotaPill ? (
    <View testID="ai-dialog-home-quota-centered" style={{ alignItems: 'center', marginTop: 10 }}>{quotaPill}</View>
  ) : null;
  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «КНОПКА НАЗАД ВООБЩЕ ВЕЗДЕ ДОЛЖНА БЫТЬ В ОДНОМ И ТОМ ЖЕ МЕСТЕ» — кнопка хаба Диалогов — общая ScreenBackButton (слой экрана, возврат на Главную); в шапке остаётся только место под неё
  const backButton = <ScreenBackSlot />;
  const header = (
    <View style={{ paddingHorizontal: V2.screenPad, paddingTop: insets.top }}>
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
      {centeredQuota}
    </View>
  );

  // зачем (координатор 22.10, «Сцена» Диалогов за флагом DIALOGS_SCENE_V2_ENABLED): при флаге шапка хаба — сцена на настоящих данных; нет каталога для сцены — прежняя шапка (fallback).
  // Сцена идёт под статус-бар (свой отступ сверху), поэтому верхний край безопасной зоны у неё снимается. Без флага — прежнее поведение.
  const scene = DIALOGS_SCENE_V2_ENABLED;
  const headerSlot = scene ? (
    <DialogsSceneHub fallback={header} />
  ) : header;
  return (
    <ScreenGradient>
      <ScreenBackButton screen="ai_dialog_home" fallback="/(tabs)/home" testID="ai-dialog-home-back" accessibilityLabel={backLabel} sceneTop={sceneTheme.colors.top} />
      <SafeAreaView style={{ flex: 1 }} edges={scene ? ['left', 'right', 'bottom'] : undefined}>
        <DialogsTabContent headerSlot={headerSlot} quotaInHeader sceneCatalogue={scene} />
      </SafeAreaView>
    </ScreenGradient>
  );
}
