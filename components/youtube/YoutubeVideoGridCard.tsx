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
import { pluralWord } from '../../constants/plural';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { plateBoxShadow, raisedBoxShadow, RAISED_LIFT } from '../v2/ShadowSurface';
import { hapticTap } from '../../hooks/use-haptics';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import { feedThumbUrl } from './YoutubeVideoCard';
import { noteSkeletonGeom } from '../../app/skeleton_geom_log';

/**
 * Ролик в сетке «2 колонки» — вариант 1 «Сетка» макета video-redesign.html (#c1, владелец 11.10).
 *
 * зачем: за один экран видно шесть роликов вместо одного-двух. Обложка 16:9 (только длительность справа внизу), под ней название ЦЕЛИКОМ
 * (без обрезки, «Methodика…» читается до конца) и строка меты «когда · просмотры» с закладкой в правом краю (круг 28; владелец 18.10 —
 * «Да, убрать плашки с обложки»: закладка больше не лежит на картинке). Содержимое прежнее: обложка и данные из каталога, закладка — то же избранное (оптимистично,
 * откат делает хранилище), тап по ролику открывает экран ролика.
 */
function YoutubeVideoGridCardBase({ video, onWatch, saved, saveCount, onToggleSave, highlighted = false }: {
  video: YoutubeVideoSnapshot;
  onWatch: () => void;
  saved?: boolean;
  saveCount?: number;
  onToggleSave?: () => void;
  highlighted?: boolean;
}) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  // зачем: межстрочный растёт с системным размером шрифта (названия не обрезаются и не слипаются).
  const styles = useScaledTextStyles(baseStyles);
  const watch = triLang(lang, { ru: 'Смотреть', uk: 'Дивитися', en: 'Watch', es: 'Ver', 'pt-BR': 'Assistir', vi: 'Xem', id: 'Tonton', tr: 'İzle', pl: 'Oglądaj' });
  const stateLabel = video.state === 'live'
    ? triLang(lang, { ru: 'Сейчас в эфире', uk: 'Зараз наживо', en: 'Live now', es: 'En directo ahora', 'pt-BR': 'Ao vivo', vi: 'Đang trực tiếp', id: 'Sedang live', tr: 'Şimdi canlı', pl: 'Na żywo' })
    : video.state === 'upcoming'
      ? triLang(lang, { ru: 'Ожидается премьера', uk: 'Очікується прем’єра', en: 'Premiere upcoming', es: 'Próximo estreno', 'pt-BR': 'Estreia em breve', vi: 'Sắp công chiếu', id: 'Segera tayang perdana', tr: 'Prömiyer yakında', pl: 'Wkrótce premiera' })
      : '';
  const savedLine = saveCount && saveCount > 0 ? triLang(lang, {
    ru: `${saveCount} ${pluralWord(lang, saveCount, { one: 'сохранил', few: 'сохранили', many: 'сохранили' })}`,
    uk: `${saveCount} ${pluralWord(lang, saveCount, { one: 'зберіг', few: 'зберегли', many: 'зберегли' })}`,
    en: `${saveCount} saved`, es: `${saveCount} guardados`, 'pt-BR': `${saveCount} salvaram`, vi: `${saveCount} đã lưu`,
    id: `${saveCount} menyimpan`, tr: `${saveCount} kaydetti`, pl: `${saveCount} zapisało`,
  }) : '';
  const saveLabel = saved
    ? triLang(lang, { ru: 'Убрать из избранного', uk: 'Прибрати з обраного', en: 'Remove from saved', es: 'Quitar de guardados', 'pt-BR': 'Remover dos salvos', vi: 'Bỏ lưu', id: 'Hapus dari simpanan', tr: 'Kaydedilenlerden çıkar', pl: 'Usuń z zapisanych' })
    : triLang(lang, { ru: 'В избранное', uk: 'В обране', en: 'Save video', es: 'Guardar vídeo', 'pt-BR': 'Salvar vídeo', vi: 'Lưu video', id: 'Simpan video', tr: 'Videoyu kaydet', pl: 'Zapisz film' });
  const duration = formatVideoDuration(video.durationSec);
  const metaParts = stateLabel
    ? [stateLabel]
    : [formatRelativeVideoDate(video.publishedAt, lang), formatViewCount(video.viewCount, lang), savedLine].filter(Boolean);

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
          {duration ? <View style={styles.duration} pointerEvents="none"><Text style={styles.durationText}>{duration}</Text></View> : null}
        </View>
        {/* зачем (владелец 11.10: «названия слишком крупные — в половину меньше, компактно и красиво»): 13/17 вес 600, максимум 2 строки;
            место под две строки резервируется всегда — карточки в ряду одной высоты. Мета — 11 приглушённым акцентным тоном темы. */}
        <Text numberOfLines={2} ellipsizeMode="tail" maxFontSizeMultiplier={1.3} style={[styles.title, { color: g.text }]}>{cleanYoutubeTitle(video.title)}</Text>
      </TouchableOpacity>
      {/* зачем (владелец 18.10): строка меты — «когда · просмотры» слева, закладка в правом краю; тап по тексту меты открывает ролик как и по обложке. */}
      <View style={styles.metaRow}>
        <Pressable accessible={false} importantForAccessibility="no" onPress={onWatch} style={styles.metaTap}>
          {metaParts.length > 0 ? <Text numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.3} style={[styles.meta, { color: g.accentText }]}>{metaParts.join(' · ')}</Text> : null}
        </Pressable>
        {onToggleSave ? (
          <Pressable
            testID={`video-save-${video.id}`}
            accessibilityRole="button"
            accessibilityLabel={saveLabel}
            accessibilityState={{ selected: !!saved }}
            hitSlop={8}
            onPressIn={() => hapticTap()}
            onPress={onToggleSave}
            style={({ pressed }) => [styles.bookmark, { backgroundColor: saved ? g.accent : g.opaqueControl }, pressed && styles.bookmarkPressed]}
          >
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={16} color={saved ? g.accentInk : g.secondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Один ролик — одна и та же ссылка: перерисовка только при смене данных, закладки или счётчика. */
export default React.memo(YoutubeVideoGridCardBase, (prev, next) => (
  prev.video === next.video
  && prev.saved === next.saved
  && prev.saveCount === next.saveCount
  && prev.highlighted === next.highlighted
  && prev.onWatch === next.onWatch
  && prev.onToggleSave === next.onToggleSave
));

const baseStyles = StyleSheet.create({
  card: { position: 'relative' },
  // `.th` макета: 16:9, радиус 14; кромки нет (стиль «Тень»).
  thumb: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden' },
  // `.du`: высота 22, поля 7, радиус 7, чёрный 70 %, справа-снизу 7; 12 → 13 по шкале D145.
  duration: { position: 'absolute', right: 7, bottom: 7, minHeight: 22, paddingHorizontal: 7, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' }, // theme-exempt: скрим/плашка поверх видео — тёмная в любой теме
  durationText: { color: '#FFFFFF', fontSize: 13, lineHeight: 17, fontWeight: '700' }, // theme-exempt: белый значок/текст поверх видео — в любой теме
  // `.gmr .bm` (video-redesign.html): круг 28 в правом краю строки меты; строка минимум 28 — карточки одной высоты.
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  metaTap: { flex: 1, minWidth: 0 },
  bookmark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flex: 0 },
  bookmarkPressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  // владелец 11.10: название 13/17 вес 600 (2 строки, минимум две — ряды одной высоты), мета 11/14.
  title: { marginTop: 6, fontSize: 13, lineHeight: 17, fontWeight: '600', minHeight: 34 },
  meta: { fontSize: 11, lineHeight: 14, fontWeight: '400', opacity: 0.85, minHeight: 14 }, // typo-exempt: владелец 11.10 — мета ролика 11 sp по прямому слову; d145-micro: мета видео 11 sp — прямое слово владельца 11.10
});
