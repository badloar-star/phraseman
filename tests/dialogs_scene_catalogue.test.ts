// зачем (координатор 22.10: карточки каталога под «Сценой» по эталону dialogs-scene-concepts.html v2 — мир, название, цели, собеседник внутри, фильтр миров; без новых чтений; следующий диалог —
// только ОТКРЫТЫЙ, а если открытых нет — честное состояние без кнопки): сторож модели карточек, текстов без кнопки и подключения одним пропом без второго чтения каталога.
import { readFileSync } from 'fs';

import { buildDialogsSceneCopy } from '../components/dialogs/scene/dialogs_scene_copy';
import { buildDialogsSceneCards, buildDialogsSceneHubModel, type DialogsSceneCatalogueItem } from '../components/dialogs/scene/dialogs_scene_hub_model';
import { pickDialogsSceneState } from '../components/dialogs/scene/dialogs_scene_state';

const read = (rel: string): string => readFileSync(rel, 'utf8').replace(/\r\n/g, '\n');

const items: readonly DialogsSceneCatalogueItem[] = [
  { id: 'social_01', worldId: 'social', title: 'Поздороваться после знакомства', status: 'done', rankRequired: 1 },
  { id: 'work_01', worldId: 'work', title: 'Представиться коллеге', status: 'available', rankRequired: 1 },
  { id: 'travel_09', worldId: 'travel', title: 'Урегулировать задержку рейса', status: 'locked', rankRequired: 3 },
];
const ui = (id: string) => (id === 'work_01'
  ? { objectiveLabels: { a: 'поздороваться', b: 'назвать себя' }, personas: { marina: { displayName: 'Марина' } } }
  : id === 'social_01' ? { objectiveLabels: { a: 'начать с приветствия' }, personas: { mila: { displayName: 'Мила' } } } : null);
const args = { lang: 'ru' as const, items, worldTitle: (w: string) => `мир:${w}`, worldIcon: () => 'people-outline' as const, uiCopy: ui, lockedAtRank: (r: number) => `Откроется на ранге ${r}` };

describe('Карточки каталога под сценой', () => {
  const cards = buildDialogsSceneCards(args);
  it('одна карточка на диалог, в порядке каталога; статусы done / new / locked', () => {
    expect(cards.map((c) => [c.id, c.status])).toEqual([['social_01', 'done'], ['work_01', 'new'], ['travel_09', 'locked']]);
    expect(cards.map((c) => c.worldId)).toEqual(['social', 'work', 'travel']);
  });
  it('карточка — диалог: мир, название, «N целей · первая: …», собеседник внутри («с Мариной»)', () => {
    const c = cards[1]!;
    expect(c.world).toBe('мир:work');
    expect(c.title).toBe('Представиться коллеге');
    expect(c.goalsLine).toBe('2 цели · первая: поздороваться');
    expect([c.whoBefore, c.whoName, c.whoAfter]).toEqual(['с ', 'Мариной', '']);
    expect(c.initials).toEqual(['М']);
    expect(cards[0]!.goalsLine).toBe('1 цель · первая: начать с приветствия');
  });
  it('закрытый по рангу: своя строка ранга; нет снимка текстов — без выдуманных целей и собеседника', () => {
    const c = cards[2]!;
    expect(c.lockLine).toBe('Откроется на ранге 3');
    expect(c.goalsLine).toBe('');
    expect(c.whoName).toBe('');
    expect(c.initials).toEqual([]);
    expect(cards[1]!.lockLine).toBeNull();
  });
  it('в турецком имя без склонения, слово «ile» — после имени', () => {
    const tr = buildDialogsSceneCards({ ...args, lang: 'tr' });
    expect([tr[1]!.whoBefore, tr[1]!.whoName, tr[1]!.whoAfter]).toEqual(['', 'Марина', ' ile']);
  });
});

describe('Следующий диалог — только открытый; открытых нет — честное состояние без кнопки', () => {
  it('закрытый по рангу диалог не становится «следующим», даже если он раньше в списке', () => {
    const order = [items[2]!, items[1]!, items[0]!];
    const m = buildDialogsSceneHubModel({ lang: 'ru', items: order, worldTitle: (w) => w, uiCopy: ui });
    expect(m.next?.id).toBe('work_01');
  });
  it('открытых непройденных нет: next = null, всё пройденное/закрытое не ведёт никуда', () => {
    const m = buildDialogsSceneHubModel({ lang: 'ru', items: [items[0]!, items[2]!], worldTitle: (w) => w, uiCopy: ui });
    expect(m.next).toBeNull();
    expect(m.doneCount).toBe(1);
    expect(m.totalCount).toBe(2);
    // сцена остаётся «next» (всё не пройдено, но открытых нет) — и не обещает «Начать»
    const state = pickDialogsSceneState({ consent: true, offline: false, plus: false, quotaRemaining: 20, doneCount: m.doneCount, totalCount: m.totalCount, dayDone: false });
    expect(state.state).toBe('next');
    const copy = buildDialogsSceneCopy({ lang: 'ru', state: state.state, plus: false, dialog: null, following: null, quotaRemaining: 20, quotaTotal: 30, resetDate: null, voicePerDay: null, doneCount: m.doneCount, totalCount: m.totalCount });
    expect(copy.cta).toBeNull();
    expect(copy.round).toBeNull();
    expect(copy.title).toBe('Пока всё открытое пройдено');
    expect(copy.sub).toBe('Следующие диалоги откроются с новым рангом.');
  });
  it('то же для «первый диалог» и «мало ответов» без открытого диалога; день засчитан и следующего нет — без кнопки', () => {
    for (const state of ['first', 'low', 'next'] as const) {
      const c = buildDialogsSceneCopy({ lang: 'ru', state, plus: false, dialog: null, following: null, quotaRemaining: 2, quotaTotal: 30, resetDate: null, voicePerDay: null, doneCount: 0, totalCount: 5 });
      expect(c.cta).toBeNull();
    }
    const d = buildDialogsSceneCopy({ lang: 'ru', state: 'day_done', plus: false, dialog: null, following: null, quotaRemaining: 20, quotaTotal: 30, resetDate: null, voicePerDay: null, doneCount: 3, totalCount: 76 });
    expect(d.cta).toBeNull();
    expect(d.title).toBe('Сегодня разговор засчитан');
  });
  it('на всех 9 языках текст «нет открытых» не пуст и без подстановок', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      const c = buildDialogsSceneCopy({ lang, state: 'next', plus: false, dialog: null, following: null, quotaRemaining: 20, quotaTotal: 30, resetDate: null, voicePerDay: null, doneCount: 1, totalCount: 5 });
      expect(c.title.trim().length).toBeGreaterThan(0);
      expect(c.sub?.trim().length ?? 0).toBeGreaterThan(0);
      expect(c.title + (c.sub ?? '')).not.toMatch(/\{[a-z]+\}/);
    }
  });
});

describe('Подключение карточек: один проп, тот же источник каталога', () => {
  it('контейнер при sceneCatalogue отдаёт проекцию панели, иначе — прежняя секция', () => {
    const c = read('components/dialogs/DialogueV2CatalogueContainer.tsx');
    expect(c).toMatch(/sceneCatalogue = false/);
    expect(c).toMatch(/<DialogsSceneCatalogue worlds=\{projection\.worlds\} items=\{localizedItems\} lockedAtRank=\{copy\.lockedAtRank\} onPressItem=\{onPressItem\} \/>/);
    expect(c).toMatch(/<DialogueV2CatalogueSection\n\s+worlds=\{projection\.worlds\}/);
  });
  it('вкладка и хаб пробрасывают проп; панель не читает каталог сама', () => {
    expect(read('components/DialogsTabContent.tsx')).toMatch(/sceneCatalogue=\{sceneCatalogue\}/);
    expect(read('app/ai_dialog_home.tsx')).toMatch(/<DialogsTabContent headerSlot=\{headerSlot\} quotaInHeader sceneCatalogue=\{scene\} \/>/);
    const panel = read('components/dialogs/scene/DialogsSceneCatalogue.tsx');
    expect(panel).not.toMatch(/peekDialogueV2Catalogue|fetchReleasedDialogueV2Catalogue|httpsCallable|getDoc|firestore/i);
    expect(panel).toMatch(/DIALOGS_SCENE_CATALOGUE_PAGE = 8/);
  });
  it('сцена прячет кнопку, когда её нет', () => {
    expect(read('components/dialogs/scene/DialogsSceneStage.tsx')).toMatch(/\{copy\.cta !== null \? \(/);
  });
});
