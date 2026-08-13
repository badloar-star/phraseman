/**
 * Контракт единственной разрешённой корневой админки.
 *
 * Firebase Hosting публикует `admin`, но обязательно исключает заблокированное
 * поддерево `v2/**`. Корневой entry ведёт только в `admin/legacy.html`.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const LIVE_ADMIN = "admin/legacy.html";
const ROOT_ENTRY = "admin/index.html";

describe("единственная разрешённая корневая админка", () => {
  it("корневой workflow существует, а entry ведёт только в него", () => {
    expect(existsSync(path.join(repoRoot, LIVE_ADMIN))).toBe(true);
    expect(existsSync(path.join(repoRoot, ROOT_ENTRY))).toBe(true);

    const liveHtml = read(LIVE_ADMIN);
    const entryHtml = read(ROOT_ENTRY);
    expect(liveHtml.length).toBeGreaterThan(500_000);
    expect(liveHtml).toContain("control-panel");
    expect(entryHtml.length).toBeLessThan(5_000);
    expect(entryHtml).toContain("/legacy.html");
    expect(entryHtml).not.toContain("/v2");
  });

  it("Hosting публикует root admin и не публикует заблокированное поддерево", () => {
    const firebaseJson = JSON.parse(read("firebase.json")) as {
      hosting?: unknown;
    };
    const hosting = Array.isArray(firebaseJson.hosting)
      ? (firebaseJson.hosting as Array<Record<string, unknown>>)
      : [firebaseJson.hosting as Record<string, unknown>];
    const adminTarget = hosting.find((entry) => entry?.target === "admin");

    expect(adminTarget?.public).toBe("admin");
    expect(adminTarget?.ignore).toEqual(expect.arrayContaining(["v2/**"]));

    const redirects = adminTarget?.redirects as Array<Record<string, unknown>>;
    for (const source of ["/v2", "/v2/**"]) {
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

  it("оба deploy-guard проверяют постоянный запрет до публикации", () => {
    const hostingGuard = read("scripts/admin_hosting_deploy_guard.mjs");
    const globalGuard = read("scripts/deploy_lock_guard.mjs");

    expect(hostingGuard).toMatch(/const ADMIN_PUBLIC_DIR = ["']admin["']/u);
    expect(hostingGuard).toMatch(
      /const FORBIDDEN_ADMIN_SUBTREE_GLOB = ["']v2\/\*\*["']/u,
    );
    expect(globalGuard).toMatch(/adminTarget\?\.public !== ["']admin["']/u);
    expect(globalGuard).toMatch(/ignore\.includes\(["']v2\/\*\*["']\)/u);
  });
});
