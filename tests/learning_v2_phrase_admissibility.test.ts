// зачем: сторож фильтра пригодности фраз. Владелец 2026-08-17: «есть некоторые
// фразы которые не подходят для приложения и их надо упускать — создай фильтры».
//
// Две обязанности:
//   1. проверить сам фильтр на образцах (иначе он может тихо ничего не ловить —
//      этот класс бага уже случался: \b не работает с кириллицей, и сторож
//      пропускал мутацию);
//   2. прогнать фильтр по ВСЕМУ авторскому содержанию — чтобы непригодная фраза
//      не доехала до ученика.
import {
  checkPhraseAdmissibility,
  isPhraseAdmissible,
} from '../modules/learning-v2/content/source/phrase_admissibility_filter_v1';
import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';

describe('фильтр пригодности фраз — сами правила', () => {
  test('краткие ответы отбраковываются', () => {
    for (const bad of [
      'Yes, I am',
      'No, I am not',
      'Yes, it is',
      "No, she isn't",
      'Yes, they are',
      "Yes, I'm",
    ]) {
      const found = checkPhraseAdmissibility({ english: bad });
      expect(
        found.some((r) => r.code === 'short_answer_untranslatable'),
      ).toBe(true);
    }
  });

  test('фразы без самостоятельного смысла отбраковываются', () => {
    for (const bad of ['And you?', 'Me too', 'It is', 'Same here']) {
      expect(
        checkPhraseAdmissibility({ english: bad }).some(
          (r) => r.code === 'no_standalone_meaning',
        ),
      ).toBe(true);
    }
  });

  test('мёртвый учебниковый язык отбраковывается', () => {
    for (const bad of [
      'How do you do',
      'My name is Anna',
      'I am from Russia',
      'I am fine, thank you, and you?',
    ]) {
      expect(
        checkPhraseAdmissibility({ english: bad }).some(
          (r) => r.code === 'textbook_dead_language',
        ),
      ).toBe(true);
    }
  });

  test('чужие имена отбраковываются, включая притяжательную форму', () => {
    for (const bad of [
      'I am Anna',
      'His name is Tom',
      "This is Anna's book",
      'Her name is Anna',
    ]) {
      expect(
        checkPhraseAdmissibility({ english: bad }).some(
          (r) => r.code === 'proper_name',
        ),
      ).toBe(true);
    }
  });

  test('годные фразы проходят — фильтр не глушит всё подряд', () => {
    for (const good of [
      'I am here',
      'I am not ready',
      'Are you tired?',
      'She is a teacher',
      'Where is the exit?',
      'It is cold',
      'We are not late',
      'This is my sister',
      'Whose bag is this?',
      'It is mine',
    ]) {
      const found = checkPhraseAdmissibility({ english: good });
      expect(found.map((r) => `${r.code}: ${r.why}`)).toEqual([]);
      expect(isPhraseAdmissible({ english: good })).toBe(true);
    }
  });

  test('география и дни недели именами НЕ считаются', () => {
    // Запрет владельца касался чужих ЛЮДЕЙ: «I am Anna» мешает присвоить фразу
    // себе. Город — не человек, фраза остаётся живой.
    for (const good of [
      'I live in Madrid',
      'She is in London',
      'I speak English',
      'It is Monday',
    ]) {
      expect(
        checkPhraseAdmissibility({ english: good }).map((r) => r.code),
      ).toEqual([]);
    }
  });

  test('заглавная в начале фразы не считается именем', () => {
    // Иначе фильтр забраковал бы каждую вторую фразу — начало предложения
    // всегда с заглавной.
    expect(isPhraseAdmissible({ english: 'Here it is cold' })).toBe(true);
    expect(isPhraseAdmissible({ english: 'Ready?' })).toBe(true);
  });

  test('пустая строка не роняет фильтр', () => {
    expect(checkPhraseAdmissibility({ english: '' })).toEqual([]);
    expect(checkPhraseAdmissibility({ english: '   ' })).toEqual([]);
  });
});

describe('всё авторское содержание проходит фильтр', () => {
  test('ни одна написанная фраза не является непригодной', () => {
    const problems: string[] = [];
    for (const session of AUTHORED_EPISODE_01_SESSIONS) {
      for (const phrase of session.phrases) {
        const found = checkPhraseAdmissibility({
          english: phrase.english,
          russian: phrase.russian,
        });
        for (const r of found) {
          problems.push(
            `сессия ${session.requiredSessionOrdinal} · ${phrase.id} · ${r.code}\n    ${r.why}`,
          );
        }
      }
    }
    expect(problems.join('\n')).toBe('');
  });
});
