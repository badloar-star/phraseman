import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import ScreenBackButton, { SCREEN_BACK_ZONE, useScreenBackContentTop } from '../v2/ScreenBackButton';
import { homeSceneTokensForTheme } from '../home/v2/scene/home_scene_tokens';
import { KitTouchable } from '../KitTouchable';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';
import { coinRankRowForDisplay } from '../../app/coin_rank_table_v1';
import { CommunitySceneBackdrop, CommunitySceneFan } from './CommunityScene';

export type CommunitySceneCard = Readonly<{ id: string; front: string; back: string }>;
type Props = Readonly<{
  title: string; subtitle: string; author: string; coinRank: number; count: number; lang: Lang;
  cards: readonly CommunitySceneCard[]; actions: React.ReactNode; loading?: boolean;
  onBack?: () => void; onTrain?: () => void;
  onSpeak: (id: string) => void; onMore: () => void; onComments?: () => void;
}>;

/** The approved scene uses compact speech rows; actual audio and ownership stay with the caller. */
export function CommunityPackScene({ title, subtitle, author, coinRank, count, lang, cards, actions, loading, onBack, onTrain, onSpeak, onMore, onComments }: Props): React.JSX.Element {
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const backTop = useScreenBackContentTop() - SCREEN_BACK_ZONE;
  const scene = homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance);
  const g = liquidGlassTokens(liquidGlassThemeId);
  const label = triLang(lang, { ru: 'Карточки', uk: 'Картки', en: 'Cards', es: 'Tarjetas' });
  const header = <View>
    <View style={s.stage}><CommunitySceneBackdrop /><CommunitySceneFan size={206} top={94} right={-10} />
      <KitTouchable onPress={onMore} accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Действия с набором', uk: 'Дії з набором', en: 'Pack actions', es: 'Acciones del pack' })} style={[s.more, { top: backTop }]}><Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" /></KitTouchable>
      <View style={s.copy}><Text style={s.subtitle}>{subtitle}</Text><Text style={s.title}>{title}</Text><View style={s.author}><Image source={coinRankRowForDisplay(coinRank).source} style={{ width: 22, height: 22 }} contentFit="contain" /><Text style={s.authorText}>{author}</Text></View><View style={s.actions}>{actions}</View></View>
    </View>
    <View style={[s.panelTop, { backgroundColor: g.opaqueCard }]}><Text style={[s.heading, { color: g.text }]}>{label}</Text><Text style={{ color: g.secondary, fontSize: 16 }}>{count}</Text></View>
  </View>;
  return <View style={{ flex: 1, backgroundColor: g.bg }}><FlatList testID="community-pack-scene" data={cards} keyExtractor={card => card.id} ListHeaderComponent={header} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}
    renderItem={({ item }) => <View style={{ backgroundColor: g.opaqueCard, marginHorizontal: 16, paddingHorizontal: 16 }}><KitTouchable onPress={() => onSpeak(item.id)} accessibilityRole="button" accessibilityLabel={`${item.front}. ${item.back}`} style={[s.row, { borderBottomColor: g.dividerTone }]}><View style={[s.icon, { backgroundColor: g.opaqueControl }]}><Ionicons name="volume-high" size={18} color={g.text} /></View><View style={{ flex: 1 }}><Text style={[s.front, { color: g.text }]}>{item.front}</Text><Text style={[s.back, { color: g.secondary }]}>{item.back}</Text></View></KitTouchable></View>}
    ListEmptyComponent={<View style={{ padding: 24, marginHorizontal: 16, backgroundColor: g.opaqueCard }}><Text style={{ color: g.secondary }}>{loading ? triLang(lang, { ru: 'Загружаем карточки…', uk: 'Завантажуємо картки…', en: 'Loading cards…', es: 'Cargando tarjetas…' }) : triLang(lang, { ru: 'В наборе пока нет карточек', uk: 'У наборі ще немає карток', en: 'No cards yet', es: 'Aún no hay tarjetas' })}</Text></View>}
    ListFooterComponent={<View style={{ backgroundColor: g.opaqueCard, marginHorizontal: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, padding: 16, gap: 10 }}>
      {onTrain ? <KitTouchable onPress={onTrain} accessibilityRole="button" style={{ minHeight: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: g.cta }}><Text style={{ color: g.ctaInk, fontSize: 17, fontWeight: '700' }}>{triLang(lang, { ru: 'Тренировать', uk: 'Тренувати', en: 'Practise', es: 'Practicar' })}</Text></KitTouchable> : null}
      {onComments ? <KitTouchable onPress={onComments} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: g.secondary }}>{triLang(lang, { ru: 'Обсуждение набора', uk: 'Обговорення набору', en: 'Pack discussion', es: 'Comentarios del pack' })}</Text></KitTouchable> : null}
    </View>}

  />{onBack ? <ScreenBackButton screen="community_pack_scene" testID="community-pack-back" onPress={onBack} sceneTop={scene.sceneTop} /> : null}</View>;
}

// theme-exempt: white foreground and translucent controls belong to the dark scene in the reference.
const s = StyleSheet.create({
  stage: { minHeight: 520, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden', justifyContent: 'flex-end' },
  more: { position: 'absolute', right: 20, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.17)' },
  copy: { paddingTop: 300, paddingHorizontal: 20, paddingBottom: 58 }, subtitle: { color: '#FFFFFF', opacity: .8, fontSize: 14, fontWeight: '600' }, title: { color: '#FFFFFF', fontSize: 34, lineHeight: 40, fontWeight: '700', marginTop: 6, letterSpacing: -.6 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 }, authorText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' }, actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  panelTop: { marginTop: -38, marginHorizontal: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth }, icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, front: { fontSize: 16, fontWeight: '700' }, back: { fontSize: 14, lineHeight: 20, marginTop: 3 },
});
