// зачем (владелец 21.10 «и так же диалоги»; координатор: вариант A, номер состояния в эталоне dialogs-scene-states.html = приоритет): сторож «Сцены» «Диалогов» —
// таблица приоритетов, тексты на 9 языках, читаемость текста на сцене во ВСЕХ темах и оформлениях, подмена героя одной константой, флаг и защита маршрута превью.
import { readFileSync } from 'fs';

import { LIQUID_GLASS_LEVEL_INTENSITY } from '../constants/liquidGlassThemeIntensity';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import {
  DIALOGS_SCENE_COPY, buildDialogsSceneCopy, dialogsSceneGoalsDoneLabel, dialogsSceneGoalsLabel, dialogsSceneRemainingLabel, dialogsSceneText,
  type DialogsSceneCopyInput,
} from '../components/dialogs/scene/dialogs_scene_copy';
import {
  DIALOGS_SCENE_LOW_QUOTA_MAX, DIALOGS_SCENE_STATES, dialogsSceneMeterUsed, pickDialogsSceneState, type DialogsSceneInput,
} from '../components/dialogs/scene/dialogs_scene_state';
import { DIALOGS_SCENE_MIN_TEXT_CONTRAST, dialogsSceneColors, dialogsSceneContrast } from '../components/dialogs/scene/dialogs_scene_tokens';
import {
  DIALOGS_SCENE_HERO_KIND, dialogsScenePersonFile, dialogsSceneItemFile, resolveDialogsSceneArt,
} from '../components/dialogs/scene/dialogs_scene_art';
import {
  DIALOGS_SCENE_PREVIEW_QUOTA_TOTAL, DIALOGS_SCENE_PREVIEW_STATES, dialogsScenePreviewCards, dialogsScenePreviewSetup, isDialogsScenePreviewState,
} from '../components/dialogs/scene/dialogs_scene_preview_fixtures';

const read = (rel: string): string => readFileSync(rel, 'utf8').replace(/\r\n/g, '\n');

const base: DialogsSceneInput = { consent: true, offline: false, plus: false, quotaRemaining: 28, doneCount: 12, totalCount: 76, dayDone: false };
const pick = (o: Partial<DialogsSceneInput>) => pickDialogsSceneState({ ...base, ...o });
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('Сцена Диалогов: таблица приоритетов (номер в эталоне = приоритет)', () => {
  it('порядок состояний совпадает с таблицей эталона', () => {
    expect([...DIALOGS_SCENE_STATES]).toEqual(['consent', 'offline', 'limit', 'first', 'low', 'all_done', 'day_done', 'next']);
  });
  it('обычный день — «следующий диалог»', () => expect(pick({}).state).toBe('next'));
  it('1 · нет согласия бьёт всё остальное', () => expect(pick({ consent: false, offline: true, quotaRemaining: 0, doneCount: 0 }).state).toBe('consent'));
  it('неизвестное согласие не делает «нет согласия»', () => expect(pick({ consent: null }).state).toBe('next'));
  it('2 · нет сети раньше лимита', () => expect(pick({ offline: true, quotaRemaining: 0 }).state).toBe('offline'));
  it('3 · лимит Free раньше «первого» и «мало»', () => expect(pick({ quotaRemaining: 0, doneCount: 0 }).state).toBe('limit'));
  it('у Plus лимита и «мало» не бывает', () => {
    expect(pick({ plus: true, quotaRemaining: 0 }).state).toBe('next');
    expect(pick({ plus: true, quotaRemaining: 2 }).state).toBe('next');
  });
  it('остаток неизвестен — ни «лимит», ни «мало» вслепую', () => expect(pick({ quotaRemaining: null }).state).toBe('next'));
  it('4 · первый диалог раньше «мало»', () => expect(pick({ doneCount: 0, quotaRemaining: 2 }).state).toBe('first'));
  it('число пройденных неизвестно — не «первый»', () => expect(pick({ doneCount: null }).state).toBe('next'));
  it('5 · мало ответов: граница включает порог', () => {
    expect(pick({ quotaRemaining: DIALOGS_SCENE_LOW_QUOTA_MAX }).state).toBe('low');
    expect(pick({ quotaRemaining: DIALOGS_SCENE_LOW_QUOTA_MAX + 1 }).state).toBe('next');
  });
  it('6 · все диалоги пройдены раньше «сегодня засчитан»', () => expect(pick({ doneCount: 76, totalCount: 76, dayDone: true }).state).toBe('all_done'));
  it('пустой каталог не считается «всё пройдено»', () => expect(pick({ doneCount: 0, totalCount: 0 }).state).toBe('first'));
  it('7 · диалог засчитан сегодня', () => expect(pick({ dayDone: true }).state).toBe('day_done'));
  it('причина решения называет значения, а не голое true/false', () => {
    expect(pick({ quotaRemaining: 2 }).reason).toContain('quotaRemaining=2');
    expect(pick({}).reason).toContain('quotaRemaining=28');
  });
  it('шкала ответов: 30 из 30 — 10 делений, осталось 3 — 9, нет данных — 0', () => {
    expect(dialogsSceneMeterUsed(0, 30)).toBe(10);
    expect(dialogsSceneMeterUsed(3, 30)).toBe(9);
    expect(dialogsSceneMeterUsed(null, 30)).toBe(0);
    expect(dialogsSceneMeterUsed(40, 30)).toBe(0);
  });
});

describe('Сцена Диалогов: тексты', () => {
  const placeholders = (s: string) => [...s.matchAll(/\{[a-z]+\}/g)].map((m) => m[0]).sort().join(',');
  it('все ключи на 9 языках, подстановки одинаковы', () => {
    for (const [key, nine] of Object.entries(DIALOGS_SCENE_COPY)) {
      expect(nine).toHaveLength(9);
      for (const text of nine) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(placeholders(text)).toBe(placeholders(nine[0]));
      }
      expect(key.length).toBeGreaterThan(0);
    }
  });
  it('склонения: цели, «из N целей», остаток ответов', () => {
    expect(dialogsSceneGoalsLabel('ru', 1)).toBe('1 цель');
    expect(dialogsSceneGoalsLabel('ru', 3)).toBe('3 цели');
    expect(dialogsSceneGoalsLabel('ru', 6)).toBe('6 целей');
    expect(dialogsSceneGoalsLabel('ru', 11)).toBe('11 целей');
    expect(dialogsSceneGoalsLabel('ru', 21)).toBe('21 цель');
    expect(dialogsSceneGoalsDoneLabel('ru', 2, 6)).toBe('2 из 6 целей');
    expect(dialogsSceneGoalsDoneLabel('ru', 0, 1)).toBe('0 из 1 цели');
    expect(dialogsSceneGoalsLabel('en', 6)).toBe('6 goals');
    expect(dialogsSceneRemainingLabel('ru', 3)).toBe('Осталось 3 ответа в этом месяце');
    expect(dialogsSceneRemainingLabel('ru', 1)).toBe('Остался 1 ответ в этом месяце');
    expect(dialogsSceneRemainingLabel('ru', 5)).toBe('Осталось 5 ответов в этом месяце');
  });

  const dialog = { world: 'Общение', worldIcon: 'people-outline' as const, who: 'Милой', title: 'Поздороваться после знакомства', goals: 6, goalsDone: null };
  const following = { world: 'Поездки', worldIcon: 'airplane-outline' as const, who: 'Нико', title: 'Спросить код от двери', goals: 6, goalsDone: null };
  const copyFor = (state: DialogsSceneCopyInput['state'], o: Partial<DialogsSceneCopyInput> = {}) => buildDialogsSceneCopy({
    lang: 'ru', state, plus: false, dialog, following, quotaRemaining: 28, quotaTotal: 30, resetDate: new Date(2026, 10, 1), voicePerDay: 3, doneCount: 12, totalCount: 76, ...o,
  });
  it('русские тексты — дословно из эталона', () => {
    expect(copyFor('consent').title).toBe('Разговоры с персонажами');
    expect(copyFor('consent').cta).toBe('Включить AI-диалоги');
    expect(copyFor('offline').title).toBe('Диалоги недоступны');
    expect(copyFor('offline').kicker).toBe('Продолжить · Общение');
    expect(copyFor('offline').offlineLine?.bold).toBe('Нет сети.');
    expect(copyFor('limit').title).toBe('Ответы месяца закончились — продолжи с Plus');
    expect(copyFor('limit').prog).toBe('30 из 30 ответов · голосом 3 раза в день');
    expect(copyFor('limit').cta).toBe('Plus снимает лимит');
    expect(copyFor('first').title).toBe('Начни первый разговор');
    expect(copyFor('first').prog).toBe('Поздороваться после знакомства · 6 целей');
    expect(copyFor('low', { quotaRemaining: 3 }).prog).toBe('Осталось 3 ответа в этом месяце');
    expect(copyFor('all_done', { doneCount: 76, totalCount: 76 }).kicker).toBe('76 из 76');
    expect(copyFor('all_done').title).toBe('Все диалоги пройдены');
    expect(copyFor('day_done').kicker).toBe('«Потренировать диалог» · 1/1');
    expect(copyFor('day_done').prog).toBe('Следующий: Спросить код от двери · с Нико');
    expect(copyFor('next').kicker).toBe('Общение · с Милой');
    expect(copyFor('next').prog).toBe('6 целей');
    expect(copyFor('next').cta).toBe('Начать');
  });
  it('начатый диалог: «Продолжить» и «2 из 6 целей» с полоской', () => {
    const c = copyFor('next', { dialog: { ...dialog, goalsDone: 2 } });
    expect(c.cta).toBe('Продолжить');
    expect(c.prog).toBe('2 из 6 целей');
    expect(c.bar).toBeCloseTo(2 / 6, 5);
  });
  it('пилюля остатка: Free «28 из 30», Plus «Без лимита», неизвестный остаток — без пилюли', () => {
    expect(copyFor('next').quota).toEqual({ label: '28 из 30', unlimited: false });
    expect(copyFor('next', { plus: true }).quota).toEqual({ label: 'Без лимита', unlimited: true });
    expect(copyFor('next', { quotaRemaining: null }).quota).toBeNull();
  });
  it('все восемь состояний собираются на всех 9 языках: заголовок и кнопка не пусты, подстановки закрыты', () => {
    for (const lang of LANGS) {
      for (const state of DIALOGS_SCENE_STATES) {
        const c = buildDialogsSceneCopy({ lang, state, plus: false, dialog, following, quotaRemaining: state === 'limit' ? 0 : 3, quotaTotal: 30, resetDate: null, voicePerDay: 3, doneCount: 12, totalCount: 76 });
        for (const text of [c.title, c.cta, c.kicker, c.sub, c.prog].filter((x): x is string => x !== null)) {
          expect(text.trim().length).toBeGreaterThan(0);
          expect(text).not.toMatch(/\{[a-z]+\}/);
        }
      }
    }
  });
  it('без даты обновления — «со следующего месяца», подстановка не остаётся', () => {
    expect(copyFor('limit', { resetDate: null }).kicker).toBe('Новые ответы — со следующего месяца');
    expect(dialogsSceneText('en', 'limitKickNoDate')).toBe('New replies next month');
  });
});

describe('Сцена Диалогов: читаемость на сцене во всех темах', () => {
  const accent = LIQUID_GLASS_LEVEL_INTENSITY.accent;
  const cases = LIQUID_GLASS_THEME_IDS.flatMap((id) => (['dark', 'light'] as const).map((appearance) => [id, appearance] as const));
  it('тем не меньше 23', () => expect(LIQUID_GLASS_THEME_IDS.length).toBeGreaterThanOrEqual(23));
  it.each(cases)('%s / %s: текст и вторичный текст ≥ 4,5 на сцене, стык со сценой виден', (id, appearance) => {
    const tokens = liquidGlassTokens(id, { appearance, intensity: accent });
    const colors = dialogsSceneColors(tokens);
    const c = dialogsSceneContrast(tokens, colors);
    expect(c.text).toBeGreaterThanOrEqual(DIALOGS_SCENE_MIN_TEXT_CONTRAST);
    expect(c.secondary).toBeGreaterThanOrEqual(DIALOGS_SCENE_MIN_TEXT_CONTRAST);
    // эталон: стык сцены и панели в тёмном ≥ 1,34, в светлых ≈ 1,2
    expect(c.seam).toBeGreaterThanOrEqual(appearance === 'dark' ? 1.3 : 1.1);
    expect(colors.isLight).toBe(appearance === 'light');
    expect(colors.glowBottom === null).toBe(appearance === 'dark');
    expect(colors.scrim === null).toBe(appearance === 'dark');
  });
});

describe('Сцена Диалогов: герой', () => {
  it('по умолчанию герой — предмет (рекомендация), файл dialogs_scene_<состояние>', () => {
    expect(DIALOGS_SCENE_HERO_KIND).toBe('item');
    expect(dialogsSceneItemFile('limit')).toBe('dialogs_scene_limit');
  });
  it('файл собеседника — dialogs_scene_person_<id>; чужие символы отвергаются', () => {
    expect(dialogsScenePersonFile('Mila')).toBe('dialogs_scene_person_mila');
    expect(dialogsScenePersonFile('../x')).toBeNull();
    expect(dialogsScenePersonFile(null)).toBeNull();
  });
  it('картинка находится для каждого состояния в обеих яркостях (заглушка, пока нет в реестре)', () => {
    for (const state of DIALOGS_SCENE_STATES) {
      for (const brightness of ['dark', 'light'] as const) {
        const art = resolveDialogsSceneArt(state, brightness);
        expect(art.name.length).toBeGreaterThan(0);
        expect(art.origin.length).toBeGreaterThan(0);
        expect(art.kind).toBe('item');
      }
    }
  });
  it('выбор собеседника героем не ломает сцену: нет файла собеседника — идёт картинка состояния', () => {
    const art = resolveDialogsSceneArt('next', 'dark', 'mila', 'interlocutor');
    expect(art.kind).toBe('item');
    expect(art.name.length).toBeGreaterThan(0);
  });
});

describe('Сцена Диалогов: превью и защита релиза', () => {
  it('каждое состояние превью даёт именно своё состояние настоящей функции (и у Free, и в приоритетах)', () => {
    for (const state of DIALOGS_SCENE_PREVIEW_STATES) {
      expect(isDialogsScenePreviewState(state)).toBe(true);
      const { input } = dialogsScenePreviewSetup(state);
      expect(pickDialogsSceneState(input).state).toBe(state);
    }
    expect(isDialogsScenePreviewState('hub')).toBe(false);
  });
  it('у Plus лимит и «мало» превращаются в обычное состояние, пилюля — «Без лимита»', () => {
    expect(pickDialogsSceneState(dialogsScenePreviewSetup('limit', true).input).state).toBe('next');
    expect(pickDialogsSceneState(dialogsScenePreviewSetup('low', true).input).state).toBe('next');
    expect(pickDialogsSceneState(dialogsScenePreviewSetup('consent', true).input).state).toBe('consent');
  });
  it('карточки панели: четыре диалога, один пройден; собеседник внутри карточки', () => {
    const cards = dialogsScenePreviewCards('ru');
    expect(cards).toHaveLength(4);
    expect(cards.filter((c) => c.status === 'done')).toHaveLength(1);
    expect(cards[0].whoBefore).toBe('с ');
    expect(cards[0].whoName).toBe('Мариной');
    expect(dialogsScenePreviewCards('tr')[0].whoAfter).toBe(' ile');
    expect(DIALOGS_SCENE_PREVIEW_QUOTA_TOTAL).toBe(30);
  });
  it('маршрут превью уводит на Главную вне разработки, не ходит в сеть и не трогает боевой раздел', () => {
    const route = read('app/dev_dialogs_scene_preview.tsx');
    expect(route).toMatch(/if \(!ENABLE_DEV_TOOLS \|\| IS_STORE_RELEASE\) return <Redirect href="\/" \/>;/);
    expect(route).toMatch(/import \{ ENABLE_DEV_TOOLS, IS_STORE_RELEASE \} from '\.\/config';/);
    expect(route).not.toMatch(/fetch\(|httpsCallable|getDoc|firestore|AsyncStorage/i);
    expect(route).toMatch(/setDevAppearance\(wanted\)/);
    expect(route).toMatch(/useStableSafeAreaInsets/);
    expect(route).not.toMatch(/useSafeAreaInsets\(/);
  });
  it('флаг: в разработке вкл, в стор-релизе выкл — одной строкой', () => {
    expect(read('components/dialogs/scene/dialogs_scene_flags.ts')).toMatch(/DIALOGS_SCENE_V2_ENABLED: boolean = ENABLE_DEV_TOOLS && !IS_STORE_RELEASE;/);
  });
  it('вёрстка без обводок и без ужатия шрифта', () => {
    for (const file of ['DialogsSceneStage.tsx', 'DialogsScenePanel.tsx', 'DialogsScene.tsx']) {
      const src = read(`components/dialogs/scene/${file}`);
      expect(src).not.toMatch(/borderWidth|borderColor/);
      expect(src).not.toMatch(/adjustsFontSizeToFit/);
    }
  });
});
