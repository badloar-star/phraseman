import fs from 'node:fs';
import path from 'node:path';

/**
 * СТОРОЖ КОНТРАКТА ДАННЫХ ДЖАРВИСА.
 *
 * зачем (владелец, 2026-08-02): впереди много рефакторингов. Джарвис читает
 * чужие коллекции и чужие поля, но НЕ участвует в их изменении. Если кто-то
 * переименует поле или коллекцию, департамент не упадёт — он просто начнёт
 * возвращать нули, то есть будет БОДРО ВРАТЬ, что всё хорошо. Молчаливая ложь
 * опаснее явной поломки: её никто не заметит, пока не потеряются деньги или
 * ребёнок не останется без разбора жалобы.
 *
 * Поэтому связь «департамент → поле-источник» закреплена здесь. Тест ломается,
 * когда поле пропало из места записи ИЛИ из читателя Джарвиса. Сломался —
 * значит нужно осознанно решить: обновить Джарвиса под новую схему или вернуть
 * поле. Молча разойтись контракты больше не могут.
 *
 * Как чинить: если поле переименовано — обнови ОБА места (запись и читатель
 * Джарвиса) и строку в таблице ниже. Не удаляй проверку, чтобы «стало зелёно».
 */

const root = path.resolve(__dirname, '../../..');
const functionsSrc = path.join(root, 'functions', 'src');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(functionsSrc, relativePath), 'utf8');
}

interface FieldContract {
  /** Департамент, который сломается молча. */
  readonly department: string;
  /** Файл, где поле ПИШЕТСЯ (источник истины). */
  readonly writtenIn: string;
  /** Файл Джарвиса, который это поле ЧИТАЕТ. */
  readonly readIn: string;
  /** Имя поля, обязанное совпадать по обе стороны. */
  readonly field: string;
  /** Что именно сломается, если поле исчезнет. */
  readonly breaks: string;
}

/**
 * Таблица зависимостей. Каждая строка — обещание: «пока это поле пишется,
 * департамент видит правду».
 */
const FIELD_CONTRACTS: readonly FieldContract[] = [
  {
    department: 'safety',
    writtenIn: 'ai_safety.ts',
    readIn: 'jarvis/safety_firestore_fetcher.ts',
    field: 'handled',
    breaks: 'необработанные жалобы стали бы считаться разобранными',
  },
  {
    department: 'safety',
    writtenIn: 'record_age_consent_snapshot.ts',
    readIn: 'jarvis/safety_firestore_fetcher.ts',
    field: 'ageBracket',
    breaks: 'жалобы на детских аккаунтах перестали бы выделяться из общей очереди',
  },
  {
    department: 'support',
    writtenIn: 'support_inbox.ts',
    readIn: 'jarvis/support_firestore_fetcher.ts',
    field: 'receivedAtMs',
    breaks: 'время ожидания ответа стало бы неизмеримым',
  },
  {
    department: 'support',
    writtenIn: 'support_inbox.ts',
    readIn: 'jarvis/support_firestore_fetcher.ts',
    field: 'repliedAt',
    breaks: 'скорость ответа перестала бы считаться',
  },
  {
    department: 'support',
    writtenIn: 'support_inbox.ts',
    readIn: 'jarvis/support_firestore_fetcher.ts',
    field: 'mailCategory',
    breaks: 'письма роботов попали бы в очередь ожидающих ответа людей',
  },
  {
    department: 'content + factory',
    writtenIn: 'jarvis/content_lesson_stats.ts',
    readIn: 'jarvis/content_firestore_fetcher.ts',
    field: 'sampleCount',
    breaks: 'обрыв пути ученика перестал бы находиться',
  },
  {
    department: 'content',
    writtenIn: 'jarvis/content_lesson_stats.ts',
    readIn: 'jarvis/content_firestore_fetcher.ts',
    field: 'averageScore',
    breaks: 'сломанные уроки перестали бы находиться',
  },
];

describe('Jarvis data contract — silence must never replace a broken source', () => {
  test.each(FIELD_CONTRACTS)(
    '[$department] поле "$field" живо и там, где пишется, и там, где Джарвис его читает',
    ({ writtenIn, readIn, field, breaks }) => {
      const writer = readSource(writtenIn);
      const reader = readSource(readIn);

      // зачем сравнивать строки, а не булево: у expect в этой версии Jest нет
      // аргумента с сообщением, а голое `false !== true` не объясняет, что
      // именно сломалось. Текст вшит в сравниваемое значение и виден в отчёте.
      const writerVerdict = writer.includes(field)
        ? 'ok'
        : `ПОЛЕ ПРОПАЛО: "${field}" больше не пишется в ${writtenIn} — ${breaks}`;
      expect(writerVerdict).toBe('ok');

      const readerVerdict = reader.includes(field)
        ? 'ok'
        : `ДЖАРВИС ОСЛЕП: "${field}" больше не читается в ${readIn} — ${breaks}`;
      expect(readerVerdict).toBe('ok');
    },
  );

  test('каждая коллекция, которую читает Джарвис, закрыта правилами Firestore', () => {
    // зачем: новая коллекция без правила попадает под общий admin-catch-all и
    // может оказаться доступнее, чем задумано. Проверяем явное упоминание.
    const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
    const jarvisDir = path.join(functionsSrc, 'jarvis');
    const collections = new Set<string>();

    for (const file of fs.readdirSync(jarvisDir)) {
      if (!file.endsWith('.ts') || file.includes('.test.')) continue;
      const source = fs.readFileSync(path.join(jarvisDir, file), 'utf8');
      for (const match of source.matchAll(/collection\('([a-z_]+)'\)/g)) {
        collections.add(match[1]);
      }
    }

    expect(collections.size).toBeGreaterThan(0);
    for (const name of collections) {
      const verdict = rules.includes(`/${name}/`)
        ? 'ok'
        : `КОЛЛЕКЦИЯ БЕЗ ПРАВИЛА: "${name}" читается Джарвисом, но не описана в firestore.rules`;
      expect(verdict).toBe('ok');
    }
  });

  test('каждый департамент подключён к общему своду — иначе он невидим владельцу', () => {
    // зачем: департамент можно написать и забыть подключить. Тогда он есть в
    // коде, но его нет в панели — а выглядит это как «проблем не найдено».
    const decision = readSource('jarvis/decision.ts');
    const snapshot = readSource('jarvis/all_departments_snapshot.ts');

    const unionMatch = decision.match(/export type Department =([^;]+);/);
    expect(unionMatch).not.toBeNull();

    const departments = [...(unionMatch?.[1] ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect(departments.length).toBeGreaterThanOrEqual(8);

    for (const department of departments) {
      const verdict = snapshot.includes(`'${department}'`)
        ? 'ok'
        : `ДЕПАРТАМЕНТ НЕ ПОДКЛЮЧЁН: "${department}" объявлен, но отсутствует в all_departments_snapshot.ts — владелец его не увидит`;
      expect(verdict).toBe('ok');
    }
  });

  test('панель админки знает каждый департамент по имени', () => {
    // зачем: незнакомый департамент отрисовался бы серым «payments»-подобным
    // кодом вместо названия — владелец не понял бы, о чём речь.
    const decision = readSource('jarvis/decision.ts');
    const panel = fs.readFileSync(path.join(root, 'admin', 'v2', 'legacy.html'), 'utf8');

    const unionMatch = decision.match(/export type Department =([^;]+);/);
    const departments = [...(unionMatch?.[1] ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);

    const metaMatch = panel.match(/const JF_DEPARTMENT_META = \{([\s\S]*?)\n {2}\};/);
    expect(metaMatch).not.toBeNull();
    const meta = metaMatch?.[1] ?? '';

    for (const department of departments) {
      const verdict = new RegExp(`\\b${department}:`).test(meta)
        ? 'ok'
        : `ПАНЕЛЬ НЕ ЗНАЕТ ДЕПАРТАМЕНТ: "${department}" отсутствует в JF_DEPARTMENT_META (admin/v2/legacy.html)`;
      expect(verdict).toBe('ok');
    }
  });
});
