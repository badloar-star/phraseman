/**
 * Карточка «Продолжить» над лентой раздела «Видео»: обложка ролика, название, остаток и круглая кнопка запуска.
 *
 * зачем (владелец 11.11, макет docs/work/mockups/video-hub-2026-11-11, экран 1): с порога видно, что делать —
 * досмотреть начатое. Одно касание открывает ролик с той же секунды. Вся карточка — одна кнопка.
 * Рамок нет: обложка с тенью, текст на затемнении снизу, полоса прогресса по нижнему краю.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from '../SafeLinearGradient';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { V2_TYPE } from '../../constants/v2Style';
import { cleanYoutubeTitle } from '../../app/youtube_title_display';
import { videoContinueMinutesLeft, type VideoContinueRecord } from '../../app/video_continue';
import type { YoutubeVideoSnapshot } from '../../shared/youtube_catalog_contract';
import { plateBoxShadow } from '../v2/ShadowSurface';
import V2Pressable from '../v2/V2Pressable';
import { useV2Palette } from '../v2/useV2Palette';
import { useVideoMediaTones } from './video_media_tones';
import { feedThumbUrl } from '../youtube/YoutubeVideoCard';

type Props = {
  video: YoutubeVideoSnapshot;
  record: VideoContinueRecord;
  onPress: () => void;
};

export const VideoContinueCard = memo(function VideoContinueCard({ video, record, onPress }: Props) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const p = useV2Palette();
  // зачем (закон владельца 22.10): подписи поверх кадра и подложка под видео — роли темы (video_media_tones)
  const media = useVideoMediaTones();
  const minutes = videoContinueMinutesLeft(record);
  const resume = triLang(lang, { ru: 'Продолжить', uk: 'Продовжити', en: 'Continue', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Xem tiếp', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' });
  const left = minutes === null ? '' : triLang(lang, {
    ru: `осталось ${minutes} мин`, uk: `залишилось ${minutes} хв`, en: `${minutes} min left`, es: `quedan ${minutes} min`, 'pt-BR': `faltam ${minutes} min`,
    vi: `còn ${minutes} phút`, id: `sisa ${minutes} mnt`, tr: `${minutes} dk kaldı`, pl: `zostało ${minutes} min`,
  });
  const title = cleanYoutubeTitle(video.title);
  const ratio = typeof record.durationSec === 'number' && record.durationSec > 0 ? Math.max(0, Math.min(1, record.positionSec / record.durationSec)) : null;
  return (
    <V2Pressable
      testID="video-continue-card"
      accessibilityLabel={[resume, title, left].filter(Boolean).join('. ')}
      onPress={onPress}
      scaleTo={0.98}
      style={[styles.card, { backgroundColor: media.stage, boxShadow: plateBoxShadow(g) }]}
    >
      {/* Лента: только диск — декодированную обложку в памяти не держим. */}
      <Image accessible={false} source={{ uri: feedThumbUrl(video.thumbnailUrl, false) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} cachePolicy="disk" recyclingKey={video.id} />
      {/* theme-exempt: затемнение под подписями поверх кадра — чёрное в любой теме, иначе белый текст не читается на светлой обложке */}
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(6,7,10,0.82)']} locations={[0.36, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.text} pointerEvents="none">
        <Text numberOfLines={2} maxFontSizeMultiplier={1.2} style={[styles.title, { color: media.ink }]}>{title}</Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.sub, { color: media.ink }]}>{[resume, left].filter(Boolean).join(' · ')}</Text>
      </View>
      <View style={[styles.play, { backgroundColor: p.cta }]} pointerEvents="none">
        <Ionicons name="play" size={22} color={p.ctaText} style={styles.playIcon} />
      </View>
      {ratio === null ? null : (
        <View style={[styles.track, { backgroundColor: media.badge }]} pointerEvents="none">
          <View style={[styles.fill, { width: `${Math.round(ratio * 1000) / 10}%`, backgroundColor: media.ink }]} />
        </View>
      )}
    </V2Pressable>
  );
});

const styles = StyleSheet.create({
  // зачем: тот же кадр 16:9 и радиус 24, что у премьеры в шапке (heroPlayer) — карточка встаёт на её место без смены геометрии шапки.
  card: { width: '100%', aspectRatio: 16 / 9, borderRadius: 24, overflow: 'hidden', marginTop: 18, marginBottom: 14 },
  text: { position: 'absolute', left: 16, right: 84, bottom: 20 },
  title: { ...V2_TYPE.section },
  sub: { ...V2_TYPE.subtitle, marginTop: 2, opacity: 0.86 },
  play: { position: 'absolute', right: 16, bottom: 18, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  playIcon: { marginLeft: 3 },
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 },
  fill: { height: 4 },
});
