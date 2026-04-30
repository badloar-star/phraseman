import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLessonPrepositionPack } from '../../app/lesson_prepositions';
import { explainPrepositionChoice, PrepositionExplanationLevel } from '../../app/preposition_explanations';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');

type Issue = {
  lesson: number;
  prep: string;
  sentence: string;
  level: PrepositionExplanationLevel | 'generic';
  ruText: string;
  ukText: string;
  problems: string[];
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[_-]+/g, ' ').replace(/[.,!?;:()"']/g, ' ').replace(/\s+/g, ' ').trim();
}

function quotedChunks(text: string): string[] {
  const out: string[] = [];
  const matcher = /"([^"]+)"|«([^»]+)»/g;
  let m: RegExpExecArray | null;
  while ((m = matcher.exec(text)) !== null) {
    const chunk = m[1] ?? m[2];
    if (chunk) out.push(chunk);
  }
  return out;
}

const issues: Issue[] = [];

for (let lesson = 1; lesson <= 32; lesson++) {
  const pack = getLessonPrepositionPack(lesson);
  if (!pack) continue;
  for (const item of pack.items) {
    const sentence = item.sentenceTemplate.replace('__', item.correct);
    const sentenceNorm = normalize(sentence);
    const explanation = explainPrepositionChoice(item.correct, sentence);
    const issue: Issue = {
      lesson,
      prep: item.correct,
      sentence,
      level: explanation.level ?? 'generic',
      ruText: explanation.ru,
      ukText: explanation.uk,
      problems: [],
    };

    for (const chunk of quotedChunks(explanation.ru)) {
      const chunkNorm = normalize(chunk);
      if (!chunkNorm) continue;
      if (chunkNorm.length < 3) continue;
      if (chunkNorm === item.correct) continue;
      if (chunk.includes('+')) continue;
      if (/\b(v-ing|n|infinitive|инфинитив|інфінітив|герундий|герундій|gerund)\b/i.test(chunk)) continue;
      const variants = chunkNorm.split(/\s*\/\s*/).filter(Boolean);
      const onlyPrepVariants = variants.every(v => v.startsWith(item.correct + ' '));
      if (!onlyPrepVariants) continue;
      const matched = variants.some(v => sentenceNorm.includes(v));
      if (!matched) {
        issue.problems.push(`Цитата "${chunk}" не найдена во фразе`);
      }
    }

    if (item.correct === 'for') {
      if (/длительность|тривалість|на какой срок|на який строк|как долго|як довго/.test(explanation.ru + explanation.uk)) {
        const after = sentenceNorm.split(/\bfor\b/i)[1] ?? '';
        if (!/\b(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years|long|while)\b/.test(after)) {
          issue.problems.push('Сказано про длительность, но в фразе после for нет периода времени');
        }
      }
    }

    if (item.correct === 'on' && /On one|on the way|on my way|on his way|on her way|on our way|on their way|on your way/i.test(explanation.ru)) {
      if (!/\bon (the|my|your|his|her|our|their) way\b/i.test(sentence)) {
        issue.problems.push("Объяснение про on one's way, но в фразе нет соответствия");
      }
    }

    if (item.correct === 'at' && /^"At home"/i.test(explanation.ru)) {
      if (!/\bat home\b/i.test(sentence)) {
        issue.problems.push('Объяснение про at home, но в фразе нет at home');
      }
    }

    if (!explanation.ru.trim() || !explanation.uk.trim()) {
      issue.problems.push('Пустой текст RU или UK');
    }
    if (explanation.ru.trim() === explanation.uk.trim() && explanation.ru.trim().length > 0) {
      issue.problems.push('RU и UK совпадают дословно');
    }

    if (!new RegExp(`\\b${item.correct}\\b`, 'i').test(explanation.ru)) {
      issue.problems.push('Объяснение не упоминает сам предлог');
    }

    issues.push(issue);
  }
}

const problematic = issues.filter(x => x.problems.length > 0);

const lines: string[] = [];
const push = (s = '') => lines.push(s);

push('# Детальный аудит объяснений предлогов');
push('');
push(`Всего заданий: **${issues.length}**`);
push(`С проблемами: **${problematic.length}**`);
push('');

const byLevel = issues.reduce<Record<string, number>>((acc, x) => { acc[x.level] = (acc[x.level] ?? 0) + 1; return acc; }, {});
push('## Уровни объяснений');
for (const k of Object.keys(byLevel).sort()) push(`- ${k}: ${byLevel[k]}`);
push('');

if (problematic.length) {
  push('## Проблемы');
  push('');
  for (const x of problematic) {
    push(`### L${x.lesson} ${x.prep}: ${x.sentence}`);
    push('');
    push(`Уровень: ${x.level}`);
    push('');
    for (const p of x.problems) push(`- ${p}`);
    push('');
    push(`RU: ${x.ruText}`);
    push('');
    push(`UK: ${x.ukText}`);
    push('');
  }
}

push('## Все задания');
push('');
push('| Урок | Предлог | Уровень | Фраза | RU |');
push('|------|---------|---------|-------|----|');
for (const x of issues) {
  const ru = x.ruText.replace(/\|/g, '\\|');
  const sentence = x.sentence.replace(/\|/g, '\\|');
  push(`| ${x.lesson} | ${x.prep} | ${x.level} | ${sentence} | ${ru} |`);
}
push('');

const out = path.join(projectRoot, 'tools', 'audit', 'AUDIT_PREPOSITION_QUALITY.md');
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`Wrote -> ${path.relative(projectRoot, out)}`);
console.log(`Total: ${issues.length}, problematic: ${problematic.length}`);
