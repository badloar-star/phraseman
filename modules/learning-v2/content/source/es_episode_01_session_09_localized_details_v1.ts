import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-24): ручной перевод и разбор для
// четырёх фраз сессии 9 на восьми объяснительных локалях (без 'es').
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;

export const ES_SESSION_09_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, EpisodeSourcePhraseLocalizedDetails>>>
> = Object.freeze({
  'es-e01-s09-eres-bonito': {
    ru: { meaning: 'Ты красивый', explanation: 'Так говорят собеседнику мужского рода о его внешности напрямую, в лицо. Признак согласуется с тем, к кому обращаются, — форма на -o.', distractors: [
      { value: 'Es', reason: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy — про себя. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita — форма женского рода, с -a. Про собеседника мужского рода нужна форма на -o: bonito.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido означает «быстрый» — совсем другой признак, не про внешний вид. Нужно bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Какая связка нужна при обращении к собеседнику?', distractors: [
          { value: 'Es', reason: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy — про себя. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Какой признак нужен для собеседника мужского рода?', distractors: [
          { value: 'bonita', reason: 'Bonita — форма женского рода, з -a. Про собеседника мужского рода нужна форма на -o: bonito.', trapType: 'grammar' },
          { value: 'rápido', reason: 'Rápido означает «быстрый» — совсем другой признак, не про внешний вид. Нужно bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    uk: { meaning: 'Ти красивий', explanation: 'Так кажуть співрозмовнику чоловічого роду про його зовнішність напряму, в обличчя. Ознака узгоджується з тим, до кого звертаються, — форма на -o.', distractors: [
      { value: 'Es', reason: 'Es — про предмет чи третю особу. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy — про себе. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita — форма жіночого роду, з -a. Про співрозмовника чоловічого роду потрібна форма на -o: bonito.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido означає «швидкий» — зовсім інша ознака, не про зовнішній вигляд. Потрібно bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Яка зв’язка потрібна при зверненні до співрозмовника?', distractors: [
          { value: 'Es', reason: 'Es — про предмет чи третю особу. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy — про себе. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Яка ознака потрібна для співрозмовника чоловічого роду?', distractors: [
          { value: 'bonita', reason: 'Bonita — форма жіночого роду, з -a. Про співрозмовника чоловічого роду потрібна форма на -o: bonito.', trapType: 'grammar' },
          { value: 'rápido', reason: 'Rápido означає «швидкий» — зовсім інша ознака, не про зовнішній вигляд. Потрібно bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    en: { meaning: 'You are pretty', explanation: 'This is how you tell a masculine listener about their looks directly, to their face. The quality agrees with who is being addressed — the -o form.', distractors: [
      { value: 'Es', reason: 'Es is about a thing or a third person. Addressing the listener needs only Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy is about the speaker. Addressing the listener needs only Eres.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita is the feminine form, ending in -a. A masculine listener needs the -o form: bonito.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido means "fast" — a completely different quality, not about looks. It needs bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Which linking word is needed when addressing the listener?', distractors: [
          { value: 'Es', reason: 'Es is about a thing or a third person. Addressing the listener needs only Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy is about the speaker. Addressing the listener needs only Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Which quality is needed for a masculine listener?', distractors: [
          { value: 'bonita', reason: 'Bonita is the feminine form, ending in -a. A masculine listener needs the -o form: bonito.', trapType: 'grammar' },
          { value: 'rápido', reason: 'Rápido means "fast" — a completely different quality, not about looks. It needs bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    'pt-BR': { meaning: 'Você é bonito', explanation: 'É assim que se fala a um ouvinte masculino sobre sua aparência diretamente, na cara. A qualidade concorda com quem é o interlocutor — a forma em -o.', distractors: [
      { value: 'Es', reason: 'Es é sobre uma coisa ou terceira pessoa. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy é sobre quem fala. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita é a forma feminina, terminada em -a. Um interlocutor masculino precisa da forma em -o: bonito.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido significa "rápido" — uma qualidade completamente diferente, não sobre aparência. Precisa de bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Qual ligação é necessária ao falar com o interlocutor?', distractors: [
          { value: 'Es', reason: 'Es é sobre uma coisa ou terceira pessoa. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy é sobre quem fala. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Qual qualidade é necessária para um interlocutor masculino?', distractors: [
          { value: 'bonita', reason: 'Bonita é a forma feminina, terminada em -a. Um interlocutor masculino precisa da forma em -o: bonito.', trapType: 'grammar' },
          { value: 'rápido', reason: 'Rápido significa "rápido" — uma qualidade completamente diferente, não sobre aparência. Precisa de bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    vi: { meaning: 'Bạn đẹp trai', explanation: 'Đây là cách nói với người nghe giống đực về ngoại hình của họ trực tiếp, ngay trước mặt. Đặc điểm hòa hợp với người được nói tới — dạng -o.', distractors: [
      { value: 'Es', reason: 'Es nói về một vật hay ngôi thứ ba. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy nói về người nói. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita là dạng giống cái, kết thúc bằng -a. Người nghe giống đực cần dạng -o: bonito.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido nghĩa là "nhanh" — một đặc điểm hoàn toàn khác, không phải về ngoại hình. Cần bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Từ nối nào cần khi nói với người nghe?', distractors: [
          { value: 'Es', reason: 'Es nói về một vật hay ngôi thứ ba. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy nói về người nói. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Đặc điểm nào cần cho người nghe giống đực?', distractors: [
          { value: 'bonita', reason: 'Bonita là dạng giống cái, kết thúc bằng -a. Người nghe giống đực cần dạng -o: bonito.', trapType: 'grammar' },
          { value: 'rápido', reason: 'Rápido nghĩa là "nhanh" — một đặc điểm hoàn toàn khác, không phải về ngoại hình. Cần bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    id: { meaning: 'Kamu tampan', explanation: 'Beginilah cara membicarakan penampilan pendengar maskulin langsung, di depan wajahnya. Sifatnya sesuai dengan siapa yang diajak bicara — bentuk -o.', distractors: [
      { value: 'Es', reason: 'Es tentang benda atau orang ketiga. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy tentang penutur. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita adalah bentuk feminin, berakhiran -a. Pendengar maskulin memerlukan bentuk -o: bonito.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido berarti "cepat" — sifat yang sama sekali berbeda, bukan tentang penampilan. Perlu bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Kata penghubung mana yang diperlukan saat berbicara dengan pendengar?', distractors: [
          { value: 'Es', reason: 'Es tentang benda atau orang ketiga. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy tentang penutur. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Sifat mana yang diperlukan untuk pendengar maskulin?', distractors: [
          { value: 'bonita', reason: 'Bonita adalah bentuk feminin, berakhiran -a. Pendengar maskulin memerlukan bentuk -o: bonito.', trapType: 'grammar' },
          { value: 'rápido', reason: 'Rápido berarti "cepat" — sifat yang sama sekali berbeda, bukan tentang penampilan. Perlu bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    tr: { meaning: 'Sen yakışıklısın', explanation: 'Eril bir dinleyiciye dış görünüşü hakkında böyle, doğrudan yüzüne söylenir. Nitelik, kiminle konuşulduğuyla uyumludur — -o biçimi.', distractors: [
      { value: 'Es', reason: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy konuşan hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita, -a ile biten dişil biçimdir. Eril bir dinleyici -o biçimini gerektirir: bonito.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido "hızlı" demektir — görünümle ilgisi olmayan tamamen farklı bir nitelik. Bonito gerekir.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Dinleyiciyle konuşurken hangi bağlayıcı gerekir?', distractors: [
          { value: 'Es', reason: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy konuşan hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Eril bir dinleyici için hangi nitelik gerekir?', distractors: [
          { value: 'bonita', reason: 'Bonita, -a ile biten dişil biçimdir. Eril bir dinleyici -o biçimini gerektirir: bonito.', trapType: 'grammar' },
          { value: 'rápido', reason: 'Rápido "hızlı" demektir — görünümle ilgisi olmayan tamamen farklı bir nitelik. Bonito gerekir.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    pl: { meaning: 'Jesteś przystojny', explanation: 'Tak mówi się słuchaczowi rodzaju męskiego o jego wyglądzie wprost, w twarz. Cecha zgadza się z tym, do kogo się mówi — forma na -o.', distractors: [
      { value: 'Es', reason: 'Es dotyczy rzeczy lub trzeciej osoby. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy dotyczy mówiącego. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita to forma żeńska, zakończona na -a. Słuchacz męski wymaga formy na -o: bonito.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido znaczy „szybki” — zupełnie inna cecha, nie o wyglądzie. Potrzebne jest bonito.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Jaki łącznik jest potrzebny przy zwracaniu się do słuchacza?', distractors: [
          { value: 'Es', reason: 'Es dotyczy rzeczy lub trzeciej osoby. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy dotyczy mówiącego. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonito', prompt: 'Jaka cecha jest potrzebna dla słuchacza męskiego?', distractors: [
          { value: 'bonita', reason: 'Bonita to forma żeńska, zakończona na -a. Słuchacz męski wymaga formy na -o: bonito.', trapType: 'grammar' },
          { value: 'rápido', reason: 'Rápido znaczy „szybki” — zupełnie inna cecha, nie o wyglądzie. Potrzebne jest bonito.', trapType: 'semantic_neighbor' },
        ]},
      ]},
  },
  'es-e01-s09-eres-bonita': {
    ru: { meaning: 'Ты красивая', explanation: 'Та же оценка, но собеседник женского рода. Меняется только концовка признака: -o становится -a, связка eres не меняется вовсе.', distractors: [
      { value: 'Es', reason: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy — про себя. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito — форма мужского рода, с -o. Про собеседницу нужна форма на -a: bonita.', trapType: 'grammar' },
      { value: 'única', reason: 'Única означает «единственная» — совсем другой признак, не про внешний вид. Нужно bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Какая связка нужна при обращении к собеседнику?', distractors: [
          { value: 'Es', reason: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy — про себя. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Какой признак нужен для собеседницы?', distractors: [
          { value: 'bonito', reason: 'Bonito — форма мужского рода, с -o. Про собеседницу нужна форма на -a: bonita.', trapType: 'grammar' },
          { value: 'única', reason: 'Única означает «единственная» — совсем другой признак, не про внешний вид. Нужно bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    uk: { meaning: 'Ти красива', explanation: 'Та сама оцінка, але співрозмовник жіночого роду. Змінюється лише закінчення ознаки: -o стає -a, зв’язка eres не змінюється зовсім.', distractors: [
      { value: 'Es', reason: 'Es — про предмет чи третю особу. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy — про себе. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito — форма чоловічого роду, з -o. Про співрозмовницю потрібна форма на -a: bonita.', trapType: 'grammar' },
      { value: 'única', reason: 'Única означає «єдина» — зовсім інша ознака, не про зовнішній вигляд. Потрібно bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Яка зв’язка потрібна при зверненні до співрозмовника?', distractors: [
          { value: 'Es', reason: 'Es — про предмет чи третю особу. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy — про себе. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Яка ознака потрібна для співрозмовниці?', distractors: [
          { value: 'bonito', reason: 'Bonito — форма чоловічого роду, з -o. Про співрозмовницю потрібна форма на -a: bonita.', trapType: 'grammar' },
          { value: 'única', reason: 'Única означає «єдина» — зовсім інша ознака, не про зовнішній вигляд. Потрібно bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    en: { meaning: 'You are pretty (feminine)', explanation: 'The same verdict, but about a feminine listener. Only the ending of the quality changes: -o becomes -a, while the linking word eres does not change at all.', distractors: [
      { value: 'Es', reason: 'Es is about a thing or a third person. Addressing the listener needs only Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy is about the speaker. Addressing the listener needs only Eres.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito is the masculine form, ending in -o. A feminine listener needs the -a form: bonita.', trapType: 'grammar' },
      { value: 'única', reason: 'Única means "unique" — a completely different quality, not about looks. It needs bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Which linking word is needed when addressing the listener?', distractors: [
          { value: 'Es', reason: 'Es is about a thing or a third person. Addressing the listener needs only Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy is about the speaker. Addressing the listener needs only Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Which quality is needed for a feminine listener?', distractors: [
          { value: 'bonito', reason: 'Bonito is the masculine form, ending in -o. A feminine listener needs the -a form: bonita.', trapType: 'grammar' },
          { value: 'única', reason: 'Única means "unique" — a completely different quality, not about looks. It needs bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    'pt-BR': { meaning: 'Você é bonita', explanation: 'O mesmo veredito, mas sobre uma interlocutora feminina. Só a terminação da qualidade muda: -o vira -a, e a ligação eres não muda em nada.', distractors: [
      { value: 'Es', reason: 'Es é sobre uma coisa ou terceira pessoa. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy é sobre quem fala. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito é a forma masculina, terminada em -o. Uma interlocutora feminina precisa da forma em -a: bonita.', trapType: 'grammar' },
      { value: 'única', reason: 'Única significa "única" — uma qualidade completamente diferente, não sobre aparência. Precisa de bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Qual ligação é necessária ao falar com o interlocutor?', distractors: [
          { value: 'Es', reason: 'Es é sobre uma coisa ou terceira pessoa. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy é sobre quem fala. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Qual qualidade é necessária para uma interlocutora feminina?', distractors: [
          { value: 'bonito', reason: 'Bonito é a forma masculina, terminada em -o. Uma interlocutora feminina precisa da forma em -a: bonita.', trapType: 'grammar' },
          { value: 'única', reason: 'Única significa "única" — uma qualidade completamente diferente, não sobre aparência. Precisa de bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    vi: { meaning: 'Bạn xinh đẹp (giống cái)', explanation: 'Cùng một nhận định, nhưng về người nghe giống cái. Chỉ đuôi của đặc điểm thay đổi: -o thành -a, còn từ nối eres không đổi chút nào.', distractors: [
      { value: 'Es', reason: 'Es nói về một vật hay ngôi thứ ba. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy nói về người nói. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito là dạng giống đực, kết thúc bằng -o. Người nghe giống cái cần dạng -a: bonita.', trapType: 'grammar' },
      { value: 'única', reason: 'Única nghĩa là "duy nhất" — một đặc điểm hoàn toàn khác, không phải về ngoại hình. Cần bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Từ nối nào cần khi nói với người nghe?', distractors: [
          { value: 'Es', reason: 'Es nói về một vật hay ngôi thứ ba. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy nói về người nói. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Đặc điểm nào cần cho người nghe giống cái?', distractors: [
          { value: 'bonito', reason: 'Bonito là dạng giống đực, kết thúc bằng -o. Người nghe giống cái cần dạng -a: bonita.', trapType: 'grammar' },
          { value: 'única', reason: 'Única nghĩa là "duy nhất" — một đặc điểm hoàn toàn khác, không phải về ngoại hình. Cần bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    id: { meaning: 'Kamu cantik', explanation: 'Penilaian yang sama, tetapi tentang pendengar feminin. Hanya akhiran sifatnya yang berubah: -o menjadi -a, sedangkan kata penghubung eres sama sekali tidak berubah.', distractors: [
      { value: 'Es', reason: 'Es tentang benda atau orang ketiga. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy tentang penutur. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito adalah bentuk maskulin, berakhiran -o. Pendengar feminin memerlukan bentuk -a: bonita.', trapType: 'grammar' },
      { value: 'única', reason: 'Única berarti "unik" — sifat yang sama sekali berbeda, bukan tentang penampilan. Perlu bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Kata penghubung mana yang diperlukan saat berbicara dengan pendengar?', distractors: [
          { value: 'Es', reason: 'Es tentang benda atau orang ketiga. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy tentang penutur. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Sifat mana yang diperlukan untuk pendengar feminin?', distractors: [
          { value: 'bonito', reason: 'Bonito adalah bentuk maskulin, berakhiran -o. Pendengar feminin memerlukan bentuk -a: bonita.', trapType: 'grammar' },
          { value: 'única', reason: 'Única berarti "unik" — sifat yang sama sekali berbeda, bukan tentang penampilan. Perlu bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    tr: { meaning: 'Sen güzelsin', explanation: 'Aynı yargı, ama dişil bir dinleyici hakkında. Sadece niteliğin sonu değişir: -o, -a olur; eres bağlacı ise hiç değişmez.', distractors: [
      { value: 'Es', reason: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy konuşan hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito, -o ile biten eril biçimdir. Dişil bir dinleyici -a biçimini gerektirir: bonita.', trapType: 'grammar' },
      { value: 'única', reason: 'Única "eşsiz" demektir — görünümle ilgisi olmayan tamamen farklı bir nitelik. Bonita gerekir.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Dinleyiciyle konuşurken hangi bağlayıcı gerekir?', distractors: [
          { value: 'Es', reason: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy konuşan hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Dişil bir dinleyici için hangi nitelik gerekir?', distractors: [
          { value: 'bonito', reason: 'Bonito, -o ile biten eril biçimdir. Dişil bir dinleyici -a biçimini gerektirir: bonita.', trapType: 'grammar' },
          { value: 'única', reason: 'Única "eşsiz" demektir — görünümle ilgisi olmayan tamamen farklı bir nitelik. Bonita gerekir.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    pl: { meaning: 'Jesteś ładna', explanation: 'Ten sam osąd, ale o słuchaczce rodzaju żeńskiego. Zmienia się tylko końcówka cechy: -o staje się -a, a łącznik eres wcale się nie zmienia.', distractors: [
      { value: 'Es', reason: 'Es dotyczy rzeczy lub trzeciej osoby. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy dotyczy mówiącego. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
      { value: 'bonito', reason: 'Bonito to forma męska, zakończona na -o. Słuchaczka żeńska wymaga formy na -a: bonita.', trapType: 'grammar' },
      { value: 'única', reason: 'Única znaczy „jedyna” — zupełnie inna cecha, nie o wyglądzie. Potrzebne jest bonita.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Jaki łącznik jest potrzebny przy zwracaniu się do słuchacza?', distractors: [
          { value: 'Es', reason: 'Es dotyczy rzeczy lub trzeciej osoby. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy dotyczy mówiącego. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
        ]},
        { correct: 'bonita', prompt: 'Jaka cecha jest potrzebna dla słuchaczki?', distractors: [
          { value: 'bonito', reason: 'Bonito to forma męska, zakończona na -o. Słuchaczka żeńska wymaga formy na -a: bonita.', trapType: 'grammar' },
          { value: 'única', reason: 'Única znaczy „jedyna” — zupełnie inna cecha, nie o wyglądzie. Potrzebne jest bonita.', trapType: 'semantic_neighbor' },
        ]},
      ]},
  },
  'es-e01-s09-eres-rapido': {
    ru: { meaning: 'Ты быстрый', explanation: 'Так говорят собеседнику мужского рода про его темп — например, в спорте или в работе. Признак согласуется с тем, к кому обращаются, — форма на -o.', distractors: [
      { value: 'Es', reason: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy — про себя. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida — форма женского рода, с -a. Про собеседника мужского рода нужна форма на -o: rápido.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero означает «истинный» — совсем другой признак, не про скорость. Нужно rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Какая связка нужна при обращении к собеседнику?', distractors: [
          { value: 'Es', reason: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy — про себя. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Какой признак нужен для собеседника мужского рода?', distractors: [
          { value: 'rápida', reason: 'Rápida — форма женского рода, с -a. Про собеседника мужского рода нужна форма на -o: rápido.', trapType: 'grammar' },
          { value: 'verdadero', reason: 'Verdadero означает «истинный» — совсем другой признак, не про скорость. Нужно rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    uk: { meaning: 'Ти швидкий', explanation: 'Так кажуть співрозмовнику чоловічого роду про його темп — наприклад, у спорті чи в роботі. Ознака узгоджується з тим, до кого звертаються, — форма на -o.', distractors: [
      { value: 'Es', reason: 'Es — про предмет чи третю особу. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy — про себе. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida — форма жіночого роду, з -a. Про співрозмовника чоловічого роду потрібна форма на -o: rápido.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero означає «істинний» — зовсім інша ознака, не про швидкість. Потрібно rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Яка зв’язка потрібна при зверненні до співрозмовника?', distractors: [
          { value: 'Es', reason: 'Es — про предмет чи третю особу. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy — про себе. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Яка ознака потрібна для співрозмовника чоловічого роду?', distractors: [
          { value: 'rápida', reason: 'Rápida — форма жіночого роду, з -a. Про співрозмовника чоловічого роду потрібна форма на -o: rápido.', trapType: 'grammar' },
          { value: 'verdadero', reason: 'Verdadero означає «істинний» — зовсім інша ознака, не про швидкість. Потрібно rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    en: { meaning: 'You are fast', explanation: 'This is how you tell a masculine listener about their pace — in sports or at work, for example. The quality agrees with who is being addressed — the -o form.', distractors: [
      { value: 'Es', reason: 'Es is about a thing or a third person. Addressing the listener needs only Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy is about the speaker. Addressing the listener needs only Eres.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida is the feminine form, ending in -a. A masculine listener needs the -o form: rápido.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero means "true" — a completely different quality, not about speed. It needs rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Which linking word is needed when addressing the listener?', distractors: [
          { value: 'Es', reason: 'Es is about a thing or a third person. Addressing the listener needs only Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy is about the speaker. Addressing the listener needs only Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Which quality is needed for a masculine listener?', distractors: [
          { value: 'rápida', reason: 'Rápida is the feminine form, ending in -a. A masculine listener needs the -o form: rápido.', trapType: 'grammar' },
          { value: 'verdadero', reason: 'Verdadero means "true" — a completely different quality, not about speed. It needs rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    'pt-BR': { meaning: 'Você é rápido', explanation: 'É assim que se fala a um interlocutor masculino sobre seu ritmo — no esporte ou no trabalho, por exemplo. A qualidade concorda com quem é o interlocutor — a forma em -o.', distractors: [
      { value: 'Es', reason: 'Es é sobre uma coisa ou terceira pessoa. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy é sobre quem fala. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida é a forma feminina, terminada em -a. Um interlocutor masculino precisa da forma em -o: rápido.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero significa "verdadeiro" — uma qualidade completamente diferente, não sobre velocidade. Precisa de rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Qual ligação é necessária ao falar com o interlocutor?', distractors: [
          { value: 'Es', reason: 'Es é sobre uma coisa ou terceira pessoa. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy é sobre quem fala. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Qual qualidade é necessária para um interlocutor masculino?', distractors: [
          { value: 'rápida', reason: 'Rápida é a forma feminina, terminada em -a. Um interlocutor masculino precisa da forma em -o: rápido.', trapType: 'grammar' },
          { value: 'verdadero', reason: 'Verdadero significa "verdadeiro" — uma qualidade completamente diferente, não sobre velocidade. Precisa de rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    vi: { meaning: 'Bạn nhanh nhẹn', explanation: 'Đây là cách nói với người nghe giống đực về tốc độ của họ — ví dụ trong thể thao hay công việc. Đặc điểm hòa hợp với người được nói tới — dạng -o.', distractors: [
      { value: 'Es', reason: 'Es nói về một vật hay ngôi thứ ba. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy nói về người nói. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida là dạng giống cái, kết thúc bằng -a. Người nghe giống đực cần dạng -o: rápido.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero nghĩa là "đúng" — một đặc điểm hoàn toàn khác, không phải về tốc độ. Cần rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Từ nối nào cần khi nói với người nghe?', distractors: [
          { value: 'Es', reason: 'Es nói về một vật hay ngôi thứ ba. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy nói về người nói. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Đặc điểm nào cần cho người nghe giống đực?', distractors: [
          { value: 'rápida', reason: 'Rápida là dạng giống cái, kết thúc bằng -a. Người nghe giống đực cần dạng -o: rápido.', trapType: 'grammar' },
          { value: 'verdadero', reason: 'Verdadero nghĩa là "đúng" — một đặc điểm hoàn toàn khác, không phải về tốc độ. Cần rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    id: { meaning: 'Kamu cepat', explanation: 'Beginilah cara membicarakan kecepatan pendengar maskulin — dalam olahraga atau pekerjaan, misalnya. Sifatnya sesuai dengan siapa yang diajak bicara — bentuk -o.', distractors: [
      { value: 'Es', reason: 'Es tentang benda atau orang ketiga. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy tentang penutur. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida adalah bentuk feminin, berakhiran -a. Pendengar maskulin memerlukan bentuk -o: rápido.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero berarti "benar" — sifat yang sama sekali berbeda, bukan tentang kecepatan. Perlu rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Kata penghubung mana yang diperlukan saat berbicara dengan pendengar?', distractors: [
          { value: 'Es', reason: 'Es tentang benda atau orang ketiga. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy tentang penutur. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Sifat mana yang diperlukan untuk pendengar maskulin?', distractors: [
          { value: 'rápida', reason: 'Rápida adalah bentuk feminin, berakhiran -a. Pendengar maskulin memerlukan bentuk -o: rápido.', trapType: 'grammar' },
          { value: 'verdadero', reason: 'Verdadero berarti "benar" — sifat yang sama sekali berbeda, bukan tentang kecepatan. Perlu rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    tr: { meaning: 'Sen hızlısın', explanation: 'Eril bir dinleyiciye temposu hakkında böyle söylenir — örneğin sporda veya işte. Nitelik, kiminle konuşulduğuyla uyumludur — -o biçimi.', distractors: [
      { value: 'Es', reason: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy konuşan hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida, -a ile biten dişil biçimdir. Eril bir dinleyici -o biçimini gerektirir: rápido.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero "doğru" demektir — hızla ilgisi olmayan tamamen farklı bir nitelik. Rápido gerekir.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Dinleyiciyle konuşurken hangi bağlayıcı gerekir?', distractors: [
          { value: 'Es', reason: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy konuşan hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Eril bir dinleyici için hangi nitelik gerekir?', distractors: [
          { value: 'rápida', reason: 'Rápida, -a ile biten dişil biçimdir. Eril bir dinleyici -o biçimini gerektirir: rápido.', trapType: 'grammar' },
          { value: 'verdadero', reason: 'Verdadero "doğru" demektir — hızla ilgisi olmayan tamamen farklı bir nitelik. Rápido gerekir.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    pl: { meaning: 'Jesteś szybki', explanation: 'Tak mówi się słuchaczowi rodzaju męskiego o jego tempie — na przykład w sporcie lub w pracy. Cecha zgadza się z tym, do kogo się mówi — forma na -o.', distractors: [
      { value: 'Es', reason: 'Es dotyczy rzeczy lub trzeciej osoby. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy dotyczy mówiącego. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
      { value: 'rápida', reason: 'Rápida to forma żeńska, zakończona na -a. Słuchacz męski wymaga formy na -o: rápido.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero znaczy „prawdziwy” — zupełnie inna cecha, nie o szybkości. Potrzebne jest rápido.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Jaki łącznik jest potrzebny przy zwracaniu się do słuchacza?', distractors: [
          { value: 'Es', reason: 'Es dotyczy rzeczy lub trzeciej osoby. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy dotyczy mówiącego. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápido', prompt: 'Jaka cecha jest potrzebna dla słuchacza męskiego?', distractors: [
          { value: 'rápida', reason: 'Rápida to forma żeńska, zakończona na -a. Słuchacz męski wymaga formy na -o: rápido.', trapType: 'grammar' },
          { value: 'verdadero', reason: 'Verdadero znaczy „prawdziwy” — zupełnie inna cecha, nie o szybkości. Potrzebne jest rápido.', trapType: 'semantic_neighbor' },
        ]},
      ]},
  },
  'es-e01-s09-eres-rapida': {
    ru: { meaning: 'Ты быстрая', explanation: 'Та же оценка темпа, но собеседник женского рода. Меняется только концовка признака: -o становится -a.', distractors: [
      { value: 'Es', reason: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy — про себя. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido — форма мужского рода, с -o. Про собеседницу нужна форма на -a: rápida.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera означает «истинная» — совсем другой признак, не про скорость. Нужно rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Какая связка нужна при обращении к собеседнику?', distractors: [
          { value: 'Es', reason: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy — про себя. Обращение к собеседнику — только Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Какой признак нужен для собеседницы?', distractors: [
          { value: 'rápido', reason: 'Rápido — форма мужского рода, с -o. Про собеседницу нужна форма на -a: rápida.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera означает «истинная» — совсем другой признак, не про скорость. Нужно rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    uk: { meaning: 'Ти швидка', explanation: 'Та сама оцінка темпу, але співрозмовниця жіночого роду. Змінюється лише закінчення ознаки: -o стає -a.', distractors: [
      { value: 'Es', reason: 'Es — про предмет чи третю особу. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy — про себе. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido — форма чоловічого роду, з -o. Про співрозмовницю потрібна форма на -a: rápida.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera означає «істинна» — зовсім інша ознака, не про швидкість. Потрібно rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Яка зв’язка потрібна при зверненні до співрозмовника?', distractors: [
          { value: 'Es', reason: 'Es — про предмет чи третю особу. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy — про себе. Звернення до співрозмовника — тільки Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Яка ознака потрібна для співрозмовниці?', distractors: [
          { value: 'rápido', reason: 'Rápido — форма чоловічого роду, з -o. Про співрозмовницю потрібна форма на -a: rápida.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera означає «істинна» — зовсім інша ознака, не про швидкість. Потрібно rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    en: { meaning: 'You are fast (feminine)', explanation: 'The same pace verdict, but about a feminine listener. Only the ending of the quality changes: -o becomes -a.', distractors: [
      { value: 'Es', reason: 'Es is about a thing or a third person. Addressing the listener needs only Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy is about the speaker. Addressing the listener needs only Eres.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido is the masculine form, ending in -o. A feminine listener needs the -a form: rápida.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera means "true" — a completely different quality, not about speed. It needs rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Which linking word is needed when addressing the listener?', distractors: [
          { value: 'Es', reason: 'Es is about a thing or a third person. Addressing the listener needs only Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy is about the speaker. Addressing the listener needs only Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Which quality is needed for a feminine listener?', distractors: [
          { value: 'rápido', reason: 'Rápido is the masculine form, ending in -o. A feminine listener needs the -a form: rápida.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera means "true" — a completely different quality, not about speed. It needs rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    'pt-BR': { meaning: 'Você é rápida', explanation: 'O mesmo veredito de ritmo, mas sobre uma interlocutora feminina. Só a terminação da qualidade muda: -o vira -a.', distractors: [
      { value: 'Es', reason: 'Es é sobre uma coisa ou terceira pessoa. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy é sobre quem fala. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido é a forma masculina, terminada em -o. Uma interlocutora feminina precisa da forma em -a: rápida.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera significa "verdadeira" — uma qualidade completamente diferente, não sobre velocidade. Precisa de rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Qual ligação é necessária ao falar com o interlocutor?', distractors: [
          { value: 'Es', reason: 'Es é sobre uma coisa ou terceira pessoa. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy é sobre quem fala. Falar com o interlocutor precisa só de Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Qual qualidade é necessária para uma interlocutora feminina?', distractors: [
          { value: 'rápido', reason: 'Rápido é a forma masculina, terminada em -o. Uma interlocutora feminina precisa da forma em -a: rápida.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera significa "verdadeira" — uma qualidade completamente diferente, não sobre velocidade. Precisa de rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    vi: { meaning: 'Bạn nhanh nhẹn (giống cái)', explanation: 'Cùng một nhận định về tốc độ, nhưng về người nghe giống cái. Chỉ đuôi của đặc điểm thay đổi: -o thành -a.', distractors: [
      { value: 'Es', reason: 'Es nói về một vật hay ngôi thứ ba. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy nói về người nói. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido là dạng giống đực, kết thúc bằng -o. Người nghe giống cái cần dạng -a: rápida.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera nghĩa là "đúng" — một đặc điểm hoàn toàn khác, không phải về tốc độ. Cần rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Từ nối nào cần khi nói với người nghe?', distractors: [
          { value: 'Es', reason: 'Es nói về một vật hay ngôi thứ ba. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy nói về người nói. Nói với người nghe chỉ cần Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Đặc điểm nào cần cho người nghe giống cái?', distractors: [
          { value: 'rápido', reason: 'Rápido là dạng giống đực, kết thúc bằng -o. Người nghe giống cái cần dạng -a: rápida.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera nghĩa là "đúng" — một đặc điểm hoàn toàn khác, không phải về tốc độ. Cần rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    id: { meaning: 'Kamu cepat (feminin)', explanation: 'Penilaian kecepatan yang sama, tetapi tentang pendengar feminin. Hanya akhiran sifatnya yang berubah: -o menjadi -a.', distractors: [
      { value: 'Es', reason: 'Es tentang benda atau orang ketiga. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy tentang penutur. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido adalah bentuk maskulin, berakhiran -o. Pendengar feminin memerlukan bentuk -a: rápida.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera berarti "benar" — sifat yang sama sekali berbeda, bukan tentang kecepatan. Perlu rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Kata penghubung mana yang diperlukan saat berbicara dengan pendengar?', distractors: [
          { value: 'Es', reason: 'Es tentang benda atau orang ketiga. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy tentang penutur. Berbicara dengan pendengar hanya perlu Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Sifat mana yang diperlukan untuk pendengar feminin?', distractors: [
          { value: 'rápido', reason: 'Rápido adalah bentuk maskulin, berakhiran -o. Pendengar feminin memerlukan bentuk -a: rápida.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera berarti "benar" — sifat yang sama sekali berbeda, bukan tentang kecepatan. Perlu rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    tr: { meaning: 'Sen hızlısın (dişil)', explanation: 'Aynı tempo yargısı, ama dişil bir dinleyici hakkında. Sadece niteliğin sonu değişir: -o, -a olur.', distractors: [
      { value: 'Es', reason: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy konuşan hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido, -o ile biten eril biçimdir. Dişil bir dinleyici -a biçimini gerektirir: rápida.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera "doğru" demektir — hızla ilgisi olmayan tamamen farklı bir nitelik. Rápida gerekir.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Dinleyiciyle konuşurken hangi bağlayıcı gerekir?', distractors: [
          { value: 'Es', reason: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy konuşan hakkındadır. Dinleyiciyle konuşmak yalnızca Eres gerektirir.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Dişil bir dinleyici için hangi nitelik gerekir?', distractors: [
          { value: 'rápido', reason: 'Rápido, -o ile biten eril biçimdir. Dişil bir dinleyici -a biçimini gerektirir: rápida.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera "doğru" demektir — hızla ilgisi olmayan tamamen farklı bir nitelik. Rápida gerekir.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    pl: { meaning: 'Jesteś szybka', explanation: 'Ten sam osąd tempa, ale o słuchaczce rodzaju żeńskiego. Zmienia się tylko końcówka cechy: -o staje się -a.', distractors: [
      { value: 'Es', reason: 'Es dotyczy rzeczy lub trzeciej osoby. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
      { value: 'Soy', reason: 'Soy dotyczy mówiącego. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
      { value: 'rápido', reason: 'Rápido to forma męska, zakończona na -o. Słuchaczka żeńska wymaga formy na -a: rápida.', trapType: 'grammar' },
      { value: 'verdadera', reason: 'Verdadera znaczy „prawdziwa” — zupełnie inna cecha, nie o szybkości. Potrzebne jest rápida.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'Eres', prompt: 'Jaki łącznik jest potrzebny przy zwracaniu się do słuchacza?', distractors: [
          { value: 'Es', reason: 'Es dotyczy rzeczy lub trzeciej osoby. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
          { value: 'Soy', reason: 'Soy dotyczy mówiącego. Zwracanie się do słuchacza wymaga tylko Eres.', trapType: 'grammar' },
        ]},
        { correct: 'rápida', prompt: 'Jaka cecha jest potrzebna dla słuchaczki?', distractors: [
          { value: 'rápido', reason: 'Rápido to forma męska, zakończona na -o. Słuchaczka żeńska wymaga formy na -a: rápida.', trapType: 'grammar' },
          { value: 'verdadera', reason: 'Verdadera znaczy „prawdziwa” — zupełnie inna cecha, nie o szybkości. Potrzebne jest rápida.', trapType: 'semantic_neighbor' },
        ]},
      ]},
  },
});
