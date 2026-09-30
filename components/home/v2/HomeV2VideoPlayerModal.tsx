import React from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { useLang } from '../../LangContext';
import YoutubeInlinePlayer from '../../youtube/YoutubeInlinePlayer';
import type { LingmanYoutubeVideo } from '../../../app/lingman_youtube';
import { triLang } from '../../../constants/i18n';
import { V2 } from '../../../constants/v2Style';

type Props = {
  /** Плееру нужны только id и заголовок — набор из видео (D131) передаёт их без полной карточки ролика. */
  video: Pick<LingmanYoutubeVideo, 'id' | 'title'>;
  onClose: () => void;
  /** D131: открыть ролик на секунде фразы; нет → с начала, как раньше. */
  startSec?: number;
  testID?: string;
};

/** Keep the autoplaying player visible and inside both device safe areas. */
export default function HomeV2VideoPlayerModal({ video, onClose, startSec, testID = 'home-v2-video-player' }: Props) {
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
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', paddingHorizontal: V2.screenPad, backgroundColor: 'rgba(3, 4, 8, 0.91)' },
  player: { alignSelf: 'center', borderRadius: 18, overflow: 'hidden', backgroundColor: '#000000' },
});
