// ═══════════════════════════════════════════════════════════════════════════
// dev_packs_catalog_v3 — DEV-превью каталога «Сообщество → Наборы» на «Сцене» на моках (только разработка).
//
// зачем (координатор 26.10, слово владельца: «сделать каталог заново, премиально; сначала только каталог; в прод не включать; Сверка снимет в 3–4 активных темах»):
//   /dev_packs_catalog_v3?state=full|few|empty|loading|me &theme=<id темы> &appearance=dark|light &sort=popular|new
// Состояния — моки components/packs/catalog_v3/packs_catalog_v3_fixtures.ts; сеть и хранилище не трогаются. Тема и оформление меняются ТОЛЬКО в памяти процесса
// (app/dev_appearance_override.ts), на выходе возвращается прежнее. Строка вкладок «Пик · Друзья · Наборы» над сценой — неподвижная заглушка вида эталона
// (на экране её рисует «Сообщество»). В релизе маршрута нет: ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную.
// ═══════════════════════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import PacksCatalogV3 from '../components/packs/catalog_v3/PacksCatalogV3';
import type { PackFilterId } from '../components/packs/catalog_v3/PackFilterRailV3';
import { isPacksCatalogV3PreviewState, packsCatalogV3Fixtures, type PacksCatalogV3PreviewState } from '../components/packs/catalog_v3/packs_catalog_v3_fixtures';
import { SPIRE_SCENE_INK } from '../components/spire/scene/spire_scene_palette';
import { LIQUID_GLASS_THEME_IDS, type LiquidGlassThemeId } from '../constants/liquidGlassThemePalette';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';
import { getDevAppearance, getDevThemeChoice, setDevAppearance, setDevThemeChoice } from './dev_appearance_override';
import { actionToastTri, emitAppEvent } from './events';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';

const isThemeId = (value: unknown): value is LiquidGlassThemeId => typeof value === 'string' && (LIQUID_GLASS_THEME_IDS as readonly string[]).includes(value);
/** Строка вкладок «Сообщества» над каталогом (высота как у шапки раздела: 58). */
const TABS_H = 58;

function Inner() {
  const params = useLocalSearchParams<{ state?: string; theme?: string; appearance?: string; sort?: string }>();
  const { lang } = useLang();
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const insets = useStableSafeAreaInsets();
  const requested: PacksCatalogV3PreviewState = isPacksCatalogV3PreviewState(params.state) ? params.state : 'full';
  const themeId = isThemeId(params.theme) ? params.theme : null;
  const appearanceParam = params.appearance ?? (params.theme === 'dark' || params.theme === 'light' ? params.theme : undefined);
  const wantedAppearance = appearanceParam === 'dark' || appearanceParam === 'light' ? appearanceParam : null;
  const [sort, setSort] = useState<PackFilterId>(() => (params.sort === 'new' ? 'new' : 'popular'));
  const nowMs = useMemo(() => Date.now(), []);
  const data = useMemo(() => packsCatalogV3Fixtures(requested, nowMs), [requested, nowMs]);

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
    if (params.state !== undefined && !isPacksCatalogV3PreviewState(params.state)) console.warn(`[DEV-STATE] packs_catalog_v3 state=${params.state} неизвестно → full`); // guard-ok: dev-маршрут, причина подмены параметра
    console.log(`[DEV-STATE] packs_catalog_v3 route state=${requested} packs=${data.packs.length} loaded=${String(data.loaded)} sort=${sort} theme=${themeId ?? 'приложение'} appearance=${wantedAppearance ?? `${liquidGlassAppearance} (приложение)`}`); // guard-ok: dev-маршрут, в релизе не открывается (Redirect на Главную)
  }, [requested, params.state, data, sort, themeId, wantedAppearance, liquidGlassAppearance]);

  // зачем: «Создать набор» и открытие набора в превью ничего не меняют — тост называет действие, чтобы тап не был немым
  const toast = (text: string) => emitAppEvent('action_toast', actionToastTri('info', { ru: text, uk: text, en: text, es: text, 'pt-BR': text, vi: text, id: text, tr: text, pl: text }));

  return (
    <View testID="dev-packs-catalog-v3" style={s.root}>
      <PacksCatalogV3
        lang={lang}
        themeId={liquidGlassThemeId}
        appearance={liquidGlassAppearance}
        packs={data.packs}
        loaded={data.loaded}
        sort={sort}
        onSortChange={setSort}
        myStableId={data.myStableId}
        nowMs={nowMs}
        topInset={insets.top + TABS_H + 8}
        bottomInset={insets.bottom}
        onOpenPack={(id) => toast(`Preview: open pack ${id}`)}
        onCreate={() => toast('Preview: create a pack')}
      />
      <View pointerEvents="none" style={[s.tabsRow, { height: TABS_H + insets.top }]}>
        <Text style={s.tab}>{triLang(lang, { ru: 'Пик', uk: 'Пік', en: 'Peak', es: 'Cima', 'pt-BR': 'Pico', vi: 'Đỉnh', id: 'Puncak', tr: 'Zirve', pl: 'Szczyt' })}</Text>
        <Text style={s.tab}>{triLang(lang, { ru: 'Друзья', uk: 'Друзі', en: 'Friends', es: 'Amigos', 'pt-BR': 'Amigos', vi: 'Bạn bè', id: 'Teman', tr: 'Arkadaşlar', pl: 'Znajomi' })}</Text>
        <Text style={[s.tab, s.tabOn]}>{triLang(lang, { ru: 'Наборы', uk: 'Набори', en: 'Packs', es: 'Packs', 'pt-BR': 'Pacotes', vi: 'Bộ thẻ', id: 'Paket', tr: 'Paketler', pl: 'Zestawy' })}</Text>
      </View>
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
