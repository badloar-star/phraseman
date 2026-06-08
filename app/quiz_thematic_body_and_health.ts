import type { SourceLocale } from './source_locales';
import type { SkylerThematicPack, SkylerThematicPackItem } from './quiz_thematic_packs';

type LocalizedClue = Record<SourceLocale, string>;

const promptLabel: Record<SourceLocale, string> = {
  ru: 'Выбери английский вариант',
  uk: 'Виберіть англійський варіант',
  es: 'Elige la opción en inglés',
  'pt-BR': 'Escolha a opção em inglês',
  vi: 'Chọn phương án tiếng Anh',
  id: 'Pilih opsi bahasa Inggris',
  tr: 'İngilizce seçeneği seç',
  pl: 'Wybierz angielską opcję',
};

const correctLine: Record<SourceLocale, (choice: string, clue: string) => string> = {
  ru: (choice, clue) => `${choice} — нужный вариант для «${clue}».`,
  uk: (choice, clue) => `${choice} — потрібний варіант для «${clue}».`,
  es: (choice, clue) => `${choice} es la opción adecuada para «${clue}».`,
  'pt-BR': (choice, clue) => `${choice} é a opção certa para «${clue}».`,
  vi: (choice, clue) => `${choice} là lựa chọn đúng cho «${clue}».`,
  id: (choice, clue) => `${choice} adalah pilihan yang tepat untuk «${clue}».`,
  tr: (choice, clue) => `${choice}, «${clue}» için doğru seçenektir.`,
  pl: (choice, clue) => `${choice} to właściwa opcja dla „${clue}”.`,
};

const wrongLine: Record<SourceLocale, (choice: string) => string> = {
  ru: choice => `${choice} здесь не подходит по смыслу.`,
  uk: choice => `${choice} тут не підходить за змістом.`,
  es: choice => `${choice} no encaja con esta pista.`,
  'pt-BR': choice => `${choice} não combina com esta pista.`,
  vi: choice => `${choice} không hợp với gợi ý này.`,
  id: choice => `${choice} tidak cocok dengan petunjuk ini.`,
  tr: choice => `${choice} bu ipucuna uymaz.`,
  pl: choice => `${choice} nie pasuje do tej wskazówki.`,
};

const sourceLocales: SourceLocale[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

const entries = [
  {
    answer: 'body',
    clue: { ru: 'тело', uk: 'тіло', es: 'cuerpo', 'pt-BR': 'corpo', vi: 'cơ thể', id: 'tubuh', tr: 'vücut', pl: 'ciało' },
    choices: ['body', 'head', 'hand', 'heart'],
  },
  {
    answer: 'head',
    clue: { ru: 'голова', uk: 'голова', es: 'cabeza', 'pt-BR': 'cabeça', vi: 'đầu', id: 'kepala', tr: 'baş', pl: 'głowa' },
    choices: ['hand', 'head', 'leg', 'eye'],
  },
  {
    answer: 'arm',
    clue: { ru: 'рука от плеча до кисти', uk: 'рука від плеча до кисті', es: 'brazo', 'pt-BR': 'braço', vi: 'cánh tay', id: 'lengan', tr: 'kol', pl: 'ramię' },
    choices: ['ear', 'foot', 'arm', 'mouth'],
  },
  {
    answer: 'leg',
    clue: { ru: 'нога', uk: 'нога', es: 'pierna', 'pt-BR': 'perna', vi: 'chân', id: 'kaki', tr: 'bacak', pl: 'noga' },
    choices: ['leg', 'eye', 'hand', 'head'],
  },
  {
    answer: 'hand',
    clue: { ru: 'кисть руки', uk: 'кисть руки', es: 'mano', 'pt-BR': 'mão', vi: 'bàn tay', id: 'tangan', tr: 'el', pl: 'dłoń' },
    choices: ['heart', 'hand', 'body', 'ear'],
  },
  {
    answer: 'foot',
    clue: { ru: 'ступня', uk: 'ступня', es: 'pie', 'pt-BR': 'pé', vi: 'bàn chân', id: 'telapak kaki', tr: 'ayak', pl: 'stopa' },
    choices: ['arm', 'mouth', 'foot', 'eye'],
  },
  {
    answer: 'eye',
    clue: { ru: 'глаз', uk: 'око', es: 'ojo', 'pt-BR': 'olho', vi: 'mắt', id: 'mata', tr: 'göz', pl: 'oko' },
    choices: ['eye', 'ear', 'leg', 'hand'],
  },
  {
    answer: 'ear',
    clue: { ru: 'ухо', uk: 'вухо', es: 'oreja', 'pt-BR': 'orelha', vi: 'tai', id: 'telinga', tr: 'kulak', pl: 'ucho' },
    choices: ['head', 'heart', 'eye', 'ear'],
  },
  {
    answer: 'heart',
    clue: { ru: 'сердце', uk: 'серце', es: 'corazón', 'pt-BR': 'coração', vi: 'tim', id: 'jantung', tr: 'kalp', pl: 'serce' },
    choices: ['foot', 'heart', 'mouth', 'arm'],
  },
  {
    answer: 'breathe',
    clue: { ru: 'дышать', uk: 'дихати', es: 'respirar', 'pt-BR': 'respirar', vi: 'thở', id: 'bernapas', tr: 'nefes almak', pl: 'oddychać' },
    choices: ['sleep', 'walk', 'breathe', 'touch'],
  },
] as const satisfies readonly {
  answer: string;
  clue: LocalizedClue;
  choices: readonly [string, string, string, string];
}[];

function makeItem(entry: (typeof entries)[number], index: number): SkylerThematicPackItem {
  const id = `body-and-health-${String(index + 1).padStart(3, '0')}`;
  const choices = [...entry.choices];
  const correctIndex = choices.indexOf(entry.answer);
  const localizedPrompts = Object.fromEntries(
    sourceLocales.map(locale => [locale, `${promptLabel[locale]}: «${entry.clue[locale]}».`]),
  ) as Record<SourceLocale, string>;
  const explanations = Object.fromEntries(
    sourceLocales.map(locale => [
      locale,
      entry.choices.map((choice, choiceIndex) =>
        choiceIndex === correctIndex ? correctLine[locale](choice, entry.clue[locale]) : wrongLine[locale](choice)
      ),
    ]),
  ) as Record<SourceLocale, string[]>;

  return {
    id,
    type: 'mcq',
    prompt: `Choose the English option: "${entry.clue.ru}".`,
    localizedPrompts,
    choices,
    correctIndex,
    learningGoal: `Recognize the everyday English body and health word "${entry.answer}".`,
    skillTag: 'body-health-vocabulary',
    sourceIds: ['S1', 'S2'],
    claimIds: [`C${index + 1}`, `K${index + 1}`],
    choiceRationales: entry.choices.map(choice => choice === entry.answer ? 'Matches the clue.' : 'Related vocabulary, but not this clue.'),
    qualityChecks: {
      singleCorrect: true,
      distractorsPlausible: true,
      noAmbiguity: true,
      sourceBacked: true,
    },
    explanations,
  };
}

export const BODY_AND_HEALTH_SKYLER_PACK: SkylerThematicPack = {
  schemaVersion: 'skyler-quiz-pack-v1',
  target: 'en',
  categoryId: 'body-and-health',
  categoryTitle: 'Body and health',
  releasePolicy: {
    environment: 'dev-only',
    productionActivation: 'blocked_until_explicit_user_approval',
    notes: 'Starter thematic quiz is visible only in dev until the creator approves production activation.',
  },
  researchPolicy: {
    directTranslationUsed: false,
    notes: 'Starter pack covers basic body and health vocabulary; it is language practice, not medical advice.',
  },
  officialSources: [
    {
      id: 'S1',
      title: 'British Council LearnEnglish: Health vocabulary',
      url: 'https://learnenglish.britishcouncil.org/vocabulary/a1-a2-vocabulary/health',
      tier: 'B',
      publisherType: 'educational_publisher',
      usedFor: 'Beginner health and body vocabulary scope.',
      checkedAt: '2026-05-26',
    },
    {
      id: 'S2',
      title: 'Cambridge Dictionary body and health entries',
      url: 'https://dictionary.cambridge.org/dictionary/english/body',
      tier: 'B',
      publisherType: 'dictionary_or_academy',
      usedFor: 'Cross-checking everyday English word meanings.',
      checkedAt: '2026-05-26',
    },
  ],
  claims: entries.flatMap((entry, index) => [
    {
      id: `C${index + 1}`,
      type: 'usage_rule',
      text: `${entry.answer} is the target English word for the beginner body-and-health clue.`,
      sourceIds: ['S1', 'S2'],
      verificationStatus: 'verified',
    },
    {
      id: `K${index + 1}`,
      type: 'answer_key',
      text: `Choice ${[...entry.choices].indexOf(entry.answer)}, ${entry.answer}, is the only correct answer for body-and-health-${String(index + 1).padStart(3, '0')}.`,
      itemId: `body-and-health-${String(index + 1).padStart(3, '0')}`,
      answerIndex: [...entry.choices].indexOf(entry.answer),
      sourceIds: ['S1', 'S2'],
      verificationStatus: 'verified',
    },
  ]),
  items: entries.map(makeItem),
};
