// ═══════════════════════════════════════════════════════════════════════════
// dev_packs_catalog_v3 — DEV-фотостудия макета «Сообщество → Наборы» на «Сцене» на моках (только разработка; к навигации приложения НЕ подключена).
//
// зачем (координатор 26.10, слово владельца: «сначала ОДИН макет со всеми экранами, в приложении ничего не делать до одобрения; Сверка снимает, координатор собирает макет»):
//   /dev_packs_catalog_v3?state=<состояние> &theme=<id темы> &appearance=dark|light &sort=popular|new
//   каталог:   full | few | empty | loading | me
//   экраны:    pack | pack-added (экран набора) · submit | submit-clean | submit-checking (подача набора) · rules (условия участия) · win1 | win2 | win3 (окно победителя)
// Данные — моки components/packs/catalog_v3/packs_catalog_v3_fixtures.ts; сеть и хранилище не трогаются. Тема и оформление меняются ТОЛЬКО в памяти процесса
// (app/dev_appearance_override.ts), на выходе возвращается прежнее. Кнопки в студии ничего не покупают и не публикуют: локальное состояние (лайк, «добавлено», «исправить») меняется
// мгновенно, остальное — тост «Preview». Строка вкладок «Пик · Друзья · Наборы» над каталогом — неподвижная заглушка вида эталона.
// В релизе маршрута нет: ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную; стор-ветка router.ctx.js его вырезает.
// ═══════════════════════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import PackContestRulesV3 from '../components/packs/catalog_v3/PackContestRulesV3';
import PackScreenV3 from '../components/packs/catalog_v3/PackScreenV3';
import PackSubmitV3, { type PackSubmitCard, type PackSubmitPhase } from '../components/packs/catalog_v3/PackSubmitV3';
import PackWinnerV3, { type PackWinnerPlace } from '../components/packs/catalog_v3/PackWinnerV3';
import PacksCatalogV3 from '../components/packs/catalog_v3/PacksCatalogV3';
import type { PackFilterId } from '../components/packs/catalog_v3/PackFilterRailV3';
import {
  PACK_SCREEN_FIXTURE,
  PACK_SUBMIT_FIXTURE,
  PACK_WINNER_FIXTURE,
  isPacksCatalogV3PreviewState,
  isPacksScreenState,
  packsCatalogV3Fixtures,
  type PacksCatalogV3PreviewState,
  type PacksScreenState,
} from '../components/packs/catalog_v3/packs_catalog_v3_fixtures';
import { packsCatalogColors } from '../components/packs/catalog_v3/packs_catalog_v3_tokens';
import { SPIRE_SCENE_INK } from '../components/spire/scene/spire_scene_palette';
import { triLang } from '../constants/i18n';
import { LIQUID_GLASS_THEME_IDS, type LiquidGlassThemeId } from '../constants/liquidGlassThemePalette';
import { V2 } from '../constants/v2Style';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';
import { getDevAppearance, getDevThemeChoice, setDevAppearance, setDevThemeChoice } from './dev_appearance_override';
import { actionToastTri, emitAppEvent } from './events';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';

const isThemeId = (value: unknown): value is LiquidGlassThemeId => typeof value === 'string' && (LIQUID_GLASS_THEME_IDS as readonly string[]).includes(value);
/** Строка вкладок «Сообщества» над каталогом (высота как у шапки раздела: 58). */
const TABS_H = 58;

type Insets = Readonly<{ top: number; bottom: number }>;

/** Тост превью: действие названо, чтобы тап не был немым (в студии оно ничего не делает). */
function previewToast(text: string): void {
  emitAppEvent('action_toast', actionToastTri('info', { ru: text, uk: text, en: text, es: text, 'pt-BR': text, vi: text, id: text, tr: text, pl: text }));
}

function CatalogStudio({ state, sort: initialSort, themeId, appearance, insets }: Readonly<{ state: PacksCatalogV3PreviewState; sort: PackFilterId; themeId: string; appearance: 'dark' | 'light'; insets: Insets }>) {
  const { lang } = useLang();
  const [sort, setSort] = useState<PackFilterId>(initialSort);
  const nowMs = useMemo(() => Date.now(), []);
  const data = useMemo(() => packsCatalogV3Fixtures(state, nowMs), [state, nowMs]);
  return (
    <View style={s.root}>
      <PacksCatalogV3
        lang={lang}
        themeId={themeId}
        appearance={appearance}
        packs={data.packs}
        loaded={data.loaded}
        sort={sort}
        onSortChange={setSort}
        myStableId={data.myStableId}
        nowMs={nowMs}
        topInset={insets.top + TABS_H + 8}
        bottomInset={insets.bottom}
        onOpenPack={(id) => previewToast(`Preview: open pack ${id}`)}
        onCreate={() => previewToast('Preview: create a pack')}
      />
      <View pointerEvents="none" style={[s.tabsRow, { height: TABS_H + insets.top }]}>
        <Text style={s.tab}>{triLang(lang, { ru: 'Пик', uk: 'Пік', en: 'Peak', es: 'Cima', 'pt-BR': 'Pico', vi: 'Đỉnh', id: 'Puncak', tr: 'Zirve', pl: 'Szczyt' })}</Text>
        <Text style={s.tab}>{triLang(lang, { ru: 'Друзья', uk: 'Друзі', en: 'Friends', es: 'Amigos', 'pt-BR': 'Amigos', vi: 'Bạn bè', id: 'Teman', tr: 'Arkadaşlar', pl: 'Znajomi' })}</Text>
        <Text style={[s.tab, s.tabOn]}>{triLang(lang, { ru: 'Наборы', uk: 'Набори', en: 'Packs', es: 'Packs', 'pt-BR': 'Pacotes', vi: 'Bộ thẻ', id: 'Paket', tr: 'Paketler', pl: 'Zestawy' })}</Text>
      </View>
    </View>
  );
}

function ScreenStudio({ state, themeId, appearance, insets }: Readonly<{ state: PacksScreenState; themeId: string; appearance: 'dark' | 'light'; insets: Insets }>) {
  const { lang } = useLang();
  const colors = useMemo(() => packsCatalogColors(themeId, appearance), [themeId, appearance]);
  const top = insets.top + 8;
  // экран набора: «добавлено» и лайк — мгновенно в самом экране (optimistic), сеть догоняла бы фоном
  const [added, setAdded] = useState(state === 'pack-added');
  const [liked, setLiked] = useState(state === 'pack-added');
  // подача: применённая правка убирает замечание у карточки сразу; фаза выводится из состояния карточек
  const [cards, setCards] = useState<readonly PackSubmitCard[]>(() => (state === 'submit-clean'
    ? PACK_SUBMIT_FIXTURE.cards.map((card) => ({ front: 'fix' in card && card.fix ? card.fix : card.front, back: card.back }))
    : PACK_SUBMIT_FIXTURE.cards));
  const applyFix = useCallback((index: number) => {
    setCards((prev) => prev.map((card, i) => (i === index && card.fix ? { front: card.fix, back: card.back } : card)));
  }, []);
  const phase: PackSubmitPhase = state === 'submit-checking' ? 'checking' : cards.some((card) => !!card.fix) ? 'issues' : 'clean';
  useEffect(() => {
    console.log(`[DEV-STATE] packs_screen_v3 state=${state} phase=${state.startsWith('submit') ? phase : '-'} theme=${themeId} appearance=${appearance}`); // guard-ok: dev-маршрут, в релизе не открывается
  }, [state, phase, themeId, appearance]);
  const back = () => previewToast('Preview: back');

  if (state === 'pack' || state === 'pack-added') {
    return (
      <PackScreenV3 lang={lang} colors={colors} pack={PACK_SCREEN_FIXTURE.pack} cards={PACK_SCREEN_FIXTURE.cards} added={added} liked={liked} topInset={top} bottomInset={insets.bottom}
        onBack={back} onAdd={() => setAdded(true)} onLike={() => setLiked((value) => !value)} />
    );
  }
  if (state === 'submit' || state === 'submit-clean' || state === 'submit-checking') {
    return (
      <PackSubmitV3 lang={lang} colors={colors} phase={phase} languageName={PACK_SUBMIT_FIXTURE.languageName} name={PACK_SUBMIT_FIXTURE.name} cards={cards} topInset={top} bottomInset={insets.bottom}
        onBack={back} onApplyFix={applyFix} onPublish={() => previewToast('Preview: publish and take part')} />
    );
  }
  if (state === 'rules') {
    return <PackContestRulesV3 lang={lang} colors={colors} topInset={top} bottomInset={insets.bottom} onBack={back} onDone={() => previewToast('Preview: got it')} />;
  }
  const place: PackWinnerPlace = state === 'win1' ? 1 : state === 'win2' ? 2 : 3;
  return <PackWinnerV3 lang={lang} colors={colors} place={place} pack={PACK_WINNER_FIXTURE} topInset={top + 24} bottomInset={insets.bottom} onClaim={() => previewToast('Preview: claim the prize')} />;
}

function Inner() {
  const params = useLocalSearchParams<{ state?: string; theme?: string; appearance?: string; sort?: string }>();
  const { liquidGlassAppearance, liquidGlassThemeId } = useTheme();
  const insets = useStableSafeAreaInsets();
  const themeId = isThemeId(params.theme) ? params.theme : null;
  const appearanceParam = params.appearance ?? (params.theme === 'dark' || params.theme === 'light' ? params.theme : undefined);
  const wantedAppearance = appearanceParam === 'dark' || appearanceParam === 'light' ? appearanceParam : null;
  const screenState = isPacksScreenState(params.state) ? params.state : null;
  const catalogState: PacksCatalogV3PreviewState = isPacksCatalogV3PreviewState(params.state) ? params.state : 'full';

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

  useEffect(() => {
    if (params.state !== undefined && !screenState && !isPacksCatalogV3PreviewState(params.state)) console.warn(`[DEV-STATE] packs_catalog_v3 state=${params.state} неизвестно → full`); // guard-ok: dev-маршрут, причина подмены параметра
    console.log(`[DEV-STATE] packs_catalog_v3 route state=${screenState ?? catalogState} kind=${screenState ? 'screen' : 'catalog'} theme=${themeId ?? 'приложение'} appearance=${wantedAppearance ?? `${liquidGlassAppearance} (приложение)`}`); // guard-ok: dev-маршрут, в релизе не открывается (Redirect на Главную)
  }, [params.state, screenState, catalogState, themeId, wantedAppearance, liquidGlassAppearance]);

  return (
    <View testID="dev-packs-catalog-v3" style={s.root}>
      {screenState
        ? <ScreenStudio state={screenState} themeId={liquidGlassThemeId} appearance={liquidGlassAppearance} insets={insets} />
        : <CatalogStudio state={catalogState} sort={params.sort === 'new' ? 'new' : 'popular'} themeId={liquidGlassThemeId} appearance={liquidGlassAppearance} insets={insets} />}
    </View>
  );
}

export default function DevPacksCatalogV3Route() {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/" />;
  return <Inner />;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  // заглушка строки вкладок «Сообщества» поверх сцены (вкладки белым, активная — жирнее)
  tabsRow: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 22, paddingHorizontal: V2.screenPad, paddingBottom: 12 },
  tab: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: SPIRE_SCENE_INK.muted },
  tabOn: { fontWeight: '800', color: SPIRE_SCENE_INK.text },
});
