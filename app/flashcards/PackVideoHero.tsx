/**
 * Широкое превью ролика НАД карточками набора — экран открытого набора из видео.
 *
 * зачем (владелец 2026-09-23, макет принят): «в наборах из видео есть кнопка
 * видео сразу или превью, чтобы прям оттуда можно было и включить». Ролик
 * стоит сверху, но остаётся ОДНОЙ целью тапа: всё остальное на экране —
 * карточки и тренировка, набор главнее видео.
 *
 * Набор без `videoId` этот блок не рендерит (проверка у вызывающего), поэтому
 * обычные наборы не меняются.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../../constants/theme';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';
import { actionToastTri, emitAppEvent } from '../events';
import { DebugLogger } from '../debug-logger';
import { getLingmanYoutubeWatchUrl, getTrustedLingmanYoutubeUrl } from '../lingman_youtube';
import type { FlashcardMarketPack } from './marketplace';

type Props = {
  pack: FlashcardMarketPack;
  lang: Lang;
  t: Theme;
};

function formatDuration(totalSec?: number): string {
  if (!totalSec || !Number.isFinite(totalSec) || totalSec <= 0) return '';
  const sec = Math.floor(totalSec % 60);
  const min = Math.floor(totalSec / 60) % 60;
  const hour = Math.floor(totalSec / 3600);
  const mm = hour > 0 ? String(min).padStart(2, '0') : String(min);
  return hour > 0
    ? `${hour}:${mm}:${String(sec).padStart(2, '0')}`
    : `${mm}:${String(sec).padStart(2, '0')}`;
}

export default function PackVideoHero({ pack, lang, t: _legacyTheme }: Props) {
  // зачем (Liquid Glass, cards.html #43): подложка и плашки на токенах стекла активной темы.
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const videoId = String(pack.videoId ?? '').trim();
  const duration = formatDuration(pack.videoDurationSec);
  const thumbUrl = useMemo(
    () => (videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : null),
    [videoId],
  );

  const watchLabel = triLang(lang, {
    ru: 'Смотреть видео', uk: 'Дивитися відео', en: 'Watch the video', es: 'Ver el vídeo',
    'pt-BR': 'Assistir ao vídeo', vi: 'Xem video', id: 'Tonton video', tr: 'Videoyu izle', pl: 'Obejrzyj film',
  });

  const failToast = useMemo(() => actionToastTri('error', {
    ru: 'Видео сейчас не открывается. Карточки набора доступны как обычно.',
    uk: 'Відео зараз не відкривається. Картки набору доступні як завжди.',
    es: 'El vídeo no se abre ahora. Las tarjetas del pack siguen disponibles.',
  }), []);

  if (!videoId) return null;

  const onPress = async () => {
    // зачем: вибрация только на управляющих кнопках, не на строках/плитках (правило владельца, FINAL_PHASE п.7).
    /** Проверка домена — существующая; значение приходит из документа Firestore. */
    const trusted = getTrustedLingmanYoutubeUrl(getLingmanYoutubeWatchUrl(videoId), videoId);
    if (!trusted) {
      DebugLogger.warn('[VIDEO-PACK]', `герой: ссылка отклонена проверкой домена, videoId="${videoId}"`);
      emitAppEvent('action_toast', failToast);
      return;
    }
    try {
      await Linking.openURL(trusted);
    } catch (error) {
      // Немой catch запрещён: «нажал — ничего» без следа ищут кругами.
      DebugLogger.error(`[VIDEO-PACK]:hero:${videoId}`, error, 'warning');
      emitAppEvent('action_toast', failToast);
    }
  };

  return (
    <Pressable
      testID={`pack-video-hero-${pack.id}`}
      accessibilityRole="button"
      accessibilityLabel={pack.videoTitle ? `${watchLabel}. ${pack.videoTitle}` : watchLabel}
      onPress={() => { void onPress(); }}
      style={({ pressed }) => [styles.hero, { backgroundColor: g.opaqueCard, borderColor: g.glassEdge, opacity: pressed ? 0.85 : 1 }]}
    >
      {/* Подложка до загрузки кадра: тон темы, а не пустой серый прямоугольник. */}
      <LinearGradient pointerEvents="none" colors={[g.opaqueControl, g.opaqueCard]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      {thumbUrl ? (
        <Image
          accessible={false}
          source={{ uri: thumbUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={140}
          recyclingKey={videoId}
          cachePolicy="memory-disk"
        />
      ) : null}

      {/* Затемнение снизу — чтобы подпись читалась на любом кадре. */}
      <View style={styles.scrim} pointerEvents="none" />

      <View style={styles.playBadge}>
        <Ionicons name="play" size={24} color="#FFFFFF" />
      </View>

      {/* зачем: паритет с макетом video-packs-from-video-mockup.html кадр 2 — на кадре только круг «play», подписи нет. */}
      {duration ? (
        <View style={styles.duration} pointerEvents="none">
          <Text style={styles.durationText}>{duration}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,6,4,0.28)',
  },
  playBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    minHeight: 24,
    borderRadius: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  durationText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
