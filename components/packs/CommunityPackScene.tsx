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
import { CommunityRootTabs } from './CommunityRootTabs';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { tabPillTopOffset } from '../v2/tab_bar_geometry';

export type CommunitySceneCard = Readonly<{ id: string; front: string; back: string }>;
type Props = Readonly<{
  title: string; subtitle: string; author: string; coinRank: number; count: number; lang: Lang;
  cards: readonly CommunitySceneCard[]; actions: React.ReactNode; loading?: boolean;
  onBack?: () => void; onTrain?: () => void;
  onSpeak: (id: string) => void; onMore: () => void; onComments?: () => void; commentsCount?: number;
  onSelectRoute?: (route: string) => void;
}>;

/** The approved scene uses compact speech rows; actual audio and ownership stay with the caller. */
export function CommunityPackScene({ title, subtitle, author, coinRank, count, lang, cards, actions, loading, onBack, onTrain, onSpeak, onMore, onComments, commentsCount = 0, onSelectRoute }: Props): React.JSX.Element {
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const insets = useStableSafeAreaInsets();
  const backTop = useScreenBackContentTop() - SCREEN_BACK_ZONE;
  const scene = homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance);
  const g = liquidGlassTokens(liquidGlassThemeId);
  const label = triLang(lang, { ru: 'Карточки', uk: 'Картки', en: 'Cards', es: 'Tarjetas' , 'pt-BR': 'Cartões', vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Karty' });
  const header = <View>
    <View style={s.stage}><CommunitySceneBackdrop /><CommunitySceneFan size={206} top={94} right={-10} />
      <KitTouchable onPress={onMore} accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Действия с набором', uk: 'Дії з набором', en: 'Pack actions', es: 'Acciones del pack' , 'pt-BR': 'Ações do pacote', vi: 'Thao tác với bộ thẻ', id: 'Aksi paket', tr: 'Paket işlemleri', pl: 'Działania z zestawem' })} style={[s.more, { top: backTop }]}><Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" /></KitTouchable>
      <View style={s.copy}><Text style={s.subtitle}>{subtitle}</Text><Text style={s.title}>{title}</Text><View style={s.author}><Image source={coinRankRowForDisplay(coinRank).source} style={{ width: 22, height: 22 }} contentFit="contain" /><Text style={s.authorText}>{author}</Text></View><View style={s.actions}>{actions}</View></View>
    </View>
    <View style={[s.panelTop, { backgroundColor: g.opaqueCard }]}><Text style={[s.heading, { color: g.text }]}>{label}</Text><Text style={{ color: g.secondary, fontSize: 16 }}>{count}</Text></View>
  </View>;
  return <View style={{ flex: 1, backgroundColor: g.bg }}><FlatList testID="community-pack-scene" data={cards} keyExtractor={card => card.id} ListHeaderComponent={header} contentContainerStyle={{ paddingBottom: onSelectRoute ? tabPillTopOffset(insets.bottom) + 20 : 100 }} showsVerticalScrollIndicator={false}
    renderItem={({ item }) => <View style={{ backgroundColor: g.opaqueCard, marginHorizontal: 16, paddingHorizontal: 16 }}><KitTouchable onPress={() => onSpeak(item.id)} accessibilityRole="button" accessibilityLabel={`${item.front}. ${item.back}`} style={[s.row, { borderBottomColor: g.dividerTone }]}><View style={[s.icon, { backgroundColor: g.opaqueControl }]}><Ionicons name="volume-high" size={18} color={g.text} /></View><View style={{ flex: 1 }}><Text style={[s.front, { color: g.text }]}>{item.front}</Text><Text style={[s.back, { color: g.secondary }]}>{item.back}</Text></View></KitTouchable></View>}
    ListEmptyComponent={<View style={{ padding: 24, marginHorizontal: 16, backgroundColor: g.opaqueCard }}><Text style={{ color: g.secondary }}>{loading ? triLang(lang, { ru: 'Загружаем карточки…', uk: 'Завантажуємо картки…', en: 'Loading cards…', es: 'Cargando tarjetas…' , 'pt-BR': 'Carregando cartões…', vi: 'Đang tải thẻ…', id: 'Memuat kartu…', tr: 'Kartlar yükleniyor…', pl: 'Ładujemy karty…' }) : triLang(lang, { ru: 'В наборе пока нет карточек', uk: 'У наборі ще немає карток', en: 'No cards yet', es: 'Aún no hay tarjetas' , 'pt-BR': 'Ainda não há cartões', vi: 'Chưa có thẻ nào', id: 'Belum ada kartu', tr: 'Henüz kart yok', pl: 'Na razie brak kart' })}</Text></View>}
    ListFooterComponent={<View style={{ backgroundColor: g.opaqueCard, marginHorizontal: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, padding: 16, gap: 10 }}>
      {onTrain ? <KitTouchable onPress={onTrain} accessibilityRole="button" style={{ minHeight: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: g.cta }}><Text style={{ color: g.ctaInk, fontSize: 17, fontWeight: '700' }}>{triLang(lang, { ru: 'Тренировать', uk: 'Тренувати', en: 'Practise', es: 'Practicar' , 'pt-BR': 'Praticar', vi: 'Luyện tập', id: 'Latihan', tr: 'Çalış', pl: 'Ćwicz' })}</Text></KitTouchable> : null}
      {/* зачем (владелец 04.11: «убрали комментарии»): код не удалялся, но вход был серой ссылкой без значка и числа — не читался как кнопка; теперь значок 💬, основной цвет текста и счётчик отзывов (при N>0), цель ≥48 dp, без обводки */}
      {onComments ? <KitTouchable testID="pack-scene-comments" onPress={onComments} accessibilityRole="button" style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Ionicons name="chatbubble-outline" size={20} color={g.text} />{commentsCount > 0 ? <Text testID="pack-scene-comments-count" style={{ color: g.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{commentsCount}</Text> : null}<Text style={{ color: g.text, fontWeight: '600', flexShrink: 1, textAlign: 'center' }}>{commentsCount > 0 ? triLang(lang, { ru: 'Обсуждение набора', uk: 'Обговорення набору', en: 'Pack discussion', es: 'Comentarios del pack' , 'pt-BR': 'Comentários do pacote', vi: 'Thảo luận về bộ thẻ', id: 'Diskusi paket', tr: 'Paket yorumları', pl: 'Dyskusja o zestawie' }) : triLang(lang, { ru: 'Оставить отклик', uk: 'Залишити відгук', en: 'Leave feedback', es: 'Dejar un comentario', 'pt-BR': 'Deixar um comentário', vi: 'Để lại phản hồi', id: 'Beri tanggapan', tr: 'Yorum bırak', pl: 'Zostaw opinię' })}</Text></KitTouchable> : null}
    </View>}

  />{onSelectRoute ? <CommunityRootTabs lang={lang} bottomInset={insets.bottom} onSelectRoute={onSelectRoute} /> : null}{onBack ? <ScreenBackButton screen="community_pack_scene" testID="community-pack-back" onPress={onBack} sceneTop={scene.sceneTop} /> : null}</View>;
}

// theme-exempt: white foreground and translucent controls belong to the dark scene in the reference.
const s = StyleSheet.create({
  stage: { minHeight: 520, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden', justifyContent: 'flex-end' },
  more: { position: 'absolute', right: 20, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.17)' },
  copy: { paddingTop: 300, paddingHorizontal: 20, paddingBottom: 58 }, subtitle: { color: '#FFFFFF', opacity: .8, fontSize: 14, fontWeight: '600' }, title: { color: '#FFFFFF', fontSize: 34, lineHeight: 40, fontWeight: '700', marginTop: 6, letterSpacing: -.6 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 }, authorText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' }, actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  panelTop: { marginTop: -38, marginHorizontal: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth }, icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, front: { fontSize: 16, fontWeight: '700' }, back: { fontSize: 14, lineHeight: 20, marginTop: 3 },
});
