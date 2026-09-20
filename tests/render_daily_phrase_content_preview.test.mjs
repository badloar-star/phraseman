import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const renderer = 'scripts/render_daily_phrase_content_preview.mjs';
const sourceBankPath = 'content/daily-phrases/es/source-bank.json';

function render(bankPath, outputPath, count = 40) {
  const result = spawnSync(process.execPath, [renderer, bankPath, outputPath, String(count)], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return fs.readFileSync(outputPath, 'utf8');
}

function card(preview, number) {
  return preview.match(new RegExp(`## ${number}\\.[\\s\\S]*?(?=## ${number + 1}\\.|$)`, 'u'))?.[0] || '';
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function assertDistractorPairs(cardText, row, locale) {
  const quiz = row[`quiz_${locale}`];
  for (const [index, distractor] of quiz.distractors.entries()) {
    const option = String.fromCharCode(66 + index);
    assert.match(
      cardText,
      new RegExp(
        `${option}\\. ${escapeRegex(distractor.text)}[\\s\\S]*?\\*\\*Дистрактор ${option} — ${escapeRegex(distractor.misconceptionCode)}:\\\*\\* ${escapeRegex(distractor.feedback)}`,
        'u',
      ),
      `${row.id} ${locale.toUpperCase()} option ${option} must retain its corresponding feedback`,
    );
  }
}

test('renders canonical-pass diagnostic quizzes only, deterministically, and holds every other locale block', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-phrase-preview-'));
  const firstOutputPath = path.join(tempDir, 'first.md');
  const secondOutputPath = path.join(tempDir, 'second.md');
  const defaultOutputPath = path.join(tempDir, 'default.md');

  try {
    const preview = render(sourceBankPath, firstOutputPath);
    const repeatedPreview = render(sourceBankPath, secondOutputPath);
    const defaultPreview = render(sourceBankPath, defaultOutputPath, 20);

    assert.equal(preview, repeatedPreview, 'two identical renders must be byte-for-byte stable');
    assert.equal(preview, fs.readFileSync('content/daily-phrases/es/REVIEW_PREVIEW.md', 'utf8'));
    assert.match(preview, /40 написанных карточек из 176/u);
    assert.match(defaultPreview, /20 написанных карточек из 176/u);
    assert.match(preview, /15 авторских викторин из 40/u);
    assert.match(preview, /остальные 25 викторин остаются в HOLD/u);
    assert.equal((preview.match(/^\*\*Квиз HOLD\*\*/gmu) || []).length, 25);
    assert.equal((preview.match(/^\*\*Вікторина HOLD\*\*/gmu) || []).length, 25);
    assert.equal((preview.match(/^[ABC]\. /gmu) || []).length, 90);
    assert.match(preview, /## 1\. Caballo grande, ande o no ande/u);
    assert.match(preview, /## 40\. A buenas horas, mangas verdes/u);

    const firstCard = card(preview, 1);
    const firstRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-001');
    assertDistractorPairs(firstCard, firstRow, 'ru');
    assertDistractorPairs(firstCard, firstRow, 'uk');

    for (let number = 16; number <= 40; number += 1) {
      const heldCard = card(preview, number);
      assert.match(heldCard, /\*\*Квиз HOLD\*\*/u, `card ${number} RU must hold`);
      assert.match(heldCard, /\*\*Вікторина HOLD\*\*/u, `card ${number} UK must hold`);
      assert.doesNotMatch(heldCard, /^[ABC]\. /gmu, `card ${number} must not show options`);
    }
    assert.doesNotMatch(preview, /собраны из текущих/u);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('holds a structurally filled quiz when the canonical content gate rejects it', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-phrase-preview-invalid-'));
  const bankPath = path.join(tempDir, 'bank.json');
  const outputPath = path.join(tempDir, 'preview.md');

  try {
    const bank = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8'));
    const invalidRow = bank.rows.find((row) => row.id === 'es-006');
    const validRow = bank.rows.find((row) => row.id === 'es-001');
    invalidRow.quiz_ru = structuredClone(validRow.quiz_ru);
    invalidRow.quiz_uk = structuredClone(validRow.quiz_uk);
    invalidRow.quiz_ru.distractors[1].id = invalidRow.quiz_ru.distractors[0].id;
    invalidRow.quiz_uk.distractors[1].id = invalidRow.quiz_uk.distractors[0].id;
    fs.writeFileSync(bankPath, JSON.stringify(bank), 'utf8');

    const preview = render(bankPath, outputPath);
    assert.match(preview, /14 авторских викторин из 40/u);
    const sixthCard = card(preview, 6);
    assert.match(sixthCard, /\*\*Квиз HOLD\*\*/u);
    assert.match(sixthCard, /\*\*Вікторина HOLD\*\*/u);
    assert.doesNotMatch(sixthCard, /^[ABC]\. /gmu);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
