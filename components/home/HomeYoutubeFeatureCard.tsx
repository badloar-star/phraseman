import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { hapticTap } from '../../hooks/use-haptics';
import YoutubeInlinePlayer from '../youtube/YoutubeInlinePlayer';
import YoutubeVideoCard from '../youtube/YoutubeVideoCard';

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

function HomeYoutubeFeatureCard({ ownerActive, studyTarget }: HomeYoutubeFeatureCardProps) {
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
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerActive) return;
    const sync = () => setEnabled(isVideoButtonEnabled());
    sync();
    const subscription = onAppEvent('remote_config_changed', sync);
    return () => subscription.remove();
  }, [ownerActive]);

  useEffect(() => {
    if (!ownerActive) setActiveVideoId(null);
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
  const handleWatch = useCallback(() => {
    if (!video) return;
    hapticTap();
    setActiveVideoId(video.id);
  }, [video]);
  const handleClose = useCallback(() => setActiveVideoId(null), []);
  if (!enabled || !video) return null;

  return (
    <View style={styles.shell}>
      <YoutubeVideoCard
        video={video}
        onWatch={handleWatch}
        highlighted={activeVideoId === video.id}
        inlinePlayer={ownerActive && activeVideoId === video.id ? (
          <YoutubeInlinePlayer
            videoId={video.id}
            title={video.title}
            active
            onClose={handleClose}
            presentation="preview"
          />
        ) : undefined}
      />
    </View>
  );
}

export default memo(HomeYoutubeFeatureCard);

const styles = StyleSheet.create({
  shell: { marginHorizontal: 8, marginTop: 12, marginBottom: 8 },
});
