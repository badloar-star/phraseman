// ═══════════════════════════════════════════════════════════════════════════
// dev_spire_scene_preview — DEV-превью «Сцены» Пика (V2 «Пьедестал перед башней») на моках: пять состояний эталона (только разработка).
//
// зачем (координатор 22.10, «Сверка»): состояния снимаются по ссылке рядом с docs/design/v2-app/peak-scene-v2.html (V2 под замком):
//   /dev_spire_scene_preview?state=day | search | eve | zero | off &theme=<id темы> &appearance=dark|light [&plus=1]
//   theme=dark|light — то же, что appearance. По умолчанию state=day, тема и оформление — как в приложении.
// Состояние НЕ подменяется: моки фактов (components/spire/scene/spire_scene_preview_fixtures.ts) идут через ту же pickSpireSceneState,
// что на экране Пика; у Plus «нет энергии» не бывает — вход покажет, что решила функция (журнал [DEV-STATE] requested/decided).
// Сцена — тот же SpireScene, кнопка — тот же SpireClimbDock в режиме «Сцены» (энергия из моков). Строка вкладок «Пик · Друзья · Наборы»
// над сценой — неподвижная заглушка вида эталона (на экране её рисует «Сообщество»). Сеть и хранилище не трогаются.
// Тема и оформление меняются ТОЛЬКО в памяти процесса (app/dev_appearance_override.ts); уходя с экрана, возвращаем прежнее.
// В релизе маршрута нет: ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную; стор-ветка router.ctx.js его вырезает.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import SpireClimbDock from '../components/spire/SpireClimbDock';
import SpireScene from '../components/spire/scene/SpireScene';
import { buildSpireSceneCopy, pickSpireSceneState, spireSceneRoom } from '../components/spire/scene/spire_scene_model';
import { SPIRE_SCENE_INK } from '../components/spire/scene/spire_scene_palette';
import {
  SPIRE_SCENE_PREVIEW_COIN_RANK,
  SPIRE_SCENE_PREVIEW_ENERGY_TIME,
  SPIRE_SCENE_PREVIEW_TIER,
  isSpireScenePreviewState,
  spireScenePreviewSetup,
  type SpireScenePreviewState,
} from '../components/spire/scene/spire_scene_preview_fixtures';
import { spireText } from '../components/spire/spire_strings';
import { spireFloorCoinsOf } from '../components/spire/spire_tower_model';
import { LIQUID_GLASS_THEME_IDS, type LiquidGlassThemeId } from '../constants/liquidGlassThemePalette';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { SPIRE_CONFIG_DEFAULTS } from '../modules/spire/config_contract';
import { spireTierName } from '../modules/spire/tier_names';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';
import { getDevAppearance, getDevThemeChoice, setDevAppearance, setDevThemeChoice } from './dev_appearance_override';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';

const noop = (): void => undefined;
const isThemeId = (value: unknown): value is LiquidGlassThemeId => typeof value === 'string' && (LIQUID_GLASS_THEME_IDS as readonly string[]).includes(value);
/** Строка вкладок «Сообщества» над сценой (высота как у шапки раздела: 58). */
const TABS_H = 58;

function Inner() {
  const params = useLocalSearchParams<{ state?: string; theme?: string; appearance?: string; plus?: string }>();
  const { lang } = useLang();
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const insets = useStableSafeAreaInsets();
  const requested: SpireScenePreviewState = isSpireScenePreviewState(params.state) ? params.state : 'day';
  const plus = params.plus === '1';
  const themeId = isThemeId(params.theme) ? params.theme : null;
  const appearanceParam = params.appearance ?? (params.theme === 'dark' || params.theme === 'light' ? params.theme : undefined);
  const wantedAppearance = appearanceParam === 'dark' || appearanceParam === 'light' ? appearanceParam : null;
  const [selected, setSelected] = useState<number | null>(null);

  // тема и оформление ссылкой: в памяти процесса, на выходе возвращаем то, что было (без записи в хранилище и облако)
  useEffect(() => {
    if (!themeId) return undefined;
    const before = getDevThemeChoice();
    setDevThemeChoice({ themeId, intensity: before?.intensity ?? null });
    return () => setDevThemeChoice(before);
  }, [themeId]);
  useEffect(() => {
    if (!wantedAppearance) return undefined;
    const before = getDevAppearance();
    setDevAppearance(wantedAppearance);
    return () => setDevAppearance(before);
  }, [wantedAppearance]);

  const setup = useMemo(() => spireScenePreviewSetup(requested, plus), [requested, plus]);
  const decision = useMemo(() => pickSpireSceneState(setup.input), [setup]);
  const room = useMemo(() => spireSceneRoom(setup.members, 'coins'), [setup]);
  const tierName = spireTierName(SPIRE_SCENE_PREVIEW_TIER, lang);
  const copy = useMemo(() => buildSpireSceneCopy(lang, decision.state, {
    tierName, msLeft: setup.msLeft, floor: setup.floor, stepDone: setup.stepDone, stepTotal: setup.stepTotal,
    perStep: SPIRE_CONFIG_DEFAULTS.coins.perStep, floorCoins: spireFloorCoinsOf(setup.floor, SPIRE_CONFIG_DEFAULTS.coins), placesToPromo: room.placesToPromo,
  }), [lang, decision.state, tierName, setup, room.placesToPromo]);
  // зачем: верх сцены уходит под часы и вкладки — как на экране Пика (эталон: сцена с самого верха)
  const sceneTop = useMemo(() => homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance, decision.state === 'eve').sceneTop, [liquidGlassThemeId, liquidGlassAppearance, decision.state]);

  useEffect(() => {
    if (params.state !== undefined && !isSpireScenePreviewState(params.state)) console.warn(`[DEV-STATE] spire_scene_preview state=${params.state} неизвестно → day`); // guard-ok: dev-маршрут, причина подмены параметра
    console.log(`[DEV-STATE] spire_scene_preview route requested=${requested} decided=${decision.state} reason=${decision.reason} offlineLine=${String(decision.offlineLine)} theme=${themeId ?? 'приложение'} appearance=${wantedAppearance ?? `${liquidGlassAppearance} (приложение)`} plus=${String(plus)} place=${String(room.myPlace)} toPromo=${String(room.placesToPromo)} input=${JSON.stringify(setup.input)}`); // guard-ok: dev-маршрут, в релизе не открывается (Redirect на Главную)
  }, [requested, decision, params.state, themeId, wantedAppearance, liquidGlassAppearance, plus, room, setup]);

  const tabs = [
    spireText(lang, 'title'),
    triLang(lang, { ru: 'Друзья', uk: 'Друзі', en: 'Friends', es: 'Amigos', 'pt-BR': 'Amigos', vi: 'Bạn bè', id: 'Teman', tr: 'Arkadaşlar', pl: 'Znajomi' }),
    triLang(lang, { ru: 'Наборы', uk: 'Набори', en: 'Packs', es: 'Packs', 'pt-BR': 'Pacotes', vi: 'Bộ thẻ', id: 'Paket', tr: 'Paketler', pl: 'Zestawy' }),
  ];
  const energyText = plus ? '∞' : String(setup.energy);
  // guard-ok: три вкладки-заглушки, не список — виртуализация не нужна
  const tabViews = tabs.map((label, i) => (
    <View key={label} style={[s.tab, i === 0 ? s.tabOn : null]}>
      <Text style={[s.tabText, { color: i === 0 ? SPIRE_SCENE_INK.text : SPIRE_SCENE_INK.muted }]}>{label}</Text>
    </View>
  ));
  return (
    <View style={s.root} testID="dev-spire-scene-preview">
      <ScreenGradient>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <View style={{ height: insets.top, backgroundColor: sceneTop }} />
          <View style={[s.tabsRow, { backgroundColor: sceneTop }]} testID="dev-spire-scene-tabs">
            {tabViews}
            <View style={s.energy}>
              <Ionicons name="flash" size={16} color={!plus && setup.energy <= 0 ? SPIRE_SCENE_INK.warm : SPIRE_SCENE_INK.text} />
              <Text style={[s.energyText, { color: !plus && setup.energy <= 0 ? SPIRE_SCENE_INK.warm : SPIRE_SCENE_INK.text }]}>{energyText}</Text>
            </View>
          </View>
          {/* key: смена состояния, Plus или темы пересоздаёт сцену — как новый показ Пика (башня снова у своего этажа) */}
          <SpireScene
            key={`${requested}|${plus ? 'plus' : 'free'}|${themeId ?? 'app'}|${wantedAppearance ?? 'app'}`}
            lang={lang}
            decision={decision}
            copy={copy}
            room={room}
            rankBy="coins"
            tierName={tierName}
            myCoinRank={SPIRE_SCENE_PREVIEW_COIN_RANK}
            myPlus={plus}
            myFloor={setup.floor}
            selected={selected ?? setup.floor}
            onSelect={setSelected}
            rivalsByFloor={setup.rivals}
            tier={SPIRE_SCENE_PREVIEW_TIER}
            onOpenAll={noop}
            energyTime={SPIRE_SCENE_PREVIEW_ENERGY_TIME}
          />
          <View style={s.tail} />
        </ScrollView>
        <View style={[s.dock, { bottom: insets.bottom + 16 }]} pointerEvents="box-none">
          <SpireClimbDock
            lang={lang}
            ready={decision.state !== 'search'}
            busy={false}
            premium={plus}
            block={null}
            onClimb={noop}
            scene
            searching={decision.state === 'search'}
            previewEnergy={{ zero: !plus && setup.energy <= 0, time: SPIRE_SCENE_PREVIEW_ENERGY_TIME }}
          />
        </View>
      </ScreenGradient>
    </View>
  );
}

export default function DevSpireScenePreviewRoute() {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/" />;
  return <Inner />;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1 },
  // заглушка строки вкладок «Сообщества» поверх цвета сцены (эталон: вкладки белым на сцене, «Пик» с чертой)
  tabsRow: { height: TABS_H, flexDirection: 'row', alignItems: 'flex-end', gap: 22, paddingHorizontal: V2.screenPad, paddingBottom: 4 },
  tab: { paddingBottom: 8 },
  tabOn: { borderBottomWidth: 3, borderBottomColor: SPIRE_SCENE_INK.text }, // shadow-ok: черта активной вкладки — индикатор выбора, не контейнер
  tabText: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  energy: { marginLeft: 'auto', marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 3 },
  energyText: { fontSize: 16, lineHeight: 21, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tail: { height: 220 },
  dock: { position: 'absolute', left: V2.screenPad, right: V2.screenPad },
});
