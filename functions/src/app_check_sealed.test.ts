// зачем: сторож пломбы App Check. Решение владельца 2026-08-17, дословно:
// «апп чек навсегда убрать из расчёта и поставить маркер для будущих нейронок.
// Апп чек мы не делаем и не просим никогда... заблокировать, запломбировать,
// убрать отовсюду и больше никогда не вспоминать».
//
// Этот файл — исполняемая форма запрета. Комментарий в callable_options.ts
// объясняет ПОЧЕМУ, а здесь проверяется ЧТО. Без такого сторожа запрет живёт
// ровно до следующего агента, который «заодно включит для безопасности»:
// именно так уже дважды падал прод (админка 2026-08-03, курс 2026-08-16).
//
// СРАБОТАЛ СТОРОЖ? Снимай энфорс, а не сторожа. Если владелец сам передумал —
// он скажет об этом прямо, и тогда снимается пломба целиком, вместе с этим
// файлом и комментарием в callable_options.ts.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');

function productionSources(): readonly string[] {
  const out = execSync('git ls-files functions/src', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.endsWith('.ts'))
    .filter((s) => !s.endsWith('.test.ts'));
}

describe('App Check запломбирован навсегда (решение владельца 2026-08-17)', () => {
  test('ни одна боевая функция не требует App Check', () => {
    const offenders: string[] = [];
    for (const rel of productionSources()) {
      // Сам файл пломбы содержит слова запрета в комментариях — он исключение.
      if (rel.endsWith('callable_options.ts')) continue;
      const text = readFileSync(path.join(REPO_ROOT, rel), 'utf8');
      const lines = text.split('\n');
      lines.forEach((line, index) => {
        if (/^\s*(\/\/|\*)/.test(line)) return; // комментарии не считаем
        if (/enforceAppCheck:\s*true/.test(line)) {
          offenders.push(`${rel}:${index + 1} — ${line.trim()}`);
        }
      });
    }
    expect(
      offenders.join('\n') ||
        '', // пусто = чисто
    ).toBe('');
  });

  test('флаги захардкожены в false и не читают окружение', () => {
    const text = readFileSync(
      path.join(REPO_ROOT, 'functions/src/callable_options.ts'),
      'utf8',
    );
    // Ни один флаг не должен зависеть от process.env: иначе правка окружения
    // тихо вернёт энфорс и положит прод, как в обоих инцидентах.
    const envReads = text
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*)/.test(line))
      .filter((line) => /process\.env\.ENFORCE_APP_CHECK/.test(line));
    expect(envReads).toEqual([]);
  });

  test('значения флагов действительно false', async () => {
    const mod = await import('./callable_options');
    expect(mod.ENFORCE_APP_CHECK).toBe(false);
    expect(mod.ENFORCE_APP_CHECK_SENSITIVE).toBe(false);
    expect(mod.ENFORCE_APP_CHECK_OPENAI).toBe(false);
    expect(mod.ENFORCE_APP_CHECK_ADMIN).toBe(false);
    expect(mod.ADMIN_SENSITIVE_WRITE_OPTIONS.enforceAppCheck).toBe(false);
    expect(mod.HOT_CALLABLE_OPTIONS.enforceAppCheck).toBe(false);
  });

  test('маркер пломбы на месте — по нему ищут будущие агенты', () => {
    const text = readFileSync(
      path.join(REPO_ROOT, 'functions/src/callable_options.ts'),
      'utf8',
    );
    expect(text).toContain('APP_CHECK_SEALED_BY_OWNER_2026_08_17');
    expect(text).toContain('ЗАПЛОМБИРОВАН НАВСЕГДА');
  });
});
