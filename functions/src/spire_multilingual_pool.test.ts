import { createHash } from 'crypto';
import { validateTournamentTaskForNewRoom } from './tournament_core';
import {
  SPIRE_MULTILINGUAL_REQUIRED_TASKS,
  spireInspectMultilingualPool,
  spireInspectMultilingualRow,
  spireMultilingualPoolSourceHash,
  spireMultilingualReleaseGate,
  spireReleaseMultilingualPool,
} from './spire_multilingual_pool';
import type { TournamentTask } from './tournament_core';

function grammarOptions(correctIndex: number) {
  return ['a', 'b', 'c', 'd'].map((_, i) => ({
    token: `t${i}`,
    grammatical: i === correctIndex,
    reason: i === correctIndex ? 'matches_subject_person' : 'verb_person_conflicts_with_fixed_subject',
  }));
}

function choiceRow(mode: string, over: Record<string, unknown> = {}) {
  const base = {
    schemaVersion: 'arena-multilingual-task-v1',
    taskId: `arena-es-${mode}-1-0000`,
    studyTarget: 'es',
    mode,
    difficulty: 1,
    payload: {
      promptRu: 'Я силён.',
      stem: { prefix: 'Yo ', suffix: ' fuerte.' },
      options: ['soy', 'eres', 'es', 'somos'],
      correctIndex: 0,
      grammarMatrix: { options: grammarOptions(0) },
    },
  };
  return { ...base, ...over };
}

function structurallyValidate(task: TournamentTask) {
  return validateTournamentTaskForNewRoom({ ...task, verified: true });
}

describe('spireInspectMultilingualRow', () => {
  test('guess_phrase/fill_gap конвертируются в choice с готовым explanation и проходят серверную проверку', () => {
    for (const mode of ['guess_phrase', 'fill_gap']) {
      const task = spireInspectMultilingualRow(choiceRow(mode));
      expect(task).not.toBeNull();
      expect(task!.mode).toBe(mode);
      expect(task!.payload.phrase).toBe('Yo ___ fuerte.');
      expect(task!.explanation!.example).toBe('Yo soy fuerte.');
      expect(task!.explanation!.wrongOptionReasons).toEqual([
        '', 'Форма глагола не согласована с этим подлежащим по лицу.',
        'Форма глагола не согласована с этим подлежащим по лицу.',
        'Форма глагола не согласована с этим подлежащим по лицу.',
      ]);
      expect(task!.verified).toBe(false);
      const validation = structurallyValidate(task!);
      expect(validation.ok).toBe(true);
    }
  });

  test('guess_phrase без stem использует promptRu как phrase (пример: guess_phrase из чистого текста)', () => {
    const row = choiceRow('guess_phrase', {
      payload: {
        promptRu: 'Выбери верный перевод.',
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 1,
        grammarMatrix: { options: grammarOptions(1) },
      },
    });
    const task = spireInspectMultilingualRow(row);
    expect(task!.payload.phrase).toBe('Выбери верный перевод.');
    expect(structurallyValidate(task!).ok).toBe(true);
  });

  test('find_oddity читает oddityIndex и inverseProof.options, ruleNote другой (найди ошибку)', () => {
    const row = choiceRow('find_oddity', {
      payload: {
        promptRu: 'Найдите фразу с ошибкой.',
        options: ['a', 'b', 'c', 'd'],
        oddityIndex: 2,
        inverseProof: {
          options: [
            { grammatical: true, reason: 'subject_verb_person_agree' },
            { grammatical: true, reason: 'subject_verb_person_agree' },
            { grammatical: false, reason: 'only_error_subject_verb_person_mismatch' },
            { grammatical: true, reason: 'subject_verb_person_agree' },
          ],
        },
      },
    });
    const task = spireInspectMultilingualRow(row);
    expect(task!.payload.correctIndex).toBe(2);
    expect(task!.explanation!.ruleNote).toBe('Найди вариант с ошибкой согласования.');
    expect(task!.explanation!.wrongOptionReasons).toEqual([
      'Подлежащее и сказуемое здесь согласованы верно.',
      'Подлежащее и сказуемое здесь согласованы верно.',
      '',
      'Подлежащее и сказуемое здесь согласованы верно.',
    ]);
    expect(structurallyValidate(task!).ok).toBe(true);
  });

  test('translate_build конвертируется в translate (tokenBank → wordBank, promptRu → phrase), проходит серверную проверку', () => {
    const row = {
      schemaVersion: 'arena-multilingual-task-v1',
      taskId: 'arena-es-translate_build-1-0000',
      studyTarget: 'es',
      mode: 'translate_build',
      difficulty: 1,
      payload: {
        promptRu: 'Я нахожусь в банке.',
        correctTokens: ['Yo', 'estoy', 'en', 'el', 'banco.'],
        tokenBank: ['estás', 'en', 'Yo', 'estoy', 'el', 'banco.'],
        correctTokenCount: 5,
        samePosDecoy: { token: 'estás' },
      },
    };
    const task = spireInspectMultilingualRow(row);
    expect(task).not.toBeNull();
    expect(task!.mode).toBe('translate_build');
    expect(task!.payload.phrase).toBe('Я нахожусь в банке.');
    expect(task!.payload.wordBank).toEqual(row.payload.tokenBank);
    expect(task!.payload.correctTokenCount).toBe(5);
    expect(task!.explanation!.example).toBe('Yo estoy en el banco.');
    expect(task!.explanation!.ruleNote).toContain('Плашка «estás» лишняя');
    expect(structurallyValidate(task!).ok).toBe(true);
  });

  test('speed_match без доказанных коротких плиток пропускается', () => {
    const row = {
      schemaVersion: 'arena-multilingual-task-v1',
      taskId: 'arena-es-speed_match-1-0000',
      studyTarget: 'es',
      mode: 'speed_match',
      difficulty: 1,
      payload: { pairs: [{ left: 'a', right: 'b' }] },
    };
    expect(spireInspectMultilingualRow(row)).toBeNull();
  });

  test('speed_match с 6 доказанными короткими парами проходит строгий игровой контракт', () => {
    const pairs = [
      ['я есть', 'soy'], ['ты есть', 'eres'], ['он есть', 'es'],
      ['мы есть', 'somos'], ['я имею', 'tengo'], ['ты имеешь', 'tienes'],
    ].map(([tileLeft, tileRight], index) => ({
      left: `Полный перевод ${index}.`,
      right: `Frase completa ${index}.`,
      tileLeft,
      tileRight,
      factId: `fact-${index}`,
      senseEvidence: { sourceFactIds: [`fact-${index}`] },
    }));
    const task = spireInspectMultilingualRow({
      schemaVersion: 'arena-multilingual-task-v1',
      taskId: 'arena-es-speed_match-1-0000',
      studyTarget: 'es',
      mode: 'speed_match',
      difficulty: 1,
      payload: { pairs },
    });
    expect(task).not.toBeNull();
    expect(task!.payload.prompt).toBe('Соедините русские значения со словами и короткими выражениями.');
    expect(new Set(task!.payload.rightOptions as string[])).toEqual(new Set(['soy', 'eres', 'es', 'somos', 'tengo', 'tienes']));
    expect(task!.payload.rightOptions).not.toEqual(['soy', 'eres', 'es', 'somos', 'tengo', 'tienes']);
    expect(task!.payload.items).toHaveLength(6);
    expect((task!.payload.items as Array<Record<string, unknown>>)[0]).toMatchObject({ prompt: 'я есть' });
    expect(task!.explanation!.example).toBe('я есть — soy');
    expect(task!.explanation!.ruleNote).not.toContain('глагола');
    for (const item of task!.payload.items as Array<Record<string, unknown>>) {
      const options = item.options as string[];
      const correctIndex = item.correctIndex as number;
      expect((item.explanation as { example: string }).example).toBe(`${item.prompt} — ${options[correctIndex]}`);
    }
    expect(structurallyValidate(task!).ok).toBe(true);
  });

  test('неизвестная/битая строка не роняет конвертер', () => {
    expect(spireInspectMultilingualRow(null)).toBeNull();
    expect(spireInspectMultilingualRow({})).toBeNull();
    expect(spireInspectMultilingualRow({ schemaVersion: 'wrong' })).toBeNull();
  });

  test('незнакомый reason-код не роняет конвертер — уходит в нейтральный текст', () => {
    const row = choiceRow('guess_phrase', {
      payload: {
        promptRu: 'x', stem: { prefix: 'a', suffix: 'b' }, options: ['a', 'b', 'c', 'd'], correctIndex: 0,
        grammarMatrix: { options: [
          { reason: 'matches_subject_person' },
          { reason: 'totally_unknown_future_code' },
          { reason: 'totally_unknown_future_code' },
          { reason: 'totally_unknown_future_code' },
        ] },
      },
    });
    const task = spireInspectMultilingualRow(row);
    expect(task).not.toBeNull();
    expect(task!.explanation!.wrongOptionReasons?.[1]).toBe('Этот вариант не согласуется с правилом задания.');
  });

  test('НЕ проставляет v11-теги — строгая v11-проверка не должна активироваться', () => {
    const task = spireInspectMultilingualRow(choiceRow('guess_phrase'))!;
    expect(task.tags).toEqual([]);
    expect((task as { poolVersion?: string }).poolVersion).toBeUndefined();
  });
});

describe('spireInspectMultilingualPool', () => {
  test('fail-closed отклоняет строку другого studyTarget', () => {
    const rows = [choiceRow('guess_phrase', { studyTarget: 'de' })];

    const { tasks, stats } = spireInspectMultilingualPool('es', rows);

    expect(tasks).toHaveLength(0);
    expect(stats).toEqual({
      lang: 'es',
      totalRows: 1,
      converted: 0,
      skippedByMode: { target_mismatch: 1 },
    });
  });

  test('честно считает converted и skippedByMode, не молчит о пропусках', () => {
    const rows = [
      choiceRow('guess_phrase'),
      choiceRow('fill_gap'),
      { schemaVersion: 'arena-multilingual-task-v1', taskId: 'x', studyTarget: 'es', mode: 'speed_match', difficulty: 1, payload: {} },
    ];
    const { tasks, stats } = spireInspectMultilingualPool('es', rows);
    expect(tasks).toHaveLength(2);
    expect(tasks.every((task) => task.verified === false)).toBe(true);
    expect(stats).toEqual({ lang: 'es', totalRows: 3, converted: 2, skippedByMode: { speed_match: 1 } });
  });
});

function canonical(value: unknown): string {
  if (value === null || ['boolean', 'number', 'string'].includes(typeof value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value !== 'object') return JSON.stringify(null);
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(',')}}`;
}

function sha(value: unknown): string {
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

function releaseFixture() {
  const rows: Record<string, unknown>[] = Array.from({ length: SPIRE_MULTILINGUAL_REQUIRED_TASKS }, (_, index) => choiceRow('guess_phrase', {
    taskId: `arena-es-guess_phrase-1-${String(index).padStart(4, '0')}`,
  }));
  const tasksSha256 = sha(rows);
  const evidencePackSha256 = 'e'.repeat(64);
  const reviewReceiptBody = {
    schemaVersion: 'spire-multilingual-linguistic-review-v1',
    studyTarget: 'es',
    verdict: 'PASS',
    reviewerIndependence: 'independent_read_only',
    reviewerQualification: 'target_language_expert',
    linguisticEvidenceStatus: 'approved',
    cefrEvidenceStatus: 'not_claimed',
    tasksSha256,
    evidencePackSha256,
  };
  const linguisticReviewReceipt = { ...reviewReceiptBody, receiptSha256: sha(reviewReceiptBody) };
  const adminPublicationBody = {
    schemaVersion: 'spire-multilingual-admin-publication-v1',
    studyTarget: 'es',
    publicationStatus: 'approved',
    publicationId: 'synthetic-test-publication',
    publisherRole: 'content_admin',
    tasksSha256,
    linguisticReviewReceiptSha256: linguisticReviewReceipt.receiptSha256,
  };
  const body = {
    schemaVersion: 'arena-multilingual-pool-manifest-v1',
    studyTarget: 'es',
    verdict: 'PASS',
    releaseEligible: true,
    requiredTaskCount: SPIRE_MULTILINGUAL_REQUIRED_TASKS,
    generatedTaskCount: SPIRE_MULTILINGUAL_REQUIRED_TASKS,
    tasksSha256,
    evidencePackSha256,
    coverage: { lexicalFactInventoryStatus: 'approved' },
    linguisticReviewReceipt,
    adminPublicationReceipt: { ...adminPublicationBody, receiptSha256: sha(adminPublicationBody) },
  };
  return { rows, manifest: { ...body, manifestSha256: sha(body) } };
}

function resign(manifest: Record<string, unknown>): Record<string, unknown> {
  const body = Object.fromEntries(Object.entries(manifest).filter(([key]) => key !== 'manifestSha256'));
  return { ...body, manifestSha256: sha(body) };
}

function bindReviewedTaskHash(manifest: Record<string, unknown>, tasksSha256: string): Record<string, unknown> {
  const receipt = manifest.linguisticReviewReceipt as Record<string, unknown>;
  const receiptBody = {
    ...Object.fromEntries(Object.entries(receipt).filter(([key]) => key !== 'receiptSha256')),
    tasksSha256,
  };
  const linguisticReviewReceipt = { ...receiptBody, receiptSha256: sha(receiptBody) };
  const adminReceipt = manifest.adminPublicationReceipt as Record<string, unknown>;
  const adminReceiptBody = {
    ...Object.fromEntries(Object.entries(adminReceipt).filter(([key]) => key !== 'receiptSha256')),
    tasksSha256,
    linguisticReviewReceiptSha256: linguisticReviewReceipt.receiptSha256,
  };
  return resign({
    ...manifest,
    tasksSha256,
    linguisticReviewReceipt,
    adminPublicationReceipt: { ...adminReceiptBody, receiptSha256: sha(adminReceiptBody) },
  });
}

describe('spire multilingual release boundary', () => {
  test('только валидный PASS-манифест ровно на 4000 строк выпускает verified-задачи', () => {
    const { rows, manifest } = releaseFixture();
    const released = spireReleaseMultilingualPool('es', rows, manifest);
    expect(released.ok).toBe(true);
    if (!released.ok) return;
    expect(released.tasks).toHaveLength(SPIRE_MULTILINGUAL_REQUIRED_TASKS);
    expect(released.tasks.every((task) => task.verified === true)).toBe(true);
    expect(validateTournamentTaskForNewRoom(released.tasks[0]).ok).toBe(true);
  });

  test.each([
    ['schema', (m: Record<string, unknown>) => resign({ ...m, schemaVersion: 'wrong' }), 'manifest_invalid'],
    ['target', (m: Record<string, unknown>) => resign({ ...m, studyTarget: 'de' }), 'manifest_target_mismatch'],
    ['verdict', (m: Record<string, unknown>) => resign({ ...m, verdict: 'BLOCK' }), 'manifest_release_blocked'],
    ['eligible', (m: Record<string, unknown>) => resign({ ...m, releaseEligible: false }), 'manifest_release_blocked'],
    ['required count', (m: Record<string, unknown>) => resign({ ...m, requiredTaskCount: 1 }), 'manifest_task_count_mismatch'],
    ['generated count', (m: Record<string, unknown>) => resign({ ...m, generatedTaskCount: 1 }), 'manifest_task_count_mismatch'],
    ['task hash', (m: Record<string, unknown>) => resign({ ...m, tasksSha256: '0'.repeat(64) }), 'manifest_tasks_hash_mismatch'],
    ['self hash', (m: Record<string, unknown>) => ({ ...m, manifestSha256: '0'.repeat(64) }), 'manifest_self_hash_mismatch'],
  ])('fail-closed: %s', (_label, mutate, reason) => {
    const { rows, manifest } = releaseFixture();
    expect(spireMultilingualReleaseGate('es', rows, mutate(manifest))).toEqual({ ok: false, reason });
  });

  test('PASS/eligible и пересчитанный self-hash не заменяют независимый языковой и CEFR receipt', () => {
    const { rows, manifest } = releaseFixture();
    const withoutReviewProof = resign({
      ...manifest,
      coverage: { lexicalFactInventoryStatus: 'pending_native_review' },
    });
    expect(spireMultilingualReleaseGate('es', rows, withoutReviewProof)).toEqual({
      ok: false,
      reason: 'manifest_linguistic_review_missing',
    });
  });

  test('linguistic receipt привязан к точному корпусу, evidence pack и собственному хешу', () => {
    const { rows, manifest } = releaseFixture();
    const receipt = manifest.linguisticReviewReceipt as Record<string, unknown>;
    const wrongBindingBody = {
      ...Object.fromEntries(Object.entries(receipt).filter(([key]) => key !== 'receiptSha256')),
      tasksSha256: '0'.repeat(64),
    };
    const wrongBinding = resign({
      ...manifest,
      linguisticReviewReceipt: { ...wrongBindingBody, receiptSha256: sha(wrongBindingBody) },
    });
    expect(spireMultilingualReleaseGate('es', rows, wrongBinding)).toEqual({
      ok: false,
      reason: 'manifest_linguistic_review_binding_mismatch',
    });

    const badReceiptHash = resign({
      ...manifest,
      linguisticReviewReceipt: { ...receipt, receiptSha256: '0'.repeat(64) },
    });
    expect(spireMultilingualReleaseGate('es', rows, badReceiptHash)).toEqual({
      ok: false,
      reason: 'manifest_linguistic_review_hash_mismatch',
    });
  });

  test('не выпускает механически подписанную CEFR-метку без поэлементного evidence', () => {
    const { rows, manifest } = releaseFixture();
    rows[0] = { ...rows[0], cefrBand: 'A1', cefrProfile: { frameComplexity: 'invented' } };
    const rebound = bindReviewedTaskHash(manifest, sha(rows));
    expect(spireMultilingualReleaseGate('es', rows, rebound)).toEqual({
      ok: false,
      reason: 'bundle_unsupported_cefr_claim',
    });
  });

  test('лингвистический PASS не заменяет отдельную admin-publication квитанцию', () => {
    const { rows, manifest } = releaseFixture();
    const { adminPublicationReceipt: _omitted, ...withoutPublication } = manifest;
    expect(spireMultilingualReleaseGate('es', rows, resign(withoutPublication))).toEqual({
      ok: false,
      reason: 'manifest_admin_publication_missing',
    });
  });

  test('admin-publication receipt привязан к reviewed corpus и собственному хешу', () => {
    const { rows, manifest } = releaseFixture();
    const receipt = manifest.adminPublicationReceipt as Record<string, unknown>;
    const wrongBindingBody = {
      ...Object.fromEntries(Object.entries(receipt).filter(([key]) => key !== 'receiptSha256')),
      tasksSha256: '0'.repeat(64),
    };
    const wrongBinding = resign({
      ...manifest,
      adminPublicationReceipt: { ...wrongBindingBody, receiptSha256: sha(wrongBindingBody) },
    });
    expect(spireMultilingualReleaseGate('es', rows, wrongBinding)).toEqual({
      ok: false,
      reason: 'manifest_admin_publication_binding_mismatch',
    });
    const wrongHash = resign({
      ...manifest,
      adminPublicationReceipt: { ...receipt, receiptSha256: '0'.repeat(64) },
    });
    expect(spireMultilingualReleaseGate('es', rows, wrongHash)).toEqual({
      ok: false,
      reason: 'manifest_admin_publication_hash_mismatch',
    });
  });

  test('самосогласованный манифест на одну строку не обходит контракт 4000', () => {
    const rows = [choiceRow('guess_phrase')];
    const { manifest } = releaseFixture();
    const one = resign({ ...manifest, requiredTaskCount: 1, generatedTaskCount: 1, tasksSha256: sha(rows) });
    expect(spireMultilingualReleaseGate('es', rows, one)).toEqual({ ok: false, reason: 'manifest_task_count_mismatch' });
  });

  test('смешанный studyTarget блокирует весь bundle, а не только одну строку', () => {
    const { rows, manifest } = releaseFixture();
    rows[10] = choiceRow('guess_phrase', { taskId: 'wrong-target', studyTarget: 'de' });
    const withNewTaskHash = bindReviewedTaskHash(manifest, sha(rows));
    expect(spireMultilingualReleaseGate('es', rows, withNewTaskHash)).toEqual({ ok: false, reason: 'bundle_target_mismatch' });
  });

  test('ровно 4000 строк не обходят release boundary повторяющимся taskId', () => {
    const { rows, manifest } = releaseFixture();
    rows[1] = { ...rows[1], taskId: rows[0].taskId };
    const rebound = bindReviewedTaskHash(manifest, sha(rows));
    expect(spireMultilingualReleaseGate('es', rows, rebound)).toEqual({
      ok: false,
      reason: 'bundle_duplicate_task_id',
    });
  });

  test('PASS на 4000 исходных строк всё равно блокируется, если хотя бы одна строка не конвертируется', () => {
    const { rows, manifest } = releaseFixture();
    rows[10] = {
      schemaVersion: 'arena-multilingual-task-v1',
      taskId: 'arena-es-speed_match-1-0010',
      studyTarget: 'es',
      mode: 'speed_match',
      difficulty: 1,
      payload: { pairs: [] },
    };
    const withNewTaskHash = bindReviewedTaskHash(manifest, sha(rows));
    expect(spireReleaseMultilingualPool('es', rows, withNewTaskHash)).toEqual({
      ok: false,
      reason: 'converted_task_count_mismatch',
    });
  });

  test('PASS и 4000 converted не обходят строгий контракт игровых задач', () => {
    const rows: Record<string, unknown>[] = Array.from(
      { length: SPIRE_MULTILINGUAL_REQUIRED_TASKS },
      (_, index) => ({
        schemaVersion: 'arena-multilingual-task-v1',
        taskId: `arena-es-translate_build-1-${String(index).padStart(4, '0')}`,
        studyTarget: 'es',
        mode: 'translate_build',
        difficulty: 1,
        payload: {
          promptRu: 'Я.',
          correctTokens: ['yo'],
          tokenBank: ['no'],
          correctTokenCount: 1,
        },
      }),
    );
    const { manifest } = releaseFixture();
    const withNewTaskHash = bindReviewedTaskHash(manifest, sha(rows));
    expect(spireReleaseMultilingualPool('es', rows, withNewTaskHash)).toEqual({
      ok: false,
      reason: 'converted_task_invalid',
    });
  });
});

describe('spireMultilingualPoolSourceHash', () => {
  test('детерминирован и меняется при изменении содержимого', () => {
    const rows = [choiceRow('guess_phrase')];
    const h1 = spireMultilingualPoolSourceHash(rows);
    const h2 = spireMultilingualPoolSourceHash(rows);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    const h3 = spireMultilingualPoolSourceHash([choiceRow('fill_gap')]);
    expect(h3).not.toBe(h1);
  });
});
