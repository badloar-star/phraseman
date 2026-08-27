import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл переписан (владелец, 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// §7 + LEARNING_CONTENT_STYLE_BIBLE.ru.md правило 2): исходный черновик от
// 2026-08-25 держал тела intro на ~460-540 знаков на локаль — за потолком
// intro_body_overloaded (320 знаков / 2-4 предложения,
// learning_content_quality_gate_v1.ts). Смысл сохранён (concept/formula/trap
// про то, что no встаёт перед ЛЮБОЙ связкой ser — soy/eres/es, — а признак
// согласуется по роду как обычно), текст сжат. Карта сессии:
// es_episode_01_session_map_v1.ts, sessionOrdinal 11, "Ты не", builtOn:
// [2, 9], recalls: [2, 9]. Новых слов нет.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_11_TITLE = L({
  ru: 'Ты не',
  uk: 'Ти не',
  es: 'You are not',
  'pt-BR': 'Você não é',
  vi: 'Bạn không',
  id: 'Kamu bukan',
  tr: 'Sen değilsin',
  pl: 'Nie jesteś',
});

export const ES_EPISODE_01_SESSION_11_SUMMARY = L({
  ru: 'Одна и та же формула отрицания из второй сессии работает с любой связкой ser — soy, eres или es.',
  uk: 'Та сама формула заперечення з другої сесії працює з будь-якою зв’язкою ser — soy, eres чи es.',
  es: 'The same negation formula from the second session works with any linking word of ser — soy, eres, or es.',
  'pt-BR': 'A mesma fórmula de negação da segunda sessão funciona com qualquer ligação de ser — soy, eres ou es.',
  vi: 'Cùng công thức phủ định từ buổi thứ hai hoạt động với bất kỳ từ nối nào của ser — soy, eres hay es.',
  id: 'Rumus negasi yang sama dari sesi kedua bekerja dengan kata penghubung ser mana pun — soy, eres, atau es.',
  tr: 'İkinci oturumdaki aynı olumsuzlama formülü, ser’in herhangi bir bağlacıyla çalışır — soy, eres ya da es.',
  pl: 'Ta sama formuła przeczenia z drugiej sesji działa z każdym łącznikiem ser — soy, eres lub es.',
});

export const ES_EPISODE_01_SESSION_11_GOAL = L({
  ru: 'Узнать на слух и точно построить отрицание с soy, eres или es, ставя no перед связкой без изменения признака.',
  uk: 'Упізнати на слух і точно побудувати заперечення з soy, eres чи es, ставлячи no перед зв’язкою без зміни ознаки.',
  es: 'Recognize by ear and correctly build a negation with soy, eres, or es, placing no before the linking word without changing the quality.',
  'pt-BR': 'Reconhecer de ouvido e construir corretamente uma negação com soy, eres ou es, colocando no antes da ligação sem mudar a qualidade.',
  vi: 'Nghe ra và xây dựng đúng câu phủ định với soy, eres hay es, đặt no trước từ nối mà không đổi đặc điểm.',
  id: 'Mengenali dari suara dan membangun negasi dengan tepat menggunakan soy, eres, atau es, meletakkan no sebelum kata penghubung tanpa mengubah sifat.',
  tr: 'Soy, eres ya da es ile bir olumsuzlamayı duyup tanımak ve doğru kurmak, no’yu bağlacın önüne koyarak niteliği değiştirmeden.',
  pl: 'Rozpoznać ze słuchu i poprawnie zbudować przeczenie z soy, eres lub es, stawiając no przed łącznikiem bez zmiany cechy.',
});

const CONCEPT_BODY = L({
  ru: 'No + связка уже встречалось как формула: No es fácil. Та же формула работает и с eres, и с soy — no встаёт прямо перед связкой, какая бы она ни была. No eres bonito отрицает признак собеседника, No soy rápido — признак самого говорящего.',
  uk: 'No + зв’язка вже траплялося як формула: No es fácil. Та сама формула працює і з eres, і з soy — no стоїть прямо перед зв’язкою, якою б вона не була. No eres bonito заперечує ознаку співрозмовника, No soy rápido — ознаку самого мовця.',
  es: 'No + linking word already appeared as a formula: No es fácil. The same formula works with eres and with soy too — no goes right before the linking word, whichever it is. No eres bonito negates the listener\'s quality, No soy rápido the speaker\'s own.',
  'pt-BR': 'No + ligação já apareceu como fórmula: No es fácil. A mesma fórmula funciona também com eres e com soy — no fica bem antes da ligação, qualquer que seja ela. No eres bonito nega a qualidade do interlocutor, No soy rápido a do próprio falante.',
  vi: 'No + từ nối đã xuất hiện như một công thức: No es fácil. Cùng công thức đó hoạt động với eres và với soy — no đứng ngay trước từ nối, dù đó là từ nào. No eres bonito phủ định đặc điểm người nghe, No soy rápido phủ định đặc điểm người nói.',
  id: 'No + kata penghubung sudah muncul sebagai rumus: No es fácil. Rumus yang sama bekerja juga dengan eres dan dengan soy — no berada tepat sebelum kata penghubung, apa pun itu. No eres bonito menegasikan sifat pendengar, No soy rápido sifat penutur sendiri.',
  tr: 'No + bağlaç daha önce bir formül olarak ortaya çıkmıştı: No es fácil. Aynı formül eres ve soy ile de çalışır — no her zaman bağlacın hemen önünde durur. No eres bonito dinleyicinin niteliğini olumsuzlar, No soy rápido konuşanın kendi niteliğini.',
  pl: 'No + łącznik już się pojawiło jako formuła: No es fácil. Ta sama formuła działa też z eres i z soy — no stoi tuż przed łącznikiem, jakikolwiek by on nie był. No eres bonito zaprzecza cesze słuchacza, No soy rápido cesze samego mówiącego.',
});

const FORMULA_BODY = L({
  ru: 'Формула не меняется: no + связка + признак. No soy bonita говорит женщина о себе, No eres bonito обращаются к мужчине. В согласовании признака по роду отрицание ничего не меняет — bonito/bonita работают точно так же, как без no.',
  uk: 'Формула не змінюється: no + зв’язка + ознака. No soy bonita каже жінка про себе, No eres bonito звертаються до чоловіка. В узгодженні ознаки за родом заперечення нічого не змінює — bonito/bonita працюють точно так само, як без no.',
  es: 'The formula does not change: no + linking word + quality. No soy bonita is a woman talking about herself, No eres bonito addresses a man. In gender agreement of the quality, negation changes nothing — bonito/bonita work exactly as without no.',
  'pt-BR': 'A fórmula não muda: no + ligação + qualidade. No soy bonita é uma mulher falando de si mesma, No eres bonito fala com um homem. Na concordância de gênero da qualidade, a negação não muda nada — bonito/bonita funcionam exatamente como sem no.',
  vi: 'Công thức không đổi: no + từ nối + đặc điểm. No soy bonita là phụ nữ nói về mình, No eres bonito nói với đàn ông. Trong sự hòa hợp giống của đặc điểm, phủ định không thay đổi gì — bonito/bonita hoạt động y hệt như không có no.',
  id: 'Rumusnya tidak berubah: no + kata penghubung + sifat. No soy bonita adalah wanita berbicara tentang dirinya, No eres bonito berbicara dengan pria. Dalam kesesuaian gender sifat, negasi tidak mengubah apa pun — bonito/bonita bekerja persis seperti tanpa no.',
  tr: 'Formül değişmez: no + bağlaç + nitelik. No soy bonita kendisi hakkında konuşan bir kadındır, No eres bonito bir erkeğe hitap eder. Niteliğin cinsiyet uyumunda olumsuzlama hiçbir şeyi değiştirmez — bonito/bonita, no olmadan olduğu gibi çalışır.',
  pl: 'Formuła się nie zmienia: no + łącznik + cecha. No soy bonita to kobieta mówiąca o sobie, No eres bonito zwraca się do mężczyzny. W zgodności rodzaju cechy przeczenie nic nie zmienia — bonito/bonita działają dokładnie tak samo jak bez no.',
});

const TRAP_BODY = L({
  ru: 'Частая ошибка — поставить no перед признаком, а не перед связкой: Eres no bonito вместо No eres bonito. По-испански no всегда идёт первым, сразу перед связкой. Проверка простая: сначала no, потом связка, только затем признак.',
  uk: 'Часта помилка — поставити no перед ознакою, а не перед зв’язкою: Eres no bonito замість No eres bonito. В іспанській no завжди йде першим, одразу перед зв’язкою. Перевірка проста: спочатку no, потім зв’язка, тільки після — ознака.',
  es: 'A common mistake is placing no before the quality instead of before the linking word: Eres no bonito instead of No eres bonito. In Spanish no always comes first, right before the linking word. The check is simple: first no, then the linking word, only then the quality.',
  'pt-BR': 'Um erro comum é colocar no antes da qualidade em vez de antes da ligação: Eres no bonito em vez de No eres bonito. Em espanhol no sempre vem primeiro, logo antes da ligação. A checagem é simples: primeiro no, depois a ligação, só então a qualidade.',
  vi: 'Lỗi thường gặp là đặt no trước đặc điểm thay vì trước từ nối: Eres no bonito thay vì No eres bonito. Trong tiếng Tây Ban Nha no luôn đứng đầu, ngay trước từ nối. Cách kiểm tra đơn giản: trước tiên no, rồi từ nối, chỉ sau đó mới đến đặc điểm.',
  id: 'Kesalahan umum adalah meletakkan no sebelum sifat, bukan sebelum kata penghubung: Eres no bonito alih-alih No eres bonito. Dalam bahasa Spanyol no selalu datang pertama, tepat sebelum kata penghubung. Pengecekannya sederhana: pertama no, lalu kata penghubung, baru sifat.',
  tr: 'Yaygın hata, no’yu bağlaçtan önce değil, nitelikten önce koymaktır: No eres bonito yerine Eres no bonito. İspanyolcada no her zaman önce gelir, tam bağlacın önünde. Kontrol basittir: önce no, sonra bağlaç, ancak ondan sonra nitelik.',
  pl: 'Częsty błąd to postawienie no przed cechą zamiast przed łącznikiem: Eres no bonito zamiast No eres bonito. W hiszpańskim no zawsze idzie pierwsze, tuż przed łącznikiem. Sprawdzenie jest proste: najpierw no, potem łącznik, dopiero potem cecha.',
});

export const ES_EPISODE_01_SESSION_11_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'No работает с любой связкой',
      uk: 'No працює з будь-якою зв’язкою',
      es: 'No works with any linking word',
      'pt-BR': 'No funciona com qualquer ligação',
      vi: 'No hoạt động với bất kỳ từ nối nào',
      id: 'No bekerja dengan kata penghubung apa pun',
      tr: 'No her bağlaçla çalışır',
      pl: 'No działa z każdym łącznikiem',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'No + связка уже встречалось как формула: No es fácil. Та же формула работает и с eres, и с soy — no встаёт прямо перед связкой, какая бы она ни была. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' отрицает признак собеседника, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'explanation' }, { text: ' — признак самого говорящего.', semantic: 'explanation' }),
      uk: R({ text: 'No + зв’язка вже траплялося як формула: No es fácil. Та сама формула працює і з eres, і з soy — no стоїть прямо перед зв’язкою, якою б вона не була. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' заперечує ознаку співрозмовника, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'explanation' }, { text: ' — ознаку самого мовця.', semantic: 'explanation' }),
      es: R({ text: 'No + linking word already appeared as a formula: No es fácil. The same formula works with eres and with soy too — no goes right before the linking word, whichever it is. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' negates the listener\'s quality, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'explanation' }, { text: ' the speaker\'s own.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'No + ligação já apareceu como fórmula: No es fácil. A mesma fórmula funciona também com eres e com soy — no fica bem antes da ligação, qualquer que seja ela. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' nega a qualidade do interlocutor, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'explanation' }, { text: ' a do próprio falante.', semantic: 'explanation' }),
      vi: R({ text: 'No + từ nối đã xuất hiện như một công thức: No es fácil. Cùng công thức đó hoạt động với eres và với soy — no đứng ngay trước từ nối, dù đó là từ nào. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' phủ định đặc điểm người nghe, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'explanation' }, { text: ' phủ định đặc điểm người nói.', semantic: 'explanation' }),
      id: R({ text: 'No + kata penghubung sudah muncul sebagai rumus: No es fácil. Rumus yang sama bekerja juga dengan eres dan dengan soy — no berada tepat sebelum kata penghubung, apa pun itu. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' menegasikan sifat pendengar, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'explanation' }, { text: ' sifat penutur sendiri.', semantic: 'explanation' }),
      tr: R({ text: 'No + bağlaç daha önce bir formül olarak ortaya çıkmıştı: No es fácil. Aynı formül eres ve soy ile de çalışır — no her zaman bağlacın hemen önünde durur. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' dinleyicinin niteliğini olumsuzlar, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'explanation' }, { text: ' konuşanın kendi niteliğini.', semantic: 'explanation' }),
      pl: R({ text: 'No + łącznik już się pojawiło jako formuła: No es fácil. Ta sama formuła działa też z eres i z soy — no stoi tuż przed łącznikiem, jakikolwiek by on nie był. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' zaprzecza cesze słuchacza, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'explanation' }, { text: ' cesze samego mówiącego.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Где всегда стоит no по отношению к связке?',
        uk: 'Де завжди стоїть no відносно зв’язки?',
        es: 'Where does no always go relative to the linking word?',
        'pt-BR': 'Onde no sempre fica em relação à ligação?',
        vi: 'No luôn đứng ở đâu so với từ nối?',
        id: 'Di mana no selalu berada relatif terhadap kata penghubung?',
        tr: 'No, bağlaca göre her zaman nerede durur?',
        pl: 'Gdzie zawsze stoi no względem łącznika?',
      }),
      choices: [
        L({ ru: 'Прямо перед связкой', uk: 'Прямо перед зв’язкою', es: 'Right before the linking word', 'pt-BR': 'Bem antes da ligação', vi: 'Ngay trước từ nối', id: 'Tepat sebelum kata penghubung', tr: 'Bağlacın hemen önünde', pl: 'Tuż przed łącznikiem' }),
        L({ ru: 'Прямо перед признаком', uk: 'Прямо перед ознакою', es: 'Right before the quality', 'pt-BR': 'Bem antes da qualidade', vi: 'Ngay trước đặc điểm', id: 'Tepat sebelum sifat', tr: 'Niteliğin hemen önünde', pl: 'Tuż przed cechą' }),
        L({ ru: 'В самом конце фразы', uk: 'У самому кінці фрази', es: 'At the very end of the phrase', 'pt-BR': 'Bem no final da frase', vi: 'Ở cuối cùng của câu', id: 'Di paling akhir frasa', tr: 'İfadenin en sonunda', pl: 'Na samym końcu frazy' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No всегда стоит прямо перед связкой — soy, eres или es, — а не перед признаком и не в конце фразы.',
        uk: 'No завжди стоїть прямо перед зв’язкою — soy, eres чи es, — а не перед ознакою і не в кінці фрази.',
        es: 'No always goes right before the linking word — soy, eres, or es — not before the quality and not at the end of the phrase.',
        'pt-BR': 'No sempre fica bem antes da ligação — soy, eres ou es — não antes da qualidade e não no final da frase.',
        vi: 'No luôn đứng ngay trước từ nối — soy, eres hay es — không phải trước đặc điểm và không phải ở cuối câu.',
        id: 'No selalu berada tepat sebelum kata penghubung — soy, eres, atau es — bukan sebelum sifat dan bukan di akhir frasa.',
        tr: 'No her zaman bağlacın hemen önünde durur — soy, eres ya da es — niteliğin önünde değil ve ifadenin sonunda değil.',
        pl: 'No zawsze stoi tuż przed łącznikiem — soy, eres lub es — nie przed cechą i nie na końcu frazy.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Род признака не зависит от no',
      uk: 'Рід ознаки не залежить від no',
      es: 'The gender of the quality does not depend on no',
      'pt-BR': 'O gênero da qualidade não depende de no',
      vi: 'Giống của đặc điểm không phụ thuộc vào no',
      id: 'Gender sifat tidak bergantung pada no',
      tr: 'Niteliğin cinsiyeti no’ya bağlı değildir',
      pl: 'Rodzaj cechy nie zależy od no',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула не меняется: no + связка + признак. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'explanation' }, { text: ' говорит женщина о себе, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'explanation' }, { text: ' обращаются к мужчине. В согласовании признака по роду ', semantic: 'explanation' }, { text: 'отрицание ничего не меняет', semantic: 'targetCorrect' }, { text: ' — bonito/bonita работают точно так же, как без no.', semantic: 'explanation' }),
      uk: R({ text: 'Формула не змінюється: no + зв’язка + ознака. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'explanation' }, { text: ' каже жінка про себе, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'explanation' }, { text: ' звертаються до чоловіка. В узгодженні ознаки за родом ', semantic: 'explanation' }, { text: 'заперечення нічого не змінює', semantic: 'targetCorrect' }, { text: ' — bonito/bonita працюють точно так само, як без no.', semantic: 'explanation' }),
      es: R({ text: 'The formula does not change: no + linking word + quality. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'explanation' }, { text: ' is a woman talking about herself, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'explanation' }, { text: ' addresses a man. In gender agreement of the quality, ', semantic: 'explanation' }, { text: 'negation changes nothing', semantic: 'targetCorrect' }, { text: ' — bonito/bonita work exactly as without no.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula não muda: no + ligação + qualidade. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'explanation' }, { text: ' é uma mulher falando de si mesma, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'explanation' }, { text: ' fala com um homem. Na concordância de gênero da qualidade, ', semantic: 'explanation' }, { text: 'a negação não muda nada', semantic: 'targetCorrect' }, { text: ' — bonito/bonita funcionam exatamente como sem no.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức không đổi: no + từ nối + đặc điểm. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'explanation' }, { text: ' là phụ nữ nói về mình, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'explanation' }, { text: ' nói với đàn ông. Trong sự hòa hợp giống của đặc điểm, ', semantic: 'explanation' }, { text: 'phủ định không thay đổi gì', semantic: 'targetCorrect' }, { text: ' — bonito/bonita hoạt động y hệt như không có no.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya tidak berubah: no + kata penghubung + sifat. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'explanation' }, { text: ' adalah wanita berbicara tentang dirinya, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'explanation' }, { text: ' berbicara dengan pria. Dalam kesesuaian gender sifat, ', semantic: 'explanation' }, { text: 'negasi tidak mengubah apa pun', semantic: 'targetCorrect' }, { text: ' — bonito/bonita bekerja persis seperti tanpa no.', semantic: 'explanation' }),
      tr: R({ text: 'Formül değişmez: no + bağlaç + nitelik. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'explanation' }, { text: ' kendisi hakkında konuşan bir kadındır, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'explanation' }, { text: ' bir erkeğe hitap eder. Niteliğin cinsiyet uyumunda ', semantic: 'explanation' }, { text: 'olumsuzlama hiçbir şeyi değiştirmez', semantic: 'targetCorrect' }, { text: ' — bonito/bonita, no olmadan olduğu gibi çalışır.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła się nie zmienia: no + łącznik + cecha. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'explanation' }, { text: ' to kobieta mówiąca o sobie, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'explanation' }, { text: ' zwraca się do mężczyzny. W zgodności rodzaju cechy ', semantic: 'explanation' }, { text: 'przeczenie nic nie zmienia', semantic: 'targetCorrect' }, { text: ' — bonito/bonita działają dokładnie tak samo jak bez no.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что меняет отрицание в согласовании признака по роду?',
        uk: 'Що змінює заперечення в узгодженні ознаки за родом?',
        es: 'What does negation change in the gender agreement of the quality?',
        'pt-BR': 'O que a negação muda na concordância de gênero da qualidade?',
        vi: 'Phủ định thay đổi gì trong sự hòa hợp giống của đặc điểm?',
        id: 'Apa yang diubah negasi dalam kesesuaian gender sifat?',
        tr: 'Olumsuzlama, niteliğin cinsiyet uyumunda neyi değiştirir?',
        pl: 'Co zmienia przeczenie w zgodności rodzaju cechy?',
      }),
      choices: [
        L({ ru: 'Ничего не меняет', uk: 'Нічого не змінює', es: 'It changes nothing', 'pt-BR': 'Não muda nada', vi: 'Không thay đổi gì', id: 'Tidak mengubah apa pun', tr: 'Hiçbir şeyi değiştirmez', pl: 'Nic nie zmienia' }),
        L({ ru: 'Признак всегда становится мужского рода', uk: 'Ознака завжди стає чоловічого роду', es: 'The quality always becomes masculine', 'pt-BR': 'A qualidade sempre se torna masculina', vi: 'Đặc điểm luôn trở thành giống đực', id: 'Sifat selalu menjadi maskulin', tr: 'Nitelik her zaman eril olur', pl: 'Cecha zawsze staje się rodzaju męskiego' }),
        L({ ru: 'Признак теряет согласование по роду', uk: 'Ознака втрачає узгодження за родом', es: 'The quality loses gender agreement', 'pt-BR': 'A qualidade perde a concordância de gênero', vi: 'Đặc điểm mất sự hòa hợp giống', id: 'Sifat kehilangan kesesuaian gender', tr: 'Nitelik cinsiyet uyumunu kaybeder', pl: 'Cecha traci zgodność rodzaju' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Отрицание ничего не меняет в согласовании — bonito/bonita по-прежнему согласуются по роду того, о ком идёт речь, точно так же, как без no.',
        uk: 'Заперечення нічого не змінює в узгодженні — bonito/bonita так само узгоджуються за родом того, про кого йдеться, точно так само, як без no.',
        es: 'Negation changes nothing about agreement — bonito/bonita still agree with the gender of who is being talked about, exactly as without no.',
        'pt-BR': 'A negação não muda nada na concordância — bonito/bonita continuam concordando com o gênero de quem se fala, exatamente como sem no.',
        vi: 'Phủ định không thay đổi gì trong hòa hợp — bonito/bonita vẫn hòa hợp theo giống của người được nói tới, y hệt như không có no.',
        id: 'Negasi tidak mengubah apa pun dalam kesesuaian — bonito/bonita tetap sesuai dengan gender orang yang dibicarakan, persis seperti tanpa no.',
        tr: 'Olumsuzlama uyumda hiçbir şeyi değiştirmez — bonito/bonita, no olmadan olduğu gibi, kimden bahsedildiğinin cinsiyetiyle uyumlu kalır.',
        pl: 'Przeczenie nic nie zmienia w zgodności — bonito/bonita nadal zgadzają się z rodzajem osoby, o której mowa, dokładnie tak samo jak bez no.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'No перед связкой, не перед признаком',
      uk: 'No перед зв’язкою, не перед ознакою',
      es: 'No before the linking word, not before the quality',
      'pt-BR': 'No antes da ligação, não antes da qualidade',
      vi: 'No trước từ nối, không phải trước đặc điểm',
      id: 'No sebelum kata penghubung, bukan sebelum sifat',
      tr: 'No bağlacın önünde, niteliğin önünde değil',
      pl: 'No przed łącznikiem, nie przed cechą',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Частая ошибка — поставить no перед признаком, а не перед связкой: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. По-испански no всегда идёт первым, сразу перед связкой. Проверка простая: сначала no, потом связка, только затем признак.', semantic: 'explanation' }),
      uk: R({ text: 'Часта помилка — поставити no перед ознакою, а не перед зв’язкою: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. В іспанській no завжди йде першим, одразу перед зв’язкою. Перевірка проста: спочатку no, потім зв’язка, тільки після — ознака.', semantic: 'explanation' }),
      es: R({ text: 'A common mistake is placing no before the quality instead of before the linking word: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. In Spanish no always comes first, right before the linking word. The check is simple: first no, then the linking word, only then the quality.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Um erro comum é colocar no antes da qualidade em vez de antes da ligação: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. Em espanhol no sempre vem primeiro, logo antes da ligação. A checagem é simples: primeiro no, depois a ligação, só então a qualidade.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi thường gặp là đặt no trước đặc điểm thay vì trước từ nối: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. Trong tiếng Tây Ban Nha no luôn đứng đầu, ngay trước từ nối. Cách kiểm tra đơn giản: trước tiên no, rồi từ nối, chỉ sau đó mới đến đặc điểm.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan umum adalah meletakkan no sebelum sifat, bukan sebelum kata penghubung: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' alih-alih ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. Dalam bahasa Spanyol no selalu datang pertama, tepat sebelum kata penghubung. Pengecekannya sederhana: pertama no, lalu kata penghubung, baru sifat.', semantic: 'explanation' }),
      tr: R({ text: 'Yaygın hata, no’yu bağlaçtan önce değil, nitelikten önce koymaktır: ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: '. İspanyolcada no her zaman önce gelir, tam bağlacın önünde. Kontrol basittir: önce no, sonra bağlaç, ancak ondan sonra nitelik.', semantic: 'explanation' }),
      pl: R({ text: 'Częsty błąd to postawienie no przed cechą zamiast przed łącznikiem: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. W hiszpańskim no zawsze idzie pierwsze, tuż przed łącznikiem. Sprawdzenie jest proste: najpierw no, potem łącznik, dopiero potem cecha.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно возразить собеседнику мужского рода на комплимент?',
        uk: 'Як правильно заперечити співрозмовнику чоловічого роду на комплімент?',
        es: 'How do you correctly object to a compliment from a masculine listener?',
        'pt-BR': 'Como objetar corretamente a um elogio de um interlocutor masculino?',
        vi: 'Phản đối đúng cách lời khen của người nghe giống đực như thế nào?',
        id: 'Bagaimana cara menolak pujian dari pendengar maskulin dengan benar?',
        tr: 'Eril bir dinleyicinin iltifatına doğru nasıl itiraz edilir?',
        pl: 'Jak poprawnie sprzeciwić się komplementowi od słuchacza rodzaju męskiego?',
      }),
      choices: [
        L({ ru: 'No eres bonito', uk: 'No eres bonito', es: 'No eres bonito', 'pt-BR': 'No eres bonito', vi: 'No eres bonito', id: 'No eres bonito', tr: 'No eres bonito', pl: 'No eres bonito' }),
        L({ ru: 'Eres no bonito', uk: 'Eres no bonito', es: 'Eres no bonito', 'pt-BR': 'Eres no bonito', vi: 'Eres no bonito', id: 'Eres no bonito', tr: 'Eres no bonito', pl: 'Eres no bonito' }),
        L({ ru: 'No es bonito', uk: 'No es bonito', es: 'No es bonito', 'pt-BR': 'No es bonito', vi: 'No es bonito', id: 'No es bonito', tr: 'No es bonito', pl: 'No es bonito' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No eres bonito верно, потому что no стоит перед связкой eres, а сама связка — та, что для собеседника напрямую, не для предмета.',
        uk: 'No eres bonito правильно, бо no стоїть перед зв’язкою eres, а сама зв’язка — та, що для співрозмовника напряму, не для предмета.',
        es: 'No eres bonito is correct because no stands before the linking word eres, and the linking word itself is the one for the listener directly, not for a thing.',
        'pt-BR': 'No eres bonito está correto porque no fica antes da ligação eres, e a própria ligação é a que serve para o interlocutor diretamente, não para uma coisa.',
        vi: 'No eres bonito đúng vì no đứng trước từ nối eres, và bản thân từ nối là từ dùng cho người nghe trực tiếp, không phải cho một vật.',
        id: 'No eres bonito benar karena no berada sebelum kata penghubung eres, dan kata penghubung itu sendiri adalah yang untuk pendengar secara langsung, bukan untuk benda.',
        tr: 'No eres bonito doğrudur çünkü no, eres bağlacından önce durur ve bağlacın kendisi doğrudan dinleyici için olandır, bir şey için değil.',
        pl: 'No eres bonito jest poprawne, ponieważ no stoi przed łącznikiem eres, a sam łącznik jest tym dla słuchacza bezpośrednio, nie dla rzeczy.',
      }),
    },
  },
];
