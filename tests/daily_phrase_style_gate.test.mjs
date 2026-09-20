import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPROVED_STYLE_CONTRACT_VERSION,
  evaluateDailyPhraseBatchStyle,
  evaluateDailyPhraseRowStyle,
} from '../scripts/daily_phrase_style_gate.mjs';
import { evaluateDailyPhraseQualityRelease } from '../scripts/daily_phrase_quality_release_gate.mjs';

const approvedRow = {
  id: 'es-001',
  targetText: 'Caballo grande, ande o no ande',
  text_ru:
    '❤️ Представь ярмарку: рядом стоят две лошади, а покупатель даже не смотрит, какая быстрее и послушнее — берёт самую большую. Вот настроение Caballo grande, ande o no ande: выбрать что-то внушительное только потому, что оно больше, дороже или заметнее, пусть пользы от этого почти нет. Огромный внедорожник для двух кварталов? Точно оно. Размер впечатляет — но здравый смысл всё равно стоит проверить!',
  text_uk:
    '❤️ Уяви ярмарок: поруч стоять два коні, а покупець навіть не дивиться, який швидший і слухняніший — бере найбільшого. Ось настрій Caballo grande, ande o no ande: обрати щось поважне лише тому, що воно більше, дорожче або помітніше, хоча користі майже немає. Величезний позашляховик для двох кварталів? Саме воно. Розмір вражає — але здоровий глузд усе одно варто перевірити!',
};

test('approved narrative row passes the fixed English-parity style contract', () => {
  const result = evaluateDailyPhraseRowStyle(approvedRow);

  assert.equal(APPROVED_STYLE_CONTRACT_VERSION, 'daily-phrase-narrative-style-v1');
  assert.equal(result.verdict, 'PASS', JSON.stringify(result.issues, null, 2));
  assert.deepEqual(result.issues, []);
});

test('dry dictionary pattern is rejected even when its meaning is correct', () => {
  const dryRow = {
    ...approvedRow,
    text_ru:
      '❤️ Огромная вещь сама по себе не становится удачной покупкой. Так говорят о выборе самого большого варианта. Например: он купил внедорожник — Caballo grande, ande o no ande.',
    text_uk:
      '❤️ Велика річ сама по собі не стає вдалою покупкою. Так кажуть про вибір найбільшого варіанта. Наприклад: він купив позашляховик — Caballo grande, ande o no ande.',
  };

  const result = evaluateDailyPhraseRowStyle(dryRow);
  const codes = result.issues.map((issue) => issue.code);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(codes.includes('ru.word_count'));
  assert.ok(codes.includes('ru.dry_formula'));
  assert.ok(codes.includes('uk.word_count'));
  assert.ok(codes.includes('uk.dry_formula'));
});

test('the target phrase must be woven into both locale descriptions', () => {
  const result = evaluateDailyPhraseRowStyle({
    ...approvedRow,
    text_ru: approvedRow.text_ru.replace('Caballo grande, ande o no ande', 'эта испанская поговорка'),
  });

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((issue) => issue.code === 'ru.target_missing'));
});

test('batch gate rejects a repeated opening formula', () => {
  const rows = [1, 2, 3].map((index) => ({
    ...approvedRow,
    id: `es-00${index}`,
  }));

  const result = evaluateDailyPhraseBatchStyle(rows);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((issue) => issue.code === 'batch.repeated_opening'));
});

test('a missing locale is a fail-closed style error', () => {
  const result = evaluateDailyPhraseRowStyle({ ...approvedRow, text_uk: '' });

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((issue) => issue.code === 'uk.missing'));
});

test('a vivid scene can pass without direct address or a learner question', () => {
  const result = evaluateDailyPhraseRowStyle({
    ...approvedRow,
    text_ru:
      '❤️ На ярмарку привели двух лошадей: одна быстрая и послушная, другая просто огромная. Покупатель выбрал вторую, даже не проверив, умеет ли она ходить — Caballo grande, ande o no ande. Так размер превратился в спектакль, а польза осталась за воротами. Позже громадина заняла весь стойловый проход. Впечатление получилось громким, поездка — совсем короткой!',
    text_uk:
      '❤️ До крамниці привезли два холодильники: один зручний, інший просто велетенський. Родина обрала найбільший і лише вдома згадала про вузькі двері — Caballo grande, ande o no ande. Коробка перекрила весь коридор, а кухня так і залишилася порожньою. Сусіди дивилися на цю виставу з балконів. Вантажники сперечалися, хто повертатиме покупку назад. Літрів багато, користі — жодної!',
  });

  assert.equal(result.verdict, 'PASS', JSON.stringify(result.issues, null, 2));
});

test('batch gate rejects an obligatory learner-question slot', () => {
  const rows = ['Ярмарка шумела', 'Автосалон открылся', 'Покупатель спешил', 'Двор внезапно замер', 'Парковка опустела']
    .map((opening, index) => ({
      ...approvedRow,
      id: `es-q${index + 1}`,
      text_ru: approvedRow.text_ru.replace('Представь ярмарку', opening),
      text_uk: approvedRow.text_uk.replace('Уяви ярмарок', `Сцена ${index + 1} почалася`),
    }));

  const result = evaluateDailyPhraseBatchStyle(rows);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((issue) => issue.code === 'batch.question_slot_overuse'));
});

test('the final release gate cannot bypass the narrative style gate', () => {
  const bank = {
    studyTarget: 'es',
    sourceLocale: 'ru',
    surface: 'daily_phrase',
    activationApproved: false,
    rows: Array.from({ length: 176 }, (_, index) => ({
      id: `es-${String(index + 1).padStart(3, '0')}`,
      order: index + 1,
      studyTarget: 'es',
      sourceLocale: 'ru',
      surface: 'daily_phrase',
      targetText: `Expresión ${index + 1}`,
      targetExample: `Ejemplo natural ${index + 1}`,
      literal_ru: `Буквально ${index + 1}`,
      meaning_ru: `Значение ${index + 1}`,
      text_ru: `❤️ Так говорят о ситуации ${index + 1}. Например: Expresión ${index + 1}.`,
      literal_uk: `Буквально ${index + 1}`,
      meaning_uk: `Значення ${index + 1}`,
      text_uk: `❤️ Так кажуть про ситуацію ${index + 1}. Наприклад: Expresión ${index + 1}.`,
      allowSave: true,
      active: false,
      activationApproved: false,
    })),
  };

  const result = evaluateDailyPhraseQualityRelease({
    bank,
    sourceEvidenceArtifact: 'source',
    englishBaselineArtifact: 'baseline',
    priorAcceptedManifestArtifact: 'prior',
  });

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.includes('candidate_bank_style_hold'));
});
