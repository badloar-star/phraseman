import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

function concentrationFixture(dominantRows, totalRows) {
  const ruOpenings = [
    'Утром открылась ярмарка', 'После дождя ожила площадь', 'К полудню пришли покупатели',
    'Возле вокзала шумел рынок', 'В субботу распахнулись палатки', 'На рассвете приехали торговцы',
    'Перед обедом загудели ряды', 'У старой ратуши начался торг', 'В праздник заполнилась площадь',
    'К вечеру засветились витрины',
  ];
  const ukOpenings = [
    'Вранці відкрився ярмарок', 'Після дощу ожила площа', 'Опівдні прийшли покупці',
    'Біля вокзалу шумів ринок', 'У суботу відкрилися намети', 'На світанку приїхали торговці',
    'Перед обідом загуділи ряди', 'Біля старої ратуші почався торг', 'На свято заповнилася площа',
    'Надвечір засвітилися вітрини',
  ];
  return Array.from({ length: totalRows }, (_, index) => {
    if (index < dominantRows) {
      return {
        ...approvedRow,
        id: `es-threshold-${index + 1}`,
        text_ru: approvedRow.text_ru.replace('Представь ярмарку', ruOpenings[index]),
        text_uk: approvedRow.text_uk.replace('Уяви ярмарок', ukOpenings[index]),
      };
    }
    return {
      ...approvedRow,
      id: `es-threshold-${index + 1}`,
      text_ru:
        `❤️ Caballo grande, ande o no ande — так Мила описала выбор директора в сцене ${index + 1}, заказавшего гигантский автобус для трёх сотрудников. Машина не помещалась у офиса. Водитель кружил по соседним улицам. Пассажиры дошли пешком быстрее. Буквальный большой конь напоминает: внушительный размер ещё не делает решение полезным. К вечеру автобус впечатлял только пустыми сиденьями.`,
      text_uk:
        `❤️ Caballo grande, ande o no ande — так Марко описав вибір керівниці в сцені ${index + 1}, яка замовила величезний автобус для трьох працівників. Машина не вмістилася біля офісу. Водій кружляв сусідніми вулицями. Пасажири дісталися пішки швидше. Буквальний великий кінь нагадує: поважний розмір ще не робить рішення корисним. Увечері автобус вражав лише порожніми сидіннями.`,
    };
  });
}

test('approved narrative row passes the fixed English-parity style contract', () => {
  const result = evaluateDailyPhraseRowStyle(approvedRow);

  assert.equal(APPROVED_STYLE_CONTRACT_VERSION, 'daily-phrase-narrative-style-v1');
  assert.equal(result.verdict, 'PASS', JSON.stringify(result.issues, null, 2));
  assert.deepEqual(result.issues, []);
});

test('row-level style evaluator rejects an array id instead of coercing it', () => {
  const row = structuredClone(approvedRow);
  row.id = ['es-001'];
  const result = evaluateDailyPhraseRowStyle(row);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'row.invalid_id_type'));
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

test('a declared grammatical surface form can weave a lemma target naturally', () => {
  const targetText = 'jemandem sein Herz ausschütten';
  const result = evaluateDailyPhraseRowStyle({
    ...approvedRow,
    targetText,
    text_ru: approvedRow.text_ru.replace(
      approvedRow.targetText,
      'ihrer Schwester ihr Herz ausschütten',
    ),
    text_uk: approvedRow.text_uk.replace(
      approvedRow.targetText,
      'seinem Bruder sein Herz ausschütten',
    ),
    targetSurfaceForms: {
      text_ru: 'ihrer Schwester ihr Herz ausschütten',
      text_uk: 'seinem Bruder sein Herz ausschütten',
    },
  });

  assert.equal(result.verdict, 'PASS', JSON.stringify(result.issues, null, 2));
});

test('a declared surface form cannot substitute an unrelated phrase', () => {
  const result = evaluateDailyPhraseRowStyle({
    ...approvedRow,
    targetText: 'jemandem sein Herz ausschütten',
    text_ru: approvedRow.text_ru.replace(approvedRow.targetText, 'ein ruhiges Gespräch führen'),
    targetSurfaceForms: { text_ru: 'ein ruhiges Gespräch führen' },
  });
  const codes = result.issues.map((entry) => entry.code);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(codes.includes('ru.target_surface_form_invalid'));
});

test('learner-facing descriptions reject internal row references', () => {
  const cases = [
    ['ru', 'es024'],
    ['ru', 'es-024'],
    ['ru', 'es_024'],
    ['ru', 'ES-024'],
    ['uk', 'fr_007'],
    ['uk', 'de123'],
  ];

  for (const [locale, rowReference] of cases) {
    const result = evaluateDailyPhraseRowStyle({
      ...approvedRow,
      [`text_${locale}`]: `${approvedRow[`text_${locale}`]} Не путай это с ${rowReference}.`,
    });
    const codes = result.issues.map((entry) => entry.code);

    assert.equal(result.verdict, 'HOLD', rowReference);
    assert.ok(codes.includes(`${locale}.internal_row_reference`), rowReference);
  }
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

test('batch gate rejects factory-uniform sentence counts and target placement', () => {
  const ruOpenings = ['Ярмарка гудела', 'Автосалон проснулся', 'Покупатель задумался', 'Парковка наполнилась', 'Сосед остановился'];
  const ukOpenings = ['Ярмарок гудів', 'Автосалон прокинувся', 'Покупець замислився', 'Парковка заповнилася', 'Сусід зупинився'];
  const rows = ruOpenings.map((opening, index) => ({
    ...approvedRow,
    id: `es-shape-${index + 1}`,
    text_ru: approvedRow.text_ru.replace('Представь ярмарку', opening),
    text_uk: approvedRow.text_uk.replace('Уяви ярмарок', ukOpenings[index]),
  }));

  const result = evaluateDailyPhraseBatchStyle(rows);
  const codes = result.issues.map((entry) => entry.code);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(codes.includes('batch.uniform_sentence_count'));
  assert.ok(codes.includes('batch.uniform_target_position'));
});

test('batch gate rejects 90-percent factory concentration hidden by one outlier', () => {
  const ruOpenings = [
    'Утром открылась ярмарка', 'После дождя ожила площадь', 'К полудню пришли покупатели',
    'Возле вокзала шумел рынок', 'В субботу распахнулись палатки', 'На рассвете приехали торговцы',
    'Перед обедом загудели ряды', 'У старой ратуши начался торг', 'В праздник заполнилась площадь',
  ];
  const ukOpenings = [
    'Вранці відкрився ярмарок', 'Після дощу ожила площа', 'Опівдні прийшли покупці',
    'Біля вокзалу шумів ринок', 'У суботу відкрилися намети', 'На світанку приїхали торговці',
    'Перед обідом загуділи ряди', 'Біля старої ратуші почався торг', 'На свято заповнилася площа',
  ];
  const rows = ruOpenings.map((opening, index) => ({
    ...approvedRow,
    id: `es-concentrated-${index + 1}`,
    text_ru: approvedRow.text_ru.replace('Представь ярмарку', opening),
    text_uk: approvedRow.text_uk.replace('Уяви ярмарок', ukOpenings[index]),
  }));
  rows.push({
    ...approvedRow,
    id: 'es-concentrated-10',
    text_ru:
      '❤️ Caballo grande, ande o no ande — так Мила описала выбор директора, заказавшего гигантский автобус для трёх сотрудников. Машина не помещалась у офиса. Водитель кружил по соседним улицам. Пассажиры дошли пешком быстрее. Буквальный большой конь напоминает: внушительный размер ещё не делает решение полезным. К вечеру автобус впечатлял только пустыми сиденьями.',
    text_uk:
      '❤️ Caballo grande, ande o no ande — так Марко описав вибір керівниці, яка замовила величезний автобус для трьох працівників. Машина не вмістилася біля офісу. Водій кружляв сусідніми вулицями. Пасажири дісталися пішки швидше. Буквальний великий кінь нагадує: поважний розмір ще не робить рішення корисним. Увечері автобус вражав лише порожніми сидіннями.',
  });

  const result = evaluateDailyPhraseBatchStyle(rows);
  const codes = result.issues.map((entry) => entry.code);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(codes.includes('batch.concentrated_sentence_count'));
  assert.ok(codes.includes('batch.concentrated_target_position'));
});

test('batch concentration threshold is inclusive at exactly 80 percent', () => {
  const result = evaluateDailyPhraseBatchStyle(concentrationFixture(8, 10));
  const codes = result.issues.map((entry) => entry.code);
  assert.ok(codes.includes('batch.concentrated_sentence_count'));
  assert.ok(codes.includes('batch.concentrated_target_position'));
});

test('batch concentration guard stays quiet below 80 percent', () => {
  const result = evaluateDailyPhraseBatchStyle(concentrationFixture(7, 10));
  const codes = result.issues.map((entry) => entry.code);
  assert.ok(!codes.includes('batch.concentrated_sentence_count'));
  assert.ok(!codes.includes('batch.concentrated_target_position'));
});

test('batch concentration guard does not overreach into batches smaller than ten', () => {
  const result = evaluateDailyPhraseBatchStyle(concentrationFixture(4, 5));
  const codes = result.issues.map((entry) => entry.code);
  assert.ok(!codes.includes('batch.concentrated_sentence_count'));
  assert.ok(!codes.includes('batch.concentrated_target_position'));
});

test('fully uniform batches emit only the established uniform diagnostics', () => {
  const result = evaluateDailyPhraseBatchStyle(concentrationFixture(10, 10));
  const codes = result.issues.map((entry) => entry.code);
  assert.ok(codes.includes('batch.uniform_sentence_count'));
  assert.ok(codes.includes('batch.uniform_target_position'));
  assert.ok(!codes.includes('batch.concentrated_sentence_count'));
  assert.ok(!codes.includes('batch.concentrated_target_position'));
});

test('target-position guard ignores character substrings inside unrelated words', () => {
  const rows = Array.from({ length: 5 }, (_, index) => {
    const falsePositive = index < 3 ? 'Span Diego встретил гостей. ' : 'Гости встретились у входа. ';
    const falsePositiveUk = index < 3 ? 'Span Diego зустрів гостей. ' : 'Гості зустрілися біля входу. ';
    return {
      ...approvedRow,
      id: `de-token-position-${index + 1}`,
      targetText: 'an die',
      text_ru: approvedRow.text_ru
        .replace('Представь ярмарку: ', falsePositive)
        .replace('Caballo grande, ande o no ande', 'an die'),
      text_uk: approvedRow.text_uk
        .replace('Уяви ярмарок: ', falsePositiveUk)
        .replace('Caballo grande, ande o no ande', 'an die'),
    };
  });

  const result = evaluateDailyPhraseBatchStyle(rows);
  const codes = result.issues.map((entry) => entry.code);

  assert.ok(codes.includes('batch.uniform_target_position'));
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

test('batch style rejects duplicate row ids even when every narrative is valid', () => {
  const duplicate = structuredClone(approvedRow);
  const result = evaluateDailyPhraseBatchStyle([approvedRow, duplicate]);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'batch.duplicate_row_id'));
});

test('batch style rejects an array row id instead of coercing it to a string', () => {
  const row = structuredClone(approvedRow);
  row.id = ['es-001'];
  const result = evaluateDailyPhraseBatchStyle([row]);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(result.issues.some((item) => item.code === 'batch.invalid_row_id_type'));
});

test('style CLI reports both a duplicate selected id and a missing requested id', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-phrase-style-ids-'));
  const bankPath = path.join(tempDir, 'bank.json');
  try {
    fs.writeFileSync(bankPath, `${JSON.stringify({ rows: [approvedRow, structuredClone(approvedRow)] })}\n`);
    const result = spawnSync(process.execPath, [
      'scripts/daily_phrase_style_gate.mjs',
      bankPath,
      '--ids',
      'es-001,es-999',
    ], { cwd: process.cwd(), encoding: 'utf8' });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.notEqual(result.status, 0, output);
    assert.match(output, /duplicate[^\n]*es-001|es-001[^\n]*duplicate/iu);
    assert.match(output, /missing[^\n]*es-999|unknown[^\n]*es-999|es-999[^\n]*(?:missing|unknown)/iu);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('style CLI cannot select a one-element array id as a scalar id', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-phrase-style-array-id-'));
  const bankPath = path.join(tempDir, 'bank.json');
  try {
    const row = structuredClone(approvedRow);
    row.id = ['es-001'];
    fs.writeFileSync(bankPath, `${JSON.stringify({ rows: [row] })}\n`);
    const result = spawnSync(process.execPath, [
      'scripts/daily_phrase_style_gate.mjs', bankPath, '--ids', 'es-001',
    ], { cwd: process.cwd(), encoding: 'utf8' });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.notEqual(result.status, 0, output);
    assert.match(output, /invalid[^\n]*id|missing[^\n]*es-001|unknown[^\n]*es-001/iu);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
