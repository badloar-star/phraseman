/**
 * Переключатель ленты «Видео»: «Все · Не смотрел · Избранное» и строка для пустого результата.
 *
 * зачем (владелец 11.11, макет docs/work/mockups/video-hub-2026-11-11, экран 1): один ряд из трёх положений над
 * списком роликов. Собран на общем V2SegmentedControl — вид, тема и размер шрифта те же, что у остальных
 * переключателей приложения; смена положения мгновенная (список фильтруется на телефоне, сеть не участвует).
 */
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { V2_TYPE } from '../../constants/v2Style';
import V2SegmentedControl, { type V2Segment } from '../v2/V2SegmentedControl';
import { useV2Palette } from '../v2/useV2Palette';
import type { VideoFeedFilter as VideoFeedFilterKey } from '../../app/video_feed_filter';

type Props = {
  value: VideoFeedFilterKey;
  onChange: (next: VideoFeedFilterKey) => void;
};

export const VideoFeedFilter = memo(function VideoFeedFilter({ value, onChange }: Props) {
  const { lang } = useLang();
  const segments = useMemo<readonly V2Segment<VideoFeedFilterKey>[]>(() => {
    const copy = triLang(lang, {
      ru: { all: 'Все', unwatched: 'Не смотрел', favorites: 'Избранное' },
      uk: { all: 'Усі', unwatched: 'Не дивився', favorites: 'Обране' },
      en: { all: 'All', unwatched: 'Unwatched', favorites: 'Favorites' },
      es: { all: 'Todos', unwatched: 'Sin ver', favorites: 'Favoritos' },
      'pt-BR': { all: 'Todos', unwatched: 'Não vistos', favorites: 'Favoritos' },
      vi: { all: 'Tất cả', unwatched: 'Chưa xem', favorites: 'Yêu thích' },
      id: { all: 'Semua', unwatched: 'Belum ditonton', favorites: 'Favorit' },
      tr: { all: 'Tümü', unwatched: 'İzlenmedi', favorites: 'Favoriler' },
      pl: { all: 'Wszystkie', unwatched: 'Nieobejrzane', favorites: 'Ulubione' },
    });
    return [
      { key: 'all', label: copy.all },
      { key: 'unwatched', label: copy.unwatched },
      { key: 'favorites', label: copy.favorites },
    ];
  }, [lang]);
  return <V2SegmentedControl testID="video-feed-filter" segments={segments} value={value} onChange={onChange} />;
});

/** Что показать, когда под фильтром ничего не осталось: коротко и без кнопок — переключатель над строкой уже есть. */
export const VideoFeedFilterEmpty = memo(function VideoFeedFilterEmpty({ filter }: { filter: VideoFeedFilterKey }) {
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
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { ...V2_TYPE.body, textAlign: 'center' },
});
