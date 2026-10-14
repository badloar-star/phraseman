// зачем (координатор 14.10, 🔴 потеря денег; журнал Сверки 19:43/19:44): «Получить Plus» в окне «Недостаточно энергии» в Диалогах закрывал
// окно и НЕ открывал пейвол. Окно откладывает открытие пейвола до своего закрытия, а экран уходил назад вместе с окном — таймер
// отменялся очисткой эффекта. Тот же класс — Learning V2 и Карточки. Сторож держит одно правило для КАЖДОГО входа «энергия → Plus»:
// окно, размонтированное с неотправленным открытием, всё равно открывает пейвол; Диалоги остаются на брифинге.
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const modal = read('components/NoEnergyModal.tsx');

function walk(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) return walk(rel);
    return /\.tsx$/.test(e.name) ? [rel] : [];
  });
}

describe('No energy → Plus always reaches the paywall', () => {
  it('the window rescues a pending paywall open when its screen unmounts', () => {
    const start = modal.indexOf('useEffect(() => () => {');
    expect(start).toBeGreaterThan(-1);
    const body = modal.slice(start, modal.indexOf('}, []);', start));
    expect(body).toContain('pendingPremiumContextRef.current');
    expect(body).toContain('pendingPremiumContextRef.current = null;');
    expect(body).toMatch(/globalRouter\.push\(\{ pathname: '\/premium_modal', params: \{ context: ctx, source: 'no_energy_modal' \} \}/);
    expect(body).toContain('[NO-ENERGY-PLUS] unmount_with_pending');
    expect(body).toContain('[NO-ENERGY-PLUS] unmount_rescue push failed');
  });

  it('the global router comes from expo-router (works after the screen is gone)', () => {
    expect(modal).toMatch(/import \{ router as globalRouter, useRouter \} from 'expo-router';/);
  });

  it('logs the tap with the handler that closes the window', () => {
    expect(modal).toContain('[NO-ENERGY-PLUS] tap ctx=');
    expect(modal).toContain("handler=${onBeforeOpenPremium ? 'onBeforeOpenPremium' : 'onClose'}");
  });

  it('flush clears the pending open before pushing (no double paywall with the rescue)', () => {
    const start = modal.indexOf('const flushPremiumPush = useCallback(');
    const body = modal.slice(start, modal.indexOf('}, [router, variant]);', start));
    expect(body.indexOf('pendingPremiumContextRef.current = null;')).toBeLessThan(body.indexOf('router.push('));
  });

  it('Dialogs keep the person on the briefing: Plus closes only the window', () => {
    const briefing = read('app/dialogue_v2_briefing.tsx');
    expect(briefing).toMatch(/<NoEnergyModal variant="dialogs"[^>]*onBeforeOpenPremium=\{\(\) => setNoEnergy\(false\)\}/);
  });

  it('every entry that leaves its screen on close is covered (Learning V2, Cards, Dialogs, lessons)', () => {
    const entries = ['app', 'components', 'modules']
      .flatMap(walk)
      .filter((f) => f !== 'components/NoEnergyModal.tsx' && /<NoEnergyModal\b/.test(read(f)));
    // Известные входы, где onClose уводит с экрана: страховка окна закрывает их все.
    const leaving = ['app/learning-v2/session/[id].tsx', 'app/flashcards_blitz_session.tsx', 'app/flashcards_recall_session.tsx', 'app/flashcards_speaking_session.tsx', 'app/dialogue_v2_briefing.tsx'];
    for (const f of leaving) expect(entries).toContain(f);
    // Страховка живёт в самом окне — значит покрыт любой вход, в том числе будущий.
    expect(modal).toContain('unmount_with_pending');
  });
});
