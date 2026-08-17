// зачем: сторож правила «урок 1 = только to be» (владелец, 2026-08-17).
//
// Первая версия карты 56 сессий была ошибочной: она раскладывала по уроку 1
// настоящее простое, длительное, прошедшее, неправильные глаголы, будущее и
// сравнительную степень — материал уроков 2–12 по спецификации. Урок съедал
// треть курса, а на 31 оставшийся урок грамматики не оставалось.
//
// Владелец: «а как мы разобьём на 56 сессий, а потом ещё 32 урока, если в
// первых 10 сессиях уже что-то больше, чем to be?.. Значит все 56 сессий должны
// учить to be».
//
// Обычные тесты карты этот класс НЕ ловят: они проверяют форму записей (номера,
// типы, ссылки), а не то, ЧЕМУ сессия учит. Здесь проверяется именно смысл.
//
// Полные правила: docs/v2/LESSON_DESIGN_RULES.ru.md
import {
  EPISODE_01_SESSION_MAP_V1,
  type EpisodeSessionPlanEntry,
} from '../modules/learning-v2/content/source/episode_01_session_map_v1';

/**
 * Признаки чужой грамматики. Совпадение по подстроке: имена признаков растут,
 * и точный список пришлось бы догонять руками при каждой новой конструкции.
 */
const FOREIGN_GRAMMAR_FRAGMENTS: readonly string[] = Object.freeze([
  'present_simple',
  'past_',
  'future',
  'going_to',
  'modal_can',
  'continuous',
  'irregular',
  'do_not_verb',
  'question_do',
  'like_want',
  'comparative',
  'superlative',
  'there_is',
  'preposition_time',
  'preposition_duration',
  'preposition_direction',
  'verb_ing',
  'because',
  'frequency',
]);

/**
 * Точные запреты. Отдельно от подстрочных, потому что различие тонкое:
 * `third_person_singular` — это форма `is` глагола to be, она законна;
 * `third_person_s` — окончание -s у смыслового глагола (he works), это урок
 * про настоящее простое. Подстрокой их не разделить.
 */
const FOREIGN_GRAMMAR_EXACT: readonly string[] = Object.freeze([
  'third_person_s',
]);

function chapterOf(entry: EpisodeSessionPlanEntry): number {
  return Math.floor((entry.sessionOrdinal - 1) / 8) + 1;
}

describe('урок 1 — только to be', () => {
  test('ни одна сессия не учит чужой грамматике', () => {
    const offenders: string[] = [];
    for (const entry of EPISODE_01_SESSION_MAP_V1) {
      for (const feature of entry.teaches) {
        const hit =
          FOREIGN_GRAMMAR_FRAGMENTS.find((f) => feature.includes(f)) ??
          (FOREIGN_GRAMMAR_EXACT.includes(feature) ? feature : undefined);
        if (hit !== undefined) {
          offenders.push(
            `сессия ${entry.sessionOrdinal} «${entry.title}» учит «${feature}» — это не to be`,
          );
        }
      }
    }
    expect(offenders.join('\n')).toBe('');
  });

  test('ровно 56 сессий, номера подряд', () => {
    expect(EPISODE_01_SESSION_MAP_V1).toHaveLength(56);
    EPISODE_01_SESSION_MAP_V1.forEach((entry, index) => {
      expect(entry.sessionOrdinal).toBe(index + 1);
    });
  });

  test('ни одна сессия не ссылается вперёд', () => {
    const forward: string[] = [];
    for (const entry of EPISODE_01_SESSION_MAP_V1) {
      for (const dep of [...entry.builtOn, ...(entry.recalls ?? [])]) {
        if (dep >= entry.sessionOrdinal) {
          forward.push(`сессия ${entry.sessionOrdinal} ссылается на ${dep}`);
        }
        if (dep < 1 || dep > 56) {
          forward.push(`сессия ${entry.sessionOrdinal}: ссылка ${dep} вне 1..56`);
        }
      }
    }
    expect(forward.join('\n')).toBe('');
  });

  test('ни одна конструкция не вводится дважды', () => {
    const first = new Map<string, number>();
    const duplicates: string[] = [];
    for (const entry of EPISODE_01_SESSION_MAP_V1) {
      for (const feature of entry.teaches) {
        const seen = first.get(feature);
        if (seen !== undefined) {
          duplicates.push(`«${feature}»: сессии ${seen} и ${entry.sessionOrdinal}`);
        } else {
          first.set(feature, entry.sessionOrdinal);
        }
      }
    }
    expect(duplicates.join('\n')).toBe('');
  });

  test('ритм главы: восьмая — контрольная, седьмая — голос или припоминание', () => {
    const broken: string[] = [];
    for (let chapter = 0; chapter < 7; chapter += 1) {
      const seventh = EPISODE_01_SESSION_MAP_V1[chapter * 8 + 6];
      const eighth = EPISODE_01_SESSION_MAP_V1[chapter * 8 + 7];
      if (eighth.kind !== 'checkpoint') {
        broken.push(
          `глава ${chapter + 1}: сессия ${eighth.sessionOrdinal} закрывает главу, но kind=${eighth.kind}`,
        );
      }
      if (!['voice', 'recall'].includes(seventh.kind)) {
        broken.push(
          `глава ${chapter + 1}: сессия ${seventh.sessionOrdinal} перед контрольной, но kind=${seventh.kind}`,
        );
      }
    }
    expect(broken.join('\n')).toBe('');
  });

  test('контрольные не вводят новых конструкций', () => {
    const offenders = EPISODE_01_SESSION_MAP_V1.filter(
      (entry) => entry.kind === 'checkpoint' && entry.teaches.length > 0,
    ).map((entry) => `сессия ${entry.sessionOrdinal}: ${entry.teaches.join(', ')}`);
    expect(offenders.join('\n')).toBe('');
  });

  test('таблица to be закрывается к четвёртой главе', () => {
    // Смысловая проверка порядка: лица вводятся по нарастанию, а не вразнобой.
    const introducedAt = (feature: string): number => {
      const entry = EPISODE_01_SESSION_MAP_V1.find((e) =>
        e.teaches.includes(feature),
      );
      if (!entry) throw new Error(`признак «${feature}» не вводится нигде`);
      return entry.sessionOrdinal;
    };
    const first = introducedAt('first_person_singular');
    const second = introducedAt('second_person');
    const third = introducedAt('third_person_pronoun');
    const plural = introducedAt('plural_pronoun');
    expect(first).toBeLessThan(second);
    expect(second).toBeLessThan(third);
    expect(third).toBeLessThan(plural);
    // Вся таблица закрыта до конца четвёртой главы (сессия 32).
    expect(chapterOf(EPISODE_01_SESSION_MAP_V1[plural - 1])).toBeLessThanOrEqual(4);
  });
});
