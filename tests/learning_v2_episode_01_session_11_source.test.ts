import { EPISODE_01_SESSION_11_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_11_v1';
import { EPISODE_01_SESSION_12_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_12_v1';
import { EPISODE_01_SESSION_13_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_13_v1';
import { EPISODE_01_SESSION_14_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_14_v1';
import { EPISODE_01_SESSION_15_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_15_v1';
import { EPISODE_01_SESSION_16_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_16_v1';
import { assertAuthoredSessionContract } from '../modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1';

test('session 11 keeps the I/you inversion contract', () => assertAuthoredSessionContract(EPISODE_01_SESSION_11_SOURCE, 11, 'phrases', 'question_inversion'));

test('sessions 11 to 16 keep locale meanings, word alternatives, and intros authored rather than templated', () => {
  const sources = [EPISODE_01_SESSION_11_SOURCE, EPISODE_01_SESSION_12_SOURCE, EPISODE_01_SESSION_13_SOURCE, EPISODE_01_SESSION_14_SOURCE, EPISODE_01_SESSION_15_SOURCE, EPISODE_01_SESSION_16_SOURCE];
  const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
  locales.forEach((locale) => {
    expect(new Set(sources.map((source) => source.introPages.map((page) => page.body[locale]).join('|'))).size).toBe(6);
    sources.forEach((source) => source.phrases.forEach((phrase) => {
      const details = phrase.localizedDetails?.[locale];
      expect(details?.meaning).not.toBe(phrase.english);
      expect(details?.meaning).not.toMatch(/^(Meaning|Significado|Значение|Nghĩa|Arti|Anlam|Znaczenie):/);
      expect(details?.explanation).toContain(phrase.english);
      details?.words.forEach((word) => word.distractors.forEach((distractor) => {
        expect(distractor.value).not.toMatch(/[0-9]$|[?!]$/);
        expect(distractor.reason.length).toBeGreaterThanOrEqual(40);
      }));
    }));
  });
});

test('representative meanings preserve person, question, negation, and a location in every locale', () => {
  const expected = {
    ru: ['Я готов.', 'Ты готов?', 'Ты не готов.', 'Я дома.'], uk: ['Я готовий.', 'Ти готовий?', 'Ти не готовий.', 'Я вдома.'], es: ['Estoy listo.', '¿estás listo?', 'No estás listo.', 'Estoy en casa.'], 'pt-BR': ['Estou pronto.', 'Você está pronto?', 'Você não está pronto.', 'Estou em casa.'], vi: ['Tôi sẵn sàng.', 'Bạn sẵn sàng phải không?', 'Bạn không sẵn sàng.', 'Tôi ở nhà.'], id: ['Saya siap.', 'Apakah kamu siap?', 'Kamu tidak siap.', 'Saya di rumah.'], tr: ['Ben hazır.', 'Sen hazır mısın?', 'Sen hazır değil.', 'Ben evde.'], pl: ['Jestem gotowy.', 'Czy jesteś gotowy?', 'Nie jesteś gotowy.', 'Jestem w domu.'],
  } as const;
  const samples = [EPISODE_01_SESSION_15_SOURCE.phrases[3], EPISODE_01_SESSION_11_SOURCE.phrases[0], EPISODE_01_SESSION_13_SOURCE.phrases[12], EPISODE_01_SESSION_14_SOURCE.phrases[0]];
  Object.entries(expected).forEach(([locale, meanings]) => samples.forEach((phrase, index) => expect(phrase.localizedDetails?.[locale as keyof typeof expected].meaning).toBe(meanings[index])));
});

test('location phrases retain ordinary English word drills', () => {
  const phrase = EPISODE_01_SESSION_14_SOURCE.phrases[0];
  expect(phrase.words.map((word) => word.correct)).toEqual(['I', 'am', 'at', 'home']);
  expect(phrase.words.map((word) => word.correct).join(' ')).toBe(phrase.english.replace('.', ''));
});

test('all ninety phrases have localized meanings without boolean or leaked English grammar residue', () => {
  const sources = [EPISODE_01_SESSION_11_SOURCE, EPISODE_01_SESSION_12_SOURCE, EPISODE_01_SESSION_13_SOURCE, EPISODE_01_SESSION_14_SOURCE, EPISODE_01_SESSION_15_SOURCE, EPISODE_01_SESSION_16_SOURCE];
  const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
  expect(sources.flatMap((source) => source.phrases)).toHaveLength(90);
  sources.flatMap((source) => source.phrases).forEach((phrase) => locales.forEach((locale) => {
    const meaning = phrase.localizedDetails?.[locale].meaning ?? '';
    expect(meaning).not.toMatch(/\b(?:true|false|undefined|null|not)\b/i);
    expect(meaning).not.toContain('${');
    expect(meaning).not.toBe(phrase.english);
  }));
});

test('temperature meanings stay impersonal in Russian and Ukrainian', () => {
  const cold = EPISODE_01_SESSION_16_SOURCE.phrases.find((phrase) => phrase.english === 'I am cold.');
  const warm = EPISODE_01_SESSION_16_SOURCE.phrases.find((phrase) => phrase.english === 'I am warm.');
  expect(cold?.localizedDetails?.ru.meaning).toBe('Мне холодно.');
  expect(cold?.localizedDetails?.uk.meaning).toBe('Мені холодно.');
  expect(warm?.localizedDetails?.ru.meaning).toBe('Мне тепло.');
  expect(warm?.localizedDetails?.uk.meaning).toBe('Мені тепло.');
});

test('temperature meanings use the experiencer for I and you in statements and questions', () => {
  const samples = [
    EPISODE_01_SESSION_11_SOURCE.phrases.find((phrase) => phrase.english === 'Are you cold?'),
    EPISODE_01_SESSION_11_SOURCE.phrases.find((phrase) => phrase.english === 'Are you warm?'),
    EPISODE_01_SESSION_12_SOURCE.phrases.find((phrase) => phrase.english === 'Am I cold?'),
    EPISODE_01_SESSION_12_SOURCE.phrases.find((phrase) => phrase.english === 'Am I warm?'),
    EPISODE_01_SESSION_13_SOURCE.phrases.find((phrase) => phrase.english === 'You’re cold.'),
    EPISODE_01_SESSION_13_SOURCE.phrases.find((phrase) => phrase.english === 'You’re warm.'),
  ];
  const expected = {
    ru: ['Тебе холодно?', 'Тебе тепло?', 'Мне холодно?', 'Мне тепло?', 'Тебе холодно.', 'Тебе тепло.'],
    uk: ['Тобі холодно?', 'Тобі тепло?', 'Мені холодно?', 'Мені тепло?', 'Тобі холодно.', 'Тобі тепло.'],
  } as const;

  Object.entries(expected).forEach(([locale, meanings]) => {
    samples.forEach((phrase, index) => {
      expect(phrase?.localizedDetails?.[locale as 'ru' | 'uk'].meaning).toBe(meanings[index]);
    });
  });
});

test('intro questions have one grounded English answer and typed word reasons', () => {
  const source = EPISODE_01_SESSION_14_SOURCE;
  source.introPages.forEach((page) => {
    const choices = page.question.choices.map((choice) => choice.ru);
    expect(choices).toHaveLength(3);
    expect(choices.every((choice) => /^[A-Z]/.test(choice))).toBe(true);
    expect(choices[page.question.correctChoiceIndex]).toBe(source.phrases[0].english);
  });
  const words = source.phrases[0].words;
  expect(words.find((word) => word.correct === 'I')?.distractors[0].why).toContain('человека');
  expect(words.find((word) => word.correct === 'am')?.distractors[0].why).toContain('форму связки');
  expect(words.find((word) => word.correct === 'at')?.distractors[0].why).toContain('сочетание места');
});
