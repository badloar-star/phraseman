// ════════════════════════════════════════════════════════════════════════════
// season_pass_row_height_budget_contract.test.ts — сумма высоты карточки
// подарка НЕ ДОЛЖНА превышать высоту строки дорожки.
//
// зачем 2026-08-04 (независимый аудит нашёл реальный баг ПОСЛЕ того, как
// season_pass_reward_art.test.ts уже был зелёным): звёзды вынесены ИЗ карточки
// ПОД неё (владелец: «звёздочки должны быть под контейнером»), а арт увеличен
// (владелец: «иконки увеличить»). Оба изменения раздельно казались безопасными,
// но их СУММА с зарезервированным двухстрочным label (27px, трогать нельзя —
// иначе обрежет длинные названия вроде «Магнит коллекции») и паддингами
// превысила высоту строки (ROW_HEIGHT) при первой попытке — карточка физически
// наезжала бы на соседний ряд FlatList на Android/iOS (RN не обрезает overflow
// по умолчанию, flexShrink дефолтно 0). Существующий тест season_pass_reward_art
// проверяет только ОТДЕЛЬНЫЕ нижние границы (rewardSize >= 56, rowHeight >= 104),
// никогда не складывая их — это и есть слепое пятно, которое привело к
// незамеченной регрессии. Этот тест закрывает именно сумму.
//
// Экран не поднимается в jest (reanimated, react-native-svg), поэтому бюджет
// проверяется по исходнику — тот же приём, что и в соседних season_pass-контрактах.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'app', 'season_pass.tsx'), 'utf8');

function readNumberConst(name: string): number {
  const match = SOURCE.match(new RegExp(`(?:const|export const) ${name}\\s*=\\s*(\\d+(?:\\.\\d+)?)`));
  if (!match) throw new Error(`константа «${name}» не найдена в season_pass.tsx`);
  return Number(match[1]);
}

describe('Season Pass — карточка подарка помещается в высоту строки', () => {
  const ROW_HEIGHT = readNumberConst('ROW_HEIGHT');
  const ROW_GAP = readNumberConst('ROW_GAP');
  const ART_SIZE = readNumberConst('SEASON_REWARD_ART_SIZE');
  const AURA_SIZE = readNumberConst('SEASON_AURA_ART_SIZE');
  const PEARL_SIZE = readNumberConst('SEASON_PEARL_ART_SIZE');

  // Из renderReward: label minHeight — 27 (две строки под длинные названия),
  // TouchableOpacity paddingVertical — 4×2, внутренний gap — 1,
  // gap между карточкой и звёздами — 3, строка звёзд (fontSize 11) — ~15px
  // с её собственным lineHeight. Держим эти числа синхронно с кодом ниже,
  // а не хардкодим — если кто-то поменяет вёрстку, тест обязан упасть ПЕРВЫМ.
  const LABEL_MIN_HEIGHT = 27;
  const CARD_PADDING_VERTICAL_TOTAL = 4 * 2;
  const CARD_INNER_GAP = 1;
  const STARS_ROW_GAP = 3;
  const STARS_TEXT_HEIGHT_ESTIMATE = 15;

  const rowContentAvailable = ROW_HEIGHT - ROW_GAP; // paddingVertical: ROW_GAP/2 сверху и снизу
  const cardAvailable = rowContentAvailable - STARS_ROW_GAP - STARS_TEXT_HEIGHT_ESTIMATE;

  it('вёрстка (label/паддинги/gap) действительно на месте — иначе бюджет ниже проверяет фикцию', () => {
    expect(SOURCE).toMatch(/minHeight:\s*reward\.kind === 'pearls' \? 0 : 27/);
    expect(SOURCE).toMatch(/paddingVertical:\s*4,/);
    expect(SOURCE).toContain("gap: 1,");
  });

  it.each([
    ['SEASON_REWARD_ART_SIZE (обычный арт)', () => ART_SIZE],
    ['SEASON_AURA_ART_SIZE (аура)', () => AURA_SIZE],
    ['SEASON_PEARL_ART_SIZE (жемчужины)', () => PEARL_SIZE],
  ])('%s + label + паддинги влезают в реально доступную высоту TouchableOpacity', (_label, getSize) => {
    const size = getSize();
    const cardIntrinsicHeight = size + CARD_INNER_GAP + LABEL_MIN_HEIGHT + CARD_PADDING_VERTICAL_TOTAL;
    expect(cardIntrinsicHeight).toBeLessThanOrEqual(cardAvailable);
  });

  it('ROW_HEIGHT реально больше суммы своих частей (не притянуто впритык до отрицательного запаса)', () => {
    expect(rowContentAvailable).toBeGreaterThan(0);
    expect(cardAvailable).toBeGreaterThan(0);
  });
});
