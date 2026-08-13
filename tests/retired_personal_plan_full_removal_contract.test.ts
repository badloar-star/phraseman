import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const exists = (relativePath: string): boolean => fs.existsSync(path.join(ROOT, relativePath));

function listFiles(relativeRoot: string): string[] {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else files.push(path.relative(ROOT, absolute).replaceAll(path.sep, '/'));
    }
  };
  visit(absoluteRoot);
  return files;
}

const OWNED_PATH = /(?:^|\/)(?:personal_plan|plan_content|plan_audio|plan_day|trainer_plan)(?:[^/]*)/i;
const ACTIVE_IDENTIFIER = /personal_plan|PersonalPlan|PERSONAL_PLAN|plan_content|PlanContent|trainer_plan/;
const RETIRED_STORAGE_ALLOWLIST = new Set([
  'app/+native-intent.tsx',
  'app/cloud_sync.ts',
]);

describe('retired Personal Plan and Route full removal', () => {
  test('removes every owned source, generator, test fixture, and bundled asset path', () => {
    const roots = [
      'app', 'components', 'constants', 'hooks', 'modules',
      'functions/src', 'functions/scripts', 'scripts',
      'assets/audio', 'assets/images',
    ];
    const owned = roots.flatMap(listFiles).filter((file) => OWNED_PATH.test(file));
    expect(owned).toEqual([]);
  });

  test('leaves no active runtime identifier outside legacy-link and account-wipe cleanup seams', () => {
    const roots = ['app', 'components', 'constants', 'hooks', 'modules', 'functions/src'];
    const offenders = roots
      .flatMap(listFiles)
      .filter((file) => /\.(?:ts|tsx|js|jsx)$/.test(file))
      .filter((file) => !/\.(?:spec|test)\./.test(file))
      .filter((file) => !RETIRED_STORAGE_ALLOWLIST.has(file))
      .filter((file) => ACTIVE_IDENTIFIER.test(read(file)));
    expect(offenders).toEqual([]);
  });

  test('removes the Route tab, root screens, feature gates, admin controls, and paywall promises', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    const layout = read('app/_layout.tsx');
    const featureGates = read('app/feature_gates.ts');
    const remoteFlags = read('app/remote_flags.ts');
    const paywallProof = read('components/paywall/PaywallProofCards.tsx');
    const admin = read('admin/v2/legacy.html');

    expect(lessons).not.toMatch(/Маршрут|personal_plan|plan_content/i);
    expect(layout).not.toMatch(/name=["']personal_plan|name=["']trainer_plan/i);
    expect(featureGates).not.toMatch(/personal_plan|plan_content/i);
    expect(remoteFlags).not.toMatch(/personal_plan|plan_content|onboarding_plan_only_enabled/i);
    expect(admin).not.toContain('onboarding_plan_only_enabled');
    expect(paywallProof).not.toMatch(/личный план|особистий план|plan personal|plano pessoal|kế hoạch cá nhân|rencana pribadi|kişisel plan|plan osobisty/i);
  });

  test('redirects retired deep links home and preserves independent learning surfaces', () => {
    const nativeIntent = read('app/+native-intent.tsx');
    expect(nativeIntent).toMatch(/personal_plan[\s\S]{0,180}return '\/home'/);

    for (const relativePath of [
      'app/lesson1.tsx',
      'app/trainer.tsx',
      'app/speech_recognition_module.ts',
      'app/course_pack_loader.ts',
      'functions/src/tournament_pool_publication.ts',
    ]) {
      expect(exists(relativePath)).toBe(true);
    }
  });
});
