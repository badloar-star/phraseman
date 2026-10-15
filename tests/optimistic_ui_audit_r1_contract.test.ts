// зачем (координатор 12.10, правило владельца №10 «Optimistic UI», аудит docs/phraseman-2.0/OPTIMISTIC_UI_AUDIT_R1.md): дешёвые пробелы, закрытые аудитом, не должны вернуться —
// «Добавить себе» откатывается и при исключении записи; отклики откатывают реакцию/закрепление и говорят об отказе; закладка карточки не откатывается молча; переключатель настроек
// не остаётся «включённым» при отказе записи, поздний ответ чтения его не затирает; двойной тап не создаёт дубль; «Вернуть» возвращает карточку в список до записи.
const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: (...args: unknown[]) => mockSetItem(...args), removeItem: jest.fn(async () => undefined), multiSet: jest.fn(async () => undefined), multiGet: jest.fn(async () => []) },
}));

/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));
const section = (source: string, start: string, length = 2600): string => {
  const at = source.indexOf(start);
  if (at < 0) throw new Error(`нет ${start}`);
  return source.slice(at, at + length);
};

describe('Optimistic UI audit R1 — cheap gaps stay closed', () => {
  it('«Добавить себе» rolls back with a clear message when the write throws', () => {
    // зачем (ревью покупки a15631ea5, 12.10): перед оптимистичным шагом добавилась ветка «платный набор без обработчика» (≈34 строки) — окно проверки расширено, правило отката то же
    const bar = section(read('app/community_packs/CommunityPackSocialBar.tsx'), 'const onAddPress = useCallback', 6600);
    expect(bar).toMatch(/try \{\s*res = await addCommunityPackToLibrary\(pack, studyTarget\);\s*\} catch/);
    expect(bar).toMatch(/\[OPT-UI\] pack_add threw/);
    expect(bar).toMatch(/emitAppEvent\('action_toast', packAddFailureToast\(res\)\)/);
    // зачем (аудит Optimistic UI 15.10, дыра №6): откат не отменяет чужое более новое действие — «newer» откатывает только свои поля, иначе целиком прежний снимок
    expect(bar).toMatch(/setSnapshot\(newer \? .* : before\)/);
  });

  it('comment reactions, pins, deletes and hides roll back and tell the user', () => {
    const sheet = read('app/community_packs/PackCommentsSheet.tsx');
    for (const tag of ['comment_reaction rollback', 'comment_pin rollback', 'comment_delete rollback', 'comment_hide rollback']) expect(sheet).toContain(`[OPT-UI] ${tag}`);
    expect(sheet).toMatch(/togglePackCommentReaction\(packId, comment\.id, myUserId, reaction, !had\)\.then\(\(ok\) =>/);
    expect(sheet).toMatch(/setPackCommentPinned\(packId, comment\.id, nextPinned\)\.then\(\(ok\) =>/);
    expect(sheet).toMatch(/if \(!myUserId \|\| sending \|\| sendLockRef\.current\) return;/); // синхронный замок отправки
    expect(sheet.match(/sendLockRef\.current = false/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('the bookmark toggle never rolls back silently', () => {
    const add = read('components/AddToFlashcard.tsx');
    expect(add).not.toMatch(/catch \{\s*setSaved\(/); // немой откат убран
    for (const tag of ['card_remove rollback reason=not_removed', 'card_remove rollback reason=threw', 'card_save rollback reason=stale', 'card_save rollback reason=threw']) expect(add).toContain(`[OPT-UI] ${tag}`);
    expect(add.match(/emitAppEvent\('action_toast'/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('learning settings: late load does not overwrite a fresh choice; a failed save reverts the switch', () => {
    const edu = read('app/settings_edu.tsx');
    expect(edu).toMatch(/editVersionRef\.current !== loadStartedAtVersion/);
    // E6: запись вынесена из обновителя состояния; при отказе хранилища откатывается только своя строка и только если её не изменили позже
    const update = section(edu, 'const update = (key: keyof UserSettings', 2600);
    expect(update).toMatch(/editVersionRef\.current \+= 1;/);
    expect(update).not.toMatch(/setS\(prev =>/);
    expect(update.indexOf('setS(next)')).toBeGreaterThan(-1);
    expect(update.indexOf('setS(next)')).toBeLessThan(update.indexOf('applyUserSettingsNow(next)'));
    expect(update).toMatch(/if \(persisted\) return;/);
    expect(update).toMatch(/latestSettingsRef\.current\[key\] !== val/);
    expect(update).toContain('[OPT-UI] settings_edu rollback key=');
    expect(update).toContain('[OPT-UI] settings_edu rollback skipped');
    expect(update).toMatch(/\[key\]: previous\[key\]/);
    expect(update).toMatch(/emitAppEvent\('action_toast'/);
    // зачем (аудит Optimistic UI «Настроек» 2a92df6fe): откат тумблера защищён от гонки — возвращает значение, только если его не успели изменить снова
    expect(edu).toMatch(/logToggleSaveFailure\('fc_sfx', \(\) => setFcSfx\(\(current\) => \(current === value \? !value : current\)\)\)/);
    expect(edu).toMatch(/logToggleSaveFailure\('fc_autospeak', \(\) => setFcAutoSpeak\(\(current\) => \(current === value \? !value : current\)\)\)/);
  });

  it('the card editor locks double taps synchronously', () => {
    const editor = read('app/flashcards_card_editor.tsx');
    expect(editor).toMatch(/if \(saveLockRef\.current\) \{/);
    expect(editor.indexOf('saveLockRef.current = true')).toBeGreaterThan(editor.indexOf('if (saveLockRef.current)'));
    expect(editor).toMatch(/saveLockRef\.current = false;\s*setSaving\(false\)/);
  });

  it('«Вернуть» puts the card back in the list before the storage write finishes', () => {
    const collection = read('app/flashcards/useCollectionData.ts');
    const undo = section(collection, 'const undoDelete = useCallback', 4200);
    const batch = undo.slice(undo.indexOf("entry.batch?.kind === 'saved'"), undo.indexOf("entry.kind === 'custom'"));
    expect(batch.indexOf('updateSavedCards(')).toBeGreaterThan(-1);
    expect(batch.indexOf('updateSavedCards(')).toBeLessThan(batch.indexOf('await restoreFlashcard('));
    const single = undo.slice(undo.indexOf('} else {\n        const uiCard'), undo.indexOf('} catch (error: unknown)'));
    expect(single.indexOf('updateSavedCards(')).toBeLessThan(single.indexOf('await restoreFlashcard('));
    expect(undo).toContain('[OPT-UI] undo_delete rollback');
    // E4: СВОЯ карточка тоже возвращается в список до записи; при сбое список своих перечитывается
    const custom = undo.slice(undo.indexOf("entry.kind === 'custom'"), undo.indexOf('} else {\n        const uiCard'));
    expect(custom.indexOf('updateCustomCards(')).toBeGreaterThan(-1);
    expect(custom.indexOf('updateCustomCards(')).toBeLessThan(custom.indexOf('await restoreCustomCard('));
    expect(undo).toMatch(/listCustomCards\(studyTarget\)/);
    expect(undo).toContain('[OPT-UI] undo_delete custom reload_failed');
    expect(collection).toContain('[OPT-UI] batch_delete rollback');
  });

  it('a failed settings write is logged, not swallowed', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('disk_full'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const { applyUserSettingsNow, getUserSettingsSnapshot } = await import('../app/user_settings_store');
    const persisted = await applyUserSettingsNow({ ...getUserSettingsSnapshot(), autoCheck: true });
    expect(persisted).toBe(false); // E6: экран узнаёт об отказе и откатывает тумблер
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[OPT-UI] user_settings persist_failed reason=disk_full'));
    mockSetItem.mockResolvedValueOnce(undefined);
    expect(await applyUserSettingsNow({ ...getUserSettingsSnapshot(), autoCheck: false })).toBe(true);
    jest.restoreAllMocks();
  });
});
