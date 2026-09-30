import fs from 'node:fs';
import path from 'node:path';

// зачем: PM-171-A2 — «раздел идеи скрываем»: доказать на уровне исходников, что нет маршрута,
// загрузчика (idea_inbox на старте) и ссылок на пустой раздел. Сервер/админка идей намеренно
// не проверяются — они оставлены (данные не уничтожаются без отдельного решения, PM-171-A1).
const roots = ['app', 'components', 'modules', 'hooks'];
const removedFiles = [
  'app/ideas_catalog.tsx',
  'app/ideas_submit.tsx',
  'app/idea_decision_modals.ts',
];
const forbidden = /ideas_catalog|ideas_submit|idea_decision_modals|flushIdeaDecisionModals|idea_inbox|['"`]\/ideas\b/;

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
}

function isCommentLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('{/*');
}

const present = removedFiles.filter((f) => fs.existsSync(f));
if (present.length > 0) throw new Error(`pm171_removed_file_present:${present.join(',')}`);

const files: string[] = [];
for (const root of roots) walk(root, files);

const violations: string[] = [];
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (forbidden.test(line) && !isCommentLine(line)) violations.push(`${file}:${index + 1}: ${line.trim().slice(0, 120)}`);
  });
}
if (violations.length > 0) throw new Error(`pm171_ideas_runtime_reference:\n${violations.join('\n')}`);

console.log(`pm171_ideas_section_retired: PASS (${files.length} files scanned, ${removedFiles.length} removed files absent)`);
