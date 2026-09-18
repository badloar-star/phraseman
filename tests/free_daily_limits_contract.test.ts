/**
 * free_daily_limits_contract.test.ts — сторож дневных границ обычного аккаунта.
 *
 * зачем (владелец 2026-09-14): «фри юзер имеет 3 максимум тренировки в день»,
 * «точно такой же индикатор на арене, только там 1 попытка в день»,
 * «диалоги открой для фри юзера только закажи кофе, в продуктовом и магазин
 * одежды. Все остальные это плюс или уровень. (те что уровень тоже плюс нужен)».
 *
 * Эти три правила — про деньги: молчаливое ослабление любого из них означает
 * раздачу платного контента бесплатно, и обычные тесты разделов такое НЕ ловят
 * (они проверяют работу механики, а не её границу). Сторож ломается, если
 * число лимита уехало, если попытка Арены стала списываться до входа в матч,
 * или если бесплатных сценариев стало больше трёх.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

// Проверяем чистую модель остатка и исходники, а не рендер RN-дерева —
// без заглушки StyleSheet.create падает прямо на импорте компонента.
jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: { create: (styles: unknown) => styles },
  // Каталог сценариев тянет constants/i18n → app/config, а тот читает Platform.OS.
  Platform: { OS: 'ios', select: (map: Record<string, unknown>) => map.ios },
}));

import {
  FREE_DIALOG_SCENARIO_IDS,
  isScenarioUnlockedForAccount,
} from '../app/ai_dialog_level_lock';
import { DIALOG_SCENARIOS } from '../app/ai_dialog_scenarios';
import { REVENUE_DAILY_LIMITS } from '../app/revenue_daily_limits';
import { speakingQuotaDotsModel } from '../components/SpeakingQuotaDots';

const read = (...parts: string[]) => readFileSync(join(__dirname, '..', ...parts), 'utf8');

describe('числа дневных лимитов', () => {
  it('карточки — 3 тренировки в сутки', () => {
    expect(REVENUE_DAILY_LIMITS.flashcard_training_starts).toBe(3);
  });

  /*
   * зачем (владелец 2026-09-18): дневного лимита Арены БОЛЬШЕ НЕТ — «арена
   * неограничена, только энергия ограничение если не хватает». Сторож
   * развёрнут: он охраняет ОТСУТСТВИЕ лимита, потому что прежняя проверка
   * («равен 1») сторожила уже отменённое правило владельца.
   */
  it('Арена — дневного лимита нет вовсе, её ограничивает только энергия', () => {
    expect('arena_match_starts' in REVENUE_DAILY_LIMITS).toBe(false);
  });
});

describe('индикатор точек считает остаток', () => {
  const quota = (over: Partial<{ status: string; used: number; limit: number | null }>) => ({
    status: 'allowed', used: 0, limit: 3, ...over,
  } as Parameters<typeof speakingQuotaDotsModel>[0]);

  it('три точки карточек гаснут по одной', () => {
    expect(speakingQuotaDotsModel(quota({ used: 0 }))).toEqual({ total: 3, remaining: 3 });
    expect(speakingQuotaDotsModel(quota({ used: 1 }))).toEqual({ total: 3, remaining: 2 });
    expect(speakingQuotaDotsModel(quota({ used: 2 }))).toEqual({ total: 3, remaining: 1 });
    expect(speakingQuotaDotsModel(quota({ used: 3, status: 'exhausted' }))).toEqual({ total: 3, remaining: 0 });
  });

  // Модель остатка сама по себе жива (её носят карточки и голос); проверяем
  // её на limit=1 без привязки к Арене — в Арене индикатора больше нет.
  it('единственная точка гаснет после расхода', () => {
    expect(speakingQuotaDotsModel(quota({ limit: 1, used: 0 }))).toEqual({ total: 1, remaining: 1 });
    expect(speakingQuotaDotsModel(quota({ limit: 1, used: 1, status: 'exhausted' }))).toEqual({ total: 1, remaining: 0 });
  });

  it('квота без поля extra (карточная) не ломает модель', () => {
    // Карточный результат приходит БЕЗ extra — дневного пропуска там нет.
    expect(speakingQuotaDotsModel({ status: 'allowed', used: 1, limit: 3 })).toEqual({ total: 3, remaining: 2 });
  });

  it('у Plus точек нет вовсе — ряд был бы ложью', () => {
    expect(speakingQuotaDotsModel(quota({ limit: null }))).toBeNull();
  });
});

describe('диалоги: ровно три сценария бесплатно', () => {
  it('открыты кофе, продуктовый и магазин одежды', () => {
    expect([...FREE_DIALOG_SCENARIO_IDS].sort()).toEqual(['clothes_shop', 'coffee', 'grocery']);
  });

  it('все три id существуют в каталоге', () => {
    for (const id of FREE_DIALOG_SCENARIO_IDS) {
      expect(DIALOG_SCENARIOS.find((scenario) => scenario.id === id)).toBeDefined();
    }
  });

  it('обычный аккаунт видит открытыми только их', () => {
    expect(isScenarioUnlockedForAccount('coffee', false)).toBe(true);
    expect(isScenarioUnlockedForAccount('grocery', false)).toBe(true);
    expect(isScenarioUnlockedForAccount('clothes_shop', false)).toBe(true);
    expect(isScenarioUnlockedForAccount('pharmacy', false)).toBe(false);
    expect(isScenarioUnlockedForAccount('restaurant', false)).toBe(false);
  });

  it('уровень курса больше НЕ открывает сценарии — только Plus', () => {
    // Класс бага: каталог раздавался бесплатно сам собой по мере прохождения.
    const everythingElse = DIALOG_SCENARIOS
      .filter((scenario) => !FREE_DIALOG_SCENARIO_IDS.includes(scenario.id))
      .map((scenario) => scenario.id);
    expect(everythingElse.length).toBeGreaterThan(0);
    for (const id of everythingElse) {
      expect(isScenarioUnlockedForAccount(id, false)).toBe(false);
    }
  });

  it('Plus открывает всё', () => {
    for (const scenario of DIALOG_SCENARIOS) {
      expect(isScenarioUnlockedForAccount(scenario.id, true)).toBe(true);
    }
  });
});

describe('Арена не имеет дневного лимита — только энергия', () => {
  const matchmaking = read('app', 'arena_matchmaking.tsx');
  const hub = read('components', 'arena', 'ArenaHubSurface.tsx');

  /*
   * зачем (владелец 2026-09-18): раньше здесь стояли ДВЕ группы проверок,
   * требовавшие гейт на экране поиска и пейвол на кнопке хаба. Правило
   * отменено владельцем, поэтому сторож теперь держит обратное: любая
   * попытка вернуть дневной счётчик в Арену ломает сборку.
   *
   * Проверяем исходники, а не поведение: класс бага здесь — «кто-то снова
   * прочитал квоту», и он виден именно по тексту файла.
   */
  it('экран поиска не читает и не списывает дневную квоту', () => {
    expect(matchmaking).not.toContain('arena_match_starts');
    expect(matchmaking).not.toContain('consumeRevenueDailyQuota');
    expect(matchmaking).not.toContain('previewRevenueDailyQuota');
  });

  it('хаб не гейтит кнопку «Играть» и не ведёт на пейвол лимита', () => {
    expect(hub).not.toContain('arena_match_starts');
    expect(hub).not.toContain("context: 'arena_limit'");
    expect(hub).not.toContain('useRevenueDailyQuotaPreview');
  });

  it('индикатора остатка на кнопке «Играть» нет', () => {
    expect(hub).not.toContain('SpeakingQuotaDots');
    expect(hub).not.toContain('arena-hub-play-dots');
  });

  it('энергия осталась единственным тормозом входа в матч', () => {
    // Списание энергии обязано жить: без него Арена стала бы полностью
    // бесплатной, а это уже не «убрали лимит», а раздача.
    expect(matchmaking).toContain('confirmArenaMatchEnergy(arenaMatchEnergyIntent)');
  });
});

/**
 * Сторожа обходов, найденных аудитом 2026-09-14.
 *
 * Класс бага: правило доступа поставили на КНОПКУ, а не на экран. Кнопку
 * обойти легко — в Арену вело четыре других живых пути, в платный диалог —
 * прямой роут. Эти проверки держат правило в «горле», где его не миновать.
 */
/*
 * зачем (владелец 2026-09-18): группа «обход лимита Арены закрыт на самом
 * экране поиска» удалена — она требовала гейт, который владелец отменил
 * («никаких дневных попыток, арена неограничена»). Охрана ОТСУТСТВИЯ лимита
 * живёт выше, в «Арена не имеет дневного лимита — только энергия».
 *
 * Урок прежнего инцидента при этом не потерян: правило доступа обязано стоять
 * в «горле» экрана, а не на кнопке. Он по-прежнему сторожится для диалогов
 * ниже и для энергии Арены выше.
 */
describe('обход платных диалогов прямым роутом закрыт', () => {
  const briefing = read('app', 'ai_dialog_briefing.tsx');

  it('экран брифинга сам проверяет доступ к сценарию', () => {
    expect(briefing).toContain('resolveDialogScenarioAccess');
    expect(briefing).toContain("source: 'ai_dialog_briefing_direct'");
  });

  it('автопереход в сессию ждёт вердикта замка', () => {
    // Иначе повторный вход (интро просмотрено) уводил бы в платный сценарий
    // мимо проверки — самая тихая форма этой дыры.
    expect(briefing).toMatch(/if \(accessGate !== 'ok'\) return;/);
  });

  it('ошибка чтения премиума не отнимает доступ', () => {
    expect(briefing).toMatch(/access failed → пускаем/);
  });
});

describe('тексты пейволов не врут после смены правил', () => {
  it('пейвол Арены говорит про матчи, а не про паузы в занятиях', () => {
    const proof = read('components', 'paywall', 'PaywallProofCards.tsx');
    expect(proof).toMatch(/arena_limit: 'arena'/);
    // Дефолтная группа 'pace' на экране про матчи была бы не по месту.
    expect(proof).toMatch(/arena: \{[\s\S]{0,200}Plus не считает матчи/);
  });

  it('пейвол диалогов не обещает «уровни выше» — замок больше не по уровню', () => {
    const copy = read('app', 'paywall_copy.ts');
    // Смотрим ЗНАЧЕНИЯ полей, а не весь файл: в комментарии старая формулировка
    // упомянута намеренно — она объясняет, почему её здесь больше нет.
    expect(copy).not.toMatch(/titleRu: 'Диалоги уровней выше — в Plus'/);
    expect(copy).not.toMatch(/en: 'Higher-level dialogues are in Plus'/);
    expect(copy).toMatch(/titleRu: 'Остальные диалоги — в Plus'/);
  });
});

describe('карточки: кнопка тренировки показывает остаток', () => {
  const source = read('app', 'flashcards', 'FlashcardsHubScreen.tsx');

  it('точки нарисованы на кнопке', () => {
    expect(source).toMatch(/<SpeakingQuotaDots[\s\S]{0,400}quota=\{quotaPreview\}/);
  });

  it('исчерпано — плашка Plus и пейвол по тапу', () => {
    expect(source).toMatch(/trainingLocked \? <PlusBadge/);
    expect(source).toMatch(/if \(trainingLocked\)[\s\S]{0,260}openTrainingPaywall/);
  });

  it('остаток озвучен для скринридера (точки от него скрыты)', () => {
    expect(source).toContain('trainAccessibilityLabel');
    expect(source).toContain('trainA11yLeft');
  });
});
