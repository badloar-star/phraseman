import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useLang } from '../../LangContext';
import { useV2Palette } from '../../v2/useV2Palette';
import type { LingmanYoutubeVideo } from '../../../app/lingman_youtube';
import { triLang } from '../../../constants/i18n';
import { V2 } from '../../../constants/v2Style';
import { colorWithAlpha } from '../../v2/plateAlpha';
import { renderWindowEpoch, useRenderCause } from '../../../app/render_cause_probe';
import { HOME_PLATE_ALPHA } from './homePlate';
import { animateNextLayoutTransition } from '../../../app/smooth_layout';
import VideoThumbBase from '../../../app/flashcards/VideoThumb';
import { withHomeChildCost } from '../../../app/home_focus_cost_probe';
import { useShadowGlass } from '../../v2/ShadowSurface';
// зачем ([HOME-CHILD-COST] 18.10): превью видео — кандидат на «nested-update» рейки (8–16 мс на возврате): измеряем отдельно; dev, в релизе тот же компонент
const VideoThumb = withHomeChildCost('video_thumb', VideoThumbBase);

type Props = {
  videos: readonly LingmanYoutubeVideo[];
  status: 'loading' | 'ready' | 'error';
  ownerActive: boolean;
  onSeeAll: () => void;
};

/** Через сколько мс без видео блок тихо скрывается (решение координатора 15.10). */
export const VIDEO_RAIL_GIVE_UP_MS = 10_000;

/** The Home snapshot is already loaded for the unread count; no second feed request. */
/** зачем (координатор 17.10, скорость Главной): onSeeAll — новая стрелка на каждый рендер Главной; через ref memo-вид перерисовывается только от данных. */
export default function HomeV2VideoRail(props: Props) {
  const latestRef = useRef(props.onSeeAll);
  latestRef.current = props.onSeeAll;
  const seeAll = useCallback(() => latestRef.current(), []);
  return <HomeV2VideoRailView videos={props.videos} status={props.status} ownerActive={props.ownerActive} onSeeAll={seeAll} />;
}

type RailCardsProps = Readonly<{
  videos: readonly LingmanYoutubeVideo[];
  title: string;
  plateColor: string;
  glass: ReturnType<typeof useShadowGlass>;
  onSelect: (videoId: string) => void;
}>;

// зачем (координатор 18.10, [HOME-CHILD-COST]: рейка 8–16 мс на возврате «назад», actual ≈ base — перерисовывались все 8 карточек): на возврате меняется только `ownerActive` (нужен окну проигрывателя и сбросу выбранного), карточкам он не нужен.
// Карточки вынесены в memo-компонент с примитивами и устойчивым `onSelect` (setState): смена ownerActive рейку перерисует, а восемь карточек с превью — нет. Вид и поведение прежние.
const VideoRailCards = memo(function VideoRailCards({ videos, title, plateColor, glass, onSelect }: RailCardsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={s.rail} decelerationRate="fast">
      {videos.slice(0, 8).map((video) => (
        <Pressable
          key={video.id}
          testID={`home-v2-video-${video.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${title}: ${video.title}`}
          onPress={() => onSelect(video.id)}
          style={[s.card, { backgroundColor: plateColor }]}
        >
          {/* зачем (координатор 12.10, [THUMB] + запасной вид): превью — через общий VideoThumb; при ошибке/пустом адресе вместо серой пустой плитки — название на собственной плашке ленты,
              ▶ остаётся тот же внизу слева, новых запросов и повторов нет */}
          <VideoThumb surface="home_video_rail" id={video.id} videoId={video.id} thumbUrl={video.thumbnailUrl || null} title={video.title} g={glass} showTitle showPlay={false} fallbackBackground="transparent" />
          <View style={s.cardContent}>
            <Ionicons name="play-circle" size={26} color="#FFFFFF" /* theme-exempt: белая иконка play лежит на превью ролика (фото), не на фоне темы */ />
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
});

const HomeV2VideoRailView = memo(function HomeV2VideoRailView({ videos, status, ownerActive, onSeeAll }: Props) {
  useRenderCause('home:video_rail', () => ({ videos, status, ownerActive, onSeeAll }), renderWindowEpoch()); // зачем (координатор 15.10): причина каждой перерисовки в окне 10 с, [HOME-RENDERS]; в релизе пустая функция
  const { lang } = useLang();
  const p = useV2Palette();
  const glass = useShadowGlass();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const selectedVideo = videos.find((video) => video.id === activeVideoId) ?? null;
  // The WebView module is evaluated only after a deliberate tap, never on Home's first frame.
  const VideoPlayerModal = selectedVideo && ownerActive
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- keep the WebView off Home's first frame
    ? (require('./HomeV2VideoPlayerModal').default as typeof import('./HomeV2VideoPlayerModal').default)
    : null;

  useEffect(() => {
    if (!ownerActive) setActiveVideoId(null);
  }, [ownerActive]);

  // зачем (решение координатора 15.10, бета-тест А4; владелец 01.10 «никаких недоступно»): без видео и без связи серые скелеты висели вечно. Теперь через 10 с без данных блок тихо скрывается,
  // а когда видео появились (сеть вернулась, Главная перечитала) — возвращается сам. Ни «недоступно», ни кнопки; скрытие/возврат — через animateNextLayoutTransition (раскладка не прыгает).
  const hasVideos = videos.length > 0;
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (hasVideos) {
      if (gaveUp) {
        console.log(`[HOME-VIDEO] блок возвращён: видео появились status=${status}`); // guard-ok: ветка решения называет значение
        animateNextLayoutTransition();
        setGaveUp(false);
      }
      return undefined;
    }
    if (gaveUp) return undefined;
    const timer = setTimeout(() => {
      console.log(`[HOME-VIDEO] блок скрыт: ${VIDEO_RAIL_GIVE_UP_MS} мс без видео status=${status}`); // guard-ok: ветка решения называет значение
      animateNextLayoutTransition();
      setGaveUp(true);
    }, VIDEO_RAIL_GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [hasVideos, gaveUp, status]);

  const title = triLang(lang, { ru: 'Видео', uk: 'Відео', en: 'Videos', es: 'Vídeos', 'pt-BR': 'Vídeos', vi: 'Video', id: 'Video', tr: 'Videolar', pl: 'Wideo' });
  const seeAll = triLang(lang, { ru: 'Смотреть все', uk: 'Дивитися всі', en: 'See all', es: 'Ver todos', 'pt-BR': 'Ver todos', vi: 'Xem tất cả', id: 'Lihat semua', tr: 'Tümünü gör', pl: 'Zobacz wszystkie' });

  if (!hasVideos && gaveUp) return null;

  return (
    <View testID="home-v2-video-rail" style={s.section}>
      <View style={s.heading}>
        <Text style={[s.headingText, { color: p.text }]}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={seeAll} onPress={onSeeAll} hitSlop={8} style={s.seeAll}>
          <Text style={[s.seeAllText, { color: p.link }]}>{seeAll}</Text>
          <Ionicons name="chevron-forward" size={15} color={p.link} />
        </Pressable>
      </View>
      {videos.length ? (
        <VideoRailCards videos={videos} title={title} plateColor={colorWithAlpha(p.glassRaised, HOME_PLATE_ALPHA)} glass={glass} onSelect={setActiveVideoId} />
      ) : (
        // зачем (владелец 01.10): рейка не прячется и не пишет «недоступны/нет видео» —
        // при любом статусе без данных те же скелетоны резервной геометрии 246x138.
        // status оставлен в Props для совместимости с Home; повтор загрузки — на стороне Home.
        <View testID="home-v2-video-loading" style={s.placeholderRow} accessibilityLabel={title}>
          <View style={[s.placeholderCard, { backgroundColor: colorWithAlpha(p.glassRaised, HOME_PLATE_ALPHA) }]} />
          <View style={[s.placeholderCard, { backgroundColor: colorWithAlpha(p.glassRaised, HOME_PLATE_ALPHA) }]} />
        </View>
      )}
      {VideoPlayerModal && selectedVideo ? <VideoPlayerModal video={selectedVideo} onClose={() => setActiveVideoId(null)} /> : null}
    </View>
  );
});


const s = StyleSheet.create({
  section: { marginTop: 0 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 26, marginBottom: 2 },
  headingText: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  seeAll: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  seeAllText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  rail: { gap: 9, paddingRight: V2.screenPad, paddingBottom: 2 },
  card: { width: 246, height: 138, borderRadius: 0, overflow: 'hidden' },
  cardContent: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-start', padding: 8 },
  placeholderRow: { height: 138, flexDirection: 'row', gap: 9, overflow: 'hidden' },
  placeholderCard: { width: 246, height: 138, borderRadius: 0 },
});
