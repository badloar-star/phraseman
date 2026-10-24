import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import type { ImageSourcePropType } from 'react-native';

import { DebugLogger } from './debug-logger';
import { isInteractiveNetworkDeferredError, withBackgroundNetworkLease } from './interactive_network_quiet';
import { isPremiumThemeUnlocked } from './premium_theme_entitlements';
import { premiumThemeById, type PremiumThemeId } from './premium_theme_catalog';

const LOG = '[PREMIUM-THEME-PACK]';
const PACK_VERSION = 2;
const ROOT_NAME = 'premium-theme-packs-v2';
const MAX_ASSET_BYTES = 4_000_000;
const MAX_PACK_BYTES = 32_000_000;
const SHA256 = /^[a-f0-9]{64}$/;
const FIREBASE_BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const OBJECT_PREFIX = 'premium-theme-packs/v2';

const ASSET_NAMES = Object.freeze([
  'home_scene_newbie', 'home_scene_continue', 'home_scene_streak_risk', 'home_scene_day_done',
  'home_scene_no_energy', 'home_scene_offline', 'home_scene_exam_ready', 'home_scene_streak_lost',
  'home_scene_welcome_back', 'home_scene_all_done',
  'lessons', 'cards', 'dialogs', 'spire_tile', 'phrase_of_day',
] as const);
const OPTIONAL_ASSET_NAMES = Object.freeze(['motion_plate'] as const);
const ALLOWED_ASSET_NAMES = new Set<string>([...ASSET_NAMES, ...OPTIONAL_ASSET_NAMES]);

type AssetManifestRow = Readonly<{ path: string; sha256: string; bytes: number; width: number; height: number; extension: 'png' | 'webp' }>;
type PackManifest = Readonly<{
  schemaVersion: 'phraseman-premium-theme-packs.v2';
  version: 2;
  themes: Readonly<Record<string, Readonly<{ assets: Readonly<Record<string, AssetManifestRow>> }>>>;
}>;

type InstalledPack = Readonly<{ themeId: PremiumThemeId; sources: ReadonlyMap<string, ImageSourcePropType> }>;

const installed = new Map<PremiumThemeId, InstalledPack>();
const inFlight = new Map<PremiumThemeId, Promise<boolean>>();
const listeners = new Set<() => void>();
let activeThemeId: string = '';
let allowLockedDevPreview = false;
let diskPrimed = false;
let diskPrimePromise: Promise<void> | null = null;
let revision = 0;

function root(): Directory { return new Directory(Paths.document, ROOT_NAME); }
function packDir(themeId: PremiumThemeId): Directory { return new Directory(root(), premiumThemeById(themeId)?.packId ?? themeId); }
function receiptFile(themeId: PremiumThemeId): File { return new File(packDir(themeId), 'receipt.json'); }
function objectUrl(path: string): string {
  const override = process.env.EXPO_PUBLIC_PREMIUM_THEME_PACK_BASE_URL?.trim();
  // The override names the pack root itself (…/premium-theme-packs/v1), while
  // manifest rows keep their production Storage prefix. Remove that prefix for
  // local/CDN overrides or we request …/v1/premium-theme-packs/v1/… and get 404.
  if (override) {
    const relative = path.startsWith(`${OBJECT_PREFIX}/`) ? path.slice(OBJECT_PREFIX.length + 1) : path.replace(/^\//, '');
    return `${override.replace(/\/$/, '')}/${relative}`;
  }
  return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function fileSha256(file: File): Promise<string> {
  return toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, await file.bytes()));
}

function validManifest(value: unknown): PackManifest | null {
  const manifest = value as Partial<PackManifest> | null;
  if (!manifest || manifest.schemaVersion !== 'phraseman-premium-theme-packs.v2' || manifest.version !== PACK_VERSION
    || !manifest.themes || typeof manifest.themes !== 'object') return null;
  for (const entry of Object.values(manifest.themes)) {
    if (!entry || typeof entry !== 'object' || !entry.assets || typeof entry.assets !== 'object') return null;
    let total = 0;
    for (const name of ASSET_NAMES) {
      const row = entry.assets[name];
      if (!row || typeof row.path !== 'string' || !row.path.startsWith(`${OBJECT_PREFIX}/`) || row.path.includes('..')
        || !SHA256.test(row.sha256) || !Number.isSafeInteger(row.bytes) || row.bytes <= 0 || row.bytes > MAX_ASSET_BYTES
        || row.extension !== 'png' || !row.path.endsWith('.png')
        || row.width !== 1254 || row.height !== 1254) return null;
      total += row.bytes;
    }
    for (const [name, row] of Object.entries(entry.assets)) {
      if (!ALLOWED_ASSET_NAMES.has(name)) return null;
      if (!row || !['png', 'webp'].includes(row.extension) || !row.path.endsWith(`.${row.extension}`)
        || !SHA256.test(row.sha256) || !Number.isSafeInteger(row.bytes) || row.bytes <= 0 || row.bytes > MAX_ASSET_BYTES
        || !Number.isSafeInteger(row.width) || row.width < 1 || row.width > 4096
        || !Number.isSafeInteger(row.height) || row.height < 1 || row.height > 4096) return null;
      if (!ASSET_NAMES.includes(name as typeof ASSET_NAMES[number])) total += row.bytes;
    }
    if (total > MAX_PACK_BYTES) return null;
  }
  return manifest as PackManifest;
}

function installedSources(themeId: PremiumThemeId, rows: Readonly<Record<string, AssetManifestRow>>): InstalledPack | null {
  const dir = packDir(themeId);
  const sources = new Map<string, ImageSourcePropType>();
  if (ASSET_NAMES.some((name) => !rows[name])) return null;
  for (const [name, row] of Object.entries(rows)) {
    if (!ALLOWED_ASSET_NAMES.has(name)) return null;
    const file = new File(dir, `${name}.${row.extension}`);
    if (!row || !file.exists || file.size !== row.bytes) return null;
    sources.set(name, Object.freeze({ uri: file.uri }));
  }
  return Object.freeze({ themeId, sources });
}

function publish(pack: InstalledPack): void {
  installed.set(pack.themeId, pack);
  revision += 1;
  listeners.forEach((listener) => listener());
}

export async function primePremiumThemePackCache(): Promise<void> {
  if (diskPrimed) return;
  if (diskPrimePromise) return diskPrimePromise;
  diskPrimePromise = (async () => {
    for (const themeId of Object.freeze([
      'grad_full_olive', 'grad_full_ref_signal_lime', 'grad_full_ref_storm_violet',
      'grad_full_titanium', 'grad_full_horizon', 'grad_full_ref_gravity_blue',
    ] as const)) {
      try {
        const receipt = receiptFile(themeId);
        if (!receipt.exists) continue;
        const parsed = JSON.parse(await receipt.text()) as { schemaVersion?: unknown; version?: unknown; assets?: unknown };
        if (parsed.schemaVersion !== 'premium-theme-pack-receipt.v2' || parsed.version !== PACK_VERSION || !parsed.assets || typeof parsed.assets !== 'object') continue;
        const pack = installedSources(themeId, parsed.assets as Record<string, AssetManifestRow>);
        if (pack) publish(pack);
      } catch (error) {
        DebugLogger.error(`${LOG}:prime:${themeId}`, error instanceof Error ? error : new Error(String(error)), 'warning');
      }
    }
    diskPrimed = true;
  })().finally(() => { diskPrimePromise = null; });
  return diskPrimePromise;
}

async function fetchManifest(signal: AbortSignal): Promise<PackManifest | null> {
  const response = await fetch(objectUrl(`${OBJECT_PREFIX}/manifest.json`), { signal });
  if (!response.ok) return null;
  return validManifest(await response.json());
}

async function install(themeId: PremiumThemeId): Promise<boolean> {
  return withBackgroundNetworkLease(`premium-theme.${premiumThemeById(themeId)?.packId ?? 'unknown'}`, async (lease) => {
    const manifest = await fetchManifest(lease.signal);
    lease.assertCurrent();
    const packId = premiumThemeById(themeId)?.packId;
    const rows = packId ? manifest?.themes[packId]?.assets : null;
    if (!rows) return false;
    const dir = packDir(themeId);
    if (!dir.exists) dir.create({ intermediates: true });
    for (const [name, row] of Object.entries(rows)) {
      lease.assertCurrent();
      const destination = new File(dir, `${name}.${row.extension}.part`);
      const finalFile = new File(dir, `${name}.${row.extension}`);
      await File.downloadFileAsync(objectUrl(row.path), destination, { idempotent: true, headers: { Accept: row.extension === 'png' ? 'image/png' : 'image/webp' } });
      lease.assertCurrent();
      if ((destination.size ?? 0) !== row.bytes || await fileSha256(destination) !== row.sha256) {
        if (destination.exists) destination.delete();
        throw new Error(`premium_theme_asset_integrity:${name}`);
      }
      if (finalFile.exists) finalFile.delete();
      destination.move(finalFile);
    }
    lease.assertCurrent();
    const receipt = receiptFile(themeId);
    receipt.write(JSON.stringify({ schemaVersion: 'premium-theme-pack-receipt.v2', version: PACK_VERSION, assets: rows }));
    const pack = installedSources(themeId, rows);
    if (!pack) throw new Error('premium_theme_pack_install_incomplete');
    publish(pack);
    console.log(`${LOG} ready`, JSON.stringify({ themeId, assets: Object.keys(rows).length, reason: 'verified_download' }));
    return true;
  });
}

export async function ensurePremiumThemePack(themeId: PremiumThemeId, reason: 'near_unlock' | 'unlock' | 'selected'): Promise<boolean> {
  await primePremiumThemePackCache();
  if (installed.has(themeId)) return true;
  // Предзагрузка разрешена до открытия; выбор темы всё равно проверяет server entitlement.
  const current = inFlight.get(themeId);
  if (current) return current;
  const task = install(themeId).catch((error: unknown) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(`${LOG} load_failed`, JSON.stringify({ themeId, reason, error: error instanceof Error ? error.message : String(error), deferred: isInteractiveNetworkDeferredError(error) })); // guard-ok: dev-проверка причины отсутствующего пакета
    }
    if (!isInteractiveNetworkDeferredError(error)) DebugLogger.error(`${LOG}:${reason}:${themeId}`, error instanceof Error ? error : new Error(String(error)), 'warning');
    return false;
  }).finally(() => { inFlight.delete(themeId); });
  inFlight.set(themeId, task);
  return task;
}

export function setActivePremiumThemeArt(themeId: string, devPreview = false): void {
  activeThemeId = themeId;
  // Только dev-маршрут съёмки может показать ещё не заработанный pack. В store
  // build __DEV__=false, поэтому этот путь не расширяет право пользователя.
  // зачем (4 · ТЕМЫ 24.10): голый __DEV__ в тестах = ReferenceError и падение всего ThemeProvider (замок «смена темы» краснел); typeof-гард как по проекту
  allowLockedDevPreview = (typeof __DEV__ !== 'undefined' && __DEV__) && devPreview;
}
export function resolveActivePremiumThemeArt(name: string): ImageSourcePropType | null {
  if (!isPremiumThemeIdForRuntime(activeThemeId) || (!isPremiumThemeUnlocked(activeThemeId) && !allowLockedDevPreview)) return null;
  return installed.get(activeThemeId)?.sources.get(name) ?? null;
}
function isPremiumThemeIdForRuntime(value: string): value is PremiumThemeId { return premiumThemeById(value) !== null; }
export function subscribePremiumThemePackCache(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export function premiumThemePackRevision(): number { return revision; }

export const __premiumThemePackTestHooks = Object.freeze({ validManifest, assetNames: ASSET_NAMES, optionalAssetNames: OPTIONAL_ASSET_NAMES, objectUrl });

