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

  it('Арена — 1 матч в сутки', () => {
    expect(REVENUE_DAILY_LIMITS.arena_match_starts).toBe(1);
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

  it('единственная точка Арены гаснет после матча', () => {
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

describe('Арена: попытка тратится только по факту входа в матч', () => {
  const source = read('app', 'arena_matchmaking.tsx');

  it('списание стоит ПОСЛЕ успешного префетча входа, а не на старте поиска', () => {
    // Владелец: «если матч не был найден, юзер закончил поиск — попытка должна
    // вернуться». Мы не списываем авансом вовсе, поэтому возвращать нечего.
    // Ищем именно СПИСАНИЕ: с приходом гейта на входе в экран в файле стало два
    // упоминания квоты — превью (выше) и consume (здесь).
    const prefetchAt = source.indexOf('arenaEntryPrefetchStart(matchId).then');
    const consumeAt = source.indexOf('consumeRevenueDailyQuota({');
    expect(prefetchAt).toBeGreaterThan(-1);
    expect(consumeAt).toBeGreaterThan(prefetchAt);
  });

  it('чек привязан к matchId — повторный вход в тот же матч идемпотентен', () => {
    expect(source).toMatch(/receiptId: matchId/);
  });

  it('отмена поиска не списывает попытку', () => {
    // В ветке выхода без матча не должно быть ни одного списания квоты.
    const leaveStart = source.indexOf('const leaveSearchWithRefund');
    const leaveEnd = source.indexOf('leaveSearchRef.current = leaveSearchWithRefund');
    expect(leaveStart).toBeGreaterThan(-1);
    expect(leaveEnd).toBeGreaterThan(leaveStart);
    expect(source.slice(leaveStart, leaveEnd)).not.toContain('consumeRevenueDailyQuota');
  });
});

describe('Арена: хаб закрывает вход при исчерпанной попытке', () => {
  const source = read('components', 'arena', 'ArenaHubSurface.tsx');

  it('исчерпано — тап ведёт на пейвол, шторка режимов не открывается', () => {
    expect(source).toMatch(/arenaAttemptSpent[\s\S]{0,600}premium_modal/);
    expect(source).toContain("context: 'arena_limit'");
  });

  it('блокирует ТОЛЬКО достоверное exhausted', () => {
    // waiting/unavailable/stale_account обязаны пускать: за нашу аварию
    // человека не наказываем (урок кнопки тренировки карточек).
    expect(source).toMatch(/arenaAttemptSpent = matchQuota\.status === 'exhausted'/);
  });

  it('продолжение своего матча и очереди попытки не требует', () => {
    const resumeMatchAt = source.indexOf("action.kind === 'resume_match'");
    const resumeQueueAt = source.indexOf("action.kind === 'resume_queue'");
    const gateAt = source.indexOf('if (arenaAttemptSpent)');
    expect(resumeMatchAt).toBeGreaterThan(-1);
    expect(gateAt).toBeGreaterThan(resumeMatchAt);
    expect(gateAt).toBeGreaterThan(resumeQueueAt);
  });

  it('дуэль с другом под лимит не попадает', () => {
    // Гейт стоит перед ОБЩЕЙ шторкой выбора режима, но сама шторка ведёт в
    // friend-дуэль без повторной проверки: лимит закрывает только очередь.
    expect(source).not.toMatch(/friend[\s\S]{0,120}arenaAttemptSpent/);
  });
});

/**
 * Сторожа обходов, найденных аудитом 2026-09-14.
 *
 * Класс бага: правило доступа поставили на КНОПКУ, а не на экран. Кнопку
 * обойти легко — в Арену вело четыре других живых пути, в платный диалог —
 * прямой роут. Эти проверки держат правило в «горле», где его не миновать.
 */
describe('обход лимита Арены закрыт на самом экране поиска', () => {
  const source = read('app', 'arena_matchmaking.tsx');

  it('экран поиска сам проверяет дневную попытку, не полагаясь на хаб', () => {
    expect(source).toContain("kind: 'arena_match_starts'");
    expect(source).toMatch(/previewRevenueDailyQuota/);
    expect(source).toContain("source: 'arena_matchmaking_direct'");
  });

  it('проверка стоит ДО списания энергии — поиск не оплачивается зря', () => {
    const gateAt = source.indexOf("const [dailyGate, setDailyGate]");
    const energyAt = source.indexOf('confirmArenaMatchEnergy(arenaMatchEnergyIntent)');
    expect(gateAt).toBeGreaterThan(-1);
    expect(energyAt).toBeGreaterThan(gateAt);
    expect(source).toMatch(/if \(dailyGate !== 'ok'\) return;/);
  });

  it('очередь не стартует, пока попытка не подтверждена', () => {
    expect(source).toMatch(/useArenaQueue\([\s\S]{0,140}dailyGate === 'ok'\)/);
  });

  it('продолжение оплаченной очереди не гейтится повторно', () => {
    expect(source).toMatch(/resumesPaidQueue \? 'ok' : 'checking'/);
  });

  it('блокирует только достоверное exhausted, аварию чтения пускает', () => {
    expect(source).toMatch(/quota\.status === 'exhausted'/);
    expect(source).toMatch(/gate failed → пускаем/);
  });
});

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
