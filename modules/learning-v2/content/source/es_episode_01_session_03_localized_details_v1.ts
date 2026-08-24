import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-24): ручной перевод и разбор для двух
// фраз сессии 3 на восьми объяснительных локалях (без 'es' — целевой язык).
// Написано вручную, не сгенерировано подстановкой — тот же принцип, что и в
// es_episode_01_session_01_localized_details_v1.ts /
// es_episode_01_session_02_localized_details_v1.ts.
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;

export const ES_SESSION_03_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, EpisodeSourcePhraseLocalizedDetails>>>
> = Object.freeze({
  'es-e01-s03-es-bonito': {
    ru: { meaning: 'Это красиво', explanation: 'Оценка предмета мужского рода. Признак согласуется с тем, о чём идёт речь, — здесь нужна форма на -o.', distractors: [
      { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita — форма женского рода, с -a. Про предмет мужского рода нужна форма на -o: bonito.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil означает «лёгкий» — совсем другой признак, не про внешний вид. Нужно bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Какая связка нужна для оценки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Какой признак нужен для предмета мужского рода?', distractors: [
          { value: 'bonita', reason: 'Bonita — форма женского рода, с -a. Про предмет мужского рода нужна форма на -o: bonito.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil означает «лёгкий» — совсем другой признак, не про внешний вид. Нужно bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    uk: { meaning: 'Це красиво', explanation: 'Оцінка предмета чоловічого роду. Ознака узгоджується з тим, про що йдеться, — тут потрібна форма на -o.', distractors: [
      { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita — форма жіночого роду, з -a. Про предмет чоловічого роду потрібна форма на -o: bonito.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil означає «легкий» — зовсім інша ознака, не про зовнішній вигляд. Потрібно bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Яка зв’язка потрібна для оцінки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Яка ознака потрібна для предмета чоловічого роду?', distractors: [
          { value: 'bonita', reason: 'Bonita — форма жіночого роду, з -a. Про предмет чоловічого роду потрібна форма на -o: bonito.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil означає «легкий» — зовсім інша ознака, не про зовнішній вигляд. Потрібно bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    en: { meaning: 'It is pretty', explanation: 'A verdict about a masculine noun. The quality agrees with what is being talked about — here it needs the -o form.', distractors: [
      { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita is the feminine form, ending in -a. A masculine noun needs the -o form: bonito.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil means "easy" — a completely different quality, not about looks. It needs bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Which linking word is needed to describe a thing?', distractors: [
          { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Which quality is needed for a masculine noun?', distractors: [
          { value: 'bonita', reason: 'Bonita is the feminine form, ending in -a. A masculine noun needs the -o form: bonito.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil means "easy" — a completely different quality, not about looks. It needs bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    'pt-BR': { meaning: 'Isso é bonito', explanation: 'Um veredito sobre um substantivo masculino. A qualidade concorda com aquilo de que se fala — aqui precisa da forma em -o.', distractors: [
      { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita é a forma feminina, terminada em -a. Um substantivo masculino precisa da forma em -o: bonito.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil significa "fácil" — uma qualidade completamente diferente, não sobre aparência. Precisa de bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Qual ligação é necessária para descrever uma coisa?', distractors: [
          { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Qual qualidade é necessária para um substantivo masculino?', distractors: [
          { value: 'bonita', reason: 'Bonita é a forma feminina, terminada em -a. Um substantivo masculino precisa da forma em -o: bonito.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil significa "fácil" — uma qualidade completamente diferente, não sobre aparência. Precisa de bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    vi: { meaning: 'Cái này đẹp', explanation: 'Một nhận định về một danh từ giống đực. Đặc điểm phải hòa hợp với thứ đang được nói tới — ở đây cần dạng -o.', distractors: [
      { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita là dạng giống cái, kết thúc bằng -a. Danh từ giống đực cần dạng -o: bonito.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil nghĩa là "dễ" — một đặc điểm hoàn toàn khác, không phải về vẻ ngoài. Cần bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Từ nối nào cần để mô tả một vật?', distractors: [
          { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Đặc điểm nào cần cho danh từ giống đực?', distractors: [
          { value: 'bonita', reason: 'Bonita là dạng giống cái, kết thúc bằng -a. Danh từ giống đực cần dạng -o: bonito.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil nghĩa là "dễ" — một đặc điểm hoàn toàn khác, không phải về vẻ ngoài. Cần bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    id: { meaning: 'Ini cantik', explanation: 'Penilaian tentang kata benda maskulin. Sifatnya harus sesuai dengan apa yang dibicarakan — di sini perlu bentuk -o.', distractors: [
      { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita adalah bentuk feminin, berakhiran -a. Kata benda maskulin memerlukan bentuk -o: bonito.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil berarti "mudah" — sifat yang sama sekali berbeda, bukan tentang penampilan. Perlu bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Kata penghubung mana yang diperlukan untuk mendeskripsikan benda?', distractors: [
          { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Sifat mana yang diperlukan untuk kata benda maskulin?', distractors: [
          { value: 'bonita', reason: 'Bonita adalah bentuk feminin, berakhiran -a. Kata benda maskulin memerlukan bentuk -o: bonito.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil berarti "mudah" — sifat yang sama sekali berbeda, bukan tentang penampilan. Perlu bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    tr: { meaning: 'Bu güzel', explanation: 'Eril bir isim hakkında bir yargı. Nitelik, hakkında konuşulan şeyle uyumlu olmalı — burada -o biçimi gerekir.', distractors: [
      { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita, -a ile biten dişil biçimdir. Eril bir isim -o biçimini gerektirir: bonito.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil "kolay" demektir — görünümle ilgisi olmayan tamamen farklı bir nitelik. Bonito gerekir.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Bir nesneyi tanımlamak için hangi bağlayıcı gerekir?', distractors: [
          { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Eril bir isim için hangi nitelik gerekir?', distractors: [
          { value: 'bonita', reason: 'Bonita, -a ile biten dişil biçimdir. Eril bir isim -o biçimini gerektirir: bonito.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil "kolay" demektir — görünümle ilgisi olmayan tamamen farklı bir nitelik. Bonito gerekir.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    pl: { meaning: 'To jest ładne', explanation: 'Osąd o rzeczowniku rodzaju męskiego. Cecha zgadza się z tym, o czym mowa — tu potrzebna jest forma na -o.', distractors: [
      { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita to forma żeńska, zakończona na -a. Rzeczownik męski wymaga formy na -o: bonito.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil znaczy „łatwy” — zupełnie inna cecha, nie o wyglądzie. Potrzebne jest bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Jaki łącznik jest potrzebny, by opisać rzecz?', distractors: [
          { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Jaka cecha jest potrzebna dla rzeczownika męskiego?', distractors: [
          { value: 'bonita', reason: 'Bonita to forma żeńska, zakończona na -a. Rzeczownik męski wymaga formy na -o: bonito.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil znaczy „łatwy” — zupełnie inna cecha, nie o wyglądzie. Potrzebne jest bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
  },
  'es-e01-s03-es-bonita': {
    ru: { meaning: 'Это красиво (о предмете женского рода)', explanation: 'Та же оценка, но предмет женского рода. Меняется только концовка признака: -o становится -a, связка es не меняется вовсе.', distractors: [
      { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito — форма мужского рода, с -o. Про предмет женского рода нужна форма на -a: bonita.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad означает «правда» — совсем другое понятие, не про внешний вид. Нужно bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Какая связка нужна для оценки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Какой признак нужен для предмета женского рода?', distractors: [
          { value: 'bonito', reason: 'Bonito — форма мужского рода, с -o. Про предмет женского рода нужна форма на -a: bonita.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad означает «правда» — совсем другое понятие, не про внешний вид. Нужно bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    uk: { meaning: 'Це красиво (про предмет жіночого роду)', explanation: 'Та сама оцінка, але предмет жіночого роду. Змінюється лише закінчення ознаки: -o стає -a, зв’язка es не змінюється зовсім.', distractors: [
      { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito — форма чоловічого роду, з -o. Про предмет жіночого роду потрібна форма на -a: bonita.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad означає «правда» — зовсім інше поняття, не про зовнішній вигляд. Потрібно bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Яка зв’язка потрібна для оцінки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Яка ознака потрібна для предмета жіночого роду?', distractors: [
          { value: 'bonito', reason: 'Bonito — форма чоловічого роду, з -o. Про предмет жіночого роду потрібна форма на -a: bonita.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad означає «правда» — зовсім інше поняття, не про зовнішній вигляд. Потрібно bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    en: { meaning: 'It is pretty (about a feminine noun)', explanation: 'The same verdict, but about a feminine noun. Only the ending of the quality changes: -o becomes -a, while the linking word es does not change at all.', distractors: [
      { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito is the masculine form, ending in -o. A feminine noun needs the -a form: bonita.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad means "truth" — a completely different idea, not about looks. It needs bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Which linking word is needed to describe a thing?', distractors: [
          { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Which quality is needed for a feminine noun?', distractors: [
          { value: 'bonito', reason: 'Bonito is the masculine form, ending in -o. A feminine noun needs the -a form: bonita.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad means "truth" — a completely different idea, not about looks. It needs bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    'pt-BR': { meaning: 'Isso é bonita (sobre um substantivo feminino)', explanation: 'O mesmo veredito, mas sobre um substantivo feminino. Só a terminação da qualidade muda: -o vira -a, e a ligação es não muda em nada.', distractors: [
      { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito é a forma masculina, terminada em -o. Um substantivo feminino precisa da forma em -a: bonita.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad significa "verdade" — uma ideia completamente diferente, não sobre aparência. Precisa de bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Qual ligação é necessária para descrever uma coisa?', distractors: [
          { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Qual qualidade é necessária para um substantivo feminino?', distractors: [
          { value: 'bonito', reason: 'Bonito é a forma masculina, terminada em -o. Um substantivo feminino precisa da forma em -a: bonita.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad significa "verdade" — uma ideia completamente diferente, não sobre aparência. Precisa de bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    vi: { meaning: 'Cái này đẹp (về danh từ giống cái)', explanation: 'Cùng một nhận định, nhưng về danh từ giống cái. Chỉ đuôi của đặc điểm thay đổi: -o thành -a, còn từ nối es không đổi chút nào.', distractors: [
      { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito là dạng giống đực, kết thúc bằng -o. Danh từ giống cái cần dạng -a: bonita.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad nghĩa là "sự thật" — một ý hoàn toàn khác, không phải về vẻ ngoài. Cần bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Từ nối nào cần để mô tả một vật?', distractors: [
          { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Đặc điểm nào cần cho danh từ giống cái?', distractors: [
          { value: 'bonito', reason: 'Bonito là dạng giống đực, kết thúc bằng -o. Danh từ giống cái cần dạng -a: bonita.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad nghĩa là "sự thật" — một ý hoàn toàn khác, không phải về vẻ ngoài. Cần bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    id: { meaning: 'Ini cantik (tentang kata benda feminin)', explanation: 'Penilaian yang sama, tetapi tentang kata benda feminin. Hanya akhiran sifatnya yang berubah: -o menjadi -a, sedangkan kata penghubung es sama sekali tidak berubah.', distractors: [
      { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito adalah bentuk maskulin, berakhiran -o. Kata benda feminin memerlukan bentuk -a: bonita.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad berarti "kebenaran" — gagasan yang sama sekali berbeda, bukan tentang penampilan. Perlu bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Kata penghubung mana yang diperlukan untuk mendeskripsikan benda?', distractors: [
          { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Sifat mana yang diperlukan untuk kata benda feminin?', distractors: [
          { value: 'bonito', reason: 'Bonito adalah bentuk maskulin, berakhiran -o. Kata benda feminin memerlukan bentuk -a: bonita.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad berarti "kebenaran" — gagasan yang sama sekali berbeda, bukan tentang penampilan. Perlu bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    tr: { meaning: 'Bu güzel (dişil bir isim hakkında)', explanation: 'Aynı yargı, ama dişil bir isim hakkında. Sadece niteliğin sonu değişir: -o, -a olur; es bağlacı ise hiç değişmez.', distractors: [
      { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito, -o ile biten eril biçimdir. Dişil bir isim -a biçimini gerektirir: bonita.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad "doğruluk" demektir — görünümle ilgisi olmayan tamamen farklı bir kavram. Bonita gerekir.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Bir nesneyi tanımlamak için hangi bağlayıcı gerekir?', distractors: [
          { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Dişil bir isim için hangi nitelik gerekir?', distractors: [
          { value: 'bonito', reason: 'Bonito, -o ile biten eril biçimdir. Dişil bir isim -a biçimini gerektirir: bonita.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad "doğruluk" demektir — görünümle ilgisi olmayan tamamen farklı bir kavram. Bonita gerekir.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    pl: { meaning: 'To jest ładna (o rzeczowniku żeńskim)', explanation: 'Ten sam osąd, ale o rzeczowniku żeńskim. Zmienia się tylko końcówka cechy: -o staje się -a, a łącznik es wcale się nie zmienia.', distractors: [
      { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito to forma męska, zakończona na -o. Rzeczownik żeński wymaga formy na -a: bonita.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad znaczy „prawda” — zupełnie inne pojęcie, nie o wyglądzie. Potrzebne jest bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Jaki łącznik jest potrzebny, by opisać rzecz?', distractors: [
          { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Jaka cecha jest potrzebna dla rzeczownika żeńskiego?', distractors: [
          { value: 'bonito', reason: 'Bonito to forma męska, zakończona na -o. Rzeczownik żeński wymaga formy na -a: bonita.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad znaczy „prawda” — zupełnie inne pojęcie, nie o wyglądzie. Potrzebne jest bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
  },
});
