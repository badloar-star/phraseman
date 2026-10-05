/**
 * Экран ролика: плеер во всю ширину, название, «канал · дата · просмотры», «Набор к ролику», «Фразы из видео».
 *
 * зачем (Сверка video-011 🔴, макет docs/design/v2-app/video.html — watch, телефон 11; координатор 05.10): ролик из
 * плейлиста и из раздела «Из видео» открывается отдельным экраном, а не встроенным плеером внутри списка.
 * Экран открывается мгновенно из того, что уже есть: ролик — из снимка каталога (или параметров маршрута), фразы —
 * из кэша (память → диск → сеть, только если кэш старше TTL), набор — из кэша каталога видео-наборов; сеть — фоном.
 * Вкладка «Видео» пока остаётся со встроенным плеером: «Тренировать» живёт только там, решение у владельца.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import YoutubeInlinePlayer from '../components/youtube/YoutubeInlinePlayer';
import YoutubeVideoPhrases from '../components/youtube/YoutubeVideoPhrases';
import { formatViewCount } from '../components/video/formatViewCount';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { pluralWord } from '../constants/plural';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { captureAccountGeneration } from './account_generation';
import CommunityPackSocialBar from './community_packs/CommunityPackSocialBar';
import { loadVideoMarketPacks, peekVideoMarketPacks } from './community_packs/communityFirestore';
import { normalizePackLanguage } from './flashcards/pack_languages';
import { packTitleForInterface, type FlashcardMarketPack } from './flashcards/marketplace';
import { formatRelativeVideoDate } from '../components/video/formatRelativeVideoDate';
import { safeRouterBack } from './navigation_back';
import { peekYoutubeCatalogScreenSnapshot } from './youtube_catalog_client';
import type { VideoPhrasesSource } from './video_phrases_client';

const LOG = '[VIDEO-SCREEN]';

type Params = { videoId?: string; channelId?: string; title?: string; source?: string; startSec?: string };

function findPackForVideo(packs: readonly FlashcardMarketPack[] | null, videoId: string): FlashcardMarketPack | null {
  return packs?.find((pack) => pack.videoId === videoId) ?? null;
}

export default function LingmanVideoWatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const videoId = typeof params.videoId === 'string' ? params.videoId : '';
  const source = typeof params.source === 'string' ? params.source : 'unknown';
  const { lang } = useLang();
  const { theme: t, liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const { studyTarget } = useStudyTarget();
  const runtimeActive = useRuntimeActive(true);
  const token = useMemo(() => captureAccountGeneration(), []);

  // Первый кадр: ролик и канал из снимка каталога, иначе — из параметров маршрута.
  const catalog = useMemo(() => peekYoutubeCatalogScreenSnapshot(token), [token]);
  const video = useMemo(() => catalog?.videos.find((item) => item.id === videoId) ?? null, [catalog, videoId]);
  const channelName = catalog && (!video || catalog.channel.id === video.channelId) ? catalog.channel.displayName : '';
  const packLanguage = normalizePackLanguage(catalog?.channel.languageTags?.[0]?.split('-')[0] ?? studyTarget);
  const title = video?.title || (typeof params.title === 'string' ? params.title : '');
  const startSec = typeof params.startSec === 'string' && Number.isFinite(Number(params.startSec)) ? Number(params.startSec) : undefined;

  const [pack, setPack] = useState<FlashcardMarketPack | null>(() => findPackForVideo(peekVideoMarketPacks(studyTarget), videoId));
  const packFromRef = useRef<string>(peekVideoMarketPacks(studyTarget) ? 'memory' : 'pending');
  const [playerOpen, setPlayerOpen] = useState(true);
  const openLoggedRef = useRef(false);

  const logOpen = useCallback((phrasesFrom: VideoPhrasesSource | 'none', phrases: number) => {
    if (openLoggedRef.current) return;
    openLoggedRef.current = true;
    console.warn(LOG, 'open', JSON.stringify({
      source, videoId, videoFrom: video ? 'catalog_snapshot' : title ? 'route_params' : 'none',
      phrasesFrom, phrases, packFrom: packFromRef.current, hasPack: !!pack,
    })); // guard-ok: лог экрана ролика (координатор 05.10), одна строка на вход
  }, [pack, source, title, video, videoId]);

  // Набор к ролику: кэш каталога видео-наборов (тот же TTL, что у раздела «Из видео»), сеть — только если кэша нет.
  useEffect(() => {
    if (!videoId) return undefined;
    if (peekVideoMarketPacks(studyTarget)) return undefined;
    let alive = true;
    const startedAt = Date.now();
    loadVideoMarketPacks(studyTarget)
      .then((packs) => {
        packFromRef.current = 'loader';
        const found = findPackForVideo(packs, videoId);
        console.warn(LOG, 'pack', JSON.stringify({ videoId, found: !!found, packs: packs.length, ms: Date.now() - startedAt, alive })); // guard-ok: ветка логируется
        if (alive) setPack(found);
      })
      .catch((error: unknown) => {
        packFromRef.current = 'error';
        console.warn(LOG, 'pack:catch → без блока', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
      });
    return () => { alive = false; };
  }, [studyTarget, videoId]);

  useEffect(() => {
    if (videoId) return;
    console.warn(LOG, 'open:no_video_id → назад', JSON.stringify({ source })); // guard-ok: ранний выход логируется
    safeRouterBack(router, '/lingman_videos' as never);
  }, [router, source, videoId]);

  const close = useCallback(() => {
    setPlayerOpen(false);
    safeRouterBack(router, '/lingman_videos' as never);
  }, [router]);

  const copy = {
    close: triLang(lang, { ru: 'Закрыть видео', uk: 'Закрити відео', en: 'Close video', es: 'Cerrar vídeo', 'pt-BR': 'Fechar vídeo', vi: 'Đóng video', id: 'Tutup video', tr: 'Videoyu kapat', pl: 'Zamknij film' }),
    packOverline: triLang(lang, { ru: 'Набор к ролику', uk: 'Набір до ролика', en: 'Video pack', es: 'Pack del vídeo', 'pt-BR': 'Pacote do vídeo', vi: 'Bộ thẻ của video', id: 'Paket video', tr: 'Video paketi', pl: 'Zestaw do filmu' }),
  };
  const meta = [channelName, formatRelativeVideoDate(video?.publishedAt, lang), formatViewCount(video?.viewCount, lang)].filter(Boolean).join(' · ');
  const packMeta = pack ? [
    triLang(lang, {
      ru: `${pack.cardCount} ${pluralWord(lang, pack.cardCount, { one: 'карточка', few: 'карточки', many: 'карточек' })}`,
      uk: `${pack.cardCount} ${pluralWord(lang, pack.cardCount, { one: 'картка', few: 'картки', many: 'карток' })}`,
      en: `${pack.cardCount} cards`, es: `${pack.cardCount} tarjetas`, 'pt-BR': `${pack.cardCount} cartões`, vi: `${pack.cardCount} thẻ`,
      id: `${pack.cardCount} kartu`, tr: `${pack.cardCount} kart`, pl: `${pack.cardCount} fiszek`,
    }),
    (pack.addedCount ?? 0) > 0 ? triLang(lang, { ru: `${pack.addedCount} добавили`, uk: `${pack.addedCount} додали`, en: `${pack.addedCount} added`, es: `${pack.addedCount} añadieron`, 'pt-BR': `${pack.addedCount} adicionaram`, vi: `${pack.addedCount} đã thêm`, id: `${pack.addedCount} menambahkan`, tr: `${pack.addedCount} ekledi`, pl: `${pack.addedCount} dodało` }) : '',
  ].filter(Boolean).join(' · ') : '';

  return (
    <ScreenGradient artBackdrop="home">
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
      <SafeAreaView testID="lingman-video-watch" style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.player}>
          {videoId && playerOpen ? (
            <YoutubeInlinePlayer videoId={videoId} title={title} active={runtimeActive} presentation="preview" autoPlay startSec={startSec} />
          ) : null}
          {/* зачем: ✕ макета — круг 34 на тёмной подложке в 12 от края; плеер свою кнопку не рисует (onClose не передан). */}
          <Pressable testID="lingman-video-watch-close" accessibilityRole="button" accessibilityLabel={copy.close} onPress={close} hitSlop={8} style={styles.close}>
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {title ? <Text accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text> : null}
          {meta ? <Text style={[styles.meta, { color: g.secondary }]}>{meta}</Text> : null}
          {pack ? (
            <View testID="lingman-video-watch-pack" style={[styles.pack, { backgroundColor: g.card, borderColor: g.glassEdge }]}>{/* guard-ok: 1px полупрозрачная кромка `.pack` макета (2.0) */}
              <View style={styles.packRow}>
                {video?.thumbnailUrl ? <Image accessible={false} source={{ uri: video.thumbnailUrl }} style={styles.packArt} contentFit="cover" cachePolicy="disk" /> : null}
                <View style={styles.packCopy}>
                  <Text style={[styles.packOverline, { color: g.secondary }]}>{copy.packOverline}</Text>
                  <Text style={[styles.packTitle, { color: g.text }]} numberOfLines={2}>{packTitleForInterface(pack, lang)}</Text>
                  {packMeta ? <Text style={[styles.meta, { color: g.secondary }]}>{packMeta}</Text> : null}
                </View>
              </View>
              <View style={styles.packCta}>
                <CommunityPackSocialBar pack={pack} lang={lang} t={t} owned={false} variant="previewCta" />
              </View>
            </View>
          ) : null}
          {videoId ? (
            <View style={styles.phrases}>
              <YoutubeVideoPhrases
                videoId={videoId}
                packLanguage={packLanguage}
                sourceTitle={channelName || undefined}
                testID={`video-phrases-${videoId}`}
                onSourceResolved={(from, count) => logOpen(from, count)}
              />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  // зачем: поля экрана 20 (`--pad` макета); плеер выходит за них на всю ширину (`.player { margin: 0 -20px }`).
  container: { flex: 1 },
  player: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000000' },
  close: { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  title: { marginTop: 16, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  // зачем: `.vm` макета 14 (решение (Б) 05.10 — макет главнее D145).
  meta: { marginTop: 4, fontSize: 14, // d145-mockup: video.html .vm 14
    lineHeight: 18, fontWeight: '400' },
  pack: { marginTop: 16, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16 }, // guard-ok: `.pack` макета — 1px полупрозрачная кромка 2.0
  packRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  packArt: { width: 58, height: 58, borderRadius: 12 },
  packCopy: { flex: 1, minWidth: 0 },
  packOverline: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  // зачем: макет 17/700 (решение (Б) 05.10 — макет главнее D145).
  packTitle: { marginTop: 4, fontSize: 17, // d145-mockup: video.html набор 17/700
    lineHeight: 21, fontWeight: '700' },
  packCta: { marginTop: 14 },
  phrases: { marginTop: 24 },
});
