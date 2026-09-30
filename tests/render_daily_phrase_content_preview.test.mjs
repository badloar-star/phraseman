import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const renderer = 'scripts/render_daily_phrase_content_preview.mjs';
const sourceBankPath = 'content/daily-phrases/es/source-bank.json';
const frenchSourceBankPath = 'content/daily-phrases/fr/source-bank.json';

function render(bankPath, outputPath, count = 176) {
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
    const defaultPreview = render(sourceBankPath, defaultOutputPath);

    assert.equal(preview, repeatedPreview, 'two identical renders must be byte-for-byte stable');
    assert.equal(preview, fs.readFileSync('content/daily-phrases/es/REVIEW_PREVIEW.md', 'utf8'));
    assert.match(preview, /176 написанных карточек из 176/u);
    assert.match(defaultPreview, /176 написанных карточек из 176/u);
    assert.match(preview, /176 авторских викторин из 176/u);
    assert.match(preview, /остальные 0 викторин остаются в HOLD/u);
    assert.equal((preview.match(/^Ответ: \*\*A\*\*$/gmu) || []).length, 176);
    assert.equal((preview.match(/^Відповідь: \*\*A\*\*$/gmu) || []).length, 176);
    assert.equal((preview.match(/^\*\*Квиз HOLD\*\*/gmu) || []).length, 0);
    assert.equal((preview.match(/^\*\*Вікторина HOLD\*\*/gmu) || []).length, 0);
    assert.equal((preview.match(/^[ABC]\. /gmu) || []).length, 1056);
    assert.match(preview, /## 1\. Caballo grande, ande o no ande/u);
    assert.match(preview, /## 176\. El primer paso es el que cuesta/u);

    const firstCard = card(preview, 1);
    const firstRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-001');
    assertDistractorPairs(firstCard, firstRow, 'ru');
    assertDistractorPairs(firstCard, firstRow, 'uk');

    const twentiethCard = card(preview, 20);
    const twentiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-020');
    assertDistractorPairs(twentiethCard, twentiethRow, 'ru');
    assertDistractorPairs(twentiethCard, twentiethRow, 'uk');

    const twentyFifthCard = card(preview, 25);
    const twentyFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-025');
    assertDistractorPairs(twentyFifthCard, twentyFifthRow, 'ru');
    assertDistractorPairs(twentyFifthCard, twentyFifthRow, 'uk');

    const thirtiethCard = card(preview, 30);
    const thirtiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-030');
    assertDistractorPairs(thirtiethCard, thirtiethRow, 'ru');
    assertDistractorPairs(thirtiethCard, thirtiethRow, 'uk');

    const thirtyFifthCard = card(preview, 35);
    const thirtyFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-035');
    assertDistractorPairs(thirtyFifthCard, thirtyFifthRow, 'ru');
    assertDistractorPairs(thirtyFifthCard, thirtyFifthRow, 'uk');

    const fortiethCard = card(preview, 40);
    const fortiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-040');
    assertDistractorPairs(fortiethCard, fortiethRow, 'ru');
    assertDistractorPairs(fortiethCard, fortiethRow, 'uk');

    const fortyFifthCard = card(preview, 45);
    const fortyFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-045');
    assertDistractorPairs(fortyFifthCard, fortyFifthRow, 'ru');
    assertDistractorPairs(fortyFifthCard, fortyFifthRow, 'uk');

    const fiftiethCard = card(preview, 50);
    const fiftiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-050');
    assertDistractorPairs(fiftiethCard, fiftiethRow, 'ru');
    assertDistractorPairs(fiftiethCard, fiftiethRow, 'uk');

    const fiftyFifthCard = card(preview, 55);
    const fiftyFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-055');
    assertDistractorPairs(fiftyFifthCard, fiftyFifthRow, 'ru');
    assertDistractorPairs(fiftyFifthCard, fiftyFifthRow, 'uk');

    const sixtiethCard = card(preview, 60);
    const sixtiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-060');
    assertDistractorPairs(sixtiethCard, sixtiethRow, 'ru');
    assertDistractorPairs(sixtiethCard, sixtiethRow, 'uk');

    const sixtyFifthCard = card(preview, 65);
    const sixtyFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-065');
    assertDistractorPairs(sixtyFifthCard, sixtyFifthRow, 'ru');
    assertDistractorPairs(sixtyFifthCard, sixtyFifthRow, 'uk');

    const seventiethCard = card(preview, 70);
    const seventiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-070');
    assertDistractorPairs(seventiethCard, seventiethRow, 'ru');
    assertDistractorPairs(seventiethCard, seventiethRow, 'uk');

    const seventyFifthCard = card(preview, 75);
    const seventyFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-075');
    assertDistractorPairs(seventyFifthCard, seventyFifthRow, 'ru');
    assertDistractorPairs(seventyFifthCard, seventyFifthRow, 'uk');

    const eightiethCard = card(preview, 80);
    const eightiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-080');
    assertDistractorPairs(eightiethCard, eightiethRow, 'ru');
    assertDistractorPairs(eightiethCard, eightiethRow, 'uk');

    const eightyFifthCard = card(preview, 85);
    const eightyFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-085');
    assertDistractorPairs(eightyFifthCard, eightyFifthRow, 'ru');
    assertDistractorPairs(eightyFifthCard, eightyFifthRow, 'uk');

    const ninetiethCard = card(preview, 90);
    const ninetiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-090');
    assertDistractorPairs(ninetiethCard, ninetiethRow, 'ru');
    assertDistractorPairs(ninetiethCard, ninetiethRow, 'uk');

    const ninetyFifthCard = card(preview, 95);
    const ninetyFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-095');
    assertDistractorPairs(ninetyFifthCard, ninetyFifthRow, 'ru');
    assertDistractorPairs(ninetyFifthCard, ninetyFifthRow, 'uk');

    const hundredthCard = card(preview, 100);
    const hundredthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-100');
    assertDistractorPairs(hundredthCard, hundredthRow, 'ru');
    assertDistractorPairs(hundredthCard, hundredthRow, 'uk');

    const hundredFifthCard = card(preview, 105);
    const hundredFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-105');
    assertDistractorPairs(hundredFifthCard, hundredFifthRow, 'ru');
    assertDistractorPairs(hundredFifthCard, hundredFifthRow, 'uk');

    const hundredTenthCard = card(preview, 110);
    const hundredTenthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-110');
    assertDistractorPairs(hundredTenthCard, hundredTenthRow, 'ru');
    assertDistractorPairs(hundredTenthCard, hundredTenthRow, 'uk');

    const hundredFifteenthCard = card(preview, 115);
    const hundredFifteenthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-115');
    assertDistractorPairs(hundredFifteenthCard, hundredFifteenthRow, 'ru');
    assertDistractorPairs(hundredFifteenthCard, hundredFifteenthRow, 'uk');

    const hundredTwentiethCard = card(preview, 120);
    const hundredTwentiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-120');
    assertDistractorPairs(hundredTwentiethCard, hundredTwentiethRow, 'ru');
    assertDistractorPairs(hundredTwentiethCard, hundredTwentiethRow, 'uk');

    const hundredTwentyFifthCard = card(preview, 125);
    const hundredTwentyFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-125');
    assertDistractorPairs(hundredTwentyFifthCard, hundredTwentyFifthRow, 'ru');
    assertDistractorPairs(hundredTwentyFifthCard, hundredTwentyFifthRow, 'uk');

    const hundredThirtiethCard = card(preview, 130);
    const hundredThirtiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-130');
    assertDistractorPairs(hundredThirtiethCard, hundredThirtiethRow, 'ru');
    assertDistractorPairs(hundredThirtiethCard, hundredThirtiethRow, 'uk');

    const hundredThirtyFifthCard = card(preview, 135);
    const hundredThirtyFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-135');
    assertDistractorPairs(hundredThirtyFifthCard, hundredThirtyFifthRow, 'ru');
    assertDistractorPairs(hundredThirtyFifthCard, hundredThirtyFifthRow, 'uk');

    const hundredFortiethCard = card(preview, 140);
    const hundredFortiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-140');
    assertDistractorPairs(hundredFortiethCard, hundredFortiethRow, 'ru');
    assertDistractorPairs(hundredFortiethCard, hundredFortiethRow, 'uk');

    const hundredFortyFifthCard = card(preview, 145);
    const hundredFortyFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-145');
    assertDistractorPairs(hundredFortyFifthCard, hundredFortyFifthRow, 'ru');
    assertDistractorPairs(hundredFortyFifthCard, hundredFortyFifthRow, 'uk');

    const hundredFiftiethCard = card(preview, 150);
    const hundredFiftiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-150');
    assertDistractorPairs(hundredFiftiethCard, hundredFiftiethRow, 'ru');
    assertDistractorPairs(hundredFiftiethCard, hundredFiftiethRow, 'uk');

    const hundredFiftyFifthCard = card(preview, 155);
    const hundredFiftyFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-155');
    assertDistractorPairs(hundredFiftyFifthCard, hundredFiftyFifthRow, 'ru');
    assertDistractorPairs(hundredFiftyFifthCard, hundredFiftyFifthRow, 'uk');

    const hundredSixtiethCard = card(preview, 160);
    const hundredSixtiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-160');
    assertDistractorPairs(hundredSixtiethCard, hundredSixtiethRow, 'ru');
    assertDistractorPairs(hundredSixtiethCard, hundredSixtiethRow, 'uk');

    const hundredSixtyFifthCard = card(preview, 165);
    const hundredSixtyFifthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-165');
    assertDistractorPairs(hundredSixtyFifthCard, hundredSixtyFifthRow, 'ru');
    assertDistractorPairs(hundredSixtyFifthCard, hundredSixtyFifthRow, 'uk');

    const hundredSeventiethCard = card(preview, 170);
    const hundredSeventiethRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find((row) => row.id === 'es-170');
    assertDistractorPairs(hundredSeventiethCard, hundredSeventiethRow, 'ru');
    assertDistractorPairs(hundredSeventiethCard, hundredSeventiethRow, 'uk');

    const hundredSeventySixthCard = card(preview, 176);
    const hundredSeventySixthRow = JSON.parse(fs.readFileSync(sourceBankPath, 'utf8')).rows.find(
      (row) => row.id === 'es-176',
    );
    assertDistractorPairs(hundredSeventySixthCard, hundredSeventySixthRow, 'ru');
    assertDistractorPairs(hundredSeventySixthCard, hundredSeventySixthRow, 'uk');
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
    assert.match(preview, /175 авторских викторин из 176/u);
    const sixthCard = card(preview, 6);
    assert.match(sixthCard, /\*\*Квиз HOLD\*\*/u);
    assert.match(sixthCard, /\*\*Вікторина HOLD\*\*/u);
    assert.doesNotMatch(sixthCard, /^[ABC]\. /gmu);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('renders French metadata and per-row dictionary attribution without Spanish leakage', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-phrase-preview-fr-'));
  const outputPath = path.join(tempDir, 'preview.md');

  try {
    const preview = render(frenchSourceBankPath, outputPath);
    assert.match(preview, /^# Французская «Фраза дня» — визуальная проверка$/mu);
    assert.match(preview, /176 написанных карточек из 176/u);
    assert.match(preview, /176 авторских викторин из 176/u);
    assert.match(preview, /остальные 0 викторин остаются в HOLD/u);
    assert.match(preview, /\*\*Пример по-французски:\*\*/u);
    assert.match(preview, /\*\*Источник:\*\* \[Le Robert/u);
    assert.match(preview, /\*\*Источник:\*\* \[Larousse/u);
    assert.match(
      preview,
      /Le Robert[^\n]+официальный поисковый сниппет; страница при проверке вернула HTTP 403/u,
    );
    assert.match(preview, /Larousse[^\n]+официальная словарная страница; HTTP 200/u);
    assert.doesNotMatch(preview, /Испанская|по-испански|Instituto Cervantes/u);
    assert.equal((preview.match(/^[ABC]\. /gmu) || []).length, 1056);
    assert.match(preview, /## 1\. Avoir le cafard/u);
    assert.match(preview, /## 176\. Parler à cœur ouvert/u);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('does not claim source or style approval that the renderer did not execute', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-phrase-preview-honesty-'));
  const bankPath = path.join(tempDir, 'bank.json');
  const outputPath = path.join(tempDir, 'preview.md');

  try {
    const bank = JSON.parse(fs.readFileSync(frenchSourceBankPath, 'utf8'));
    bank.rows[0].text_ru = 'сухо';
    bank.rows[0].sourceEvidence.definitionQuote = 'tampered';
    fs.writeFileSync(bankPath, JSON.stringify(bank), 'utf8');

    const preview = render(bankPath, outputPath);
    assert.match(preview, /quiz-гейт прошёл на текущем снимке/u);
    assert.doesNotMatch(preview, /source-link, style и quiz-гейты прошли/u);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
