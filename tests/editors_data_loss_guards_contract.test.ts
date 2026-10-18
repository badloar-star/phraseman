// зачем (аудит Optimistic UI, координатор 15.10, дыры 1–3 «потеря данных пользователя»; docs/work/tasks/optimistic-ui-night-2026-10-15.md):
//  (1) редактор карточки: сбой загрузки не оставляет пустую форму, из которой «Сохранить» делает ДУБЛЬ вместо правки;
//  (2) редактор набора: двойной тап «Удалить» удаляет ровно одну, нужную карточку (не соседнюю по сдвинувшемуся индексу);
//  (3) редактор набора: снятие публикации — ТОЛЬКО после успешного сохранения;
//  (4) Настройки: двойной тап по «Ввести промокод» / «Пригласить друга» не открывает экран дважды.
import fs from 'node:fs';
import path from 'node:path';

import { PACK_ROW_DELETE_LOCK_MS, rowsWithout } from '../app/community_packs/pack_rows_remove';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

type R = { id: string; en: string };
const renumber = (rows: R[]): R[] => rows.map((row, i) => ({ ...row, id: `c${i + 1}` }));

describe('(2) удаление строки редактора набора: ровно одна, нужная', () => {
  const a: R = { id: 'c1', en: 'a' };
  const b: R = { id: 'c2', en: 'b' };
  const c: R = { id: 'c3', en: 'c' };

  it('первое удаление убирает выбранную строку', () => {
    expect(rowsWithout([a, b, c], 0, a)).toEqual([b, c]);
  });

  it('устаревший второй тап (строки уже пересобраны) НЕ удаляет соседнюю', () => {
    const afterFirst = renumber(rowsWithout([a, b, c], 0, a) as R[]); // новые объекты c1=b, c2=c
    expect(rowsWithout(afterFirst, 0, a)).toBeNull(); // ссылка на старую строку a ≠ новой строке по индексу 0
    expect(afterFirst.map((r) => r.en)).toEqual(['b', 'c']);
  });

  it('индекс вне списка — ничего не удаляется; без ожидаемой строки — по индексу как раньше', () => {
    expect(rowsWithout([a, b], 5, a)).toBeNull();
    expect(rowsWithout([a, b], -1)).toBeNull();
    expect(rowsWithout([a, b], 1)).toEqual([a]);
  });

  it('замок по времени закрывает окно закрытия шторки (≈440 мс)', () => {
    expect(PACK_ROW_DELETE_LOCK_MS).toBeGreaterThanOrEqual(440);
    const screen = read('app/community_pack_create.tsx');
    const fn = screen.slice(screen.indexOf('const removeRow = useCallback('), screen.indexOf('const moveRow = useCallback('));
    expect(fn).toContain('[OPT-UI] pack_row_delete ignored reason=double_tap');
    expect(fn).toContain('[OPT-UI] pack_row_delete ignored reason=stale_row');
    expect(fn).toContain('rowsWithout(r, idx, expected)');
    expect(screen).toContain('if (idx != null) removeRow(idx, menuRow);');
  });
});

describe('(1) редактор карточки: сбой загрузки не даёт пустую форму для дубля', () => {
  const src = read('app/flashcards_card_editor.tsx');
  it('catch загрузки скрывает форму, пишет [CARD-EDITOR] и показывает тост', () => {
    const catchBlock = src.slice(src.indexOf("DebugLogger.error('flashcards_card_editor:load_card'"), src.indexOf('}, [isEdit, editId, lang, studyTarget]);'));
    expect(catchBlock).toContain('[CARD-EDITOR] load failed -> form blocked');
    expect(catchBlock).toContain('setNotFound(true);');
    expect(catchBlock).toContain("Не удалось открыть карточку.");
    expect(catchBlock).toContain("pl: 'Nie udało się otworzyć karty.'");
  });
  it('«Сохранить» заблокирован, пока isEdit && !existing (кнопка и сам обработчик)', () => {
    expect(src).toContain('const canSave = enOk && trOk && !saving && !loadingCard && !(isEdit && !existing) && !creatorGated;');
    const handler = src.slice(src.indexOf('const handleSave = useCallback('), src.indexOf('Keyboard.dismiss();', src.indexOf('const handleSave = useCallback(')));
    expect(handler).toContain('[CARD-EDITOR] save blocked: isEdit && !existing');
  });
});

describe('(3) редактор набора: публикация снимается только после успешного сохранения', () => {
  const src = read('app/community_pack_create.tsx');
  const submit = src.slice(src.indexOf('const onSubmit = useCallback('), src.indexOf('}, [payload, localSaveError'));
  it('withdraw стоит ПОСЛЕ saveLocalAuthorPack и получает прежнее состояние', () => {
    const save = submit.indexOf('await saveLocalAuthorPack(');
    const withdraw = submit.indexOf('await withdrawLocalAuthorPack(savedId, previous);');
    expect(save).toBeGreaterThan(0);
    expect(withdraw).toBeGreaterThan(save);
    expect(submit).not.toContain('await withdrawLocalAuthorPack(previous.id)');
  });
  it('сбой снятия после сохранения — отдельное сообщение, форма остаётся (return), причина в журнале', () => {
    expect(submit).toContain('[PACK-CREATE] save ok, withdraw failed');
    expect(submit).toContain('Снять с публикации не получилось');
    const catchStart = submit.indexOf('catch (withdrawError: unknown)');
    expect(submit.indexOf('return;', catchStart)).toBeGreaterThan(catchStart);
  });
  it('withdrawLocalAuthorPack учитывает прежнее состояние заявки (pending/submitted) после сохранения', () => {
    const publish = read('app/community_packs/publishLocalPack.ts');
    const fn = publish.slice(publish.indexOf('export async function withdrawLocalAuthorPack'));
    expect(fn).toContain("before?: Readonly<{ publicationState?: string }>");
    expect(fn).toContain("before?.publicationState === 'pending' || before?.publicationState === 'submitted'");
    // прежние гарантии стирания «последнего известного» остаются
    expect(fn).toMatch(/forgetAuthorPackLastKnown\(local\.cloudPackId\)/);
    expect(fn).toMatch(/forgetAuthorPackLastKnown\(local\.id\)/);
  });
});

describe('(4) Настройки: «Ввести промокод» и «Пригласить друга» — один переход на двойной тап', () => {
  const src = read('app/(tabs)/settings.tsx');
  it('замок по времени и журнал ранних выходов', () => {
    expect(src).toContain('const claimSettingsPush = (target: string): boolean => {');
    expect(src).toContain('[OPT-UI] settings_push ignored reason=double_tap');
    expect(src).toContain("if (!claimSettingsPush('promo_code_entry')) return;");
    expect(src).toContain("if (!claimSettingsPush('referrals')) return;");
  });

  // 18.10 (аудит Карточек, длинные названия; решение координатора 07:14): сервер режет название до 200, шапка набора переносит
  // его целиком — поле ограничено 80 символами, не больше серверного предела (иначе у автора оставалось бы длиннее, чем у всех).
  it('pack title input is capped at 80 and never above what the server keeps', () => {
    const src = read('app/community_pack_create.tsx');
    const server = read('functions/src/community_packs.ts');
    const serverMax = Number(/titleRu = \(sourceLang === 'ru' \? titleSingle : String\(raw\.titleRu \?\? ''\)\.trim\(\)\)\.slice\(0, (\d+)\)/.exec(server)?.[1]);
    expect(serverMax).toBeGreaterThan(0);
    expect(src).toContain('const PACK_TITLE_MAX_CHARS = 80;');
    expect(80).toBeLessThanOrEqual(serverMax);
    const input = src.slice(src.indexOf('ref={titleInputRef}'), src.indexOf('ref={titleInputRef}') + 900);
    expect(input).toContain('maxLength={PACK_TITLE_MAX_CHARS}');
  });
});
