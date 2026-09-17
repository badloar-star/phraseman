import fs from 'fs';
import path from 'path';

const sourcePath = path.resolve(__dirname, '../components/AiDialogBriefingScreen.tsx');
const routePath = path.resolve(__dirname, '../app/ai_dialog_briefing.tsx');
const dialogsTabPath = path.resolve(__dirname, '../components/DialogsTabContent.tsx');
const scenarioTilePath = path.resolve(__dirname, '../components/DialogScenarioTile.tsx');

describe('AiDialogBriefingScreen contract', () => {
  const source = () => fs.readFileSync(sourcePath, 'utf8');

  it('uses Russian briefing copy while retaining localized scenario fallback and reduced-motion support', () => {
    const content = source();

    expect(content).toContain("import { useReduceMotion } from '../hooks/use_reduce_motion';");
    expect(content).toContain("import { aiDialogBriefingBody } from '../app/ai_dialog_briefing_copy';");
    expect(content).toContain('aiDialogBriefingBody(scenario.id, lang)');
    expect(content).toContain('dialogScenarioGoal(scenario, lang)');
    expect(content).toContain('dialogScenarioNextStepHint(scenario, lang)');
    expect(content).toContain('reduceMotion ? undefined : FadeInDown');
  });

  it('keeps actions accessible and the briefing surface borderless and non-looping', () => {
    const content = source();

    expect(content).toContain('accessibilityRole="button"');
    expect(content).not.toContain('borderWidth');
    expect(content).not.toContain('borderColor');
    expect(content).not.toContain('withRepeat(');
  });

  it('does not render untranslated persona, setting, or objectives fields', () => {
    const content = source();

    expect(content).not.toMatch(/scenario\.(?:persona|setting)\b/);
    expect(content).not.toContain('scenarioObjectives(');
  });
});

describe('AI dialog briefing route contract', () => {
  const source = () => fs.readFileSync(routePath, 'utf8');

  it('fails closed for unavailable target content and unknown scenarios', () => {
    const content = source();

    expect(content).toContain('aiDialogContentAvailableForTarget(studyTarget)');
    expect(content).toContain('frenchAiDialogGateCopy(lang)');
    expect(content).toContain('getScenarioById(scenarioId)');
    expect(content).not.toContain("getScenarioById('coffee')");
    expect(content).not.toContain('ActivityIndicator');
  });

  it('marks the exact target and scenario before replacing into the AI-capable session', () => {
    const content = source();

    expect(content).toContain('markAiDialogIntroSeen(studyTarget, scenario.id)');
    expect(content).toContain("import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';");
    expect(content).toMatch(
      /markNextNavigationAsReplace\(\);\s*router\.replace\(\{\s*pathname: '\/ai_dialog_session',\s*params: \{ scenarioId: scenario\.id \},\s*\} as never\);/,
    );
  });

  it('uses safe back navigation with the lessons tab as its recovery fallback', () => {
    const content = source();

    expect(content).toContain("safeRouterBack(router, '/(tabs)/lessons' as never)");
    expect(content).not.toContain('router.back()');
  });
});

describe('AI dialog catalog scenario-feed contract', () => {
  const catalog = () => fs.readFileSync(dialogsTabPath, 'utf8');
  const tile = () => fs.readFileSync(scenarioTilePath, 'utf8');

  /**
   * зачем этот сторож ПЕРЕПИСАН (владелец 2026-09-17). Раньше он требовал
   * ровно то, что владелец назвал багом: автопропуск экрана-задания на
   * повторном входе (`peekAiDialogIntroSeen` + `hasSeenAiDialogIntro(...).then`
   * → `router.replace` в сессию). Со стороны это выглядело случайным: «кофе и
   * продуктовый показывают экран, а магазин одежды — нет» (кофе не пройден,
   * одежда пройдена).
   *
   * Тест охранял ОТМЕНЁННОЕ правило, поэтому чинится тест, а не код. Теперь он
   * сторожит новое правило: экран-задание видно ВСЕГДА, автопропуска нет.
   */
  it('always shows the briefing screen: no auto-skip into the session on repeat entry', () => {
    const content = catalog();
    const route = fs.readFileSync(routePath, 'utf8');

    expect(content).toContain("pathname: '/ai_dialog_briefing'");
    expect(content).toContain("forceBriefing: forceBriefing ? '1' : undefined");
    expect(content).toContain('scenarioId: scenario.id');

    // Автопропуска быть не должно ни в одной из двух его форм.
    expect(route).not.toContain('peekAiDialogIntroSeen');
    expect(route).not.toContain('hasSeenAiDialogIntro');
    // Каталог больше не греет кэш флага: решать по нему нечего.
    expect(content).not.toContain('hasSeenAiDialogIntro');

    // В сессию уводит ТОЛЬКО кнопка «Начать» (onStart), а не эффект.
    expect(route).toContain("pathname: '/ai_dialog_session'");
    expect(route).toContain('markAiDialogIntroSeen(studyTarget, scenario.id)');
    /**
     * ⛔ ЗАМОК СИНХРОННЫЙ — НИКАКОГО ОЖИДАНИЯ ПЕРЕД ПОКАЗОМ.
     *
     * зачем (владелец 2026-09-17: «ДИАЛОГИ НЕ ОТКРЫВАЮТСЯ» → «ОТКРЫВАЮТСЯ
     * ТОЛЬКО ПЕРВЫЕ ТРИ»). Асинхронная проверка премиума при любом молчании
     * читалась как «премиума нет»: платные сценарии уходили на пейвол, а на
     * холодном старте экран висел в «Готовим разговор…». Вердикт обязан быть
     * известен в первом кадре и из ТОГО ЖЕ источника, что у плиток каталога —
     * иначе плитка покажет открытым то, что экран закроет.
     */
    expect(route).toContain("useFeatureAccess('ai_dialog')");
    expect(route).toContain('isScenarioUnlockedForAccount(scenario.id, hasDialogAccess)');
    expect(route).not.toContain('accessGate');
    expect(route).not.toContain('resolveDialogScenarioAccess');
    // Спиннера ожидания на этом экране больше нет — ждать нечего.
    expect(route).not.toContain('ActivityIndicator');
  });

  /**
   * Прогрев перенесён РАНЬШЕ по пути пользователя (владелец 2026-09-17:
   * «чтобы не ждал 15 секунд после первой реплики»). Сторож держит обе новые
   * точки: раздел Диалогов и экран-задание. Платный тёплый инстанс при этом
   * НЕ заводится — minInstances: 0 охраняет свой сторож.
   */
  it('wakes the dialog instance on hub entry and on the briefing screen', () => {
    const content = catalog();
    const route = fs.readFileSync(routePath, 'utf8');

    for (const source of [content, route]) {
      expect(source).toContain('warmPremiumDialog()');
      expect(source).toContain('warmPremiumDialogStream()');
    }
  });

  it('keeps the normal destination decision behind the existing successful gates and lets long press force briefing', () => {
    const content = catalog();

    expect(content).toContain('const openScenarioDestination = useCallback');
    expect(content).toContain('const openCourseScenario = useCallback');
    expect(content).toContain('const openChallengeScenario = useCallback');
    expect(content).toContain('openScenarioDestination(scenario, forceBriefing)');
    expect(content).toContain('onLongPress: () => openCourseScenario(scenario, true)');
    expect(content).toContain('onLongPress: () => openChallengeScenario(scenario, true)');
    expect(content.match(/onLongPress=\{vm\.onLongPress\}/g)).toHaveLength(2);
    expect(content).toContain('delayLongPress={550}');
  });

  it('renders a concise borderless PressableScale tile with accessible long-press briefing and reduced-motion entrance', () => {
    const content = tile();

    expect(content).toContain("PressableScale } from './feedback/PressableScale';");
    expect(content).toContain('delay(Math.min(index, 10) * 40)');
    expect(content).toContain('reduceMotion ? undefined : FadeInDown');
    expect(content).toContain('delayLongPress={550}');
    expect(content).toContain('accessibilityHint');
    expect(content).toContain('statusLabel: string');
    expect(content).toContain('{statusLabel}');
    expect(catalog()).toContain('const accessibilityHint = locked');
    expect(catalog()).toContain('`${title}. ${levelChip}. ${statusLabel}`');
    expect(content).not.toContain('dialogScenarioGoal(');
    expect(content).not.toContain('borderWidth');
    expect(content).not.toContain('withRepeat(');
  });
});
