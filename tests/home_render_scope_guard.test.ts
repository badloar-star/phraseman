/**
 * home_render_scope_guard.test.ts — сторож областей видимости на Главной.
 *
 * зачем (инцидент 2026-09-01): экран падал в рантайме сразу при открытии —
 * «Render Error: Property 'homeHeaderRuneIconSource' doesn't exist». Причина:
 * переменную объявили ВНУТРИ `renderNewHome`, а использовали в главном `return`
 * компонента, то есть за пределами этой функции.
 *
 * Почему нужен отдельный сторож: TypeScript такую ошибку НЕ ловит. Внутри
 * `renderNewHome` объявлены сотни констант, а сам файл — под 4700 строк; при
 * следующей правке промахнуться областью видимости проще простого, и цена
 * ошибки — белый экран у всех пользователей, а не тихая регрессия.
 *
 * Проверка структурная (по тексту исходника), потому что отрендерить home.tsx
 * в jest невозможно: он тянет expo-image, reanimated и половину приложения.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const HOME_PATH = join(__dirname, '..', 'app', '(tabs)', 'home.tsx');

/** Тело `renderNewHome` целиком — от объявления до парной закрывающей скобки. */
function readRenderNewHomeBody(source: string): { body: string; after: string } {
  const marker = '    const renderNewHome = () => {';
  const start = source.indexOf(marker);
  expect(start).toBeGreaterThan(-1);

  const lines = source.slice(start).split('\n');
  let depth = 0;
  let endLine = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    depth += (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
    if (i > 0 && depth <= 0) {
      endLine = i;
      break;
    }
  }
  expect(endLine).toBeGreaterThan(0);

  const body = lines.slice(0, endLine + 1).join('\n');
  return { body, after: source.slice(start + body.length) };
}

describe('Главная: области видимости renderNewHome', () => {
  const source = readFileSync(HOME_PATH, 'utf8');

  it('ни одна константа из renderNewHome не используется в главном return', () => {
    const { body, after } = readRenderNewHomeBody(source);

    // Константы тела функции идут с отступом 8 пробелов (сама функция — 4).
    const declared = new Set(
      Array.from(body.matchAll(/^ {8}const (\w+)/gm), (match) => match[1]),
    );

    const leaked = [...declared]
      .filter((name) => new RegExp(`\\b${name}\\b`).test(after))
      .sort();

    // Пустой список — единственное допустимое состояние. Если тест упал,
    // переменную из списка надо ПОДНЯТЬ на верхний уровень компонента, а не
    // ослаблять проверку: иначе экран падает у всех при открытии.
    expect(leaked).toEqual([]);
  });

  // зачем (PM-052, D75, 02.10): оверлей сбора наград удалён — монеты летят там, где заработаны.
  // Сторож держит удаление: ни оверлея, ни очереди «на потом», ни иконки частиц на Главной.
  it('на Главной нет сбора наград «на потом»', () => {
    expect(source).not.toMatch(/HomeRewardCollectFlight|useHomeRewardCollect|reward_flight_queue/);
    expect(source).not.toMatch(/homeHeaderRuneIconSource|homeHeaderShardIconSource/);
  });
});
