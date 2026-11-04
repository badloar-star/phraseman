import { homeSceneTokensForTheme } from '../home/v2/scene/home_scene_tokens';
import { useSceneStatusBar } from '../../hooks/use_scene_status_bar';
import ScreenBackButton from '../v2/ScreenBackButton';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { FlatList, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import { alpha } from '../../constants/liquidGlassColor';
import { KitTouchable } from '../KitTouchable';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import type { Lang } from '../../constants/i18n';
import { communityCardsToFix, communityCheckText } from './community_pack_check_strings';
import { CommunitySceneBackdrop, CommunitySceneFan } from './CommunityScene';
import type { CommunitySceneCard } from './CommunityPackScene';
import { CommunityRootTabs } from './CommunityRootTabs';
import { tabPillTopOffset } from '../v2/tab_bar_geometry';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';

export type CommunityCheckCard = CommunitySceneCard & Readonly<{ issue?: string; fixed?: boolean }>;
export function CommunityPackCheckScene({ cards, lang, busy, error, onEdit, onPublish, onBack, onSelectRoute, bottomInset = 20 }: Readonly<{
  cards: readonly CommunityCheckCard[]; lang: Lang; busy: boolean; error?: string | null;
  onEdit: (index: number) => void; onPublish: () => void; onBack: () => void; bottomInset?: number;
  onSelectRoute?: (route: string) => void;
}>): React.JSX.Element {
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const insets = useStableSafeAreaInsets();
  const tabSpace = onSelectRoute ? tabPillTopOffset(insets.bottom) + 12 : 0;

  const scene = homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance);
  useSceneStatusBar('community-review', true, 'review_scene', scene.sceneTop);
  const g = liquidGlassTokens(liquidGlassThemeId);
  const left = cards.filter(card => card.issue).length;
  const LP = (ru: string, en: string): string => communityCheckText(lang, ru, en);
  const status = left ? communityCardsToFix(lang, left) : LP('Набор готов к публикации', 'Ready to publish');
  return <View style={{ flex: 1, backgroundColor: scene.sceneTop }}>
    {/* зачем (владелец: «фон сцены идёт под статус-бар», сторож safe_top_one_canvas_contract): строку состояния не красим — она прозрачная, сцена (корневой View с sceneTop) рисуется под часами; значки ведёт useSceneStatusBar выше */}
    <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
    <View style={{ flex: 1 }}>
    <FlatList style={{ backgroundColor: g.bg }} data={cards} keyExtractor={card => card.id} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 90 + tabSpace }} ListHeaderComponent={<>
      <View style={{ height: 390, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden' }}><CommunitySceneBackdrop /><CommunitySceneFan size={186} top={84} right={-8} />

        <View style={{ position: 'absolute', bottom: 58, left: 20, right: 20 }}><Text style={{ fontSize: 34, lineHeight: 40, letterSpacing: -.6, fontWeight: '700', color: '#FFFFFF' }}>{LP('Проверка', 'Review')}</Text><Text accessibilityLiveRegion="polite" style={{ fontSize: 15, fontWeight: '700', color: '#FFD0C4', marginTop: 8 }}>✦ {status}</Text></View>
      </View>
      <View style={{ marginTop: -38, marginHorizontal: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, backgroundColor: g.opaqueCard, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ fontSize: 20, lineHeight: 26, fontWeight: '700', color: g.text }}>{LP('Карточки', 'Cards')}</Text><Text style={{ color: g.secondary }}>{cards.length}</Text></View>
    </>} ListFooterComponent={<View style={{ marginHorizontal: 16, height: 14, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, backgroundColor: g.opaqueCard }} />} renderItem={({ item, index }) => <View style={{ marginHorizontal: 16, paddingHorizontal: 8, backgroundColor: g.opaqueCard }}><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 60, marginVertical: item.issue ? 6 : 0, paddingVertical: 10, paddingHorizontal: 12, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, overflow: 'hidden', borderBottomWidth: !item.issue && index < cards.length - 1 && !cards[index + 1].issue ? StyleSheet.hairlineWidth : 0, borderBottomColor: g.dividerTone, backgroundColor: item.issue ? alpha(g.accent, 0.13) : 'transparent' }}>{!item.issue ? <Ionicons name="checkmark-circle" size={26} color={g.accent} /> : null}<View style={{ flex: 1 }}><Text style={{ color: g.text, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>{item.front}</Text><Text style={{ color: g.secondary, fontSize: 14, lineHeight: 19 }}>{item.back}</Text>{item.issue || item.fixed ? <Text style={{ color: item.issue ? g.accentTextSafe : g.secondary, fontSize: 14, fontWeight: '700', marginTop: 4 }}>{item.issue ?? LP('Исправлено', 'Fixed')}</Text> : null}</View>{item.issue ? <KitTouchable onPress={() => onEdit(index)} accessibilityRole="button" style={{ minHeight: 44, borderRadius: 22, paddingHorizontal: 12, backgroundColor: g.cta, justifyContent: 'center' }}><Text style={{ color: g.ctaInk, fontWeight: '700' }}>{LP('Исправить', 'Fix')}</Text></KitTouchable> : null}</View></View>} />
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: tabSpace, paddingHorizontal: 16, paddingTop: 26, paddingBottom: onSelectRoute ? 12 : bottomInset }}>
      <LinearGradient pointerEvents="none" colors={['transparent', g.bg, g.bg]} locations={[0, 0.3, 1]} style={StyleSheet.absoluteFill} />
      {error ? <Text accessibilityLiveRegion="polite" style={{ color: g.text, backgroundColor: g.opaqueCard, padding: 12, borderRadius: 16, marginBottom: 10 }}>{error}</Text> : null}
      <KitTouchable onPress={onPublish} disabled={busy || left > 0} accessibilityRole="button" accessibilityState={{ disabled: busy || left > 0, busy }} style={{ minHeight: 54, borderRadius: 27, backgroundColor: left > 0 ? alpha(g.text, 0.1) : g.cta, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: left > 0 ? g.secondary : g.ctaInk, fontSize: 17, fontWeight: '700' }}>{busy ? LP('Отправляем…', 'Submitting…') : error ? LP('Повторить публикацию', 'Retry publishing') : LP('Отправить на проверку', 'Submit for review')}</Text></KitTouchable>
    </View>
    </View>
    {onSelectRoute ? <CommunityRootTabs lang={lang} bottomInset={insets.bottom} onSelectRoute={onSelectRoute} /> : null}
    <ScreenBackButton screen="community_pack_review" testID="community-review-back" onPress={onBack} sceneTop={scene.sceneTop} />
  </View>;
}
