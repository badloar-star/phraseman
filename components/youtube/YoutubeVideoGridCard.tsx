import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { YoutubeVideoSnapshot } from '../../shared/youtube_catalog_contract';
import { formatRelativeVideoDate } from '../video/formatRelativeVideoDate';
import { formatVideoDuration } from '../video/formatVideoDuration';
import { formatViewCount } from '../video/formatViewCount';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';
import { cleanYoutubeTitle } from '../../app/youtube_title_display';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useVideoMediaTones } from '../video/video_media_tones';
import { plateBoxShadow, raisedBoxShadow, RAISED_LIFT } from '../v2/ShadowSurface';
import { hapticTap } from '../../hooks/use-haptics';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import { feedThumbUrl } from './YoutubeVideoCard';
import { noteSkeletonGeom } from '../../app/skeleton_geom_log';

/** Отметка «Нравится» остаётся на карточке; общий стор синхронизирует её между экранами. */
function YoutubeVideoGridCardBase({ video, onWatch, saved, onToggleSave, highlighted = false }: {
  video: YoutubeVideoSnapshot;
  onWatch: () => void;
  saved?: boolean;
  onToggleSave?: () => void;
  highlighted?: boolean;
}) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  // зачем (закон владельца 22.10): плашка и время поверх кадра — роли темы (video_media_tones)
  const media = useVideoMediaTones();
  // зачем: межстрочный растёт с системным размером шрифта (названия не обрезаются и не слипаются).
  const styles = useScaledTextStyles(baseStyles);
  const watch = triLang(lang, { ru: 'Смотреть', uk: 'Дивитися', en: 'Watch', es: 'Ver', 'pt-BR': 'Assistir', vi: 'Xem', id: 'Tonton', tr: 'İzle', pl: 'Oglądaj' });
  const stateLabel = video.state === 'live'
    ? triLang(lang, { ru: 'Сейчас в эфире', uk: 'Зараз наживо', en: 'Live now', es: 'En directo ahora', 'pt-BR': 'Ao vivo', vi: 'Đang trực tiếp', id: 'Sedang live', tr: 'Şimdi canlı', pl: 'Na żywo' })
    : video.state === 'upcoming'
      ? triLang(lang, { ru: 'Ожидается премьера', uk: 'Очікується прем’єра', en: 'Premiere upcoming', es: 'Próximo estreno', 'pt-BR': 'Estreia em breve', vi: 'Sắp công chiếu', id: 'Segera tayang perdana', tr: 'Prömiyer yakında', pl: 'Wkrótce premiera' })
      : '';
  const saveLabel = saved
    ? triLang(lang, { ru: 'Убрать отметку «Нравится»', uk: 'Прибрати позначку «Подобається»', en: 'Remove like', es: 'Quitar Me gusta', 'pt-BR': 'Remover gostei', vi: 'Bỏ thích', id: 'Batal suka', tr: 'Beğeniyi kaldır', pl: 'Usuń polubienie' })
    : triLang(lang, { ru: 'Нравится', uk: 'Подобається', en: 'Like', es: 'Me gusta', 'pt-BR': 'Gostei', vi: 'Thích', id: 'Suka', tr: 'Beğen', pl: 'Lubię to' });
  const duration = formatVideoDuration(video.durationSec);
  const metaParts = stateLabel
    ? [stateLabel]
    : [formatRelativeVideoDate(video.publishedAt, lang), formatViewCount(video.viewCount, lang)].filter(Boolean);

  return (
    <View testID="lingman-video-card" onLayout={(event) => noteSkeletonGeom('video_grid', 'ready', event.nativeEvent.layout.height)} style={styles.card}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${watch}: ${cleanYoutubeTitle(video.title)}${stateLabel ? `. ${stateLabel}` : ''}`}
        onPress={onWatch}
        activeOpacity={0.86}
      >
        {/* зачем (Тень 12.10): обложка без кромки; выбранный ролик (highlighted) приподнят — raisedBoxShadow + сдвиг, как в спеке */}
        <View style={[styles.thumb, { backgroundColor: g.opaqueControl }, highlighted ? { boxShadow: raisedBoxShadow(g), transform: [{ translateY: RAISED_LIFT }] } : { boxShadow: plateBoxShadow(g) }]}>
          {/* Лента: только диск — декодированные обложки ушедших карточек не держим в памяти. */}
          <Image accessible={false} source={{ uri: feedThumbUrl(video.thumbnailUrl, true) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} cachePolicy="disk" recyclingKey={video.id} />
          {duration ? <View style={[styles.duration, { backgroundColor: media.badge }]} pointerEvents="none"><Text style={[styles.durationText, { color: media.ink }]}>{duration}</Text></View> : null}
        </View>
        {/* зачем (владелец 11.10: «названия слишком крупные — в половину меньше, компактно и красиво»): 13/17 вес 600, максимум 2 строки;
            место под две строки резервируется всегда — карточки в ряду одной высоты. Мета — 11 приглушённым акцентным тоном темы. */}
        <Text numberOfLines={2} ellipsizeMode="tail" maxFontSizeMultiplier={1.3} style={[styles.title, { color: g.text }]}>{cleanYoutubeTitle(video.title)}</Text>
      </TouchableOpacity>
      {/* Звезда меняет только отметку; тап по метаданным открывает ролик. */}
      <View style={styles.metaRow}>
        <Pressable accessible={false} importantForAccessibility="no" onPress={onWatch} style={styles.metaTap}>
          {metaParts.length > 0 ? <Text numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.3} style={[styles.meta, { color: g.accentTextSafe }]}>{metaParts.join(' · ')}</Text> : null}
        </Pressable>
        {onToggleSave ? (
          <Pressable
            testID={`video-save-${video.id}`}
            accessibilityRole="button"
            accessibilityLabel={saveLabel}
            accessibilityState={{ selected: !!saved }}
            hitSlop={8}
            onPressIn={() => hapticTap()}
            onPress={(event) => { event.stopPropagation(); onToggleSave(); }}
            style={({ pressed }) => [styles.like, { backgroundColor: 'transparent' }, pressed && styles.likePressed]}
          >
            <Ionicons name={saved ? 'star' : 'star-outline'} size={20} color={saved ? g.accentTextSafe : g.secondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Один ролик — одна и та же ссылка: перерисовка только при смене данных или отметки. */
export default React.memo(YoutubeVideoGridCardBase, (prev, next) => (
  prev.video === next.video
  && prev.saved === next.saved
  && prev.highlighted === next.highlighted
  && prev.onWatch === next.onWatch
  && prev.onToggleSave === next.onToggleSave
));

const baseStyles = StyleSheet.create({
  card: { position: 'relative' },
  // `.th` макета: 16:9, радиус 14; кромки нет (стиль «Тень»).
  thumb: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden' },
  // `.du`: высота 22, поля 7, радиус 7, чёрный 70 %, справа-снизу 7; 12 → 13 по шкале D145.
  duration: { position: 'absolute', right: 7, bottom: 7, minHeight: 22, paddingHorizontal: 7, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  durationText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  // `.gmr .bm` (video-redesign.html): круг 28 в правом краю строки меты; строка минимум 28 — карточки одной высоты.
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  metaTap: { flex: 1, minWidth: 0 },
  like: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flex: 0 },
  likePressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  // владелец 11.10: название 13/17 вес 600 (2 строки, минимум две — ряды одной высоты), мета 11/14.
  title: { marginTop: 6, fontSize: 13, lineHeight: 17, fontWeight: '600', minHeight: 34 },
  meta: { fontSize: 11, lineHeight: 14, fontWeight: '400', minHeight: 14 }, // typo-exempt: владелец 11.10 — мета ролика 11 sp по прямому слову; d145-micro: мета видео 11 sp — прямое слово владельца 11.10
});
