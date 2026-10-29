import { useRouter } from 'expo-router';
/** Native counterpart of community-scene-v3; geometry follows the approved 430 dp reference. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { KitTouchable } from '../KitTouchable';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { homeSceneTokensForTheme, homeSceneOklchOf } from '../home/v2/scene/home_scene_tokens';
import { coinRankRowForDisplay } from '../../app/coin_rank_table_v1';
import { useCommunityAuthor } from '../../app/community_packs/packAuthorNames';
import { packTitleForInterface, type FlashcardMarketPack } from '../../app/flashcards/marketplace';
import { triLang, type Lang } from '../../constants/i18n';
import { COMMUNITY_CONTEST_FIRST_MONTH, communityContestSchedule, contestMonth, rankContestEntries } from '../../shared/community_month_contest';

import { packSocialLive } from '../../app/community_packs/packSocialLive';
import { callCommunityMonthGetRanking } from '../../app/community_packs/functionsClient';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../../app/account_generation';
import { DebugLogger } from '../../app/debug-logger';
// зачем (координатор 29.10, Переводчик): LP раньше отдавал украинцу и испанцу английский — теперь 9 языков по словарю
import { communitySceneText } from './community_scene_strings';

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
    {c.scrim ? <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300 }} /> : null}
  </View>;
}

function AuthorCoin({ pack, lang, size = 22, authorOverride }: Readonly<{ pack: FlashcardMarketPack; lang: Lang; size?: number; authorOverride?: CommunitySceneAuthor }>): React.JSX.Element {
  const resolvedAuthor = useCommunityAuthor(authorOverride ? null : pack, lang);
  const author = authorOverride ?? resolvedAuthor;
  return <Image source={coinRankRowForDisplay(author.coinRank ?? 0).source} style={{ width: size, height: size }} contentFit="contain" accessibilityElementsHidden />;
}

export function CommunitySceneTile({ pack, lang, likes, onOpen, onLongPress, authorOverride, heart, referencePlace }: Readonly<{
  pack: FlashcardMarketPack; lang: Lang; likes: number; onOpen: () => void; onLongPress?: () => void; authorOverride?: CommunitySceneAuthor; heart?: React.ReactNode;
  /** Visual fixtures only; ignored without an explicit fixture author. */
  referencePlace?: number;
}>): React.JSX.Element {
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const c = homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance);
  const resolvedAuthor = useCommunityAuthor(authorOverride ? null : pack, lang);
  const author = authorOverride ?? resolvedAuthor;
  const [month, setMonth] = useState(() => contestMonth(Date.now()));
  useSyncExternalStore(packSocialLive.subscribe, packSocialLive.getVersion, packSocialLive.getVersion);
  useEffect(() => {
    const refresh = () => setMonth(previous => {
      const next = contestMonth(Date.now());
      return previous.id === next.id ? previous : next;
    });
    // Refresh on resume and across a month boundary without network requests.
    const timer = setInterval(refresh, 60000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const monthlyPlace = month.id >= COMMUNITY_CONTEST_FIRST_MONTH && !authorOverride
    ? rankContestEntries(packSocialLive.contestEntries(month.id), month).findIndex(entry => entry.id === pack.id) + 1
    : 0;
  const place = authorOverride && typeof referencePlace === 'number' && Number.isSafeInteger(referencePlace) && referencePlace > 0
    ? referencePlace : monthlyPlace;
  return <KitTouchable testID={`community-scene-tile-${pack.id}`} accessibilityRole="button" accessibilityLabel={packTitleForInterface(pack, lang)} onPress={onOpen} onLongPress={onLongPress} style={s.tile}>
    <LinearGradient colors={[c.sceneTop, c.sceneBottom]} style={StyleSheet.absoluteFill} />
    <LinearGradient colors={[g.accentGlow, 'transparent']} start={{ x: 1, y: 0 }} end={{ x: .3, y: .8 }} style={StyleSheet.absoluteFill} />
    <View style={s.tileCount}><Ionicons name="copy-outline" size={13} color={WHITE} /><Text style={s.count}>{pack.cardCount}</Text></View>
    {place > 0 ? <View testID={`community-month-place-${pack.id}`} accessible accessibilityLabel={triLang(lang, { ru: `${place} место в конкурсе месяца`, uk: `${place} місце в конкурсі місяця`, es: `Puesto ${place} en el concurso del mes`, en: `Place ${place} in the monthly contest`, 'pt-BR': `${place}º lugar no concurso do mês`, vi: `Hạng ${place} trong cuộc thi tháng`, id: `Peringkat ${place} di kontes bulanan`, tr: `Aylık yarışmada ${place}. sıra`, pl: `${place}. miejsce w konkursie miesiąca` })} style={s.tileRank}><Text style={s.tileRankText}>{place}</Text></View> : null}
    <Text style={s.tileTitle}>{packTitleForInterface(pack, lang)}</Text>
    <View style={s.author}><AuthorCoin pack={pack} lang={lang} authorOverride={authorOverride} /><Text style={s.authorName}>{author.name}</Text>{heart ?? <><Ionicons name="heart-outline" size={14} color={WHITE} /><Text style={s.count}>{likes}</Text></>}</View>
  </KitTouchable>;
}

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
      <View style={[s.sheet, { backgroundColor: g.opaqueCard }]}><ScrollView showsVerticalScrollIndicator={false}>
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

export function CommunityContestStage({ packs, lang, onOpen, authorId, topInset = 100, authors, referenceNowMs }: Readonly<{
  packs: readonly FlashcardMarketPack[]; lang: Lang; onOpen: (pack: FlashcardMarketPack) => void; authorId: string | null; topInset?: number; authors?: Readonly<Record<string, CommunitySceneAuthor>>;
  /** Visual fixtures only; ignored without fixture authors, never sent to the server. */
  referenceNowMs?: number;
}>): React.JSX.Element {
  const [rules, setRules] = useState(false);
  const router = useRouter();
  const [liveNowMs, setNowMs] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNowMs(previous => {
      const current = Date.now();
      return Math.floor(current / 60000) === Math.floor(previous / 60000) ? previous : current;
    });
    const timer = setInterval(refresh, 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
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
  const ranked = (() => {
    if (schedule.phase !== 'active') return [];
    // Fixtures declare their monthly scores explicitly. Production never falls back to lifetime likes.
    const entries = authors ? packs.map(p => ({ id: p.id, authorId: p.authorStableId ?? '', title: packTitleForInterface(p, lang), hearts: p.likesCount ?? 0, publishedAtMs: p.firstPublishedAtMs ?? 0, status: p.listingStatus ?? '' })) : packSocialLive.contestEntries(month.id);
    const ids = rankContestEntries(entries, month);
    const byId = new Map(packs.map(p => [p.id, p]));
    return ids.map(e => ({ hearts: e.hearts, known: byId.has(e.id), pack: byId.get(e.id) ?? {
      id: e.id, codeName: e.title, titleRu: e.title, titleUk: e.title, titleEs: e.title,
      descriptionRu: '', descriptionUk: '', descriptionEs: '', category: 'daily' as const,
      cardCount: 0, priceShards: 0, salesCount: 0, updatedAt: new Date(e.publishedAtMs).toISOString(),
      authorStableId: e.authorId, authorName: '', isOfficial: false, isCommunityUgc: true, listingStatus: 'published' as const,
    } }));
  })();
  const mine = ranked.findIndex(row => row.pack.authorStableId === authorId);
  const LP = (ru: string, en: string): string => communitySceneText(lang, ru, en);
  return <View style={[s.stage, { paddingTop: topInset }]}><CommunitySceneBackdrop /><CommunitySceneFan />
    <View style={s.stageCopy}><Text style={s.kicker}>{schedule.phase === 'upcoming' ? LP('До начала конкурса', 'Contest starts in') : LP('До конца конкурса', 'Contest ends in')}</Text><Text style={s.stageTitle}>{LP(`${schedule.days} ${schedule.days % 10 === 1 && schedule.days % 100 !== 11 ? 'день' : schedule.days % 10 >= 2 && schedule.days % 10 <= 4 && (schedule.days % 100 < 12 || schedule.days % 100 > 14) ? 'дня' : 'дней'}`, `${schedule.days} ${schedule.days === 1 ? 'day' : 'days'}`)}</Text>
      <KitTouchable onPress={() => setRules(true)} accessibilityRole="button" style={s.rulesButton}><Text style={s.ruleLabel}>{LP('Условия участия', 'How to take part')}</Text><Ionicons name="chevron-forward" size={14} color={WHITE} /></KitTouchable>
    </View>
    {mine >= 0 ? <View style={s.myPlace}><Text style={s.kicker}>{LP('Твой набор', 'Your pack')}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><AuthorCoin pack={ranked[mine].pack} lang={lang} size={30} authorOverride={authors?.[ranked[mine].pack.id]} /><Text style={s.myRank}>{mine + 1} {LP('место', 'place')}</Text></View><Text style={s.ruleLabel}>♥ {ranked[mine].hearts}</Text></View> : null}
    <View style={s.podium}>{[1, 0, 2].map(index => { const row = ranked[index]; const pack = row?.pack; return <View key={index} style={{ flex: 1, justifyContent: 'flex-end' }}>
      {pack ? <KitTouchable onPress={() => { if (row.known) onOpen(pack); else router.push({ pathname: '/flashcards_collection', params: { pack: pack.id, preview: '1', scene: 'community', from: 'community' } }); }} accessibilityRole="button" accessibilityLabel={packTitleForInterface(pack, lang)} testID={`community-podium-${index + 1}`} style={[s.podiumBlock, { height: [124, 100, 80][index], backgroundColor: 'transparent' }]}>
        <LinearGradient pointerEvents="none" colors={index === 0 ? ['rgba(255,255,255,.34)', 'rgba(255,255,255,.12)', 'rgba(255,255,255,.05)'] : ['rgba(255,255,255,.26)', 'rgba(255,255,255,.08)', 'rgba(255,255,255,.04)']} locations={[0, .7, 1]} style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }]} /><View style={s.podiumCoin}><AuthorCoin pack={pack} lang={lang} size={index === 0 ? 48 : 38} authorOverride={authors?.[pack.id]} /></View><Text style={s.place}>{index + 1}</Text><Text style={s.podiumName}>{packTitleForInterface(pack, lang)}</Text><Text style={s.ruleLabel}>♥ {row.hearts}</Text>
      </KitTouchable> : <View style={[s.podiumBlock, { height: [124, 100, 80][index], opacity: .5 }]}><Text style={s.place}>{index + 1}</Text><Text style={s.podiumName}>{LP('Место свободно', 'Open place')}</Text></View>}
    </View>; })}</View>
    <CommunityContestRules visible={rules} lang={lang} onClose={() => setRules(false)} />
  </View>;
}

const s = StyleSheet.create({
  tileRank: { position: 'absolute', top: 12, right: 12, minWidth: 26, height: 26, paddingHorizontal: 5, borderRadius: 13, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  tileRankText: { color: '#121318', fontSize: 13, fontWeight: '800' },
  stage: { height: 580, position: 'relative', overflow: 'hidden', borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  fan: { position: 'absolute', right: -18, top: 92, width: 224, height: 224 },
  stageCopy: { paddingHorizontal: 20, paddingTop: 28, maxWidth: 250 }, kicker: { color: WHITE, opacity: .8, fontSize: 14, fontWeight: '600' }, stageTitle: { fontSize: 34, lineHeight: 40, fontWeight: '800', color: WHITE, marginTop: 6 },
  rulesButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 12, minHeight: 36, borderRadius: 18, backgroundColor: GLASS, marginTop: 14 },
  ruleLabel: { color: WHITE, fontSize: 13, fontWeight: '600' }, myPlace: { position: 'absolute', left: 20, top: 300 }, myRank: { color: WHITE, fontSize: 27, fontWeight: '800', marginVertical: 4 },
  podium: { position: 'absolute', left: 22, right: 22, bottom: 50, flexDirection: 'row', gap: 7, alignItems: 'flex-end' }, podiumBlock: { backgroundColor: GLASS, borderTopLeftRadius: 16, borderTopRightRadius: 16, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 5, paddingBottom: 10 }, podiumCoin: { position: 'absolute', top: -26, alignSelf: 'center' }, place: { color: WHITE, fontSize: 24, lineHeight: 28, fontWeight: '800' }, podiumName: { color: WHITE, fontWeight: '700', fontSize: 13, lineHeight: 16, textAlign: 'center' },
  tile: { minHeight: 136, borderRadius: 22, padding: 12, overflow: 'hidden' }, tileCount: { backgroundColor: GLASS, flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', paddingHorizontal: 9, height: 28, borderRadius: 14, gap: 4 }, count: { color: WHITE, fontSize: 13, fontWeight: '700' }, tileTitle: { color: WHITE, fontSize: 17, lineHeight: 21, fontWeight: '700', marginTop: 'auto', paddingTop: 12 }, author: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }, authorName: { flex: 1, color: WHITE, fontSize: 13, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' }, sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 32, maxHeight: '88%' }, grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, opacity: .25, marginBottom: 16 }, sheetTitle: { fontSize: 23, fontWeight: '700', textAlign: 'center' }, body: { fontSize: 15, lineHeight: 21, marginTop: 14, marginBottom: 8 }, ruleRow: { flexDirection: 'row', gap: 12, paddingVertical: 12 }, ruleIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, ruleText: { flex: 1 }, ruleTitle: { fontSize: 16, fontWeight: '700' }, ruleBody: { fontSize: 14, lineHeight: 20, marginTop: 4 }, prizes: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10 }, prizeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7 }, button: { borderRadius: 28, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 16 }, buttonText: { fontSize: 17, fontWeight: '700' },
});
