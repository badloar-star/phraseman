import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
const premiumModalSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'premium_modal.tsx'), 'utf8');
const languageWelcomeSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'language_welcome.tsx'), 'utf8');

describe('root layout startup navigation contract', () => {
  it('mounts the root stack on first render and keeps startup states as overlays', () => {
    expect(source).not.toMatch(/if\s*\(!ready\)\s*\{\s*return\s*\(/);
    expect(source).not.toMatch(/if\s*\(isBanned\)\s*\{\s*return\s*\(/);
    expect(source).toContain('const startupSplashVisible = !fontsReady || !ready');
    expect(source).toContain('|| (!effectiveShowOnboarding && !isBanned && (!firstContentReady || !homeScreenReady))');
    // зачем (PM-220): форма таймера изменилась (колбэк с bootMark), но правило то же — у флага
    // firstContentReady есть потолок FIRST_CONTENT_READY_FALLBACK_MS, который его выставляет.
    // зачем (05.10): в теле таймера теперь bootMark с объектом и отметка времени — шаблон допускает их, потолок тот же.
    expect(source).toMatch(/setTimeout\(\(\) => \{(?:(?!setTimeout\()[\s\S])*?setFirstContentReady\(true\);\s*\}, FIRST_CONTENT_READY_FALLBACK_MS\)/);
    expect(source.indexOf('<Stack')).toBeGreaterThan(-1);
    expect(source.indexOf('<Stack')).toBeLessThan(
      source.indexOf('<StartupSplashHold visible={startupSplashVisible}'),
    );
  });

  // зачем (владелец, 2026-09-21: «вход ДО 1 СЕКУНДЫ, мгновенно на 100%»):
  // КАЖДЫЙ флаг гейта сплеша обязан иметь потолок времени. Баг 2026-09-21:
  // homeScreenReady был единственным без потолка и ждал чанк Главной (5872
  // строки) бесконечно — поэтому прошлые починки, ставившие потолки соседям,
  // не давали эффекта. Этот сторож охраняет ПРАВИЛО, а не конкретные числа:
  // менять значения можно, убирать потолок или выходить за секунду — нельзя.
  it('каждый флаг гейта сплеша имеет потолок, и вход укладывается в 1 секунду', () => {
    const readMs = (name: string): number => {
      const match = source.match(new RegExp(`const ${name} = ([\\d_]+);`));
      expect(match).toBeTruthy();
      return Number(match![1].replace(/_/g, ''));
    };

    // Потолок обязан существовать у каждого из флагов.
    const bootstrapMs = readMs('BOOTSTRAP_READY_DEADLINE_MS');
    const firstContentMs = readMs('FIRST_CONTENT_READY_FALLBACK_MS');
    const homeScreenMs = readMs('HOME_SCREEN_READY_FALLBACK_MS');

    // homeScreenReady обязан иметь свой fallback — тот самый пропущенный флаг.
    expect(source).toContain('setHomeScreenReady(true);');
    expect(source).toContain('}, HOME_SCREEN_READY_FALLBACK_MS);');

    // Потолки СКЛАДЫВАЮТСЯ: сплеш ждёт ready, затем первый кадр и чанк Главной
    // (последние два идут параллельно, поэтому берём максимум из них).
    const worstCaseMs = bootstrapMs + Math.max(firstContentMs, homeScreenMs);
    expect(worstCaseMs).toBeLessThanOrEqual(1600);
  });

  it('defers premium dispatcher replace navigation until after the root mount settles', () => {
    expect(premiumModalSource).toContain('useRootNavigationState');
    expect(premiumModalSource).toContain('scheduleAfterRootNavigationReady');
    expect(premiumModalSource).toContain('InteractionManager.runAfterInteractions');
    expect(premiumModalSource).not.toContain('useLayoutEffect');

    const manageStart = premiumModalSource.indexOf('if (!isManageContext) return;');
    expect(manageStart).toBeGreaterThan(-1);
    const manageBlock = premiumModalSource.slice(manageStart, manageStart + 350);
    expect(manageBlock).toContain('scheduleAfterRootNavigationReady');
    expect(manageBlock).toContain('replaceToPaywall(params, router)');
  });

  it('defers the language welcome deep-link gate until after the root mount settles', () => {
    expect(languageWelcomeSource).toContain('useRootNavigationState');

    // зачем (PM-220): якорь — сам гейт, а не слово в комментарии, которое переписывают.
    const gateStart = languageWelcomeSource.indexOf('if (!rootNavReady) return;') - 200;
    expect(languageWelcomeSource.indexOf('if (!rootNavReady) return;')).toBeGreaterThan(-1);
    const gateBlock = languageWelcomeSource.slice(Math.max(0, gateStart), Math.max(0, gateStart) + 1600);
    expect(gateBlock).toContain('if (!rootNavReady) return;');
    expect(gateBlock).toContain('scheduleAfterRootNavigationReady(() => {');
    // зачем (PM-220): пейвола в этом гейте больше нет (D115/владелец 30.09), поэтому метки
    // markNextNavigationAsReplace тоже нет. Правило осталось: переход назад выполняется ТОЛЬКО
    // внутри отложенного колбэка, а не сразу в эффекте.
    expect(gateBlock).not.toContain('markNextNavigationAsReplace');
    const scheduledAt = gateBlock.indexOf('scheduleAfterRootNavigationReady(() => {');
    expect(gateBlock.indexOf('if (!cancelled) goBackSafely();')).toBeGreaterThan(scheduledAt);
  });
});
