import React from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { useLang } from '../../LangContext';
import YoutubeInlinePlayer from '../../youtube/YoutubeInlinePlayer';
import { VideoRewardFlash } from '../../video/VideoRewardOverlay';
import { useVideoFullWatch } from '../../../hooks/use_video_full_watch';
import type { LingmanYoutubeVideo } from '../../../app/lingman_youtube';
import { triLang } from '../../../constants/i18n';
import { V2 } from '../../../constants/v2Style';

type Props = {
  /** Плееру нужны только id и заголовок — набор из видео (D131) передаёт их без полной карточки ролика. */
  video: Pick<LingmanYoutubeVideo, 'id' | 'title'>;
  onClose: () => void;
  /** D131: открыть ролик на секунде фразы; нет → с начала, как раньше. */
  startSec?: number;
  /** Длительность и признак эфира — для награды +500 за просмотр (нет длительности — награды нет). Передаёт карточка ленты. */
  durationSec?: number | null;
  live?: boolean;
  testID?: string;
};

/** Keep the autoplaying player visible and inside both device safe areas. */
export default function HomeV2VideoPlayerModal({ video, onClose, startSec, durationSec, live = false, testID = 'home-v2-video-player' }: Props) {
  // зачем (владелец 05.11: «+500 монет за полный просмотр видео — 70 %»): детектор следит за роликом в окне Главной; иконка «+500» — поверх плеера в момент награды
  const { flashKey } = useVideoFullWatch({ videoId: video.id, durationSec, live });
  const insets = useStableSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { lang } = useLang();
  const closeLabel = triLang(lang, { ru: 'Закрыть видео', uk: 'Закрити відео', en: 'Close video', es: 'Cerrar vídeo', 'pt-BR': 'Fechar vídeo', vi: 'Đóng video', id: 'Tutup video', tr: 'Videoyu kapat', pl: 'Zamknij film' });
  const playerWidth = Math.max(0, Math.min(540, width - V2.screenPad * 2, (height - insets.top - insets.bottom - 24) * 16 / 9));

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View
        testID={testID}
        accessibilityViewIsModal
        style={[s.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}
      >
        <Pressable testID="home-v2-video-backdrop" accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={[s.player, { width: playerWidth, height: playerWidth * 9 / 16 }]}>
          <YoutubeInlinePlayer
            videoId={video.id}
            title={video.title}
            active
            onClose={onClose}
            presentation="preview"
            startSec={startSec}
          />
          <VideoRewardFlash flashKey={flashKey} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', paddingHorizontal: V2.screenPad, backgroundColor: 'rgba(3, 4, 8, 0.91)' }, // theme-exempt: тёмное «кино»-окно видео, по замыслу не следует светлой теме
  player: { alignSelf: 'center', borderRadius: 18, overflow: 'hidden', backgroundColor: '#000000' }, // theme-exempt: чёрная подложка плеера под видео
});
