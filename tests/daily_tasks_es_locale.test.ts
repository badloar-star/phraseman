import type { DailyTask } from '../app/daily_tasks';
import { ALL_TASKS, withDailyTaskSpanishCopy } from '../app/daily_tasks';
import { DAILY_TASK_STRINGS_ES, localizedDailyTaskStrings } from '../app/daily_tasks_es_locale';

const dummyTask = (id: string): DailyTask => ({
  id,
  type: 'daily_active',
  icon: '☀️',
  target: 1,
  xp: 15,
  titleRU: 'RU title',
  titleUK: 'UK title',
  descRU: 'RU desc',
  descUK: 'UK desc',
});

describe('localizedDailyTaskStrings', () => {
  it('returns Ukrainian copy for uk', () => {
    const t = dummyTask('da1');
    const { title } = localizedDailyTaskStrings('uk', t);
    expect(title).toBe('UK title');
  });

  it('returns Spanish curated copy for known id', () => {
    const { title } = localizedDailyTaskStrings('es', dummyTask('da1'));
    expect(title).toBe(DAILY_TASK_STRINGS_ES.da1.title);
  });

  it('uses direct titleES/descES fields when a task is enriched', () => {
    const task = withDailyTaskSpanishCopy(dummyTask('da1'));
    const { title, desc } = localizedDailyTaskStrings('es', task);

    expect(task.titleES).toBe(DAILY_TASK_STRINGS_ES.da1.title);
    expect(title).toBe(task.titleES);
    expect(desc).toBe(task.descES);
  });

  it('has Spanish copy for every production daily task id', () => {
    const missing = ALL_TASKS
      .filter((task) => !DAILY_TASK_STRINGS_ES[task.id])
      .map((task) => task.id);

    expect(missing).toEqual([]);
  });

  it('returns empty Spanish copy when no explicit ES source exists', () => {
    const t = dummyTask('__unknown_id__');
    const { title, desc } = localizedDailyTaskStrings('es', t);
    expect(title).toBe('');
    expect(desc).toBe('');
  });

  it.each([
    ['pt-BR', 'titlePtBr', 'descPtBr'],
    ['vi', 'titleVi', 'descVi'],
    ['id', 'titleId', 'descId'],
    ['tr', 'titleTr', 'descTr'],
    ['pl', 'titlePl', 'descPl'],
  ] as const)('returns only explicit planned daily-task copy for %s', (lang, titleField, descField) => {
    const task = {
      ...dummyTask('da1'),
      [titleField]: `${lang} title`,
      [descField]: `${lang} desc`,
    };

    expect(localizedDailyTaskStrings(lang, task).title).toBe(`${lang} title`);
    expect(localizedDailyTaskStrings(lang, task).desc).toBe(`${lang} desc`);
    expect(localizedDailyTaskStrings(lang, dummyTask('da1')).title).toBe('');
  });

  it('has planned locale copy for every production daily task id', () => {
    const missing = ALL_TASKS.flatMap((task) => {
      const fields = [
        task.titlePtBr,
        task.descPtBr,
        task.titleVi,
        task.descVi,
        task.titleId,
        task.descId,
        task.titleTr,
        task.descTr,
        task.titlePl,
        task.descPl,
      ];
      return fields.every((value) => typeof value === 'string' && value.trim()) ? [] : [task.id];
    });

    expect(missing).toEqual([]);
  });

  it('does not route daily task locale selection through legacy runtime markers', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const source = fs.readFileSync(path.join(__dirname, '../app/daily_tasks_es_locale.ts'), 'utf8');
    const legacyRuntimePattern = /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;

    expect(source).not.toMatch(legacyRuntimePattern);
  });
});
