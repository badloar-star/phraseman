import { CommunityPackCheckScene } from '../components/packs/CommunityPackCheckScene';
import ScreenBackButton from '../components/v2/ScreenBackButton';
/** Visual-only fixtures for community-scene-v3. No publication, wallet or cloud mutations. */
import React, { useEffect, useState } from 'react';
import { LogBox, ScrollView, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';
import { getDevAppearance, getDevThemeChoice, setDevAppearance, setDevThemeChoice } from './dev_appearance_override';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useTheme } from '../components/ThemeContext';
import { KitTouchable } from '../components/KitTouchable';
import V2TabBar, { type V2TabBarItem } from '../components/v2/V2TabBar';
import { CommunityContestRules, CommunityContestStage, CommunitySceneTile, type CommunitySceneAuthor } from '../components/packs/CommunityScene';
import { CommunityWinnerDialog } from '../components/packs/CommunityWinnerDialog';
import { CommunityPackScene } from '../components/packs/CommunityPackScene';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens, type LiquidGlassThemeId } from '../constants/liquidGlassThemePalette';
import { contestMonth } from '../shared/community_month_contest';
import { useSceneStatusBar } from '../hooks/use_scene_status_bar';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import type { FlashcardMarketPack } from './flashcards/marketplace';

const DATA = [
  ['Phrasal verbs', 'Ol Zar', 6, 214, 16], ['B2 глаголы', 'Ирина', 3, 167, 49],
  ['Forest berry', 'Лидия', 9, 121, 15], ['Созвоны и письма', 'Денис', 5, 38, 40],
  ['Family', 'Лидия', 9, 9, 20], ['Сленг из сериалов', 'Tim', 2, 74, 18], ['Антоніми дієслів', 'Natalia', 4, 97, 30],
] as const;
const AUTHORS: Record<string, CommunitySceneAuthor> = Object.fromEntries(DATA.map((row, i) => [`scene_${i}`, { name: row[1], coinRank: row[2], isPremium: false }]));
const packs = (): FlashcardMarketPack[] => DATA.map((row, i) => ({ id: `scene_${i}`, codeName: row[0], titleRu: row[0], titleUk: row[0], titleEs: row[0], descriptionRu: '', descriptionUk: '', descriptionEs: '', category: 'daily', cardCount: row[4], priceShards: 0, salesCount: 0, likesCount: row[3], authorName: row[1], authorStableId: i === 3 ? 'me' : `author_${i}`, isCommunityUgc: true, isOfficial: false, listingStatus: 'published', packLanguage: 'en', updatedAt: new Date().toISOString(), firstPublishedAtMs: contestMonth(Date.now()).startMs + i + 1 }));
const TABS: readonly V2TabBarItem[] = [
  { key: 'home', label: 'Главная', icon: 'home-outline', activeIcon: 'home' }, { key: 'learn', label: 'Обучение', icon: 'book-outline', activeIcon: 'book' },
  { key: 'video', label: 'Видео', icon: 'play-circle-outline', activeIcon: 'play-circle' }, { key: 'community', label: 'Сообщество', icon: 'people-outline', activeIcon: 'people' }, { key: 'settings', label: 'Настройки', icon: 'settings-outline', activeIcon: 'settings' },
];
const REVIEW_STATES = ['review', 'review-fixed', 'ready', 'publishing', 'publish-error', 'published'] as const;
const CARDS = [['Significant', 'значительный'], ['Crucial', 'решающий'], ['Inevitable', 'неизбежный'], ['Detrimental', 'вредный'], ['Beneficial', 'полезный'], ['Remarkable', 'примечательный']].map(([front, back], i) => ({ id: String(i), front, back }));

function Inner(): React.JSX.Element {
  const params = useLocalSearchParams<{ state?: string; theme?: string; appearance?: string }>();
  const state = params.state ?? 'catalog';
  const router = useRouter();
  const backToCatalog = () => { setOpened(null); router.setParams({ state: 'catalog' }); };
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [data] = useState(packs);
  const [opened, setOpened] = useState<FlashcardMarketPack | null>(null);
  const [fixtureHearts, setFixtureHearts] = useState<Record<string, boolean>>({});
  const [fixtureAdds, setFixtureAdds] = useState<Record<string, boolean>>({});
  const fixtureId = opened?.id ?? 'preview_pack';
  const fixtureLiked = fixtureHearts[fixtureId] ?? false;
  const fixtureAdded = fixtureAdds[fixtureId] ?? state === 'added';
  const [fixedCards, setFixedCards] = useState<number[]>(state === 'review' ? [] : state === 'review-fixed' ? [0] : [0, 1]);
  const [published, setPublished] = useState(state === 'published');
  const [publishError, setPublishError] = useState(state === 'publish-error');
  const reviewView = (REVIEW_STATES as readonly string[]).includes(state);
  const reviewCards = CARDS.map((card, index) => ({ ...card, issue: index < 2 && !fixedCards.includes(index) ? (index === 0 ? 'Уточни перевод слова' : 'Проверь написание') : undefined, fixed: index < 2 && fixedCards.includes(index) }));
  const demoPacks = data.map(pack => ({ ...pack, likesCount: (pack.likesCount ?? 0) + Number(fixtureHearts[pack.id] === true) }));
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [rules, setRules] = useState(state === 'rules');
  const [claimed, setClaimed] = useState(state === 'claimed');
  const [showPrize, setShowPrize] = useState(['winner', 'second', 'third', 'claimed', 'claim-error'].includes(state));
  useSceneStatusBar('community-preview', !(reviewView && published), 'dev_scene');
  useEffect(() => {
    // Visual fixtures only: developer banners must not cover the controls being demonstrated.
    // Console output and native error reporting remain available; normal app screens restore LogBox.
    LogBox.ignoreAllLogs(true);
    return () => LogBox.ignoreAllLogs(false);
  }, []);
  useEffect(() => {
    setOpened(null);
    setRules(state === 'rules');
    setClaimed(state === 'claimed');
    setShowPrize(['winner', 'second', 'third', 'claimed', 'claim-error'].includes(state));
    setFixedCards(state === 'review' ? [] : state === 'review-fixed' ? [0] : [0, 1]);
    setPublished(state === 'published');
    setPublishError(state === 'publish-error');
  }, [state]);
  useEffect(() => {
    const previous = getDevThemeChoice();
    if (params.theme && (LIQUID_GLASS_THEME_IDS as readonly string[]).includes(params.theme)) setDevThemeChoice({ themeId: params.theme as LiquidGlassThemeId, intensity: previous?.intensity ?? null });
    return () => setDevThemeChoice(previous);
  }, [params.theme]);
  useEffect(() => {
    const previous = getDevAppearance();
    if (params.appearance === 'light' || params.appearance === 'dark') setDevAppearance(params.appearance);
    return () => setDevAppearance(previous);
  }, [params.appearance]);
  const packView = opened || state === 'pack' || state === 'added';
  const shown = sort === 'top' ? [data[0], data[1], data[2], data[6]] : [data[3], data[4], data[5], data[6]];
  const place = state === 'third' ? 3 : state === 'winner' ? 1 : 2;
  if (reviewView) return <View style={{ flex: 1, backgroundColor: g.opaqueCard }}>
    {published ? <View style={{ flex: 1 }}><ScreenBackButton screen="community_preview_published" onPress={backToCatalog} /><View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 }}><Ionicons name="checkmark-circle" size={64} color={g.accent} /><Text style={{ color: g.text, fontSize: 26, fontWeight: '700', textAlign: 'center' }}>Набор отправлен на проверку</Text><Text style={{ color: g.secondary, fontSize: 16, textAlign: 'center' }}>После одобрения он появится в сообществе. Другие участники смогут учиться по твоим карточкам и ставить сердечки.</Text><KitTouchable onPress={backToCatalog} style={{ padding: 18, borderRadius: 27, backgroundColor: g.ctaFill }}><Text style={{ color: g.ctaFillInk, fontWeight: '700' }}>К наборам</Text></KitTouchable></View></View> : <CommunityPackCheckScene lang="ru" cards={reviewCards} busy={state === 'publishing'} error={publishError ? 'Не удалось отправить набор. Карточки сохранены — попробуй ещё раз.' : null} bottomInset={insets.bottom + 16} onBack={backToCatalog} onEdit={index => setFixedCards(value => [...value, index])} onPublish={() => { setPublishError(false); setPublished(true); }} />}
  </View>;
  return <View style={{ flex: 1, backgroundColor: g.opaqueCard }}>
    {packView ? <CommunityPackScene onBack={backToCatalog} title={opened?.titleRu ?? '25 прилагательных'} subtitle="English · B1" author={opened ? AUTHORS[opened.id].name : 'Jericco13'} coinRank={opened ? AUTHORS[opened.id].coinRank : 0} count={opened?.cardCount ?? 25} lang="ru" cards={CARDS} onSpeak={() => {}} onMore={() => {}} actions={<><KitTouchable onPress={() => setFixtureAdds(value => ({ ...value, [fixtureId]: true }))} style={{ flex: 1, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#18212A', fontSize: 16, fontWeight: '700' }}>{fixtureAdded ? '✓ В твоих наборах' : '+ Добавить себе'}</Text></KitTouchable><KitTouchable accessibilityRole="button" accessibilityLabel="Нравится" disabled={opened?.authorStableId === 'me'} accessibilityState={{ selected: fixtureLiked, disabled: opened?.authorStableId === 'me' }} onPress={() => setFixtureHearts(value => ({ ...value, [fixtureId]: !value[fixtureId] }))} style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 18 }}>{fixtureLiked ? '♥' : '♡'} {(opened?.likesCount ?? 12) + (fixtureLiked ? 1 : 0)}</Text></KitTouchable></>} /> : <ScrollView contentContainerStyle={{ paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
      <CommunityContestStage packs={state === 'empty' || state === 'loading' ? [] : demoPacks} lang="ru" authorId="me" authors={AUTHORS} topInset={100} onOpen={pack => setOpened(data.find(original => original.id === pack.id) ?? pack)} />
      <View style={{ position: 'absolute', top: insets.top + 10, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 22 }}><Text style={{ color: '#FFFFFFAA', fontWeight: '600', fontSize: 16 }}>Пик</Text><Text style={{ color: '#FFFFFFAA', fontWeight: '600', fontSize: 16 }}>Друзья</Text><Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16, borderBottomWidth: 3, borderBottomColor: '#FFFFFF', paddingBottom: 8 }}>Наборы</Text><Text style={{ color: '#FFFFFF', marginLeft: 'auto', fontWeight: '700' }}>EN⌄</Text></View>
      <View style={{ marginTop: -34, padding: 16, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: g.opaqueCard }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ fontSize: 22, fontWeight: '700', flex: 1, color: g.text }}>Наборы</Text>{(['top', 'new'] as const).map(value => <KitTouchable key={value} onPress={() => setSort(value)} style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: sort === value ? g.ctaFill : g.opaqueControl }}><Text style={{ color: sort === value ? g.ctaFillInk : g.secondary, fontWeight: '600' }}>{value === 'top' ? 'Топ' : 'Новые'}</Text></KitTouchable>)}</View>
        {['empty', 'loading', 'offline'].includes(state) ? <Text style={{ color: g.secondary, paddingVertical: 32 }}>{state === 'empty' ? 'Пока нет наборов. Создай первый!' : state === 'loading' ? 'Загружаем наборы…' : 'Нет подключения. Сохранённые наборы доступны.'}</Text> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 12 }}>{shown.map(pack => <View key={pack.id} style={{ width: '48.5%' }}><CommunitySceneTile pack={pack} lang="ru" likes={(pack.likesCount ?? 0) + Number(fixtureHearts[pack.id] === true)} authorOverride={AUTHORS[pack.id]} onOpen={() => setOpened(pack)} /></View>)}</View>}
      </View>
    </ScrollView>}
    {!packView ? <KitTouchable onPress={() => router.setParams({ state: 'review' })} accessibilityRole="button" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 92, minHeight: 54, borderRadius: 27, backgroundColor: g.ctaFill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}><Ionicons name="add" size={22} color={g.ctaFillInk} /><Text style={{ color: g.ctaFillInk, fontSize: 17, fontWeight: '700' }}>Создать набор</Text></KitTouchable> : null}
    <V2TabBar items={TABS} activeIndex={3} onSelect={() => {}} bottomOffset={insets.bottom + 10} reduceMotion={reduceMotion} />
    <CommunityContestRules visible={rules} lang="ru" onClose={() => setRules(false)} />
    <CommunityWinnerDialog winner={showPrize ? { monthId: contestMonth(Date.now()).id, packTitle: 'Созвоны и письма', place, claimed } : null} onClose={() => setShowPrize(false)} onClaim={async () => { if (state === 'claim-error') throw new Error('Preview: offline'); setClaimed(true); }} />
  </View>;
}

export default function DevCommunityScenePreview(): React.JSX.Element {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/" />;
  return <Inner />;
}
