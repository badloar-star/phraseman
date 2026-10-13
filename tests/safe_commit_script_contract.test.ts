/**
 * Сторож scripts/safe_commit.sh — общего безопасного коммита параллельных сессий (координатор 13.10).
 *
 * зачем: скрипт закрывает аварии недели — чужие хунки в коммите, сверка numstat задолго до коммита, коммит кода вне окна.
 * Проверка ЖИВАЯ: скрипт гоняется во временном git-репозитории (без хуков, свой замок), а не по тексту файла —
 * «текст на месте, а поведение сломано» здесь не пройдёт. Сработал — чинить скрипт, а не ослаблять сторожа.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCRIPT = path.join(__dirname, '..', 'scripts', 'safe_commit.sh');
const BASH_CANDIDATES = ['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files/Git/usr/bin/bash.exe', 'bash'];
const BASH = BASH_CANDIDATES.find((b) => b === 'bash' || fs.existsSync(b)) ?? 'bash';

let repo = '';
let lock = '';

function git(...args: string[]): string {
  const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}: ${r.stderr}`);
  return r.stdout.trim();
}

function run(args: string[], env: Record<string, string> = {}): { code: number | null; out: string } {
  const r = spawnSync(BASH, [SCRIPT, ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, SAFE_COMMIT_LOCK: lock, SAFE_COMMIT_IGNORE_WINDOW: '1', ...env },
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const write = (rel: string, text: string): void => {
  fs.mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true });
  fs.writeFileSync(path.join(repo, rel), text);
};
const commits = (): number => Number(git('rev-list', '--count', 'HEAD'));

beforeEach(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-commit-'));
  lock = path.join(repo, '..', `${path.basename(repo)}.lock`);
  fs.mkdirSync(path.join(repo, '.nohooks'));
  git('init', '-q');
  git('config', 'user.email', 't@t');
  git('config', 'user.name', 't');
  git('config', 'core.hooksPath', '.nohooks');
  git('config', 'core.autocrlf', 'false');
  write('f.txt', 'a\nb\nc\n');
  write('app/x.ts', 'x\n');
  write('msg.txt', 'test: safe commit\n');
  git('add', 'f.txt', 'app/x.ts');
  git('commit', '-qm', 'init');
});

afterEach(() => {
  fs.rmSync(repo, { recursive: true, force: true });
});

describe('safe_commit.sh', () => {
  it('отказ, если numstat в момент коммита не совпал с ожиданием (чужие строки в файле)', () => {
    write('f.txt', 'a\nMINE\nb\nc\nPEER\n');
    const r = run(['-m', 'msg.txt', '--expect', 'f.txt=1/0', '--', 'f.txt']);
    expect(r.code).toBe(3);
    expect(r.out).toContain('[SAFE-COMMIT] ОТКАЗ: f.txt numstat +2/-0');
    expect(commits()).toBe(1);
  });

  it('patch вносит только свои хунки; чужая строка остаётся в рабочем дереве', () => {
    write('f.txt', 'a\nMINE\nb\nc\nPEER\n');
    const patch = [
      'diff --git a/f.txt b/f.txt', '--- a/f.txt', '+++ b/f.txt', '@@ -1,3 +1,4 @@', ' a', '+MINE', ' b', ' c', '',
    ].join('\n');
    write('mine.patch', patch);
    const r = run(['-m', 'msg.txt', '--expect', 'f.txt=1/0', '--patch', 'mine.patch']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('[SAFE-COMMIT] коммит');
    expect(git('show', 'HEAD:f.txt')).toBe('a\nMINE\nb\nc');
    expect(fs.readFileSync(path.join(repo, 'f.txt'), 'utf8')).toContain('PEER');
    expect(commits()).toBe(2);
  });

  it('отказ на неожиданный путь и на ожидаемый путь без изменений', () => {
    write('f.txt', 'a\nb\nc\nd\n');
    write('app/x.ts', 'y\n');
    const extra = run(['-m', 'msg.txt', '--expect', 'f.txt=1/0', '--', 'f.txt', 'app/x.ts']);
    expect(extra.code).toBe(3);
    expect(extra.out).toContain('неожиданный путь app/x.ts');
    const missing = run(['-m', 'msg.txt', '--expect', 'f.txt=1/0', '--expect', 'g.txt=1/0', '--', 'f.txt']);
    expect(missing.code).toBe(3);
    expect(missing.out).toContain('ожидался путь g.txt');
    expect(commits()).toBe(1);
  });

  it('без --expect коммит запрещён; dry-run печатает numstat и не коммитит', () => {
    write('f.txt', 'a\nb\nc\nd\n');
    expect(run(['-m', 'msg.txt', '--', 'f.txt']).code).toBe(2);
    const dry = run(['--dry-run', '--', 'f.txt']);
    expect(dry.code).toBe(0);
    expect(dry.out).toContain('dry numstat: f.txt +1/-0');
    expect(commits()).toBe(1);
  });

  it('пути кода вне окна :00–:05/:30–:35 — отказ с кодом 4 (без SAFE_COMMIT_IGNORE_WINDOW)', () => {
    const m = new Date().getMinutes();
    const inWindow = m <= 5 || (m >= 30 && m <= 35);
    write('app/x.ts', 'y\n');
    const r = run(['-m', 'msg.txt', '--expect', 'app/x.ts=1/1', '--', 'app/x.ts'], { SAFE_COMMIT_IGNORE_WINDOW: '0' });
    if (inWindow) {
      expect(r.code).toBe(0);
      expect(r.out).toContain('окно кода');
    } else {
      expect(r.code).toBe(4);
      expect(r.out).toContain('вне окна');
      expect(commits()).toBe(1);
    }
  });

  it('после коммита замок освобождён, общий индекс по своим путям совпадает с HEAD', () => {
    write('f.txt', 'a\nb\nc\nd\n');
    const r = run(['-m', 'msg.txt', '--expect', 'f.txt=1/0', '--', 'f.txt']);
    expect(r.code).toBe(0);
    expect(fs.existsSync(lock)).toBe(false);
    expect(git('diff', '--cached', '--name-only')).toBe('');
    expect(r.out).toContain('общий индекс синхронизирован');
  });
});
