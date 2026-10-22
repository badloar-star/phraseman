// ═══════════════════════════════════════════════════════════
// dev_home_scene_preview — DEV-превью «Сцены» Главной на моках: десять героев (только разработка).
//
// зачем (координатор 22.10, «Сверка»: без подмены воспроизводятся только «Новичок» и «Продолжить»): все десять героев снимаются по ссылке
// рядом с docs/design/v2-app/home-scene-states.html, боевая Главная не подменяется и ничего не читается из сети:
//   /dev_home_scene_preview?state=newbie | continue | streak_risk | day_done | no_energy | offline | exam_ready | streak_lost | welcome_back | all_done
//                          &theme=<id темы: graphite, polar … marine и 10 градиентных> &appearance=dark|light [&plus=1]
//   theme=dark|light — то же, что appearance (как у других превью). По умолчанию state=continue, тема и оформление — как в приложении.
// Состояние НЕ подменяется: моки фактов телефона (components/home/v2/scene/home_scene_preview_fixtures.ts) идут через ту же pickHomeSceneState,
// что на Главной, — так проверяется и приоритет. Решила иначе (у Plus нет «нет энергии» и «серия прервалась») — журнал [DEV-STATE] пишет
// requested, decided и причину. Вид — тот же HomeSceneView, что у Главной; полосу под часами Главной превью не трогает (statusTint=false).
// Шапка — та же HomeV2Header в тоне сцены; колокольчик и аватар — неподвижные заглушки того же вида (без входящих и историй, без чтений).
// Тема и оформление меняются ТОЛЬКО в памяти процесса (app/dev_appearance_override.ts); уходя с экрана, возвращаем прежнее.
// В релизе маршрута нет: ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную. Охраняет tests/home_scene_preview_contract.test.ts.
// ═══════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { coinRankDisplaySource } from '../components/coins/coin_rank_display';
import HomeV2Header from '../components/home/v2/HomeV2Header';
import { HomeSceneView, useHomeSceneStageTokens } from '../components/home/v2/scene/HomeScene';
import { HomeSceneEnergyView } from '../components/home/v2/scene/HomeSceneEnergy';
import {
  homeScenePreviewHeaderWords,
  homeScenePreviewPlace,
  homeScenePreviewSetup,
  isHomeScenePreviewState,
  type HomeScenePreviewState,
} from '../components/home/v2/scene/home_scene_preview_fixtures';
import { pickHomeSceneState } from '../components/home/v2/scene/home_scene_state';
import { STORY_RING_SLOT } from '../components/stories/story_ring_constants';
import { nestedBoxShadow, useShadowGlass } from '../components/v2/ShadowSurface';
import { colorWithAlpha } from '../components/v2/plateAlpha';
import { useV2Palette } from '../components/v2/useV2Palette';
import { LIQUID_GLASS_THEME_IDS, type LiquidGlassThemeId } from '../constants/liquidGlassThemePalette';
import { V2 } from '../constants/v2Style';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';
import { getDevAppearance, getDevThemeChoice, setDevAppearance, setDevThemeChoice } from './dev_appearance_override';
import { homeContinueV2Title } from './home_continue_mark';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';

const noop = (): void => undefined;
/** Монета аватара и плашки монет — как в эталоне (ранг 5). */
const PREVIEW_COIN_RANK = 5;
const isThemeId = (value: unknown): value is LiquidGlassThemeId => typeof value === 'string' && (LIQUID_GLASS_THEME_IDS as readonly string[]).includes(value);

function Inner() {
  const params = useLocalSearchParams<{ state?: string; theme?: string; appearance?: string; plus?: string }>();
  const { lang } = useLang();
  const { liquidGlassAppearance } = useTheme();
  const v2 = useV2Palette();
  const shadowGlass = useShadowGlass();
  const insets = useStableSafeAreaInsets();
  const requested: HomeScenePreviewState = isHomeScenePreviewState(params.state) ? params.state : 'continue';
  const plus = params.plus === '1';
  const themeId = isThemeId(params.theme) ? params.theme : null;
  const appearanceParam = params.appearance ?? (params.theme === 'dark' || params.theme === 'light' ? params.theme : undefined);
  const wantedAppearance = appearanceParam === 'dark' || appearanceParam === 'light' ? appearanceParam : null;

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

  const setup = useMemo(() => homeScenePreviewSetup(requested, plus), [requested, plus]);
  const decision = useMemo(() => pickHomeSceneState(setup.input), [setup]);
  const place = useMemo(() => homeScenePreviewPlace(lang, setup, homeContinueV2Title), [lang, setup]);
  const words = useMemo(() => homeScenePreviewHeaderWords(lang, setup.streakDays), [lang, setup.streakDays]);
  const artTone = liquidGlassAppearance === 'light' ? 'light' : 'dark';
  // зачем: на Главной под часами — полоса верхнего цвета сцены (HomeSceneStatusStrip); превью рисует такую же у себя, а не на Главной
  const sceneTop = useHomeSceneStageTokens(decision.state === 'streak_risk').sceneTop;

  useEffect(() => {
    if (params.state !== undefined && !isHomeScenePreviewState(params.state)) console.warn(`[DEV-STATE] home_scene_preview state=${params.state} неизвестно → continue`); // guard-ok: dev-маршрут, причина подмены параметра
    if (params.theme !== undefined && !themeId && !wantedAppearance) console.warn(`[DEV-STATE] home_scene_preview theme=${params.theme} неизвестна → тема приложения`); // guard-ok: dev-маршрут, причина подмены параметра
    console.log(`[DEV-STATE] home_scene_preview route requested=${requested} decided=${decision.state} match=${String(decision.state === requested)} reason=${decision.reason} offlineLine=${String(decision.offlineLine)} theme=${themeId ?? 'приложение'} appearance=${wantedAppearance ?? `${liquidGlassAppearance} (приложение)`} plus=${String(plus)} input=${JSON.stringify(setup.input)}`); // guard-ok: dev-маршрут, в релизе не открывается (Redirect на Главную)
  }, [requested, decision, params.state, params.theme, themeId, wantedAppearance, liquidGlassAppearance, plus, setup]);

  const coinSource = useMemo(() => coinRankDisplaySource(PREVIEW_COIN_RANK, STORY_RING_SLOT), []);
  const header = useCallback((surface: string) => (
    <HomeV2Header
      tone="scene"
      avatarPlus={{ plus, surface }}
      bellSlot={(
        <View testID="dev-home-scene-bell" style={[s.bell, { backgroundColor: colorWithAlpha(v2.glassRaised, 0.5), boxShadow: nestedBoxShadow(shadowGlass) }]}>
          <Ionicons name="notifications-outline" size={22} color={v2.textSecondary} />
        </View>
      )}
      avatarSlot={<Image testID="dev-home-scene-avatar" accessible={false} source={coinSource} style={s.avatar} contentFit="contain" />}
      stats={[
        {
          testID: 'home-v2-streak',
          icon: <Ionicons name={setup.streakToday === 'pending' ? 'flame-outline' : 'flame'} size={20} color={v2.iconTint} />,
          value: words.days,
          label: words.streak, // зачем: 22.10 владелец — без текста «Сегодня ещё нет», состояние несёт только огонёк
          accessibilityLabel: `${words.streak}: ${words.days}`,
        },
        {
          testID: 'home-v2-coins',
          icon: <Image accessible={false} source={coinSource} style={s.coin} contentFit="contain" />,
          value: String(setup.coins),
          label: words.coins,
          accessibilityLabel: `${words.coins}: ${setup.coins}`,
          trailing: <HomeSceneEnergyView value={plus ? '∞' : String(setup.energy)} zero={!plus && setup.energy <= 0} />,
        },
      ]}
    />
  ), [plus, v2.glassRaised, v2.textSecondary, v2.iconTint, shadowGlass, coinSource, setup.streakToday, setup.coins, setup.energy, words]);

  return (
    <View style={s.root} testID="dev-home-scene-preview">
      <ScreenGradient>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <View style={[s.strip, { height: insets.top, backgroundColor: sceneTop }]} />
          {/* key: смена героя, Plus или темы пересоздаёт сцену — как новый показ Главной */}
          <HomeSceneView
            key={`${requested}|${plus ? 'plus' : 'free'}|${themeId ?? 'app'}|${wantedAppearance ?? 'app'}`}
            lang={lang}
            header={header}
            artTone={artTone}
            decision={decision}
            streakDays={setup.streakDays}
            daysAway={setup.daysAway}
            lostStreakDays={setup.lostStreakDays}
            minutesToMidnight={setup.minutesToMidnight}
            energyMinutes={setup.energyMinutes}
            place={place}
            pending={false}
            busy={false}
            active
            statusTint={false}
            onContinue={noop}
            onChip={noop}
          />
          <View style={s.tail} />
        </ScrollView>
      </ScreenGradient>
    </View>
  );
}

export default function DevHomeScenePreviewRoute() {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/" />;
  return <Inner />;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  // зачем: тот же боковой отступ, что у ленты Главной — сцена гасит его сама (marginHorizontal: -V2.homePad)
  content: { flexGrow: 1, paddingHorizontal: V2.homePad },
  // полоса под часами во всю ширину, как HomeSceneStatusStrip над Главной
  strip: { marginHorizontal: -V2.homePad },
  bell: { width: V2.iconButton, height: V2.iconButton, borderRadius: V2.iconButton / 2, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: STORY_RING_SLOT, height: STORY_RING_SLOT },
  coin: { width: 20, height: 20 },
  tail: { height: 160 },
});
