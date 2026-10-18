import { Redirect } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';
import { V2, V2_TYPE } from '../constants/v2Style';
import type { Lang } from '../constants/i18n';
import {
  DialogueV2CatalogueSection,
  type DialogueV2CatalogueLearnerItem,
  type DialogueV2CatalogueWorld,
} from '../components/dialogs/DialogueV2CatalogueSection';
import { DialogueV2BriefingScreen } from '../components/dialogs/DialogueV2BriefingScreen';
import { DialogueV2FreeformScreen } from '../components/dialogs/DialogueV2FreeformScreen';
import { DialogueV2SessionScreen } from '../components/dialogs/DialogueV2SessionScreen';
import { PlateFill, plateBoxShadow, useShadowGlass } from '../components/v2/ShadowSurface';
import { useV2Palette } from '../components/v2/useV2Palette';

const interfaceLang: Lang = 'ru';
const noop = () => undefined;

/**
 * Static component props for a layout-only dev inspection. These values are
 * intentionally not packets, catalogue projections, or product test content.
 */
const fixtureWorlds: readonly DialogueV2CatalogueWorld[] = Object.freeze([
  Object.freeze({ id: 'social', title: 'Общение' }),
]);

const fixtureCatalogue: readonly DialogueV2CatalogueLearnerItem[] = Object.freeze([
  Object.freeze({ id: 'fixture_done', worldId: 'social', title: 'Короткий ответ', cefr: 'A1', rankRequired: 1, status: 'done' }),
  Object.freeze({ id: 'fixture_available', worldId: 'social', title: 'Уточнить план', cefr: 'A2', rankRequired: 2, status: 'available' }),
  Object.freeze({ id: 'fixture_locked', worldId: 'social', title: 'Согласовать позицию', cefr: 'B1', rankRequired: 3, status: 'locked' }),
]);

const fixtureObjectives = Object.freeze([
  Object.freeze({ id: 'fixture_objective_1', label: 'Сформулируй короткий ответ.' }),
  Object.freeze({ id: 'fixture_objective_2', label: 'Уточни один следующий шаг.' }),
]);


const fixtureSessionMessages = Object.freeze([
  Object.freeze({ id: 'fixture_persona_message', author: 'persona' as const, authorLabel: 'Лена', text: 'Привет! Удобно обсудить план?' }),
  Object.freeze({ id: 'fixture_learner_message', author: 'learner' as const, text: 'Да, давай уточним время.' }),
]);

const fixtureFreeformMessages = Object.freeze([
  Object.freeze({ id: 'fixture_freeform_assistant', author: 'assistant' as const, text: 'О чём хочешь поговорить?' }),
  Object.freeze({ id: 'fixture_freeform_learner', author: 'learner' as const, text: 'Давай обсудим короткий план.' }),
]);

function FixtureHeading({ children }: Readonly<{ children: string }>) {
  const palette = useV2Palette();
  return <Text style={{ color: palette.text, ...V2_TYPE.section, marginTop: V2.gap }}>{children}</Text>;
}

/** Рамка экрана-образца: тень на внешнем слое, клип скругления — на внутреннем (стиль «Тень»: без контура, overflow не режет тень). */
function FixtureFrame({ height, children }: Readonly<{ height: number; children: React.ReactNode }>) {
  const g = useShadowGlass();
  return (
    <View style={{ height, borderRadius: V2.radius.card, boxShadow: plateBoxShadow(g) }}>
      <View style={{ flex: 1, overflow: 'hidden', borderRadius: V2.radius.card }}>{children}</View>
    </View>
  );
}

/**
 * Dev-only, static visual inspection route. It does not authenticate, load a
 * catalogue, invoke a callable, save state, or verify release readiness.
 */
export default function DialogueV2VisualFixtureRoute() {
  const palette = useV2Palette();
  const g = useShadowGlass();

  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/" />;

  return (
    <View testID="dialogue-v2-visual-fixture" style={{ flex: 1, backgroundColor: palette.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: V2.screenPad, paddingBottom: V2.screenPad * 2, gap: V2.gap }} decelerationRate="fast">
          <View style={{ borderRadius: V2.radius.card, boxShadow: plateBoxShadow(g), padding: V2.gap }}>
            <PlateFill g={g} radius={V2.radius.card} />{/* зачем (стиль «Тень»): плашка без обводки */}
            <Text accessibilityRole="header" style={{ color: palette.text, ...V2_TYPE.title }}>Dialogue V2 · DEV</Text>
            <Text style={{ color: palette.textSecondary, ...V2_TYPE.body, marginTop: 6 }}>
              Компонентная визуальная фикстура · данные статичны · без Auth/Firebase/Functions/release verification.
            </Text>
            <Text style={{ color: palette.textMuted, ...V2_TYPE.caption, marginTop: 6 }}>
              Component visual fixture · static data only · no Auth/Firebase/Functions/release verification.
            </Text>
          </View>

          <FixtureHeading>Каталог / Catalogue</FixtureHeading>
          <DialogueV2CatalogueSection items={fixtureCatalogue} worlds={fixtureWorlds} labels={{ lockedAtRank: (rank) => `Откроется на ранге ${rank}` }} onPressItem={noop} />

          <FixtureHeading>Брифинг / Briefing</FixtureHeading>
          <FixtureFrame height={680}>
            <DialogueV2BriefingScreen
              title="Согласовать план"
              cefr="A2"
              briefing="Короткая статическая сцена для проверки композиции."
              objectives={fixtureObjectives}
              rankRequired={2}
              unlocked
              currentRank={2}
              labels={{ back: 'Назад', tasks: 'Задания', start: 'Начать диалог', locked: (rank) => `Откроется на ранге ${rank}`, currentRank: (rank) => `Сейчас ранг ${rank}` }}
              onBack={noop}
              onStart={noop}
            />
          </FixtureFrame>

          <FixtureHeading>Свободный разговор / Freeform</FixtureHeading>
          <FixtureFrame height={410}>
            <DialogueV2FreeformScreen
              title="Свободный разговор"
              messages={fixtureFreeformMessages}
              draft=""
              sending={false}
              voiceStatus="idle"
              voiceDraft={null}
              playingVoiceUri={null}
              interfaceLang={interfaceLang}
              labels={{ back: 'Назад', placeholder: 'Напиши сообщение…', send: 'Отправить', emptyTitle: 'Что можно спросить', emptyText: 'Спроси про фразу или просто поговори.', voiceIdle: 'Зажми и говори', voiceRecording: 'Говори…', discardVoice: 'Удалить запись' }}
              onBack={noop}
              onChangeDraft={noop}
              onSend={noop}
              onStartVoice={noop}
              onStopVoice={noop}
              onDiscardVoice={noop}
              onPlayVoice={noop}
            />
          </FixtureFrame>

          <FixtureHeading>Сценарный чат / Scenario chat</FixtureHeading>
          <FixtureFrame height={410}>
            <DialogueV2SessionScreen
              title="Согласовать план"
              messages={fixtureSessionMessages}
              draft=""
              sending={false}
              voiceStatus="idle"
              voiceDraft={null}
              playingVoiceUri={null}
              playingPreparedBotVoiceMessageId={null}
              interfaceLang={interfaceLang}
              labels={{ back: 'Назад', placeholder: 'Напиши или зажми микрофон', send: 'Отправить', complete: 'Завершить диалог', subtitle: 'Диалог', more: 'Диалог', close: 'Закрыть', you: 'Вы', voiceIdle: 'Или зажми и говори', voiceStarting: 'Готовлю микрофон…', voiceRecording: 'Говори…', discardVoice: 'Удалить запись', turnError: 'Не удалось связаться с сервером.', retry: 'Повторить', tasks: 'Задания', exitTitle: 'Выйти из диалога?', exitMessage: 'Переписка не сохранится: в следующий раз диалог начнётся заново.', exitStay: 'Остаться', exitLeave: 'Выйти' }}
              objectives={fixtureObjectives}
              turnError={false}
              retryDisabled
              onRetry={noop}
              onBack={noop}
              onChangeDraft={noop}
              onSend={noop}
              onStartVoice={noop}
              onStopVoice={noop}
              onDiscardVoice={noop}
              onPlayVoice={noop}
              onPlayPreparedBotVoice={noop}
              onComplete={noop}
            />
          </FixtureFrame>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
