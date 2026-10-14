import fs from 'fs';
import path from 'path';
import { EMPTY_OVERLAY_WANTS } from '../components/overlay_arbiter_core';

const ROOT = process.cwd();
const CODE_ROOTS = ['app', 'components', 'contexts', 'hooks'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

const INTENTIONAL_EMIT_ONLY_EVENTS = new Set([
  // User/owner review required before removal. These are documented in CLASS_REGISTRY_EVENTS_TOASTS.md.
  'bug_hunt_eligible_check',
  'lesson_replay_started',
  'season_pass_plus_changed',
  // зачем (04.10, разбор по git): сигнал завершения облачного восстановления — контракт загрузки
  // (boot_cloud_restore_contract, startup_cloud_identity_recovery). Единственный слушатель жил в
  // hooks/use-streak-freeze-active.ts, удалённом как хук без вызовов (14d724030).
  'cloud_profile_hydrated',
  // Слушателя не было никогда (f5a01076d): точка расширения после свежей личности при удалении
  // аккаунта (auth_provider, зона сессии 5), проверяется post_delete_fresh_identity_integration.
  'post_delete_identity_ready',
  // зачем (11.10, §CORE-0169): единственный слушатель жил в мёртвом subscribeUserAppMessages (нигде не подключался),
  // удалённом в b59868b5b по аудиту стоимости Firebase. Отправители остались; живой реакции не было и раньше.
  'app_messages_local_changed',
]);

const INTENTIONAL_DIRECT_EVENT_LISTENERS = new Set([
  'auth_provider_linked @ app/(tabs)/settings.tsx',
  'auth_provider_linked @ app/account_details.tsx',
  // зачем (11.10, Шпиль только ru/uk): замок вкладки пересчитывается при смене языка интерфейса в настройках
  // (LangContext шлёт APP_LANG_CHANGED через DeviceEventEmitter). Подписка одна на процесс (4b5162622, bc4b295ca).
  'app_lang_changed @ app/spire_tab_flag.ts',
  'energy_reload @ components/EnergyContext.tsx',
  'intro_full_access_changed @ app/(tabs)/settings.tsx',
  'loyalty_gift_changed @ app/(tabs)/settings.tsx',
  'premium_access_changed @ app/(tabs)/settings.tsx',
  'premium_access_changed @ components/EnergyContext.tsx',
  'premium_activated @ components/EnergyContext.tsx',
  'premium_deactivated @ components/EnergyContext.tsx',
  // зачем (04.10): энергия перечитывает лимиты при смене удалённого конфига (слушатель с 4792f3e59).
  'remote_config_changed @ components/EnergyContext.tsx',
  'remote_config_changed @ app/(tabs)/settings.tsx',
  'vip_activated @ app/(tabs)/settings.tsx',
  'vip_activated @ components/EnergyContext.tsx',
  'vip_deactivated @ components/EnergyContext.tsx',
  'xp_changed @ app/(tabs)/home.tsx',
]);

const INTENTIONAL_OVERLAY_KEYS_WITHOUT_LITERAL_OWNER = new Set([
  // Reserved welcome slot is documented in overlay_arbiter_core but has no mounted host yet.
  'onboardingWelcome',
  // Current runtime path converts shards_earned -> action_toast in GlobalShardsEarnedHost.
  // Keep this key documented until an owner approves removal from overlay_arbiter_core.
  'shardsEarned',
  // Retired or dynamically-owned surfaces remain in the arbiter contract until
  // an owner approves removing their compatibility keys.
  'arenaInvite',
  'arenaRoomConfirm',
  'coinsMigration',
  'compassBriefing',
  'matchFoundToast',
  'matchFoundToastScreen',
  // зачем (04.10, разбор по git): ключи снятых в 2.0 поверхностей — владельцы удалены, ключ ждёт решения
  // владельца об удалении из overlay_arbiter_core (в утреннем списке координатора).
  'arenaOpponentFound', // Арена удалена (D83), тост находки соперника — b3fe5ef75 → снят в efe19ae9d
  'coachToast', // хост коуч-тоста снят (b47eb0e01)
  'friendGift', // подарок другу снят в снимке 2.0 (efe19ae9d)
  'levelUp', // модалка уровня удалена, повышение играется на Главной (1b0ee9d52)
  'streakRevive', // восстановление серии убрано (D107, a8abc1d85)
  'welcomeBack', // ВРЕМЕННО (D193, 14.10): хук Авторизации hooks/use_welcome_back_moment.ts — следующим коммитом, он же снимет пометку
]);

type SourceFile = {
  rel: string;
  abs: string;
  text: string;
};

type Registry = {
  emits: Map<string, Set<string>>;
  listeners: Map<string, Set<string>>;
  directListeners: Map<string, Set<string>>;
  overlayOwners: Map<string, Set<string>>;
};

function normalizeRel(filePath: string): string {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function walkSourceFiles(dir: string, out: SourceFile[] = []): SourceFile[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = normalizeRel(abs);
    if (
      rel.includes('/node_modules/') ||
      rel.includes('/graphify-out/') ||
      rel.includes('/build/') ||
      rel.includes('/dist/')
    ) {
      continue;
    }
    if (entry.isDirectory()) {
      walkSourceFiles(abs, out);
      continue;
    }
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
    out.push({ rel, abs, text: fs.readFileSync(abs, 'utf8') });
  }
  return out;
}

function add(map: Map<string, Set<string>>, key: string, file: string): void {
  const files = map.get(key) ?? new Set<string>();
  files.add(file);
  map.set(key, files);
}

function extractLiteralCalls(files: SourceFile[]): Registry {
  const registry: Registry = {
    emits: new Map(),
    listeners: new Map(),
    directListeners: new Map(),
    overlayOwners: new Map(),
  };

  const patterns: Array<[keyof Registry, RegExp]> = [
    ['emits', /emitAppEvent\(\s*['"]([^'"]+)['"]/g],
    ['listeners', /onAppEvent\(\s*['"]([^'"]+)['"]/g],
    ['directListeners', /DeviceEventEmitter\.addListener\(\s*['"]([^'"]+)['"]/g],
    ['overlayOwners', /useOverlayVisible\(\s*['"]([^'"]+)['"]/g],
  ];

  for (const file of files) {
    for (const [kind, rx] of patterns) {
      rx.lastIndex = 0;
      for (const match of file.text.matchAll(rx)) {
        add(registry[kind], match[1], file.rel);
      }
    }

    // MatchFoundToast intentionally chooses one of two overlay keys at runtime.
    if (
      file.rel === 'components/MatchFoundToast.tsx' &&
      file.text.includes("host === 'screen' ? 'matchFoundToastScreen' : 'matchFoundToast'")
    ) {
      add(registry.overlayOwners, 'matchFoundToast', file.rel);
      add(registry.overlayOwners, 'matchFoundToastScreen', file.rel);
    }
  }

  return registry;
}

function sortedKeys(map: Map<string, Set<string>>): string[] {
  return [...map.keys()].sort();
}

function sortedFiles(map: Map<string, Set<string>>, key: string): string[] {
  return [...(map.get(key) ?? new Set<string>())].sort();
}

describe('app events and overlay registry guardrail', () => {
  const files = CODE_ROOTS.flatMap((root) => walkSourceFiles(path.join(ROOT, root)));
  const registry = extractLiteralCalls(files);

  it('keeps action_toast routed through the single global ActionToast host', () => {
    expect(sortedFiles(registry.listeners, 'action_toast')).toEqual(['components/ActionToast.tsx']);
    expect(registry.emits.get('action_toast')?.size ?? 0).toBeGreaterThan(30);
  });

  it('requires emitted events to have a listener, direct listener, or documented owner review', () => {
    const owned = new Set([
      ...sortedKeys(registry.listeners),
      ...sortedKeys(registry.directListeners),
      ...INTENTIONAL_EMIT_ONLY_EVENTS,
    ]);
    const unowned = sortedKeys(registry.emits).filter((event) => !owned.has(event));
    expect(unowned).toEqual([]);
  });

  it('keeps intentional emit-only events documented in the class registry', () => {
    const registryDoc = fs.readFileSync(path.join(ROOT, 'CLASS_REGISTRY_EVENTS_TOASTS.md'), 'utf8');
    for (const event of INTENTIONAL_EMIT_ONLY_EVENTS) {
      expect(registryDoc).toContain(`### Owner review: \`${event}\``);
    }
  });

  it('keeps direct DeviceEventEmitter listeners explicitly registered', () => {
    const actual = sortedKeys(registry.directListeners).flatMap((event) =>
      sortedFiles(registry.directListeners, event).map((file) => `${event} @ ${file}`),
    );
    const unregistered = actual.filter((entry) => !INTENTIONAL_DIRECT_EVENT_LISTENERS.has(entry));
    expect(unregistered).toEqual([]);
  });

  it('requires every overlay key to have an owner or documented legacy status', () => {
    const overlayKeys = Object.keys(EMPTY_OVERLAY_WANTS).sort();
    const unowned = overlayKeys.filter((key) =>
      !registry.overlayOwners.has(key) &&
      !INTENTIONAL_OVERLAY_KEYS_WITHOUT_LITERAL_OWNER.has(key),
    );
    expect(unowned).toEqual([]);
  });
});
