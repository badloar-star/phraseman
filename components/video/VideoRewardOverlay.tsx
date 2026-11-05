// VideoRewardOverlay.tsx — иконка «+500» в плеере (сразу в момент награды) и окно-история «Видео просмотрено: +500» (после завершения).
// зачем (владелец 05.11: «при завершении видео иконка и начисление +500 сразу»; макет video_reward одобрен: «+500» с монетой ранга, галочка, заголовок истории; координатор: пока владелец
// не назвал, какой текст убрать, — НИКАКИХ пояснительных подписей мелким шрифтом: только «+500», монета ранга, галочка и заголовок). Без обводок, Reduce Motion уважается.
import React, { memo, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion, ZoomIn } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import SpireRankCoin from '../spire/SpireRankCoin';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { isVideoFullRewardEnabled } from '../../hooks/use_video_full_rewarded';
import { VIDEO_FULL_REWARD_COINS } from '../../app/video_full_reward';
import { dismissVideoFullStory, peekVideoFullStory, subscribeVideoFullStory } from '../../app/video_full_story_state';
import { useVideoMediaTones } from './video_media_tones';

const FLASH_MS = 2400;

/** Иконка «+500» поверх плеера: появляется в момент награды (flashKey растёт), сама уходит через ~2,4 с. */
function VideoRewardFlashBase({ flashKey }: Readonly<{ flashKey: number }>) {
  const rank = useMyCoinRank();
  const media = useVideoMediaTones();
  const [shownKey, setShownKey] = useState(0);
  useEffect(() => {
    if (flashKey <= 0) return undefined;
    setShownKey(flashKey);
    const timer = setTimeout(() => setShownKey(0), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flashKey]);
  if (shownKey === 0) return null;
  return (
    <View pointerEvents="none" style={s.flashWrap} testID="video-reward-flash">
      <Animated.View
        key={shownKey}
        entering={ZoomIn.duration(220).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(180).reduceMotion(ReduceMotion.System)}
        style={[s.flash, { backgroundColor: media.badge }]}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={`+${VIDEO_FULL_REWARD_COINS}`}
      >
        <SpireRankCoin rank={rank} size={32} plus={false} />
        <Text allowFontScaling={false} style={[s.flashText, { color: media.ink }]}>{`+${VIDEO_FULL_REWARD_COINS}`}</Text>
      </Animated.View>
    </View>
  );
}
export const VideoRewardFlash = memo(VideoRewardFlashBase);

/** Окно-история после завершения: монета ранга, «+500», галочка, заголовок. Закрывается крестиком или тапом по затемнению. */
function VideoRewardStoryHostBase() {
  const story = useSyncExternalStore(subscribeVideoFullStory, peekVideoFullStory, () => null);
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const rank = useMyCoinRank();
  const close = useCallback(() => dismissVideoFullStory(), []);
  // зачем (макет video_reward v3: главная кнопка «Следующее видео» ведёт в раздел «Видео»; пропустить можно в любой момент — крестик/затемнение)
  const next = useCallback(() => { dismissVideoFullStory(); router.push('/(tabs)/video' as never); }, []);
  if (!story || !isVideoFullRewardEnabled()) return null;
  const nextLabel = triLang(lang, { ru: 'Следующее видео', uk: 'Наступне відео', en: 'Next video', es: 'Siguiente vídeo', 'pt-BR': 'Próximo vídeo', vi: 'Video tiếp theo', id: 'Video berikutnya', tr: 'Sonraki video', pl: 'Następne wideo' });
  const title = triLang(lang, { ru: 'Видео просмотрено', uk: 'Відео переглянуто', en: 'Video watched', es: 'Vídeo visto', 'pt-BR': 'Vídeo assistido', vi: 'Đã xem video', id: 'Video ditonton', tr: 'Video izlendi', pl: 'Wideo obejrzane' });
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)} style={s.scrim} testID="video-reward-story">
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel={title} />
        <Animated.View entering={ZoomIn.duration(240).reduceMotion(ReduceMotion.System)} style={[s.card, { backgroundColor: g.opaqueCard }]}>
          <View style={s.coinWrap}>
            <SpireRankCoin rank={rank} size={96} plus={false} />
            <View style={[s.check, { backgroundColor: g.accentGraphic }]}><Ionicons name="checkmark" size={22} color={g.bg} /></View>
          </View>
          <Text maxFontSizeMultiplier={1.2} style={[s.title, { color: g.text }]}>{title}</Text>
          <Text allowFontScaling={false} style={[s.amount, { color: g.accentTextSafe }]}>{`+${story.amount}`}</Text>
          <Pressable accessibilityRole="button" onPress={next} style={[s.cta, { backgroundColor: g.accent }]} testID="video-reward-story-next">
            <Text maxFontSizeMultiplier={1.2} style={[s.ctaText, { color: g.accentInk }]}>{nextLabel}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="✕" hitSlop={12} onPress={close} style={[s.close, { backgroundColor: g.opaqueControl }]} testID="video-reward-story-close">
            <Ionicons name="close" size={22} color={g.text} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
export const VideoRewardStoryHost = memo(VideoRewardStoryHostBase);

const s = StyleSheet.create({
  flashWrap: { position: 'absolute', left: 0, right: 0, top: 14, alignItems: 'center', zIndex: 20 },
  flash: { minHeight: 48, paddingLeft: 8, paddingRight: 18, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8 },
  flashText: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }, // theme-exempt: затемнение под окном
  card: { width: '100%', maxWidth: 340, borderRadius: 28, paddingTop: 36, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center', gap: 14 },
  coinWrap: { width: 96, height: 96 },
  check: { position: 'absolute', right: -6, bottom: -6, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  amount: { fontSize: 56, lineHeight: 64, fontWeight: '800', letterSpacing: -1 },
  cta: { alignSelf: 'stretch', minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 6, paddingHorizontal: 20 },
  ctaText: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
  close: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
