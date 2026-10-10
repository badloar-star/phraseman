// База храповика цветов по ЗАКОММИЧЕННОМУ дереву (HEAD) — без чужих незакоммиченных правок и пометок в общей рабочей копии.
// зачем (координатор/«Темы» 10.10): прежний headbase.mjs читал залипшую папку-снимок и при --update писал неверное число.
// Теперь каждый запуск: свежий `git archive HEAD` в новую пустую tmp-папку → подсчёт → печать. Базу в рабочую копию пишет
// ТОЛЬКО флаг --write.  Запуск: node scripts/theme_colors_baseline_head.mjs [--write]
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASELINE = join(ROOT, 'config', 'theme-hardcoded-colors-baseline.json');
const { countByFile, scanHardcodedColors } = await import(pathToFileURL(join(ROOT, 'tests', 'helpers', 'hardcoded_colors_scan.mjs')).href);

const tmp = mkdtempSync(join(tmpdir(), 'theme-head-'));
try {
  const tarPath = join(tmp, 'head.tar');
  execFileSync('git', ['archive', 'HEAD', '--format=tar', '-o', tarPath, 'app', 'components', 'modules', 'constants'], { cwd: ROOT, stdio: 'inherit' });
  const tree = join(tmp, 'tree');
  execFileSync('node', ['-e', `require('fs').mkdirSync(${JSON.stringify(tree)}, { recursive: true })`]);
  // относительные пути + cwd: GNU tar на Windows читает «C:» как имя хоста
  execFileSync('tar', ['-xf', 'head.tar', '-C', 'tree'], { cwd: tmp, stdio: 'inherit' });

  const files = countByFile(scanHardcodedColors(tree));
  const total = Object.values(files).reduce((a, b) => a + b, 0);
  const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim();
  console.log(`[THEME-BASELINE-HEAD] HEAD=${head} total=${total} files=${Object.keys(files).length}`);

  if (process.argv.includes('--write')) {
    const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
    const prev = JSON.parse(readFileSync(BASELINE, 'utf8').replace(/\r\n/g, '\n'));
    writeFileSync(BASELINE, `${JSON.stringify({ ...prev, total, files: sorted }, null, 2)}\n`);
    console.log(`[THEME-BASELINE-HEAD] записано в ${BASELINE} (было ${prev.total})`);
  } else {
    console.log('[THEME-BASELINE-HEAD] dry-run: файл базы НЕ изменён (для записи — флаг --write)');
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
