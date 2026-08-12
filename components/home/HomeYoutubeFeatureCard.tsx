import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { captureAccountGeneration } from '../../app/account_generation';
import { accountScopeKey } from '../../app/account_scope_key';
import {
  isHomeYoutubeCatalogFresh,
  selectHomeYoutubeFeaturedVideo,
} from '../../app/home_youtube_feature';
import { isVideoButtonEnabled } from '../../app/remote_flags';
import {
  fetchYoutubeCatalogManifest,
  fetchYoutubeHomeFeatureCatalog,
  peekYoutubeCatalogScreenSnapshot,
  type YoutubeCatalogScreenSnapshot,
} from '../../app/youtube_catalog_client';
import {
  getYoutubeChannelPreference,
  resolvePreferredYoutubeChannel,
} from '../../app/youtube_channel_preference';
import { onAppEvent } from '../../app/events';
import { triLang, type Lang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { FlowText } from '../text-integrity';

type HomeYoutubeFeatureCardProps = {
  ownerActive: boolean;
  studyTarget: string;
};

const memorySnapshotByScope = new Map<string, YoutubeCatalogScreenSnapshot>();

function newerSnapshot(
  left: YoutubeCatalogScreenSnapshot | null,
  right: YoutubeCatalogScreenSnapshot | null,
): YoutubeCatalogScreenSnapshot | null {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(right.fetchedAt) > Date.parse(left.fetchedAt) ? right : left;
}

const localeByLang: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  vi: 'vi-VN',
  id: 'id-ID',
  tr: 'tr-TR',
  pl: 'pl-PL',
};

function formatPremiereTime(value: string | undefined, lang: Lang): string {
  const timestamp = Date.parse(String(value ?? ''));
  if (!Number.isFinite(timestamp)) return '';
  try {
    return new Intl.DateTimeFormat(localeByLang[lang], {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

function HomeYoutubeFeatureCard({ ownerActive, studyTarget }: HomeYoutubeFeatureCardProps) {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t } = useTheme();
  const renderToken = captureAccountGeneration();
  const renderScope = accountScopeKey(renderToken);
  const initialSnapshot = newerSnapshot(
    peekYoutubeCatalogScreenSnapshot(renderToken),
    renderScope ? memorySnapshotByScope.get(renderScope) ?? null : null,
  );
  const [snapshotState, setSnapshotState] = useState<{
    scope: string | null;
    value: YoutubeCatalogScreenSnapshot | null;
  }>(() => ({ scope: renderScope, value: initialSnapshot }));
  const snapshot = snapshotState.scope === renderScope ? snapshotState.value : null;
  const [enabled, setEnabled] = useState(() => isVideoButtonEnabled());

  useEffect(() => {
    if (!ownerActive) return;
    const sync = () => setEnabled(isVideoButtonEnabled());
    sync();
    const subscription = onAppEvent('remote_config_changed', sync);
    return () => subscription.remove();
  }, [ownerActive]);

  useEffect(() => {
    if (!ownerActive || !enabled || !renderScope) return;
    let cancelled = false;
    const token = captureAccountGeneration();
    if (accountScopeKey(token) !== renderScope) return;

    const warm = newerSnapshot(
      peekYoutubeCatalogScreenSnapshot(token),
      memorySnapshotByScope.get(renderScope) ?? null,
    );
    setSnapshotState({ scope: renderScope, value: warm });

    const refresh = async () => {
      try {
        const preference = getYoutubeChannelPreference(token);
        if (warm) {
          const warmResolution = resolvePreferredYoutubeChannel(
            warm.manifest,
            studyTarget,
            preference,
          );
          const freshWarm = warm.channel.id === warmResolution.channelId ? warm : null;
          if (freshWarm && isHomeYoutubeCatalogFresh(freshWarm)) return;
        }

        // A stale snapshot must not pin Home to its old activeVersion. Read the
        // public manifest first so a newly published premiere becomes visible.
        const manifest = await fetchYoutubeCatalogManifest();
        const resolution = resolvePreferredYoutubeChannel(manifest, studyTarget, preference);
        const feature = await fetchYoutubeHomeFeatureCatalog(resolution.channelId, manifest);
        if (!cancelled && accountScopeKey(captureAccountGeneration()) === renderScope) {
          const next: YoutubeCatalogScreenSnapshot = {
            version: feature.version,
            manifest: feature.manifest,
            channel: feature.channel,
            videos: feature.video ? [feature.video] : [],
            playlists: [],
            ...(feature.video?.state === 'live' || feature.video?.state === 'upcoming'
              ? { activeEvent: feature.video }
              : {}),
            fetchedAt: feature.fetchedAt,
          };
          memorySnapshotByScope.set(renderScope, next);
          setSnapshotState({ scope: renderScope, value: next });
        }
      } catch {
        // The home card is optional chrome: keep a warm snapshot or stay absent.
        // Network errors belong on the full Video screen, not as a Home warning.
      }
    };

    void refresh();
    return () => { cancelled = true; };
  }, [enabled, ownerActive, renderScope, studyTarget]);

  const video = useMemo(() => selectHomeYoutubeFeaturedVideo(snapshot), [snapshot]);
  if (!enabled || !video) return null;

  const isLive = video.state === 'live';
  const isUpcoming = video.state === 'upcoming';
  const premiereTime = isUpcoming ? formatPremiereTime(video.scheduledStartTime, lang) : '';
  const status = isLive
    ? triLang(lang, { ru: 'В эфире', uk: 'У прямому ефірі', es: 'En directo', 'pt-BR': 'Ao vivo', vi: 'Đang phát trực tiếp', id: 'Sedang live', tr: 'Canlı', pl: 'Na żywo' })
    : isUpcoming
      ? triLang(lang, { ru: 'Премьера', uk: 'Прем’єра', es: 'Estreno', 'pt-BR': 'Estreia', vi: 'Công chiếu', id: 'Premiere', tr: 'Prömiyer', pl: 'Premiera' })
      : triLang(lang, { ru: 'Новое видео', uk: 'Нове відео', es: 'Nuevo vídeo', 'pt-BR': 'Vídeo novo', vi: 'Video mới', id: 'Video baru', tr: 'Yeni video', pl: 'Nowy film' });
  const action = isLive
    ? triLang(lang, { ru: 'Смотреть сейчас', uk: 'Дивитися зараз', es: 'Ver ahora', 'pt-BR': 'Assistir agora', vi: 'Xem ngay', id: 'Tonton sekarang', tr: 'Şimdi izle', pl: 'Oglądaj teraz' })
    : isUpcoming
      ? triLang(lang, { ru: 'Открыть премьеру', uk: 'Відкрити прем’єру', es: 'Abrir estreno', 'pt-BR': 'Abrir estreia', vi: 'Mở công chiếu', id: 'Buka premiere', tr: 'Prömiyeri aç', pl: 'Otwórz premierę' })
      : triLang(lang, { ru: 'Смотреть', uk: 'Дивитися', es: 'Ver', 'pt-BR': 'Assistir', vi: 'Xem', id: 'Tonton', tr: 'İzle', pl: 'Oglądaj' });
  const accessibilityLabel = `${status}. ${video.title}. ${action}`;

  return (
    <View style={styles.shell}>
      <Pressable
        testID="home-youtube-feature-card"
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
          hapticTap();
          router.push({
            pathname: '/lingman_video_player',
            params: { id: video.id, title: video.title, watchUrl: video.watchUrl },
          } as any);
        }}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: t.bgCard },
          pressed && styles.cardPressed,
        ]}
      >
        <View style={[styles.thumbnail, { backgroundColor: t.bgSurface }]}>
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
            accessible={false}
          />
          <View style={styles.thumbnailShade} pointerEvents="none" />
          <View style={[styles.playButton, { backgroundColor: isLive ? '#E11D48' : 'rgba(5,8,18,0.78)' }]} pointerEvents="none">
            <Ionicons name={isLive ? 'radio' : 'play'} size={18} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.copy}>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: isLive ? '#E11D48' : isUpcoming ? t.accentBg : t.bgSurface },
            ]}>
              {isLive && <View style={styles.liveDot} />}
              <Text style={{ color: isLive ? '#FFFFFF' : isUpcoming ? t.accent : t.textSecond, fontSize: 11, lineHeight: 14, fontWeight: '900', textTransform: 'uppercase' }}>
                {status}
              </Text>
            </View>
            {premiereTime ? (
              <FlowText testID="home-youtube-premiere-time" provenance="authored" style={[styles.time, { color: t.textMuted }]}>{premiereTime}</FlowText>
            ) : null}
          </View>
          <FlowText testID="home-youtube-video-title" provenance="external" style={[styles.title, { color: t.textPrimary }]}>{video.title}</FlowText>
          <View style={styles.actionRow}>
            <FlowText testID="home-youtube-action" provenance="authored" style={[styles.action, { color: t.textSecond }]}>{action}</FlowText>
            <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default memo(HomeYoutubeFeatureCard);

const styles = StyleSheet.create({
  shell: { marginHorizontal: 8, marginTop: 12, marginBottom: 8 },
  card: {
    minHeight: 108,
    borderRadius: 22,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.86, transform: [{ scale: 0.992 }] },
  thumbnail: { width: 132, aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  thumbnailShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.10)' },
  playButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center', gap: 6 },
  statusRow: { minHeight: 22, flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusBadge: { minHeight: 22, borderRadius: 999, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  time: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  title: { fontSize: 15, lineHeight: 19, fontWeight: '900' },
  actionRow: { minHeight: 18, flexDirection: 'row', alignItems: 'center', gap: 2 },
  action: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 16, fontWeight: '800' },
});
