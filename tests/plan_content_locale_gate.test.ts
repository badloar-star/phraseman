import {
  auditPlanContentLocaleIsolation,
  planContentLocaleBlockers,
  planContentLocaleWarnings,
} from '../app/plan_content_locale_gate';
import type { LocalizedText, PlanContentDay } from '../app/plan_content_schema';

function localized(label: string): LocalizedText {
  return {
    ru: `ru ${label}`,
    uk: `uk ${label}`,
    es: `es ${label}`,
    'pt-BR': `pt ${label}`,
    vi: `vi ${label}`,
    id: `id ${label}`,
    tr: `tr ${label}`,
    pl: `pl ${label}`,
  };
}

function day(overrides: Partial<PlanContentDay> = {}): PlanContentDay {
  return {
    planId: 'voyazh',
    dayIndex: 1,
    topic: localized('topic'),
    outcome: localized('outcome'),
    level: 'A1',
    prerequisiteLessons: [1],
    intro: [{
      kind: 'why',
      title: localized('intro title'),
      body: localized('intro body'),
      examples: [{ en: "I'm here.", gloss: localized('intro example') }],
    }],
    phrases: [{
      id: 'p1',
      english: "I'm here.",
      meaning: localized('meaning'),
      constructions: ['to-be'],
      explanation: {
        title: localized('explanation title'),
        rule: localized('explanation rule'),
        why: localized('explanation why'),
        commonMistake: localized('explanation mistake'),
      },
      words: [
        { text: "I'm", partOfSpeech: 'to-be', distractors: ["You're", "He's", "We're", 'It is', 'They are'] },
        { text: 'here', partOfSpeech: 'adverb', distractors: ['there', 'near', 'home', 'inside', 'outside'] },
      ],
    }],
    vocabulary: [
      { word: 'here', partOfSpeech: 'adverb', translation: localized('here'), example: "I'm here." },
      { word: "i'm", partOfSpeech: 'to-be', translation: localized('i am'), example: "I'm here." },
      { word: 'i', partOfSpeech: 'pronoun', translation: localized('i'), example: "I'm here." },
      { word: 'need', partOfSpeech: 'verb', translation: localized('need'), example: 'I need help.' },
      { word: 'help', partOfSpeech: 'noun', translation: localized('help'), example: 'I need help.' },
    ],
    ...overrides,
  };
}

describe('plan content locale gate', () => {
  it('accepts a day with isolated text for every source locale', () => {
    expect(auditPlanContentLocaleIsolation(day())).toEqual([]);
  });

  it('blocks a missing planned source-locale value', () => {
    const input = day();
    delete input.phrases[0].meaning.vi;
    expect(planContentLocaleBlockers(input)).toEqual([
      expect.objectContaining({
        code: 'missing_locale',
        path: 'phrases[0].meaning',
        locale: 'vi',
      }),
    ]);
  });

  it('blocks non-canonical locale aliases', () => {
    const input = day();
    (input.topic as LocalizedText & { ptBr?: string }).ptBr = 'pt alias';
    expect(planContentLocaleBlockers(input)).toEqual([
      expect.objectContaining({
        code: 'non_canonical_locale_key',
        path: 'topic',
      }),
    ]);
  });

  it('blocks Cyrillic leaking into planned source locales', () => {
    const input = day();
    input.outcome.pl = 'это русский текст';
    expect(planContentLocaleBlockers(input)).toEqual([
      expect.objectContaining({
        code: 'planned_cyrillic_leak',
        path: 'outcome',
        locale: 'pl',
      }),
    ]);
  });

  it('blocks localized explanations that translate protected English teaching terms', () => {
    const input = day();
    input.phrases[0].explanation.title = {
      ru: '«am» — маленькое слово для I',
      uk: '«am» — маленьке слово для I',
      es: '«am» es la palabra pequeña para I',
      'pt-BR': '“sou” é a palavra pequena para eu',
      vi: '“am” là từ nhỏ cho I',
      id: '"am" adalah kata kecil untuk I',
      tr: '"am" I için küçük kelime',
      pl: '„am” to małe słowo dla I',
    };

    expect(planContentLocaleBlockers(input)).toEqual([
      expect.objectContaining({
        code: 'protected_english_term_missing',
        path: 'phrases[0].explanation.title',
        locale: 'pt-BR',
      }),
    ]);
  });

  it('treats spaced and compact ellipses as the same protected term', () => {
    const input = day();
    input.intro[0].body = {
      ru: 'Say "My name is ..." before your name.',
      uk: 'Use "My name is ..." before your name.',
      es: 'Di "My name is..." antes de tu nombre.',
      'pt-BR': 'Diga "My name is..." antes do seu nome.',
      vi: 'Hay noi "My name is..." truoc ten cua ban.',
      id: 'Ucapkan "My name is..." sebelum nama kamu.',
      tr: 'Adindan once "My name is..." de.',
      pl: 'Powiedz "My name is..." przed swoim imieniem.',
    };

    expect(planContentLocaleBlockers(input)).toEqual([]);
  });

  it('accepts split explanations when every protected English token remains present', () => {
    const input = day();
    input.phrases[0].explanation.rule = {
      ru: 'Use "I\'m good, you?" as a short polite reply.',
      uk: 'Use "I\'m good, you?" as a short polite reply.',
      es: 'I\'m = estoy. Good = bien. You? devuelve la pregunta.',
      'pt-BR': 'I\'m = estou. Good = bem. You? devolve a pergunta.',
      vi: 'I\'m = toi on. Good = tot. You? hoi nguoc lai.',
      id: 'I\'m = saya baik. Good = baik. You? tanya balik.',
      tr: 'I\'m = iyiyim. Good = iyi. You? soruyu geri verir.',
      pl: 'I\'m = mam sie dobrze. Good = dobrze. You? oddaje pytanie.',
    };

    expect(planContentLocaleBlockers(input)).toEqual([]);
  });

  it('protects English chunks from mixed quoted grammar labels', () => {
    const input = day();
    input.phrases[0].explanation.rule = {
      ru: 'Use "have + \u0433\u043b\u0430\u0433\u043e\u043b" for a result.',
      uk: 'Use "have + \u0434\u0456\u0454\u0441\u043b\u043e\u0432\u043e" for a result.',
      es: 'have + verbo marca el resultado.',
      'pt-BR': 'have + verbo marca o resultado.',
      vi: 'have + dong tu danh dau ket qua.',
      id: 'have + kata kerja menandai hasil.',
      tr: 'have + fiil sonucu gosterir.',
      pl: 'have + czasownik pokazuje wynik.',
    };

    expect(planContentLocaleBlockers(input)).toEqual([]);

    input.phrases[0].explanation.rule['pt-BR'] = 'ter + verbo marca o resultado.';
    expect(planContentLocaleBlockers(input)).toEqual([
      expect.objectContaining({
        code: 'protected_english_term_missing',
        path: 'phrases[0].explanation.rule',
        locale: 'pt-BR',
      }),
    ]);
  });

  it('does not require protected English terms inside plain native glosses', () => {
    const input = day();
    input.intro[0].examples = [{
      en: 'I am here.',
      gloss: {
        ru: 'Я здесь.',
        uk: 'Я тут.',
        es: 'Estoy aquí.',
        'pt-BR': 'Estou aqui.',
        vi: 'Tôi ở đây.',
        id: 'Saya di sini.',
        tr: 'Buradayım.',
        pl: 'Jestem tutaj.',
      },
    }];

    expect(planContentLocaleBlockers(input)).toEqual([]);
  });

  it('warns about copied base-locale text in planned source locales', () => {
    const input = day();
    input.intro[0].body.es = 'spanish body copied into portuguese locale';
    input.intro[0].body['pt-BR'] = input.intro[0].body.es;
    expect(planContentLocaleBlockers(input)).toEqual([]);
    expect(planContentLocaleWarnings(input)).toEqual([
      expect.objectContaining({
        code: 'planned_duplicates_base_locale',
        path: 'intro[0].body',
        locale: 'pt-BR',
        otherLocale: 'es',
      }),
    ]);
  });

  it('keeps English grammar scaffolds as warnings, not blockers', () => {
    const input = day();
    const scaffold = 'What time + does + it + verb + today.';
    input.intro[0].body.es = scaffold;
    input.intro[0].body['pt-BR'] = scaffold;
    expect(planContentLocaleBlockers(input)).toEqual([]);
    expect(planContentLocaleWarnings(input)).toEqual([
      expect.objectContaining({
        code: 'planned_duplicates_base_locale',
        path: 'intro[0].body',
        locale: 'pt-BR',
        otherLocale: 'es',
      }),
    ]);
  });
});
