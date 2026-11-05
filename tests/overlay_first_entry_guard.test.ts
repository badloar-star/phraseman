// Governance-ID: TG-50B98E144DEE
// Сторож (владелец 05.11: приветствие и шторка тура Пика попали на один кадр — «такое нельзя допускать»):
// каждое полноэкранное окно первого входа / праздника / момента в components/** и app/**, рисуемое нативным <Modal>, обязано
// занимать слот арбитра (useOverlayVisible) — само или через файл-хозяина, — либо стоять в явном списке долга с причиной.
// Список долга может только СЖИМАТЬСЯ: новое окно без арбитра этот тест роняет. Сработал — подключай окно к арбитру, а не дописывай список.
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) { if (!/(^|\/)(dev|__tests__|node_modules)$/.test(rel)) walk(rel, out); }
    else if (/\.tsx$/.test(entry.name)) out.push(rel);
  }
  return out;
}

// Окно рисует один файл, слот занимает другой (хозяин). Тест проверяет, что у хозяина есть useOverlayVisible с этим ключом.
const SLOT_OWNED_ELSEWHERE: Readonly<Record<string, Readonly<{ owner: string; key: string }>>> = {
  'components/spire/peak/PeakTour.tsx': { owner: 'components/spire/peak/PeakScreenV2.tsx', key: 'peakTour' },
  'components/home/home_moment_slots.tsx': { owner: 'modules/section_openings/use_section_opening_host.ts', key: 'sectionOpening' },
  'components/spire/moments/SpireWeekMomentHost.tsx': { owner: 'app/spire/use_spire_week_moment.ts', key: 'spireWeekMoment' },
  'components/PremiumCelebrationModal.tsx': { owner: 'app/(tabs)/home.tsx', key: 'premiumCelebration' },
  'components/lesson_moments/LessonPerfectHost.tsx': { owner: 'app/lesson_complete.tsx', key: 'lessonResultsSequence' },
};

// Долг: окна без арбитра. Каждое — с причиной и владельцем; убрать строку можно только подключив окно к арбитру.
const DEBT_WITHOUT_ARBITER: Readonly<Record<string, string>> = {
  'components/celebration/ReferralFriendRewardHybrid.tsx': 'хост referral_friend_reward_modal.tsx без арбитра; ключ referralWelcome есть — подключить (Вход)',
  'components/CleanOnboarding.tsx': 'сам онбординг: идёт до любых окон, арбитр ещё не нужен; приветствие после него — через арбитр',
  'components/dialog_moments/FirstDialogHost.tsx': 'момент первого диалога на экране итогов диалога; нужен ключ в арбитре (Моменты)',
  'components/FirstPurchaseSealCelebration.tsx': 'используется только из DevHub (dev-инструмент)',
  'components/IntroFullAccessModal.tsx': 'окно «72 часа» снято (D186); остался показ в dev-витрине',
  'components/level_up/LevelUpMintCeremony.tsx': 'церемония повышения ранга: хост Главной берёт слот levelUp, проверить тип прямого вызова (Моменты)',
  'components/spire/moments/SpireOutcomeMomentHost.tsx': 'моменты итога Пика без арбитра (Пик)',
  'components/spire/moments/SpirePositionMomentsHost.tsx': 'моменты позиции Пика без арбитра (Пик)',
  'components/spire/SpireTour.tsx': 'старый тур Пика (картинка); показывается только при выключенном экране Пика B',
  'components/streak/moments/StreakMilestoneHost.tsx': 'веха серии на итоговых экранах без арбитра (Моменты)',
};

const FIRST_ENTRY = /(tour|welcome|celebrat|moment|opening|reward|splash|congrat|gift|milestone|onboard|ceremony|intro|level)/i;
const MAX_DEBT = 10;

describe('сторож наложения окон: первый вход и праздники идут через арбитр', () => {
  const files = [...walk('components'), ...walk('app')].filter((f) => !/showcase|preview|Studio/i.test(f));
  const modalFiles = files.filter((f) => FIRST_ENTRY.test(f) && /<Modal\b/.test(read(f)));

  it('каждое такое окно: слот в самом файле, у хозяина или запись в долге', () => {
    const offenders = modalFiles.filter((f) => !/useOverlayVisible\(/.test(read(f)) && !SLOT_OWNED_ELSEWHERE[f] && !DEBT_WITHOUT_ARBITER[f]);
    expect(offenders).toEqual([]);
  });

  it('хозяин слота действительно занимает ключ', () => {
    for (const [file, { owner, key }] of Object.entries(SLOT_OWNED_ELSEWHERE)) {
      expect([file, new RegExp(`useOverlayVisible\\(\\s*'${key}'`).test(read(owner))]).toEqual([file, true]);
    }
  });

  it('список долга не растёт и не содержит устаревших строк', () => {
    const present = new Set(modalFiles);
    const stale = Object.keys(DEBT_WITHOUT_ARBITER).filter((f) => !present.has(f) || /useOverlayVisible\(/.test(read(f)));
    expect(stale).toEqual([]);
    expect(Object.keys(DEBT_WITHOUT_ARBITER).length).toBeLessThanOrEqual(MAX_DEBT);
  });

  it('тур Пика стоит в очереди после открытия раздела и до праздников', async () => {
    const { OVERLAY_PRIORITY } = await import('../components/overlay_arbiter_core');
    const order = OVERLAY_PRIORITY;
    expect(order.indexOf('onboardingWelcome')).toBeLessThan(order.indexOf('sectionOpening'));
    expect(order.indexOf('sectionOpening')).toBeLessThan(order.indexOf('peakTour'));
    expect(order.indexOf('peakTour')).toBeLessThan(order.indexOf('levelUp'));
    expect(order.indexOf('peakTour')).toBeLessThan(order.indexOf('premiumCelebration'));
  });

  it('превью приветствия выключает тур Пика', () => {
    expect(read('app/dev_spire_preview.tsx')).toMatch(/setPeakTourDevOff\(params\.tour === 'off' \|\| params\.state === 'welcome'\)/);
  });
});
