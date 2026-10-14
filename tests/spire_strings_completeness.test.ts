// зачем (координатор 12.10, аудит SPIRE_I18N_AUDIT §1/§8): Шпиль в первом выпуске только для ru и uk, а переводы остальных семи языков
// живут в двух словарях по 9 значений. Сторож: в каждом ключе все 9 языков непустые, набор {подстановок} одинаков, а числа в турах и правилах
// («15 этажей», «30 человек», «10 заданий», «3 сердца», «15%») совпадают с константами игры — поменяли константу, забыли текст → тест краснеет.
import { SPIRE_STRINGS } from '../components/spire/spire_strings';
import { SPIRE_GAME_STRINGS } from '../components/spire/spire_game_strings';
import { SPIRE_FLOOR_COUNT } from '../components/spire/spire_tower_model';
import { SPIRE_ROOM_SIZE, SPIRE_ZONE_RATIO } from '../modules/spire/residents';
import { SPIRE_STEP_MAX_HEARTS, SPIRE_STEP_TASK_COUNT } from '../modules/spire/step_machine';
import { SPIRE_STEP_TASK_COUNT as SERVER_STEP_TASK_COUNT } from '../functions/src/spire_config_contract';
import { SPIRE_ROOM_SIZE as SERVER_ROOM_SIZE, SPIRE_ZONE_RATIO as SERVER_ZONE_RATIO } from '../functions/src/spire_residents';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const TABLES = { spire_strings: SPIRE_STRINGS, spire_game_strings: SPIRE_GAME_STRINGS } as const;

const placeholders = (s: string): string[] => [...s.matchAll(/\{([a-z0-9]+)\}/giu)].map((m) => m[1]!).sort();
// Цифры без подстановок; «%15» (тур.) и «15%» дают одно и то же число.
const digits = (s: string): string[] => (s.replace(/\{[a-z0-9]+\}/giu, '').match(/\d+/gu) ?? []).sort();

const PERCENT = Math.round(SPIRE_ZONE_RATIO * 100);

/** Какие числа обязаны стоять в каждом ключе (во всех 9 языках). Новый ключ с цифрами без записи здесь — красный тест. */
const EXPECTED_NUMBERS: Readonly<Record<string, readonly number[]>> = {
  tour1Text: [SPIRE_FLOOR_COUNT, SPIRE_ROOM_SIZE],
  tour2Title: [SPIRE_STEP_TASK_COUNT, SPIRE_STEP_MAX_HEARTS],
  tour3Title: [PERCENT],
  tour3Text: [PERCENT, 1], // «…начинают с 1 этажа»
  tour3TextCoins: [5, 1], // D190: «5 последних по монетам за неделю спускаются… с 1 этажа»
  hearts: [SPIRE_STEP_MAX_HEARTS],
  failSub: [SPIRE_STEP_TASK_COUNT],
  newWeekFromOne: [1],
};

describe('Spire dictionaries cover all 9 interface languages', () => {
  for (const [name, table] of Object.entries(TABLES)) {
    describe(name, () => {
      it('has 9 non-empty values for every key', () => {
        const bad: string[] = [];
        for (const [key, row] of Object.entries(table)) {
          if (row.length !== LANGS.length) bad.push(`${key}: ${row.length} значений`);
          row.forEach((value, i) => { if (!value.trim()) bad.push(`${key}[${LANGS[i]}] пусто`); });
        }
        expect(bad).toEqual([]);
      });

      it('keeps the same {placeholders} in every language', () => {
        const bad: string[] = [];
        for (const [key, row] of Object.entries(table)) {
          const base = placeholders(row[0]).join(',');
          row.forEach((value, i) => { if (placeholders(value).join(',') !== base) bad.push(`${key}[${LANGS[i]}]: {${placeholders(value).join(',')}} вместо {${base}}`); });
        }
        expect(bad).toEqual([]);
      });
    });
  }

  it('shows the same numbers in all 9 languages and they match the game constants', () => {
    const bad: string[] = [];
    const seen = new Set<string>();
    for (const [key, row] of Object.entries(SPIRE_GAME_STRINGS)) {
      const found = row.map(digits);
      if (!found.some((d) => d.length > 0)) continue;
      seen.add(key);
      const expected = EXPECTED_NUMBERS[key];
      if (!expected) { bad.push(`${key}: в тексте есть цифры ${found[0]!.join(',')}, а в таблице ожидаемых чисел записи нет`); continue; }
      const want = expected.map(String).sort();
      row.forEach((_, i) => { if (found[i]!.join(',') !== want.join(',')) bad.push(`${key}[${LANGS[i]}]: цифры ${found[i]!.join(',') || '—'} вместо ${want.join(',')}`); });
    }
    for (const key of Object.keys(EXPECTED_NUMBERS)) if (!seen.has(key)) bad.push(`${key}: ожидаются числа, а в тексте цифр нет`);
    expect(bad).toEqual([]);
  });

  it('keeps the main dictionary free of hard-coded numbers', () => {
    const bad = Object.entries(SPIRE_STRINGS).flatMap(([key, row]) => row.flatMap((v, i) => (digits(v).length ? [`${key}[${LANGS[i]}]`] : [])));
    expect(bad).toEqual([]);
  });

  it('client and server agree on the numbers the texts promise', () => {
    expect(SPIRE_ROOM_SIZE).toBe(SERVER_ROOM_SIZE);
    expect(SPIRE_ZONE_RATIO).toBe(SERVER_ZONE_RATIO);
    expect(SPIRE_STEP_TASK_COUNT).toBe(SERVER_STEP_TASK_COUNT);
  });
});
