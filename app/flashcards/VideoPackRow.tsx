/**
 * Строка списка «Из видео»: кадр ролика слева, набор справа.
 *
 * Геометрия — из макета, одобренного владельцем 2026-09-23:
 *   • превью 112×63 (16:9) — «ПРЕВЬЮ НЕ КВАДРАТНОЕ»;
 *   • строка 87 (63 + 12·2) — «СПИСКИ НЕ ТАКИЕ ВЫСОКИЕ» (было 120);
 *   • имени канала НЕТ — «ЛИНГМАН ПИСАТЬ НЕ НАДО», вместо него число карточек;
 *   • кнопка со словом «Добавить» — «КНОПКА ДОБАВИТЬ» (а не круглый «+»).
 *
 * Три разные цели тапа: кадр → ролик, строка → набор, кнопка → добавить себе.
 * Поэтому кадр и кнопка — отдельные Pressable поверх строки, а не её части.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { FlowText } from '../../components/text-integrity/FlowText';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import type { Theme } from '../../constants/theme';
import { triLang, type Lang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { actionToastTri, emitAppEvent } from '../events';
import CommunityPackSocialBar from '../community_packs/CommunityPackSocialBar';
import { packTitleForInterface, type FlashcardMarketPack } from './marketplace';
import { getLingmanYoutubeWatchUrl, getTrustedLingmanYoutubeUrl } from '../lingman_youtube';
import { DebugLogger } from '../debug-logger';

/** Превью 16:9 — те же числа, что в макете. */
const THUMB_W = 112;
const THUMB_H = 63;

type Props = {
  pack: FlashcardMarketPack;
  lang: Lang;
  t: Theme;
  /** Набор уже открывается — крутилка поверх кадра. */
  opening?: boolean;
  /** Открывается другой набор — этот не должен перехватывать тап. */
  disabled?: boolean;
  onOpen: (pack: FlashcardMarketPack) => void;
};

/**
 * Превью кадра ролика. Тот же адрес, что уже использует экран видео.
 *
 * зачем через хелпер, а не строкой в разметке: `videoId` приходит из документа
 * Firestore, и подставлять его в URL без единой точки нормализации — способ
 * однажды получить битую картинку у каждой строки списка.
 */
function youtubeThumbnailUrl(videoId?: string): string | null {
  const id = String(videoId ?? '').trim();
  return id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : null;
}

/**
 * Открыть ролик во внешнем приложении/браузере.
 *
 * зачем ЧЕРЕЗ getTrustedLingmanYoutubeUrl: это существующая проверка домена.
 * Без неё значение из документа Firestore могло бы увести человека на
 * посторонний адрес — тот же класс риска, что и битое превью, только опаснее.
 */
async function openVideo(videoId: string | undefined, onFail: () => void): Promise<void> {
  const id = String(videoId ?? '').trim();
  if (!id) {
    DebugLogger.warn('[VIDEO-PACK]', 'тап по кадру без videoId — ролик не открыт');
    onFail();
    return;
  }
  const trusted = getTrustedLingmanYoutubeUrl(getLingmanYoutubeWatchUrl(id), id);
  if (!trusted) {
    DebugLogger.warn('[VIDEO-PACK]', `ссылка отклонена проверкой домена, videoId="${id}"`);
    onFail();
    return;
  }
  try {
    await Linking.openURL(trusted);
  } catch (error) {
    // зачем не немой catch: «нажал — ничего не произошло» без следа в логах
    // уже стоило кругов работы (правило владельца «сперва логи»).
    DebugLogger.error(`[VIDEO-PACK]:openVideo:${id}`, error, 'warning');
    onFail();
  }
}

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

function VideoPackRowBase({ pack, lang, t, opening = false, disabled = false, onOpen }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const title = packTitleForInterface(pack, lang) || pack.codeName || pack.id;
  const duration = formatDuration(pack.videoDurationSec);
  const thumbUrl = useMemo(() => youtubeThumbnailUrl(pack.videoId), [pack.videoId]);

  const playLabel = triLang(lang, {
    ru: 'Смотреть видео', uk: 'Дивитися відео', en: 'Watch the video', es: 'Ver el vídeo',
    'pt-BR': 'Assistir ao vídeo', vi: 'Xem video', id: 'Tonton video', tr: 'Videoyu izle', pl: 'Obejrzyj film',
  });
  const cardsLabel = triLang(lang, {
    ru: 'карточек', uk: 'карток', en: 'cards', es: 'tarjetas', 'pt-BR': 'cartões',
    vi: 'thẻ', id: 'kartu', tr: 'kart', pl: 'kart',
  });
  /** Ролик не открылся — говорим об этом, а не молчим: набор при этом жив. */
  const videoFailed = useMemo(() => actionToastTri('error', {
    ru: 'Видео сейчас не открывается. Карточки набора доступны как обычно.',
    uk: 'Відео зараз не відкривається. Картки набору доступні як завжди.',
    es: 'El vídeo no se abre ahora. Las tarjetas del pack siguen disponibles.',
  }), []);

  return (
    <View
      testID={`video-pack-row-${pack.id}`}
      style={[styles.row, { backgroundColor: g.card, borderColor: g.glassEdge, opacity: disabled ? 0.55 : 1 }]}
    >
      <BlurView pointerEvents="none" intensity={Platform.OS === 'android' ? 12 : 16} blurReductionFactor={3} experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={[g.selected, 'transparent']} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: g.glassEdge }} />
      {/* Кадр ролика — СВОЯ цель тапа: открывает видео, а не набор. */}
      <Pressable
        testID={`video-pack-play-${pack.id}`}
        accessibilityRole="button"
        accessibilityLabel={playLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          void hapticTap();
          void openVideo(pack.videoId, () => emitAppEvent('action_toast', videoFailed));
        }}
        style={({ pressed }) => [styles.thumb, { backgroundColor: g.opaqueControl, opacity: pressed ? 0.8 : 1 }]}
      >
        {thumbUrl ? (
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
            recyclingKey={pack.videoId}
            cachePolicy="memory-disk"
          />
        ) : null}

        <View style={[styles.playBadge, { backgroundColor: g.opaqueControl }]}>
          <Ionicons name="play" size={11} color={g.text} />
        </View>

        {duration ? (
          <View style={[styles.duration, { backgroundColor: g.sheet }]} pointerEvents="none">
            <Text style={[styles.durationText, { color: g.text }]}>{duration}</Text>
          </View>
        ) : null}

        {opening ? (
          <View style={[StyleSheet.absoluteFillObject, styles.openingVeil, { backgroundColor: g.opaqueCard }]} pointerEvents="none">
            <ActivityIndicator color={g.cta} />
          </View>
        ) : null}
      </Pressable>

      <View style={styles.main}>
        <Pressable
          testID={`video-pack-open-${pack.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${pack.cardCount} ${cardsLabel}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => { void hapticTap(); onOpen(pack); }}
          style={StyleSheet.absoluteFill}
        />
        <FlowText testID={`video-pack-title-${pack.id}`} provenance="user" pointerEvents="none" style={[styles.title, { color: g.text }]}>
          {title}
        </FlowText>

        {/* Лайк и «Добавить себе» — общий компонент каталога: его оптимистичность
            и защита от гонок уже написаны, второй копии быть не должно. */}
        <View style={styles.social}>
          <CommunityPackSocialBar
            pack={pack}
            lang={lang}
            t={t}
            owned={false}
            variant="row"
          />
        </View>
      </View>
    </View>
  );
}

/**
 * зачем memo по существу: список перерисовывается на каждый ввод буквы в поиск
 * и на каждое изменение счётчиков. Поверхностное сравнение не спасло бы —
 * `onOpen` приходит стрелкой родителя.
 */
export default React.memo(VideoPackRowBase, (prev, next) => (
  prev.pack === next.pack
  && prev.lang === next.lang
  && prev.t === next.t
  && prev.opening === next.opening
  && prev.disabled === next.disabled
));

const styles = StyleSheet.create({
  row: {
    minHeight: 87,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  durationText: { fontSize: 10, fontWeight: '800' },
  openingVeil: { alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, minWidth: 0, justifyContent: 'center' },
  title: { fontSize: 15, lineHeight: 19, fontWeight: '800' },
  social: { marginTop: 7 },
});
