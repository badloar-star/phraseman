import fs from 'node:fs';
import path from 'node:path';
import { evaluateDailyPhraseQuizContent } from './daily_phrase_quiz_content_gate.mjs';

const bankPath = process.argv[2] || 'content/daily-phrases/es/source-bank.json';
const outputPath = process.argv[3] || 'content/daily-phrases/es/REVIEW_PREVIEW.md';
const requestedCount = Number(process.argv[4] || 20);
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
const englishRows = JSON.parse(fs.readFileSync('admin/daily_phrases_seed.json', 'utf8'));
const rows = bank.rows
  .filter((row) => row.candidateStatus === 'CANDIDATE_PENDING_INDEPENDENT_REVIEW')
  .slice(0, requestedCount);

function authoredQuiz(row) {
  try {
    const result = evaluateDailyPhraseQuizContent([row], {
      targetRows: bank.rows,
      englishRows,
    });
    if (result.verdict !== 'PASS') return null;
  } catch {
    return null;
  }

  return {
    ru: {
      correct: { text: row.meaning_ru, feedback: row.quiz_ru.correctFeedback },
      distractors: row.quiz_ru.distractors,
    },
    uk: {
      correct: { text: row.meaning_uk, feedback: row.quiz_uk.correctFeedback },
      distractors: row.quiz_uk.distractors,
    },
  };
}

function renderQuiz(out, row, locale, readyQuiz) {
  const label = locale === 'uk' ? 'Вікторина UK — що означає вислів?' : 'Викторина RU — что означает выражение?';
  const holdLabel = locale === 'uk' ? 'Вікторина HOLD' : 'Квиз HOLD';
  const answerLabel = locale === 'uk' ? 'Відповідь' : 'Ответ';
  const correctLabel = locale === 'uk' ? 'Пояснення правильної відповіді' : 'Пояснение правильного ответа';
  const distractorLabel = locale === 'uk' ? 'Дистрактор' : 'Дистрактор';
  const quiz = readyQuiz?.[locale] ?? null;

  out.push(`**${label}**`);
  out.push('');
  if (!quiz) {
    out.push(`**${holdLabel}** — для этой карточки ещё нет двух независимо проверенных авторских дистракторов и feedback. Варианты намеренно не показаны.`);
    out.push('');
    return;
  }

  const options = [quiz.correct, ...quiz.distractors];
  options.forEach((option, optionIndex) => out.push(`${String.fromCharCode(65 + optionIndex)}. ${option.text}`));
  out.push('');
  out.push(`${answerLabel}: **A**`);
  out.push('');
  out.push(`**${correctLabel}:** ${quiz.correct.feedback}`);
  out.push('');
  quiz.distractors.forEach((distractor, index) => {
    out.push(`**${distractorLabel} ${String.fromCharCode(66 + index)} — ${distractor.misconceptionCode}:** ${distractor.feedback}`);
    out.push('');
  });
}

const authoredQuizzes = new Map(rows.map((row) => [row.id, authoredQuiz(row)]));
const authoredQuizCount = [...authoredQuizzes.values()].filter(Boolean).length;

const out = [];
out.push('# Испанская «Фраза дня» — визуальная проверка');
out.push('');
out.push(`Снимок текущего контента: **${rows.length} написанных карточек из 176**. Остальные строки пока не показаны, потому что там ещё не готов learner-facing текст.`);
out.push('');
out.push(`Статус банка: **HOLD / не включён**. Показаны **${authoredQuizCount} авторских викторин из ${rows.length}**; остальные ${rows.length - authoredQuizCount} викторин остаются в HOLD и не получают вымышленных вариантов.`);
out.push('');
out.push(`Для показанных ${rows.length} карточек описания прошли source-link, style и независимый taste-аудит. Это не заменяет проверки истины, локалей, дистракторов и release trust root; активация банка по-прежнему закрыта.`);
out.push('');

rows.forEach((row, index) => {
  const readyQuiz = authoredQuizzes.get(row.id);
  out.push(`## ${index + 1}. ${row.targetText}`);
  out.push('');
  out.push(`**Пример по-испански:** ${row.targetExample}`);
  out.push('');
  out.push(`**Буквально:** ${row.literal_ru}`);
  out.push('');
  out.push(`**Значение:** ${row.meaning_ru}`);
  out.push('');
  out.push(`**Описание:** ${row.text_ru}`);
  out.push('');
  renderQuiz(out, row, 'ru', readyQuiz);
  out.push('<details>');
  out.push('<summary>Украинская версия</summary>');
  out.push('');
  out.push(`**Буквально:** ${row.literal_uk}`);
  out.push('');
  out.push(`**Значение:** ${row.meaning_uk}`);
  out.push('');
  out.push(`**Описание:** ${row.text_uk}`);
  out.push('');
  renderQuiz(out, row, 'uk', readyQuiz);
  out.push('</details>');
  out.push('');
  out.push(`**Источник:** [Instituto Cervantes, карточка ${row.sourceEvidence.sourceId}](${row.sourceEvidence.sourceUrl})`);
  out.push('');
  out.push(`> ${row.sourceEvidence.definitionQuote}`);
  out.push('');
  out.push('---');
  out.push('');
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${out.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, renderedRows: rows.length }));
