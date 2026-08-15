/**
 * Контракт единственной разрешённой корневой админки.
 *
 * Firebase Hosting публикует только `admin/v2`, где единственная рабочая
 * поверхность — `legacy.html`. Белый V2 entry удалён навсегда.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const LIVE_ADMIN = "admin/v2/legacy.html";
const RETIRED_V2_ENTRY = "admin/v2/index.html";

describe("единственная разрешённая корневая админка", () => {
  it("рабочая legacy-поверхность существует, а белый V2 entry удалён", () => {
    expect(existsSync(path.join(repoRoot, LIVE_ADMIN))).toBe(true);
    expect(existsSync(path.join(repoRoot, RETIRED_V2_ENTRY))).toBe(false);

    const liveHtml = read(LIVE_ADMIN);
    expect(liveHtml.length).toBeGreaterThan(500_000);
    expect(liveHtml).toContain("control-panel");
    expect(liveHtml).toContain("adminArenaConfigGet");
    expect(liveHtml).toContain("adminArenaConfigSet");
    expect(liveHtml).toContain('id="cp-arena-card"');
  });

  it("Hosting публикует canonical admin/v2 и перенаправляет старые входы", () => {
    const firebaseJson = JSON.parse(read("firebase.json")) as {
      hosting?: unknown;
    };
    const hosting = Array.isArray(firebaseJson.hosting)
      ? (firebaseJson.hosting as Array<Record<string, unknown>>)
      : [firebaseJson.hosting as Record<string, unknown>];
    const adminTarget = hosting.find((entry) => entry?.target === "admin");

    expect(adminTarget?.public).toBe("admin/v2");
    expect(adminTarget?.ignore).not.toEqual(expect.arrayContaining(["v2/**"]));

    const redirects = adminTarget?.redirects as Array<Record<string, unknown>>;
    for (const source of ["/", "/index.html", "/v2", "/v2/**"]) {
      expect(redirects).toContainEqual({
        source,
        destination: "/legacy.html",
        type: 301,
      });
    }
    expect(redirects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destination: expect.stringMatching(/^\/v2(?:\/|$)/),
        }),
      ]),
    );
  });

  it("оба deploy-guard проверяют canonical каталог до публикации", () => {
    const hostingGuard = read("scripts/admin_hosting_deploy_guard.mjs");
    const globalGuard = read("scripts/deploy_lock_guard.mjs");

    expect(hostingGuard).toMatch(/const ADMIN_PUBLIC_DIR = ["']admin\/v2["']/u);
    expect(hostingGuard).toContain('path.join("admin", "v2", "legacy.html")');
    expect(globalGuard).toMatch(
      /adminTarget\?\.public !== ["']admin\/v2["']/u,
    );
  });
});
