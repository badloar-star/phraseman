// зачем (координатор 18.10): метки «последнее место» Главной (урок V2, время старого урока, диалог, набор карточек) принадлежат
// аккаунту — общее стирание при выходе/смене/удалении и аварийная копия берут их из accountOwnedStorageKeysFrom. Раньше их
// снимал только фоновый подписчик home_continue_mark; сторож описи принимал аргументы 'dialog'/'cards' за ключи.
import fs from 'node:fs';
import path from 'node:path';
import { accountOwnedStorageKeysFrom } from '../app/cloud_sync';
import { classifyGuestCleanKey } from '../app/guest_clean_classifier';
import { LEARNING_LANGUAGE_TARGETS } from '../app/learning_language_contour';
import {
  HOME_CONTINUE_MARK_KINDS,
  HOME_CONTINUE_MARK_PREFIX,
  homeContinueMarkKey,
  homeContinueMarkKeys,
} from '../app/target_storage_keys';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

describe('метки «последнее место» Главной и стирание аккаунта', () => {
  it('все 4 метки каждого языка — в описи аккаунта (стирание и копия)', () => {
    const owned = new Set(accountOwnedStorageKeysFrom([]));
    for (const target of LEARNING_LANGUAGE_TARGETS) {
      for (const key of homeContinueMarkKeys(target)) expect(owned.has(key)).toBe(true);
    }
  });

  it('английский ключ = объявленный префикс + вид; порядок v2, at, dialog, cards', () => {
    expect(HOME_CONTINUE_MARK_KINDS).toEqual(['v2', 'at', 'dialog', 'cards', 'map']);
    for (const kind of HOME_CONTINUE_MARK_KINDS) {
      expect(homeContinueMarkKey(kind, 'en')).toBe(`${HOME_CONTINUE_MARK_PREFIX}${kind}`);
    }
    expect(homeContinueMarkKey('dialog', 'es')).toBe('lesson_session_local_v2::es::last_opened_lesson__continue_dialog');
  });

  it('«чистый гость» считает метки служебными — вход ведёт себя как раньше', () => {
    for (const key of [...homeContinueMarkKeys('en'), ...homeContinueMarkKeys('fr')]) {
      expect(classifyGuestCleanKey(key, '{"id":"x","title":"t","route":{"pathname":"/a"},"atMs":1}')).toBe('service');
    }
  });

  it('Главная строит ключи только общим построителем, без строк-видов внутри вызова хранилища', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'home_continue_mark.ts'), 'utf8');
    expect(src).not.toMatch(/AsyncStorage\.multi(?:Get|Remove)\(\s*\[/);
    expect(src).not.toContain('__continue_');
    expect(src).toContain('homeContinueMarkKeys(');
  });
});
