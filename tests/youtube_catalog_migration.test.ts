import fs from "node:fs";
import path from "node:path";
import { normalizeEol } from './helpers/read_source';

const root = path.resolve(process.cwd());
const read = (relative: string) =>
  normalizeEol(fs.readFileSync(path.join(root, relative), "utf8"));

describe("YouTube catalog migration and rollback bridge", () => {
  const legacyAdmin = read("admin/v2/legacy.html");
  const mobileScreen = read("app/lingman_videos.tsx");

  it("bootstraps the first draft from legacy remote-config values without deleting them", () => {
    const start = legacyAdmin.indexOf("function ytcBootstrapLegacyConfig");
    const end = legacyAdmin.indexOf("\n  function ytcSelectedChannel", start);
    const helper = legacyAdmin.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(helper).toContain("youtube_channel_id");
    expect(helper).toContain("youtube_channel_name");
    expect(helper).toContain("youtube_pinned_videos");
    expect(helper).toContain("id: 'legacy-primary'");
    expect(helper).toContain("en: 'legacy-primary'");
    expect(helper).not.toMatch(
      /delete\s+legacy\.|saveControlPanelTexts|publishAdminRemoteConfigPatch/,
    );
    expect(legacyAdmin).toContain(
      "ytcBootstrapLegacyConfig(data.config, legacyTexts)",
    );
  });

  it("keeps the canonical legacy admin as the only YouTube catalog editor", () => {
    expect(legacyAdmin).toContain("YOUTUBE_CATALOG_ADMIN_START");
    expect(fs.existsSync(path.join(root, "admin", "v2", "index.html"))).toBe(
      false,
    );
    expect(
      fs.existsSync(path.join(root, "admin", "v2", "english-test.html")),
    ).toBe(false);
  });

  it("retains the pre-catalog RSS and pinned-video entry path", () => {
    expect(mobileScreen).toContain("getLingmanYoutubeSnapshot");
    expect(mobileScreen).toContain("peekYoutubeCatalogScreenSnapshot");
    expect(mobileScreen).toContain(
      "if (!catalogRef.current) await loadLegacyFallback()",
    );
    const legacyRuntime = read("app/lingman_youtube.ts");
    expect(legacyRuntime).toContain("mergePinnedVideos(pinned, feed)");
    // зачем (11.10, §CORE-0170): при сбое RSS лента собирается явными ветками — свежий кэш → каталог → старый кэш →
    // встроенные видео ТОЛЬКО своего канала (переопределённому каналу чужой список не показываем). Смысл прежний.
    expect(legacyRuntime).toContain('const cachedEntry = await readCachedVideoEntry();');
    expect(legacyRuntime).toContain("if (cachedEntry) return build(cachedEntry.videos, 'feed_cache_stale');");
    expect(legacyRuntime).toContain("return build(isDefaultChannel ? FALLBACK_VIDEOS : [], isDefaultChannel ? 'builtin' : 'none');");
  });
});
