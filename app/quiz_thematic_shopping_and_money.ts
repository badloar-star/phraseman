import type { SourceLocale } from './source_locales';
import type { SkylerThematicPack, SkylerThematicPackItem } from './quiz_thematic_packs';

type LocalizedClue = Record<SourceLocale, string>;

const sourceLocales: SourceLocale[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

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

const entries = [
  {
    answer: 'shop',
    clue: { ru: 'магазин', uk: 'магазин', es: 'tienda', 'pt-BR': 'loja', vi: 'cửa hàng', id: 'toko', tr: 'dükkan', pl: 'sklep' },
    choices: ['shop', 'wallet', 'receipt', 'price'],
  },
  {
    answer: 'price',
    clue: { ru: 'цена', uk: 'ціна', es: 'precio', 'pt-BR': 'preço', vi: 'giá', id: 'harga', tr: 'fiyat', pl: 'cena' },
    choices: ['cash', 'price', 'bag', 'card'],
  },
  {
    answer: 'receipt',
    clue: { ru: 'чек после покупки', uk: 'чек після покупки', es: 'recibo', 'pt-BR': 'recibo', vi: 'hóa đơn', id: 'struk', tr: 'fiş', pl: 'paragon' },
    choices: ['discount', 'wallet', 'receipt', 'shop'],
  },
  {
    answer: 'wallet',
    clue: { ru: 'кошелёк', uk: 'гаманець', es: 'cartera', 'pt-BR': 'carteira', vi: 'ví', id: 'dompet', tr: 'cüzdan', pl: 'portfel' },
    choices: ['wallet', 'receipt', 'buy', 'price'],
  },
  {
    answer: 'bag',
    clue: { ru: 'сумка для покупок', uk: 'сумка для покупок', es: 'bolsa', 'pt-BR': 'sacola', vi: 'túi', id: 'tas', tr: 'çanta', pl: 'torba' },
    choices: ['cash', 'bag', 'card', 'shop'],
  },
  {
    answer: 'pay',
    clue: { ru: 'платить', uk: 'платити', es: 'pagar', 'pt-BR': 'pagar', vi: 'trả tiền', id: 'membayar', tr: 'ödemek', pl: 'płacić' },
    choices: ['sell', 'buy', 'pay', 'open'],
  },
  {
    answer: 'buy',
    clue: { ru: 'покупать', uk: 'купувати', es: 'comprar', 'pt-BR': 'comprar', vi: 'mua', id: 'membeli', tr: 'satın almak', pl: 'kupować' },
    choices: ['buy', 'pay', 'cost', 'carry'],
  },
  {
    answer: 'cash',
    clue: { ru: 'наличные', uk: 'готівка', es: 'efectivo', 'pt-BR': 'dinheiro em espécie', vi: 'tiền mặt', id: 'uang tunai', tr: 'nakit', pl: 'gotówka' },
    choices: ['card', 'receipt', 'cash', 'discount'],
  },
  {
    answer: 'card',
    clue: { ru: 'банковская карта', uk: 'банківська картка', es: 'tarjeta', 'pt-BR': 'cartão', vi: 'thẻ', id: 'kartu', tr: 'kart', pl: 'karta' },
    choices: ['price', 'card', 'bag', 'receipt'],
  },
  {
    answer: 'discount',
    clue: { ru: 'скидка', uk: 'знижка', es: 'descuento', 'pt-BR': 'desconto', vi: 'giảm giá', id: 'diskon', tr: 'indirim', pl: 'zniżka' },
    choices: ['wallet', 'cash', 'shop', 'discount'],
  },
] as const satisfies readonly {
  answer: string;
  clue: LocalizedClue;
  choices: readonly [string, string, string, string];
}[];

function makeItem(entry: (typeof entries)[number], index: number): SkylerThematicPackItem {
  const id = `shopping-and-money-${String(index + 1).padStart(3, '0')}`;
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
    learningGoal: `Recognize the everyday English shopping word "${entry.answer}".`,
    skillTag: 'shopping-money-vocabulary',
    sourceIds: ['S1', 'S2'],
    claimIds: [`C${index + 1}`, `K${index + 1}`],
    choiceRationales: entry.choices.map(choice => choice === entry.answer ? 'Matches the clue.' : 'Related shopping vocabulary, but not this clue.'),
    qualityChecks: {
      singleCorrect: true,
      distractorsPlausible: true,
      noAmbiguity: true,
      sourceBacked: true,
    },
    explanations,
  };
}

export const SHOPPING_AND_MONEY_SKYLER_PACK: SkylerThematicPack = {
  schemaVersion: 'skyler-quiz-pack-v1',
  target: 'en',
  categoryId: 'shopping-and-money',
  categoryTitle: 'Shopping and money',
  releasePolicy: {
    environment: 'dev-only',
    productionActivation: 'blocked_until_explicit_user_approval',
    notes: 'Starter thematic quiz is visible only in dev until the creator approves production activation.',
  },
  researchPolicy: {
    directTranslationUsed: false,
    notes: 'Starter pack covers basic shopping and payment vocabulary for language practice.',
  },
  officialSources: [
    {
      id: 'S1',
      title: 'British Council LearnEnglish: Shopping vocabulary',
      url: 'https://learnenglish.britishcouncil.org/vocabulary/a1-a2-vocabulary/shopping',
      tier: 'B',
      publisherType: 'educational_publisher',
      usedFor: 'Beginner shopping vocabulary scope.',
      checkedAt: '2026-05-26',
    },
    {
      id: 'S2',
      title: 'Cambridge Dictionary shopping and money entries',
      url: 'https://dictionary.cambridge.org/dictionary/english/shop',
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
      text: `${entry.answer} is the target English word for the beginner shopping-and-money clue.`,
      sourceIds: ['S1', 'S2'],
      verificationStatus: 'verified',
    },
    {
      id: `K${index + 1}`,
      type: 'answer_key',
      text: `Choice ${[...entry.choices].indexOf(entry.answer)}, ${entry.answer}, is the only correct answer for shopping-and-money-${String(index + 1).padStart(3, '0')}.`,
      itemId: `shopping-and-money-${String(index + 1).padStart(3, '0')}`,
      answerIndex: [...entry.choices].indexOf(entry.answer),
      sourceIds: ['S1', 'S2'],
      verificationStatus: 'verified',
    },
  ]),
  items: entries.map(makeItem),
};
