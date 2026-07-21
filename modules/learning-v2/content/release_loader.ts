import { validatePublishedV2SeasonManifest, type V2PublishedSeasonManifestView } from './release_manifest';
import type { V2ReleaseCache } from './release_cache';

export async function loadV2ReleaseWithLkg(input: { key: string; cache: V2ReleaseCache; fetchView: () => Promise<unknown> }): Promise<{ source: 'network' | 'lkg'; view: V2PublishedSeasonManifestView }> {
  try {
    const candidate = await input.fetchView();
    const validation = validatePublishedV2SeasonManifest(candidate);
    if (!validation.ok) throw new Error(`v2_release_invalid:${validation.errors.join(',')}`);
    const view = candidate as V2PublishedSeasonManifestView;
    await input.cache.set(input.key, view);
    return { source: 'network', view };
  } catch (error) {
    const cached = await input.cache.get(input.key);
    if (cached) return { source: 'lkg', view: cached };
    throw error;
  }
}
