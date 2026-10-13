/**
 * Превью ролика в строке набора «Из видео» (cards-028).
 *
 * зачем (координатор 12.10): (1) dev-фикстура роликов подставляет выдуманные id devDemoVid0…4 — i.ytimg.com на них отвечает 404, плитки на кадрах были серыми. В dev такие id берут
 * локальные картинки из ассетов (без сети); в стор-сборке этой ветки нет. (2) Настоящий дефект UX: при ошибке загрузки превью (удалённый ролик) плитка оставалась серой пустой.
 * Теперь — запасной вид по образцу: тон темы, значок ▶ и (на крупной плитке) название. Новых запросов и повторов нет: состояние ошибки живёт в плитке, пока не сменится ролик.
 * Лог: [THUMB] fallback surface=… id=… reason=…
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { thumbTrace, traceThumbMissing, type ThumbSurface } from '../thumb_trace';

/**
 * Превью для dev-фикстуры роликов.
 * зачем (координатор 13.10, cards-028 / cards-v2-018, вариант «а»): кадры сверяем с НАСТОЯЩИМ превью ролика, как его видят люди, —
 * поэтому выдуманным id фикстуры (devDemoVid0…4) подставляем превью реальных роликов канала (публичная RSS-лента канала приложения),
 * а не локальные иллюстрации. id фикстуры не меняются — ссылки съёмки и тесты прежние. Только dev: в стор-сборке ветки нет.
 */
const DEV_DEMO_REAL_VIDEO_IDS = ['cnrVN_uz7Sg', 'rGPfdiI3S1k', 'OHxgJuazJO0', 'Tyo95ydzoPs', 'GKn9GmHndMQ'] as const;
const DEV_DEMO_THUMBS: readonly ImageSourcePropType[] = DEV_DEMO_REAL_VIDEO_IDS.map((realId) => ({ uri: `https://i.ytimg.com/vi/${realId}/hqdefault.jpg` }));
const DEV_DEMO_VIDEO_RE = /^devDemoVid(\d+)$/;

/** Картинка dev-фикстуры по id ролика; вне dev и для настоящих id — null. */
export function devDemoThumbSource(videoId: string | undefined | null): ImageSourcePropType | null {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return null;
  const match = DEV_DEMO_VIDEO_RE.exec(String(videoId ?? '').trim());
  if (!match) return null;
  return DEV_DEMO_THUMBS[Number(match[1]) % DEV_DEMO_THUMBS.length] ?? null;
}

export type VideoThumbProps = Readonly<{
  surface: ThumbSurface;
  id: string;
  videoId?: string;
  thumbUrl: string | null;
  title: string;
  g: GlassTokens;
  /** Крупная плитка: запасной вид с названием; у узкой строки название рядом, поэтому только ▶. */
  showTitle: boolean;
  /** Лента Главной: ▶ рисует сама плитка поверх картинки — в запасном виде второй значок не нужен. По умолчанию значок есть. */
  showPlay?: boolean;
  /** Тон подложки запасного вида; по умолчанию — тон плашки темы (opaqueControl). Лента Главной передаёт прозрачный: видна её собственная плашка. */
  fallbackBackground?: string;
}>;

function VideoThumbFallback({ surface, id, reason, title, g, showTitle, showPlay, fallbackBackground }: Readonly<{ surface: ThumbSurface; id: string; reason: string; title: string; g: GlassTokens; showTitle: boolean; showPlay: boolean; fallbackBackground?: string }>) {
  const loggedRef = useRef(false);
  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    console.warn(`[THUMB] fallback surface=${surface} id=${id} reason=${reason} → запасной вид (тон ${fallbackBackground ?? 'темы'}${showPlay ? ', ▶' : ''}${showTitle ? ', название' : ''}), без повторных запросов`); // guard-ok: единичный лог на плитку
  }, [fallbackBackground, id, reason, showPlay, showTitle, surface]);
  return (
    <View testID={`video-thumb-fallback-${id}`} pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: fallbackBackground ?? g.opaqueControl }]}>
      {showPlay ? <Ionicons name="play-circle" size={showTitle ? 40 : 30} color={g.accentText} /> : null}
      {showTitle ? (
        <Text numberOfLines={2} style={[styles.fallbackTitle, { color: g.text }]} maxFontSizeMultiplier={1.2}>{title}</Text>
      ) : null}
    </View>
  );
}

export const VideoThumb = React.memo(function VideoThumb({ surface, id, videoId, thumbUrl, title, g, showTitle, showPlay = true, fallbackBackground }: VideoThumbProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const local = devDemoThumbSource(videoId);
  if (local) {
    // dev-фикстура: превью реального ролика канала (см. DEV_DEMO_THUMBS)
    return <Image accessible={false} source={local} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} recyclingKey={videoId} cachePolicy="memory-disk" />;
  }
  if (!thumbUrl) {
    traceThumbMissing(surface, id, `videoId пуст в наборе (${String(videoId ?? '')})`);
    return <VideoThumbFallback surface={surface} id={id} reason="no_video_id" title={title} g={g} showTitle={showTitle} showPlay={showPlay} fallbackBackground={fallbackBackground} />;
  }
  if (failedUrl === thumbUrl) {
    return <VideoThumbFallback surface={surface} id={id} reason="load_error" title={title} g={g} showTitle={showTitle} showPlay={showPlay} fallbackBackground={fallbackBackground} />;
  }
  const trace = thumbTrace(surface, id, thumbUrl);
  return (
    <Image
      accessible={false}
      source={{ uri: thumbUrl }}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      transition={120}
      /**
       * зачем recyclingKey: FlatList переиспользует строки, и без ключа
       * при быстрой прокрутке в строке на кадр-другой висит ЧУЖОЕ превью.
       */
      recyclingKey={videoId}
      cachePolicy="memory-disk"
      onLoadStart={trace.onLoadStart}
      onLoad={trace.onLoad}
      onError={(event) => {
        trace.onError(event);
        setFailedUrl(thumbUrl);
      }}
    />
  );
});

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  // зачем (аудит типографики D145, координатор 15.10): подпись-заглушка превью — на шкале 13/17 (мелкий текст, межстрочный ≥ 1,25×), а не 14/18
  fallbackTitle: { fontSize: 13, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
});

export default VideoThumb;
