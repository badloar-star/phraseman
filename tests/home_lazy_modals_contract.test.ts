import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeEol } from './helpers/read_source';

// зачем (координатор 05.10, пакет 05:26: [JS-STALL] 1,5 с на вычислении чанка Главной): закрытые окна и редкие модули
// не вычисляются вместе с Главной. Окна — ленивые, в своей границе Suspense (иначе приостановка погасит весь экран),
// монтируются после первого открытия; модули прогреваются после первого кадра. Вид первого кадра не меняется.
const home = normalizeEol(readFileSync(join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8'));

const LAZY_MODALS: readonly [string, string][] = [
  ['PremiumCelebrationModal', '../../components/PremiumCelebrationModal'],
  ['VipCelebrationModal', '../../components/VipCelebrationModal'],
  ['SurveySheetModal', '../../components/survey/SurveySheetModal'],
  ['SavedCardsFlight', '../../components/SavedCardsFlight'],
  ['PlayerProfileModal', '../../components/PlayerProfileModal'],
  ['FeatureIntroEntry', '../../components/feature_intro/FeatureIntroEntry'],
];

const RARE_MODULES = ['../achievements', '../mistake_hub_advice', '../lingman_youtube'];

describe('Home: closed modals and rare modules are not evaluated with the Home chunk', () => {
  it.each(LAZY_MODALS)('%s is lazy, has no static value import and renders inside its own Suspense', (name, path) => {
    expect(home).toContain(`const load${name} = () => import('${path}');`);
    expect(home).toContain(`const ${name} = lazy(load${name});`);
    expect(home).not.toMatch(new RegExp(`^import (?!type )[^;]*from '${path.replace(/[./]/g, '\$&')}';`, 'm'));
    const tag = home.indexOf(`<${name}`);
    expect(tag).toBeGreaterThan(-1);
    expect(home.slice(Math.max(0, tag - 80), tag)).toMatch(/<Suspense fallback=\{null\}>\s*$/);
  });

  it.each(RARE_MODULES)('%s is only imported dynamically or as a type', (path) => {
    expect(home).not.toMatch(new RegExp(`^import (?!type )[^;]*from '${path.replace(/[./]/g, '\$&')}';`, 'm'));
    expect(home).toContain(`import('${path}')`);
  });

  it('closed modals mount only after their first open, and modules are prewarmed after the first Home frame', () => {
    expect(home).toContain('function useMountedAfterFirstOpen(open: boolean): boolean {');
    for (const flag of ['premiumCelebrationMounted', 'vipCelebrationMounted', 'profileModalMounted', 'profileIntroMounted', 'savedCardsFlightMounted']) {
      expect(home).toContain(`const ${flag} = useMountedAfterFirstOpen(`);
      expect(home).toContain(`{${flag} ? (<Suspense fallback={null}>`);
    }
    expect(home).toContain("useEffect(() => runAfterHomeFirstFrame('home_lazy_modals_prewarm', prewarmHomeDeferredModules), []);");
    expect(home).toMatch(/\.catch\(\(error: unknown\) => \{\s*console\.warn\('\[HOME-LAZY\] prewarm:failed/);
  });
});
