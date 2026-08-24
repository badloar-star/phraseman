import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-24): ручной перевод и разбор для двух
// фраз сессии 4 на восьми объяснительных локалях (без 'es' — целевой язык).
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;

export const ES_SESSION_04_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, EpisodeSourcePhraseLocalizedDetails>>>
> = Object.freeze({
  'es-e01-s04-es-verdadero': {
    ru: { meaning: 'Это истинно (о предмете мужского рода)', explanation: 'Оценка предмета мужского рода: не «правда» как существительное, а признак «истинный». Форма на -o согласуется с родом.', distractors: [
      { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera — форма женского рода, с -a. Про предмет мужского рода нужна форма на -o: verdadero.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad — существительное «правда», предмет, а не признак. Признак предмета — verdadero.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'Es', prompt: 'Какая связка нужна для оценки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadero', prompt: 'Какой признак нужен для предмета мужского рода?', distractors: [
          { value: 'verdadera', reason: 'Verdadera — форма женского рода, с -a. Про предмет мужского рода нужна форма на -o: verdadero.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad — существительное «правда», предмет, а не признак. Признак предмета — verdadero.', trapType: 'grammar' },
        ]},
      ]},
    uk: { meaning: 'Це істинно (про предмет чоловічого роду)', explanation: 'Оцінка предмета чоловічого роду: не «правда» як іменник, а ознака «істинний». Форма на -o узгоджується з родом.', distractors: [
      { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera — форма жіночого роду, з -a. Про предмет чоловічого роду потрібна форма на -o: verdadero.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad — іменник «правда», предмет, а не ознака. Ознака предмета — verdadero.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'Es', prompt: 'Яка зв’язка потрібна для оцінки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadero', prompt: 'Яка ознака потрібна для предмета чоловічого роду?', distractors: [
          { value: 'verdadera', reason: 'Verdadera — форма жіночого роду, з -a. Про предмет чоловічого роду потрібна форма на -o: verdadero.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad — іменник «правда», предмет, а не ознака. Ознака предмета — verdadero.', trapType: 'grammar' },
        ]},
      ]},
    en: { meaning: 'It is true (about a masculine noun)', explanation: 'A verdict about a masculine noun: not "truth" as a noun, but the quality "true". The -o form agrees with gender.', distractors: [
      { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera is the feminine form, ending in -a. A masculine noun needs the -o form: verdadero.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad is the noun "truth", a thing, not a quality. The quality of a thing is verdadero.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'Es', prompt: 'Which linking word is needed to describe a thing?', distractors: [
          { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadero', prompt: 'Which quality is needed for a masculine noun?', distractors: [
          { value: 'verdadera', reason: 'Verdadera is the feminine form, ending in -a. A masculine noun needs the -o form: verdadero.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad is the noun "truth", a thing, not a quality. The quality of a thing is verdadero.', trapType: 'grammar' },
        ]},
      ]},
    'pt-BR': { meaning: 'Isso é verdadeiro (sobre um substantivo masculino)', explanation: 'Um veredito sobre um substantivo masculino: não "verdade" como substantivo, mas a qualidade "verdadeiro". A forma em -o concorda com o gênero.', distractors: [
      { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera é a forma feminina, terminada em -a. Um substantivo masculino precisa da forma em -o: verdadero.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad é o substantivo "verdade", uma coisa, não uma qualidade. A qualidade de uma coisa é verdadero.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'Es', prompt: 'Qual ligação é necessária para descrever uma coisa?', distractors: [
          { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadero', prompt: 'Qual qualidade é necessária para um substantivo masculino?', distractors: [
          { value: 'verdadera', reason: 'Verdadera é a forma feminina, terminada em -a. Um substantivo masculino precisa da forma em -o: verdadero.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad é o substantivo "verdade", uma coisa, não uma qualidade. A qualidade de uma coisa é verdadero.', trapType: 'grammar' },
        ]},
      ]},
    vi: { meaning: 'Điều này đúng (về danh từ giống đực)', explanation: 'Một nhận định về danh từ giống đực: không phải "sự thật" như danh từ, mà là đặc điểm "đúng". Dạng -o hòa hợp với giống.', distractors: [
      { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera là dạng giống cái, kết thúc bằng -a. Danh từ giống đực cần dạng -o: verdadero.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad là danh từ "sự thật", một sự vật, không phải đặc điểm. Đặc điểm của một vật là verdadero.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'Es', prompt: 'Từ nối nào cần để mô tả một vật?', distractors: [
          { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadero', prompt: 'Đặc điểm nào cần cho danh từ giống đực?', distractors: [
          { value: 'verdadera', reason: 'Verdadera là dạng giống cái, kết thúc bằng -a. Danh từ giống đực cần dạng -o: verdadero.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad là danh từ "sự thật", một sự vật, không phải đặc điểm. Đặc điểm của một vật là verdadero.', trapType: 'grammar' },
        ]},
      ]},
    id: { meaning: 'Ini benar (tentang kata benda maskulin)', explanation: 'Penilaian tentang kata benda maskulin: bukan "kebenaran" sebagai kata benda, tetapi sifat "benar". Bentuk -o sesuai dengan gender.', distractors: [
      { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera adalah bentuk feminin, berakhiran -a. Kata benda maskulin memerlukan bentuk -o: verdadero.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad adalah kata benda "kebenaran", sebuah benda, bukan sifat. Sifat dari sebuah benda adalah verdadero.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'Es', prompt: 'Kata penghubung mana yang diperlukan untuk mendeskripsikan benda?', distractors: [
          { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadero', prompt: 'Sifat mana yang diperlukan untuk kata benda maskulin?', distractors: [
          { value: 'verdadera', reason: 'Verdadera adalah bentuk feminin, berakhiran -a. Kata benda maskulin memerlukan bentuk -o: verdadero.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad adalah kata benda "kebenaran", sebuah benda, bukan sifat. Sifat dari sebuah benda adalah verdadero.', trapType: 'grammar' },
        ]},
      ]},
    tr: { meaning: 'Bu doğru (eril bir isim hakkında)', explanation: 'Eril bir isim hakkında bir yargı: isim olarak "doğruluk" değil, "doğru" niteliği. -o biçimi cinsiyetle uyumludur.', distractors: [
      { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera, -a ile biten dişil biçimdir. Eril bir isim -o biçimini gerektirir: verdadero.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad "doğruluk" anlamına gelen bir isimdir, bir şeydir, nitelik değildir. Bir şeyin niteliği verdadero’dur.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'Es', prompt: 'Bir nesneyi tanımlamak için hangi bağlayıcı gerekir?', distractors: [
          { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
        ]},
        { correct: 'verdadero', prompt: 'Eril bir isim için hangi nitelik gerekir?', distractors: [
          { value: 'verdadera', reason: 'Verdadera, -a ile biten dişil biçimdir. Eril bir isim -o biçimini gerektirir: verdadero.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad "doğruluk" anlamına gelen bir isimdir, bir şeydir, nitelik değildir. Bir şeyin niteliği verdadero’dur.', trapType: 'grammar' },
        ]},
      ]},
    pl: { meaning: 'To jest prawdziwe (o rzeczowniku męskim)', explanation: 'Osąd o rzeczowniku rodzaju męskiego: nie „prawda” jako rzeczownik, lecz cecha „prawdziwy”. Forma na -o zgadza się z rodzajem.', distractors: [
      { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera to forma żeńska, zakończona na -a. Rzeczownik męski wymaga formy na -o: verdadero.', trapType: 'grammar' },
      { value: 'verdad', reason: 'Verdad to rzeczownik „prawda”, rzecz, a nie cecha. Cechą rzeczy jest verdadero.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'Es', prompt: 'Jaki łącznik jest potrzebny, by opisać rzecz?', distractors: [
          { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadero', prompt: 'Jaka cecha jest potrzebna dla rzeczownika męskiego?', distractors: [
          { value: 'verdadera', reason: 'Verdadera to forma żeńska, zakończona na -a. Rzeczownik męski wymaga formy na -o: verdadero.', trapType: 'grammar' },
          { value: 'verdad', reason: 'Verdad to rzeczownik „prawda”, rzecz, a nie cecha. Cechą rzeczy jest verdadero.', trapType: 'grammar' },
        ]},
      ]},
  },
  'es-e01-s04-es-verdadera': {
    ru: { meaning: 'Это истинно (о предмете женского рода)', explanation: 'Та же оценка, но предмет женского рода. Меняется только концовка признака: -o становится -a, связка es не меняется вовсе.', distractors: [
      { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero — форма мужского рода, с -o. Про предмет женского рода нужна форма на -a: verdadera.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita означает «красивая» — совсем другой признак, не про истинность. Нужно verdadera.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Какая связка нужна для оценки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadera', prompt: 'Какой признак нужен для предмета женского рода?', distractors: [
          { value: 'verdadero', reason: 'Verdadero — форма мужского рода, с -o. Про предмет женского рода нужна форма на -a: verdadera.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita означает «красивая» — совсем другой признак, не про истинность. Нужно verdadera.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    uk: { meaning: 'Це істинно (про предмет жіночого роду)', explanation: 'Та сама оцінка, але предмет жіночого роду. Змінюється лише закінчення ознаки: -o стає -a, зв’язка es не змінюється зовсім.', distractors: [
      { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero — форма чоловічого роду, з -o. Про предмет жіночого роду потрібна форма на -a: verdadera.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita означає «красива» — зовсім інша ознака, не про істинність. Потрібно verdadera.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Яка зв’язка потрібна для оцінки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadera', prompt: 'Яка ознака потрібна для предмета жіночого роду?', distractors: [
          { value: 'verdadero', reason: 'Verdadero — форма чоловічого роду, з -o. Про предмет жіночого роду потрібна форма на -a: verdadera.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita означає «красива» — зовсім інша ознака, не про істинність. Потрібно verdadera.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    en: { meaning: 'It is true (about a feminine noun)', explanation: 'The same verdict, but about a feminine noun. Only the ending of the quality changes: -o becomes -a, while the linking word es does not change at all.', distractors: [
      { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero is the masculine form, ending in -o. A feminine noun needs the -a form: verdadera.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita means "pretty" — a completely different quality, not about being true. It needs verdadera.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Which linking word is needed to describe a thing?', distractors: [
          { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadera', prompt: 'Which quality is needed for a feminine noun?', distractors: [
          { value: 'verdadero', reason: 'Verdadero is the masculine form, ending in -o. A feminine noun needs the -a form: verdadera.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita means "pretty" — a completely different quality, not about being true. It needs verdadera.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    'pt-BR': { meaning: 'Isso é verdadeira (sobre um substantivo feminino)', explanation: 'O mesmo veredito, mas sobre um substantivo feminino. Só a terminação da qualidade muda: -o vira -a, e a ligação es não muda em nada.', distractors: [
      { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero é a forma masculina, terminada em -o. Um substantivo feminino precisa da forma em -a: verdadera.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita significa "bonita" — uma qualidade completamente diferente, não sobre ser verdadeiro. Precisa de verdadera.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Qual ligação é necessária para descrever uma coisa?', distractors: [
          { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadera', prompt: 'Qual qualidade é necessária para um substantivo feminino?', distractors: [
          { value: 'verdadero', reason: 'Verdadero é a forma masculina, terminada em -o. Um substantivo feminino precisa da forma em -a: verdadera.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita significa "bonita" — uma qualidade completamente diferente, não sobre ser verdadeiro. Precisa de verdadera.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    vi: { meaning: 'Điều này đúng (về danh từ giống cái)', explanation: 'Cùng một nhận định, nhưng về danh từ giống cái. Chỉ đuôi của đặc điểm thay đổi: -o thành -a, còn từ nối es không đổi chút nào.', distractors: [
      { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero là dạng giống đực, kết thúc bằng -o. Danh từ giống cái cần dạng -a: verdadera.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita nghĩa là "đẹp" — một đặc điểm hoàn toàn khác, không phải về sự đúng đắn. Cần verdadera.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Từ nối nào cần để mô tả một vật?', distractors: [
          { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadera', prompt: 'Đặc điểm nào cần cho danh từ giống cái?', distractors: [
          { value: 'verdadero', reason: 'Verdadero là dạng giống đực, kết thúc bằng -o. Danh từ giống cái cần dạng -a: verdadera.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita nghĩa là "đẹp" — một đặc điểm hoàn toàn khác, không phải về sự đúng đắn. Cần verdadera.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    id: { meaning: 'Ini benar (tentang kata benda feminin)', explanation: 'Penilaian yang sama, tetapi tentang kata benda feminin. Hanya akhiran sifatnya yang berubah: -o menjadi -a, sedangkan kata penghubung es sama sekali tidak berubah.', distractors: [
      { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero adalah bentuk maskulin, berakhiran -o. Kata benda feminin memerlukan bentuk -a: verdadera.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita berarti "cantik" — sifat yang sama sekali berbeda, bukan tentang kebenaran. Perlu verdadera.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Kata penghubung mana yang diperlukan untuk mendeskripsikan benda?', distractors: [
          { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadera', prompt: 'Sifat mana yang diperlukan untuk kata benda feminin?', distractors: [
          { value: 'verdadero', reason: 'Verdadero adalah bentuk maskulin, berakhiran -o. Kata benda feminin memerlukan bentuk -a: verdadera.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita berarti "cantik" — sifat yang sama sekali berbeda, bukan tentang kebenaran. Perlu verdadera.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    tr: { meaning: 'Bu doğru (dişil bir isim hakkında)', explanation: 'Aynı yargı, ama dişil bir isim hakkında. Sadece niteliğin sonu değişir: -o, -a olur; es bağlacı ise hiç değişmez.', distractors: [
      { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero, -o ile biten eril biçimdir. Dişil bir isim -a biçimini gerektirir: verdadera.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita "güzel" demektir — doğrulukla ilgisi olmayan tamamen farklı bir nitelik. Verdadera gerekir.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Bir nesneyi tanımlamak için hangi bağlayıcı gerekir?', distractors: [
          { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
        ]},
        { correct: 'verdadera', prompt: 'Dişil bir isim için hangi nitelik gerekir?', distractors: [
          { value: 'verdadero', reason: 'Verdadero, -o ile biten eril biçimdir. Dişil bir isim -a biçimini gerektirir: verdadera.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita "güzel" demektir — doğrulukla ilgisi olmayan tamamen farklı bir nitelik. Verdadera gerekir.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    pl: { meaning: 'To jest prawdziwa (o rzeczowniku żeńskim)', explanation: 'Ten sam osąd, ale o rzeczowniku żeńskim. Zmienia się tylko końcówka cechy: -o staje się -a, a łącznik es wcale się nie zmienia.', distractors: [
      { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero to forma męska, zakończona na -o. Rzeczownik żeński wymaga formy na -a: verdadera.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita znaczy „ładna” — zupełnie inna cecha, nie o prawdziwości. Potrzebne jest verdadera.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Jaki łącznik jest potrzebny, by opisać rzecz?', distractors: [
          { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
        ]},
        { correct: 'verdadera', prompt: 'Jaka cecha jest potrzebna dla rzeczownika żeńskiego?', distractors: [
          { value: 'verdadero', reason: 'Verdadero to forma męska, zakończona na -o. Rzeczownik żeński wymaga formy na -a: verdadera.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita znaczy „ładna” — zupełnie inna cecha, nie o prawdziwości. Potrzebne jest verdadera.', trapType: 'semantic_neighbor' },
        ]},
      ]},
  },
});
