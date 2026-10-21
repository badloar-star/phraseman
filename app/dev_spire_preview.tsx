// ═══════════════════════════════════════════════════════════
// dev_spire_preview — DEV-превью экранов «Шпиль» на моках (только разработка).
//
// зачем (координатор 11.10): живую комнату снять нельзя, пока на сервере config.enabled=false (его включает владелец в админке).
// Здесь все состояния Шпиля открываются на готовых моках, чтобы Эмулятор и Сверка снимали их рядом со spire.html:
//   /dev_spire_preview?state=lobby | room | win | summit | lose | save_failed | empty | offline | weekresult | tour | all | locked
//                            | step_choice | step_build | step_items | step_wrong | step_prep
//                            | weekresult_stay | weekresult_down | passed | guard | block_missing | block_offline
//                            | step_gap | step_odd | step_listen_choose | step_listen_build
//                            | step_build_filled (все ячейки заполнены, «Проверить» активна) | step_build_wrong (красная ячейка, «Правильно: …» + «Дальше»)
//   ?exit=1 — на экране ступени поверх открыта шторка «Выйти из ступени?» (spire-009). Жалобу на задание в превью не рисуем: её отправка — запись в сеть.
//   ?selector=1 — снизу полоса переключения состояний (по умолчанию скрыта, чтобы не попадать в кадр).
//   &tier=0 (лига 0…11, 0 = Гранит; по умолчанию 3) &floor=4 (мой этаж 1…15; по умолчанию 7) &steps=39 (ступени в итоге недели) — данные кадра как в образце; лига итога недели следует за tier
//   &spirePanel=off — полосы нет совсем (для съёмки); &spirePanel=dot — свёрнута в точку в правом нижнем углу, тап раскрывает.
// Экраны — ТЕ ЖЕ компоненты, что в бою (SpireHomeScreen через шов spire_preview_context, SpireStepLayout), данные — моки без сети.
// В релизе маршрута нет: ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную. Охраняет tests/spire_dev_preview_release_guard.test.mjs.
// ═══════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ReportErrorButton from '../components/ReportErrorButton';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import SpireExitSheet from '../components/spire/SpireExitSheet';
import SpireHomeScreen from '../components/spire/SpireHomeScreen';
import { SpireStepLayout } from '../components/spire/SpireStepScreen';
import { SpirePreviewProvider } from '../components/spire/spire_preview_context';
import {
  SPIRE_PREVIEW_STATES,
  isSpirePreviewState,
  isSpireStepPreviewState,
  parseSpirePreviewOverrides,
  spirePreviewModel,
  spireStaticClock,
  spireStepPreview,
  type SpirePreviewOverrides,
  type SpirePreviewState,
} from '../components/spire/spire_preview_fixtures';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';

const noop = (): void => undefined;
/** Транспорт жалобы превью: сети нет, ничего не отправляется. */
const devPreviewReportTransport = async (): Promise<'sent'> => 'sent';

function StepPreview({ state, exitOpen, overrides }: Readonly<{ state: SpirePreviewState; exitOpen: boolean; overrides: SpirePreviewOverrides }>) {
  const { lang } = useLang();
  const preview = useMemo(() => spireStepPreview(state, overrides), [state, overrides]);
  const clock = useMemo(() => spireStaticClock(preview.elapsedMs), [preview.elapsedMs]);
  return (
    <SpireStepLayout
      lang={lang}
      ctx={preview.ctx}
      budgetMs={preview.budgetMs}
      hearts={preview.hearts}
      clock={clock}
      paused={preview.paused}
      preparing={preview.preparing}
      task={preview.task}
      taskIndex={preview.taskIndex}
      feedback={preview.feedback}
      answering={preview.answering}
      exitOpen={exitOpen}
      studyTarget="en"
      showEnergy // зачем (снимки Макетов spire-007/008): в шапке ступени справа две пилюли — сердца и «⚡ N»; у игрока без Plus энергия показывается
      onBack={noop}
      onChoice={noop}
      onTokens={noop}
      onItems={noop}
      onContinue={noop}
      // зачем (Макеты 12.10, spire-gap-001/002/004/005): боевой экран рисует красный флажок «пожаловаться» при answering && task; превью передавало null — на кадрах флажка не было.
      // Тот же ReportErrorButton (icon-flag), но с пустым транспортом: вид как в бою, жалоба никуда не уходит.
      reportSlot={preview.answering && preview.task ? (
        <View style={s.reportRow}>
          <ReportErrorButton screen="spire" dataId="dev-preview" dataText="dev-preview" variant="icon-flag" testID="spire-task-report-0" submitOverride={devPreviewReportTransport} />
        </View>
      ) : null}
      // зачем (R1 spire-009): шторка выхода из ступени — тот же компонент, что в бою; кнопки ничего не делают, сети нет.
      exitSlot={exitOpen ? <SpireExitSheet lang={lang} visible floor={preview.ctx.floor} onContinue={noop} onExit={noop} /> : null}
    />
  );
}

function Inner() {
  const params = useLocalSearchParams<{ state?: string; selector?: string; exit?: string; spirePanel?: string; tier?: string; floor?: string; steps?: string; nicks?: string }>();
  const fromParam = isSpirePreviewState(params.state) ? params.state : 'room';
  const [state, setState] = useState<SpirePreviewState>(fromParam);
  useEffect(() => { setState(fromParam); }, [fromParam]);
  // зачем (координатор 15.10): tier= (0…11, 0 = Гранит) и floor= (1…15) — данные кадров Макетов = образцу; без них прежние tier 3 / этаж 7
  const overrides = useMemo(() => parseSpirePreviewOverrides(params.tier, params.floor, params.steps, params.nicks), [params.tier, params.floor, params.steps, params.nicks]);
  const model = useMemo(() => spirePreviewModel(state, overrides), [state, overrides]);
  const step = isSpireStepPreviewState(state);
  const exitOpen = params.exit === '1';
  // зачем (координатор 15.10, spire-gap-008: полоса состояний перекрывала низ кадров): spirePanel=off — полосы нет вовсе (съёмка), spirePanel=dot — свёрнута в точку
  // в углу, тап раскрывает. Без параметра поведение прежнее: полоса только при selector=1.
  const panelMode = params.spirePanel === 'off' ? 'off' : params.spirePanel === 'dot' ? 'dot' : 'strip';
  const [dotOpen, setDotOpen] = useState(false);
  const showStrip = panelMode !== 'off' && (params.selector === '1' || panelMode === 'dot') && (panelMode === 'strip' || dotOpen);
  const showDot = panelMode === 'dot';
  useEffect(() => {
    console.log(`[DEV-STATE] spire_preview route state=${state} fromParam=${String(params.state ?? 'нет→room')} step=${String(step)} selector=${String(params.selector === '1')} exit=${String(exitOpen)} spirePanel=${panelMode} showStrip=${String(showStrip)} showDot=${String(showDot)}`);
  }, [state, params.state, params.selector, step, exitOpen, panelMode, showStrip, showDot]);
  return (
    <View style={s.root} testID="dev-spire-preview">
      {step ? (
        <StepPreview state={state} exitOpen={exitOpen} overrides={overrides} />
      ) : (
        <ScreenGradient artBackdrop="home">
          <SafeAreaView edges={['top']} style={s.root}>
            {/* key: смена состояния пересоздаёт экран — локальные состояния (выбранный этаж, шторки) стартуют заново */}
            <SpirePreviewProvider key={`${state}|${overrides.tier ?? ''}|${overrides.floor ?? ''}|${overrides.steps ?? ''}`} model={model}>
              <SpireHomeScreen />
            </SpirePreviewProvider>
          </SafeAreaView>
        </ScreenGradient>
      )}
      {showDot ? (
        <Pressable testID="dev-spire-panel-dot" onPress={() => setDotOpen((v) => !v)} accessibilityRole="button" accessibilityLabel="DEV: состояния Пика" hitSlop={12} style={s.dot} />
      ) : null}
      {showStrip ? (
        <View style={s.selector} pointerEvents="box-none">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.selectorRow} decelerationRate="fast">
            {/* guard-ok: 18 коротких чипов служебной DEV-полосы, виртуализация не нужна */}
            {SPIRE_PREVIEW_STATES.map((item) => (
              <Pressable key={item} onPress={() => setState(item)} accessibilityRole="button" accessibilityState={{ selected: item === state }} style={[s.chip, item === state && s.chipOn]}>
                <Text style={s.chipText}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export default function DevSpirePreviewRoute() {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/" />;
  return <Inner />;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  // как `reportRow` боевого SpireStepScreen
  reportRow: { minHeight: 44, marginTop: 10, alignItems: 'flex-end', justifyContent: 'center' },
  selector: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  dot: { position: 'absolute', right: 4, bottom: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(60,130,255,0.9)' }, // theme-exempt: служебная DEV-точка, в релизе её нет
  selectorRow: { gap: 6, paddingHorizontal: 8, paddingVertical: 6 },
  chip: { minHeight: 32, borderRadius: 16, paddingHorizontal: 10, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.72)' }, // theme-exempt: служебная DEV-полоса, в релизе её нет
  chipOn: { backgroundColor: 'rgba(60,130,255,0.9)' }, // theme-exempt: служебная DEV-полоса, в релизе её нет
  chipText: { color: '#FFFFFF', fontSize: 13, lineHeight: 17, fontWeight: '700' }, // theme-exempt: служебная DEV-полоса, в релизе её нет
});
