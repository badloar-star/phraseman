import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-24): ручной перевод и разбор для двух
// НОВЫХ фраз voice-сессии 7 (No es único / No es única) на восьми
// объяснительных локалях (без 'es' — целевой язык). Единственные две фразы
// этой сессии, которых не было ни в одной предыдущей — все остальные 13
// переиспользуют существующие localizedDetails из сессий 1-6 без изменений.
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;

export const ES_SESSION_07_VOICE_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, EpisodeSourcePhraseLocalizedDetails>>>
> = Object.freeze({
  'es-e01-s07-no-es-unico': {
    ru: { meaning: 'Это не единственное в своём роде', explanation: 'Так возражают на утверждение об уникальности предмета мужского рода — есть и другие такие же. No встаёт перед связкой, признак остаётся без изменений.', distractors: [
      { value: 'Nada', reason: 'Nada — «ничего», отдельное слово-предмет. Глагол отрицают через no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres обращено к собеседнику — «ты». Про безличное «это» нужна только форма es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única — форма женского рода, с -a. Здесь нужна форма на -o: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico без тильды над u читалось бы с другим ударением. Нужная форма пишется с тильдой: único, не unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'No', prompt: 'Каким словом начать возражение?', distractors: [
          { value: 'Nada', reason: 'Nada — «ничего», отдельное слово-предмет. Глагол отрицают через no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Какое слово нужно перед признаком?', distractors: [
          { value: 'eres', reason: 'Eres обращено к собеседнику — «ты». Про безличное «это» нужна только форма es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Какой признак нужен для предмета мужского рода?', distractors: [
          { value: 'única', reason: 'Única — форма женского рода, с -a. Здесь нужна форма на -o: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico без тильды над u читалось бы с другим ударением. Нужная форма пишется с тильдой: único, не unico.', trapType: 'orthographic' },
        ]},
      ]},
    uk: { meaning: 'Це не єдине у своєму роді', explanation: 'Так заперечують твердження про унікальність предмета чоловічого роду — є й інші такі самі. No стає перед зв’язкою, ознака лишається без змін.', distractors: [
      { value: 'Nada', reason: 'Nada — «нічого», окреме слово-предмет. Дієслово заперечують через no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres звернене до співрозмовника — «ти». Про безособове «це» потрібна тільки форма es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única — форма жіночого роду, з -a. Тут потрібна форма на -o: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico без тильди над u читалося б з іншим наголосом. Потрібна форма пишеться з тильдою: único, не unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'No', prompt: 'Яким словом почати заперечення?', distractors: [
          { value: 'Nada', reason: 'Nada — «нічого», окреме слово-предмет. Дієслово заперечують через no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Яке слово потрібне перед ознакою?', distractors: [
          { value: 'eres', reason: 'Eres звернене до співрозмовника — «ти». Про безособове «це» потрібна тільки форма es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Яка ознака потрібна для предмета чоловічого роду?', distractors: [
          { value: 'única', reason: 'Única — форма жіночого роду, з -a. Тут потрібна форма на -o: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico без тильди над u читалося б з іншим наголосом. Потрібна форма пишеться з тильдою: único, не unico.', trapType: 'orthographic' },
        ]},
      ]},
    en: { meaning: 'It is not one of a kind', explanation: 'This is how you push back on a claim of uniqueness about a masculine thing — others like it exist too. No goes before the linking word, the quality stays unchanged.', distractors: [
      { value: 'Nada', reason: 'Nada means "nothing", a separate thing-word. The verb is negated with no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non is not a Spanish word. Spanish negation is spelled no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres is addressed to the listener — "you". An impersonal "it" needs only the form es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única is the feminine form, ending in -a. Here the -o form is needed: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico without the tilde over u would be read with a different stress. The correct form has a tilde: único, not unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'No', prompt: 'Which word starts the pushback?', distractors: [
          { value: 'Nada', reason: 'Nada means "nothing", a separate thing-word. The verb is negated with no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non is not a Spanish word. Spanish negation is spelled no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Which word is needed before the quality?', distractors: [
          { value: 'eres', reason: 'Eres is addressed to the listener — "you". An impersonal "it" needs only the form es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Which quality is needed for a masculine noun?', distractors: [
          { value: 'única', reason: 'Única is the feminine form, ending in -a. Here the -o form is needed: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico without the tilde over u would be read with a different stress. The correct form has a tilde: único, not unico.', trapType: 'orthographic' },
        ]},
      ]},
    'pt-BR': { meaning: 'Isso não é único no seu gênero', explanation: 'É assim que se contesta uma afirmação de unicidade sobre uma coisa masculina — existem outras iguais. No fica antes da ligação, a qualidade permanece igual.', distractors: [
      { value: 'Nada', reason: 'Nada significa "nada", uma palavra-coisa separada. O verbo é negado com no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non não é uma palavra espanhola. A negação em espanhol se escreve no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres é dirigido a quem ouve — "você". Um "isso" impessoal precisa só da forma es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única é a forma feminina, terminada em -a. Aqui precisa da forma em -o: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico sem o til sobre u seria lida com um acento diferente. A forma correta tem til: único, não unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'No', prompt: 'Qual palavra inicia a contestação?', distractors: [
          { value: 'Nada', reason: 'Nada significa "nada", uma palavra-coisa separada. O verbo é negado com no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non não é uma palavra espanhola. A negação em espanhol se escreve no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Qual palavra é necessária antes da qualidade?', distractors: [
          { value: 'eres', reason: 'Eres é dirigido a quem ouve — "você". Um "isso" impessoal precisa só da forma es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Qual qualidade é necessária para um substantivo masculino?', distractors: [
          { value: 'única', reason: 'Única é a forma feminina, terminada em -a. Aqui precisa da forma em -o: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico sem o til sobre u seria lida com um acento diferente. A forma correta tem til: único, não unico.', trapType: 'orthographic' },
        ]},
      ]},
    vi: { meaning: 'Cái này không phải duy nhất', explanation: 'Đây là cách phản đối một tuyên bố về sự độc nhất của một vật giống đực — có những thứ khác giống vậy. No đứng trước từ nối, đặc điểm không đổi.', distractors: [
      { value: 'Nada', reason: 'Nada nghĩa là "không có gì", một từ-sự vật riêng biệt. Động từ được phủ định bằng no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non không phải từ tiếng Tây Ban Nha. Phủ định tiếng Tây Ban Nha viết là no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres hướng tới người nghe — "bạn". Một "điều này" vô nhân xưng chỉ cần dạng es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única là dạng giống cái, kết thúc bằng -a. Ở đây cần dạng -o: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico không có dấu ngã trên u sẽ được đọc với trọng âm khác. Dạng đúng có dấu ngã: único, không phải unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'No', prompt: 'Từ nào bắt đầu lời phản đối?', distractors: [
          { value: 'Nada', reason: 'Nada nghĩa là "không có gì", một từ-sự vật riêng biệt. Động từ được phủ định bằng no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non không phải từ tiếng Tây Ban Nha. Phủ định tiếng Tây Ban Nha viết là no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Từ nào cần trước đặc điểm?', distractors: [
          { value: 'eres', reason: 'Eres hướng tới người nghe — "bạn". Một "điều này" vô nhân xưng chỉ cần dạng es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Đặc điểm nào cần cho danh từ giống đực?', distractors: [
          { value: 'única', reason: 'Única là dạng giống cái, kết thúc bằng -a. Ở đây cần dạng -o: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico không có dấu ngã trên u sẽ được đọc với trọng âm khác. Dạng đúng có dấu ngã: único, không phải unico.', trapType: 'orthographic' },
        ]},
      ]},
    id: { meaning: 'Ini bukan satu-satunya', explanation: 'Beginilah cara membantah klaim keunikan tentang benda maskulin — ada yang lain seperti itu juga. No berdiri sebelum kata penghubung, sifatnya tidak berubah.', distractors: [
      { value: 'Nada', reason: 'Nada berarti "tidak ada apa-apa", kata-benda terpisah. Kata kerja dinegasikan dengan no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non bukan kata bahasa Spanyol. Negasi bahasa Spanyol dieja no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres ditujukan kepada pendengar — "kamu". "Ini" impersonal hanya memerlukan bentuk es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única adalah bentuk feminin, berakhiran -a. Di sini diperlukan bentuk -o: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico tanpa tilde di atas u akan dibaca dengan tekanan berbeda. Bentuk yang benar memiliki tilde: único, bukan unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'No', prompt: 'Kata mana yang memulai sanggahan?', distractors: [
          { value: 'Nada', reason: 'Nada berarti "tidak ada apa-apa", kata-benda terpisah. Kata kerja dinegasikan dengan no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non bukan kata bahasa Spanyol. Negasi bahasa Spanyol dieja no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Kata mana yang diperlukan sebelum sifat?', distractors: [
          { value: 'eres', reason: 'Eres ditujukan kepada pendengar — "kamu". "Ini" impersonal hanya memerlukan bentuk es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Sifat mana yang diperlukan untuk kata benda maskulin?', distractors: [
          { value: 'única', reason: 'Única adalah bentuk feminin, berakhiran -a. Di sini diperlukan bentuk -o: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico tanpa tilde di atas u akan dibaca dengan tekanan berbeda. Bentuk yang benar memiliki tilde: único, bukan unico.', trapType: 'orthographic' },
        ]},
      ]},
    tr: { meaning: 'Bu eşsiz değil', explanation: 'Eril bir şeyin eşsizliği iddiasına böyle karşı çıkılır — benzerleri de vardır. No bağlaçtan önce durur, nitelik değişmeden kalır.', distractors: [
      { value: 'Nada', reason: 'Nada "hiçbir şey" demektir, ayrı bir isim-kelimedir. Fiil no ile olumsuzlanır.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzluk no olarak yazılır.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres dinleyiciye yöneliktir — "sen". Kişisiz bir "bu" yalnızca es biçimini gerektirir.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única, -a ile biten dişil biçimdir. Burada -o biçimi gerekir: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Tildesiz unico farklı bir vurguyla okunurdu. Doğru biçimde tilde vardır: único, unico değil.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'No', prompt: 'Karşı çıkış hangi kelimeyle başlar?', distractors: [
          { value: 'Nada', reason: 'Nada "hiçbir şey" demektir, ayrı bir isim-kelimedir. Fiil no ile olumsuzlanır.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzluk no olarak yazılır.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Nitelikten önce hangi kelime gerekir?', distractors: [
          { value: 'eres', reason: 'Eres dinleyiciye yöneliktir — "sen". Kişisiz bir "bu" yalnızca es biçimini gerektirir.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Eril bir isim için hangi nitelik gerekir?', distractors: [
          { value: 'única', reason: 'Única, -a ile biten dişil biçimdir. Burada -o biçimi gerekir: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Tildesiz unico farklı bir vurguyla okunurdu. Doğru biçimde tilde vardır: único, unico değil.', trapType: 'orthographic' },
        ]},
      ]},
    pl: { meaning: 'To nie jest jedyne w swoim rodzaju', explanation: 'Tak sprzeciwia się twierdzeniu o wyjątkowości rzeczy rodzaju męskiego — są też inne takie same. No stoi przed łącznikiem, cecha pozostaje bez zmian.', distractors: [
      { value: 'Nada', reason: 'Nada znaczy „nic”, osobne słowo-rzecz. Czasownik zaprzecza się przez no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non nie jest hiszpańskim słowem. Hiszpańskie przeczenie pisze się no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres jest skierowane do słuchacza — „ty”. Bezosobowe „to” wymaga tylko formy es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — es.', trapType: 'grammar' },
      { value: 'única', reason: 'Única to forma żeńska, zakończona na -a. Tu potrzebna jest forma na -o: único.', trapType: 'grammar' },
      { value: 'unico', reason: 'Unico bez tyldy nad u czytałoby się z innym akcentem. Poprawna forma ma tyldę: único, nie unico.', trapType: 'orthographic' },
    ],
      words: [
        { correct: 'No', prompt: 'Jakim słowem zacząć sprzeciw?', distractors: [
          { value: 'Nada', reason: 'Nada znaczy „nic”, osobne słowo-rzecz. Czasownik zaprzecza się przez no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non nie jest hiszpańskim słowem. Hiszpańskie przeczenie pisze się no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Jakie słowo jest potrzebne przed cechą?', distractors: [
          { value: 'eres', reason: 'Eres jest skierowane do słuchacza — „ty”. Bezosobowe „to” wymaga tylko formy es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — es.', trapType: 'grammar' },
        ]},
        { correct: 'único', prompt: 'Jaka cecha jest potrzebna dla rzeczownika męskiego?', distractors: [
          { value: 'única', reason: 'Única to forma żeńska, zakończona na -a. Tu potrzebna jest forma na -o: único.', trapType: 'grammar' },
          { value: 'unico', reason: 'Unico bez tyldy nad u czytałoby się z innym akcentem. Poprawna forma ma tyldę: único, nie unico.', trapType: 'orthographic' },
        ]},
      ]},
  },
  'es-e01-s07-no-es-unica': {
    ru: { meaning: 'Это не единственное в своём роде (о предмете женского рода)', explanation: 'Та же реакция, но предмет женского рода — например, идея повторяется у кого-то другого. Меняется только концовка признака: -o становится -a.', distractors: [
      { value: 'Nunca', reason: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres обращено к собеседнику — «ты». Про безличное «это» нужна только форма es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único — форма мужского рода, с -o. Здесь нужна форма на -a: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera означает «истинная» — совсем другой признак, не про единственность. Нужно única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Каким словом начать возражение?', distractors: [
          { value: 'Nunca', reason: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Какое слово нужно перед признаком?', distractors: [
          { value: 'eres', reason: 'Eres обращено к собеседнику — «ты». Про безличное «это» нужна только форма es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Какой признак нужен для предмета женского рода?', distractors: [
          { value: 'único', reason: 'Único — форма мужского рода, с -o. Здесь нужна форма на -a: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera означает «истинная» — совсем другой признак, не про единственность. Нужно única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    uk: { meaning: 'Це не єдине у своєму роді (про предмет жіночого роду)', explanation: 'Та сама реакція, але предмет жіночого роду — наприклад, ідея повторюється в когось іншого. Змінюється лише закінчення ознаки: -o стає -a.', distractors: [
      { value: 'Nunca', reason: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres звернене до співрозмовника — «ти». Про безособове «це» потрібна тільки форма es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único — форма чоловічого роду, з -o. Тут потрібна форма на -a: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera означає «істинна» — зовсім інша ознака, не про єдиність. Потрібно única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Яким словом почати заперечення?', distractors: [
          { value: 'Nunca', reason: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Яке слово потрібне перед ознакою?', distractors: [
          { value: 'eres', reason: 'Eres звернене до співрозмовника — «ти». Про безособове «це» потрібна тільки форма es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Яка ознака потрібна для предмета жіночого роду?', distractors: [
          { value: 'único', reason: 'Único — форма чоловічого роду, з -o. Тут потрібна форма на -a: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera означає «істинна» — зовсім інша ознака, не про єдиність. Потрібно única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    en: { meaning: 'It is not one of a kind (about a feminine noun)', explanation: 'The same pushback, but about a feminine noun — an idea, for example, that turns out to belong to someone else too. Only the ending of the quality changes: -o becomes -a.', distractors: [
      { value: 'Nunca', reason: 'Nunca means "never" — about frequency in time. Simple negation is no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non is not a Spanish word. Spanish negation is spelled no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres is addressed to the listener — "you". An impersonal "it" needs only the form es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único is the masculine form, ending in -o. Here the -a form is needed: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera means "true" — a completely different quality, not about uniqueness. It needs única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Which word starts the pushback?', distractors: [
          { value: 'Nunca', reason: 'Nunca means "never" — about frequency in time. Simple negation is no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non is not a Spanish word. Spanish negation is spelled no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Which word is needed before the quality?', distractors: [
          { value: 'eres', reason: 'Eres is addressed to the listener — "you". An impersonal "it" needs only the form es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Which quality is needed for a feminine noun?', distractors: [
          { value: 'único', reason: 'Único is the masculine form, ending in -o. Here the -a form is needed: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera means "true" — a completely different quality, not about uniqueness. It needs única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    'pt-BR': { meaning: 'Isso não é única no seu gênero (sobre um substantivo feminino)', explanation: 'A mesma contestação, mas sobre um substantivo feminino — uma ideia, por exemplo, que acaba pertencendo também a outra pessoa. Só a terminação da qualidade muda: -o vira -a.', distractors: [
      { value: 'Nunca', reason: 'Nunca significa "nunca" — sobre frequência no tempo. A negação simples é no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non não é uma palavra espanhola. A negação em espanhol se escreve no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres é dirigido a quem ouve — "você". Um "isso" impessoal precisa só da forma es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único é a forma masculina, terminada em -o. Aqui precisa da forma em -a: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera significa "verdadeira" — uma qualidade completamente diferente, não sobre singularidade. Precisa de única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Qual palavra inicia a contestação?', distractors: [
          { value: 'Nunca', reason: 'Nunca significa "nunca" — sobre frequência no tempo. A negação simples é no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non não é uma palavra espanhola. A negação em espanhol se escreve no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Qual palavra é necessária antes da qualidade?', distractors: [
          { value: 'eres', reason: 'Eres é dirigido a quem ouve — "você". Um "isso" impessoal precisa só da forma es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Qual qualidade é necessária para um substantivo feminino?', distractors: [
          { value: 'único', reason: 'Único é a forma masculina, terminada em -o. Aqui precisa da forma em -a: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera significa "verdadeira" — uma qualidade completamente diferente, não sobre singularidade. Precisa de única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    vi: { meaning: 'Cái này không phải duy nhất (về danh từ giống cái)', explanation: 'Cùng một sự phản đối, nhưng về danh từ giống cái — ví dụ một ý tưởng hóa ra cũng thuộc về người khác. Chỉ đuôi của đặc điểm thay đổi: -o thành -a.', distractors: [
      { value: 'Nunca', reason: 'Nunca nghĩa là "không bao giờ" — về tần suất thời gian. Phủ định đơn giản là no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non không phải từ tiếng Tây Ban Nha. Phủ định tiếng Tây Ban Nha viết là no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres hướng tới người nghe — "bạn". Một "điều này" vô nhân xưng chỉ cần dạng es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único là dạng giống đực, kết thúc bằng -o. Ở đây cần dạng -a: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera nghĩa là "đúng" — một đặc điểm hoàn toàn khác, không phải về sự duy nhất. Cần única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Từ nào bắt đầu lời phản đối?', distractors: [
          { value: 'Nunca', reason: 'Nunca nghĩa là "không bao giờ" — về tần suất thời gian. Phủ định đơn giản là no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non không phải từ tiếng Tây Ban Nha. Phủ định tiếng Tây Ban Nha viết là no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Từ nào cần trước đặc điểm?', distractors: [
          { value: 'eres', reason: 'Eres hướng tới người nghe — "bạn". Một "điều này" vô nhân xưng chỉ cần dạng es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Đặc điểm nào cần cho danh từ giống cái?', distractors: [
          { value: 'único', reason: 'Único là dạng giống đực, kết thúc bằng -o. Ở đây cần dạng -a: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera nghĩa là "đúng" — một đặc điểm hoàn toàn khác, không phải về sự duy nhất. Cần única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    id: { meaning: 'Ini bukan satu-satunya (tentang kata benda feminin)', explanation: 'Sanggahan yang sama, tetapi tentang kata benda feminin — sebuah ide, misalnya, yang ternyata juga milik orang lain. Hanya akhiran sifatnya yang berubah: -o menjadi -a.', distractors: [
      { value: 'Nunca', reason: 'Nunca berarti "tidak pernah" — tentang frekuensi waktu. Negasi sederhana adalah no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non bukan kata bahasa Spanyol. Negasi bahasa Spanyol dieja no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres ditujukan kepada pendengar — "kamu". "Ini" impersonal hanya memerlukan bentuk es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único adalah bentuk maskulin, berakhiran -o. Di sini diperlukan bentuk -a: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera berarti "benar" — sifat yang sama sekali berbeda, bukan tentang keunikan. Perlu única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Kata mana yang memulai sanggahan?', distractors: [
          { value: 'Nunca', reason: 'Nunca berarti "tidak pernah" — tentang frekuensi waktu. Negasi sederhana adalah no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non bukan kata bahasa Spanyol. Negasi bahasa Spanyol dieja no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Kata mana yang diperlukan sebelum sifat?', distractors: [
          { value: 'eres', reason: 'Eres ditujukan kepada pendengar — "kamu". "Ini" impersonal hanya memerlukan bentuk es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Sifat mana yang diperlukan untuk kata benda feminin?', distractors: [
          { value: 'único', reason: 'Único adalah bentuk maskulin, berakhiran -o. Di sini diperlukan bentuk -a: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera berarti "benar" — sifat yang sama sekali berbeda, bukan tentang keunikan. Perlu única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    tr: { meaning: 'Bu eşsiz değil (dişil bir isim hakkında)', explanation: 'Aynı karşı çıkış, ama dişil bir isim hakkında — örneğin bir fikir, başka birine de ait çıkar. Sadece niteliğin sonu değişir: -o, -a olur.', distractors: [
      { value: 'Nunca', reason: 'Nunca "asla" demektir — zamanla sıklık hakkındadır. Basit olumsuzlama no’dur.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzluk no olarak yazılır.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres dinleyiciye yöneliktir — "sen". Kişisiz bir "bu" yalnızca es biçimini gerektirir.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único, -o ile biten eril biçimdir. Burada -a biçimi gerekir: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera "doğru" demektir — eşsizlikle ilgisi olmayan tamamen farklı bir nitelik. Única gerekir.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Karşı çıkış hangi kelimeyle başlar?', distractors: [
          { value: 'Nunca', reason: 'Nunca "asla" demektir — zamanla sıklık hakkındadır. Basit olumsuzlama no’dur.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzluk no olarak yazılır.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Nitelikten önce hangi kelime gerekir?', distractors: [
          { value: 'eres', reason: 'Eres dinleyiciye yöneliktir — "sen". Kişisiz bir "bu" yalnızca es biçimini gerektirir.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Dişil bir isim için hangi nitelik gerekir?', distractors: [
          { value: 'único', reason: 'Único, -o ile biten eril biçimdir. Burada -a biçimi gerekir: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera "doğru" demektir — eşsizlikle ilgisi olmayan tamamen farklı bir nitelik. Única gerekir.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    pl: { meaning: 'To nie jest jedyne w swoim rodzaju (o rzeczowniku żeńskim)', explanation: 'Ten sam sprzeciw, ale o rzeczowniku żeńskim — na przykład pomysł, który okazuje się należeć też do kogoś innego. Zmienia się tylko końcówka cechy: -o staje się -a.', distractors: [
      { value: 'Nunca', reason: 'Nunca znaczy „nigdy” — o częstotliwości w czasie. Proste przeczenie to no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non nie jest hiszpańskim słowem. Hiszpańskie przeczenie pisze się no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres jest skierowane do słuchacza — „ty”. Bezosobowe „to” wymaga tylko formy es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — es.', trapType: 'grammar' },
      { value: 'único', reason: 'Único to forma męska, zakończona na -o. Tu potrzebna jest forma na -a: única.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera znaczy „prawdziwa” — zupełnie inna cecha, nie o wyjątkowości. Potrzebne jest única.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Jakim słowem zacząć sprzeciw?', distractors: [
          { value: 'Nunca', reason: 'Nunca znaczy „nigdy” — o częstotliwości w czasie. Proste przeczenie to no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non nie jest hiszpańskim słowem. Hiszpańskie przeczenie pisze się no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Jakie słowo jest potrzebne przed cechą?', distractors: [
          { value: 'eres', reason: 'Eres jest skierowane do słuchacza — „ty”. Bezosobowe „to” wymaga tylko formy es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — es.', trapType: 'grammar' },
        ]},
        { correct: 'única', prompt: 'Jaka cecha jest potrzebna dla rzeczownika żeńskiego?', distractors: [
          { value: 'único', reason: 'Único to forma męska, zakończona na -o. Tu potrzebna jest forma na -a: única.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera znaczy „prawdziwa” — zupełnie inna cecha, nie o wyjątkowości. Potrzebne jest única.', trapType: 'semantic_neighbor' },
        ]},
      ]},
  },
});
