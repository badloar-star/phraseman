import fs from 'fs';
import path from 'path';

/**
 * Сторож зарезервированных идентификаторов документов Firestore.
 *
 * ИНЦИДЕНТ 2026-08-29. Firestore резервирует любой id документа вида `__…__` и
 * отвечает на него `INVALID_ARGUMENT: Resource id "…" is invalid because it is
 * reserved` — причём бросок происходит прямо из `.doc()`, ещё до сети.
 *
 * В проекте таких имён оказалось два, и оба были мертвы с рождения:
 *   • `__index__` (маркер обратного индекса исходящих заявок) — бросок валил
 *     стадию `collect_peers`, а через неё ВСЁ удаление аккаунта. Пять боевых
 *     задач умерли с `account_delete_failed`, данные людей, запросивших
 *     удаление, остались в базе;
 *   • `__profile__` (лайк профиля без конкретного события) — документ
 *     `my_events/__profile__` не мог быть записан никогда.
 *
 * Ошибка не ловилась обычными тестами, потому что те работают на моках, где
 * `.doc('__x__')` спокойно проходит. Поэтому проверка — статическая: имя,
 * попадающее в путь Firestore, не имеет права быть зарезервированным.
 *
 * Сработал сторож — переименуй константу (точка в имени делает коллизию с
 * настоящим uid невозможной), а не ослабляй проверку.
 */

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'modules', 'shared', 'functions/src'];

/** Формат, который Firestore считает зарезервированным. */
const RESERVED_ID = /^__.*__$/;

/**
 * `__proto__`, `prototype`, `constructor` в этих файлах — защита от prototype
 * pollution при разборе JSON, а не идентификаторы документов.
 */
const PROTOTYPE_POLLUTION_GUARDS = new Set(['__proto__', 'prototype', 'constructor']);

/**
 * Идентификаторы, которые НИКОГДА не доходят до Firestore.
 *
 * Каждая запись обязана быть доказана: id живёт только в памяти или в SQLite,
 * ни один путь не ведёт в `.doc()`/`.collection()`. Добавлять сюда что-то,
 * что пишется в базу, запрещено — именно так и появился инцидент.
 */
const NON_FIRESTORE_IDS = new Set([
  // Синтетический тост-сводка достижений: живёт в состоянии React, в базу не
  // пишется (проверено 2026-08-29 — константа не покидает AchievementContext).
  '__achievement_summary__',
]);

/** Грубо вырезает комментарии, чтобы примеры в документации не считались кодом. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Каталоги-паразиты: копии дерева и сборки раздували обход до heap OOM. */
const SKIP_DIRS = new Set(['node_modules', 'lib', 'dist', 'build', '.codex-tmp', 'worktrees']);

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function sourceFiles(): string[] {
  return SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
}

/**
 * Читает файл только если в нём вообще есть `__` — дешёвый префильтр.
 * зачем: без него regex-обход 3.7k файлов упирался в heap OOM (известная
 * болезнь этого репозитория, см. память project_jest_codex_tmp_heap_oom).
 */
function readCandidate(file: string): string | null {
  const text = fs.readFileSync(file, 'utf8');
  return text.includes('__') ? text : null;
}

describe('Firestore reserved document ids', () => {
  it('ни одна константа-идентификатор не использует зарезервированную форму __x__', () => {
    const offenders: string[] = [];
    // Константы, чьё имя выдаёт назначение «идентификатор документа/маркер».
    const constantPattern =
      /\b(?:const|let)\s+([A-Za-z0-9_]*(?:_ID|_MARKER|_MARKER_ID|_DOC|_DOC_ID))\s*=\s*['"]([^'"]+)['"]/g;

    for (const file of sourceFiles()) {
      const raw = readCandidate(file);
      if (!raw) continue;
      const text = stripComments(raw);
      for (const match of text.matchAll(constantPattern)) {
        const [, name, value] = match;
        if (!RESERVED_ID.test(value)) continue;
        if (PROTOTYPE_POLLUTION_GUARDS.has(value)) continue;
        if (NON_FIRESTORE_IDS.has(value)) continue;
        offenders.push(`${path.relative(ROOT, file)}: ${name} = '${value}'`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('в .doc() не передаётся зарезервированный литерал', () => {
    const offenders: string[] = [];
    const docLiteral = /\.doc\(\s*['"](__[^'"]*__)['"]\s*\)/g;

    for (const file of sourceFiles()) {
      const raw = readCandidate(file);
      if (!raw) continue;
      const text = stripComments(raw);
      for (const match of text.matchAll(docLiteral)) {
        if (PROTOTYPE_POLLUTION_GUARDS.has(match[1])) continue;
        offenders.push(`${path.relative(ROOT, file)}: .doc('${match[1]}')`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('firestore.rules не сверяются с зарезервированным именем', () => {
    // зачем: правила ЗАШИВАЛИ '__index__' строкой, и обычный поиск по .ts его
    // не находил. Без этой проверки маркер снова стал бы неписуемым — даже с
    // исправленной константой в коде.
    const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
    const withoutComments = rules.replace(/^\s*\/\/.*$/gm, '');
    const reservedLiterals = [...withoutComments.matchAll(/'(__[^']*__)'/g)].map((m) => m[1]);
    expect(reservedLiterals).toEqual([]);
  });

  it('имя маркера в правилах совпадает с контрактом', () => {
    const contract = fs.readFileSync(
      path.join(ROOT, 'shared/friend_requests_index_contract.ts'),
      'utf8',
    );
    const marker = contract.match(/FRIEND_REQUESTS_SENT_MARKER_ID\s*=\s*['"]([^'"]+)['"]/)![1];
    const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
    // Правила обязаны пропускать ровно тот же служебный id, иначе запись
    // маркера отвергается и удаление аккаунта снова уходит в полный перебор.
    expect(rules).toContain(`toUid == '${marker}'`);
    expect(rules).toContain(`toUid != '${marker}'`);
  });

  it('клиент и сервер используют один id лайка профиля', () => {
    // зачем: обе стороны хешируют eventId в id документа. Разойдутся значения —
    // клиент перестанет находить собственные лайки.
    const pick = (rel: string): string => (
      fs.readFileSync(path.join(ROOT, rel), 'utf8')
        .match(/PROFILE_LIKE_EVENT_ID\s*=\s*['"]([^'"]+)['"]/)![1]
    );
    expect(pick('app/friend_activity_likes.ts')).toBe(pick('functions/src/friend_activity_likes.ts'));
  });

  it('вылеченные константы остаются валидными идентификаторами', () => {
    const contract = fs.readFileSync(
      path.join(ROOT, 'shared/friend_requests_index_contract.ts'),
      'utf8',
    );
    const marker = contract.match(/FRIEND_REQUESTS_SENT_MARKER_ID\s*=\s*['"]([^'"]+)['"]/);
    expect(marker).not.toBeNull();
    expect(RESERVED_ID.test(marker![1])).toBe(false);
    // Точка невозможна ни в Firebase-uid, ни в UUID — коллизия с настоящим
    // идентификатором пользователя исключена конструктивно.
    expect(marker![1]).toContain('.');

    const likes = fs.readFileSync(
      path.join(ROOT, 'functions/src/friend_activity_likes.ts'),
      'utf8',
    );
    const profile = likes.match(/PROFILE_LIKE_EVENT_ID\s*=\s*['"]([^'"]+)['"]/);
    expect(profile).not.toBeNull();
    expect(RESERVED_ID.test(profile![1])).toBe(false);
    expect(profile![1]).toContain('.');
  });

  it('каждый прогон удаления оставляет диагностику в Firestore', () => {
    // зачем (правило владельца «сперва логи, потом починка»): трассировка
    // уходила ТОЛЬКО в Cloud Logging, куда у владельца нет доступа. Из-за
    // этого пять боевых удалений подряд падали, а причина была невидима.
    const source = fs.readFileSync(path.join(ROOT, 'functions/src/account_delete.ts'), 'utf8');
    // Отдельная коллекция, закрытая правилами, без uid и email.
    expect(source).toContain("ACCOUNT_DELETE_DIAGNOSTICS = 'account_deletion_diagnostics'");
    // Пишем на ОБОИХ исходах: без «как выглядит норма» отказ нечитаем.
    expect(source).toContain("persistAccountDeleteDiagnostics(db, ctx, stats, 'completed')");
    expect(source).toContain("persistAccountDeleteDiagnostics(db, ctx, stats, 'failed')");
    // Стадия падения обязана называться поимённо.
    expect(source).toContain('ctx.failedStage = stage');
    expect(source).toContain('account_delete_failed at ${stage}');
    // Диагностика не имеет права уронить удаление, но и молчать не смеет.
    expect(source).toContain('account_delete_diagnostics_write_failed');

    const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
    expect(rules).toContain('match /account_deletion_diagnostics/{runId}');
  });

  it('обрыв удаления в интерфейсе доезжает до сервера', () => {
    // зачем: DebugLogger пишет в Firestore только severity 'critical'
    // (writeToFirestore в app/debug-logger.ts). С 'warning' след оставался на
    // устройстве ушедшего человека и владельцу не доставался.
    const trace = fs.readFileSync(path.join(ROOT, 'app/account_delete_ui_trace.ts'), 'utf8');
    expect(trace).toContain("outcome === 'handoff_failed' ? 'critical' : 'warning'");
  });

  it('удаление аккаунта не падает целиком из-за нечитаемого обратного индекса', () => {
    const source = fs.readFileSync(path.join(ROOT, 'functions/src/account_delete.ts'), 'utf8');
    // Оба чтения индекса обязаны быть в try/catch с логом причины: индекс —
    // лишь подсказка, его отказ понижает до полного перебора, но не отменяет
    // удаление данных человека.
    expect(source).toContain('account_delete_sent_index_marker_unreadable');
    expect(source).toContain('account_delete_sent_index_unreadable');
    // Причина отказа обязана доезжать до job.lastError, а не стираться.
    expect(source).toContain('`account_delete_failed: ${');
  });
});
