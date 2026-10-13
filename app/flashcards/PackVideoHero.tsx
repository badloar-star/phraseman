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
import { nestedBoxShadow, plateBoxShadow } from '../../components/v2/ShadowSurface';
import { triLang, type Lang } from '../../constants/i18n';
import { actionToastTri, emitAppEvent } from '../events';
import { DebugLogger } from '../debug-logger';
import { isDevCardsFail } from '../dev_cards_state';
import { getLingmanYoutubeWatchUrl, getTrustedLingmanYoutubeUrl } from '../lingman_youtube';
import type { FlashcardMarketPack } from './marketplace';

const MEDIA_INK = '#FFFFFF'; // theme-exempt: белый значок/текст поверх видео — в любой теме

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
    es: 'El vídeo no se abre ahora. Las tarjetas del pack siguen disponibles.', en: 'This video isn\'t opening right now. The pack\'s cards are available as usual.',
    'pt-BR': 'O vídeo não abre agora. Os cartões do pacote continuam disponíveis.', vi: 'Video hiện không mở được. Các thẻ trong bộ thẻ vẫn dùng bình thường.', id: 'Video tidak bisa dibuka sekarang. Kartu dalam paket tetap tersedia seperti biasa.', tr: 'Video şu anda açılmıyor. Paketteki kartlar her zamanki gibi kullanılabilir.', pl: 'Film nie otwiera się teraz. Fiszki z zestawu są dostępne jak zwykle.',
  }), []);

  if (!videoId) return null;

  const onPress = async () => {
    // зачем: вибрация только на управляющих кнопках, не на строках/плитках (правило владельца, FINAL_PHASE п.7).
    /** Проверка домена — существующая; значение приходит из документа Firestore. */
    if (isDevCardsFail('video_open')) {
      console.warn(`[DEV-STATE] video: открытие ролика (герой) подменено отказом videoId=${videoId}`); // guard-ok: dev-ветка
      emitAppEvent('action_toast', failToast);
      return;
    }
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
      style={({ pressed }) => [styles.hero, { backgroundColor: g.opaqueCard, boxShadow: plateBoxShadow(g), opacity: pressed ? 0.85 : 1 }]}
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

      <View style={[styles.playBadge, { boxShadow: nestedBoxShadow(g) }]}>
        <Ionicons name="play" size={24} color={MEDIA_INK} />
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
    overflow: 'hidden', // зачем: клип кадра по скруглению; boxShadow (Тень 12.10) рисуется вне контейнера клипа
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,6,4,0.28)', // theme-exempt: скрим/плашка поверх видео — тёмная в любой теме
  },
  playBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)', // theme-exempt: скрим/плашка поверх видео — тёмная в любой теме
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
    backgroundColor: 'rgba(0,0,0,0.7)', // theme-exempt: скрим/плашка поверх видео — тёмная в любой теме
  },
  durationText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' }, // theme-exempt: белый значок/текст поверх видео — в любой теме
});
