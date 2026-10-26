// ═══════════════════════════════════════════════════════════════════════════
// PacksCatalogV3.tsx — каталог «Сообщество → Наборы» на «Сцене»: блок «Набор месяца», игровой фильтр, плитки в две колонки, одна кнопка «Создать набор».
//
// зачем (слово владельца 26.10: «раздел сделать заново, премиально; сцена как на Главной и Пике; минимум экранов и кнопок — на экране одно главное действие;
// компактно; плитка без карточек-превью; всё слушает активную тему»): фон — тот же фон сцены (SpireSceneBackdrop из homeSceneTokensForTheme на «Максимуме»),
// сверху блок конкурса, под ним одна дорожка фильтра, дальше плитки; главное действие «Создать набор» закреплено внизу, как «Играть» у Пика. Первый кадр —
// из уже загруженного каталога (никаких новых запросов); пока каталога нет совсем — скелет тех же размеров, а не «Загрузка…». Экран набора и подача набора —
// отдельные шаги после «да» владельца на каталог. Хост (вкладка или dev-маршрут) отдаёт данные и обработчики; здесь нет сети и хранилища.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions, type ListRenderItemInfo } from 'react-native';

import type { Lang } from '../../../constants/i18n';
import { useScaledTextStyles } from '../../../hooks/useLineScale';
import SpireSceneBackdrop from '../../spire/scene/spire_scene_backdrop';
import { SPIRE_SCENE_INK } from '../../spire/scene/spire_scene_palette';
import { colorWithAlpha } from '../../v2/plateAlpha';
import V2Pressable from '../../v2/V2Pressable';
import PackFilterRailV3, { type PackFilterId } from './PackFilterRailV3';
import PackMonthContest from './PackMonthContest';
import PackTileV3, { PACK_TILE_COVER_H, type PackTileData } from './PackTileV3';
import { packsCatalogV3Text } from './packs_catalog_v3_copy';
import { packsCatalogColors } from './packs_catalog_v3_tokens';
import { catalogOrder, contestStanding, type ContestPackInput } from './packs_contest_model';

const TEXT_MAX_SCALE = 1.3;
const SIDE = 16;
const GAP = 12;
/** Высота закреплённой кнопки и затухания под списком, dp. */
const DOCK_BUTTON_H = 56;
const DOCK_FADE_H = 132;
const SKELETON_COUNT = 6;

export type PacksCatalogV3Pack = ContestPackInput & Readonly<{ title: string }>;

type Props = Readonly<{
  lang: Lang;
  themeId: string;
  appearance: 'dark' | 'light';
  packs: readonly PacksCatalogV3Pack[];
  /** Каталог уже пришёл (тёплый снимок или сеть); false и пусто — скелет. */
  loaded: boolean;
  sort: PackFilterId;
  onSortChange: (next: PackFilterId) => void;
  myStableId: string | null;
  nowMs: number;
  /** Отступ сверху: зона часов и строка вкладок «Сообщества». */
  topInset: number;
  bottomInset: number;
  onOpenPack: (id: string) => void;
  onCreate: () => void;
}>;

function SkeletonTile({ width, fill }: Readonly<{ width: number; fill: string }>) {
  return <View style={[s.skeleton, { width, backgroundColor: fill }]} />;
}

function PacksCatalogV3({ lang, themeId, appearance, packs, loaded, sort, onSortChange, myStableId, nowMs, topInset, bottomInset, onOpenPack, onCreate }: Props) {
  const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);
  const { width: windowW, height: windowH } = useWindowDimensions();
  const colors = useMemo(() => packsCatalogColors(themeId, appearance), [themeId, appearance]);
  const backdrop = useMemo(() => ({ top: colors.scene.sceneTop, bottom: colors.scene.sceneBottom, glow: colors.scene.sceneGlow, evening: false, bleed: 0, sceneH: windowH }), [colors, windowH]);
  const contentW = windowW - SIDE * 2;
  const tileW = Math.floor((contentW - GAP) / 2);
  const standing = useMemo(() => contestStanding(packs, nowMs, myStableId), [packs, nowMs, myStableId]);
  const titles = useMemo(() => new Map(packs.map((pack) => [pack.id, pack.title] as const)), [packs]);
  const titleOf = useCallback((id: string) => titles.get(id) ?? '', [titles]);
  const tiles = useMemo<readonly PackTileData[]>(() => catalogOrder(packs, sort).map((pack) => ({
    id: pack.id, title: pack.title, authorName: pack.authorName, cardCount: Math.max(0, Math.floor(pack.cardCount) || 0), likes: Math.max(0, Math.floor(pack.likesCount ?? 0) || 0),
  })), [packs, sort]);
  const showSkeleton = !loaded && tiles.length === 0;
  const showEmpty = loaded && tiles.length === 0;
  const glass = colorWithAlpha(SPIRE_SCENE_INK.text, 0.12);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<PackTileData>) => (
    <PackTileV3 pack={item} lang={lang} colors={colors} width={tileW} onOpen={onOpenPack} />
  ), [lang, colors, tileW, onOpenPack]);

  const header = (
    <View style={s.header}>
      <PackMonthContest lang={lang} colors={colors} standing={standing} titleOf={titleOf} onOpenPack={onOpenPack} />
      <View style={s.railWrap}><PackFilterRailV3 lang={lang} value={sort} width={contentW} onChange={onSortChange} /></View>
      {showSkeleton ? (
        <View style={s.skeletonGrid} testID="packs-v3-skeleton">
          {/* guard-ok: статичный список из SKELETON_COUNT одинаковых заглушек — порядок и состав не меняются */}
          {Array.from({ length: SKELETON_COUNT }, (_, i) => <SkeletonTile key={i} width={tileW} fill={glass} />)}
        </View>
      ) : null}
      {showEmpty ? (
        <View style={[s.empty, { backgroundColor: glass }]} testID="packs-v3-empty">
          <Ionicons name="albums-outline" size={28} color={SPIRE_SCENE_INK.label} />
          <Text style={ts.emptyText} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{packsCatalogV3Text(lang, 'empty')}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View testID="packs-catalog-v3" style={s.root}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}><SpireSceneBackdrop spec={backdrop} offsetTop={0} /></View>
      <FlatList
        data={showSkeleton || showEmpty ? [] : tiles}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={s.row}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingTop: topInset, paddingHorizontal: SIDE, paddingBottom: bottomInset + DOCK_BUTTON_H + 40 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
      <View pointerEvents="none" style={[s.fade, { height: DOCK_FADE_H + bottomInset }]}>
        <LinearGradient colors={[colors.fadeFrom, colors.scene.sceneBottom]} locations={[0, 0.75]} style={StyleSheet.absoluteFill} />
      </View>
      <View style={[s.dock, { paddingBottom: Math.max(bottomInset, 12) }]}>
        <V2Pressable
          testID="packs-v3-create"
          accessibilityRole="button"
          accessibilityLabel={packsCatalogV3Text(lang, 'create')}
          withHaptic={false}
          scaleTo={0.97}
          onPress={onCreate}
          style={[s.cta, { backgroundColor: colors.cta }]}
        >
          <Ionicons name="add" size={22} color={colors.ctaInk} />
          <Text style={[ts.ctaText, { color: colors.ctaInk }]} numberOfLines={1} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{packsCatalogV3Text(lang, 'create')}</Text>
        </V2Pressable>
      </View>
    </View>
  );
}

export default memo(PacksCatalogV3);

const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  header: { paddingBottom: GAP },
  railWrap: { marginTop: 16, marginBottom: 4 },
  row: { gap: GAP, marginTop: GAP },
  skeletonGrid: { marginTop: GAP, flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  skeleton: { height: PACK_TILE_COVER_H + 112, borderRadius: 22 },
  empty: { marginTop: GAP, minHeight: 120, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  emptyText: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: SPIRE_SCENE_INK.text, textAlign: 'center' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: SIDE },
  cta: { minHeight: DOCK_BUTTON_H, borderRadius: DOCK_BUTTON_H / 2, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
});
