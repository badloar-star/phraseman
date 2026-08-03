// ════════════════════════════════════════════════════════════════════════════
// active_gifts_sources_contract.test.ts — раздел «Активные» видит ВСЁ активное.
//
// зачем 2026-08-03 (владелец): «подарки я применил, а они в разделе активные не
// появились».
//
// Корень: раздел читает ФИКСИРОВАННЫЙ список ключей AsyncStorage, а сезонные
// награды пишут в СВОИ ключи. Совпадали только двое — банк опыта и тотем клуба,
// и то случайно (они переиспользуют канал уровневых подарков). Буст лиги,
// золотой урок и второе дыхание были невидимы полностью: эффект работал, но
// подтверждения ему не было нигде.
//
// Класс бага — «молчаливое расхождение»: применение и чтение живут в разных
// файлах и связаны только строкой-ключом. Компилятор такое не ловит, обычные
// тесты экрана работают на моках и остаются зелёными. Поэтому тест сверяет
// строки напрямую: где ПИШЕТСЯ награда и ЧИТАЕТ ли этот ключ инвентарь.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (...parts: string[]): string => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

const INVENTORY = read('app', 'level_gift_active_inventory.ts');
const SEASON_APPLY = read('app', 'season_reward_apply.ts');
const LEAGUE_BOOSTS = read('app', 'league_personal_boosts.ts');
const BOON_ENERGY = read('app', 'boons', 'boon_effects_energy.ts');
const CLUB_BOOSTS = read('app', 'club_boosts.ts');

/**
 * Награды, которые ПОСЛЕ применения продолжают действовать и обязаны быть
 * видимы в разделе «Активные» со своим таймером.
 *
 * Разовые эффекты (жемчужины на баланс, полный заряд энергии, машина времени)
 * сюда намеренно не входят: они срабатывают мгновенно и «активными» не бывают.
 */
const LASTING_REWARDS: ReadonlyArray<{
  readonly title: string;
  readonly storageKey: string;
  readonly writtenIn: string;
}> = [
  { title: 'Банк опыта', storageKey: 'gift_xp_bank_v1', writtenIn: SEASON_APPLY },
  { title: 'Тотем клуба', storageKey: 'club_gift_free_boost_v1', writtenIn: CLUB_BOOSTS },
  { title: 'Буст лиги', storageKey: 'league_personal_boost_v1', writtenIn: LEAGUE_BOOSTS },
  { title: 'Золотой урок', storageKey: 'season_golden_lesson_v1', writtenIn: SEASON_APPLY },
  { title: 'Второе дыхание', storageKey: 'boon_energy_override_v1', writtenIn: BOON_ENERGY },
];

describe('ключи записи и чтения совпадают', () => {
  test.each(LASTING_REWARDS)('«$title»: ключ реально существует в месте записи', ({ storageKey, writtenIn }) => {
    expect(writtenIn).toContain(`'${storageKey}'`);
  });

  test.each(LASTING_REWARDS)('«$title»: раздел «Активные» ЧИТАЕТ этот ключ', ({ storageKey }) => {
    // Ровно та проверка, которой не хватало: применение писало, чтение молчало.
    expect(INVENTORY).toContain(`'${storageKey}'`);
  });

  test.each(LASTING_REWARDS)('«$title»: ключ действительно запрашивается из хранилища', ({ storageKey }) => {
    // Мало объявить константу — надо ещё сходить за значением.
    const constantName = new RegExp(`const ([A-Z_0-9]+) = '${storageKey}';`).exec(INVENTORY);
    expect(constantName).not.toBeNull();
    expect(INVENTORY).toContain(`AsyncStorage.getItem(${constantName![1]})`);
  });
});

describe('сезонные награды попадают в список', () => {
  test('буст лиги показывается со своим сроком, а не с общим TTL', () => {
    // У него есть собственный expiresAt (до конца дня либо длительность буста).
    expect(INVENTORY).toContain("key: 'league_personal_boost'");
    expect(INVENTORY).toContain('expiresAtMs: leagueBoostExpiresAt');
  });

  test('золотой урок получает 72-часовой TTL от первого показа', () => {
    // Своего срока у заряда нет — иначе висел бы в списке вечно.
    expect(INVENTORY).toContain("key: 'season_golden_lesson'");
    expect(INVENTORY).toContain("resolveFirstSeenLifetime('golden_lesson'");
  });

  test('второе дыхание показывается со своим сроком', () => {
    expect(INVENTORY).toContain("key: 'turbo_regen'");
    expect(INVENTORY).toContain('expiresAtMs: turboExpiresAt');
  });

  test('у каждого нового пункта есть таймер', () => {
    for (const key of ['league_personal_boost', 'season_golden_lesson', 'turbo_regen']) {
      // \s покрывает и CRLF: файл в репозитории с виндовыми переводами строк.
      const block = new RegExp(`key: '${key}',\\s+expiresAtMs:`).exec(INVENTORY);
      expect(block).not.toBeNull();
    }
  });

  test('истёкший бонус в список не попадает', () => {
    // Сравнение с nowMs, а не безусловный вывод.
    expect(INVENTORY).toContain('leagueBoostExpiresAt > nowMs');
    expect(INVENTORY).toContain('turboExpiresAt > nowMs');
  });
});

describe('TTL-штамп золотого урока объявлен', () => {
  test('golden_lesson добавлен в тип штампов первого показа', () => {
    expect(read('app', 'gift_expiry.ts')).toContain("'golden_lesson'");
  });
});

describe('разовые награды не попали в «Активные» по ошибке', () => {
  test.each(['pearls', 'battery', 'time_machine'])('«%s» не показывается как действующий бонус', (kind) => {
    // Они срабатывают мгновенно: висеть в списке с таймером им незачем.
    expect(INVENTORY).not.toContain(`key: 'season_${kind}'`);
  });
});
