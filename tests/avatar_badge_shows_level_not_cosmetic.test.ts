import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Цифра на значке аватарки = УРОВЕНЬ человека, а не номер косметики.
 *
 * Инцидент 2026-09-01 (жалоба «Издевательство», Jānis): человек видел на
 * Главной шестигранник с числом 50 и надпись «Уровень 13» рядом. Проверка его
 * данных на сервере подтвердила: `user_avatar = "50"` — легендарная аватарка,
 * выданная как VIP-награда, при настоящем уровне 12 по опыту.
 *
 * Корень: в AvatarView цифра значка бралась из `avatarIndex` (значение ключа
 * user_avatar), а надпись «Уровень N» рядом считалась из опыта. Два независимых
 * источника, никакой сверки — номер косметики выдавал себя за уровень.
 *
 * Правило: когда уровень ИЗВЕСТЕН (передан явно или выводится из опыта), значок
 * показывает только его. Индекс аватарки остаётся запасным вариантом ТОЛЬКО
 * там, где уровня неоткуда взять — например, соперник в арене, которому
 * передают одну картинку. Иначе всем таким показывался бы «1».
 *
 * Сработал сторож — возвращать правило, а не удалять проверку.
 */
describe('avatar badge shows the real level, never the cosmetic index', () => {
  const source = readFileSync(join(process.cwd(), 'components', 'AvatarView.tsx'), 'utf8');

  test('the badge number comes from the known level, with index only as a fallback', () => {
    expect(source).toContain('const fallbackLevel = knownLevel ?? avatarIndex;');
    // Прежняя формула и была багом: при отсутствии картинки значок печатал
    // САМ индекс косметики как уровень.
    expect(source).not.toContain('avatarImage ? resolvedLevel : avatarIndex');
  });

  test('an unknown level is not silently invented', () => {
    // knownLevel === null означает «уровень не передали». Подменять его
    // единицей в значке нельзя — отсюда и нужен запасной индекс.
    expect(source).toContain('const knownLevel = level ?? (totalXP !== undefined ? getLevelFromXP(totalXP) : null);');
  });

  test('the cosmetic picture still follows the avatar value, so rewards are not taken away', () => {
    // Аватарку 50-го уровня человеку выдали как награду — картинку забирать
    // нельзя, чинится только ЦИФРА.
    expect(source).toContain('const avatarDef = getAvatarByIndex(avatarIndex);');
    expect(source).toContain('overlayLevel={avatarIndex}');
  });
});
