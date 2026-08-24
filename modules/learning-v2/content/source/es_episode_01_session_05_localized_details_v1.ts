import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-24): ручной перевод и разбор для трёх
// фраз сессии 5 на восьми объяснительных локалях (без 'es' — целевой язык).
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;

export const ES_SESSION_05_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, EpisodeSourcePhraseLocalizedDetails>>>
> = Object.freeze({
  'es-e01-s05-es-rapido': {
    ru: { meaning: 'Это быстро', explanation: 'Так говорят про темп предмета мужского рода — например, поезда. Признак согласуется с родом — форма на -o.', distractors: [
      { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida — форма женского рода, с -a. Про предмет мужского рода нужна форма на -o: rápido.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil означает «лёгкий» — совсем другой признак, не про скорость. Нужно rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Какая связка нужна для оценки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Какой признак нужен для предмета мужского рода?', distractors: [
          { value: 'rápida', reason: 'Rápida — форма женского рода, с -a. Про предмет мужского рода нужна форма на -o: rápido.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil означает «лёгкий» — совсем другой признак, не про скорость. Нужно rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    uk: { meaning: 'Це швидко', explanation: 'Так кажуть про темп предмета чоловічого роду — наприклад, поїзда. Ознака узгоджується з родом — форма на -o.', distractors: [
      { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida — форма жіночого роду, з -a. Про предмет чоловічого роду потрібна форма на -o: rápido.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil означає «легкий» — зовсім інша ознака, не про швидкість. Потрібно rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Яка зв’язка потрібна для оцінки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Яка ознака потрібна для предмета чоловічого роду?', distractors: [
          { value: 'rápida', reason: 'Rápida — форма жіночого роду, з -a. Про предмет чоловічого роду потрібна форма на -o: rápido.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil означає «легкий» — зовсім інша ознака, не про швидкість. Потрібно rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    en: { meaning: 'It is fast', explanation: 'This is how you talk about the pace of a masculine noun — a train, for example. The quality agrees with gender — the -o form.', distractors: [
      { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida is the feminine form, ending in -a. A masculine noun needs the -o form: rápido.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil means "easy" — a completely different quality, not about speed. It needs rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Which linking word is needed to describe a thing?', distractors: [
          { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Which quality is needed for a masculine noun?', distractors: [
          { value: 'rápida', reason: 'Rápida is the feminine form, ending in -a. A masculine noun needs the -o form: rápido.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil means "easy" — a completely different quality, not about speed. It needs rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    'pt-BR': { meaning: 'Isso é rápido', explanation: 'É assim que se fala do ritmo de um substantivo masculino — um trem, por exemplo. A qualidade concorda com o gênero — a forma em -o.', distractors: [
      { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida é a forma feminina, terminada em -a. Um substantivo masculino precisa da forma em -o: rápido.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil significa "fácil" — uma qualidade completamente diferente, não sobre velocidade. Precisa de rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Qual ligação é necessária para descrever uma coisa?', distractors: [
          { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Qual qualidade é necessária para um substantivo masculino?', distractors: [
          { value: 'rápida', reason: 'Rápida é a forma feminina, terminada em -a. Um substantivo masculino precisa da forma em -o: rápido.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil significa "fácil" — uma qualidade completamente diferente, não sobre velocidade. Precisa de rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    vi: { meaning: 'Cái này nhanh', explanation: 'Đây là cách nói về tốc độ của danh từ giống đực — ví dụ như một chuyến tàu. Đặc điểm hòa hợp với giống — dạng -o.', distractors: [
      { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida là dạng giống cái, kết thúc bằng -a. Danh từ giống đực cần dạng -o: rápido.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil nghĩa là "dễ" — một đặc điểm hoàn toàn khác, không phải về tốc độ. Cần rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Từ nối nào cần để mô tả một vật?', distractors: [
          { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Đặc điểm nào cần cho danh từ giống đực?', distractors: [
          { value: 'rápida', reason: 'Rápida là dạng giống cái, kết thúc bằng -a. Danh từ giống đực cần dạng -o: rápido.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil nghĩa là "dễ" — một đặc điểm hoàn toàn khác, không phải về tốc độ. Cần rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    id: { meaning: 'Ini cepat', explanation: 'Beginilah cara membicarakan kecepatan kata benda maskulin — kereta, misalnya. Sifatnya sesuai dengan gender — bentuk -o.', distractors: [
      { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida adalah bentuk feminin, berakhiran -a. Kata benda maskulin memerlukan bentuk -o: rápido.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil berarti "mudah" — sifat yang sama sekali berbeda, bukan tentang kecepatan. Perlu rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Kata penghubung mana yang diperlukan untuk mendeskripsikan benda?', distractors: [
          { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Sifat mana yang diperlukan untuk kata benda maskulin?', distractors: [
          { value: 'rápida', reason: 'Rápida adalah bentuk feminin, berakhiran -a. Kata benda maskulin memerlukan bentuk -o: rápido.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil berarti "mudah" — sifat yang sama sekali berbeda, bukan tentang kecepatan. Perlu rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    tr: { meaning: 'Bu hızlı', explanation: 'Eril bir ismin temposu böyle anlatılır — örneğin bir tren. Nitelik cinsiyetle uyumludur — -o biçimi.', distractors: [
      { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida, -a ile biten dişil biçimdir. Eril bir isim -o biçimini gerektirir: rápido.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil "kolay" demektir — hızla ilgisi olmayan tamamen farklı bir nitelik. Rápido gerekir.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Bir nesneyi tanımlamak için hangi bağlayıcı gerekir?', distractors: [
          { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Eril bir isim için hangi nitelik gerekir?', distractors: [
          { value: 'rápida', reason: 'Rápida, -a ile biten dişil biçimdir. Eril bir isim -o biçimini gerektirir: rápido.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil "kolay" demektir — hızla ilgisi olmayan tamamen farklı bir nitelik. Rápido gerekir.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    pl: { meaning: 'To jest szybkie', explanation: 'Tak mówi się o tempie rzeczownika rodzaju męskiego — na przykład pociągu. Cecha zgadza się z rodzajem — forma na -o.', distractors: [
      { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida to forma żeńska, zakończona na -a. Rzeczownik męski wymaga formy na -o: rápido.', trapType: 'grammar' },
      { value: 'fácil', reason: 'Fácil znaczy „łatwy” — zupełnie inna cecha, nie o szybkości. Potrzebne jest rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Jaki łącznik jest potrzebny, by opisać rzecz?', distractors: [
          { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Jaka cecha jest potrzebna dla rzeczownika męskiego?', distractors: [
          { value: 'rápida', reason: 'Rápida to forma żeńska, zakończona na -a. Rzeczownik męski wymaga formy na -o: rápido.', trapType: 'grammar' },
          { value: 'fácil', reason: 'Fácil znaczy „łatwy” — zupełnie inna cecha, nie o szybkości. Potrzebne jest rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
  },
  'es-e01-s05-es-rapida': {
    ru: { meaning: 'Это быстро (о предмете женского рода)', explanation: 'Так говорят про темп предмета женского рода — например, машины. Меняется только концовка признака: -o становится -a.', distractors: [
      { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido — форма мужского рода, с -o. Про предмет женского рода нужна форма на -a: rápida.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita означает «красивая» — совсем другой признак, не про скорость. Нужно rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Какая связка нужна для оценки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — это «ты». Про предмет — только Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Какой признак нужен для предмета женского рода?', distractors: [
          { value: 'rápido', reason: 'Rápido — форма мужского рода, с -o. Про предмет женского рода нужна форма на -a: rápida.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita означает «красивая» — совсем другой признак, не про скорость. Нужно rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    uk: { meaning: 'Це швидко (про предмет жіночого роду)', explanation: 'Так кажуть про темп предмета жіночого роду — наприклад, машини. Змінюється лише закінчення ознаки: -o стає -a.', distractors: [
      { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido — форма чоловічого роду, з -o. Про предмет жіночого роду потрібна форма на -a: rápida.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita означає «красива» — зовсім інша ознака, не про швидкість. Потрібно rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Яка зв’язка потрібна для оцінки предмета?', distractors: [
          { value: 'Soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres — це «ти». Про предмет — тільки Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Яка ознака потрібна для предмета жіночого роду?', distractors: [
          { value: 'rápido', reason: 'Rápido — форма чоловічого роду, з -o. Про предмет жіночого роду потрібна форма на -a: rápida.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita означає «красива» — зовсім інша ознака, не про швидкість. Потрібно rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    en: { meaning: 'It is fast (about a feminine noun)', explanation: 'This is how you talk about the pace of a feminine noun — a car, for example. Only the ending of the quality changes: -o becomes -a.', distractors: [
      { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido is the masculine form, ending in -o. A feminine noun needs the -a form: rápida.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita means "pretty" — a completely different quality, not about speed. It needs rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Which linking word is needed to describe a thing?', distractors: [
          { value: 'Soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres is "you". A verdict about a thing needs Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Which quality is needed for a feminine noun?', distractors: [
          { value: 'rápido', reason: 'Rápido is the masculine form, ending in -o. A feminine noun needs the -a form: rápida.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita means "pretty" — a completely different quality, not about speed. It needs rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    'pt-BR': { meaning: 'Isso é rápida (sobre um substantivo feminino)', explanation: 'É assim que se fala do ritmo de um substantivo feminino — um carro, por exemplo. Só a terminação da qualidade muda: -o vira -a.', distractors: [
      { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido é a forma masculina, terminada em -o. Um substantivo feminino precisa da forma em -a: rápida.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita significa "bonita" — uma qualidade completamente diferente, não sobre velocidade. Precisa de rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Qual ligação é necessária para descrever uma coisa?', distractors: [
          { value: 'Soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Qual qualidade é necessária para um substantivo feminino?', distractors: [
          { value: 'rápido', reason: 'Rápido é a forma masculina, terminada em -o. Um substantivo feminino precisa da forma em -a: rápida.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita significa "bonita" — uma qualidade completamente diferente, não sobre velocidade. Precisa de rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    vi: { meaning: 'Cái này nhanh (về danh từ giống cái)', explanation: 'Đây là cách nói về tốc độ của danh từ giống cái — ví dụ như một chiếc xe. Chỉ đuôi của đặc điểm thay đổi: -o thành -a.', distractors: [
      { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido là dạng giống đực, kết thúc bằng -o. Danh từ giống cái cần dạng -a: rápida.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita nghĩa là "đẹp" — một đặc điểm hoàn toàn khác, không phải về tốc độ. Cần rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Từ nối nào cần để mô tả một vật?', distractors: [
          { value: 'Soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres là "bạn". Nhận định về một vật cần Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Đặc điểm nào cần cho danh từ giống cái?', distractors: [
          { value: 'rápido', reason: 'Rápido là dạng giống đực, kết thúc bằng -o. Danh từ giống cái cần dạng -a: rápida.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita nghĩa là "đẹp" — một đặc điểm hoàn toàn khác, không phải về tốc độ. Cần rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    id: { meaning: 'Ini cepat (tentang kata benda feminin)', explanation: 'Beginilah cara membicarakan kecepatan kata benda feminin — mobil, misalnya. Hanya akhiran sifatnya yang berubah: -o menjadi -a.', distractors: [
      { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido adalah bentuk maskulin, berakhiran -o. Kata benda feminin memerlukan bentuk -a: rápida.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita berarti "cantik" — sifat yang sama sekali berbeda, bukan tentang kecepatan. Perlu rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Kata penghubung mana yang diperlukan untuk mendeskripsikan benda?', distractors: [
          { value: 'Soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Sifat mana yang diperlukan untuk kata benda feminin?', distractors: [
          { value: 'rápido', reason: 'Rápido adalah bentuk maskulin, berakhiran -o. Kata benda feminin memerlukan bentuk -a: rápida.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita berarti "cantik" — sifat yang sama sekali berbeda, bukan tentang kecepatan. Perlu rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    tr: { meaning: 'Bu hızlı (dişil bir isim hakkında)', explanation: 'Dişil bir ismin temposu böyle anlatılır — örneğin bir araba. Sadece niteliğin sonu değişir: -o, -a olur.', distractors: [
      { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido, -o ile biten eril biçimdir. Dişil bir isim -a biçimini gerektirir: rápida.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita "güzel" demektir — hızla ilgisi olmayan tamamen farklı bir nitelik. Rápida gerekir.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Bir nesneyi tanımlamak için hangi bağlayıcı gerekir?', distractors: [
          { value: 'Soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı Es gerektirir.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Dişil bir isim için hangi nitelik gerekir?', distractors: [
          { value: 'rápido', reason: 'Rápido, -o ile biten eril biçimdir. Dişil bir isim -a biçimini gerektirir: rápida.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita "güzel" demektir — hızla ilgisi olmayan tamamen farklı bir nitelik. Rápida gerekir.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    pl: { meaning: 'To jest szybka (o rzeczowniku żeńskim)', explanation: 'Tak mówi się o tempie rzeczownika rodzaju żeńskiego — na przykład samochodu. Zmienia się tylko końcówka cechy: -o staje się -a.', distractors: [
      { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
      { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido to forma męska, zakończona na -o. Rzeczownik żeński wymaga formy na -a: rápida.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita znaczy „ładna” — zupełnie inna cecha, nie o szybkości. Potrzebne jest rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Es', prompt: 'Jaki łącznik jest potrzebny, by opisać rzecz?', distractors: [
          { value: 'Soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — Es.', trapType: 'grammar' },
          { value: 'Eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga Es.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Jaka cecha jest potrzebna dla rzeczownika żeńskiego?', distractors: [
          { value: 'rápido', reason: 'Rápido to forma męska, zakończona na -o. Rzeczownik żeński wymaga formy na -a: rápida.', trapType: 'grammar' },
          { value: 'bonita', reason: 'Bonita znaczy „ładna” — zupełnie inna cecha, nie o szybkości. Potrzebne jest rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
  },
  'es-e01-s05-no-es-rapido': {
    ru: { meaning: 'Это медленно', explanation: 'Так говорят, когда возражают на утверждение о высоком темпе. Отрицание темпа выражает «медленный» без отдельного слова — так же, как No es fácil значит «не легко».', distractors: [
      { value: 'Nada', reason: 'Nada — «ничего», отдельное слово-предмет. Глагол отрицают через no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres — это «ты». Про «это» — только es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida — форма женского рода, с -a. Здесь нужна форма на -o: rápido.', trapType: 'grammar' },
      { value: 'rápidamente', reason: 'Rápidamente — «быстро» как наречие при действии. Признак самой вещи — rápido.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Каким словом начать возражение?', distractors: [
          { value: 'Nada', reason: 'Nada — «ничего», отдельное слово-предмет. Глагол отрицают через no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Какое слово нужно перед признаком?', distractors: [
          { value: 'eres', reason: 'Eres — это «ты». Про «это» — только es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy — про себя. Оценка предмета не о говорящем — es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Какой признак нужен: «быстрый»?', distractors: [
          { value: 'rápida', reason: 'Rápida — форма женского рода, с -a. Здесь нужна форма на -o: rápido.', trapType: 'grammar' },
          { value: 'rápidamente', reason: 'Rápidamente — «быстро» как наречие при действии. Признак самой вещи — rápido.', trapType: 'grammar' },
        ]},
      ]},
    uk: { meaning: 'Це повільно', explanation: 'Так кажуть, коли заперечують твердження про високий темп. Заперечення темпу виражає «повільний» без окремого слова — так само, як No es fácil означає «не легко».', distractors: [
      { value: 'Nada', reason: 'Nada — «нічого», окреме слово-предмет. Дієслово заперечують через no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres — це «ти». Про «це» — тільки es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida — форма жіночого роду, з -a. Тут потрібна форма на -o: rápido.', trapType: 'grammar' },
      { value: 'rápidamente', reason: 'Rápidamente — «швидко» як прислівник при дії. Ознака самої речі — rápido.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Яким словом почати заперечення?', distractors: [
          { value: 'Nada', reason: 'Nada — «нічого», окреме слово-предмет. Дієслово заперечують через no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Яке слово потрібне перед ознакою?', distractors: [
          { value: 'eres', reason: 'Eres — це «ти». Про «це» — тільки es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy — про себе. Оцінка предмета не про мовця — es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Яка ознака потрібна: «швидкий»?', distractors: [
          { value: 'rápida', reason: 'Rápida — форма жіночого роду, з -a. Тут потрібна форма на -o: rápido.', trapType: 'grammar' },
          { value: 'rápidamente', reason: 'Rápidamente — «швидко» як прислівник при дії. Ознака самої речі — rápido.', trapType: 'grammar' },
        ]},
      ]},
    en: { meaning: 'It is slow', explanation: 'This is how you push back on a claim about high pace. Negating pace expresses "slow" without a separate word — the same way No es fácil means "not easy".', distractors: [
      { value: 'Nada', reason: 'Nada means "nothing", a separate thing-word. The verb is negated with no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non is not a Spanish word. Spanish negation is spelled no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres is "you". A verdict about a thing needs es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida is the feminine form, ending in -a. Here the -o form is needed: rápido.', trapType: 'grammar' },
      { value: 'rápidamente', reason: 'Rápidamente is "quickly" as an adverb used with an action. The quality of the thing itself is rápido.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Which word starts the pushback?', distractors: [
          { value: 'Nada', reason: 'Nada means "nothing", a separate thing-word. The verb is negated with no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non is not a Spanish word. Spanish negation is spelled no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Which word is needed before the quality?', distractors: [
          { value: 'eres', reason: 'Eres is "you". A verdict about a thing needs es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy is about the speaker. A verdict about a thing is not about the speaker — es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Which quality is needed: "fast"?', distractors: [
          { value: 'rápida', reason: 'Rápida is the feminine form, ending in -a. Here the -o form is needed: rápido.', trapType: 'grammar' },
          { value: 'rápidamente', reason: 'Rápidamente is "quickly" as an adverb used with an action. The quality of the thing itself is rápido.', trapType: 'grammar' },
        ]},
      ]},
    'pt-BR': { meaning: 'Isso é devagar', explanation: 'É assim que se contesta uma afirmação sobre ritmo alto. Negar o ritmo expressa "devagar" sem uma palavra separada — do mesmo jeito que No es fácil significa "não é fácil".', distractors: [
      { value: 'Nada', reason: 'Nada significa "nada", uma palavra-coisa separada. O verbo é negado com no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non não é uma palavra espanhola. A negação em espanhol se escreve no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida é a forma feminina, terminada em -a. Aqui precisa da forma em -o: rápido.', trapType: 'grammar' },
      { value: 'rápidamente', reason: 'Rápidamente é "rapidamente" como advérbio usado com uma ação. A qualidade da coisa em si é rápido.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Qual palavra inicia a contestação?', distractors: [
          { value: 'Nada', reason: 'Nada significa "nada", uma palavra-coisa separada. O verbo é negado com no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non não é uma palavra espanhola. A negação em espanhol se escreve no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Qual palavra é necessária antes da qualidade?', distractors: [
          { value: 'eres', reason: 'Eres é "você". Um veredito sobre uma coisa precisa de es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy é sobre quem fala. Um veredito sobre uma coisa não é sobre quem fala — es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Qual qualidade é necessária: "rápido"?', distractors: [
          { value: 'rápida', reason: 'Rápida é a forma feminina, terminada em -a. Aqui precisa da forma em -o: rápido.', trapType: 'grammar' },
          { value: 'rápidamente', reason: 'Rápidamente é "rapidamente" como advérbio usado com uma ação. A qualidade da coisa em si é rápido.', trapType: 'grammar' },
        ]},
      ]},
    vi: { meaning: 'Cái này chậm', explanation: 'Đây là cách phản đối một tuyên bố về tốc độ cao. Phủ định tốc độ diễn đạt "chậm" mà không cần từ riêng — giống như No es fácil nghĩa là "không dễ".', distractors: [
      { value: 'Nada', reason: 'Nada nghĩa là "không có gì", một từ-sự vật riêng biệt. Động từ được phủ định bằng no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non không phải từ tiếng Tây Ban Nha. Phủ định tiếng Tây Ban Nha viết là no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres là "bạn". Nhận định về một vật cần es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida là dạng giống cái, kết thúc bằng -a. Ở đây cần dạng -o: rápido.', trapType: 'grammar' },
      { value: 'rápidamente', reason: 'Rápidamente là "nhanh chóng" như trạng từ dùng với hành động. Đặc điểm của chính vật đó là rápido.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Từ nào bắt đầu lời phản đối?', distractors: [
          { value: 'Nada', reason: 'Nada nghĩa là "không có gì", một từ-sự vật riêng biệt. Động từ được phủ định bằng no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non không phải từ tiếng Tây Ban Nha. Phủ định tiếng Tây Ban Nha viết là no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Từ nào cần trước đặc điểm?', distractors: [
          { value: 'eres', reason: 'Eres là "bạn". Nhận định về một vật cần es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy nói về người nói. Nhận định về một vật không phải về người nói — es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Đặc điểm nào cần: "nhanh"?', distractors: [
          { value: 'rápida', reason: 'Rápida là dạng giống cái, kết thúc bằng -a. Ở đây cần dạng -o: rápido.', trapType: 'grammar' },
          { value: 'rápidamente', reason: 'Rápidamente là "nhanh chóng" như trạng từ dùng với hành động. Đặc điểm của chính vật đó là rápido.', trapType: 'grammar' },
        ]},
      ]},
    id: { meaning: 'Ini lambat', explanation: 'Beginilah cara membantah klaim tentang kecepatan tinggi. Menegasikan kecepatan mengungkapkan "lambat" tanpa kata terpisah — sama seperti No es fácil berarti "tidak mudah".', distractors: [
      { value: 'Nada', reason: 'Nada berarti "tidak ada apa-apa", kata-benda terpisah. Kata kerja dinegasikan dengan no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non bukan kata bahasa Spanyol. Negasi bahasa Spanyol dieja no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida adalah bentuk feminin, berakhiran -a. Di sini diperlukan bentuk -o: rápido.', trapType: 'grammar' },
      { value: 'rápidamente', reason: 'Rápidamente adalah "dengan cepat" sebagai kata keterangan yang dipakai dengan tindakan. Sifat dari benda itu sendiri adalah rápido.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Kata mana yang memulai sanggahan?', distractors: [
          { value: 'Nada', reason: 'Nada berarti "tidak ada apa-apa", kata-benda terpisah. Kata kerja dinegasikan dengan no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non bukan kata bahasa Spanyol. Negasi bahasa Spanyol dieja no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Kata mana yang diperlukan sebelum sifat?', distractors: [
          { value: 'eres', reason: 'Eres adalah "kamu". Penilaian tentang benda memerlukan es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy tentang penutur. Penilaian tentang benda bukan tentang penutur — es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Sifat mana yang diperlukan: "cepat"?', distractors: [
          { value: 'rápida', reason: 'Rápida adalah bentuk feminin, berakhiran -a. Di sini diperlukan bentuk -o: rápido.', trapType: 'grammar' },
          { value: 'rápidamente', reason: 'Rápidamente adalah "dengan cepat" sebagai kata keterangan yang dipakai dengan tindakan. Sifat dari benda itu sendiri adalah rápido.', trapType: 'grammar' },
        ]},
      ]},
    tr: { meaning: 'Bu yavaş', explanation: 'Yüksek tempo hakkındaki bir iddiaya böyle karşı çıkılır. Tempoyu olumsuzlamak, ayrı bir kelime olmadan "yavaş" ifade eder — tıpkı No es fácil’in "kolay değil" anlamına gelmesi gibi.', distractors: [
      { value: 'Nada', reason: 'Nada "hiçbir şey" demektir, ayrı bir isim-kelimedir. Fiil no ile olumsuzlanır.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzluk no olarak yazılır.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı es gerektirir.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida, -a ile biten dişil biçimdir. Burada -o biçimi gerekir: rápido.', trapType: 'grammar' },
      { value: 'rápidamente', reason: 'Rápidamente, bir eylemle kullanılan "hızlıca" zarfıdır. Şeyin kendisinin niteliği rápido’dur.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Karşı çıkış hangi kelimeyle başlar?', distractors: [
          { value: 'Nada', reason: 'Nada "hiçbir şey" demektir, ayrı bir isim-kelimedir. Fiil no ile olumsuzlanır.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzluk no olarak yazılır.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Nitelikten önce hangi kelime gerekir?', distractors: [
          { value: 'eres', reason: 'Eres "sen" demektir. Bir şey hakkındaki yargı es gerektirir.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy konuşan hakkındadır. Bir şey hakkındaki yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Hangi nitelik gerekir: "hızlı"?', distractors: [
          { value: 'rápida', reason: 'Rápida, -a ile biten dişil biçimdir. Burada -o biçimi gerekir: rápido.', trapType: 'grammar' },
          { value: 'rápidamente', reason: 'Rápidamente, bir eylemle kullanılan "hızlıca" zarfıdır. Şeyin kendisinin niteliği rápido’dur.', trapType: 'grammar' },
        ]},
      ]},
    pl: { meaning: 'To jest wolne', explanation: 'Tak sprzeciwia się twierdzeniu o wysokim tempie. Zaprzeczenie tempa wyraża „wolny” bez osobnego słowa — tak samo jak No es fácil znaczy „niełatwe”.', distractors: [
      { value: 'Nada', reason: 'Nada znaczy „nic”, osobne słowo-rzecz. Czasownik zaprzecza się przez no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non nie jest hiszpańskim słowem. Hiszpańskie przeczenie pisze się no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — es.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida to forma żeńska, zakończona na -a. Tu potrzebna jest forma na -o: rápido.', trapType: 'grammar' },
      { value: 'rápidamente', reason: 'Rápidamente to „szybko” jako przysłówek używany z czynnością. Cechą samej rzeczy jest rápido.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Jakim słowem zacząć sprzeciw?', distractors: [
          { value: 'Nada', reason: 'Nada znaczy „nic”, osobne słowo-rzecz. Czasownik zaprzecza się przez no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non nie jest hiszpańskim słowem. Hiszpańskie przeczenie pisze się no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Jakie słowo jest potrzebne przed cechą?', distractors: [
          { value: 'eres', reason: 'Eres to „ty”. Osąd o rzeczy wymaga es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy dotyczy mówiącego. Osąd o rzeczy nie dotyczy mówiącego — es.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Jaka cecha jest potrzebna: „szybki”?', distractors: [
          { value: 'rápida', reason: 'Rápida to forma żeńska, zakończona na -a. Tu potrzebna jest forma na -o: rápido.', trapType: 'grammar' },
          { value: 'rápidamente', reason: 'Rápidamente to „szybko” jako przysłówek używany z czynnością. Cechą samej rzeczy jest rápido.', trapType: 'grammar' },
        ]},
      ]},
  },
});
