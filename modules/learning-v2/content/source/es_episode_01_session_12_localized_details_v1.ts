import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-25): ручной перевод и разбор для
// двух фраз сессии 12 на восьми объяснительных локалях (без 'es').
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;

export const ES_SESSION_12_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, EpisodeSourcePhraseLocalizedDetails>>>
> = Object.freeze({
  'es-e01-s12-eres-segura': {
    ru: { meaning: 'Ты уверенная?', explanation: 'Прямой вопрос собеседнице о её уверенности в себе. Eres — потому что обращаются напрямую, segura — потому что речь о женщине.', distractors: [
      { value: 'Es', reason: 'Es — про предмет или третье лицо. Вопрос собеседнице напрямую — только Eres.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy — про себя. Вопрос собеседнице — только Eres.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro — форма мужского рода. О собеседнице женского рода нужна форма segura.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita означает «красивая» — совсем другой признак, не про уверенность. Нужно segura.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Eres', prompt: 'Какая связка нужна при вопросе собеседнице напрямую?', distractors: [
        { value: 'Es', reason: 'Es — про предмет или третье лицо. Вопрос собеседнице напрямую — только Eres.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy — про себя. Вопрос собеседнице — только Eres.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Какой признак нужен для собеседницы?', distractors: [
        { value: 'seguro', reason: 'Seguro — форма мужского рода. О собеседнице женского рода нужна форма segura.', trapType: 'grammar' },
        { value: 'bonita', reason: 'Bonita означает «красивая» — совсем другой признак, не про уверенность. Нужно segura.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    uk: { meaning: 'Ти впевнена?', explanation: 'Пряме питання співрозмовниці про її впевненість у собі. Eres — бо звертаються напряму, segura — бо йдеться про жінку.', distractors: [
      { value: 'Es', reason: 'Es — про предмет чи третю особу. Питання співрозмовниці напряму — тільки Eres.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy — про себе. Питання співрозмовниці — тільки Eres.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro — форма чоловічого роду. Про співрозмовницю жіночого роду потрібна форма segura.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita означає «красива» — зовсім інша ознака, не про впевненість. Потрібно segura.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Eres', prompt: 'Яка зв’язка потрібна при питанні співрозмовниці напряму?', distractors: [
        { value: 'Es', reason: 'Es — про предмет чи третю особу. Питання співрозмовниці напряму — тільки Eres.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy — про себе. Питання співрозмовниці — тільки Eres.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Яка ознака потрібна для співрозмовниці?', distractors: [
        { value: 'seguro', reason: 'Seguro — форма чоловічого роду. Про співрозмовницю жіночого роду потрібна форма segura.', trapType: 'grammar' },
        { value: 'bonita', reason: 'Bonita означає «красива» — зовсім інша ознака, не про впевненість. Потрібно segura.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    en: { meaning: 'Are you confident?', explanation: 'A direct question to the listener about her self-confidence. Eres because it addresses her directly, segura because it is about a woman.', distractors: [
      { value: 'Es', reason: 'Es is about a thing or a third person. A question addressed directly to the listener needs only Eres.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy is about the speaker. A question to the listener needs only Eres.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro is the masculine form. A feminine listener needs the form segura.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita means "pretty" — a completely different quality, not confidence. Segura is needed.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Eres', prompt: 'Which linking word fits addressing the listener directly?', distractors: [
        { value: 'Es', reason: 'Es is about a thing or a third person. A question addressed directly to the listener needs only Eres.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy is about the speaker. A question to the listener needs only Eres.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Which quality fits the listener?', distractors: [
        { value: 'seguro', reason: 'Seguro is the masculine form. A feminine listener needs the form segura.', trapType: 'grammar' },
        { value: 'bonita', reason: 'Bonita means "pretty" — a completely different quality, not confidence. Segura is needed.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    'pt-BR': { meaning: 'Você é confiante?', explanation: 'Uma pergunta direta à interlocutora sobre sua autoconfiança. Eres porque fala diretamente com ela, segura porque é sobre uma mulher.', distractors: [
      { value: 'Es', reason: 'Es é sobre uma coisa ou terceira pessoa. Uma pergunta direta à interlocutora precisa só de Eres.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy é sobre quem fala. Uma pergunta à interlocutora precisa só de Eres.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro é a forma masculina. Uma interlocutora feminina precisa da forma segura.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita significa "bonita" — uma qualidade completamente diferente, não confiança. Precisa de segura.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Eres', prompt: 'Qual ligação cabe ao falar diretamente com a interlocutora?', distractors: [
        { value: 'Es', reason: 'Es é sobre uma coisa ou terceira pessoa. Uma pergunta direta à interlocutora precisa só de Eres.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy é sobre quem fala. Uma pergunta à interlocutora precisa só de Eres.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Qual qualidade cabe à interlocutora?', distractors: [
        { value: 'seguro', reason: 'Seguro é a forma masculina. Uma interlocutora feminina precisa da forma segura.', trapType: 'grammar' },
        { value: 'bonita', reason: 'Bonita significa "bonita" — uma qualidade completamente diferente, não confiança. Precisa de segura.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    vi: { meaning: 'Bạn có tự tin không?', explanation: 'Câu hỏi trực tiếp với người nghe về sự tự tin của cô ấy. Eres vì nói trực tiếp với cô ấy, segura vì nói về một phụ nữ.', distractors: [
      { value: 'Es', reason: 'Es nói về một vật hay ngôi thứ ba. Câu hỏi trực tiếp với người nghe chỉ cần Eres.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy nói về người nói. Câu hỏi với người nghe chỉ cần Eres.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro là dạng giống đực. Người nghe giống cái cần dạng segura.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita nghĩa là "xinh đẹp" — đặc điểm hoàn toàn khác, không phải sự tự tin. Cần segura.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Eres', prompt: 'Từ nối nào phù hợp khi nói trực tiếp với người nghe?', distractors: [
        { value: 'Es', reason: 'Es nói về một vật hay ngôi thứ ba. Câu hỏi trực tiếp với người nghe chỉ cần Eres.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy nói về người nói. Câu hỏi với người nghe chỉ cần Eres.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Đặc điểm nào phù hợp cho người nghe?', distractors: [
        { value: 'seguro', reason: 'Seguro là dạng giống đực. Người nghe giống cái cần dạng segura.', trapType: 'grammar' },
        { value: 'bonita', reason: 'Bonita nghĩa là "xinh đẹp" — đặc điểm hoàn toàn khác, không phải sự tự tin. Cần segura.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    id: { meaning: 'Apakah kamu percaya diri?', explanation: 'Pertanyaan langsung kepada pendengar tentang kepercayaan dirinya. Eres karena berbicara langsung dengannya, segura karena tentang seorang wanita.', distractors: [
      { value: 'Es', reason: 'Es tentang benda atau orang ketiga. Pertanyaan langsung kepada pendengar hanya perlu Eres.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy tentang penutur. Pertanyaan kepada pendengar hanya perlu Eres.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro adalah bentuk maskulin. Pendengar feminin memerlukan bentuk segura.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita berarti "cantik" — sifat yang sama sekali berbeda, bukan kepercayaan diri. Perlu segura.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Eres', prompt: 'Kata penghubung mana yang cocok saat berbicara langsung dengan pendengar?', distractors: [
        { value: 'Es', reason: 'Es tentang benda atau orang ketiga. Pertanyaan langsung kepada pendengar hanya perlu Eres.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy tentang penutur. Pertanyaan kepada pendengar hanya perlu Eres.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Sifat mana yang cocok untuk pendengar?', distractors: [
        { value: 'seguro', reason: 'Seguro adalah bentuk maskulin. Pendengar feminin memerlukan bentuk segura.', trapType: 'grammar' },
        { value: 'bonita', reason: 'Bonita berarti "cantik" — sifat yang sama sekali berbeda, bukan kepercayaan diri. Perlu segura.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    tr: { meaning: 'Sen kendine güveniyor musun?', explanation: 'Dinleyiciye kendine güveni hakkında doğrudan bir soru. Eres çünkü doğrudan onunla konuşuyor, segura çünkü bir kadın hakkında.', distractors: [
      { value: 'Es', reason: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciye doğrudan soru yalnızca Eres gerektirir.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy konuşan hakkındadır. Dinleyiciye soru yalnızca Eres gerektirir.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro eril biçimdir. Dişil bir dinleyici segura biçimini gerektirir.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita "güzel" demektir — güvenle ilgisi olmayan tamamen farklı bir nitelik. Segura gerekir.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Eres', prompt: 'Dinleyiciyle doğrudan konuşurken hangi bağlaç uyar?', distractors: [
        { value: 'Es', reason: 'Es bir şey ya da üçüncü kişi hakkındadır. Dinleyiciye doğrudan soru yalnızca Eres gerektirir.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy konuşan hakkındadır. Dinleyiciye soru yalnızca Eres gerektirir.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Dinleyici için hangi nitelik uyar?', distractors: [
        { value: 'seguro', reason: 'Seguro eril biçimdir. Dişil bir dinleyici segura biçimini gerektirir.', trapType: 'grammar' },
        { value: 'bonita', reason: 'Bonita "güzel" demektir — güvenle ilgisi olmayan tamamen farklı bir nitelik. Segura gerekir.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    pl: { meaning: 'Jesteś pewna siebie?', explanation: 'Bezpośrednie pytanie do słuchaczki o jej pewność siebie. Eres, bo mówi się do niej bezpośrednio, segura, bo mowa o kobiecie.', distractors: [
      { value: 'Es', reason: 'Es dotyczy rzeczy lub trzeciej osoby. Pytanie skierowane bezpośrednio do słuchaczki wymaga tylko Eres.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy dotyczy mówiącego. Pytanie do słuchaczki wymaga tylko Eres.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro to forma męska. Słuchaczka wymaga formy segura.', trapType: 'grammar' },
      { value: 'bonita', reason: 'Bonita znaczy „ładna” — zupełnie inna cecha, nie pewność siebie. Potrzebne jest segura.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Eres', prompt: 'Jaki łącznik pasuje przy bezpośrednim zwracaniu się do słuchaczki?', distractors: [
        { value: 'Es', reason: 'Es dotyczy rzeczy lub trzeciej osoby. Pytanie bezpośrednio do słuchaczki wymaga tylko Eres.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy dotyczy mówiącego. Pytanie do słuchaczki wymaga tylko Eres.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Jaka cecha pasuje do słuchaczki?', distractors: [
        { value: 'seguro', reason: 'Seguro to forma męska. Słuchaczka wymaga formy segura.', trapType: 'grammar' },
        { value: 'bonita', reason: 'Bonita znaczy „ładna” — zupełnie inna cecha, nie pewność siebie. Potrzebne jest segura.', trapType: 'semantic_neighbor' },
      ]},
    ]},
  },
  'es-e01-s12-es-segura': {
    ru: { meaning: 'Она уверенная?', explanation: 'Вопрос о третьем лице женского рода — например, спрашивают об общей знакомой. Es — потому что речь не с ней напрямую, а о ней.', distractors: [
      { value: 'Eres', reason: 'Eres обращается к собеседнице напрямую. Вопрос о третьем лице — только Es.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy — про себя. Вопрос о третьем лице — только Es.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro — форма мужского рода. О женщине нужна форма segura.', trapType: 'grammar' },
      { value: 'única', reason: 'Única означает «единственная» — совсем другой признак, не про уверенность. Нужно segura.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Es', prompt: 'Какая связка нужна для вопроса о третьем лице?', distractors: [
        { value: 'Eres', reason: 'Eres обращается к собеседнице напрямую. Вопрос о третьем лице — только Es.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy — про себя. Вопрос о третьем лице — только Es.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Какой признак нужен для женщины?', distractors: [
        { value: 'seguro', reason: 'Seguro — форма мужского рода. О женщине нужна форма segura.', trapType: 'grammar' },
        { value: 'única', reason: 'Única означает «единственная» — совсем другой признак, не про уверенность. Нужно segura.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    uk: { meaning: 'Вона впевнена?', explanation: 'Питання про третю особу жіночого роду — наприклад, запитують про спільну знайому. Es — бо йдеться не з нею напряму, а про неї.', distractors: [
      { value: 'Eres', reason: 'Eres звертається до співрозмовниці напряму. Питання про третю особу — тільки Es.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy — про себе. Питання про третю особу — тільки Es.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro — форма чоловічого роду. Про жінку потрібна форма segura.', trapType: 'grammar' },
      { value: 'única', reason: 'Única означає «єдина» — зовсім інша ознака, не про впевненість. Потрібно segura.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Es', prompt: 'Яка зв’язка потрібна для питання про третю особу?', distractors: [
        { value: 'Eres', reason: 'Eres звертається до співрозмовниці напряму. Питання про третю особу — тільки Es.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy — про себе. Питання про третю особу — тільки Es.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Яка ознака потрібна для жінки?', distractors: [
        { value: 'seguro', reason: 'Seguro — форма чоловічого роду. Про жінку потрібна форма segura.', trapType: 'grammar' },
        { value: 'única', reason: 'Única означає «єдина» — зовсім інша ознака, не про впевненість. Потрібно segura.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    en: { meaning: 'Is she confident?', explanation: 'A question about a feminine third person — asking about a mutual acquaintance, for example. Es because it is not addressed to her directly, but about her.', distractors: [
      { value: 'Eres', reason: 'Eres addresses the listener directly. A question about a third person needs only Es.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy is about the speaker. A question about a third person needs only Es.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro is the masculine form. About a woman, the form segura is needed.', trapType: 'grammar' },
      { value: 'única', reason: 'Única means "unique" — a completely different quality, not confidence. Segura is needed.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Es', prompt: 'Which linking word fits a question about a third person?', distractors: [
        { value: 'Eres', reason: 'Eres addresses the listener directly. A question about a third person needs only Es.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy is about the speaker. A question about a third person needs only Es.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Which quality fits a woman?', distractors: [
        { value: 'seguro', reason: 'Seguro is the masculine form. About a woman, the form segura is needed.', trapType: 'grammar' },
        { value: 'única', reason: 'Única means "unique" — a completely different quality, not confidence. Segura is needed.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    'pt-BR': { meaning: 'Ela é confiante?', explanation: 'Uma pergunta sobre uma terceira pessoa feminina — perguntando sobre uma conhecida em comum, por exemplo. Es porque não fala com ela diretamente, mas sobre ela.', distractors: [
      { value: 'Eres', reason: 'Eres fala com o interlocutor diretamente. Uma pergunta sobre uma terceira pessoa precisa só de Es.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy é sobre quem fala. Uma pergunta sobre uma terceira pessoa precisa só de Es.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro é a forma masculina. Sobre uma mulher, precisa da forma segura.', trapType: 'grammar' },
      { value: 'única', reason: 'Única significa "única" — uma qualidade completamente diferente, não confiança. Precisa de segura.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Es', prompt: 'Qual ligação cabe a uma pergunta sobre uma terceira pessoa?', distractors: [
        { value: 'Eres', reason: 'Eres fala com o interlocutor diretamente. Uma pergunta sobre uma terceira pessoa precisa só de Es.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy é sobre quem fala. Uma pergunta sobre uma terceira pessoa precisa só de Es.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Qual qualidade cabe a uma mulher?', distractors: [
        { value: 'seguro', reason: 'Seguro é a forma masculina. Sobre uma mulher, precisa da forma segura.', trapType: 'grammar' },
        { value: 'única', reason: 'Única significa "única" — uma qualidade completamente diferente, não confiança. Precisa de segura.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    vi: { meaning: 'Cô ấy có tự tin không?', explanation: 'Câu hỏi về ngôi thứ ba giống cái — hỏi về một người quen chung chẳng hạn. Es vì không nói trực tiếp với cô ấy, mà nói về cô ấy.', distractors: [
      { value: 'Eres', reason: 'Eres nói trực tiếp với người nghe. Câu hỏi về ngôi thứ ba chỉ cần Es.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy nói về người nói. Câu hỏi về ngôi thứ ba chỉ cần Es.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro là dạng giống đực. Về một phụ nữ cần dạng segura.', trapType: 'grammar' },
      { value: 'única', reason: 'Única nghĩa là "duy nhất" — đặc điểm hoàn toàn khác, không phải sự tự tin. Cần segura.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Es', prompt: 'Từ nối nào phù hợp cho câu hỏi về ngôi thứ ba?', distractors: [
        { value: 'Eres', reason: 'Eres nói trực tiếp với người nghe. Câu hỏi về ngôi thứ ba chỉ cần Es.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy nói về người nói. Câu hỏi về ngôi thứ ba chỉ cần Es.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Đặc điểm nào phù hợp cho một phụ nữ?', distractors: [
        { value: 'seguro', reason: 'Seguro là dạng giống đực. Về một phụ nữ cần dạng segura.', trapType: 'grammar' },
        { value: 'única', reason: 'Única nghĩa là "duy nhất" — đặc điểm hoàn toàn khác, không phải sự tự tin. Cần segura.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    id: { meaning: 'Apakah dia percaya diri?', explanation: 'Pertanyaan tentang orang ketiga feminin — menanyakan tentang kenalan bersama, misalnya. Es karena tidak berbicara langsung dengannya, tetapi tentang dia.', distractors: [
      { value: 'Eres', reason: 'Eres berbicara langsung dengan pendengar. Pertanyaan tentang orang ketiga hanya perlu Es.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy tentang penutur. Pertanyaan tentang orang ketiga hanya perlu Es.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro adalah bentuk maskulin. Tentang seorang wanita, perlu bentuk segura.', trapType: 'grammar' },
      { value: 'única', reason: 'Única berarti "unik" — sifat yang sama sekali berbeda, bukan kepercayaan diri. Perlu segura.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Es', prompt: 'Kata penghubung mana yang cocok untuk pertanyaan tentang orang ketiga?', distractors: [
        { value: 'Eres', reason: 'Eres berbicara langsung dengan pendengar. Pertanyaan tentang orang ketiga hanya perlu Es.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy tentang penutur. Pertanyaan tentang orang ketiga hanya perlu Es.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Sifat mana yang cocok untuk seorang wanita?', distractors: [
        { value: 'seguro', reason: 'Seguro adalah bentuk maskulin. Tentang seorang wanita, perlu bentuk segura.', trapType: 'grammar' },
        { value: 'única', reason: 'Única berarti "unik" — sifat yang sama sekali berbeda, bukan kepercayaan diri. Perlu segura.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    tr: { meaning: 'O kendine güveniyor mu?', explanation: 'Dişil bir üçüncü kişi hakkında bir soru — ortak bir tanıdık hakkında sormak mesela. Es çünkü doğrudan onunla değil, onun hakkında konuşuluyor.', distractors: [
      { value: 'Eres', reason: 'Eres doğrudan dinleyiciyle konuşur. Üçüncü kişi hakkında soru yalnızca Es gerektirir.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy konuşan hakkındadır. Üçüncü kişi hakkında soru yalnızca Es gerektirir.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro eril biçimdir. Bir kadın hakkında segura biçimi gerekir.', trapType: 'grammar' },
      { value: 'única', reason: 'Única "eşsiz" demektir — güvenle ilgisi olmayan tamamen farklı bir nitelik. Segura gerekir.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Es', prompt: 'Üçüncü kişi hakkında soru için hangi bağlaç uyar?', distractors: [
        { value: 'Eres', reason: 'Eres doğrudan dinleyiciyle konuşur. Üçüncü kişi hakkında soru yalnızca Es gerektirir.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy konuşan hakkındadır. Üçüncü kişi hakkında soru yalnızca Es gerektirir.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Bir kadın için hangi nitelik uyar?', distractors: [
        { value: 'seguro', reason: 'Seguro eril biçimdir. Bir kadın hakkında segura biçimi gerekir.', trapType: 'grammar' },
        { value: 'única', reason: 'Única "eşsiz" demektir — güvenle ilgisi olmayan tamamen farklı bir nitelik. Segura gerekir.', trapType: 'semantic_neighbor' },
      ]},
    ]},
    pl: { meaning: 'Czy ona jest pewna siebie?', explanation: 'Pytanie o trzecią osobę rodzaju żeńskiego — pytają na przykład o wspólną znajomą. Es, bo mowa nie bezpośrednio do niej, lecz o niej.', distractors: [
      { value: 'Eres', reason: 'Eres zwraca się bezpośrednio do słuchaczki. Pytanie o trzecią osobę wymaga tylko Es.', trapType: 'grammar' },

        { value: 'Soy', reason: 'Soy dotyczy mówiącego. Pytanie o trzecią osobę wymaga tylko Es.', trapType: 'grammar' },
      { value: 'seguro', reason: 'Seguro to forma męska. O kobiecie potrzebna jest forma segura.', trapType: 'grammar' },
      { value: 'única', reason: 'Única znaczy „jedyna” — zupełnie inna cecha, nie pewność siebie. Potrzebne jest segura.', trapType: 'semantic_neighbor' },
    ], words: [
      { correct: 'Es', prompt: 'Jaki łącznik pasuje do pytania o trzecią osobę?', distractors: [
        { value: 'Eres', reason: 'Eres zwraca się bezpośrednio do słuchaczki. Pytanie o trzecią osobę wymaga tylko Es.', trapType: 'grammar' },
        { value: 'Soy', reason: 'Soy dotyczy mówiącego. Pytanie o trzecią osobę wymaga tylko Es.', trapType: 'grammar' },
      ]},
      { correct: 'segura', prompt: 'Jaka cecha pasuje do kobiety?', distractors: [
        { value: 'seguro', reason: 'Seguro to forma męska. O kobiecie potrzebna jest forma segura.', trapType: 'grammar' },
        { value: 'única', reason: 'Única znaczy „jedyna” — zupełnie inna cecha, nie pewność siebie. Potrzebne jest segura.', trapType: 'semantic_neighbor' },
      ]},
    ]},
  },
});
