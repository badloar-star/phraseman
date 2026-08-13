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
    writtenIn: 'ai_safety.ts',
    readIn: 'jarvis/safety_firestore_fetcher.ts',
    field: 'ageEvidence',
    breaks: 'неподтверждённый возраст стал бы выглядеть как доказанный взрослый возраст',
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
    field: 'status',
    breaks: 'автоматически отвеченные письма продолжили бы выглядеть ожидающими ответа',
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
    department: 'support',
    writtenIn: 'support_inbox.ts',
    readIn: 'jarvis/support_firestore_fetcher.ts',
    field: 'triageState',
    breaks: 'неразмеченный legacy-спам снова стал бы выглядеть как доказанный живой SLA',
  },
  {
    department: 'support',
    writtenIn: 'support_inbox.ts',
    readIn: 'jarvis/support_firestore_fetcher.ts',
    field: 'imapSyncedAt',
    breaks: 'устаревший IMAP-снимок выглядел бы как пустая живая очередь',
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
  {
    department: 'retention + app tier',
    writtenIn: 'revenuecat_shards.ts',
    readIn: 'jarvis/retention_firestore_fetcher.ts',
    field: 'last_active_at',
    breaks: 'удержание показало бы нули, а тир приложения занизился бы до seed',
  },
  {
    department: 'growth',
    writtenIn: 'growth_daily_aggregate.ts',
    readIn: 'jarvis/growth_firestore_fetcher.ts',
    field: 'newUsers',
    breaks: 'серверный суточный приток стал бы неизвестен, а legacy sample нельзя выдавать за точное число',
  },
  {
    department: 'cohort retention',
    writtenIn: 'jarvis/learning_metrics.ts',
    readIn: 'jarvis/learning_metrics.ts',
    field: 'cohortSize',
    breaks: 'размер D1/D7 когорты стал бы неизвестен',
  },
  {
    department: 'cohort retention',
    writtenIn: 'jarvis/learning_metrics.ts',
    readIn: 'jarvis/learning_metrics.ts',
    field: 'd1ReturningUsers',
    breaks: 'D1 retention стал бы ложным нулём',
  },
  {
    department: 'cohort retention',
    writtenIn: 'jarvis/learning_metrics.ts',
    readIn: 'jarvis/learning_metrics.ts',
    field: 'd7ReturningUsers',
    breaks: 'D7 retention стал бы ложным нулём',
  },
  {
    department: 'PM business context',
    writtenIn: 'admin_daily_digest.ts',
    readIn: 'jarvis/pm_business_context.ts',
    field: 'generatedAtMs',
    breaks: 'устаревший сравнительный дайджест стал бы выглядеть свежим бизнес-контекстом',
  },
  {
    department: 'PM business context',
    writtenIn: 'admin_daily_digest.ts',
    readIn: 'jarvis/pm_business_context.ts',
    field: 'comparisons',
    breaks: 'Джарвис потерял бы current-vs-previous динамику и снова видел бы только текущие счётчики',
  },
];

describe('Jarvis data contract — silence must never replace a broken source', () => {
  test('the real safety_flags writer and Jarvis share one explicit age taxonomy contract', () => {
    const { SAFETY_FLAG_WRITER_AGE_CONTRACT } = require('../ai_safety') as typeof import('../ai_safety');
    const { JARVIS_SAFETY_FLAG_AGE_CONTRACT } = require('./safety_firestore_fetcher') as typeof import('./safety_firestore_fetcher');

    expect(SAFETY_FLAG_WRITER_AGE_CONTRACT).toBeDefined();
    expect(JARVIS_SAFETY_FLAG_AGE_CONTRACT).toBe(SAFETY_FLAG_WRITER_AGE_CONTRACT);
    expect(SAFETY_FLAG_WRITER_AGE_CONTRACT).toEqual({
      consentAgeValues: ['adult', 'unknown'],
      evidenceStates: ['confirmed_adult', 'age_unverified', 'unavailable'],
    });
  });

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
      // Only Firestore roots need a top-level rule. A chained `.collection()` is a
      // subcollection and inherits the rule match of its root; treating it as a
      // root makes legitimate nested schemas fail this guard.
      for (const match of source.matchAll(/(?:\bdb|\.db)\.collection\('([a-z_]+)'\)/g)) {
        collections.add(match[1]);
      }
    }

    expect(collections.size).toBeGreaterThan(0);
    expect(collections).not.toContain('sources');
    expect(collections).not.toContain('buckets');
    expect(collections).not.toContain('affected_users');
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

describe('level reward spin Jarvis impact', () => {
  test('records the new server schema as intentionally unread by Jarvis until a metric is approved', () => {
    const writer = readSource('level_reward_spins.ts');
    expect(writer).toContain("collection('level_spin_credits')");
    expect(writer).toContain("collection('level_spin_results')");
    expect(writer).toContain('level_reward_spin_balance');

    const jarvisDir = path.join(functionsSrc, 'jarvis');
    const readers = fs.readdirSync(jarvisDir)
      .filter((file) => file.endsWith('.ts') && !file.includes('.test.'))
      .map((file) => fs.readFileSync(path.join(jarvisDir, file), 'utf8'))
      .join('\n');
    expect(readers).not.toContain('level_spin_credits');
    expect(readers).not.toContain('level_spin_results');
    expect(readers).not.toContain('level_reward_spin_balance');
  });
});
