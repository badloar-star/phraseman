import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("league XP promotion remote mode contract", () => {
  it("keeps the remote config switch and threshold editable without an app deploy", () => {
    const flagsSource = read("app/remote_flags.ts");
    const liveAdmin = read("admin/v2/legacy.html");

    // App-side source of truth: defaults, clamp and getters bound to remote keys.
    expect(flagsSource).toContain("league_xp_promotion_enabled: false");
    expect(flagsSource).toContain("league_xp_promotion_threshold: 1000");
    expect(flagsSource).toContain(
      "league_xp_promotion_threshold: { min: 1, max: 1000000 }",
    );
    expect(flagsSource).toContain(
      "getRemoteNumber('league_xp_promotion_threshold')",
    );
    expect(flagsSource).toContain(
      "getRemoteBool('league_xp_promotion_enabled')",
    );

    // Единственная живая legacy-админка содержит оба ключа в Remote Config.
    expect(liveAdmin).toContain("league_xp_promotion_enabled");
    expect(liveAdmin).toContain("league_xp_promotion_threshold");
    expect(liveAdmin).toContain("switchTab('remote-config')");
  });

  it("keeps the app league screen wired to show the temporary rule and green promotion badges", () => {
    const clubSource = read("app/club_screen.tsx");

    expect(clubSource).toContain("remote_config_changed");
    expect(clubSource).toContain("league-xp-promotion-banner");
    expect(clubSource).toContain("league-xp-promotion-badge");
    expect(clubSource).toContain("leagueXpPromotionBannerText");
    expect(clubSource).toContain("isLeagueXpPromotionEnabled");
    expect(clubSource).toContain("getLeagueXpPromotionThreshold");
  });
});
