import fs from 'fs';
import path from 'path';

import {
  buildFlashcardDocFieldMarkers,
  decideFlashcardDocField,
  flashcardDocFieldClearedMarkerKey,
} from '../app/flashcards_doc_field_clear';
import { normalizeEol } from './helpers/read_source';

/*
 * Account V2, Пакет 8H-2 — сторож очистки progress.flashcards_v1 в документе.
 *
 * зачем: поле документа затеняло страницы flashcard_pages навсегда (restore
 * предпочитает поле), и удалённая карточка «возвращалась». После успешной
 * записи страниц клиент один раз ставит поле в null; при сбое страниц — пишет
 * список в документ как раньше; повторный null не шлётся (маркер в снимке).
 */

const ROOT = path.resolve(__dirname, '..');
const EN = 'flashcards_v1';
const FR = 'flashcards_v1::fr';
const MARK_EN = flashcardDocFieldClearedMarkerKey(EN);

describe('8H-2 — решение по полю документа', () => {
  test('страницы записались, маркера нет → clear (в патч уйдёт null)', () => {
    expect(decideFlashcardDocField({}, EN, true)).toBe('clear');
  });

  test('страницы НЕ записались → keep_in_doc (список едет в документ как раньше)', () => {
    expect(decideFlashcardDocField({}, EN, false)).toBe('keep_in_doc');
    expect(decideFlashcardDocField({ [MARK_EN]: '1' }, EN, false)).toBe('keep_in_doc');
  });

  test('маркер уже стоит → already_cleared (null повторно не шлём)', () => {
    expect(decideFlashcardDocField({ [MARK_EN]: '1' }, EN, true)).toBe('already_cleared');
  });

  test('маркер одного ключа не влияет на другой', () => {
    expect(decideFlashcardDocField({ [MARK_EN]: '1' }, FR, true)).toBe('clear');
  });
});

describe('8H-2 — маркеры для нового снимка', () => {
  test('обнулили сейчас → маркер ставится', () => {
    expect(buildFlashcardDocFieldMarkers({}, [EN, FR], new Set([EN]), new Set())).toEqual({ [MARK_EN]: '1' });
  });

  test('маркер был, в документ ничего не уезжало → маркер переносится', () => {
    expect(buildFlashcardDocFieldMarkers({ [MARK_EN]: '1' }, [EN, FR], new Set(), new Set())).toEqual({ [MARK_EN]: '1' });
  });

  test('список уехал в документ (сбой страниц) → маркер снимается', () => {
    expect(buildFlashcardDocFieldMarkers({ [MARK_EN]: '1' }, [EN, FR], new Set(), new Set([EN]))).toEqual({});
  });

  test('без маркера и без очистки — пусто', () => {
    expect(buildFlashcardDocFieldMarkers({}, [EN, FR], new Set(), new Set())).toEqual({});
  });
});

describe('8H-2 — встройка в doSyncToCloud (структура cloud_sync)', () => {
  const source = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'cloud_sync.ts'), 'utf8')).split('\r\n').join('\n');
  const start = source.indexOf('async function doSyncToCloud(');
  const body = source.slice(start, source.indexOf('\n}\n', start));

  // 8K: цикл выгрузки карточек вынесен в общий путь (app/flashcards_cloud_upload.ts).
  const helperSource = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'flashcards_cloud_upload.ts'), 'utf8')).split('\r\n').join('\n');
  const helperStart = helperSource.indexOf('export async function uploadFlashcardListsToPages(');
  const helper = helperSource.slice(helperStart, helperSource.indexOf('\n}\n', helperStart));

  test('решение берётся по результату записи страниц', () => {
    expect(helperStart).toBeGreaterThan(0);
    const writeAt = helper.indexOf('const pagesWritten = await deps.writePages(uid, target, String(value));');
    const decideAt = helper.indexOf('decideFlashcardDocField(previousSnapshot, key, pagesWritten !== null)');
    expect(writeAt).toBeGreaterThan(0);
    expect(decideAt).toBeGreaterThan(writeAt);
  });

  test('null кладётся в патч ДО записи документа и только для очищаемых ключей', () => {
    const nullAt = body.indexOf('for (const key of flashcardDocFieldsToClear) progressPatch[key] = null;');
    expect(nullAt).toBeGreaterThan(body.indexOf('await uploadFlashcardListsToPages({'));
    expect(nullAt).toBeLessThan(body.indexOf('const hasProgressPatch = Object.keys(progressPatch).length > 0;'));
    expect(nullAt).toBeLessThan(body.indexOf('await writeUserDocWithNestedProgress(docRef, rootPatch, progressPatch);'));
    // Ветка «список не менялся с прошлого синка» поле НЕ трогает: страниц в этот такт не писали.
    const unchangedBranch = helper.slice(
      helper.indexOf("if (mode === 'sync' && cloudSyncSnapshotValueMatches(previousSnapshot[key], value)) {"),
      helper.indexOf('const pagesWritten = await deps.writePages('),
    );
    expect(unchangedBranch.length).toBeGreaterThan(0);
    expect(unchangedBranch).not.toContain('clearDocField');
  });

  test('маркер пишется в снимок только после успешной записи документа', () => {
    const wroteAt = body.indexOf('if (!wrote) return;');
    const markersAt = body.indexOf('buildFlashcardDocFieldMarkers(');
    const snapshotSaveAt = body.indexOf('writeLastSyncSnapshot(JSON.stringify(snapshotData)');
    expect(wroteAt).toBeGreaterThan(0);
    expect(markersAt).toBeGreaterThan(wroteAt);
    expect(markersAt).toBeLessThan(snapshotSaveAt);
    const logAt = body.indexOf('[LEGACY-V2-SYNC] doc_field_cleared key=${key}');
    expect(logAt).toBeGreaterThan(wroteAt);
  });

  test('сбой страниц снимает маркер (список уехал в документ)', () => {
    const failBranch = helper.slice(
      helper.indexOf("if (decision !== 'keep_in_doc') {"),
      helper.indexOf('offload failed key=${key}'),
    );
    expect(failBranch).toContain('} else {\n      sentToDoc.add(key);');
    // успешная ветка выкидывает список из патча, сбойная — нет
    expect(failBranch.indexOf('offloaded.add(key);')).toBeLessThan(failBranch.indexOf('} else {'));
    expect(body).toContain('const flashcardDocFieldsSentToDoc = flashcardUpload.sentToDoc;');
  });
});
