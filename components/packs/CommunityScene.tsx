/** Native counterpart of community-scene-v3; geometry follows the approved 430 dp reference. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { memo, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AppState, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { KitTouchable } from '../KitTouchable';
import { useTheme } from '../ThemeContext';
import { useIsTabPage } from '../tab_top_bleed';
import { useTabNav } from '../../app/TabContext';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { homeSceneTokensForTheme, homeSceneOklchOf } from '../home/v2/scene/home_scene_tokens';
import { coinRankRowForDisplay } from '../../app/coin_rank_table_v1';
import { useCommunityAuthor } from '../../app/community_packs/packAuthorNames';
import { packTitleForInterface, type FlashcardMarketPack } from '../../app/flashcards/marketplace';
import type { Lang } from '../../constants/i18n';
import { communityContestSchedule, contestMonth } from '../../shared/community_month_contest';

import { packSocialLive } from '../../app/community_packs/packSocialLive';
import { callCommunityMonthGetRanking } from '../../app/community_packs/functionsClient';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../../app/account_generation';
import { DebugLogger } from '../../app/debug-logger';
// зачем (координатор 29.10, Переводчик): LP раньше отдавал украинцу и испанцу английский — теперь 9 языков по словарю
import { communityDaysLabel, communityDaysLeftLabel, communitySceneText } from './community_scene_strings';
import { communityTilePropsEqual } from './community_tile_props_equal';

export type CommunitySceneAuthor = Readonly<{ name: string; coinRank: number; isPremium: boolean }>;
export const communityScenePanelStyle = StyleSheet.create({ panel: {
  marginTop: -38, marginHorizontal: 16, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
} }).panel;
const WHITE = '#FFFFFF'; // theme-exempt: foreground on the dark stage, same as the approved mock.
const GLASS = 'rgba(255,255,255,0.17)'; // theme-exempt: translucent stage material.
const FAN = require('../../assets/images/community_scene/community_16_steel_blueprint_fan.webp');
const FANS = {
  coral: require('../../assets/images/community_scene/community_02_coral_sunset_fan.webp'),
  violet: require('../../assets/images/community_scene/community_03_violet_nebula_fan.webp'),
  glacier: require('../../assets/images/community_scene/community_07_glacier_blue_fan.webp'),
  obsidian: require('../../assets/images/community_scene/community_11_obsidian_star_fan.webp'),
  coffee: require('../../assets/images/community_scene/community_19_coffee_leather_fan.webp'),
  ocean: require('../../assets/images/community_scene/community_26_ocean_pearl_fan.webp'),
  cloud: require('../../assets/images/community_scene/community_28_cloud_silver_fan.webp'),
};

export function CommunitySceneFan({ size = 224, top = 92, right = -18 }: Readonly<{ size?: number; top?: number; right?: number }> = {}): React.JSX.Element {
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const accent = liquidGlassTokens(liquidGlassThemeId).accent;
  const n = parseInt(accent.slice(1, 7), 16);
  const [, c, h] = homeSceneOklchOf([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  const source = c < .03 ? (liquidGlassAppearance === 'dark' ? FANS.obsidian : FANS.cloud)
    : h < 30 || h >= 330 ? FANS.coral : h < 100 ? FANS.coffee : h < 228 ? FANS.ocean
    : h < 244 ? FANS.glacier : h < 270 ? FAN : FANS.violet;
  return <Image source={source} contentFit="contain" style={[s.fan, { width: size, height: size, top, right }]} accessibilityElementsHidden />;
}

export function CommunitySceneBackdrop(): React.JSX.Element {
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const c = homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance);
  // SVG stops replace the color's alpha; preserve the scene token's opacity explicitly.
  const rgbaGlow = /^rgba\((.+),([\d.]+)\)$/.exec(c.sceneGlow);
  const hexAlpha = /^#[\da-f]{8}$/i.test(c.sceneGlow);
  const glowColor = rgbaGlow ? `rgb(${rgbaGlow[1]})` : hexAlpha ? c.sceneGlow.slice(0, 7) : c.sceneGlow;
  const glowOpacity = rgbaGlow ? Number(rgbaGlow[2]) : hexAlpha ? parseInt(c.sceneGlow.slice(7), 16) / 255 : 1;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <LinearGradient colors={[c.sceneTop, c.sceneBottom]} start={{ x: .22, y: 0 }} end={{ x: .78, y: 1 }} style={StyleSheet.absoluteFill} />
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs><RadialGradient id="communitySceneLight" cx="18%" cy="0%" rx="70%" ry="50%" fx="18%" fy="0%">
        <Stop offset="0" stopColor={glowColor} stopOpacity={glowOpacity} /><Stop offset="0.7" stopColor={glowColor} stopOpacity="0" />
      </RadialGradient></Defs>
      <Rect width="100%" height="100%" fill="url(#communitySceneLight)" />
    </Svg>
    {/* зачем (приказ владельца 04–05.11: «убрать любое затемнение низа сцены везде»): тёмный градиент снизу сцены сообщества удалён */}
  </View>;
}

function AuthorCoin({ pack, lang, size = 22, authorOverride }: Readonly<{ pack: FlashcardMarketPack; lang: Lang; size?: number; authorOverride?: CommunitySceneAuthor }>): React.JSX.Element {
  const resolvedAuthor = useCommunityAuthor(authorOverride ? null : pack, lang);
  const author = authorOverride ?? resolvedAuthor;
  return <Image source={coinRankRowForDisplay(author.coinRank ?? 0).source} style={{ width: size, height: size }} contentFit="contain" accessibilityElementsHidden />;
}

function CommunitySceneTileImpl({ pack, lang, likes, onOpen, onLongPress, authorOverride, heart }: Readonly<{
  pack: FlashcardMarketPack; lang: Lang; likes: number; onOpen: () => void; onLongPress?: () => void; authorOverride?: CommunitySceneAuthor; heart?: React.ReactNode;
  /** Больше не рисуется (место набора убрано, 05.11); поле оставлено, чтобы вызовы превью не ломались. */
  referencePlace?: number;
}>): React.JSX.Element {
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  // зачем (оптимизация плиток 29.10): токены зависят только от темы — считаем на смену темы, а не на каждый рендер каждой плитки
  const { g, c } = useMemo(() => ({ g: liquidGlassTokens(liquidGlassThemeId), c: homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance) }), [liquidGlassThemeId, liquidGlassAppearance]);
  const resolvedAuthor = useCommunityAuthor(authorOverride ? null : pack, lang);
  const author = authorOverride ?? resolvedAuthor;
  // зачем (слово владельца 05.11, «Наборы» rev8: «место набора» убрано): бейджа месячного места на плитке больше нет — ни подписки на хранилище, ни таймера месяца
  return <KitTouchable testID={`community-scene-tile-${pack.id}`} accessibilityRole="button" accessibilityLabel={packTitleForInterface(pack, lang)} onPress={onOpen} onLongPress={onLongPress} style={s.tile}>
    <LinearGradient colors={[c.sceneTop, c.sceneBottom]} style={StyleSheet.absoluteFill} />
    <LinearGradient colors={[g.accentGlow, 'transparent']} start={{ x: 1, y: 0 }} end={{ x: .3, y: .8 }} style={StyleSheet.absoluteFill} />
    <View style={s.tileCount}><Ionicons name="copy-outline" size={13} color={WHITE} /><Text style={s.count}>{pack.cardCount}</Text></View>
    <Text style={s.tileTitle}>{packTitleForInterface(pack, lang)}</Text>
    <View style={s.author}><AuthorCoin pack={pack} lang={lang} authorOverride={authorOverride} /><Text style={s.authorName}>{author.name}</Text>{heart ?? <><Ionicons name="heart-outline" size={14} color={WHITE} /><Text style={s.count}>{likes}</Text></>}</View>
  </KitTouchable>;
}

// зачем (шаг B, координатор 29.10): родитель каждый рендер собирает новые heart/onOpen/onLongPress — сравниваем только то, что меняет вид плитки; сердечко подписано на хранилище само, оптимистичное +1 не теряется
export const CommunitySceneTile = memo(CommunitySceneTileImpl, communityTilePropsEqual);

export function CommunityContestRules({ visible, lang, onClose }: Readonly<{ visible: boolean; lang: Lang; onClose: () => void }>): React.JSX.Element {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const LP = (ru: string, en: string): string => communitySceneText(lang, ru, en);
  const rows = [
    ['albums-outline', LP('Создавай и делись', 'Create and share'), LP('Опубликованные наборы доступны другим участникам: они могут добавлять их себе и учиться по твоим карточкам. Участвовать можно каждый месяц, пока набор не занял призовое место.', 'Published packs can be added and studied by other members. Packs can enter each month until they win any prize.')],
    ['heart', LP('Лучшие выбирают участники', 'Members choose the best'), LP('Понравился набор? Поставь ему сердечко. Место в конкурсе зависит только от новых сердечек за текущий месяц. Один участник может поставить набору одно сердечко.', 'Like a pack? Give it a heart. Only new hearts received this month count for the contest. Each member can give a pack one heart.')],
    ['trophy', LP('Три лучших набора — три награды', 'Three top packs, three rewards'), LP('В конце месяца авторы трёх наборов с наибольшим числом сердечек получают награды:', 'At the end of the month, the authors of the three packs with the most hearts receive rewards:')],
  ] as const;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={s.modalBackdrop}><KitTouchable accessibilityLabel={LP('Закрыть', 'Close')} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View style={[s.sheet, { backgroundColor: g.opaqueCard }]}><ScrollView decelerationRate="fast" showsVerticalScrollIndicator={false}>
        <View style={[s.grab, { backgroundColor: g.secondary }]} /><Text style={[s.sheetTitle, { color: g.text }]}>{LP('Как участвовать', 'How to take part')}</Text>
        <Text style={[s.body, { color: g.secondary }]}>{LP('Делись наборами, учись с другими и получай награды.', 'Share packs, learn together and earn rewards.')}</Text>
        {rows.map(([icon, title, body]) => <View key={icon} style={s.ruleRow}><View style={[s.ruleIcon, { backgroundColor: g.opaqueControl }]}><Ionicons name={icon} size={18} color={g.text} /></View><View style={s.ruleText}><Text style={[s.ruleTitle, { color: g.text }]}>{title}</Text><Text style={[s.ruleBody, { color: g.secondary }]}>{body}</Text></View></View>)}
        <View style={[s.prizes, { backgroundColor: g.opaqueControl }]}>{[LP('Plus на 3 месяца', '3 months of Plus'), LP('Plus на 2 месяца', '2 months of Plus'), LP('Plus на 1 месяц', '1 month of Plus')].map((prize, i) => <View key={prize} style={s.prizeRow}><Text style={[s.ruleTitle, { color: g.text }]}>{LP(`${i + 1} место`, `Place ${i + 1}`)}</Text><Text style={{ color: g.text }}>{prize}</Text></View>)}</View>
        <Text style={[s.ruleBody, { color: g.secondary, marginTop: 16 }]}>{LP('Первый конкурс — с 1 ноября 2026 года. Далее — каждый календарный месяц по UTC. Старые сердечки не переносятся в рейтинг нового месяца. Набор может участвовать снова, пока ни разу не занял 1, 2 или 3 место. После любого призового места он больше не участвует. Чужому набору можно поставить сердечко сразу, без добавления себе; сердечко можно убрать. Собственный набор поддержать нельзя.', 'The first contest starts on 1 November 2026, followed by each calendar month in UTC. Older hearts do not carry into a new month. A pack may enter again until it has placed first, second or third. Any prize place permanently ends its eligibility. Give another member’s pack a heart without adding it first; you can remove your heart. You cannot support your own pack.')}</Text>
        <Text style={[s.ruleBody, { color: g.secondary }]}>{LP('Итоги фиксируются после окончания месяца. При равном числе сердечек выше набор, опубликованный раньше. Снятые с публикации наборы и наборы без сердечек призов не получают. Если подходящих наборов меньше трёх, награждаются только они. Приз каждого набора можно получить один раз; при сбое сети он сохраняется.', 'Results are finalized after the month ends. Ties favour earlier publication. Unpublished packs and packs without hearts do not win. If fewer than three packs qualify, only those packs receive prizes. Each pack’s prize can be claimed once and remains available after a connection failure.')}</Text>
        <KitTouchable onPress={onClose} accessibilityRole="button" style={[s.button, { backgroundColor: g.cta }]}><Text style={[s.buttonText, { color: g.ctaInk }]}>{LP('Понятно', 'Got it')}</Text></KitTouchable>
      </ScrollView></View>
    </View>
  </Modal>;
}

export function CommunityContestStage({ packs, lang, authorId, topInset = 100, authors, referenceNowMs }: Readonly<{
  packs: readonly FlashcardMarketPack[]; lang: Lang; /** Оставлен для совместимости вызовов: пьедестала (и открытия набора с него) больше нет. */ onOpen?: (pack: FlashcardMarketPack) => void; authorId: string | null; topInset?: number; authors?: Readonly<Record<string, CommunitySceneAuthor>>;
  /** Visual fixtures only; ignored without fixture authors, never sent to the server. */
  referenceNowMs?: number;
}>): React.JSX.Element {
  const [rules, setRules] = useState(false);
  const [liveNowMs, setNowMs] = useState(Date.now);
  const isTabPage = useIsTabPage();
  const { runtimeOwnerId } = useTabNav();
  const contestRuntimeActive = useRuntimeActive(!isTabPage || runtimeOwnerId === 'packs');
  const hasFixedReferenceNow = authors !== undefined && typeof referenceNowMs === 'number' && Number.isFinite(referenceNowMs);
  useEffect(() => {
    if (!contestRuntimeActive || hasFixedReferenceNow) return undefined;
    const refresh = () => setNowMs(previous => {
      const current = Date.now();
      return Math.floor(current / 60000) === Math.floor(previous / 60000) ? previous : current;
    });
    // зачем (оптимизация плиток 29.10): счётчик показывает минуты — будим JS раз в минуту на её границе, а не 60 раз (было setInterval 1 с)
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => { timer = setTimeout(() => { refresh(); schedule(); }, 60000 - (Date.now() % 60000) + 50); };
    refresh();
    schedule();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { if (timer !== null) clearTimeout(timer); subscription.remove(); };
  }, [contestRuntimeActive, hasFixedReferenceNow]);
  const nowMs = authors && typeof referenceNowMs === 'number' && Number.isFinite(referenceNowMs) ? referenceNowMs : liveNowMs;
  const month = contestMonth(nowMs);
  const schedule = communityContestSchedule(nowMs);
  useSyncExternalStore(packSocialLive.subscribe, packSocialLive.getVersion, packSocialLive.getVersion);
  useEffect(() => {
    if (authors || !authorId || schedule.phase !== 'active') return;
    const account = captureAccountGeneration();
    let live = true;
    const startedVersion = packSocialLive.getVersion();
    void callCommunityMonthGetRanking(authorId).then(result => {
      if (live && isCurrentAccountGeneration(account, authorId) && result.monthId === month.id) packSocialLive.setContestEntries(result.monthId, result.entries, startedVersion);
    }).catch((error: unknown) => { DebugLogger.warn('community:month-ranking', String(error)); });
    return () => { live = false; };
  }, [authorId, authors, month.id, schedule.phase]);
  const LP = (ru: string, en: string): string => communitySceneText(lang, ru, en);
  // зачем (координатор 05.11, владелец: «Наборы» без героя): лог [SETS-HERO] — видно, отрисована ли сцена и с каким числом наборов
  console.log('[SETS-HERO] stage render', JSON.stringify({ packs: packs.length, lang, hasAuthor: authorId !== null, topInset, phase: schedule.phase, days: schedule.days })); // guard-ok: одна строка на отрисовку сцены
  // зачем (макет «Наборы» rev8, слово владельца: пьедестала и «места набора» нет): «Набор месяца» / «Ещё N дней» / кнопка «Условия участия ›», арт-карточки справа
  return <View style={[s.stage, { paddingTop: topInset }]}><CommunitySceneBackdrop /><CommunitySceneFan />
    <View style={s.stageCopy}><Text style={s.kicker}>{schedule.phase === 'upcoming' ? LP('До начала конкурса', 'Contest starts in') : LP('Набор месяца', 'Pack of the month')}</Text><Text testID="community-contest-days" style={s.stageTitle}>{schedule.phase === 'upcoming' ? communityDaysLabel(lang, schedule.days) : communityDaysLeftLabel(lang, schedule.days)}</Text>
      <KitTouchable testID="community-contest-rules" onPress={() => setRules(true)} accessibilityRole="button" style={s.rulesButton}><Text style={s.ruleLabel}>{LP('Условия участия', 'How to take part')}</Text><Ionicons name="chevron-forward" size={14} color={WHITE} /></KitTouchable>
    </View>
    <CommunityContestRules visible={rules} lang={lang} onClose={() => setRules(false)} />
  </View>;
}

const s = StyleSheet.create({
  stage: { minHeight: 330, position: 'relative', overflow: 'hidden', borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  fan: { position: 'absolute', right: -18, top: 92, width: 224, height: 224 },
  stageCopy: { paddingHorizontal: 20, paddingTop: 28, maxWidth: 250 }, kicker: { color: WHITE, opacity: .8, fontSize: 14, fontWeight: '600' }, stageTitle: { fontSize: 34, lineHeight: 40, fontWeight: '800', color: WHITE, marginTop: 6 },
  rulesButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 12, minHeight: 36, borderRadius: 18, backgroundColor: GLASS, marginTop: 14 },
  ruleLabel: { color: WHITE, fontSize: 13, fontWeight: '600' },
  tile: { minHeight: 136, borderRadius: 22, padding: 12, overflow: 'hidden' }, tileCount: { backgroundColor: GLASS, flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', paddingHorizontal: 9, height: 28, borderRadius: 14, gap: 4 }, count: { color: WHITE, fontSize: 13, fontWeight: '700' }, tileTitle: { color: WHITE, fontSize: 17, lineHeight: 21, fontWeight: '700', marginTop: 'auto', paddingTop: 12 }, author: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }, authorName: { flex: 1, color: WHITE, fontSize: 13, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' }, sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 32, maxHeight: '88%' }, grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, opacity: .25, marginBottom: 16 }, sheetTitle: { fontSize: 23, fontWeight: '700', textAlign: 'center' }, body: { fontSize: 15, lineHeight: 21, marginTop: 14, marginBottom: 8 }, ruleRow: { flexDirection: 'row', gap: 12, paddingVertical: 12 }, ruleIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, ruleText: { flex: 1 }, ruleTitle: { fontSize: 16, fontWeight: '700' }, ruleBody: { fontSize: 14, lineHeight: 20, marginTop: 4 }, prizes: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10 }, prizeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7 }, button: { borderRadius: 28, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 16 }, buttonText: { fontSize: 17, fontWeight: '700' },
});
