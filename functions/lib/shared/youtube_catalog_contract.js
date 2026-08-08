"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YOUTUBE_CATALOG_LIMITS = void 0;
exports.parseYoutubeChannelId = parseYoutubeChannelId;
exports.parseYoutubeHandle = parseYoutubeHandle;
exports.parseYoutubeChannelReference = parseYoutubeChannelReference;
exports.resolveYoutubeChannelId = resolveYoutubeChannelId;
exports.validateYoutubeCatalogConfig = validateYoutubeCatalogConfig;
exports.parseYoutubeCatalogManifest = parseYoutubeCatalogManifest;
exports.parseYoutubeChannelSnapshot = parseYoutubeChannelSnapshot;
exports.parseYoutubeVideoSnapshot = parseYoutubeVideoSnapshot;
exports.parseYoutubePlaylistSnapshot = parseYoutubePlaylistSnapshot;
exports.parseYoutubePlaylistPage = parseYoutubePlaylistPage;
exports.YOUTUBE_CATALOG_LIMITS = Object.freeze({
    channels: 24,
    videosPerChannel: 100,
    playlistsPerChannel: 50,
    playlistItems: 500,
    playlistPageSize: 50,
});
const CHANNEL_ID_RE = /^UC[0-9A-Za-z_-]{22}$/;
const VIDEO_ID_RE = /^[0-9A-Za-z_-]{11}$/;
const PLAYLIST_ID_RE = /^[0-9A-Za-z_-]{10,100}$/;
const INTERNAL_ID_RE = /^[0-9A-Za-z_-]{1,80}$/;
const VERSION_ID_RE = /^[0-9A-Za-z._:-]{1,120}$/;
const VIDEO_STATES = new Set(['video', 'upcoming', 'live', 'completed']);
function fail(code) { throw new Error(code); }
function record(value, code) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        fail(code);
    return value;
}
function text(value, code, max = 500) {
    if (typeof value !== 'string')
        fail(code);
    const normalized = value.trim();
    if (!normalized || normalized.length > max)
        fail(code);
    return normalized;
}
function optionalText(value, code, max = 500) {
    if (value == null || value === '')
        return undefined;
    return text(value, code, max);
}
function booleanValue(value, code) {
    if (typeof value !== 'boolean')
        fail(code);
    return value;
}
function integer(value, code, min = 0) {
    if (!Number.isSafeInteger(value) || Number(value) < min)
        fail(code);
    return Number(value);
}
function finiteNumber(value, code, min = 0) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min)
        fail(code);
    return value;
}
function isoDate(value, code) {
    const normalized = text(value, code, 64);
    if (!Number.isFinite(Date.parse(normalized)))
        fail(code);
    return normalized;
}
function optionalIsoDate(value, code) {
    if (value == null || value === '')
        return undefined;
    return isoDate(value, code);
}
function httpsUrl(value, code) {
    const normalized = text(value, code, 2048);
    try {
        const url = new URL(normalized);
        if (url.protocol !== 'https:')
            fail(code);
        return url.toString();
    }
    catch {
        return fail(code);
    }
}
function youtubeUrl(value, code) {
    const normalized = httpsUrl(value, code);
    const hostname = new URL(normalized).hostname.toLowerCase();
    if (hostname !== 'youtube.com' && hostname !== 'www.youtube.com' && hostname !== 'm.youtube.com' && hostname !== 'youtu.be') {
        fail(code);
    }
    return normalized;
}
function stringArray(value, code, max, item = (entry) => entry) {
    if (!Array.isArray(value))
        fail(code);
    if (value.length > max)
        fail(`${code}_limit_exceeded`);
    const normalized = value.map((entry) => item(text(entry, code, 160)));
    if (new Set(normalized).size !== normalized.length)
        fail(`${code}_must_be_unique`);
    return normalized;
}
function languageTag(value) {
    const normalized = value.replace(/_/g, '-').trim();
    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(normalized))
        fail('language_tag_invalid');
    return normalized;
}
function internalId(value, code) {
    const normalized = text(value, code, 80);
    if (!INTERNAL_ID_RE.test(normalized))
        fail(code);
    return normalized;
}
function videoId(value, code) {
    const normalized = text(value, code, 32);
    if (!VIDEO_ID_RE.test(normalized))
        fail(code);
    return normalized;
}
function playlistId(value, code) {
    const normalized = text(value, code, 100);
    if (!PLAYLIST_ID_RE.test(normalized))
        fail(code);
    return normalized;
}
function boundedRecord(value, code, max) {
    const normalized = record(value, code);
    if (Object.keys(normalized).length > max)
        fail(`${code}_limit_exceeded`);
    return normalized;
}
function optionalBoolean(value, code) {
    if (value == null)
        return undefined;
    return booleanValue(value, code);
}
function optionalInteger(value, code) {
    if (value == null)
        return undefined;
    return integer(value, code);
}
function parseYoutubeChannelId(raw) {
    const value = String(raw ?? '').trim();
    if (!value)
        return '';
    const match = value.match(/UC[0-9A-Za-z_-]{22}/);
    return match && CHANNEL_ID_RE.test(match[0]) ? match[0] : '';
}
function parseYoutubeHandle(raw) {
    const value = String(raw ?? '').trim();
    if (!value)
        return '';
    const fromUrl = value.match(/(?:youtube\.com|youtu\.be)\/@([0-9A-Za-z._-]+)/i);
    if (fromUrl)
        return fromUrl[1];
    const bare = value.replace(/^@/, '');
    return /^[0-9A-Za-z._-]+$/.test(bare) ? bare : '';
}
function parseYoutubeChannelReference(raw) {
    const value = String(raw ?? '').trim();
    if (!value)
        return '';
    const channelId = parseYoutubeChannelId(value);
    if (channelId)
        return channelId;
    const handle = parseYoutubeHandle(value);
    return handle && (/@[0-9A-Za-z._-]+/.test(value) || value.startsWith('@')) ? `@${handle}` : '';
}
function normalizedLocale(value) {
    return value.replace(/_/g, '-').trim().toLowerCase();
}
function resolveYoutubeChannelId(manifest, locale, manualChannelId) {
    const available = new Set(manifest.channels.map((channel) => channel.id));
    if (manualChannelId && available.has(manualChannelId))
        return manualChannelId;
    const wanted = normalizedLocale(locale);
    const defaults = Object.entries(manifest.localeDefaults);
    const exact = defaults.find(([key]) => normalizedLocale(key) === wanted)?.[1];
    if (exact && available.has(exact))
        return exact;
    const base = wanted.split('-')[0];
    const baseMatch = defaults.find(([key]) => normalizedLocale(key) === base)?.[1];
    if (baseMatch && available.has(baseMatch))
        return baseMatch;
    if (available.has(manifest.defaultChannelId))
        return manifest.defaultChannelId;
    return manifest.channels.slice().sort((left, right) => left.order - right.order)[0]?.id ?? '';
}
function parseChannelConfig(value) {
    const source = record(value, 'channel_config_invalid');
    const id = internalId(source.id, 'channel_id_invalid');
    const youtubeChannelId = text(source.youtubeChannelId, 'youtube_channel_id_invalid', 300);
    if (!parseYoutubeChannelReference(youtubeChannelId))
        fail('youtube_channel_id_invalid');
    const enabled = booleanValue(source.enabled, 'channel_enabled_invalid');
    const order = integer(source.order, 'channel_order_invalid');
    const languageTags = stringArray(source.languageTags, 'language_tags', 20, languageTag);
    const displayNameOverride = optionalText(source.displayNameOverride, 'display_name_override_invalid', 120);
    let pinnedVideos;
    if (source.pinnedVideos != null) {
        if (!Array.isArray(source.pinnedVideos))
            fail('pinned_videos_invalid');
        if (source.pinnedVideos.length > exports.YOUTUBE_CATALOG_LIMITS.videosPerChannel)
            fail('pinned_videos_limit_exceeded');
        pinnedVideos = source.pinnedVideos.map((entry) => {
            const pin = record(entry, 'pinned_video_invalid');
            return {
                id: videoId(pin.id, 'pinned_video_id_invalid'),
                ...(optionalText(pin.title, 'pinned_video_title_invalid', 200) ? { title: optionalText(pin.title, 'pinned_video_title_invalid', 200) } : {}),
                ...(pin.url != null ? { url: youtubeUrl(pin.url, 'pinned_video_url_invalid') } : {}),
            };
        });
        if (new Set(pinnedVideos.map((entry) => entry.id)).size !== pinnedVideos.length)
            fail('pinned_video_id_must_be_unique');
    }
    const playlistSource = boundedRecord(source.playlistOverrides ?? {}, 'playlist_overrides_invalid', exports.YOUTUBE_CATALOG_LIMITS.playlistsPerChannel);
    const playlistOverrides = Object.fromEntries(Object.entries(playlistSource).map(([key, raw]) => {
        const override = record(raw, 'playlist_override_invalid');
        return [playlistId(key, 'playlist_override_id_invalid'), {
                ...(optionalBoolean(override.hidden, 'playlist_override_hidden_invalid') == null ? {} : { hidden: optionalBoolean(override.hidden, 'playlist_override_hidden_invalid') }),
                ...(optionalInteger(override.order, 'playlist_override_order_invalid') == null ? {} : { order: optionalInteger(override.order, 'playlist_override_order_invalid') }),
                ...(optionalText(override.titleOverride, 'playlist_override_title_invalid', 200) ? { titleOverride: optionalText(override.titleOverride, 'playlist_override_title_invalid', 200) } : {}),
            }];
    }));
    const premiereSource = boundedRecord(source.premiereOverrides ?? {}, 'premiere_overrides_invalid', exports.YOUTUBE_CATALOG_LIMITS.videosPerChannel);
    const premiereOverrides = Object.fromEntries(Object.entries(premiereSource).map(([key, raw]) => {
        const override = record(raw, 'premiere_override_invalid');
        return [videoId(key, 'premiere_override_video_id_invalid'), {
                ...(optionalBoolean(override.hidden, 'premiere_override_hidden_invalid') == null ? {} : { hidden: optionalBoolean(override.hidden, 'premiere_override_hidden_invalid') }),
                ...(optionalText(override.titleOverride, 'premiere_override_title_invalid', 200) ? { titleOverride: optionalText(override.titleOverride, 'premiere_override_title_invalid', 200) } : {}),
                ...(optionalIsoDate(override.scheduledStartOverride, 'premiere_override_start_invalid') ? { scheduledStartOverride: optionalIsoDate(override.scheduledStartOverride, 'premiere_override_start_invalid') } : {}),
                expiresAt: isoDate(override.expiresAt, 'premiere_override_expiry_invalid'),
            }];
    }));
    return {
        id,
        youtubeChannelId,
        enabled,
        order,
        languageTags,
        ...(displayNameOverride ? { displayNameOverride } : {}),
        ...(pinnedVideos ? { pinnedVideos } : {}),
        playlistOverrides,
        premiereOverrides,
    };
}
function validateYoutubeCatalogConfig(value) {
    const source = record(value, 'youtube_catalog_config_invalid');
    if (source.schemaVersion !== 1)
        fail('youtube_catalog_schema_version_invalid');
    const enabled = booleanValue(source.enabled, 'youtube_catalog_enabled_invalid');
    if (!Array.isArray(source.channels))
        fail('channels_invalid');
    if (source.channels.length > exports.YOUTUBE_CATALOG_LIMITS.channels)
        fail('channels_limit_exceeded');
    const channels = source.channels.map(parseChannelConfig);
    const channelIds = channels.map((channel) => channel.id);
    if (new Set(channelIds).size !== channelIds.length)
        fail('channel_id_must_be_unique');
    const youtubeIds = channels.map((channel) => channel.youtubeChannelId);
    if (new Set(youtubeIds).size !== youtubeIds.length)
        fail('youtube_channel_id_must_be_unique');
    const defaultsSource = boundedRecord(source.localeDefaults, 'locale_defaults_invalid', 100);
    const channelById = new Map(channels.map((channel) => [channel.id, channel]));
    const localeDefaults = {};
    for (const [locale, rawChannelId] of Object.entries(defaultsSource)) {
        const normalizedTag = languageTag(locale);
        const target = internalId(rawChannelId, 'locale_default_channel_invalid');
        const channel = channelById.get(target);
        if (!channel)
            fail('locale_default_channel_missing');
        if (!channel.enabled)
            fail('locale_default_must_be_enabled');
        if (Object.keys(localeDefaults).some((key) => normalizedLocale(key) === normalizedLocale(normalizedTag))) {
            fail('locale_default_must_be_unique');
        }
        localeDefaults[normalizedTag] = target;
    }
    return {
        schemaVersion: 1,
        enabled,
        channels,
        localeDefaults,
        updatedAt: isoDate(source.updatedAt, 'youtube_catalog_updated_at_invalid'),
        updatedBy: text(source.updatedBy, 'youtube_catalog_updated_by_invalid', 160),
    };
}
function parseManifestChannel(value) {
    const source = record(value, 'manifest_channel_invalid');
    const avatarUrl = source.avatarUrl == null ? undefined : httpsUrl(source.avatarUrl, 'manifest_channel_avatar_invalid');
    return {
        id: internalId(source.id, 'manifest_channel_id_invalid'),
        displayName: text(source.displayName, 'manifest_channel_name_invalid', 120),
        ...(avatarUrl ? { avatarUrl } : {}),
        languageTags: stringArray(source.languageTags, 'manifest_channel_language_tags', 20, languageTag),
        order: integer(source.order, 'manifest_channel_order_invalid'),
    };
}
function parseYoutubeCatalogManifest(value) {
    const source = record(value, 'youtube_catalog_manifest_invalid');
    if (source.schemaVersion !== 1)
        fail('manifest_schema_version_invalid');
    const activeVersion = text(source.activeVersion, 'manifest_active_version_invalid', 120);
    if (!VERSION_ID_RE.test(activeVersion))
        fail('manifest_active_version_invalid');
    if (!Array.isArray(source.channels) || source.channels.length === 0)
        fail('manifest_channels_invalid');
    if (source.channels.length > exports.YOUTUBE_CATALOG_LIMITS.channels)
        fail('manifest_channels_limit_exceeded');
    const channels = source.channels.map(parseManifestChannel);
    if (new Set(channels.map((channel) => channel.id)).size !== channels.length)
        fail('manifest_channel_id_must_be_unique');
    const available = new Set(channels.map((channel) => channel.id));
    const defaultChannelId = internalId(source.defaultChannelId, 'manifest_default_channel_invalid');
    if (!available.has(defaultChannelId))
        fail('manifest_default_channel_missing');
    const defaultsSource = boundedRecord(source.localeDefaults, 'manifest_locale_defaults_invalid', 100);
    const localeDefaults = {};
    for (const [locale, rawChannelId] of Object.entries(defaultsSource)) {
        const target = internalId(rawChannelId, 'manifest_locale_default_channel_invalid');
        if (!available.has(target))
            fail('manifest_locale_default_channel_missing');
        localeDefaults[languageTag(locale)] = target;
    }
    return {
        schemaVersion: 1,
        activeVersion,
        generatedAt: isoDate(source.generatedAt, 'manifest_generated_at_invalid'),
        sourceRefreshedAt: isoDate(source.sourceRefreshedAt, 'manifest_source_refreshed_at_invalid'),
        defaultChannelId,
        localeDefaults,
        channels,
    };
}
function parseYoutubeChannelSnapshot(value) {
    const source = record(value, 'youtube_channel_snapshot_invalid');
    const youtubeChannelId = text(source.youtubeChannelId, 'snapshot_youtube_channel_id_invalid', 24);
    if (!CHANNEL_ID_RE.test(youtubeChannelId))
        fail('snapshot_youtube_channel_id_invalid');
    const activeEventVideoId = source.activeEventVideoId == null
        ? undefined
        : videoId(source.activeEventVideoId, 'snapshot_active_event_video_id_invalid');
    const recentVideoIds = stringArray(source.recentVideoIds, 'snapshot_recent_video_ids', exports.YOUTUBE_CATALOG_LIMITS.videosPerChannel, (entry) => videoId(entry, 'snapshot_video_id_invalid'));
    if (activeEventVideoId && !recentVideoIds.includes(activeEventVideoId))
        fail('snapshot_active_event_missing');
    return {
        id: internalId(source.id, 'snapshot_channel_id_invalid'),
        youtubeChannelId,
        displayName: text(source.displayName, 'snapshot_channel_name_invalid', 120),
        handle: text(source.handle, 'snapshot_channel_handle_invalid', 120),
        url: youtubeUrl(source.url, 'snapshot_channel_url_invalid'),
        ...(source.avatarUrl == null ? {} : { avatarUrl: httpsUrl(source.avatarUrl, 'snapshot_channel_avatar_invalid') }),
        languageTags: stringArray(source.languageTags, 'snapshot_language_tags', 20, languageTag),
        order: integer(source.order, 'snapshot_channel_order_invalid'),
        ...(activeEventVideoId ? { activeEventVideoId } : {}),
        recentVideoIds,
        playlistIds: stringArray(source.playlistIds, 'snapshot_playlist_ids', exports.YOUTUBE_CATALOG_LIMITS.playlistsPerChannel, (entry) => playlistId(entry, 'snapshot_playlist_id_invalid')),
    };
}
function parseYoutubeVideoSnapshot(value) {
    const source = record(value, 'youtube_video_snapshot_invalid');
    const state = text(source.state, 'video_state_invalid', 16);
    if (!VIDEO_STATES.has(state))
        fail('video_state_invalid');
    const scheduledStartTime = optionalIsoDate(source.scheduledStartTime, 'video_scheduled_start_invalid');
    const actualStartTime = optionalIsoDate(source.actualStartTime, 'video_actual_start_invalid');
    const actualEndTime = optionalIsoDate(source.actualEndTime, 'video_actual_end_invalid');
    if (state === 'upcoming' && !scheduledStartTime)
        fail('upcoming_video_schedule_required');
    if (state === 'live' && !actualStartTime)
        fail('live_video_actual_start_required');
    if (state === 'completed' && !actualEndTime)
        fail('completed_video_actual_end_required');
    const publishedAt = optionalIsoDate(source.publishedAt, 'video_published_at_invalid');
    const viewCount = source.viewCount == null ? undefined : finiteNumber(source.viewCount, 'video_view_count_invalid');
    return {
        id: videoId(source.id, 'video_id_invalid'),
        channelId: internalId(source.channelId, 'video_channel_id_invalid'),
        title: text(source.title, 'video_title_invalid', 300),
        description: typeof source.description === 'string' && source.description.length <= 5000
            ? source.description
            : fail('video_description_invalid'),
        thumbnailUrl: httpsUrl(source.thumbnailUrl, 'video_thumbnail_url_invalid'),
        watchUrl: youtubeUrl(source.watchUrl, 'video_watch_url_invalid'),
        ...(publishedAt ? { publishedAt } : {}),
        ...(viewCount == null ? {} : { viewCount }),
        state,
        ...(scheduledStartTime ? { scheduledStartTime } : {}),
        ...(actualStartTime ? { actualStartTime } : {}),
        ...(actualEndTime ? { actualEndTime } : {}),
        playlistIds: stringArray(source.playlistIds, 'video_playlist_ids', exports.YOUTUBE_CATALOG_LIMITS.playlistsPerChannel, (entry) => playlistId(entry, 'video_playlist_id_invalid')),
    };
}
function parseYoutubePlaylistSnapshot(value) {
    const source = record(value, 'youtube_playlist_snapshot_invalid');
    const itemCount = integer(source.itemCount, 'playlist_item_count_invalid');
    if (itemCount > exports.YOUTUBE_CATALOG_LIMITS.playlistItems)
        fail('playlist_item_count_limit_exceeded');
    const pageCount = integer(source.pageCount, 'playlist_page_count_invalid');
    const maximumPages = Math.ceil(exports.YOUTUBE_CATALOG_LIMITS.playlistItems / exports.YOUTUBE_CATALOG_LIMITS.playlistPageSize);
    if (pageCount > maximumPages || pageCount !== Math.ceil(itemCount / exports.YOUTUBE_CATALOG_LIMITS.playlistPageSize)) {
        fail('playlist_page_count_invalid');
    }
    return {
        id: playlistId(source.id, 'playlist_id_invalid'),
        channelId: internalId(source.channelId, 'playlist_channel_id_invalid'),
        title: text(source.title, 'playlist_title_invalid', 300),
        description: typeof source.description === 'string' && source.description.length <= 5000
            ? source.description
            : fail('playlist_description_invalid'),
        ...(source.thumbnailUrl == null ? {} : { thumbnailUrl: httpsUrl(source.thumbnailUrl, 'playlist_thumbnail_url_invalid') }),
        url: youtubeUrl(source.url, 'playlist_url_invalid'),
        itemCount,
        order: integer(source.order, 'playlist_order_invalid'),
        pageCount,
    };
}
function parseYoutubePlaylistPage(value) {
    const source = record(value, 'youtube_playlist_page_invalid');
    if (!Array.isArray(source.videoIds))
        fail('playlist_page_video_ids_invalid');
    if (source.videoIds.length > exports.YOUTUBE_CATALOG_LIMITS.playlistPageSize)
        fail('playlist_page_limit_exceeded');
    return {
        page: integer(source.page, 'playlist_page_number_invalid'),
        videoIds: stringArray(source.videoIds, 'playlist_page_video_ids', exports.YOUTUBE_CATALOG_LIMITS.playlistPageSize, (entry) => videoId(entry, 'playlist_page_video_id_invalid')),
    };
}
//# sourceMappingURL=youtube_catalog_contract.js.map