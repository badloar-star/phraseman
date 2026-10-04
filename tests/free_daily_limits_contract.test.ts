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
  isScenarioUnlockedForAccount,
  legacyDialogScenarioRankRequired,
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

/**
 * D124 (владелец 2026-09-30): «Доступ к диалогам — только монетный ранг для
 * всех: Plus не открывает сценарии без ранга, старые покупки диалогов за руны
 * не учитываются». До D124 здесь сторожились три бесплатных сценария и
 * «Plus открывает всё» — правило отменено владельцем, сторож переписан.
 */
describe('диалоги: доступ решает только монетный ранг (D124)', () => {
  it('ранг старого сценария = ранг первого сценария того же уровня в Dialogue V2', () => {
    expect(legacyDialogScenarioRankRequired('A1')).toBe(1);
    expect(legacyDialogScenarioRankRequired('A2')).toBe(6);
    expect(legacyDialogScenarioRankRequired('B1')).toBe(11);
    expect(legacyDialogScenarioRankRequired('B2')).toBe(14);
  });

  it('без ранга (0 или неизвестен) не открыт ни один сценарий — Plus не участвует', () => {
    for (const scenario of DIALOG_SCENARIOS) {
      expect(isScenarioUnlockedForAccount(scenario, 0)).toBe(false);
      expect(isScenarioUnlockedForAccount(scenario, null)).toBe(false);
    }
  });

  it('ранг открывает сценарии своего уровня и ниже, выше — нет', () => {
    const a1 = DIALOG_SCENARIOS.find((scenario) => scenario.cefr === 'A1')!;
    const b2 = DIALOG_SCENARIOS.find((scenario) => scenario.cefr === 'B2')!;
    expect(isScenarioUnlockedForAccount(a1, 1)).toBe(true);
    expect(isScenarioUnlockedForAccount(b2, 13)).toBe(false);
    expect(isScenarioUnlockedForAccount(b2, 14)).toBe(true);
  });

  it('старое правило Plus/руны не вернулось в модуль доступа', () => {
    const lock = read('app', 'ai_dialog_level_lock.ts');
    expect(lock).not.toContain('FREE_DIALOG_SCENARIO_IDS');
    expect(lock).not.toContain('ownedScenarioIds');
  });
});

// зачем: D83 — клиентская Арена удалена целиком (экран поиска и хаб),
// сторож «у Арены нет дневного лимита» снят вместе с ними.

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
describe('обход закрытых диалогов прямым роутом закрыт', () => {
  const briefing = read('app', 'ai_dialog_briefing.tsx');

  it('экран брифинга сам проверяет доступ к сценарию по рангу (D124)', () => {
    expect(briefing).toContain('isScenarioUnlockedForAccount(scenario, coinRank)');
    expect(briefing).toContain('useMyCoinRank()');
  });

  it('закрытый рангом сценарий не уводит на пейвол — Plus ранг не заменяет', () => {
    expect(briefing).not.toContain("pathname: '/premium_modal'");
    expect(briefing).toMatch(/briefing:access denied/);
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
    // D124 (30.09): сценарии открывает ранг монеты, а не Plus.
    expect(copy).toMatch(/titleRu: 'Сценарий откроется на ранге монеты'/);
  });
});

describe('карточки: кнопка тренировки показывает остаток', () => {
  const source = read('app', 'flashcards', 'FlashcardsHubScreen.tsx');

  // зачем (2.0, месячный лимит тренировок): рядом с кнопкой теперь общий индикатор
  // MonthlyTrainingSessionIndicator («N из 30 в этом месяце»), а не три точки
  // SpeakingQuotaDots, и без отдельной плашки Plus — исчерпание объясняет текст индикатора.
  // Сохранено главное: остаток виден у кнопки, а тап по исчерпанной тренировке ведёт на пейвол.
  it('остаток нарисован рядом с кнопкой', () => {
    // зачем (хаб А утверждён 04.10): остаток — на самой главной кнопке («Тренироваться · осталось N из 30») и пилюлей в шапке.
    expect(source).toMatch(/осталось \$\{trainingRemaining\} из \$\{quotaPreview\.limit\}/);
    expect(source).toContain('limitLabel');
  });

  it('исчерпано — пейвол по тапу', () => {
    expect(source).toMatch(/if \(trainingLocked\)[\s\S]{0,260}openTrainingPaywall/);
  });

  it('остаток озвучен для скринридера (точки от него скрыты)', () => {
    expect(source).toContain('trainAccessibilityLabel');
    expect(source).toContain('trainA11yLeft');
  });
});
