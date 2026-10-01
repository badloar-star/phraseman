import fs from "fs";
import path from "path";

/**
 * ⛔ Пломба владельца 2026-08-17: App Check в проекте не используется НИКОГДА.
 * Аудит E24 (2026-10-01) нашёл, что стор-сборка всё ещё запрашивала
 * Play Integrity / App Attest. Клиентская часть снята целиком; этот сторож
 * ломает сборку, если она вернётся. Сработал — убирай App Check, а не сторожа.
 */
const root = path.resolve(__dirname, "..");

// зачем: только клиентский код и нативный конфиг. Сервер сторожит
// functions/src/app_check_sealed.test.ts, веб-админку —
// tests/admin_v2_app_check_contract.test.ts.
const CLIENT_DIRS = [
  "app",
  "components",
  "hooks",
  "modules",
  "plugins",
  "constants",
  "contexts",
  "services",
  "utils",
  "lib",
  "src",
];
const CLIENT_CONFIG_FILES = [
  "app.json",
  "app.config.js",
  "eas.json",
  ".env.local.template",
];
const SOURCE_EXT = /\.(?:[cm]?[jt]sx?)$/;
const SKIP_DIRS = new Set(["node_modules", "__generated__", ".expo", "build"]);

const FORBIDDEN: ReadonlyArray<readonly [string, RegExp]> = [
  ["RN Firebase App Check package", /@react-native-firebase\/app-check/],
  ["web Firebase App Check SDK", /["']firebase\/app-check["']/],
  ["App Check initialization", /\binitializeAppCheck\b/],
  ["App Check provider", /AppCheckProvider\b/],
  ["App Check request header", /X-Firebase-AppCheck/i],
  ["iOS App Check pod", /RNFBAppCheck/],
  ["App Check env switch", /EXPO_PUBLIC_(?:ENABLE_)?APP_CHECK/],
  ["deleted client helper", /\bapp_check_init\b|initFirebaseAppCheckIfAvailable|isFirebaseAppCheckReady/],
  ["attestation providers", /\bplayIntegrity\b|appAttestWithDeviceCheckFallback/],
];

function collectSources(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectSources(full, acc);
    else if (SOURCE_EXT.test(entry.name)) acc.push(full);
  }
  return acc;
}

function violationsIn(files: readonly string[]): string[] {
  const found: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const [label, pattern] of FORBIDDEN) {
      if (pattern.test(text)) found.push(`${path.relative(root, file)} → ${label}`);
    }
  }
  return found;
}

describe("App Check is removed from the client forever (owner seal 2026-08-17)", () => {
  test("the client helper module is gone", () => {
    expect(fs.existsSync(path.join(root, "app/app_check_init.ts"))).toBe(false);
    expect(fs.existsSync(path.join(root, "plugins/withIosFirebaseEarlyConfigure.js"))).toBe(false);
  });

  test("no client source initializes App Check or sends its token", () => {
    const files = CLIENT_DIRS.flatMap((dir) => collectSources(path.join(root, dir)));
    expect(files.length).toBeGreaterThan(100);
    expect(violationsIn(files)).toEqual([]);
  });

  test("native config and build profiles do not pull App Check back in", () => {
    const files = CLIENT_CONFIG_FILES
      .map((name) => path.join(root, name))
      .filter((file) => fs.existsSync(file));
    expect(violationsIn(files)).toEqual([]);
  });

  test("the native package is not a dependency", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const declared = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.optionalDependencies,
    };
    expect(declared).not.toHaveProperty("@react-native-firebase/app-check");

    const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
    expect(lock.packages?.[""]?.dependencies ?? {}).not.toHaveProperty(
      "@react-native-firebase/app-check",
    );
  });
});
