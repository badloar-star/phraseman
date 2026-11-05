/**
 * Тексты пейвола «ещё один язык» (контекст language_add) по макету Codex variant-3
 * (docs/work/golden/refs/paywall-c/variant-3-language-{light,dark}.png; слово владельца через координатора 05.11: «КАК СЛЕВА» = по макету).
 *
 * зачем: заголовок «Ещё один язык. Больше тебя.», подзаголовок с названием языка, три пункта с короткими строками и абзац про бесплатные уроки — вместо общих выгод Plus.
 * Строки на 9 языков — ЧЕРНОВИК для вычитки носителем (передать 10 · ПЕРЕВОДЧИК). Название языка — на языке интерфейса, в нужном падеже (uk — винительный).
 * Данные чистые: без React и без сети, экран только берёт готовые строки.
 */
import type { Lang } from '../constants/i18n';

/** Языки изучения, для которых подставляется название. */
export type PaywallLanguageTarget = 'en' | 'es' | 'fr' | 'de' | 'it';

type Nine = Readonly<Record<Lang, string>>;

const TITLE: Nine = {
  ru: 'Ещё один язык. Больше тебя.',
  uk: 'Ще одна мова. Більше тебе.',
  en: 'One more language. More of you.',
  es: 'Un idioma más. Más de ti.',
  'pt-BR': 'Mais um idioma. Mais de você.',
  vi: 'Thêm một ngôn ngữ. Thêm nhiều bạn hơn.',
  id: 'Satu bahasa lagi. Lebih banyak dirimu.',
  tr: 'Bir dil daha. Daha çok sen.',
  pl: 'Jeszcze jeden język. Więcej ciebie.',
};

/** Шаблон подзаголовка; {x} — название языка. */
const SUBTITLE: Nine = {
  ru: 'Добавь {x} с PhraseMan Plus.',
  uk: 'Додай {x} з PhraseMan Plus.',
  en: 'Add {x} with PhraseMan Plus.',
  es: 'Añade {x} con PhraseMan Plus.',
  'pt-BR': 'Adicione {x} com o PhraseMan Plus.',
  vi: 'Thêm {x} với PhraseMan Plus.',
  id: 'Tambahkan {x} dengan PhraseMan Plus.',
  tr: 'PhraseMan Plus ile {x} ekle.',
  pl: 'Dodaj {x} z PhraseMan Plus.',
};

/** Подзаголовок без названия языка (язык цели неизвестен). */
const SUBTITLE_NO_NAME: Nine = {
  ru: 'Добавь ещё один язык с PhraseMan Plus.',
  uk: 'Додай ще одну мову з PhraseMan Plus.',
  en: 'Add another language with PhraseMan Plus.',
  es: 'Añade otro idioma con PhraseMan Plus.',
  'pt-BR': 'Adicione outro idioma com o PhraseMan Plus.',
  vi: 'Thêm một ngôn ngữ khác với PhraseMan Plus.',
  id: 'Tambahkan bahasa lain dengan PhraseMan Plus.',
  tr: 'PhraseMan Plus ile bir dil daha ekle.',
  pl: 'Dodaj kolejny język z PhraseMan Plus.',
};

/** Название языка изучения в форме подзаголовка: «Добавь немецкий» (ru/pl — именительный = винительный; uk — винительный). */
const LANGUAGE_NAME: Readonly<Record<Lang, Readonly<Record<PaywallLanguageTarget, string>>>> = {
  ru: { en: 'английский', es: 'испанский', fr: 'французский', de: 'немецкий', it: 'итальянский' },
  uk: { en: 'англійську', es: 'іспанську', fr: 'французьку', de: 'німецьку', it: 'італійську' },
  en: { en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian' },
  es: { en: 'inglés', es: 'español', fr: 'francés', de: 'alemán', it: 'italiano' },
  'pt-BR': { en: 'inglês', es: 'espanhol', fr: 'francês', de: 'alemão', it: 'italiano' },
  vi: { en: 'tiếng Anh', es: 'tiếng Tây Ban Nha', fr: 'tiếng Pháp', de: 'tiếng Đức', it: 'tiếng Ý' },
  id: { en: 'bahasa Inggris', es: 'bahasa Spanyol', fr: 'bahasa Prancis', de: 'bahasa Jerman', it: 'bahasa Italia' },
  tr: { en: 'İngilizce', es: 'İspanyolca', fr: 'Fransızca', de: 'Almanca', it: 'İtalyanca' },
  pl: { en: 'angielski', es: 'hiszpański', fr: 'francuski', de: 'niemiecki', it: 'włoski' },
};

type Benefit = Readonly<{ title: Nine; detail: (n: number) => Nine }>;

const BENEFITS: readonly [Benefit, Benefit, Benefit] = [
  {
    title: { ru: 'Языки на выбор', uk: 'Мови на вибір', en: 'Languages of your choice', es: 'Idiomas a tu elección', 'pt-BR': 'Idiomas à sua escolha', vi: 'Tùy chọn ngôn ngữ', id: 'Bahasa pilihanmu', tr: 'Dilediğin dil', pl: 'Języki do wyboru' },
    detail: () => ({ ru: 'Дополнительные языки с Plus', uk: 'Додаткові мови з Plus', en: 'Extra languages with Plus', es: 'Idiomas adicionales con Plus', 'pt-BR': 'Idiomas extras com o Plus', vi: 'Thêm ngôn ngữ với Plus', id: 'Bahasa tambahan dengan Plus', tr: "Plus ile ek diller", pl: 'Dodatkowe języki z Plus' }),
  },
  {
    title: { ru: 'Курс дальше', uk: 'Курс далі', en: 'The course goes on', es: 'El curso continúa', 'pt-BR': 'O curso continua', vi: 'Khóa học tiếp tục', id: 'Kursus berlanjut', tr: 'Kurs devam eder', pl: 'Kurs dalej' },
    detail: (n) => ({
      ru: `Продолжение после урока ${n}`, uk: `Продовження після уроку ${n}`, en: `Continues after lesson ${n}`, es: `Continúa después de la lección ${n}`,
      'pt-BR': `Continua depois da lição ${n}`, vi: `Tiếp tục sau bài ${n}`, id: `Lanjut setelah pelajaran ${n}`, tr: `${n}. dersten sonra devam`, pl: `Ciąg dalszy po lekcji ${n}`,
    }),
  },
  {
    title: { ru: 'Больше практики', uk: 'Більше практики', en: 'More practice', es: 'Más práctica', 'pt-BR': 'Mais prática', vi: 'Luyện tập nhiều hơn', id: 'Lebih banyak latihan', tr: 'Daha çok pratik', pl: 'Więcej praktyki' },
    detail: () => ({ ru: 'Видео, диалоги и карточки', uk: 'Відео, діалоги та картки', en: 'Videos, dialogues and cards', es: 'Vídeos, diálogos y tarjetas', 'pt-BR': 'Vídeos, diálogos e cartões', vi: 'Video, hội thoại và thẻ', id: 'Video, dialog, dan kartu', tr: 'Videolar, diyaloglar ve kartlar', pl: 'Wideo, dialogi i karty' }),
  },
];

/** Абзац над плитками: сколько уроков бесплатно и что нужно для продолжения. */
const PARAGRAPH = (n: number): Nine => ({
  ru: `В первом выбранном языке уроки 1–${n} бесплатны. Для продолжения и дополнительных языков нужен Plus.`,
  uk: `У першій обраній мові уроки 1–${n} безкоштовні. Для продовження та додаткових мов потрібен Plus.`,
  en: `In your first language, lessons 1–${n} are free. Plus is needed to continue and to add more languages.`,
  es: `En el primer idioma elegido, las lecciones 1–${n} son gratis. Para continuar y añadir más idiomas hace falta Plus.`,
  'pt-BR': `No primeiro idioma escolhido, as lições 1–${n} são gratuitas. Para continuar e adicionar mais idiomas, é preciso o Plus.`,
  vi: `Ở ngôn ngữ đầu tiên bạn chọn, các bài 1–${n} miễn phí. Cần Plus để học tiếp và thêm ngôn ngữ.`,
  id: `Di bahasa pertama yang kamu pilih, pelajaran 1–${n} gratis. Untuk melanjutkan dan menambah bahasa diperlukan Plus.`,
  tr: `İlk seçtiğin dilde 1–${n}. dersler ücretsiz. Devam etmek ve ek diller için Plus gerekir.`,
  pl: `W pierwszym wybranym języku lekcje 1–${n} są bezpłatne. Aby kontynuować i dodać kolejne języki, potrzebny jest Plus.`,
});

/** Заголовок и подзаголовок «Plus» без своего контекста входа (макет variant-3-plus: «Больше способов учиться»). */
const PLUS_TITLE: Nine = {
  ru: 'Больше способов учиться', uk: 'Більше способів вчитися', en: 'More ways to learn', es: 'Más formas de aprender', 'pt-BR': 'Mais maneiras de aprender',
  vi: 'Nhiều cách học hơn', id: 'Lebih banyak cara belajar', tr: 'Öğrenmenin daha çok yolu', pl: 'Więcej sposobów nauki',
};
const PLUS_SUBTITLE: Nine = {
  ru: 'Открой продолжение курса и больше практики с PhraseMan Plus.',
  uk: 'Відкрий продовження курсу та більше практики з PhraseMan Plus.',
  en: 'Unlock the rest of the course and more practice with PhraseMan Plus.',
  es: 'Desbloquea la continuación del curso y más práctica con PhraseMan Plus.',
  'pt-BR': 'Libere a continuação do curso e mais prática com o PhraseMan Plus.',
  vi: 'Mở khóa phần tiếp theo của khóa học và luyện tập nhiều hơn với PhraseMan Plus.',
  id: 'Buka kelanjutan kursus dan lebih banyak latihan dengan PhraseMan Plus.',
  tr: 'PhraseMan Plus ile kursun devamını ve daha çok pratiği aç.',
  pl: 'Odblokuj dalszą część kursu i więcej praktyki z PhraseMan Plus.',
};
/** Кнопка покупки без пробного периода (макет variant-3: «Подключить Plus»); цена — на плитках и в строке под кнопкой. */
export const PAYWALL_V3_CTA: Nine = {
  ru: 'Подключить Plus', uk: 'Підключити Plus', en: 'Get Plus', es: 'Activar Plus', 'pt-BR': 'Ativar o Plus', vi: 'Kích hoạt Plus', id: 'Aktifkan Plus', tr: "Plus'ı aç", pl: 'Włącz Plus',
};

export function paywallPlusV3Copy(lang: Lang): Readonly<{ title: string; subtitle: string }> {
  return { title: PLUS_TITLE[lang] ?? PLUS_TITLE.en, subtitle: PLUS_SUBTITLE[lang] ?? PLUS_SUBTITLE.en };
}

/** Тело variant-3 для ОБОИХ пейволов: три пункта и абзац над плитками (без подмены первой строки текстом входа). */
export function paywallV3Body(lang: Lang, freeLessons: number = PAYWALL_LANGUAGE_FREE_LESSONS): Readonly<{ benefits: ReadonlyArray<Readonly<{ title: string; detail: string }>>; paragraph: string }> {
  const c = paywallLanguageAddCopy(lang, null, freeLessons);
  return { benefits: c.benefits, paragraph: c.paragraph };
}

export type PaywallLanguageAddCopy = Readonly<{
  title: string;
  subtitle: string;
  benefits: ReadonlyArray<Readonly<{ title: string; detail: string }>>;
  paragraph: string;
}>;

/** Сколько уроков первого языка бесплатно (число в абзаце и во втором пункте). */
export const PAYWALL_LANGUAGE_FREE_LESSONS = 3;

export function paywallLanguageAddCopy(lang: Lang, target: PaywallLanguageTarget | null, freeLessons: number = PAYWALL_LANGUAGE_FREE_LESSONS): PaywallLanguageAddCopy {
  const name = target ? LANGUAGE_NAME[lang]?.[target] : undefined;
  return {
    title: TITLE[lang] ?? TITLE.en,
    subtitle: name ? (SUBTITLE[lang] ?? SUBTITLE.en).replace('{x}', name) : (SUBTITLE_NO_NAME[lang] ?? SUBTITLE_NO_NAME.en),
    benefits: BENEFITS.map((b) => ({ title: b.title[lang] ?? b.title.en, detail: b.detail(freeLessons)[lang] ?? b.detail(freeLessons).en })),
    paragraph: PARAGRAPH(freeLessons)[lang] ?? PARAGRAPH(freeLessons).en,
  };
}

/* expo-router: служебный модуль в app/ не должен становиться экраном */
export default function __PaywallLanguageAddCopyRouteShim() { return null; }
