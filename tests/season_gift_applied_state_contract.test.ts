// ════════════════════════════════════════════════════════════════════════════
// season_gift_applied_state_contract.test.ts — модалка обязана СМЕНИТЬ состояние.
//
// зачем 2026-08-03 (владелец): «при нажатии применить модалка просто моргает и
// всё, никакого нового состояния, а обязано смениться и быть написано, что буст
// такой-то бла-бла-бла действует столько-то».
//
// Было: после «Применить» оставался прежний заголовок, прежнее описание («что
// это такое») и одна кнопка «Отлично». Игрок не понимал ни того, сработало ли
// вообще, ни на какой срок. Стало: свой заголовок «Готово!» и своя строка
// applied у КАЖДОГО подарка — что включилось и насколько.
//
// Модалка в jest не поднимается (reanimated, MaskedView), поэтому контракт
// проверяется по исходнику — тот же приём, что в остальных контрактах экранов.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const MODAL = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'SeasonGiftModal.tsx'),
  'utf8',
);

const TRACK = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'season_pass_track_config.ts'),
  'utf8',
);

/**
 * Тело блока награды из MODAL_COPY.
 *
 * зачем: построчный разбор вместо многострочного regex — строки текстов очень
 * длинные (8 языков в одну строку), и жадность/лень квантификаторов делала
 * regex-версию нестабильной.
 */
function giftBlock(kind: string): string {
  const lines = MODAL.split('\n');
  const start = lines.findIndex((line) => line.trimEnd() === `  ${kind}: {`);
  if (start < 0) throw new Error(`блок награды «${kind}» не найден в MODAL_COPY`);
  const end = lines.findIndex((line, index) => index > start && line.trimEnd() === '  },');
  if (end < 0) throw new Error(`не найден конец блока награды «${kind}»`);
  return lines.slice(start, end + 1).join('\n');
}

/** Все виды наград, объявленные в конфиге дорожки. */
function declaredRewardKinds(): string[] {
  const union = /export type SeasonRewardKind =([\s\S]*?);/.exec(TRACK);
  if (!union) throw new Error('не найден SeasonRewardKind в season_pass_track_config.ts');
  return Array.from(union[1].matchAll(/'([a-z_0-9]+)'/g)).map((m) => m[1]);
}

describe('состояние после применения', () => {
  test('у текста наград есть отдельное поле applied', () => {
    expect(MODAL).toContain('applied: Tri');
  });

  test('после применения показывается applied, а не прежнее описание', () => {
    expect(MODAL).toContain("phase === 'done'");
    expect(MODAL).toContain('triLang(lang, copy.applied)');
  });

  test('заголовок тоже меняется — иначе смена состояния незаметна', () => {
    expect(MODAL).toContain("ru: 'Готово!'");
  });

  test('обычное описание остаётся до применения', () => {
    expect(MODAL).toContain('triLang(lang, copy.desc)');
  });
});

describe('тексты есть у КАЖДОГО подарка', () => {
  const kinds = declaredRewardKinds();

  test('в конфиге объявлены награды — есть что проверять', () => {
    expect(kinds.length).toBeGreaterThan(10);
  });

  test.each(kinds)('у награды «%s» есть текст после применения', (kind) => {
    // Блок вида `kind: { title..., desc..., applied... }` обязан содержать applied:
    // иначе после применения игрок увидит пустоту.
    expect(giftBlock(kind)).toContain('applied: T(');
  });
});

describe('качество текстов', () => {
  // зачем 2026-08-04 (владелец: «тексты неправильные, не отображают суть»):
  // тест требовал буквально «72» у ВСЕХ трёх наград, но их реальные сроки
  // разные и НИ ОДИН не 72 часа — league_boost живёт до локальной полуночи
  // (league_personal_boosts.ts: x2_eod_pass, durationMs = msUntilLocalMidnight),
  // collection_magnet — 24 часа с активации (functions/src/season_pass.ts:159),
  // turbo_regen — до конца текущих UTC-суток (boon_effects_energy.ts:36-38).
  // Старый тест закреплял неверный текст как правильный. Теперь проверяем
  // ФАКТ («названа хоть какая-то длительность»), а не конкретное число.
  test('у бонусов со сроком названа длительность', () => {
    // Владелец: «действует столько-то». Проверяем те, у которых срок реален.
    const expectedDurationHint: Record<string, RegExp> = {
      league_boost: /сегодняшнего дня/,
      collection_magnet: /24 час/,
      turbo_regen: /сегодняшнего дня/,
    };
    for (const [kind, hint] of Object.entries(expectedDurationHint)) {
      const applied = /applied: T\((.*)\),/.exec(giftBlock(kind));
      expect(applied).not.toBeNull();
      expect(applied![1]).toMatch(hint);
    }
  });

  test('русский срок не протёк в другие языки', () => {
    // Класс бага при массовой вставке: 'на 72 ч' попадало в испанский и турецкий.
    const appliedLines = MODAL.match(/applied: T\(.*\),/g) ?? [];
    for (const line of appliedLines) {
      const parts = line.match(/'(?:[^'\\]|\\.)*'/g) ?? [];
      // Первые две строки — русская и украинская, остальные не должны быть кириллицей.
      parts.slice(2).forEach((part) => {
        expect(part).not.toMatch(/на \d+ ч/);
      });
    }
  });

  test('тексты не пустые', () => {
    const appliedLines = MODAL.match(/applied: T\(.*\),/g) ?? [];
    expect(appliedLines.length).toBeGreaterThan(10);
    for (const line of appliedLines) {
      expect(line).not.toContain("''");
    }
  });
});
