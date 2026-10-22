// зачем (координатор 22.10: подключение «Сцены» в боевой хаб без второго чтения каталога; лист согласия не трогаем): сторож модели хаба, склонения имени собеседника
// и контракта подключения — флаг, прежняя шапка как запасной путь, нет сети/записи согласия в хуке и в обёртке.
import { readFileSync } from 'fs';

import { dialogsSceneWhoName, buildDialogsSceneCopy } from '../components/dialogs/scene/dialogs_scene_copy';
import { buildDialogsSceneHubModel, dialogsSceneWorldIcon, type DialogsSceneHubItem } from '../components/dialogs/scene/dialogs_scene_hub_model';

const read = (rel: string): string => readFileSync(rel, 'utf8').replace(/\r\n/g, '\n');

const items: readonly DialogsSceneHubItem[] = [
  { id: 'social_01', worldId: 'social', title: 'Поздороваться после знакомства', status: 'done' },
  { id: 'work_01', worldId: 'work', title: 'Представиться коллеге', status: 'available' },
  { id: 'travel_02', worldId: 'travel', title: 'Спросить код от двери', status: 'available' },
  { id: 'social_19', worldId: 'social', title: 'Урегулировать конфликт', status: 'locked' },
];
const uiCopy = (id: string) => (id === 'work_01'
  ? { objectiveLabels: { a: 'поздороваться', b: 'назвать себя', c: 'задать вопрос' }, personas: { marina: { displayName: 'Марина' } } }
  : null);

describe('Сцена Диалогов: модель хаба', () => {
  it('считает пройденные и всего, следующий — первый доступный в порядке каталога', () => {
    const m = buildDialogsSceneHubModel({ lang: 'ru', items, worldTitle: (w) => `мир:${w}`, uiCopy });
    expect(m.doneCount).toBe(1);
    expect(m.totalCount).toBe(4);
    expect(m.next?.id).toBe('work_01');
    expect(m.next?.personaId).toBe('marina');
    expect(m.next?.info).toMatchObject({ world: 'мир:work', worldIcon: 'briefcase-outline', who: 'Мариной', title: 'Представиться коллеге', goals: 3, goalsDone: null });
  });
  it('доступных нет — следующего нет, счётчики на месте', () => {
    const m = buildDialogsSceneHubModel({ lang: 'ru', items: items.map((i) => ({ ...i, status: 'done' as const })), worldTitle: (w) => w, uiCopy });
    expect(m.next).toBeNull();
    expect(m.doneCount).toBe(4);
  });
  it('нет снимка текстов: имя пустое, целей 0 — подпись «с …» и счёт целей не выдумываются', () => {
    const m = buildDialogsSceneHubModel({ lang: 'ru', items, worldTitle: (w) => w, uiCopy: () => null });
    expect(m.next?.info.who).toBe('');
    expect(m.next?.info.goals).toBe(0);
    const copy = buildDialogsSceneCopy({
      lang: 'ru', state: 'next', plus: false, dialog: m.next?.info ?? null, following: null, quotaRemaining: 20, quotaTotal: 30, resetDate: null, voicePerDay: null, doneCount: 1, totalCount: 4,
    });
    expect(copy.kicker).toBe('work');
    expect(copy.prog).toBeNull();
  });
  it('значки миров и неизвестный мир', () => {
    expect(dialogsSceneWorldIcon('travel')).toBe('airplane-outline');
    expect(dialogsSceneWorldIcon('???')).toBe('people-outline');
  });
});

describe('Сцена Диалогов: имя собеседника в «с …»', () => {
  it.each([
    ['ru', 'Мила', 'Милой'], ['ru', 'Марина', 'Мариной'], ['ru', 'Зоя', 'Зоей'], ['ru', 'Ира', 'Ирой'],
    ['ru', 'Денис', 'Денисом'], ['ru', 'Олег', 'Олегом'], ['ru', 'Сэм', 'Сэмом'], ['ru', 'Нико', 'Нико'],
    ['uk', 'Мила', 'Милою'], ['uk', 'Денис', 'Денисом'],
    ['pl', 'Mila', 'Milą'], ['pl', 'Denis', 'Denisem'],
    ['en', 'Mila', 'Mila'], ['tr', 'Mila', 'Mila'],
  ] as const)('%s: %s → %s', (lang, name, expected) => expect(dialogsSceneWhoName(lang, name)).toBe(expected));
});

describe('Сцена Диалогов: контракт подключения', () => {
  const home = read('app/ai_dialog_home.tsx');
  const hook = read('components/dialogs/scene/use_dialogs_scene_hub.ts');
  const hub = read('components/dialogs/scene/DialogsSceneHub.tsx');
  it('хаб берёт сцену только за флагом, прежняя шапка — запасной путь, безопасная зона без верха только при флаге', () => {
    expect(home).toMatch(/const scene = DIALOGS_SCENE_V2_ENABLED;/);
    expect(home).toMatch(/<DialogsSceneHub fallback=\{header\}/);
    expect(home).toMatch(/edges=\{scene \? \['left', 'right', 'bottom'\] : undefined\}/);
  });
  it('хук читает каталог из общего кэша клиента и не ходит в сервер сам', () => {
    expect(hook).toMatch(/peekDialogueV2Catalogue/);
    expect(hook).toMatch(/fetchReleasedDialogueV2Catalogue\(studyTarget, \{ awaitRefresh: true \}\)/);
    expect(hook).toMatch(/InteractionManager\.runAfterInteractions/);
    expect(hook).not.toMatch(/httpsCallable|getDoc|getDocs|firestore|fetchDialogueV2CatalogueFromNetwork/i);
  });
  it('согласие только читается: ни хук, ни обёртка его не записывают', () => {
    for (const src of [hook, hub]) expect(src).not.toMatch(/setAiDialogConsent|recordAiDialogConsent/);
    expect(hook).toMatch(/dayDone: peekDialogueV2DoneToday()/);
  });
  it('действия обёртки: лимит — premium_modal, остальное — брифинг следующего диалога', () => {
    expect(hub).toMatch(/pathname: '\/premium_modal'/);
    expect(hub).toMatch(/context: 'dialog_limit'/);
    expect(hub).toMatch(/pathname: '\/dialogue_v2_briefing'/);
    expect(hub).toMatch(/markDialogueV2OptimisticTap\('hub_tap'/);
    expect(hub).toMatch(/useStableSafeAreaInsets/);
    expect(hub).not.toMatch(/useSafeAreaInsets\(/);
  });
});
