import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { VIDEO_PLAYER_REVEAL } from '../video/videoMotion';
import type { YoutubeVideoSnapshot } from '../../shared/youtube_catalog_contract';
import { formatRelativeVideoDate } from '../video/formatRelativeVideoDate';
import { formatVideoDuration } from '../video/formatVideoDuration';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';
import { cleanYoutubeTitle } from '../../app/youtube_title_display';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useVideoMediaTones } from '../video/video_media_tones';
import { VideoPlayBadge } from '../video/VideoGlassKit';
import { plateBoxShadow, raisedBoxShadow } from '../v2/ShadowSurface';
import { formatViewCount } from '../video/formatViewCount';
import { hapticTap } from '../../hooks/use-haptics';

/**
 * зачем (замер Q53, координатор 02.10: «Видео» +34 МБ нативной памяти после 10 прокруток):
 * каталог отдаёт обложки maxres/sd (1280×720), а карточка ленты ~360 dp. Берём обложку под
 * размер карточки: компактная строка — mqdefault (320×180), полная — hqdefault (480×360, есть у всех роликов, sd — не у всех).
 */
export function feedThumbUrl(url: string, compact: boolean): string {
  const match = /^(https:\/\/i\.ytimg\.com\/vi(?:_webp)?\/[^/]+\/)(maxresdefault|sddefault|hqdefault|mqdefault|hq720)(\.(?:jpg|webp))/.exec(url);
  if (!match) return url;
  return `${match[1]}${compact ? 'mqdefault' : 'hqdefault'}${match[3]}`;
}

export default function YoutubeVideoCard({ video, onWatch, highlighted = false, inlinePlayer, belowPlayer, compact = false, saved, onToggleSave }: {
  video: YoutubeVideoSnapshot;
  onWatch: () => void;
  highlighted?: boolean;
  inlinePlayer?: React.ReactNode;
  belowPlayer?: React.ReactNode;
  compact?: boolean;
  /** Личная отметка «Нравится»: звезда справа от названия. Нет колбэка — нет кнопки. */
  saved?: boolean;
  onToggleSave?: () => void;
}) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  // зачем (закон владельца 22.10): сцена под превью, вуаль и время поверх кадра — роли темы (video_media_tones)
  const media = useVideoMediaTones();
  const compactLayout = compact && !inlinePlayer;
  const watch = triLang(lang, { ru: 'Смотреть', uk: 'Дивитися', en: 'Watch', es: 'Ver', 'pt-BR': 'Assistir', vi: 'Xem', id: 'Tonton', tr: 'İzle', pl: 'Oglądaj' });
  const stateLabel = video.state === 'live'
    ? triLang(lang, { ru: 'Сейчас в эфире', uk: 'Зараз наживо', en: 'Live now', es: 'En directo ahora', 'pt-BR': 'Ao vivo', vi: 'Đang trực tiếp', id: 'Sedang live', tr: 'Şimdi canlı', pl: 'Na żywo' })
    : video.state === 'upcoming'
      ? triLang(lang, { ru: 'Ожидается премьера', uk: 'Очікується прем’єра', en: 'Premiere upcoming', es: 'Próximo estreno', 'pt-BR': 'Estreia em breve', vi: 'Sắp công chiếu', id: 'Segera tayang perdana', tr: 'Prömiyer yakında', pl: 'Premiera wkrótce' })
      : '';
  const views = formatViewCount(video.viewCount, lang);
  const saveLabel = saved
    ? triLang(lang, { ru: 'Убрать отметку «Нравится»', uk: 'Прибрати позначку «Подобається»', en: 'Remove like', es: 'Quitar Me gusta', 'pt-BR': 'Remover gostei', vi: 'Bỏ thích', id: 'Batal suka', tr: 'Beğeniyi kaldır', pl: 'Usuń polubienie' })
    : triLang(lang, { ru: 'Нравится', uk: 'Подобається', en: 'Like', es: 'Me gusta', 'pt-BR': 'Gostei', vi: 'Thích', id: 'Suka', tr: 'Beğen', pl: 'Lubię to' });
  // зачем (Сверка video-009, макет «2 дня назад»): дата относительная, по языку интерфейса.
  const duration = formatVideoDuration(video.durationSec);
  const metaParts = [formatRelativeVideoDate(video.publishedAt, lang), views].filter(Boolean);
  const content = (
    <>
      <View style={[styles.thumbWrap, { backgroundColor: media.stage }, compactLayout && styles.thumbCompact, inlinePlayer ? styles.thumbInPlayingCard : { boxShadow: highlighted ? raisedBoxShadow(g) : plateBoxShadow(g) }]}>
        {/* зачем (координатор Q39): мягкое раскрытие ролика — см. components/video/videoMotion.ts. */}
        {inlinePlayer ? <Animated.View entering={VIDEO_PLAYER_REVEAL} style={styles.thumb}>{inlinePlayer}</Animated.View> : (
          <>
            {/* Лента: только диск — декодированные обложки ушедших карточек не держим в памяти. */}
            <Image source={{ uri: feedThumbUrl(video.thumbnailUrl, compactLayout) }} style={styles.thumb} contentFit="cover" transition={120} cachePolicy="disk" recyclingKey={video.id} />
            <View style={[styles.scrim, { backgroundColor: media.veil }]} />
            {/* зачем: `.thumb .pl` макета — круглая «play» слева-снизу кадра; кадр целиком и есть кнопка «Смотреть». */}
            <VideoPlayBadge small={compactLayout} />
            {/* зачем (video-009): `.du` макета — длительность справа внизу; без данных (старый сервер, премьера) бейджа нет. */}
            {duration ? <View style={[styles.duration, { backgroundColor: media.badge }]} pointerEvents="none"><Text style={[styles.durationText, { color: media.ink }]}>{duration}</Text></View> : null}
          </>
        )}
      </View>
      <View style={[styles.body, compactLayout && styles.bodyCompact, !!inlinePlayer && styles.bodyPlaying]}>
        {!!stateLabel && <View style={[styles.state, { backgroundColor: g.selected }]}><Ionicons name={video.state === 'live' ? 'radio' : 'time-outline'} size={13} color={g.text} /><Text style={[styles.stateText, { color: g.text }]}>{stateLabel}</Text></View>}
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text numberOfLines={compactLayout ? 2 : undefined} style={[styles.title, compactLayout && styles.titleCompact, { color: g.text }]}>{cleanYoutubeTitle(video.title)}</Text>
            {metaParts.length > 0 && <Text style={[styles.meta, compactLayout && styles.metaCompact, { color: compactLayout ? g.accentText : g.secondary }]}>{metaParts.join(' · ')}</Text>}
          </View>
          {onToggleSave ? (
            <Pressable
              testID={`video-save-${video.id}`}
              accessibilityRole="button"
              accessibilityLabel={saveLabel}
              accessibilityState={{ selected: !!saved }}
              hitSlop={4}
              onPressIn={() => hapticTap()}
              onPress={(event) => { event.stopPropagation(); onToggleSave(); }}
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: 'transparent' }, pressed && styles.savePressed]}
            >
              <Ionicons name={saved ? 'star' : 'star-outline'} size={20} color={saved ? g.accentTextSafe : g.secondary} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </>
  );

  const card = inlinePlayer ? (
    <View testID="lingman-video-card" style={[styles.card, styles.playingCard, { backgroundColor: g.plateFillFrom, boxShadow: highlighted ? raisedBoxShadow(g) : plateBoxShadow(g) }]}>
      {content}
    </View>
  ) : (
    <TouchableOpacity
      testID="lingman-video-card"
      accessibilityRole="button"
      accessibilityLabel={`${watch}: ${cleanYoutubeTitle(video.title)}${stateLabel ? `. ${stateLabel}` : ''}`}
      onPress={onWatch}
      activeOpacity={0.86}
      /* зачем не функция: TouchableOpacity не передаёт `pressed` — ветка
         нажатия была мёртвой. Отклик даёт activeOpacity. */
      style={[styles.card, compactLayout ? styles.compactCard : styles.gridCard]}
    >
      {content}
    </TouchableOpacity>
  );

  return <>{card}{belowPlayer}</>;
}


const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  // зачем (Тень 12.10): ни кромок, ни кольца «выбрано» (accent) — выбранный ролик приподнят тенью (raisedBoxShadow) на обложке;
  // у играющей карточки overflow убран (клип тени), верх обложки скруглён под плашку (thumbInPlayingCard)
  gridCard: { borderRadius: 16, marginBottom: 20 },
  compactCard: { borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  playingCard: { borderRadius: 20 },
  thumbWrap: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden' },
  thumbInPlayingCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  thumbCompact: { width: 150, aspectRatio: 16 / 9, borderRadius: 12 },
  thumb: { ...StyleSheet.absoluteFillObject },
  scrim: { ...StyleSheet.absoluteFillObject },
  state: { alignSelf: 'flex-start', minHeight: 27, borderRadius: 14, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 9 },
  stateText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  body: { paddingTop: 10, paddingBottom: 2 },
  bodyCompact: { flex: 1, minWidth: 0, paddingTop: 0, paddingBottom: 0 },
  bodyPlaying: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  // `.du`: 22 высота, поля 7, радиус 7, чёрный 72%, 12/700 → 13 по D145.
  duration: { position: 'absolute', right: 10, bottom: 10, height: 22, paddingHorizontal: 7, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  durationText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  // владелец 11.10: в списке роликов плейлиста название компактнее — 13/17 вес 600, мета 11/14 приглушённым акцентным тоном.
  titleCompact: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  meta: { marginTop: 4, fontSize: 13, fontWeight: '700' },
  metaCompact: { marginTop: 2, fontSize: 11, lineHeight: 14, fontWeight: '400', opacity: 0.85 }, // typo-exempt: владелец 11.10 — мета ролика 11 sp по прямому слову; d145-micro: мета видео 11 sp — прямое слово владельца 11.10
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titleCopy: { flex: 1, minWidth: 0 },
  saveBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  savePressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
});
