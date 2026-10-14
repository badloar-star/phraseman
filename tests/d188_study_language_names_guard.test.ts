// Сторож D188-следствия (владелец 14.10: «У НАС ЖЕ НЕ ТОЛЬКО АНГЛИЙСКИЙ ЯЗЫК, ПРАВДА»): при любом из 5 изучаемых языков
// поверхности интерфейса не называют чужой язык. Проверяем (1) функции, собирающие подпись из studyTarget, на 9 × 5,
// (2) исправленные файлы со статичными строками — в строковых литералах нет названия языка (комментарии и журналы не в счёт).
import fs from 'node:fs';
import path from 'node:path';
import * as babel from '@babel/core';
import { STUDY_LANGUAGE_CODES, allStudyLanguageWords, studyLanguageAction, studyLanguageWord } from '../constants/study_language_words';
import { practiceCopyFor } from '../components/mistakes-panel/practiceCopy';
import { sayItInStudyLanguage } from '../app/flashcards_say_it_copy';

const UI = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const ROOT = path.join(__dirname, '..');

function foreignWords(ui: string, target: string): string[] {
  return STUDY_LANGUAGE_CODES.filter((c) => c !== target).flatMap((c) => allStudyLanguageWords(ui, c));
}

describe('D188: подписи из studyTarget — свой язык, ни одного чужого', () => {
  it('таблица слов: 9 интерфейсов × 5 языков, все формы непустые', () => {
    for (const ui of UI) {
      for (const target of STUDY_LANGUAGE_CODES) {
        for (const form of ['name', 'gen', 'adv'] as const) expect(studyLanguageWord(ui, target, form).length).toBeGreaterThan(0);
      }
    }
    expect(studyLanguageAction('ru', 'en', 'say')).toBe('Скажи по-английски');
    expect(studyLanguageAction('tr', 'it', 'write')).toBe('İtalyanca yaz');
  });

  it('Ошибки («Напиши / Скажи …») и Карточки («Скажи …») — по изучаемому языку', () => {
    for (const ui of UI) {
      for (const target of STUDY_LANGUAGE_CODES) {
        const own = studyLanguageWord(ui, target, 'adv');
        const copy = practiceCopyFor(ui, target);
        const sayIt = sayItInStudyLanguage(ui, target);
        for (const text of [copy.kindType, copy.kindSay, sayIt]) {
          expect(text).toContain(own);
          for (const foreign of foreignWords(ui, target)) expect(text).not.toContain(foreign);
        }
      }
    }
  });
});

describe('D188: статичные строки исправленных поверхностей не называют язык', () => {
  const PAT = /английск|англійськ|по-английск|\bEnglish\b|inglés|inglês|tiếng Anh|bahasa Inggris|İngilizce|angielsk/;
  const FILES = [
    'app/notifications.ts',
    'app/ai_dialog_scenarios.ts',
    'app/ai_dialog_briefing_copy.ts',
    'app/community_pack_create.tsx',
    'app/settings_edu.tsx',
    'app/home_feature_tips.ts',
    'app/mistake_practice_session.tsx',
    'components/onboarding_aha/aha_scenes.ts',
    'app/paywall_profile.ts',
    'app/(tabs)/home.tsx',
    'app/referral_invite_share.ts',
    'app/achievement_share.ts',
    'app/achievement_copy_ru_v2.ts',
    'components/friends_together/FriendStudyInviteModal.tsx',
  ];
  it.each(FILES)('%s', (rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const ast = babel.parseSync(src, { filename: rel, presets: ['babel-preset-expo'], sourceType: 'module' });
    const hits: string[] = [];
    babel.traverse(ast as babel.types.File, {
      StringLiteral(p) {
        if (PAT.test(p.node.value) && !(p.parent.type === 'ObjectProperty' && p.parent.key === p.node)) hits.push(p.node.value.slice(0, 80));
      },
      TemplateElement(p) {
        const text = p.node.value.cooked ?? '';
        if (PAT.test(text)) hits.push(text.slice(0, 80));
      },
    });
    // Журналы и технические строки с префиксом [TAG] — не интерфейс.
    expect(hits.filter((h) => !/^\[[A-Z0-9-]+\]/.test(h))).toEqual([]);
  });

  it('онбординг: экран знакомства до выбора языка — без названия языка', () => {
    const core = fs.readFileSync(path.join(ROOT, 'components/onboarding/clean_onboarding_copy_core.ts'), 'utf8');
    const line = core.split('\n').find((l) => l.includes('niceSubtitle: T(')) ?? '';
    expect(line).not.toMatch(PAT);
  });
});
