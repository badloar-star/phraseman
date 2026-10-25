// placement_copy.ts — тексты экранов теста «Не хочу с начала» на 9 языках.
// зачем (владелец 21–22.10, макет chapter-exam-season.html, раздел 6): ru — дословно из макета; остальные языки — ЧЕРНОВИК на вычитку 10 · ПЕРЕВОДЧИКУ
// (docs/work/tasks/placement-test-ui-2026-10-24.md, вопрос 3), обращение на «ты», как во всём курсе. Числа и названия подставляются.

type Lang9 = 'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
type Row = Readonly<Record<Lang9, string>>;

const COPY = {
  introTitle: { ru: 'Проверим, что ты уже знаешь', uk: 'Перевіримо, що ти вже знаєш', en: "Let's check what you already know", es: 'Veamos qué sabes ya', 'pt-BR': 'Vamos ver o que você já sabe', vi: 'Cùng kiểm tra bạn đã biết gì', id: 'Mari cek apa yang sudah kamu tahu', tr: 'Şimdiye kadar neler bildiğine bakalım', pl: 'Sprawdźmy, co już wiesz' },
  introBody: { ru: 'Откроем все уроки до темы, которая пока даётся труднее, и начнёшь с неё.', uk: 'Відкриємо всі уроки до теми, яка поки що дається важче, і ти почнеш з неї.', en: "We'll open every lesson up to the topic that's still harder for you, and you'll start there.", es: 'Abriremos todas las lecciones hasta el tema que aún te cuesta más, y empezarás por ahí.', 'pt-BR': 'Vamos abrir todas as lições até o tema que ainda está mais difícil, e você começa por ele.', vi: 'Chúng tôi sẽ mở mọi bài học đến chủ đề bạn còn thấy khó, và bạn bắt đầu từ đó.', id: 'Kami buka semua pelajaran sampai topik yang masih sulit untukmu, lalu kamu mulai dari sana.', tr: 'Sana hâlâ zor gelen konuya kadar tüm dersleri açacağız, sen de oradan başlayacaksın.', pl: 'Otworzymy wszystkie lekcje aż do tematu, który jeszcze sprawia ci trudność, i zaczniesz od niego.' },
  start: { ru: 'Начать тест', uk: 'Почати тест', en: 'Start the test', es: 'Empezar el test', 'pt-BR': 'Começar o teste', vi: 'Bắt đầu kiểm tra', id: 'Mulai tes', tr: 'Teste başla', pl: 'Zacznij test' },
  startOver: { ru: 'Начну с начала', uk: 'Почну з початку', en: "I'll start from the beginning", es: 'Empezaré desde el principio', 'pt-BR': 'Vou começar do começo', vi: 'Tôi sẽ học từ đầu', id: 'Aku mulai dari awal', tr: 'Baştan başlayacağım', pl: 'Zacznę od początku' },
  progress: { ru: 'Тест · урок {n} из {of}', uk: 'Тест · урок {n} із {of}', en: 'Test · lesson {n} of {of}', es: 'Test · lección {n} de {of}', 'pt-BR': 'Teste · lição {n} de {of}', vi: 'Kiểm tra · bài {n}/{of}', id: 'Tes · pelajaran {n} dari {of}', tr: 'Test · ders {n} / {of}', pl: 'Test · lekcja {n} z {of}' },
  resultTitle: { ru: 'Начнём с урока {n}', uk: 'Почнемо з уроку {n}', en: "Let's start with lesson {n}", es: 'Empezamos por la lección {n}', 'pt-BR': 'Vamos começar pela lição {n}', vi: 'Bắt đầu từ bài {n}', id: 'Kita mulai dari pelajaran {n}', tr: '{n}. dersten başlıyoruz', pl: 'Zaczniemy od lekcji {n}' },
  resultBody: { ru: 'Темы уроков {range} ты уже знаешь.', uk: 'Теми уроків {range} ти вже знаєш.', en: 'You already know the topics of lessons {range}.', es: 'Ya conoces los temas de las lecciones {range}.', 'pt-BR': 'Você já conhece os temas das lições {range}.', vi: 'Bạn đã biết chủ đề các bài {range}.', id: 'Kamu sudah tahu topik pelajaran {range}.', tr: '{range}. derslerin konularını zaten biliyorsun.', pl: 'Tematy lekcji {range} już znasz.' },
  resultBodyOne: { ru: 'Тему урока {range} ты уже знаешь.', uk: 'Тему уроку {range} ти вже знаєш.', en: 'You already know the topic of lesson {range}.', es: 'Ya conoces el tema de la lección {range}.', 'pt-BR': 'Você já conhece o tema da lição {range}.', vi: 'Bạn đã biết chủ đề bài {range}.', id: 'Kamu sudah tahu topik pelajaran {range}.', tr: '{range}. dersin konusunu zaten biliyorsun.', pl: 'Temat lekcji {range} już znasz.' },
  opened: { ru: 'знаешь', uk: 'знаєш', en: 'known', es: 'la conoces', 'pt-BR': 'você já sabe', vi: 'đã biết', id: 'sudah tahu', tr: 'biliyorsun', pl: 'znasz' },
  here: { ru: 'начнём здесь', uk: 'почнемо тут', en: "let's start here", es: 'empezamos aquí', 'pt-BR': 'começamos aqui', vi: 'bắt đầu từ đây', id: 'mulai dari sini', tr: 'burdan başlıyoruz', pl: 'zaczynamy tutaj' },
  startLesson: { ru: 'Начать урок {n}', uk: 'Почати урок {n}', en: 'Start lesson {n}', es: 'Empezar la lección {n}', 'pt-BR': 'Começar a lição {n}', vi: 'Bắt đầu bài {n}', id: 'Mulai pelajaran {n}', tr: '{n}. derse başla', pl: 'Zacznij lekcję {n}' },
} as const satisfies Record<string, Row>;

export type PlacementCopyKey = keyof typeof COPY;

export function placementCopy(lang: string, key: PlacementCopyKey, vars: Readonly<Record<string, string | number>> = {}): string {
  const row: Row = COPY[key];
  const template = row[lang as Lang9] ?? row.en;
  return template.replace(/\{(\w+)\}/gu, (_, name: string) => String(vars[name] ?? ''));
}
