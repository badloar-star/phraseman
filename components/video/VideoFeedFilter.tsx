/**
 * Ряд из четырёх положений над лентой «Видео»: «Все · Не смотрел · Избранное · Плейлисты» — и строка для пустого результата.
 *
 * зачем (владелец 11.11: «слишком много всего… супер просто, всё что можно скомпоновать»; макет
 * docs/work/mockups/video-hub-2026-11-11, экран 1; подтверждение «да, перестраивай»): ряд заменил три вкладки
 * «Новое / Плейлисты / Наборы». Плейлисты стали одним из положений ряда, «Наборы» живут в разделе «Карточки».
 * Смена положения мгновенная: список фильтруется на телефоне, сеть не участвует.
 *
 * Ряд прокручивается по горизонтали: длинные подписи (es «Sin ver», крупный шрифт) не сжимаются и не обрезаются.
 */
import React, { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { V2, V2_TYPE } from '../../constants/v2Style';
import V2Pressable from '../v2/V2Pressable';
import { useV2Palette } from '../v2/useV2Palette';
import { VIDEO_FEED_VIEWS, type VideoFeedView } from '../../app/video_feed_filter';

type Props = {
  value: VideoFeedView;
  onChange: (next: VideoFeedView) => void;
};

export const VideoFeedChips = memo(function VideoFeedChips({ value, onChange }: Props) {
  const { lang } = useLang();
  const p = useV2Palette();
  const labels = useMemo(() => triLang(lang, {
    ru: { all: 'Все', unwatched: 'Не смотрел', favorites: 'Избранное', playlists: 'Плейлисты' },
    uk: { all: 'Усі', unwatched: 'Не дивився', favorites: 'Обране', playlists: 'Плейлисти' },
    en: { all: 'All', unwatched: 'Unwatched', favorites: 'Favorites', playlists: 'Playlists' },
    es: { all: 'Todos', unwatched: 'Sin ver', favorites: 'Favoritos', playlists: 'Listas' },
    'pt-BR': { all: 'Todos', unwatched: 'Não vistos', favorites: 'Favoritos', playlists: 'Playlists' },
    vi: { all: 'Tất cả', unwatched: 'Chưa xem', favorites: 'Yêu thích', playlists: 'Danh sách' },
    id: { all: 'Semua', unwatched: 'Belum ditonton', favorites: 'Favorit', playlists: 'Playlist' },
    tr: { all: 'Tümü', unwatched: 'İzlenmedi', favorites: 'Favoriler', playlists: 'Listeler' },
    pl: { all: 'Wszystkie', unwatched: 'Nieobejrzane', favorites: 'Ulubione', playlists: 'Playlisty' },
  }), [lang]);
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.row} style={styles.scroll}>
        {VIDEO_FEED_VIEWS.map((view) => { // guard-ok: положений ровно четыре — это не список данных, виртуализация не нужна
          const active = value === view;
          return (
            <V2Pressable
              key={view}
              testID={`video-feed-chip-${view}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={labels[view]}
              onPress={() => onChange(view)}
              scaleTo={0.96}
              // зачем: выбранное положение — светлая «таблетка» главной кнопки, остальные — тихая плашка; рамок нет.
              style={[styles.chip, { backgroundColor: active ? p.cta : p.control }]}
            >
              <Text style={[styles.label, { color: active ? p.ctaText : p.textSecondary }]} maxFontSizeMultiplier={1.2}>{labels[view]}</Text>
            </V2Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

/** Что показать, когда под фильтром ничего не осталось: коротко и без кнопок — ряд положений над строкой уже есть. */
export const VideoFeedFilterEmpty = memo(function VideoFeedFilterEmpty({ filter }: { filter: VideoFeedView }) {
  const { lang } = useLang();
  const p = useV2Palette();
  const text = filter === 'favorites'
    ? triLang(lang, { ru: 'В избранном пока пусто', uk: 'В обраному поки порожньо', en: 'No favorites yet', es: 'Aún no hay favoritos', 'pt-BR': 'Ainda não há favoritos', vi: 'Chưa có mục yêu thích', id: 'Belum ada favorit', tr: 'Henüz favori yok', pl: 'Nie ma jeszcze ulubionych' })
    : triLang(lang, { ru: 'Все ролики просмотрены', uk: 'Усі ролики переглянуто', en: 'You’ve watched every video', es: 'Has visto todos los vídeos', 'pt-BR': 'Você já viu todos os vídeos', vi: 'Bạn đã xem hết video', id: 'Semua video sudah ditonton', tr: 'Tüm videoları izledin', pl: 'Wszystkie filmy obejrzane' });
  return (
    <View testID="video-feed-filter-empty" style={styles.empty}>
      <Text style={[styles.emptyText, { color: p.textSecondary }]}>{text}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  // зачем: ряд уходит под поля экрана (‑20), чтобы при прокрутке подписи не обрезались у края; высота 44 — полная зона касания.
  wrap: { marginTop: 14, marginBottom: 2, marginHorizontal: -V2.screenPad },
  scroll: { flexGrow: 0 },
  row: { paddingHorizontal: V2.screenPad, gap: 8, alignItems: 'center', minHeight: 44 },
  chip: { minHeight: 38, paddingHorizontal: 16, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  label: { ...V2_TYPE.headline },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { ...V2_TYPE.body, textAlign: 'center' },
});
