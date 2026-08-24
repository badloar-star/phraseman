import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { LearningV2InterfaceLocale } from '../generator_course_contract';

// зачем этот файл (владелец, 2026-08-24): ручной перевод и разбор для двух
// фраз сессии 2 на восьми объяснительных локалях (без 'es' — целевой язык).
// Написано вручную, не сгенерировано подстановкой — тот же принцип, что и в
// es_episode_01_session_01_localized_details_v1.ts.
type LocaleWithoutEs = Exclude<LearningV2InterfaceLocale, 'es'>;

export const ES_SESSION_02_LOCALIZED_DETAILS: Readonly<
  Record<string, Readonly<Record<LocaleWithoutEs, EpisodeSourcePhraseLocalizedDetails>>>
> = Object.freeze({
  'es-e01-s02-no-es-facil': {
    ru: { meaning: 'Это не легко', explanation: 'Прямое возражение на чужую оценку. No встаёт перед es, fácil остаётся без изменений.', distractors: [
      { value: 'Nada', reason: 'Nada — «ничего», отдельное слово-предмет. Глагол отрицают через no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres — это «ты». Про «это» (безличную оценку) — только es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy — про себя. Оценка ситуации не о говорящем — es.', trapType: 'grammar' },
      { value: 'fácilmente', reason: 'Fácilmente — «легко» как наречие при действии. Признак самой вещи — fácil.', trapType: 'grammar' },
      { value: 'facilidad', reason: 'Facilidad — «лёгкость», предмет. Признак — fácil.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Каким словом начать возражение?', distractors: [
          { value: 'Nada', reason: 'Nada — «ничего», отдельное слово-предмет. Глагол отрицают через no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Какое слово нужно перед признаком?', distractors: [
          { value: 'eres', reason: 'Eres — это «ты». Про «это» (безличную оценку) — только es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy — про себя. Оценка ситуации не о говорящем — es.', trapType: 'grammar' },
        ]},
        { correct: 'fácil', prompt: 'Какой признак нужен: «лёгкий»?', distractors: [
          { value: 'fácilmente', reason: 'Fácilmente — «легко» как наречие при действии. Признак самой вещи — fácil.', trapType: 'grammar' },
          { value: 'facilidad', reason: 'Facilidad — «лёгкость», предмет. Признак — fácil.', trapType: 'grammar' },
        ]},
      ]},
    uk: { meaning: 'Це не легко', explanation: 'Пряме заперечення чужої оцінки. No стає перед es, fácil лишається без змін.', distractors: [
      { value: 'Nada', reason: 'Nada — «нічого», окреме слово-предмет. Дієслово заперечують через no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres — це «ти». Про «це» (безособову оцінку) — тільки es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy — про себе. Оцінка ситуації не про мовця — es.', trapType: 'grammar' },
      { value: 'fácilmente', reason: 'Fácilmente — «легко» як прислівник при дії. Ознака самої речі — fácil.', trapType: 'grammar' },
      { value: 'facilidad', reason: 'Facilidad — «легкість», предмет. Ознака — fácil.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Яким словом почати заперечення?', distractors: [
          { value: 'Nada', reason: 'Nada — «нічого», окреме слово-предмет. Дієслово заперечують через no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Яке слово потрібне перед ознакою?', distractors: [
          { value: 'eres', reason: 'Eres — це «ти». Про «це» (безособову оцінку) — тільки es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy — про себе. Оцінка ситуації не про мовця — es.', trapType: 'grammar' },
        ]},
        { correct: 'fácil', prompt: 'Яка ознака потрібна: «легкий»?', distractors: [
          { value: 'fácilmente', reason: 'Fácilmente — «легко» як прислівник при дії. Ознака самої речі — fácil.', trapType: 'grammar' },
          { value: 'facilidad', reason: 'Facilidad — «легкість», предмет. Ознака — fácil.', trapType: 'grammar' },
        ]},
      ]},
    en: { meaning: 'It is not easy', explanation: 'A direct pushback on someone else’s verdict. No goes before es; fácil stays unchanged.', distractors: [
      { value: 'Nada', reason: 'Nada means "nothing", a separate thing-word. The verb is negated with no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non is not a Spanish word. Spanish negation is spelled no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres is "you". For "this" (an impersonal verdict), only es works.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy is about yourself. A verdict about the situation is not about the speaker — es.', trapType: 'grammar' },
      { value: 'fácilmente', reason: 'Fácilmente is "easily" as an adverb with an action. The quality of the thing itself is fácil.', trapType: 'grammar' },
      { value: 'facilidad', reason: 'Facilidad is the noun "ease". The quality is fácil.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Which word starts the pushback?', distractors: [
          { value: 'Nada', reason: 'Nada means "nothing", a separate thing-word. The verb is negated with no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non is not a Spanish word. Spanish negation is spelled no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Which word goes before the quality?', distractors: [
          { value: 'eres', reason: 'Eres is "you". For "this" (an impersonal verdict), only es works.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy is about yourself. A verdict about the situation is not about the speaker — es.', trapType: 'grammar' },
        ]},
        { correct: 'fácil', prompt: 'Which quality means "easy"?', distractors: [
          { value: 'fácilmente', reason: 'Fácilmente is "easily" as an adverb with an action. The quality of the thing itself is fácil.', trapType: 'grammar' },
          { value: 'facilidad', reason: 'Facilidad is the noun "ease". The quality is fácil.', trapType: 'grammar' },
        ]},
      ]},
    'pt-BR': { meaning: 'Não é fácil', explanation: 'Uma discordância direta do veredito de outra pessoa. No fica antes de es; fácil não muda.', distractors: [
      { value: 'Nada', reason: 'Nada significa "nada", uma palavra-coisa separada. O verbo é negado com no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non não é palavra do espanhol. A negação em espanhol se escreve no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres é "você". Para "isso" (um veredito impessoal), só es funciona.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy é sobre você mesmo. Um veredito sobre a situação não é sobre quem fala — es.', trapType: 'grammar' },
      { value: 'fácilmente', reason: 'Fácilmente é "facilmente" como advérbio com uma ação. A qualidade da coisa em si é fácil.', trapType: 'grammar' },
      { value: 'facilidad', reason: 'Facilidad é o substantivo "facilidade". A qualidade é fácil.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Qual palavra inicia a discordância?', distractors: [
          { value: 'Nada', reason: 'Nada significa "nada", uma palavra-coisa separada. O verbo é negado com no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non não é palavra do espanhol. A negação em espanhol se escreve no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Qual palavra vem antes da qualidade?', distractors: [
          { value: 'eres', reason: 'Eres é "você". Para "isso" (um veredito impessoal), só es funciona.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy é sobre você mesmo. Um veredito sobre a situação não é sobre quem fala — es.', trapType: 'grammar' },
        ]},
        { correct: 'fácil', prompt: 'Qual qualidade significa "fácil"?', distractors: [
          { value: 'fácilmente', reason: 'Fácilmente é "facilmente" como advérbio com uma ação. A qualidade da coisa em si é fácil.', trapType: 'grammar' },
          { value: 'facilidad', reason: 'Facilidad é o substantivo "facilidade". A qualidade é fácil.', trapType: 'grammar' },
        ]},
      ]},
    vi: { meaning: 'Điều này không dễ', explanation: 'Sự phản đối trực tiếp với nhận định của người khác. No đứng trước es; fácil không đổi.', distractors: [
      { value: 'Nada', reason: 'Nada nghĩa là "không có gì", một từ-sự vật riêng. Động từ được phủ định bằng no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non không phải từ tiếng Tây Ban Nha. Phủ định tiếng Tây Ban Nha viết là no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres nghĩa là "bạn". Với "điều này" (nhận định vô nhân xưng), chỉ es mới đúng.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy là nói về bản thân. Nhận định về tình huống không phải về người nói — es.', trapType: 'grammar' },
      { value: 'fácilmente', reason: 'Fácilmente là "dễ dàng" như một trạng từ đi với hành động. Đặc điểm của bản thân sự vật là fácil.', trapType: 'grammar' },
      { value: 'facilidad', reason: 'Facilidad là danh từ "sự dễ dàng". Đặc điểm là fácil.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Từ nào bắt đầu sự phản đối?', distractors: [
          { value: 'Nada', reason: 'Nada nghĩa là "không có gì", một từ-sự vật riêng. Động từ được phủ định bằng no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non không phải từ tiếng Tây Ban Nha. Phủ định tiếng Tây Ban Nha viết là no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Từ nào đứng trước đặc điểm?', distractors: [
          { value: 'eres', reason: 'Eres nghĩa là "bạn". Với "điều này" (nhận định vô nhân xưng), chỉ es mới đúng.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy là nói về bản thân. Nhận định về tình huống không phải về người nói — es.', trapType: 'grammar' },
        ]},
        { correct: 'fácil', prompt: 'Đặc điểm nào nghĩa là "dễ"?', distractors: [
          { value: 'fácilmente', reason: 'Fácilmente là "dễ dàng" như một trạng từ đi với hành động. Đặc điểm của bản thân sự vật là fácil.', trapType: 'grammar' },
          { value: 'facilidad', reason: 'Facilidad là danh từ "sự dễ dàng". Đặc điểm là fácil.', trapType: 'grammar' },
        ]},
      ]},
    id: { meaning: 'Ini tidak mudah', explanation: 'Sanggahan langsung terhadap penilaian orang lain. No berada sebelum es; fácil tidak berubah.', distractors: [
      { value: 'Nada', reason: 'Nada berarti "tidak ada apa-apa", kata benda tersendiri. Kata kerja disangkal dengan no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non bukan kata bahasa Spanyol. Penyangkalan bahasa Spanyol ditulis no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres berarti "kamu". Untuk "ini" (penilaian impersonal), hanya es yang tepat.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy tentang diri sendiri. Penilaian tentang situasi bukan tentang penutur — es.', trapType: 'grammar' },
      { value: 'fácilmente', reason: 'Fácilmente adalah "dengan mudah" sebagai kata keterangan dengan sebuah tindakan. Sifat dari benda itu sendiri adalah fácil.', trapType: 'grammar' },
      { value: 'facilidad', reason: 'Facilidad adalah kata benda "kemudahan". Sifatnya adalah fácil.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Kata mana yang memulai sanggahan?', distractors: [
          { value: 'Nada', reason: 'Nada berarti "tidak ada apa-apa", kata benda tersendiri. Kata kerja disangkal dengan no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non bukan kata bahasa Spanyol. Penyangkalan bahasa Spanyol ditulis no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Kata mana yang muncul sebelum sifat?', distractors: [
          { value: 'eres', reason: 'Eres berarti "kamu". Untuk "ini" (penilaian impersonal), hanya es yang tepat.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy tentang diri sendiri. Penilaian tentang situasi bukan tentang penutur — es.', trapType: 'grammar' },
        ]},
        { correct: 'fácil', prompt: 'Sifat mana yang berarti "mudah"?', distractors: [
          { value: 'fácilmente', reason: 'Fácilmente adalah "dengan mudah" sebagai kata keterangan dengan sebuah tindakan. Sifat dari benda itu sendiri adalah fácil.', trapType: 'grammar' },
          { value: 'facilidad', reason: 'Facilidad adalah kata benda "kemudahan". Sifatnya adalah fácil.', trapType: 'grammar' },
        ]},
      ]},
    tr: { meaning: 'Bu kolay değil', explanation: 'Başkasının yargısına doğrudan bir itiraz. No, es\'ten önce gelir; fácil değişmez.', distractors: [
      { value: 'Nada', reason: 'Nada "hiçbir şey" demektir, ayrı bir isim-sözcüktür. Fiil no ile olumsuzlanır.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzlama no yazılır.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres "sen" demektir. "Bu" hakkında kişisiz bir yargıda sadece es kullanılır.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy kendiniz hakkındadır. Durum hakkındaki bir yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
      { value: 'fácilmente', reason: 'Fácilmente bir eylemle birlikte "kolayca" anlamına gelen bir zarftır. Şeyin kendisinin niteliği fácil\'dir.', trapType: 'grammar' },
      { value: 'facilidad', reason: 'Facilidad "kolaylık" anlamına gelen bir isimdir. Nitelik fácil\'dir.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'İtiraz hangi kelimeyle başlar?', distractors: [
          { value: 'Nada', reason: 'Nada "hiçbir şey" demektir, ayrı bir isim-sözcüktür. Fiil no ile olumsuzlanır.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzlama no yazılır.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Nitelikten önce hangi kelime gelir?', distractors: [
          { value: 'eres', reason: 'Eres "sen" demektir. "Bu" hakkında kişisiz bir yargıda sadece es kullanılır.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy kendiniz hakkındadır. Durum hakkındaki bir yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
        ]},
        { correct: 'fácil', prompt: 'Hangi nitelik "kolay" anlamına gelir?', distractors: [
          { value: 'fácilmente', reason: 'Fácilmente bir eylemle birlikte "kolayca" anlamına gelen bir zarftır. Şeyin kendisinin niteliği fácil\'dir.', trapType: 'grammar' },
          { value: 'facilidad', reason: 'Facilidad "kolaylık" anlamına gelen bir isimdir. Nitelik fácil\'dir.', trapType: 'grammar' },
        ]},
      ]},
    pl: { meaning: 'To nie jest łatwe', explanation: 'Bezpośredni sprzeciw wobec cudzego osądu. No stoi przed es; fácil się nie zmienia.', distractors: [
      { value: 'Nada', reason: 'Nada znaczy „nic”, osobne słowo-rzecz. Czasownik zaprzecza się przez no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non nie jest hiszpańskim słowem. Hiszpańskie przeczenie zapisuje się no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres to „ty”. Dla „to” (bezosobowy osąd) pasuje tylko es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy dotyczy ciebie samego. Osąd o sytuacji nie dotyczy mówiącego — es.', trapType: 'grammar' },
      { value: 'fácilmente', reason: 'Fácilmente to „łatwo” jako przysłówek przy czynności. Cecha samej rzeczy to fácil.', trapType: 'grammar' },
      { value: 'facilidad', reason: 'Facilidad to rzeczownik „łatwość”. Cecha to fácil.', trapType: 'grammar' },
    ],
      words: [
        { correct: 'No', prompt: 'Którym słowem zacząć sprzeciw?', distractors: [
          { value: 'Nada', reason: 'Nada znaczy „nic”, osobne słowo-rzecz. Czasownik zaprzecza się przez no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non nie jest hiszpańskim słowem. Hiszpańskie przeczenie zapisuje się no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Które słowo stoi przed cechą?', distractors: [
          { value: 'eres', reason: 'Eres to „ty”. Dla „to” (bezosobowy osąd) pasuje tylko es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy dotyczy ciebie samego. Osąd o sytuacji nie dotyczy mówiącego — es.', trapType: 'grammar' },
        ]},
        { correct: 'fácil', prompt: 'Która cecha znaczy „łatwy”?', distractors: [
          { value: 'fácilmente', reason: 'Fácilmente to „łatwo” jako przysłówek przy czynności. Cecha samej rzeczy to fácil.', trapType: 'grammar' },
          { value: 'facilidad', reason: 'Facilidad to rzeczownik „łatwość”. Cecha to fácil.', trapType: 'grammar' },
        ]},
      ]},
  },
  'es-e01-s02-no-es-verdad': {
    ru: { meaning: 'Это неправда', explanation: 'Прямое опровержение чужих слов. No встаёт перед es, verdad остаётся без изменений.', distractors: [
      { value: 'Nunca', reason: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres — это «ты». Про «это» (безличную оценку) — только es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy — про себя. Оценка ситуации не о говорящем — es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero — «истинный» как признак предмета. Устойчивая реакция — именно (no) es verdad, с существительным, а не прилагательным.', trapType: 'grammar' },
      { value: 'mentira', reason: 'Mentira значит «ложь» само по себе — сказали бы Es mentira, без no. Здесь строим отрицание готовой фразы Es verdad.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Каким словом опровергнуть?', distractors: [
          { value: 'Nunca', reason: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Какое слово нужно перед существительным-оценкой?', distractors: [
          { value: 'eres', reason: 'Eres — это «ты». Про «это» (безличную оценку) — только es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy — про себя. Оценка ситуации не о говорящем — es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', prompt: 'Каким словом подтвердить (или опровергнуть) чужие слова?', distractors: [
          { value: 'verdadero', reason: 'Verdadero — «истинный» как признак предмета. Устойчивая реакция — именно (no) es verdad, с существительным, а не прилагательным.', trapType: 'grammar' },
          { value: 'mentira', reason: 'Mentira значит «ложь» само по себе — сказали бы Es mentira, без no. Здесь строим отрицание готовой фразы Es verdad.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    uk: { meaning: 'Це неправда', explanation: 'Пряме спростування чужих слів. No стає перед es, verdad лишається без змін.', distractors: [
      { value: 'Nunca', reason: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres — це «ти». Про «це» (безособову оцінку) — тільки es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy — про себе. Оцінка ситуації не про мовця — es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero — «істинний» як ознака предмета. Стійка реакція — саме (no) es verdad, з іменником, а не прикметником.', trapType: 'grammar' },
      { value: 'mentira', reason: 'Mentira означає «брехня» саме по собі — сказали б Es mentira, без no. Тут будуємо заперечення готової фрази Es verdad.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Яким словом спростувати?', distractors: [
          { value: 'Nunca', reason: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Яке слово потрібне перед іменником-оцінкою?', distractors: [
          { value: 'eres', reason: 'Eres — це «ти». Про «це» (безособову оцінку) — тільки es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy — про себе. Оцінка ситуації не про мовця — es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', prompt: 'Яким словом підтвердити (або спростувати) чужі слова?', distractors: [
          { value: 'verdadero', reason: 'Verdadero — «істинний» як ознака предмета. Стійка реакція — саме (no) es verdad, з іменником, а не прикметником.', trapType: 'grammar' },
          { value: 'mentira', reason: 'Mentira означає «брехня» саме по собі — сказали б Es mentira, без no. Тут будуємо заперечення готової фрази Es verdad.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    en: { meaning: 'That is not true', explanation: 'A direct denial of someone else’s words. No goes before es; verdad stays unchanged.', distractors: [
      { value: 'Nunca', reason: 'Nunca means "never", about frequency in time. Simple negation is no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non is not a Spanish word. Spanish negation is spelled no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres is "you". For "this" (an impersonal verdict), only es works.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy is about yourself. A verdict about the situation is not about the speaker — es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero is "true" as a quality of a thing. The fixed reaction is exactly (no) es verdad, with the noun, not an adjective.', trapType: 'grammar' },
      { value: 'mentira', reason: 'Mentira means "lie" by itself — you would say Es mentira, without no. Here we negate the fixed phrase Es verdad.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Which word denies it?', distractors: [
          { value: 'Nunca', reason: 'Nunca means "never", about frequency in time. Simple negation is no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non is not a Spanish word. Spanish negation is spelled no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Which word goes before the noun-verdict?', distractors: [
          { value: 'eres', reason: 'Eres is "you". For "this" (an impersonal verdict), only es works.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy is about yourself. A verdict about the situation is not about the speaker — es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', prompt: 'Which word confirms (or here, denies) someone else’s statement?', distractors: [
          { value: 'verdadero', reason: 'Verdadero is "true" as a quality of a thing. The fixed reaction is exactly (no) es verdad, with the noun, not an adjective.', trapType: 'grammar' },
          { value: 'mentira', reason: 'Mentira means "lie" by itself — you would say Es mentira, without no. Here we negate the fixed phrase Es verdad.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    'pt-BR': { meaning: 'Não é verdade', explanation: 'Uma negação direta do que outra pessoa disse. No fica antes de es; verdad não muda.', distractors: [
      { value: 'Nunca', reason: 'Nunca significa "nunca", sobre frequência no tempo. A negação simples é no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non não é palavra do espanhol. A negação em espanhol se escreve no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres é "você". Para "isso" (um veredito impessoal), só es funciona.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy é sobre você mesmo. Um veredito sobre a situação não é sobre quem fala — es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero é "verdadeiro" como qualidade de uma coisa. A reação fixa é exatamente (no) es verdad, com o substantivo, não um adjetivo.', trapType: 'grammar' },
      { value: 'mentira', reason: 'Mentira significa "mentira" por si só — se diria Es mentira, sem no. Aqui negamos a frase fixa Es verdad.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Qual palavra nega?', distractors: [
          { value: 'Nunca', reason: 'Nunca significa "nunca", sobre frequência no tempo. A negação simples é no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non não é palavra do espanhol. A negação em espanhol se escreve no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Qual palavra vem antes do substantivo-veredito?', distractors: [
          { value: 'eres', reason: 'Eres é "você". Para "isso" (um veredito impessoal), só es funciona.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy é sobre você mesmo. Um veredito sobre a situação não é sobre quem fala — es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', prompt: 'Qual palavra confirma (aqui, nega) o que outra pessoa disse?', distractors: [
          { value: 'verdadero', reason: 'Verdadero é "verdadeiro" como qualidade de uma coisa. A reação fixa é exatamente (no) es verdad, com o substantivo, não um adjetivo.', trapType: 'grammar' },
          { value: 'mentira', reason: 'Mentira significa "mentira" por si só — se diria Es mentira, sem no. Aqui negamos a frase fixa Es verdad.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    vi: { meaning: 'Điều đó không đúng', explanation: 'Bác bỏ trực tiếp lời người khác. No đứng trước es; verdad không đổi.', distractors: [
      { value: 'Nunca', reason: 'Nunca nghĩa là "không bao giờ", về tần suất theo thời gian. Phủ định đơn giản là no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non không phải từ tiếng Tây Ban Nha. Phủ định tiếng Tây Ban Nha viết là no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres nghĩa là "bạn". Với "điều này" (nhận định vô nhân xưng), chỉ es mới đúng.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy là nói về bản thân. Nhận định về tình huống không phải về người nói — es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero là "đúng thật" như một đặc tính của sự vật. Phản ứng cố định chính là (no) es verdad, với danh từ, không phải tính từ.', trapType: 'grammar' },
      { value: 'mentira', reason: 'Mentira tự nó nghĩa là "lời nói dối" — sẽ nói Es mentira, không có no. Ở đây ta phủ định cụm từ cố định Es verdad.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Từ nào bác bỏ?', distractors: [
          { value: 'Nunca', reason: 'Nunca nghĩa là "không bao giờ", về tần suất theo thời gian. Phủ định đơn giản là no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non không phải từ tiếng Tây Ban Nha. Phủ định tiếng Tây Ban Nha viết là no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Từ nào đứng trước danh từ-nhận định?', distractors: [
          { value: 'eres', reason: 'Eres nghĩa là "bạn". Với "điều này" (nhận định vô nhân xưng), chỉ es mới đúng.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy là nói về bản thân. Nhận định về tình huống không phải về người nói — es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', prompt: 'Từ nào xác nhận (ở đây, bác bỏ) lời người khác?', distractors: [
          { value: 'verdadero', reason: 'Verdadero là "đúng thật" như một đặc tính của sự vật. Phản ứng cố định chính là (no) es verdad, với danh từ, không phải tính từ.', trapType: 'grammar' },
          { value: 'mentira', reason: 'Mentira tự nó nghĩa là "lời nói dối" — sẽ nói Es mentira, không có no. Ở đây ta phủ định cụm từ cố định Es verdad.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    id: { meaning: 'Itu tidak benar', explanation: 'Sanggahan langsung terhadap kata-kata orang lain. No berada sebelum es; verdad tidak berubah.', distractors: [
      { value: 'Nunca', reason: 'Nunca berarti "tidak pernah", tentang frekuensi waktu. Penyangkalan sederhana adalah no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non bukan kata bahasa Spanyol. Penyangkalan bahasa Spanyol ditulis no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres berarti "kamu". Untuk "ini" (penilaian impersonal), hanya es yang tepat.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy tentang diri sendiri. Penilaian tentang situasi bukan tentang penutur — es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero adalah "benar" sebagai sifat suatu benda. Reaksi tetapnya adalah (no) es verdad, dengan kata benda, bukan kata sifat.', trapType: 'grammar' },
      { value: 'mentira', reason: 'Mentira dengan sendirinya berarti "kebohongan" — akan dikatakan Es mentira, tanpa no. Di sini kita menyangkal frasa tetap Es verdad.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Kata mana yang menyanggah?', distractors: [
          { value: 'Nunca', reason: 'Nunca berarti "tidak pernah", tentang frekuensi waktu. Penyangkalan sederhana adalah no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non bukan kata bahasa Spanyol. Penyangkalan bahasa Spanyol ditulis no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Kata mana yang muncul sebelum kata benda-penilaian?', distractors: [
          { value: 'eres', reason: 'Eres berarti "kamu". Untuk "ini" (penilaian impersonal), hanya es yang tepat.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy tentang diri sendiri. Penilaian tentang situasi bukan tentang penutur — es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', prompt: 'Kata mana yang menegaskan (di sini, menyanggah) perkataan orang lain?', distractors: [
          { value: 'verdadero', reason: 'Verdadero adalah "benar" sebagai sifat suatu benda. Reaksi tetapnya adalah (no) es verdad, dengan kata benda, bukan kata sifat.', trapType: 'grammar' },
          { value: 'mentira', reason: 'Mentira dengan sendirinya berarti "kebohongan" — akan dikatakan Es mentira, tanpa no. Di sini kita menyangkal frasa tetap Es verdad.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    tr: { meaning: 'Bu doğru değil', explanation: 'Başkasının sözlerinin doğrudan reddi. No, es\'ten önce gelir; verdad değişmez.', distractors: [
      { value: 'Nunca', reason: 'Nunca "asla" demektir, zamandaki sıklıkla ilgilidir. Basit olumsuzlama no\'dur.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzlama no yazılır.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres "sen" demektir. "Bu" hakkında kişisiz bir yargıda sadece es kullanılır.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy kendiniz hakkındadır. Durum hakkındaki bir yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero bir şeyin niteliği olarak "doğru" demektir. Sabit tepki tam olarak (no) es verdad\'dır, sıfat değil isimle.', trapType: 'grammar' },
      { value: 'mentira', reason: 'Mentira tek başına "yalan" demektir — Es mentira denirdi, no olmadan. Burada sabit ifade Es verdad\'ı olumsuzluyoruz.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Hangi kelime reddeder?', distractors: [
          { value: 'Nunca', reason: 'Nunca "asla" demektir, zamandaki sıklıkla ilgilidir. Basit olumsuzlama no\'dur.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzlama no yazılır.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'İsim-yargıdan önce hangi kelime gelir?', distractors: [
          { value: 'eres', reason: 'Eres "sen" demektir. "Bu" hakkında kişisiz bir yargıda sadece es kullanılır.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy kendiniz hakkındadır. Durum hakkındaki bir yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', prompt: 'Hangi kelime başkasının sözünü doğrular (burada, reddeder)?', distractors: [
          { value: 'verdadero', reason: 'Verdadero bir şeyin niteliği olarak "doğru" demektir. Sabit tepki tam olarak (no) es verdad\'dır, sıfat değil isimle.', trapType: 'grammar' },
          { value: 'mentira', reason: 'Mentira tek başına "yalan" demektir — Es mentira denirdi, no olmadan. Burada sabit ifade Es verdad\'ı olumsuzluyoruz.', trapType: 'semantic_neighbor' },
        ]},
      ]},
    pl: { meaning: 'To nieprawda', explanation: 'Bezpośrednie zaprzeczenie czyichś słów. No stoi przed es; verdad się nie zmienia.', distractors: [
      { value: 'Nunca', reason: 'Nunca znaczy „nigdy”, o częstotliwości w czasie. Proste przeczenie to no.', trapType: 'semantic_neighbor' },
      { value: 'Non', reason: 'Non nie jest hiszpańskim słowem. Hiszpańskie przeczenie zapisuje się no.', trapType: 'orthographic' },
      { value: 'eres', reason: 'Eres to „ty”. Dla „to” (bezosobowy osąd) pasuje tylko es.', trapType: 'grammar' },
      { value: 'soy', reason: 'Soy dotyczy ciebie samego. Osąd o sytuacji nie dotyczy mówiącego — es.', trapType: 'grammar' },
      { value: 'verdadero', reason: 'Verdadero to „prawdziwy” jako cecha przedmiotu. Stała reakcja to dokładnie (no) es verdad, z rzeczownikiem, nie przymiotnikiem.', trapType: 'grammar' },
      { value: 'mentira', reason: 'Mentira samo w sobie znaczy „kłamstwo” — powiedziałoby się Es mentira, bez no. Tu zaprzeczamy stałemu wyrażeniu Es verdad.', trapType: 'semantic_neighbor' },
    ],
      words: [
        { correct: 'No', prompt: 'Które słowo zaprzecza?', distractors: [
          { value: 'Nunca', reason: 'Nunca znaczy „nigdy”, o częstotliwości w czasie. Proste przeczenie to no.', trapType: 'semantic_neighbor' },
          { value: 'Non', reason: 'Non nie jest hiszpańskim słowem. Hiszpańskie przeczenie zapisuje się no.', trapType: 'orthographic' },
        ]},
        { correct: 'es', prompt: 'Które słowo stoi przed rzeczownikiem-osądem?', distractors: [
          { value: 'eres', reason: 'Eres to „ty”. Dla „to” (bezosobowy osąd) pasuje tylko es.', trapType: 'grammar' },
          { value: 'soy', reason: 'Soy dotyczy ciebie samego. Osąd o sytuacji nie dotyczy mówiącego — es.', trapType: 'grammar' },
        ]},
        { correct: 'verdad', prompt: 'Które słowo potwierdza (tu: zaprzecza) czyimś słowom?', distractors: [
          { value: 'verdadero', reason: 'Verdadero to „prawdziwy” jako cecha przedmiotu. Stała reakcja to dokładnie (no) es verdad, z rzeczownikiem, nie przymiotnikiem.', trapType: 'grammar' },
          { value: 'mentira', reason: 'Mentira samo w sobie znaczy „kłamstwo” — powiedziałoby się Es mentira, bez no. Tu zaprzeczamy stałemu wyrażeniu Es verdad.', trapType: 'semantic_neighbor' },
        ]},
      ]},
  },
});
