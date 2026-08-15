import * as fs from 'fs';
import * as path from 'path';
import { ARENA_SOUNDS, type ArenaSoundKey } from '../modules/arena/sound_catalog';

/**
 * Расстановка вызовов звуков.
 *
 * Каталог и промпты сходятся сами по себе, но звук, у которого нет ни одного
 * места вызова, никогда не прозвучит — и заметить это можно только ушами,
 * причём после того, как файлы уже сгенерированы и оплачены временем.
 *
 * Здесь проверяется третья сторона треугольника: каждый звук из каталога
 * где-то вызывается, а вызовы идут через каталог, а не строками.
 */

const ROOT = path.resolve(__dirname, '..');

const SOURCES = [
  'app/arena_match.tsx',
  'app/arena_matchmaking.tsx',
  'app/arena_results.tsx',
  'components/arena/ArenaQuestion.tsx',
  'components/arena/ArenaTimerRing.tsx',
  'components/arena/ArenaVersusIntro.tsx',
  'components/arena/ArenaDailyGoals.tsx',
  'hooks/use_arena_sound.ts',
];

const all = SOURCES.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')).join('\n');

/** Звуки, которые звучат не по коду экрана, а по готовности файлов. */
const NOT_WIRED_YET: readonly ArenaSoundKey[] = [
  // Фон поиска — зацикленная подложка; включать её до появления файла нечем,
  // а пустой цикл в директоре смысла не имеет.
  'searchLoop',
];

describe('вызовы идут через каталог', () => {
  it('идентификаторы событий нигде не написаны строкой', () => {
    // Строка молча рассинхронизируется с каталогом, и звук перестаёт звучать.
    for (const rel of SOURCES.filter((name) => !name.endsWith('use_arena_sound.ts'))) {
      const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(source).not.toContain('pm.arena.');
    }
  });

  it('единственная точка входа — общий хук', () => {
    const hook = fs.readFileSync(path.join(ROOT, 'hooks/use_arena_sound.ts'), 'utf8');
    expect(hook).toContain('arenaSoundEventId');
    expect(hook).toContain('soundDirector.request');
  });
});

describe('каждый звук где-то вызывается', () => {
  const wired = ARENA_SOUNDS.filter((spec) => !NOT_WIRED_YET.includes(spec.key));

  it('вызовов больше, чем неподключённых', () => {
    expect(wired.length).toBeGreaterThan(NOT_WIRED_YET.length * 3);
  });

  it.each(wired.map((spec) => spec.key))('звук %s вызывается', (key) => {
    expect(all).toContain(`'${key}'`);
  });

  /** Список неподключённых существует явно, чтобы он не рос молча. */
  it('неподключённые звуки перечислены осознанно', () => {
    for (const key of NOT_WIRED_YET) {
      expect(ARENA_SOUNDS.some((spec) => spec.key === key)).toBe(true);
    }
    expect(NOT_WIRED_YET.length).toBeLessThanOrEqual(4);
  });
});

describe('звуки не звучат очередью', () => {
  /**
   * Экран результата перерисовывается несколько раз, пока догружаются
   * косметика и награды. Без защёлки фанфара играла бы на каждой перерисовке.
   */
  it('исход матча защёлкивается', () => {
    const results = fs.readFileSync(path.join(ROOT, 'app/arena_results.tsx'), 'utf8');
    expect(results).toContain('outcomeToldRef');
  });

  /** Первый показ уже выполненных целей звучать не должен. */
  it('цель дня звучит на переход, а не на наличие', () => {
    const goals = fs.readFileSync(path.join(ROOT, 'components/arena/ArenaDailyGoals.tsx'), 'utf8');
    expect(goals).toContain('seenRef.current === null');
  });

  /** Индикатор соперника иначе трещал бы на каждой перерисовке. */
  it('соперник озвучивается один раз на задание', () => {
    const match = fs.readFileSync(path.join(ROOT, 'app/arena_match.tsx'), 'utf8');
    expect(match).toContain('rivalToldRef');
  });

  /** Закрытый исход появляется ровно один раз, фаза — нет. */
  it('просрочка и звёзды звучат по закрытому заданию', () => {
    const match = fs.readFileSync(path.join(ROOT, 'app/arena_match.tsx'), 'utf8');
    expect(match).toContain('lastOutcomeRef');
  });
});
