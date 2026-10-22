// ═══════════════════════════════════════════════════════════
// dev_dialogs_scene_preview — DEV-превью «Сцены» «Диалогов» на моках (только разработка).
//
// зачем (координатор 21.10, Сверка): все восемь состояний входа в «Диалоги» снимаются по ссылке рядом с docs/design/v2-app/dialogs-scene-states.html,
// боевой раздел не подменяется и ничего не читается из сети:
//   /dev_dialogs_scene_preview?state=consent | offline | limit | first | low | all_done | day_done | next &theme=dark|light [&plus=1] [&narrow=1]
//   номер состояния в эталоне = приоритет: consent 1, offline 2, limit 3, first 4, low 5, all_done 6, day_done 7, next 8. По умолчанию state=next.
//   plus=1 — тот же экран у Plus («∞ Без лимита», без «лимит/мало»); narrow=1 — ширина 360 (проверка «ничего не обрезано»).
// Состояние выбирает НАСТОЯЩАЯ функция pickDialogsSceneState по входу из моков (components/dialogs/scene/dialogs_scene_preview_fixtures.ts) — вместе с приоритетом.
// Тема меняется ТОЛЬКО в памяти процесса (app/dev_appearance_override.ts); уходя с экрана, возвращаем прежнее. Лист согласия эталона (consentSheet) — отдельный
// настоящий экран согласия, в превью не рисуется.
// В релизе маршрута нет: ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную. Охраняет tests/dialogs_scene_preview_contract.test.ts.
// ═══════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import EnergyBar from '../components/EnergyBar';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import DialogsScene from '../components/dialogs/scene/DialogsScene';
import DialogsScenePanel, { DialogsScenePlusPanel } from '../components/dialogs/scene/DialogsScenePanel';
import { dialogsSceneText } from '../components/dialogs/scene/dialogs_scene_copy';
import {
  DIALOGS_SCENE_PREVIEW_QUOTA_TOTAL,
  DIALOGS_SCENE_PREVIEW_TOTAL,
  DIALOGS_SCENE_PREVIEW_VOICE_PER_DAY,
  DIALOGS_SCENE_PREVIEW_WORLDS,
  dialogsScenePreviewCards,
  dialogsScenePreviewSetup,
  isDialogsScenePreviewState,
  type DialogsScenePreviewState,
} from '../components/dialogs/scene/dialogs_scene_preview_fixtures';
import { V2IconButton } from '../components/v2/V2Kit';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { getDevAppearance, setDevAppearance } from './dev_appearance_override';

const noop = (): void => undefined;
const NARROW_WIDTH = 360;

function Inner() {
  const params = useLocalSearchParams<{ state?: string; theme?: string; plus?: string; narrow?: string }>();
  const { lang } = useLang();
  const { isDark } = useTheme();
  const insets = useStableSafeAreaInsets();
  const state: DialogsScenePreviewState = isDialogsScenePreviewState(params.state) ? params.state : 'next';
  const wanted = params.theme === 'dark' || params.theme === 'light' ? params.theme : null;
  const plus = params.plus === '1';
  const narrow = params.narrow === '1';
  const [world, setWorld] = useState('all');

  // тема ссылкой: в памяти процесса, на выходе возвращаем то, что было (без записи в хранилище и облако)
  useEffect(() => {
    if (!wanted) return undefined;
    const before = getDevAppearance();
    setDevAppearance(wanted);
    return () => setDevAppearance(before);
  }, [wanted]);

  const setup = useMemo(() => dialogsScenePreviewSetup(state, plus), [state, plus]);
  const cards = useMemo(() => dialogsScenePreviewCards(lang), [lang]);
  const plusRows = useMemo(() => [
    { icon: 'infinite' as const, label: dialogsSceneText(lang, 'plusRowDialogs') },
    { icon: 'mic' as const, label: dialogsSceneText(lang, 'plusRowVoice') },
    { icon: 'flash' as const, label: dialogsSceneText(lang, 'plusRowLessons') },
  ], [lang]);

  useEffect(() => {
    console.log(`[DEV-STATE] dialogs_scene_preview route state=${state} fromParam=${String(params.state ?? 'нет→next')} theme=${wanted ?? (isDark ? 'dark' : 'light')} fromParam=${String(params.theme ?? 'нет→приложение')} plus=${String(plus)} narrow=${String(narrow)} input=${JSON.stringify(setup.input)}`); // guard-ok: dev-маршрут, в релизе не открывается (Redirect на Главную)
  }, [state, params.state, params.theme, wanted, isDark, plus, narrow, setup]);

  return (
    <View style={s.root} testID="dev-dialogs-scene-preview">
      <ScreenGradient>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, narrow ? s.narrow : null]}>
          {/* key: смена состояния пересоздаёт экран — мягкое появление героя и фильтр миров стартуют заново */}
          <DialogsScene
            key={`${state}|${plus ? 'plus' : 'free'}|${wanted ?? 'app'}`}
            lang={lang}
            input={setup.input}
            dialog={setup.dialog}
            following={setup.following}
            quotaTotal={DIALOGS_SCENE_PREVIEW_QUOTA_TOTAL}
            resetDate={setup.resetDate}
            voicePerDay={DIALOGS_SCENE_PREVIEW_VOICE_PER_DAY}
            topInset={insets.top + 8}
            topStart={<V2IconButton testID="dev-dialogs-scene-back" icon="chevron-back" accessibilityLabel="Back" onPress={noop} />}
            topEnd={<EnergyBar size={30} glass solidBolt />}
            onCta={noop}
            onRound={noop}
          />
          {state === 'limit'
            ? <DialogsScenePlusPanel rows={plusRows} />
            : (
              <DialogsScenePanel
                title={dialogsSceneText(lang, 'dialogs')}
                count={String(DIALOGS_SCENE_PREVIEW_TOTAL)}
                worlds={DIALOGS_SCENE_PREVIEW_WORLDS}
                worldId={world}
                onWorld={setWorld}
                cards={cards}
                onCard={noop}
              />
            )}
          <View style={s.tail} />
        </ScrollView>
      </ScreenGradient>
    </View>
  );
}

export default function DevDialogsScenePreviewRoute() {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/" />;
  return <Inner />;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1 },
  // проверка «ничего не обрезано» на узком экране: колонка 360 по центру
  narrow: { width: NARROW_WIDTH, alignSelf: 'center' },
  tail: { height: 140 },
});
