import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { homeSceneTokensForTheme } from '../home/v2/scene/home_scene_tokens';
import { useSceneStatusBar } from '../../hooks/use_scene_status_bar';
import ScreenBackButton from '../v2/ScreenBackButton';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { FlatList, StatusBar, Text, View } from 'react-native';
import { KitTouchable } from '../KitTouchable';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';
import { CommunitySceneBackdrop, CommunitySceneFan } from './CommunityScene';
import type { CommunitySceneCard } from './CommunityPackScene';

export type CommunityCheckCard = CommunitySceneCard & Readonly<{ issue?: string; fixed?: boolean }>;
export function CommunityPackCheckScene({ cards, lang, busy, error, onEdit, onPublish, onBack, bottomInset = 20 }: Readonly<{
  cards: readonly CommunityCheckCard[]; lang: Lang; busy: boolean; error?: string | null;
  onEdit: (index: number) => void; onPublish: () => void; onBack: () => void; bottomInset?: number;
}>): React.JSX.Element {
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const insets = useStableSafeAreaInsets();
  const scene = homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance);
  useSceneStatusBar('community-review', true, 'review_scene', scene.sceneTop);
  const g = liquidGlassTokens(liquidGlassThemeId);
  const left = cards.filter(card => card.issue).length;
  const LP = (ru: string, en: string): string => triLang(lang, { ru, uk: en, en, es: en });
  const status = left ? LP(`Нужно исправить карточки: ${left}`, `Cards to fix: ${left}`) : LP('Набор готов к публикации', 'Ready to publish');
  return <View style={{ flex: 1, backgroundColor: scene.sceneTop }}>
    <StatusBar translucent backgroundColor={scene.sceneTop} barStyle="light-content" />
    <View style={{ flex: 1, paddingTop: insets.top }}>
    <FlatList style={{ backgroundColor: g.opaqueCard }} data={cards} keyExtractor={card => card.id} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 90 }} ListHeaderComponent={<>
      <View style={{ height: 390, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden' }}><CommunitySceneBackdrop /><CommunitySceneFan />

        <View style={{ position: 'absolute', bottom: 60, left: 20, right: 20 }}><Text style={{ fontSize: 34, fontWeight: '800', color: '#FFFFFF' }}>{LP('Проверка', 'Review')}</Text><Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginTop: 14 }}>✦ {status}</Text></View>
      </View>
      <View style={{ marginTop: -34, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 16, backgroundColor: g.opaqueCard, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ fontSize: 22, fontWeight: '700', color: g.text }}>{LP('Карточки', 'Cards')}</Text><Text style={{ color: g.secondary }}>{cards.length}</Text></View>
    </>} renderItem={({ item, index }) => <View style={{ paddingHorizontal: 16 }}><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 72, paddingVertical: 12, borderBottomWidth: .5, borderBottomColor: g.dividerTone }}><Ionicons name={item.issue ? 'alert-circle-outline' : 'checkmark-circle'} size={22} color={item.issue ? g.secondary : g.accent} /><View style={{ flex: 1 }}><Text style={{ color: g.text, fontSize: 16, fontWeight: '700' }}>{item.front}</Text><Text style={{ color: g.secondary, fontSize: 14, marginTop: 4 }}>{item.back}</Text>{item.issue || item.fixed ? <Text style={{ color: g.secondary, fontSize: 13, marginTop: 5 }}>{item.issue ?? LP('Исправлено', 'Fixed')}</Text> : null}</View>{item.issue ? <KitTouchable onPress={() => onEdit(index)} accessibilityRole="button" style={{ minHeight: 40, borderRadius: 20, paddingHorizontal: 12, backgroundColor: g.ctaFill, justifyContent: 'center' }}><Text style={{ color: g.ctaFillInk, fontWeight: '700' }}>{LP('Исправить', 'Fix')}</Text></KitTouchable> : null}</View></View>} />
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: bottomInset, backgroundColor: g.opaqueCard }}>
      {error ? <Text accessibilityLiveRegion="polite" style={{ color: g.text, backgroundColor: g.opaqueCard, padding: 12, borderRadius: 16, marginBottom: 10 }}>{error}</Text> : null}
      <KitTouchable onPress={onPublish} disabled={busy || left > 0} accessibilityRole="button" accessibilityState={{ disabled: busy || left > 0, busy }} style={{ minHeight: 54, borderRadius: 27, backgroundColor: g.ctaFill, opacity: left > 0 ? .45 : 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: g.ctaFillInk, fontSize: 17, fontWeight: '700' }}>{busy ? LP('Отправляем…', 'Submitting…') : error ? LP('Повторить публикацию', 'Retry publishing') : LP('Отправить на проверку', 'Submit for review')}</Text></KitTouchable>
    </View>
    </View>
    <ScreenBackButton screen="community_pack_review" testID="community-review-back" onPress={onBack} sceneTop={scene.sceneTop} />
  </View>;
}
