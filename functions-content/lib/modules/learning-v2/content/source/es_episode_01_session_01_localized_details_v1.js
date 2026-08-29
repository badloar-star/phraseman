"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ES_SESSION_01_LOCALIZED_DETAILS = void 0;
exports.ES_SESSION_01_LOCALIZED_DETAILS = Object.freeze({
    'es-e01-s01-es-facil': {
        ru: {
            meaning: 'Это легко',
            explanation: 'Самая частая оценка чего угодно — задачи, языка, решения. По-русски мы обходимся без глагола: «это легко». По-испански связка обязательна.',
            distractors: [
                { value: 'Eres', reason: 'Eres — это «ты». Про «это» (безличную оценку) — только es.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy — про себя. Оценка ситуации не о говорящем — es.', trapType: 'grammar' },
                { value: 'Ser', reason: 'Ser — начальная форма, как «быть». В готовой фразе нужна личная: es.', trapType: 'grammar' },
                { value: 'Está', reason: 'Está — от другого глагола, estar. Он про место и временное состояние, а не про постоянное свойство.', trapType: 'grammar' },
                { value: 'fácilmente', reason: 'Fácilmente — «легко» как наречие при действии («сделал легко»). Признак самой вещи — fácil.', trapType: 'grammar' },
                { value: 'facilidad', reason: 'Facilidad — «лёгкость», предмет. Признак — fácil.', trapType: 'grammar' },
            ],
            words: [
                {
                    correct: 'Es', prompt: 'Какое слово нужно перед признаком в безличной оценке?',
                    distractors: [
                        { value: 'Eres', reason: 'Eres — это «ты». Про «это» (безличную оценку) — только es.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy — про себя. Оценка ситуации не о говорящем — es.', trapType: 'grammar' },
                        { value: 'Ser', reason: 'Ser — начальная форма, как «быть». В готовой фразе нужна личная: es.', trapType: 'grammar' },
                        { value: 'Está', reason: 'Está — от другого глагола, estar. Он про место и временное состояние, а не про постоянное свойство.', trapType: 'grammar' },
                    ],
                },
                {
                    correct: 'fácil', prompt: 'Какой признак подходит по смыслу «легко»?',
                    distractors: [
                        { value: 'fácilmente', reason: 'Fácilmente — «легко» как наречие при действии («сделал легко»). Признак самой вещи — fácil.', trapType: 'grammar' },
                        { value: 'facilidad', reason: 'Facilidad — «лёгкость», предмет. Признак — fácil.', trapType: 'grammar' },
                    ],
                },
            ],
        },
        uk: {
            meaning: 'Це легко',
            explanation: 'Найчастіша оцінка будь-чого — завдання, мови, рішення. Українською ми обходимось без дієслова: «це легко». В іспанській зв’язка обов’язкова.',
            distractors: [
                { value: 'Eres', reason: 'Eres — це «ти». Про «це» (безособову оцінку) — тільки es.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy — про себе. Оцінка ситуації не про мовця — es.', trapType: 'grammar' },
                { value: 'Ser', reason: 'Ser — початкова форма, як «бути». У готовій фразі потрібна особова: es.', trapType: 'grammar' },
                { value: 'Está', reason: 'Está — від іншого дієслова, estar. Воно про місце й тимчасовий стан, а не про постійну властивість.', trapType: 'grammar' },
                { value: 'fácilmente', reason: 'Fácilmente — «легко» як прислівник при дії («зробив легко»). Ознака самої речі — fácil.', trapType: 'grammar' },
                { value: 'facilidad', reason: 'Facilidad — «легкість», предмет. Ознака — fácil.', trapType: 'grammar' },
            ],
            words: [
                {
                    correct: 'Es', prompt: 'Яке слово потрібне перед ознакою в безособовій оцінці?',
                    distractors: [
                        { value: 'Eres', reason: 'Eres — це «ти». Про «це» (безособову оцінку) — тільки es.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy — про себе. Оцінка ситуації не про мовця — es.', trapType: 'grammar' },
                        { value: 'Ser', reason: 'Ser — початкова форма, як «бути». У готовій фразі потрібна особова: es.', trapType: 'grammar' },
                        { value: 'Está', reason: 'Está — від іншого дієслова, estar. Воно про місце й тимчасовий стан, а не про постійну властивість.', trapType: 'grammar' },
                    ],
                },
                {
                    correct: 'fácil', prompt: 'Яка ознака підходить за змістом «легко»?',
                    distractors: [
                        { value: 'fácilmente', reason: 'Fácilmente — «легко» як прислівник при дії («зробив легко»). Ознака самої речі — fácil.', trapType: 'grammar' },
                        { value: 'facilidad', reason: 'Facilidad — «легкість», предмет. Ознака — fácil.', trapType: 'grammar' },
                    ],
                },
            ],
        },
        en: {
            meaning: 'It is easy',
            explanation: 'The most common verdict about anything — a task, a language, a decision. English keeps the verb here too (“it is”), so this part is familiar — the difference is that Spanish has more forms to choose from.',
            distractors: [
                { value: 'Eres', reason: 'Eres is “you”. An impersonal verdict about “it” takes es only.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy is about yourself. A verdict about the situation is not about the speaker — es.', trapType: 'grammar' },
                { value: 'Ser', reason: 'Ser is the base form, like “to be”. A finished sentence needs the personal form: es.', trapType: 'grammar' },
                { value: 'Está', reason: 'Está belongs to a different verb, estar. That one covers place and temporary state, not a lasting quality.', trapType: 'grammar' },
                { value: 'fácilmente', reason: 'Fácilmente is “easily” as an adverb describing an action (“did it easily”). The quality of the thing itself is fácil.', trapType: 'grammar' },
                { value: 'facilidad', reason: 'Facilidad is “ease”, a noun. The quality is fácil.', trapType: 'grammar' },
            ],
            words: [
                {
                    correct: 'Es', prompt: 'Which word goes before the quality in an impersonal verdict?',
                    distractors: [
                        { value: 'Eres', reason: 'Eres is “you”. An impersonal verdict about “it” takes es only.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy is about yourself. A verdict about the situation is not about the speaker — es.', trapType: 'grammar' },
                        { value: 'Ser', reason: 'Ser is the base form, like “to be”. A finished sentence needs the personal form: es.', trapType: 'grammar' },
                        { value: 'Está', reason: 'Está belongs to a different verb, estar. That one covers place and temporary state, not a lasting quality.', trapType: 'grammar' },
                    ],
                },
                {
                    correct: 'fácil', prompt: 'Which quality matches the meaning “easy”?',
                    distractors: [
                        { value: 'fácilmente', reason: 'Fácilmente is “easily” as an adverb describing an action (“did it easily”). The quality of the thing itself is fácil.', trapType: 'grammar' },
                        { value: 'facilidad', reason: 'Facilidad is “ease”, a noun. The quality is fácil.', trapType: 'grammar' },
                    ],
                },
            ],
        },
        'pt-BR': {
            meaning: 'É fácil',
            explanation: 'A avaliação mais comum de qualquer coisa — uma tarefa, um idioma, uma decisão. O português também mantém o verbo aqui (“é”), então essa parte é familiar — a diferença está em quantas formas o espanhol tem.',
            distractors: [
                { value: 'Eres', reason: 'Eres é “você”. Um julgamento impessoal sobre “isto” usa só es.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy é sobre si mesmo. Um julgamento sobre a situação não é sobre quem fala — es.', trapType: 'grammar' },
                { value: 'Ser', reason: 'Ser é a forma base, como “ser/estar” no infinitivo. Numa frase pronta precisa da forma pessoal: es.', trapType: 'grammar' },
                { value: 'Está', reason: 'Está pertence a outro verbo, estar. Esse cobre lugar e estado temporário, não uma qualidade permanente.', trapType: 'grammar' },
                { value: 'fácilmente', reason: 'Fácilmente é “facilmente” como advérbio de uma ação (“fez facilmente”). A qualidade da própria coisa é fácil.', trapType: 'grammar' },
                { value: 'facilidad', reason: 'Facilidad é “facilidade”, um substantivo. A qualidade é fácil.', trapType: 'grammar' },
            ],
            words: [
                {
                    correct: 'Es', prompt: 'Qual palavra vai antes da qualidade num julgamento impessoal?',
                    distractors: [
                        { value: 'Eres', reason: 'Eres é “você”. Um julgamento impessoal sobre “isto” usa só es.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy é sobre si mesmo. Um julgamento sobre a situação não é sobre quem fala — es.', trapType: 'grammar' },
                        { value: 'Ser', reason: 'Ser é a forma base, como “ser/estar” no infinitivo. Numa frase pronta precisa da forma pessoal: es.', trapType: 'grammar' },
                        { value: 'Está', reason: 'Está pertence a outro verbo, estar. Esse cobre lugar e estado temporário, não uma qualidade permanente.', trapType: 'grammar' },
                    ],
                },
                {
                    correct: 'fácil', prompt: 'Qual qualidade combina com o sentido de “fácil”?',
                    distractors: [
                        { value: 'fácilmente', reason: 'Fácilmente é “facilmente” como advérbio de uma ação (“fez facilmente”). A qualidade da própria coisa é fácil.', trapType: 'grammar' },
                        { value: 'facilidad', reason: 'Facilidad é “facilidade”, um substantivo. A qualidade é fácil.', trapType: 'grammar' },
                    ],
                },
            ],
        },
        vi: {
            meaning: 'Điều này dễ',
            explanation: 'Nhận định phổ biến nhất về bất cứ điều gì — một nhiệm vụ, một ngôn ngữ, một quyết định. Tiếng Việt không cần động từ ở đây («điều này dễ»), nhưng tiếng Tây Ban Nha thì bắt buộc phải có es.',
            distractors: [
                { value: 'Eres', reason: 'Eres là “bạn”. Nhận định vô nhân xưng về “điều này” chỉ dùng es.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy là về bản thân người nói. Nhận định về tình huống không phải về người nói — es.', trapType: 'grammar' },
                { value: 'Ser', reason: 'Ser là dạng gốc, như “là” chưa chia. Câu hoàn chỉnh cần dạng đã chia: es.', trapType: 'grammar' },
                { value: 'Está', reason: 'Está thuộc động từ khác, estar. Từ đó dùng cho nơi chốn và trạng thái tạm thời, không phải đặc tính lâu dài.', trapType: 'grammar' },
                { value: 'fácilmente', reason: 'Fácilmente là “một cách dễ dàng”, trạng từ bổ nghĩa cho hành động («làm một cách dễ dàng»). Đặc tính của bản thân sự việc là fácil.', trapType: 'grammar' },
                { value: 'facilidad', reason: 'Facilidad là “sự dễ dàng”, danh từ. Đặc tính là fácil.', trapType: 'grammar' },
            ],
            words: [
                {
                    correct: 'Es', prompt: 'Từ nào cần đứng trước tính từ trong nhận định vô nhân xưng?',
                    distractors: [
                        { value: 'Eres', reason: 'Eres là “bạn”. Nhận định vô nhân xưng về “điều này” chỉ dùng es.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy là về bản thân người nói. Nhận định về tình huống không phải về người nói — es.', trapType: 'grammar' },
                        { value: 'Ser', reason: 'Ser là dạng gốc, như “là” chưa chia. Câu hoàn chỉnh cần dạng đã chia: es.', trapType: 'grammar' },
                        { value: 'Está', reason: 'Está thuộc động từ khác, estar. Từ đó dùng cho nơi chốn và trạng thái tạm thời, không phải đặc tính lâu dài.', trapType: 'grammar' },
                    ],
                },
                {
                    correct: 'fácil', prompt: 'Tính từ nào phù hợp với nghĩa “dễ”?',
                    distractors: [
                        { value: 'fácilmente', reason: 'Fácilmente là “một cách dễ dàng”, trạng từ bổ nghĩa cho hành động («làm một cách dễ dàng»). Đặc tính của bản thân sự việc là fácil.', trapType: 'grammar' },
                        { value: 'facilidad', reason: 'Facilidad là “sự dễ dàng”, danh từ. Đặc tính là fácil.', trapType: 'grammar' },
                    ],
                },
            ],
        },
        id: {
            meaning: 'Ini mudah',
            explanation: 'Penilaian paling umum tentang apa pun — tugas, bahasa, keputusan. Bahasa Indonesia tidak perlu kata kerja di sini ("ini mudah"), tetapi bahasa Spanyol mewajibkan es.',
            distractors: [
                { value: 'Eres', reason: 'Eres berarti "kamu". Penilaian tak berpribadi tentang "ini" hanya memakai es.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy tentang diri sendiri. Penilaian tentang situasi bukan tentang pembicara — es.', trapType: 'grammar' },
                { value: 'Ser', reason: 'Ser adalah bentuk dasar, seperti "menjadi" tanpa konjugasi. Kalimat jadi memerlukan bentuk pribadi: es.', trapType: 'grammar' },
                { value: 'Está', reason: 'Está berasal dari kata kerja lain, estar. Kata itu untuk tempat dan keadaan sementara, bukan sifat yang bertahan.', trapType: 'grammar' },
                { value: 'fácilmente', reason: 'Fácilmente adalah "dengan mudah" sebagai kata keterangan pada tindakan ("melakukannya dengan mudah"). Sifat benda itu sendiri adalah fácil.', trapType: 'grammar' },
                { value: 'facilidad', reason: 'Facilidad adalah "kemudahan", kata benda. Sifatnya adalah fácil.', trapType: 'grammar' },
            ],
            words: [
                {
                    correct: 'Es', prompt: 'Kata mana yang diperlukan sebelum sifat dalam penilaian tak berpribadi?',
                    distractors: [
                        { value: 'Eres', reason: 'Eres berarti "kamu". Penilaian tak berpribadi tentang "ini" hanya memakai es.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy tentang diri sendiri. Penilaian tentang situasi bukan tentang pembicara — es.', trapType: 'grammar' },
                        { value: 'Ser', reason: 'Ser adalah bentuk dasar, seperti "menjadi" tanpa konjugasi. Kalimat jadi memerlukan bentuk pribadi: es.', trapType: 'grammar' },
                        { value: 'Está', reason: 'Está berasal dari kata kerja lain, estar. Kata itu untuk tempat dan keadaan sementara, bukan sifat yang bertahan.', trapType: 'grammar' },
                    ],
                },
                {
                    correct: 'fácil', prompt: 'Sifat mana yang cocok dengan makna "mudah"?',
                    distractors: [
                        { value: 'fácilmente', reason: 'Fácilmente adalah "dengan mudah" sebagai kata keterangan pada tindakan ("melakukannya dengan mudah"). Sifat benda itu sendiri adalah fácil.', trapType: 'grammar' },
                        { value: 'facilidad', reason: 'Facilidad adalah "kemudahan", kata benda. Sifatnya adalah fácil.', trapType: 'grammar' },
                    ],
                },
            ],
        },
        tr: {
            meaning: 'Bu kolay',
            explanation: 'Herhangi bir şey hakkındaki en yaygın yargı — bir görev, bir dil, bir karar. Türkçede burada fiil gerekmez ("bu kolay"), ama İspanyolcada es zorunludur.',
            distractors: [
                { value: 'Eres', reason: 'Eres "sen" demektir. "Bu" hakkında kişisiz bir yargıda sadece es kullanılır.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy kendiniz hakkındadır. Durum hakkındaki bir yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
                { value: 'Ser', reason: 'Ser temel biçimdir, çekimsiz "olmak" gibi. Tamamlanmış cümlede kişi biçimi gerekir: es.', trapType: 'grammar' },
                { value: 'Está', reason: 'Está başka bir fiile, estar\'a aittir. O fiil yer ve geçici durum içindir, kalıcı bir nitelik için değil.', trapType: 'grammar' },
                { value: 'fácilmente', reason: 'Fácilmente bir eylemi niteleyen zarf olarak "kolayca" demektir ("kolayca yaptı"). Şeyin kendisinin niteliği fácil\'dir.', trapType: 'grammar' },
                { value: 'facilidad', reason: 'Facilidad "kolaylık" demektir, bir isimdir. Nitelik fácil\'dir.', trapType: 'grammar' },
            ],
            words: [
                {
                    correct: 'Es', prompt: 'Kişisiz bir yargıda nitelikten önce hangi kelime gelir?',
                    distractors: [
                        { value: 'Eres', reason: 'Eres "sen" demektir. "Bu" hakkında kişisiz bir yargıda sadece es kullanılır.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy kendiniz hakkındadır. Durum hakkındaki bir yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
                        { value: 'Ser', reason: 'Ser temel biçimdir, çekimsiz "olmak" gibi. Tamamlanmış cümlede kişi biçimi gerekir: es.', trapType: 'grammar' },
                        { value: 'Está', reason: 'Está başka bir fiile, estar\'a aittir. O fiil yer ve geçici durum içindir, kalıcı bir nitelik için değil.', trapType: 'grammar' },
                    ],
                },
                {
                    correct: 'fácil', prompt: '"Kolay" anlamına hangi nitelik uyar?',
                    distractors: [
                        { value: 'fácilmente', reason: 'Fácilmente bir eylemi niteleyen zarf olarak "kolayca" demektir ("kolayca yaptı"). Şeyin kendisinin niteliği fácil\'dir.', trapType: 'grammar' },
                        { value: 'facilidad', reason: 'Facilidad "kolaylık" demektir, bir isimdir. Nitelik fácil\'dir.', trapType: 'grammar' },
                    ],
                },
            ],
        },
        pl: {
            meaning: 'To jest łatwe',
            explanation: 'Najczęstsza ocena czegokolwiek — zadania, języka, decyzji. Po polsku też zostawiamy tu czasownik ("to jest"), więc ta część jest znajoma — różnica jest w liczbie form w hiszpańskim.',
            distractors: [
                { value: 'Eres', reason: 'Eres to „ty”. Bezosobowa ocena o „tym” używa tylko es.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy dotyczy siebie. Ocena sytuacji nie dotyczy mówiącego — es.', trapType: 'grammar' },
                { value: 'Ser', reason: 'Ser to forma podstawowa, jak bezokolicznik „być”. Gotowe zdanie potrzebuje formy osobowej: es.', trapType: 'grammar' },
                { value: 'Está', reason: 'Está należy do innego czasownika, estar. Ten dotyczy miejsca i stanu tymczasowego, nie trwałej cechy.', trapType: 'grammar' },
                { value: 'fácilmente', reason: 'Fácilmente to „łatwo” jako przysłówek przy czynności („zrobił łatwo”). Cecha samej rzeczy to fácil.', trapType: 'grammar' },
                { value: 'facilidad', reason: 'Facilidad to „łatwość”, rzeczownik. Cecha to fácil.', trapType: 'grammar' },
            ],
            words: [
                {
                    correct: 'Es', prompt: 'Jakie słowo jest potrzebne przed cechą w bezosobowej ocenie?',
                    distractors: [
                        { value: 'Eres', reason: 'Eres to „ty”. Bezosobowa ocena o „tym” używa tylko es.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy dotyczy siebie. Ocena sytuacji nie dotyczy mówiącego — es.', trapType: 'grammar' },
                        { value: 'Ser', reason: 'Ser to forma podstawowa, jak bezokolicznik „być”. Gotowe zdanie potrzebuje formy osobowej: es.', trapType: 'grammar' },
                        { value: 'Está', reason: 'Está należy do innego czasownika, estar. Ten dotyczy miejsca i stanu tymczasowego, nie trwałej cechy.', trapType: 'grammar' },
                    ],
                },
                {
                    correct: 'fácil', prompt: 'Jaka cecha pasuje do znaczenia „łatwe”?',
                    distractors: [
                        { value: 'fácilmente', reason: 'Fácilmente to „łatwo” jako przysłówek przy czynności („zrobił łatwo”). Cecha samej rzeczy to fácil.', trapType: 'grammar' },
                        { value: 'facilidad', reason: 'Facilidad to „łatwość”, rzeczownik. Cecha to fácil.', trapType: 'grammar' },
                    ],
                },
            ],
        },
    },
    'es-e01-s01-soy-rapido': {
        ru: {
            meaning: 'Я быстрый', explanation: 'Так говорят о своём качестве — не о моменте, а вообще, всегда. Мужчина скажет rápido, женщина — rápida.', distractors: [
                { value: 'Eres', reason: 'Eres — это «ты». Про себя — soy.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es — про него, её или вежливое «вы». Про себя — soy.', trapType: 'grammar' },
                { value: 'Estoy', reason: 'Estoy — от estar, про временное состояние или место. Постоянное качество — soy.', trapType: 'grammar' },
                { value: 'rápida', reason: 'Rápida говорит о себе женщина. Здесь говорит мужчина.', trapType: 'grammar' },
                { value: 'rápidos', reason: 'Rápidos — про нескольких. Здесь один человек про себя.', trapType: 'grammar' },
                { value: 'rapidez', reason: 'Rapidez — «скорость», предмет. Признак человека — rápido.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Soy', prompt: 'Как сказать «я» перед качеством?', distractors: [
                        { value: 'Eres', reason: 'Eres — это «ты». Про себя — soy.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es — про него, её или вежливое «вы». Про себя — soy.', trapType: 'grammar' },
                        { value: 'Estoy', reason: 'Estoy — от estar, про временное состояние или место. Постоянное качество — soy.', trapType: 'grammar' },
                    ] },
                { correct: 'rápido', prompt: 'Какой признак значит «быстрый» (говорит мужчина)?', distractors: [
                        { value: 'rápida', reason: 'Rápida говорит о себе женщина. Здесь говорит мужчина.', trapType: 'grammar' },
                        { value: 'rápidos', reason: 'Rápidos — про нескольких. Здесь один человек про себя.', trapType: 'grammar' },
                        { value: 'rapidez', reason: 'Rapidez — «скорость», предмет. Признак человека — rápido.', trapType: 'grammar' },
                    ] },
            ],
        },
        uk: {
            meaning: 'Я швидкий', explanation: 'Так кажуть про свою якість — не про момент, а взагалі, завжди. Чоловік скаже rápido, жінка — rápida.', distractors: [
                { value: 'Eres', reason: 'Eres — це «ти». Про себе — soy.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es — про нього, її або ввічливе «ви». Про себе — soy.', trapType: 'grammar' },
                { value: 'Estoy', reason: 'Estoy — від estar, про тимчасовий стан або місце. Постійна якість — soy.', trapType: 'grammar' },
                { value: 'rápida', reason: 'Rápida каже про себе жінка. Тут каже чоловік.', trapType: 'grammar' },
                { value: 'rápidos', reason: 'Rápidos — про декількох. Тут одна людина про себе.', trapType: 'grammar' },
                { value: 'rapidez', reason: 'Rapidez — «швидкість», предмет. Ознака людини — rápido.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Soy', prompt: 'Як сказати «я» перед ознакою?', distractors: [
                        { value: 'Eres', reason: 'Eres — це «ти». Про себе — soy.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es — про нього, її або ввічливе «ви». Про себе — soy.', trapType: 'grammar' },
                        { value: 'Estoy', reason: 'Estoy — від estar, про тимчасовий стан або місце. Постійна якість — soy.', trapType: 'grammar' },
                    ] },
                { correct: 'rápido', prompt: 'Яка ознака означає «швидкий» (каже чоловік)?', distractors: [
                        { value: 'rápida', reason: 'Rápida каже про себе жінка. Тут каже чоловік.', trapType: 'grammar' },
                        { value: 'rápidos', reason: 'Rápidos — про декількох. Тут одна людина про себе.', trapType: 'grammar' },
                        { value: 'rapidez', reason: 'Rapidez — «швидкість», предмет. Ознака людини — rápido.', trapType: 'grammar' },
                    ] },
            ],
        },
        en: {
            meaning: 'I am fast', explanation: 'This is how you state a lasting quality about yourself — not a moment, but always. A man says rápido, a woman says rápida.', distractors: [
                { value: 'Eres', reason: 'Eres is “you”. About yourself — soy.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es is about him, her, or polite “you”. About yourself — soy.', trapType: 'grammar' },
                { value: 'Estoy', reason: 'Estoy belongs to estar, for a temporary state or place. A lasting quality — soy.', trapType: 'grammar' },
                { value: 'rápida', reason: 'Rápida is said by a woman about herself. Here a man is speaking.', trapType: 'grammar' },
                { value: 'rápidos', reason: 'Rápidos is about several people. Here one person speaks about himself.', trapType: 'grammar' },
                { value: 'rapidez', reason: 'Rapidez is “speed”, a noun. The quality of a person is rápido.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Soy', prompt: 'How do you say “I” before a quality?', distractors: [
                        { value: 'Eres', reason: 'Eres is “you”. About yourself — soy.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es is about him, her, or polite “you”. About yourself — soy.', trapType: 'grammar' },
                        { value: 'Estoy', reason: 'Estoy belongs to estar, for a temporary state or place. A lasting quality — soy.', trapType: 'grammar' },
                    ] },
                { correct: 'rápido', prompt: 'Which quality means “fast” (a man speaking)?', distractors: [
                        { value: 'rápida', reason: 'Rápida is said by a woman about herself. Here a man is speaking.', trapType: 'grammar' },
                        { value: 'rápidos', reason: 'Rápidos is about several people. Here one person speaks about himself.', trapType: 'grammar' },
                        { value: 'rapidez', reason: 'Rapidez is “speed”, a noun. The quality of a person is rápido.', trapType: 'grammar' },
                    ] },
            ],
        },
        'pt-BR': {
            meaning: 'Eu sou rápido', explanation: 'É assim que se afirma uma qualidade duradoura sobre si mesmo — não um momento, mas sempre. Um homem diz rápido, uma mulher diz rápida.', distractors: [
                { value: 'Eres', reason: 'Eres é “você”. Sobre si mesmo — soy.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es é sobre ele, ela ou “você” formal. Sobre si mesmo — soy.', trapType: 'grammar' },
                { value: 'Estoy', reason: 'Estoy pertence a estar, para estado temporário ou lugar. Qualidade duradoura — soy.', trapType: 'grammar' },
                { value: 'rápida', reason: 'Rápida é dito por uma mulher sobre si mesma. Aqui fala um homem.', trapType: 'grammar' },
                { value: 'rápidos', reason: 'Rápidos é sobre várias pessoas. Aqui uma pessoa fala de si mesma.', trapType: 'grammar' },
                { value: 'rapidez', reason: 'Rapidez é “velocidade”, um substantivo. A qualidade da pessoa é rápido.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Soy', prompt: 'Como se diz “eu” antes de uma qualidade?', distractors: [
                        { value: 'Eres', reason: 'Eres é “você”. Sobre si mesmo — soy.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es é sobre ele, ela ou “você” formal. Sobre si mesmo — soy.', trapType: 'grammar' },
                        { value: 'Estoy', reason: 'Estoy pertence a estar, para estado temporário ou lugar. Qualidade duradoura — soy.', trapType: 'grammar' },
                    ] },
                { correct: 'rápido', prompt: 'Qual qualidade significa “rápido” (fala um homem)?', distractors: [
                        { value: 'rápida', reason: 'Rápida é dito por uma mulher sobre si mesma. Aqui fala um homem.', trapType: 'grammar' },
                        { value: 'rápidos', reason: 'Rápidos é sobre várias pessoas. Aqui uma pessoa fala de si mesma.', trapType: 'grammar' },
                        { value: 'rapidez', reason: 'Rapidez é “velocidade”, um substantivo. A qualidade da pessoa é rápido.', trapType: 'grammar' },
                    ] },
            ],
        },
        vi: {
            meaning: 'Tôi nhanh', explanation: 'Đây là cách nói về một đặc điểm lâu dài của bản thân — không phải nhất thời, mà luôn luôn. Đàn ông nói rápido, phụ nữ nói rápida.', distractors: [
                { value: 'Eres', reason: 'Eres là “bạn”. Về bản thân — soy.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es là về anh ấy, cô ấy, hoặc “bạn” lịch sự. Về bản thân — soy.', trapType: 'grammar' },
                { value: 'Estoy', reason: 'Estoy thuộc động từ estar, dùng cho trạng thái tạm thời hoặc nơi chốn. Đặc điểm lâu dài — soy.', trapType: 'grammar' },
                { value: 'rápida', reason: 'Rápida là phụ nữ nói về bản thân. Ở đây đàn ông đang nói.', trapType: 'grammar' },
                { value: 'rápidos', reason: 'Rápidos là về nhiều người. Ở đây một người nói về bản thân.', trapType: 'grammar' },
                { value: 'rapidez', reason: 'Rapidez là “tốc độ”, danh từ. Đặc tính của người là rápido.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Soy', prompt: 'Nói “tôi” trước một tính từ như thế nào?', distractors: [
                        { value: 'Eres', reason: 'Eres là “bạn”. Về bản thân — soy.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es là về anh ấy, cô ấy, hoặc “bạn” lịch sự. Về bản thân — soy.', trapType: 'grammar' },
                        { value: 'Estoy', reason: 'Estoy thuộc động từ estar, dùng cho trạng thái tạm thời hoặc nơi chốn. Đặc điểm lâu dài — soy.', trapType: 'grammar' },
                    ] },
                { correct: 'rápido', prompt: 'Tính từ nào nghĩa là “nhanh” (đàn ông nói)?', distractors: [
                        { value: 'rápida', reason: 'Rápida là phụ nữ nói về bản thân. Ở đây đàn ông đang nói.', trapType: 'grammar' },
                        { value: 'rápidos', reason: 'Rápidos là về nhiều người. Ở đây một người nói về bản thân.', trapType: 'grammar' },
                        { value: 'rapidez', reason: 'Rapidez là “tốc độ”, danh từ. Đặc tính của người là rápido.', trapType: 'grammar' },
                    ] },
            ],
        },
        id: {
            meaning: 'Saya cepat', explanation: 'Begini cara menyatakan sifat yang bertahan tentang diri sendiri — bukan sesaat, tapi selalu. Laki-laki berkata rápido, perempuan berkata rápida.', distractors: [
                { value: 'Eres', reason: 'Eres berarti "kamu". Tentang diri sendiri — soy.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es tentang dia (laki-laki/perempuan) atau "Anda" formal. Tentang diri sendiri — soy.', trapType: 'grammar' },
                { value: 'Estoy', reason: 'Estoy berasal dari estar, untuk keadaan sementara atau tempat. Sifat yang bertahan — soy.', trapType: 'grammar' },
                { value: 'rápida', reason: 'Rápida diucapkan perempuan tentang dirinya. Di sini laki-laki yang berbicara.', trapType: 'grammar' },
                { value: 'rápidos', reason: 'Rápidos tentang beberapa orang. Di sini satu orang tentang dirinya.', trapType: 'grammar' },
                { value: 'rapidez', reason: 'Rapidez adalah "kecepatan", kata benda. Sifat orangnya adalah rápido.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Soy', prompt: 'Bagaimana mengatakan "saya" sebelum sebuah sifat?', distractors: [
                        { value: 'Eres', reason: 'Eres berarti "kamu". Tentang diri sendiri — soy.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es tentang dia (laki-laki/perempuan) atau "Anda" formal. Tentang diri sendiri — soy.', trapType: 'grammar' },
                        { value: 'Estoy', reason: 'Estoy berasal dari estar, untuk keadaan sementara atau tempat. Sifat yang bertahan — soy.', trapType: 'grammar' },
                    ] },
                { correct: 'rápido', prompt: 'Sifat mana yang berarti "cepat" (laki-laki berbicara)?', distractors: [
                        { value: 'rápida', reason: 'Rápida diucapkan perempuan tentang dirinya. Di sini laki-laki yang berbicara.', trapType: 'grammar' },
                        { value: 'rápidos', reason: 'Rápidos tentang beberapa orang. Di sini satu orang tentang dirinya.', trapType: 'grammar' },
                        { value: 'rapidez', reason: 'Rapidez adalah "kecepatan", kata benda. Sifat orangnya adalah rápido.', trapType: 'grammar' },
                    ] },
            ],
        },
        tr: {
            meaning: 'Ben hızlıyım', explanation: 'Kendiniz hakkında kalıcı bir niteliği böyle belirtirsiniz — bir an değil, her zaman. Erkek rápido, kadın rápida der.', distractors: [
                { value: 'Eres', reason: 'Eres "sen" demektir. Kendiniz hakkında — soy.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es o, o (kadın) veya nazik "siz" hakkındadır. Kendiniz hakkında — soy.', trapType: 'grammar' },
                { value: 'Estoy', reason: 'Estoy, estar fiiline aittir, geçici durum veya yer içindir. Kalıcı nitelik — soy.', trapType: 'grammar' },
                { value: 'rápida', reason: 'Rápida bir kadının kendisi için söylediği biçimdir. Burada bir erkek konuşuyor.', trapType: 'grammar' },
                { value: 'rápidos', reason: 'Rápidos birden fazla kişi hakkındadır. Burada bir kişi kendisi hakkında konuşuyor.', trapType: 'grammar' },
                { value: 'rapidez', reason: 'Rapidez "hız" demektir, bir isimdir. Kişinin niteliği rápido\'dur.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Soy', prompt: 'Bir nitelikten önce "ben" nasıl söylenir?', distractors: [
                        { value: 'Eres', reason: 'Eres "sen" demektir. Kendiniz hakkında — soy.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es o, o (kadın) veya nazik "siz" hakkındadır. Kendiniz hakkında — soy.', trapType: 'grammar' },
                        { value: 'Estoy', reason: 'Estoy, estar fiiline aittir, geçici durum veya yer içindir. Kalıcı nitelik — soy.', trapType: 'grammar' },
                    ] },
                { correct: 'rápido', prompt: '"Hızlı" anlamına hangi nitelik gelir (erkek konuşuyor)?', distractors: [
                        { value: 'rápida', reason: 'Rápida bir kadının kendisi için söylediği biçimdir. Burada bir erkek konuşuyor.', trapType: 'grammar' },
                        { value: 'rápidos', reason: 'Rápidos birden fazla kişi hakkındadır. Burada bir kişi kendisi hakkında konuşuyor.', trapType: 'grammar' },
                        { value: 'rapidez', reason: 'Rapidez "hız" demektir, bir isimdir. Kişinin niteliği rápido\'dur.', trapType: 'grammar' },
                    ] },
            ],
        },
        pl: {
            meaning: 'Jestem szybki', explanation: 'Tak mówi się o trwałej cesze samego siebie — nie o chwili, lecz zawsze. Mężczyzna powie rápido, kobieta — rápida.', distractors: [
                { value: 'Eres', reason: 'Eres to „ty”. O sobie — soy.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es dotyczy niego, jej albo grzecznościowego „pan/pani”. O sobie — soy.', trapType: 'grammar' },
                { value: 'Estoy', reason: 'Estoy należy do estar, dla stanu tymczasowego lub miejsca. Trwała cecha — soy.', trapType: 'grammar' },
                { value: 'rápida', reason: 'Rápida mówi o sobie kobieta. Tu mówi mężczyzna.', trapType: 'grammar' },
                { value: 'rápidos', reason: 'Rápidos dotyczy kilku osób. Tu jedna osoba mówi o sobie.', trapType: 'grammar' },
                { value: 'rapidez', reason: 'Rapidez to „szybkość”, rzeczownik. Cecha osoby to rápido.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Soy', prompt: 'Jak powiedzieć „ja” przed cechą?', distractors: [
                        { value: 'Eres', reason: 'Eres to „ty”. O sobie — soy.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es dotyczy niego, jej albo grzecznościowego „pan/pani”. O sobie — soy.', trapType: 'grammar' },
                        { value: 'Estoy', reason: 'Estoy należy do estar, dla stanu tymczasowego lub miejsca. Trwała cecha — soy.', trapType: 'grammar' },
                    ] },
                { correct: 'rápido', prompt: 'Jaka cecha znaczy „szybki” (mówi mężczyzna)?', distractors: [
                        { value: 'rápida', reason: 'Rápida mówi o sobie kobieta. Tu mówi mężczyzna.', trapType: 'grammar' },
                        { value: 'rápidos', reason: 'Rápidos dotyczy kilku osób. Tu jedna osoba mówi o sobie.', trapType: 'grammar' },
                        { value: 'rapidez', reason: 'Rapidez to „szybkość”, rzeczownik. Cecha osoby to rápido.', trapType: 'grammar' },
                    ] },
            ],
        },
    },
    'es-e01-s01-no-es-dificil': {
        ru: {
            meaning: 'Это не трудно', explanation: 'Отрицание в испанском простое: no ставится прямо перед глаголом. Difícil — противоположность fácil.', distractors: [
                { value: 'Nada', reason: 'Nada — «ничего», отдельное слово-предмет. Глагол отрицают через no.', trapType: 'grammar' },
                { value: 'Non', reason: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
                { value: 'fácil', reason: 'Fácil значит противоположное — «легко». Здесь нужно «трудно».', trapType: 'semantic_neighbor' },
                { value: 'dificultad', reason: 'Dificultad — «трудность», предмет. Признак — difícil.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Как отрицать глагол?', distractors: [
                        { value: 'Nada', reason: 'Nada — «ничего», отдельное слово-предмет. Глагол отрицают через no.', trapType: 'grammar' },
                        { value: 'Non', reason: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
                    ] },
                { correct: 'difícil', prompt: 'Какой признак значит «трудно»?', distractors: [
                        { value: 'fácil', reason: 'Fácil значит противоположное — «легко». Здесь нужно «трудно».', trapType: 'semantic_neighbor' },
                        { value: 'dificultad', reason: 'Dificultad — «трудность», предмет. Признак — difícil.', trapType: 'grammar' },
                    ] },
            ],
        },
        uk: {
            meaning: 'Це не важко', explanation: 'Заперечення в іспанській просте: no ставиться прямо перед дієсловом. Difícil — протилежність fácil.', distractors: [
                { value: 'Nada', reason: 'Nada — «нічого», окреме слово-предмет. Дієслово заперечують через no.', trapType: 'grammar' },
                { value: 'Non', reason: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', trapType: 'orthographic' },
                { value: 'fácil', reason: 'Fácil означає протилежне — «легко». Тут потрібно «важко».', trapType: 'semantic_neighbor' },
                { value: 'dificultad', reason: 'Dificultad — «труднощі», предмет. Ознака — difícil.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Як заперечити дієслово?', distractors: [
                        { value: 'Nada', reason: 'Nada — «нічого», окреме слово-предмет. Дієслово заперечують через no.', trapType: 'grammar' },
                        { value: 'Non', reason: 'Non — не іспанське слово. В іспанській заперечення пишеться no.', trapType: 'orthographic' },
                    ] },
                { correct: 'difícil', prompt: 'Яка ознака означає «важко»?', distractors: [
                        { value: 'fácil', reason: 'Fácil означає протилежне — «легко». Тут потрібно «важко».', trapType: 'semantic_neighbor' },
                        { value: 'dificultad', reason: 'Dificultad — «труднощі», предмет. Ознака — difícil.', trapType: 'grammar' },
                    ] },
            ],
        },
        en: {
            meaning: 'It is not hard', explanation: 'Negation in Spanish is simple: no goes right before the verb. Difícil is the opposite of fácil.', distractors: [
                { value: 'Nada', reason: 'Nada is “nothing”, a separate noun-like word. The verb is negated with no.', trapType: 'grammar' },
                { value: 'Non', reason: 'Non is not a Spanish word. The Spanish negation is spelled no.', trapType: 'orthographic' },
                { value: 'fácil', reason: 'Fácil means the opposite — “easy”. Here you need “hard”.', trapType: 'semantic_neighbor' },
                { value: 'dificultad', reason: 'Dificultad is “difficulty”, a noun. The quality is difícil.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'How do you negate the verb?', distractors: [
                        { value: 'Nada', reason: 'Nada is “nothing”, a separate noun-like word. The verb is negated with no.', trapType: 'grammar' },
                        { value: 'Non', reason: 'Non is not a Spanish word. The Spanish negation is spelled no.', trapType: 'orthographic' },
                    ] },
                { correct: 'difícil', prompt: 'Which quality means “hard”?', distractors: [
                        { value: 'fácil', reason: 'Fácil means the opposite — “easy”. Here you need “hard”.', trapType: 'semantic_neighbor' },
                        { value: 'dificultad', reason: 'Dificultad is “difficulty”, a noun. The quality is difícil.', trapType: 'grammar' },
                    ] },
            ],
        },
        'pt-BR': {
            meaning: 'Não é difícil', explanation: 'A negação em espanhol é simples: no fica logo antes do verbo. Difícil é o oposto de fácil.', distractors: [
                { value: 'Nada', reason: 'Nada é “nada”, uma palavra separada tipo substantivo. O verbo se nega com no.', trapType: 'grammar' },
                { value: 'Non', reason: 'Non não é uma palavra espanhola. A negação em espanhol se escreve no.', trapType: 'orthographic' },
                { value: 'fácil', reason: 'Fácil significa o oposto — “fácil”. Aqui precisa de “difícil”.', trapType: 'semantic_neighbor' },
                { value: 'dificultad', reason: 'Dificultad é “dificuldade”, um substantivo. A qualidade é difícil.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Como negar o verbo?', distractors: [
                        { value: 'Nada', reason: 'Nada é “nada”, uma palavra separada tipo substantivo. O verbo se nega com no.', trapType: 'grammar' },
                        { value: 'Non', reason: 'Non não é uma palavra espanhola. A negação em espanhol se escreve no.', trapType: 'orthographic' },
                    ] },
                { correct: 'difícil', prompt: 'Qual qualidade significa “difícil”?', distractors: [
                        { value: 'fácil', reason: 'Fácil significa o oposto — “fácil”. Aqui precisa de “difícil”.', trapType: 'semantic_neighbor' },
                        { value: 'dificultad', reason: 'Dificultad é “dificuldade”, um substantivo. A qualidade é difícil.', trapType: 'grammar' },
                    ] },
            ],
        },
        vi: {
            meaning: 'Điều này không khó', explanation: 'Phủ định trong tiếng Tây Ban Nha đơn giản: no đứng ngay trước động từ. Difícil là trái nghĩa của fácil.', distractors: [
                { value: 'Nada', reason: 'Nada là “không có gì”, một từ riêng giống danh từ. Động từ được phủ định bằng no.', trapType: 'grammar' },
                { value: 'Non', reason: 'Non không phải từ tiếng Tây Ban Nha. Phủ định trong tiếng Tây Ban Nha viết là no.', trapType: 'orthographic' },
                { value: 'fácil', reason: 'Fácil nghĩa ngược lại — “dễ”. Ở đây cần “khó”.', trapType: 'semantic_neighbor' },
                { value: 'dificultad', reason: 'Dificultad là “sự khó khăn”, danh từ. Đặc tính là difícil.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Làm sao để phủ định động từ?', distractors: [
                        { value: 'Nada', reason: 'Nada là “không có gì”, một từ riêng giống danh từ. Động từ được phủ định bằng no.', trapType: 'grammar' },
                        { value: 'Non', reason: 'Non không phải từ tiếng Tây Ban Nha. Phủ định trong tiếng Tây Ban Nha viết là no.', trapType: 'orthographic' },
                    ] },
                { correct: 'difícil', prompt: 'Tính từ nào nghĩa là “khó”?', distractors: [
                        { value: 'fácil', reason: 'Fácil nghĩa ngược lại — “dễ”. Ở đây cần “khó”.', trapType: 'semantic_neighbor' },
                        { value: 'dificultad', reason: 'Dificultad là “sự khó khăn”, danh từ. Đặc tính là difícil.', trapType: 'grammar' },
                    ] },
            ],
        },
        id: {
            meaning: 'Ini tidak sulit', explanation: 'Penyangkalan dalam bahasa Spanyol sederhana: no diletakkan tepat sebelum kata kerja. Difícil adalah lawan dari fácil.', distractors: [
                { value: 'Nada', reason: 'Nada berarti "tidak ada apa-apa", kata terpisah seperti kata benda. Kata kerja disangkal dengan no.', trapType: 'grammar' },
                { value: 'Non', reason: 'Non bukan kata bahasa Spanyol. Penyangkalan bahasa Spanyol ditulis no.', trapType: 'orthographic' },
                { value: 'fácil', reason: 'Fácil berarti kebalikannya — "mudah". Di sini perlu "sulit".', trapType: 'semantic_neighbor' },
                { value: 'dificultad', reason: 'Dificultad adalah "kesulitan", kata benda. Sifatnya adalah difícil.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Bagaimana menyangkal kata kerja?', distractors: [
                        { value: 'Nada', reason: 'Nada berarti "tidak ada apa-apa", kata terpisah seperti kata benda. Kata kerja disangkal dengan no.', trapType: 'grammar' },
                        { value: 'Non', reason: 'Non bukan kata bahasa Spanyol. Penyangkalan bahasa Spanyol ditulis no.', trapType: 'orthographic' },
                    ] },
                { correct: 'difícil', prompt: 'Sifat mana yang berarti "sulit"?', distractors: [
                        { value: 'fácil', reason: 'Fácil berarti kebalikannya — "mudah". Di sini perlu "sulit".', trapType: 'semantic_neighbor' },
                        { value: 'dificultad', reason: 'Dificultad adalah "kesulitan", kata benda. Sifatnya adalah difícil.', trapType: 'grammar' },
                    ] },
            ],
        },
        tr: {
            meaning: 'Bu zor değil', explanation: 'İspanyolcada olumsuzluk basittir: no fiilin hemen önüne gelir. Difícil, fácil\'in zıttıdır.', distractors: [
                { value: 'Nada', reason: 'Nada "hiçbir şey" demektir, isim gibi ayrı bir kelimedir. Fiil no ile olumsuz yapılır.', trapType: 'grammar' },
                { value: 'Non', reason: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzluk no şeklinde yazılır.', trapType: 'orthographic' },
                { value: 'fácil', reason: 'Fácil zıt anlama gelir — "kolay". Burada "zor" gerekir.', trapType: 'semantic_neighbor' },
                { value: 'dificultad', reason: 'Dificultad "zorluk" demektir, bir isimdir. Nitelik difícil\'dir.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Fiil nasıl olumsuz yapılır?', distractors: [
                        { value: 'Nada', reason: 'Nada "hiçbir şey" demektir, isim gibi ayrı bir kelimedir. Fiil no ile olumsuz yapılır.', trapType: 'grammar' },
                        { value: 'Non', reason: 'Non İspanyolca bir kelime değildir. İspanyolca olumsuzluk no şeklinde yazılır.', trapType: 'orthographic' },
                    ] },
                { correct: 'difícil', prompt: '"Zor" anlamına hangi nitelik gelir?', distractors: [
                        { value: 'fácil', reason: 'Fácil zıt anlama gelir — "kolay". Burada "zor" gerekir.', trapType: 'semantic_neighbor' },
                        { value: 'dificultad', reason: 'Dificultad "zorluk" demektir, bir isimdir. Nitelik difícil\'dir.', trapType: 'grammar' },
                    ] },
            ],
        },
        pl: {
            meaning: 'To nie jest trudne', explanation: 'Przeczenie w hiszpańskim jest proste: no stoi tuż przed czasownikiem. Difícil to przeciwieństwo fácil.', distractors: [
                { value: 'Nada', reason: 'Nada to „nic”, osobne słowo jak rzeczownik. Czasownik zaprzecza się przez no.', trapType: 'grammar' },
                { value: 'Non', reason: 'Non nie jest słowem hiszpańskim. Hiszpańskie przeczenie pisze się no.', trapType: 'orthographic' },
                { value: 'fácil', reason: 'Fácil znaczy przeciwnie — „łatwe”. Tu potrzeba „trudne”.', trapType: 'semantic_neighbor' },
                { value: 'dificultad', reason: 'Dificultad to „trudność”, rzeczownik. Cecha to difícil.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Jak zaprzeczyć czasownikowi?', distractors: [
                        { value: 'Nada', reason: 'Nada to „nic”, osobne słowo jak rzeczownik. Czasownik zaprzecza się przez no.', trapType: 'grammar' },
                        { value: 'Non', reason: 'Non nie jest słowem hiszpańskim. Hiszpańskie przeczenie pisze się no.', trapType: 'orthographic' },
                    ] },
                { correct: 'difícil', prompt: 'Jaka cecha znaczy „trudne”?', distractors: [
                        { value: 'fácil', reason: 'Fácil znaczy przeciwnie — „łatwe”. Tu potrzeba „trudne”.', trapType: 'semantic_neighbor' },
                        { value: 'dificultad', reason: 'Dificultad to „trudność”, rzeczownik. Cecha to difícil.', trapType: 'grammar' },
                    ] },
            ],
        },
    },
    'es-e01-s01-es-verdad': {
        ru: { meaning: 'Это правда', explanation: 'Так подтверждают чужие слова в разговоре. Verdad — существительное, но с ser работает как оценка.', distractors: [
                { value: 'Eres', reason: 'Eres — это «ты». Про «это» (безличную оценку) — только es.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy — про себя. Оценка ситуации не о говорящем — es.', trapType: 'grammar' },
                { value: 'verdadero', reason: 'Verdadero — «истинный» как признак предмета. Устойчивая реакция — именно es verdad.', trapType: 'grammar' },
                { value: 'verdadera', reason: 'Verdadera — то же прилагательное в женском роде. Здесь нужно существительное verdad, не прилагательное.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Es', prompt: 'Какое слово нужно перед признаком в безличной оценке?', distractors: [
                        { value: 'Eres', reason: 'Eres — это «ты». Про «это» (безличную оценку) — только es.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy — про себя. Оценка ситуации не о говорящем — es.', trapType: 'grammar' },
                    ] },
                { correct: 'verdad', prompt: 'Каким словом подтвердить чужие слова?', distractors: [
                        { value: 'verdadero', reason: 'Verdadero — «истинный» как признак предмета. Устойчивая реакция — именно es verdad.', trapType: 'grammar' },
                        { value: 'verdadera', reason: 'Verdadera — то же прилагательное в женском роде. Здесь нужно существительное verdad, не прилагательное.', trapType: 'grammar' },
                    ] }
            ] },
        uk: { meaning: 'Це правда', explanation: 'Так підтверджують чужі слова в розмові. Verdad — іменник, але з ser працює як оцінка.', distractors: [
                { value: 'Eres', reason: 'Eres — це «ти». Про «це» (безособову оцінку) — тільки es.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy — про себе. Оцінка ситуації не про мовця — es.', trapType: 'grammar' },
                { value: 'verdadero', reason: 'Verdadero — «істинний» як ознака предмета. Стійка реакція — саме es verdad.', trapType: 'grammar' },
                { value: 'verdadera', reason: 'Verdadera — той самий прикметник у жіночому роді. Тут потрібен іменник verdad, не прикметник.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Es', prompt: 'Яке слово потрібне перед ознакою в безособовій оцінці?', distractors: [
                        { value: 'Eres', reason: 'Eres — це «ти». Про «це» (безособову оцінку) — тільки es.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy — про себе. Оцінка ситуації не про мовця — es.', trapType: 'grammar' },
                    ] },
                { correct: 'verdad', prompt: 'Яким словом підтвердити чужі слова?', distractors: [
                        { value: 'verdadero', reason: 'Verdadero — «істинний» як ознака предмета. Стійка реакція — саме es verdad.', trapType: 'grammar' },
                        { value: 'verdadera', reason: 'Verdadera — той самий прикметник у жіночому роді. Тут потрібен іменник verdad, не прикметник.', trapType: 'grammar' },
                    ] }
            ] },
        en: { meaning: 'That is true', explanation: 'This is how you confirm someone else’s words. Verdad is a noun, but with ser it works as a verdict.', distractors: [
                { value: 'Eres', reason: 'Eres is “you”. For “this” (an impersonal verdict), only es works.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy is about yourself. A verdict about the situation is not about the speaker — es.', trapType: 'grammar' },
                { value: 'verdadero', reason: 'Verdadero is “true” as a quality of a thing. The fixed reaction is exactly es verdad.', trapType: 'grammar' },
                { value: 'verdadera', reason: 'Verdadera is the same adjective in feminine form. Here you need the noun verdad, not an adjective.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Es', prompt: 'Which word goes before a quality in an impersonal verdict?', distractors: [
                        { value: 'Eres', reason: 'Eres is “you”. For “this” (an impersonal verdict), only es works.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy is about yourself. A verdict about the situation is not about the speaker — es.', trapType: 'grammar' },
                    ] },
                { correct: 'verdad', prompt: 'Which word confirms someone else’s statement?', distractors: [
                        { value: 'verdadero', reason: 'Verdadero is “true” as a quality of a thing. The fixed reaction is exactly es verdad.', trapType: 'grammar' },
                        { value: 'verdadera', reason: 'Verdadera is the same adjective in feminine form. Here you need the noun verdad, not an adjective.', trapType: 'grammar' },
                    ] }
            ] },
        'pt-BR': { meaning: 'Isso é verdade', explanation: 'É assim que se confirma o que outra pessoa disse. Verdad é substantivo, mas com ser funciona como um veredito.', distractors: [
                { value: 'Eres', reason: 'Eres é “você”. Para “isso” (um veredito impessoal), só es funciona.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy é sobre você mesmo. Um veredito sobre a situação não é sobre quem fala — es.', trapType: 'grammar' },
                { value: 'verdadero', reason: 'Verdadero é “verdadeiro” como qualidade de uma coisa. A reação fixa é exatamente es verdad.', trapType: 'grammar' },
                { value: 'verdadera', reason: 'Verdadera é o mesmo adjetivo no feminino. Aqui precisa do substantivo verdad, não de um adjetivo.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Es', prompt: 'Qual palavra vem antes de uma qualidade num veredito impessoal?', distractors: [
                        { value: 'Eres', reason: 'Eres é “você”. Para “isso” (um veredito impessoal), só es funciona.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy é sobre você mesmo. Um veredito sobre a situação não é sobre quem fala — es.', trapType: 'grammar' },
                    ] },
                { correct: 'verdad', prompt: 'Qual palavra confirma o que outra pessoa disse?', distractors: [
                        { value: 'verdadero', reason: 'Verdadero é “verdadeiro” como qualidade de uma coisa. A reação fixa é exatamente es verdad.', trapType: 'grammar' },
                        { value: 'verdadera', reason: 'Verdadera é o mesmo adjetivo no feminino. Aqui precisa do substantivo verdad, não de um adjetivo.', trapType: 'grammar' },
                    ] }
            ] },
        vi: { meaning: 'Điều đó đúng', explanation: 'Đây là cách xác nhận lời người khác. Verdad là danh từ, nhưng đi với ser thì hoạt động như một nhận định.', distractors: [
                { value: 'Eres', reason: 'Eres nghĩa là “bạn”. Với “điều này” (nhận định vô nhân xưng), chỉ es mới đúng.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy là nói về bản thân. Nhận định về tình huống không phải về người nói — es.', trapType: 'grammar' },
                { value: 'verdadero', reason: 'Verdadero là “đúng thật” như một đặc tính của sự vật. Phản ứng cố định chính là es verdad.', trapType: 'grammar' },
                { value: 'verdadera', reason: 'Verdadera là cùng một tính từ ở dạng giống cái. Ở đây cần danh từ verdad, không phải tính từ.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Es', prompt: 'Từ nào đứng trước một đặc điểm trong một nhận định vô nhân xưng?', distractors: [
                        { value: 'Eres', reason: 'Eres nghĩa là “bạn”. Với “điều này” (nhận định vô nhân xưng), chỉ es mới đúng.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy là nói về bản thân. Nhận định về tình huống không phải về người nói — es.', trapType: 'grammar' },
                    ] },
                { correct: 'verdad', prompt: 'Từ nào xác nhận lời người khác?', distractors: [
                        { value: 'verdadero', reason: 'Verdadero là “đúng thật” như một đặc tính của sự vật. Phản ứng cố định chính là es verdad.', trapType: 'grammar' },
                        { value: 'verdadera', reason: 'Verdadera là cùng một tính từ ở dạng giống cái. Ở đây cần danh từ verdad, không phải tính từ.', trapType: 'grammar' },
                    ] }
            ] },
        id: { meaning: 'Itu benar', explanation: 'Begini cara menegaskan kata-kata orang lain. Verdad adalah kata benda, tapi dengan ser berfungsi sebagai penilaian.', distractors: [
                { value: 'Eres', reason: 'Eres berarti "kamu". Untuk "ini" (penilaian impersonal), hanya es yang tepat.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy tentang diri sendiri. Penilaian tentang situasi bukan tentang penutur — es.', trapType: 'grammar' },
                { value: 'verdadero', reason: 'Verdadero adalah "benar" sebagai sifat suatu benda. Reaksi tetapnya adalah es verdad.', trapType: 'grammar' },
                { value: 'verdadera', reason: 'Verdadera adalah kata sifat yang sama dalam bentuk feminin. Di sini perlu kata benda verdad, bukan kata sifat.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Es', prompt: 'Kata mana yang muncul sebelum sebuah sifat dalam penilaian impersonal?', distractors: [
                        { value: 'Eres', reason: 'Eres berarti "kamu". Untuk "ini" (penilaian impersonal), hanya es yang tepat.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy tentang diri sendiri. Penilaian tentang situasi bukan tentang penutur — es.', trapType: 'grammar' },
                    ] },
                { correct: 'verdad', prompt: 'Kata mana yang menegaskan perkataan orang lain?', distractors: [
                        { value: 'verdadero', reason: 'Verdadero adalah "benar" sebagai sifat suatu benda. Reaksi tetapnya adalah es verdad.', trapType: 'grammar' },
                        { value: 'verdadera', reason: 'Verdadera adalah kata sifat yang sama dalam bentuk feminin. Di sini perlu kata benda verdad, bukan kata sifat.', trapType: 'grammar' },
                    ] }
            ] },
        tr: { meaning: 'Bu doğru', explanation: 'Başkasının sözlerini böyle doğrularsınız. Verdad bir isimdir, ama ser ile bir yargı gibi çalışır.', distractors: [
                { value: 'Eres', reason: 'Eres "sen" demektir. "Bu" hakkında kişisiz bir yargıda sadece es kullanılır.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy kendiniz hakkındadır. Durum hakkındaki bir yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
                { value: 'verdadero', reason: 'Verdadero bir şeyin niteliği olarak "doğru" demektir. Sabit tepki tam olarak es verdad\'dır.', trapType: 'grammar' },
                { value: 'verdadera', reason: 'Verdadera aynı sıfatın dişil biçimidir. Burada sıfat değil, verdad ismi gerekir.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Es', prompt: 'Kişisiz bir yargıda nitelikten önce hangi kelime gelir?', distractors: [
                        { value: 'Eres', reason: 'Eres "sen" demektir. "Bu" hakkında kişisiz bir yargıda sadece es kullanılır.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy kendiniz hakkındadır. Durum hakkındaki bir yargı konuşan hakkında değildir — es.', trapType: 'grammar' },
                    ] },
                { correct: 'verdad', prompt: 'Başkasının sözünü hangi kelimeyle doğrularsınız?', distractors: [
                        { value: 'verdadero', reason: 'Verdadero bir şeyin niteliği olarak "doğru" demektir. Sabit tepki tam olarak es verdad\'dır.', trapType: 'grammar' },
                        { value: 'verdadera', reason: 'Verdadera aynı sıfatın dişil biçimidir. Burada sıfat değil, verdad ismi gerekir.', trapType: 'grammar' },
                    ] }
            ] },
        pl: { meaning: 'To prawda', explanation: 'Tak potwierdza się czyjeś słowa. Verdad to rzeczownik, ale z ser działa jak osąd.', distractors: [
                { value: 'Eres', reason: 'Eres to „ty”. Dla „to” (bezosobowy osąd) pasuje tylko es.', trapType: 'grammar' },
                { value: 'Soy', reason: 'Soy dotyczy ciebie samego. Osąd o sytuacji nie dotyczy mówiącego — es.', trapType: 'grammar' },
                { value: 'verdadero', reason: 'Verdadero to „prawdziwy” jako cecha przedmiotu. Stała reakcja to dokładnie es verdad.', trapType: 'grammar' },
                { value: 'verdadera', reason: 'Verdadera to ten sam przymiotnik w rodzaju żeńskim. Tu potrzebny jest rzeczownik verdad, nie przymiotnik.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'Es', prompt: 'Które słowo stoi przed cechą w bezosobowym osądzie?', distractors: [
                        { value: 'Eres', reason: 'Eres to „ty”. Dla „to” (bezosobowy osąd) pasuje tylko es.', trapType: 'grammar' },
                        { value: 'Soy', reason: 'Soy dotyczy ciebie samego. Osąd o sytuacji nie dotyczy mówiącego — es.', trapType: 'grammar' },
                    ] },
                { correct: 'verdad', prompt: 'Jakim słowem potwierdzić czyjeś słowa?', distractors: [
                        { value: 'verdadero', reason: 'Verdadero to „prawdziwy” jako cecha przedmiotu. Stała reakcja to dokładnie es verdad.', trapType: 'grammar' },
                        { value: 'verdadera', reason: 'Verdadera to ten sam przymiotnik w rodzaju żeńskim. Tu potrzebny jest rzeczownik verdad, nie przymiotnik.', trapType: 'grammar' },
                    ] }
            ] },
    },
    'es-e01-s01-no-es-asi': {
        ru: { meaning: 'Это не так', explanation: 'Вежливое возражение, когда не согласен. Así — «так», способ, а не предмет.', distractors: [
                { value: 'esto', reason: 'Esto — «это» как предмет. Способ, «так» — así.', trapType: 'semantic_neighbor' },
                { value: 'aquí', reason: 'Aquí — «здесь», про место. Здесь нужно «так», способ — así.', trapType: 'semantic_neighbor' },
            ],
            words: [{ correct: 'así', prompt: 'Каким словом сказать «так»?', distractors: [
                        { value: 'esto', reason: 'Esto — «это» как предмет. Способ, «так» — así.', trapType: 'semantic_neighbor' },
                        { value: 'aquí', reason: 'Aquí — «здесь», про место. Здесь нужно «так», способ — así.', trapType: 'semantic_neighbor' },
                    ] }] },
        uk: { meaning: 'Це не так', explanation: 'Ввічливе заперечення, коли не згоден. Así — «так», спосіб, а не предмет.', distractors: [
                { value: 'esto', reason: 'Esto — «це» як предмет. Спосіб, «так» — así.', trapType: 'semantic_neighbor' },
                { value: 'aquí', reason: 'Aquí — «тут», про місце. Тут потрібно «так», спосіб — así.', trapType: 'semantic_neighbor' },
            ],
            words: [{ correct: 'así', prompt: 'Яким словом сказати «так»?', distractors: [
                        { value: 'esto', reason: 'Esto — «це» як предмет. Спосіб, «так» — así.', trapType: 'semantic_neighbor' },
                        { value: 'aquí', reason: 'Aquí — «тут», про місце. Тут потрібно «так», спосіб — así.', trapType: 'semantic_neighbor' },
                    ] }] },
        en: { meaning: 'That is not so', explanation: 'A polite way to disagree. Así means “so, like this” — a manner, not a thing.', distractors: [
                { value: 'esto', reason: 'Esto is “this” as a thing. The manner, “so”, is así.', trapType: 'semantic_neighbor' },
                { value: 'aquí', reason: 'Aquí is “here”, about place. Here you need “so”, a manner — así.', trapType: 'semantic_neighbor' },
            ],
            words: [{ correct: 'así', prompt: 'Which word means “so”?', distractors: [
                        { value: 'esto', reason: 'Esto is “this” as a thing. The manner, “so”, is así.', trapType: 'semantic_neighbor' },
                        { value: 'aquí', reason: 'Aquí is “here”, about place. Here you need “so”, a manner — así.', trapType: 'semantic_neighbor' },
                    ] }] },
        'pt-BR': { meaning: 'Não é assim', explanation: 'Uma forma educada de discordar. Así significa “assim” — um modo, não uma coisa.', distractors: [
                { value: 'esto', reason: 'Esto é “isto” como uma coisa. O modo, “assim”, é así.', trapType: 'semantic_neighbor' },
                { value: 'aquí', reason: 'Aquí é “aqui”, sobre lugar. Aqui precisa de “assim”, um modo — así.', trapType: 'semantic_neighbor' },
            ],
            words: [{ correct: 'así', prompt: 'Qual palavra significa “assim”?', distractors: [
                        { value: 'esto', reason: 'Esto é “isto” como uma coisa. O modo, “assim”, é así.', trapType: 'semantic_neighbor' },
                        { value: 'aquí', reason: 'Aquí é “aqui”, sobre lugar. Aqui precisa de “assim”, um modo — así.', trapType: 'semantic_neighbor' },
                    ] }] },
        vi: { meaning: 'Không phải vậy', explanation: 'Cách phản đối lịch sự khi không đồng ý. Así nghĩa là “vậy, thế này” — cách thức, không phải sự vật.', distractors: [
                { value: 'esto', reason: 'Esto là “điều này” như một sự vật. Cách thức, “vậy”, là así.', trapType: 'semantic_neighbor' },
                { value: 'aquí', reason: 'Aquí là “ở đây”, về nơi chốn. Ở đây cần “vậy”, cách thức — así.', trapType: 'semantic_neighbor' },
            ],
            words: [{ correct: 'así', prompt: 'Từ nào nghĩa là “vậy”?', distractors: [
                        { value: 'esto', reason: 'Esto là “điều này” như một sự vật. Cách thức, “vậy”, là así.', trapType: 'semantic_neighbor' },
                        { value: 'aquí', reason: 'Aquí là “ở đây”, về nơi chốn. Ở đây cần “vậy”, cách thức — así.', trapType: 'semantic_neighbor' },
                    ] }] },
        id: { meaning: 'Bukan begitu', explanation: 'Cara sopan untuk tidak setuju. Así berarti "begitu, seperti ini" — cara, bukan benda.', distractors: [
                { value: 'esto', reason: 'Esto adalah "ini" sebagai benda. Cara, "begitu", adalah así.', trapType: 'semantic_neighbor' },
                { value: 'aquí', reason: 'Aquí adalah "di sini", tentang tempat. Di sini perlu "begitu", cara — así.', trapType: 'semantic_neighbor' },
            ],
            words: [{ correct: 'así', prompt: 'Kata mana yang berarti "begitu"?', distractors: [
                        { value: 'esto', reason: 'Esto adalah "ini" sebagai benda. Cara, "begitu", adalah así.', trapType: 'semantic_neighbor' },
                        { value: 'aquí', reason: 'Aquí adalah "di sini", tentang tempat. Di sini perlu "begitu", cara — así.', trapType: 'semantic_neighbor' },
                    ] }] },
        tr: { meaning: 'Öyle değil', explanation: 'Katılmadığınızda kullanılan kibar bir itiraz biçimi. Así "öyle, bu şekilde" demektir — bir tarzdır, nesne değil.', distractors: [
                { value: 'esto', reason: 'Esto bir nesne olarak "bu" demektir. Tarz, "öyle", así\'dir.', trapType: 'semantic_neighbor' },
                { value: 'aquí', reason: 'Aquí yer hakkında "burada" demektir. Burada "öyle", bir tarz gerekir — así.', trapType: 'semantic_neighbor' },
            ],
            words: [{ correct: 'así', prompt: '"Öyle" anlamına hangi kelime gelir?', distractors: [
                        { value: 'esto', reason: 'Esto bir nesne olarak "bu" demektir. Tarz, "öyle", así\'dir.', trapType: 'semantic_neighbor' },
                        { value: 'aquí', reason: 'Aquí yer hakkında "burada" demektir. Burada "öyle", bir tarz gerekir — así.', trapType: 'semantic_neighbor' },
                    ] }] },
        pl: { meaning: 'To nie tak', explanation: 'Grzeczny sposób na niezgodę. Así znaczy „tak, w ten sposób” — sposób, nie rzecz.', distractors: [
                { value: 'esto', reason: 'Esto to „to” jako rzecz. Sposób, „tak”, to así.', trapType: 'semantic_neighbor' },
                { value: 'aquí', reason: 'Aquí to „tutaj”, o miejscu. Tu potrzeba „tak”, sposobu — así.', trapType: 'semantic_neighbor' },
            ],
            words: [{ correct: 'así', prompt: 'Które słowo znaczy „tak”?', distractors: [
                        { value: 'esto', reason: 'Esto to „to” jako rzecz. Sposób, „tak”, to así.', trapType: 'semantic_neighbor' },
                        { value: 'aquí', reason: 'Aquí to „tutaj”, o miejscu. Tu potrzeba „tak”, sposobu — así.', trapType: 'semantic_neighbor' },
                    ] }] },
    },
    'es-e01-s01-es-igual': {
        ru: { meaning: 'Это всё равно', explanation: 'Так говорят, когда выбор не важен. Igual не меняется по роду.', distractors: [
                { value: 'iguala', reason: 'Igual не меняется по роду — формы iguala не существует.', trapType: 'grammar' },
                { value: 'igualmente', reason: 'Igualmente — «равным образом» при действии. Признак ситуации — igual.', trapType: 'grammar' },
            ],
            words: [{ correct: 'igual', prompt: 'Каким словом сказать «всё равно»?', distractors: [
                        { value: 'iguala', reason: 'Igual не меняется по роду — формы iguala не существует.', trapType: 'grammar' },
                        { value: 'igualmente', reason: 'Igualmente — «равным образом» при действии. Признак ситуации — igual.', trapType: 'grammar' },
                    ] }] },
        uk: { meaning: 'Це байдуже', explanation: 'Так кажуть, коли вибір не важливий. Igual не змінюється за родом.', distractors: [
                { value: 'iguala', reason: 'Igual не змінюється за родом — форми iguala не існує.', trapType: 'grammar' },
                { value: 'igualmente', reason: 'Igualmente — «рівним чином» при дії. Ознака ситуації — igual.', trapType: 'grammar' },
            ],
            words: [{ correct: 'igual', prompt: 'Яким словом сказати «байдуже»?', distractors: [
                        { value: 'iguala', reason: 'Igual не змінюється за родом — форми iguala не існує.', trapType: 'grammar' },
                        { value: 'igualmente', reason: 'Igualmente — «рівним чином» при дії. Ознака ситуації — igual.', trapType: 'grammar' },
                    ] }] },
        en: { meaning: 'It does not matter', explanation: 'This is said when a choice does not matter. Igual does not change for gender.', distractors: [
                { value: 'iguala', reason: 'Igual does not change for gender — the form iguala does not exist.', trapType: 'grammar' },
                { value: 'igualmente', reason: 'Igualmente is “equally” describing an action. The quality of the situation is igual.', trapType: 'grammar' },
            ],
            words: [{ correct: 'igual', prompt: 'Which word means “it does not matter”?', distractors: [
                        { value: 'iguala', reason: 'Igual does not change for gender — the form iguala does not exist.', trapType: 'grammar' },
                        { value: 'igualmente', reason: 'Igualmente is “equally” describing an action. The quality of the situation is igual.', trapType: 'grammar' },
                    ] }] },
        'pt-BR': { meaning: 'Tanto faz', explanation: 'Diz-se isso quando a escolha não importa. Igual não muda de gênero.', distractors: [
                { value: 'iguala', reason: 'Igual não muda de gênero — a forma iguala não existe.', trapType: 'grammar' },
                { value: 'igualmente', reason: 'Igualmente é “igualmente” descrevendo uma ação. A qualidade da situação é igual.', trapType: 'grammar' },
            ],
            words: [{ correct: 'igual', prompt: 'Qual palavra significa “tanto faz”?', distractors: [
                        { value: 'iguala', reason: 'Igual não muda de gênero — a forma iguala não existe.', trapType: 'grammar' },
                        { value: 'igualmente', reason: 'Igualmente é “igualmente” descrevendo uma ação. A qualidade da situação é igual.', trapType: 'grammar' },
                    ] }] },
        vi: { meaning: 'Sao cũng được', explanation: 'Nói khi lựa chọn không quan trọng. Igual không đổi theo giống.', distractors: [
                { value: 'iguala', reason: 'Igual không đổi theo giống — dạng iguala không tồn tại.', trapType: 'grammar' },
                { value: 'igualmente', reason: 'Igualmente là “như nhau” mô tả một hành động. Đặc tính của tình huống là igual.', trapType: 'grammar' },
            ],
            words: [{ correct: 'igual', prompt: 'Từ nào nghĩa là “sao cũng được”?', distractors: [
                        { value: 'iguala', reason: 'Igual không đổi theo giống — dạng iguala không tồn tại.', trapType: 'grammar' },
                        { value: 'igualmente', reason: 'Igualmente là “như nhau” mô tả một hành động. Đặc tính của tình huống là igual.', trapType: 'grammar' },
                    ] }] },
        id: { meaning: 'Sama saja', explanation: 'Dikatakan ketika pilihan tidak penting. Igual tidak berubah menurut gender.', distractors: [
                { value: 'iguala', reason: 'Igual tidak berubah menurut gender — bentuk iguala tidak ada.', trapType: 'grammar' },
                { value: 'igualmente', reason: 'Igualmente adalah "secara sama" menggambarkan tindakan. Sifat situasi adalah igual.', trapType: 'grammar' },
            ],
            words: [{ correct: 'igual', prompt: 'Kata mana yang berarti "sama saja"?', distractors: [
                        { value: 'iguala', reason: 'Igual tidak berubah menurut gender — bentuk iguala tidak ada.', trapType: 'grammar' },
                        { value: 'igualmente', reason: 'Igualmente adalah "secara sama" menggambarkan tindakan. Sifat situasi adalah igual.', trapType: 'grammar' },
                    ] }] },
        tr: { meaning: 'Fark etmez', explanation: 'Seçim önemli olmadığında böyle denir. Igual cinsiyete göre değişmez.', distractors: [
                { value: 'iguala', reason: 'Igual cinsiyete göre değişmez — iguala biçimi yoktur.', trapType: 'grammar' },
                { value: 'igualmente', reason: 'Igualmente bir eylemi niteleyen "eşit şekilde" demektir. Durumun niteliği igual\'dir.', trapType: 'grammar' },
            ],
            words: [{ correct: 'igual', prompt: '"Fark etmez" anlamına hangi kelime gelir?', distractors: [
                        { value: 'iguala', reason: 'Igual cinsiyete göre değişmez — iguala biçimi yoktur.', trapType: 'grammar' },
                        { value: 'igualmente', reason: 'Igualmente bir eylemi niteleyen "eşit şekilde" demektir. Durumun niteliği igual\'dir.', trapType: 'grammar' },
                    ] }] },
        pl: { meaning: 'Wszystko jedno', explanation: 'Tak mówi się, gdy wybór nie ma znaczenia. Igual nie zmienia się przez rodzaj.', distractors: [
                { value: 'iguala', reason: 'Igual nie zmienia się przez rodzaj — forma iguala nie istnieje.', trapType: 'grammar' },
                { value: 'igualmente', reason: 'Igualmente to „równie” opisujące czynność. Cecha sytuacji to igual.', trapType: 'grammar' },
            ],
            words: [{ correct: 'igual', prompt: 'Które słowo znaczy „wszystko jedno”?', distractors: [
                        { value: 'iguala', reason: 'Igual nie zmienia się przez rodzaj — forma iguala nie istnieje.', trapType: 'grammar' },
                        { value: 'igualmente', reason: 'Igualmente to „równie” opisujące czynność. Cecha sytuacji to igual.', trapType: 'grammar' },
                    ] }] },
    },
    'es-e01-s01-eres-rapido': {
        ru: { meaning: 'Ты быстрый?', explanation: 'Вопрос про собеседника-мужчину. Eres — форма для «ты», местоимение не нужно.', distractors: [
                { value: 'Soy', reason: 'Soy — про себя. Спрашивают про собеседника — eres.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es — про третье лицо. Про «ты» — eres.', trapType: 'grammar' },
                { value: 'Estás', reason: 'Estás — от estar, про самочувствие или место сейчас. Постоянное качество — eres.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Eres', prompt: 'Как спросить «ты» о качестве?', distractors: [
                        { value: 'Soy', reason: 'Soy — про себя. Спрашивают про собеседника — eres.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es — про третье лицо. Про «ты» — eres.', trapType: 'grammar' },
                        { value: 'Estás', reason: 'Estás — от estar, про самочувствие или место сейчас. Постоянное качество — eres.', trapType: 'grammar' },
                    ] }] },
        uk: { meaning: 'Ти швидкий?', explanation: 'Питання про співрозмовника-чоловіка. Eres — форма для «ти», займенник не потрібен.', distractors: [
                { value: 'Soy', reason: 'Soy — про себе. Питають про співрозмовника — eres.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es — про третю особу. Про «ти» — eres.', trapType: 'grammar' },
                { value: 'Estás', reason: 'Estás — від estar, про самопочуття або місце зараз. Постійна якість — eres.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Eres', prompt: 'Як запитати «ти» про якість?', distractors: [
                        { value: 'Soy', reason: 'Soy — про себе. Питають про співрозмовника — eres.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es — про третю особу. Про «ти» — eres.', trapType: 'grammar' },
                        { value: 'Estás', reason: 'Estás — від estar, про самопочуття або місце зараз. Постійна якість — eres.', trapType: 'grammar' },
                    ] }] },
        en: { meaning: 'Are you fast?', explanation: 'A question about a male listener. Eres is the “you” form, so no pronoun is needed.', distractors: [
                { value: 'Soy', reason: 'Soy is about yourself. Asking about the other person — eres.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es is about a third person. About “you” — eres.', trapType: 'grammar' },
                { value: 'Estás', reason: 'Estás belongs to estar, for how you feel or where you are right now. A lasting quality — eres.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Eres', prompt: 'How do you ask “you” about a quality?', distractors: [
                        { value: 'Soy', reason: 'Soy is about yourself. Asking about the other person — eres.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es is about a third person. About “you” — eres.', trapType: 'grammar' },
                        { value: 'Estás', reason: 'Estás belongs to estar, for how you feel or where you are right now. A lasting quality — eres.', trapType: 'grammar' },
                    ] }] },
        'pt-BR': { meaning: 'Você é rápido?', explanation: 'Uma pergunta a um ouvinte homem. Eres é a forma de “você”, então não precisa de pronome.', distractors: [
                { value: 'Soy', reason: 'Soy é sobre si mesmo. Perguntando sobre a outra pessoa — eres.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es é sobre uma terceira pessoa. Sobre “você” — eres.', trapType: 'grammar' },
                { value: 'Estás', reason: 'Estás pertence a estar, para como você se sente ou onde está agora. Qualidade duradoura — eres.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Eres', prompt: 'Como perguntar “você” sobre uma qualidade?', distractors: [
                        { value: 'Soy', reason: 'Soy é sobre si mesmo. Perguntando sobre a outra pessoa — eres.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es é sobre uma terceira pessoa. Sobre “você” — eres.', trapType: 'grammar' },
                        { value: 'Estás', reason: 'Estás pertence a estar, para como você se sente ou onde está agora. Qualidade duradoura — eres.', trapType: 'grammar' },
                    ] }] },
        vi: { meaning: 'Bạn nhanh không?', explanation: 'Câu hỏi về người nghe nam. Eres là dạng “bạn”, nên không cần đại từ.', distractors: [
                { value: 'Soy', reason: 'Soy là về bản thân. Hỏi về người kia — eres.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es là về ngôi thứ ba. Về “bạn” — eres.', trapType: 'grammar' },
                { value: 'Estás', reason: 'Estás thuộc estar, dùng cho cảm giác hoặc nơi chốn ngay lúc này. Đặc tính lâu dài — eres.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Eres', prompt: 'Hỏi “bạn” về một đặc tính như thế nào?', distractors: [
                        { value: 'Soy', reason: 'Soy là về bản thân. Hỏi về người kia — eres.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es là về ngôi thứ ba. Về “bạn” — eres.', trapType: 'grammar' },
                        { value: 'Estás', reason: 'Estás thuộc estar, dùng cho cảm giác hoặc nơi chốn ngay lúc này. Đặc tính lâu dài — eres.', trapType: 'grammar' },
                    ] }] },
        id: { meaning: 'Apakah kamu cepat?', explanation: 'Pertanyaan tentang pendengar laki-laki. Eres adalah bentuk "kamu", jadi tidak perlu kata ganti.', distractors: [
                { value: 'Soy', reason: 'Soy tentang diri sendiri. Menanyakan tentang orang lain — eres.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es tentang orang ketiga. Tentang "kamu" — eres.', trapType: 'grammar' },
                { value: 'Estás', reason: 'Estás berasal dari estar, untuk perasaan atau tempat saat ini. Sifat yang bertahan — eres.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Eres', prompt: 'Bagaimana menanyakan "kamu" tentang suatu sifat?', distractors: [
                        { value: 'Soy', reason: 'Soy tentang diri sendiri. Menanyakan tentang orang lain — eres.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es tentang orang ketiga. Tentang "kamu" — eres.', trapType: 'grammar' },
                        { value: 'Estás', reason: 'Estás berasal dari estar, untuk perasaan atau tempat saat ini. Sifat yang bertahan — eres.', trapType: 'grammar' },
                    ] }] },
        tr: { meaning: 'Hızlı mısın?', explanation: 'Erkek bir dinleyici hakkında soru. Eres "sen" biçimidir, bu yüzden zamir gerekmez.', distractors: [
                { value: 'Soy', reason: 'Soy kendiniz hakkındadır. Karşınızdaki hakkında soru — eres.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es üçüncü kişi hakkındadır. "Sen" hakkında — eres.', trapType: 'grammar' },
                { value: 'Estás', reason: 'Estás, estar fiiline aittir, şu anki hissiniz veya yeriniz içindir. Kalıcı nitelik — eres.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Eres', prompt: 'Bir nitelik hakkında "sen" nasıl sorulur?', distractors: [
                        { value: 'Soy', reason: 'Soy kendiniz hakkındadır. Karşınızdaki hakkında soru — eres.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es üçüncü kişi hakkındadır. "Sen" hakkında — eres.', trapType: 'grammar' },
                        { value: 'Estás', reason: 'Estás, estar fiiline aittir, şu anki hissiniz veya yeriniz içindir. Kalıcı nitelik — eres.', trapType: 'grammar' },
                    ] }] },
        pl: { meaning: 'Jesteś szybki?', explanation: 'Pytanie o słuchacza mężczyznę. Eres to forma „ty”, więc zaimek nie jest potrzebny.', distractors: [
                { value: 'Soy', reason: 'Soy dotyczy siebie. Pytanie o rozmówcę — eres.', trapType: 'grammar' },
                { value: 'Es', reason: 'Es dotyczy trzeciej osoby. O „ty” — eres.', trapType: 'grammar' },
                { value: 'Estás', reason: 'Estás należy do estar, dla samopoczucia lub miejsca teraz. Trwała cecha — eres.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Eres', prompt: 'Jak zapytać „ty” o cechę?', distractors: [
                        { value: 'Soy', reason: 'Soy dotyczy siebie. Pytanie o rozmówcę — eres.', trapType: 'grammar' },
                        { value: 'Es', reason: 'Es dotyczy trzeciej osoby. O „ty” — eres.', trapType: 'grammar' },
                        { value: 'Estás', reason: 'Estás należy do estar, dla samopoczucia lub miejsca teraz. Trwała cecha — eres.', trapType: 'grammar' },
                    ] }] },
    },
    'es-e01-s01-no-soy-rapido': {
        ru: { meaning: 'Я не быстрый', explanation: 'Отрицание своего же качества. No встаёт перед soy.', distractors: [
                { value: 'Nunca', reason: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'grammar' },
                { value: 'eres', reason: 'Eres — про тебя. Говорящий про себя — soy.', trapType: 'grammar' },
                { value: 'estoy', reason: 'Estoy — от estar. Постоянное качество, а не временное состояние — soy.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Как отрицать своё качество?', distractors: [{ value: 'Nunca', reason: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'grammar' }] },
                { correct: 'soy', prompt: 'Как сказать «я» после no?', distractors: [
                        { value: 'eres', reason: 'Eres — про тебя. Говорящий про себя — soy.', trapType: 'grammar' },
                        { value: 'estoy', reason: 'Estoy — от estar. Постоянное качество, а не временное состояние — soy.', trapType: 'grammar' },
                    ] },
            ] },
        uk: { meaning: 'Я не швидкий', explanation: 'Заперечення власної якості. No стоїть перед soy.', distractors: [
                { value: 'Nunca', reason: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — no.', trapType: 'grammar' },
                { value: 'eres', reason: 'Eres — про тебе. Мовець про себе — soy.', trapType: 'grammar' },
                { value: 'estoy', reason: 'Estoy — від estar. Постійна якість, а не тимчасовий стан — soy.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Як заперечити власну якість?', distractors: [{ value: 'Nunca', reason: 'Nunca — «ніколи», про частоту в часі. Просте заперечення — no.', trapType: 'grammar' }] },
                { correct: 'soy', prompt: 'Як сказати «я» після no?', distractors: [
                        { value: 'eres', reason: 'Eres — про тебе. Мовець про себе — soy.', trapType: 'grammar' },
                        { value: 'estoy', reason: 'Estoy — від estar. Постійна якість, а не тимчасовий стан — soy.', trapType: 'grammar' },
                    ] },
            ] },
        en: { meaning: 'I am not fast', explanation: 'Negating your own quality. No comes before soy.', distractors: [
                { value: 'Nunca', reason: 'Nunca is “never”, about frequency in time. The plain negation is no.', trapType: 'grammar' },
                { value: 'eres', reason: 'Eres is about you. The speaker talking about themselves — soy.', trapType: 'grammar' },
                { value: 'estoy', reason: 'Estoy belongs to estar. A lasting quality, not a temporary state — soy.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'How do you negate your own quality?', distractors: [{ value: 'Nunca', reason: 'Nunca is “never”, about frequency in time. The plain negation is no.', trapType: 'grammar' }] },
                { correct: 'soy', prompt: 'How do you say “I” after no?', distractors: [
                        { value: 'eres', reason: 'Eres is about you. The speaker talking about themselves — soy.', trapType: 'grammar' },
                        { value: 'estoy', reason: 'Estoy belongs to estar. A lasting quality, not a temporary state — soy.', trapType: 'grammar' },
                    ] },
            ] },
        'pt-BR': { meaning: 'Eu não sou rápido', explanation: 'Negando a própria qualidade. No vem antes de soy.', distractors: [
                { value: 'Nunca', reason: 'Nunca é “nunca”, sobre frequência no tempo. A negação simples é no.', trapType: 'grammar' },
                { value: 'eres', reason: 'Eres é sobre você. Quem fala sobre si mesmo — soy.', trapType: 'grammar' },
                { value: 'estoy', reason: 'Estoy pertence a estar. Qualidade duradoura, não estado temporário — soy.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Como negar a própria qualidade?', distractors: [{ value: 'Nunca', reason: 'Nunca é “nunca”, sobre frequência no tempo. A negação simples é no.', trapType: 'grammar' }] },
                { correct: 'soy', prompt: 'Como se diz “eu” depois de no?', distractors: [
                        { value: 'eres', reason: 'Eres é sobre você. Quem fala sobre si mesmo — soy.', trapType: 'grammar' },
                        { value: 'estoy', reason: 'Estoy pertence a estar. Qualidade duradoura, não estado temporário — soy.', trapType: 'grammar' },
                    ] },
            ] },
        vi: { meaning: 'Tôi không nhanh', explanation: 'Phủ định đặc tính của bản thân. No đứng trước soy.', distractors: [
                { value: 'Nunca', reason: 'Nunca là “không bao giờ”, về tần suất theo thời gian. Phủ định đơn giản là no.', trapType: 'grammar' },
                { value: 'eres', reason: 'Eres là về bạn. Người nói về bản thân — soy.', trapType: 'grammar' },
                { value: 'estoy', reason: 'Estoy thuộc estar. Đặc tính lâu dài, không phải trạng thái tạm thời — soy.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Làm sao phủ định đặc tính của bản thân?', distractors: [{ value: 'Nunca', reason: 'Nunca là “không bao giờ”, về tần suất theo thời gian. Phủ định đơn giản là no.', trapType: 'grammar' }] },
                { correct: 'soy', prompt: 'Nói “tôi” sau no như thế nào?', distractors: [
                        { value: 'eres', reason: 'Eres là về bạn. Người nói về bản thân — soy.', trapType: 'grammar' },
                        { value: 'estoy', reason: 'Estoy thuộc estar. Đặc tính lâu dài, không phải trạng thái tạm thời — soy.', trapType: 'grammar' },
                    ] },
            ] },
        id: { meaning: 'Saya tidak cepat', explanation: 'Menyangkal sifat diri sendiri. No berada sebelum soy.', distractors: [
                { value: 'Nunca', reason: 'Nunca berarti "tidak pernah", tentang frekuensi waktu. Penyangkalan sederhana adalah no.', trapType: 'grammar' },
                { value: 'eres', reason: 'Eres tentang kamu. Pembicara tentang dirinya sendiri — soy.', trapType: 'grammar' },
                { value: 'estoy', reason: 'Estoy berasal dari estar. Sifat yang bertahan, bukan keadaan sementara — soy.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Bagaimana menyangkal sifat diri sendiri?', distractors: [{ value: 'Nunca', reason: 'Nunca berarti "tidak pernah", tentang frekuensi waktu. Penyangkalan sederhana adalah no.', trapType: 'grammar' }] },
                { correct: 'soy', prompt: 'Bagaimana mengatakan "saya" setelah no?', distractors: [
                        { value: 'eres', reason: 'Eres tentang kamu. Pembicara tentang dirinya sendiri — soy.', trapType: 'grammar' },
                        { value: 'estoy', reason: 'Estoy berasal dari estar. Sifat yang bertahan, bukan keadaan sementara — soy.', trapType: 'grammar' },
                    ] },
            ] },
        tr: { meaning: 'Ben hızlı değilim', explanation: 'Kendi niteliğinizi olumsuzlamak. No, soy\'dan önce gelir.', distractors: [
                { value: 'Nunca', reason: 'Nunca "asla" demektir, zaman içindeki sıklık hakkındadır. Basit olumsuzluk no\'dur.', trapType: 'grammar' },
                { value: 'eres', reason: 'Eres sizin hakkınızdadır. Kendisi hakkında konuşan kişi — soy.', trapType: 'grammar' },
                { value: 'estoy', reason: 'Estoy, estar fiiline aittir. Kalıcı nitelik, geçici durum değil — soy.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Kendi niteliğinizi nasıl olumsuzlarsınız?', distractors: [{ value: 'Nunca', reason: 'Nunca "asla" demektir, zaman içindeki sıklık hakkındadır. Basit olumsuzluk no\'dur.', trapType: 'grammar' }] },
                { correct: 'soy', prompt: 'No\'dan sonra "ben" nasıl söylenir?', distractors: [
                        { value: 'eres', reason: 'Eres sizin hakkınızdadır. Kendisi hakkında konuşan kişi — soy.', trapType: 'grammar' },
                        { value: 'estoy', reason: 'Estoy, estar fiiline aittir. Kalıcı nitelik, geçici durum değil — soy.', trapType: 'grammar' },
                    ] },
            ] },
        pl: { meaning: 'Nie jestem szybki', explanation: 'Zaprzeczanie własnej cesze. No stoi przed soy.', distractors: [
                { value: 'Nunca', reason: 'Nunca to „nigdy”, o częstotliwości w czasie. Proste przeczenie to no.', trapType: 'grammar' },
                { value: 'eres', reason: 'Eres dotyczy ciebie. Mówiący o sobie — soy.', trapType: 'grammar' },
                { value: 'estoy', reason: 'Estoy należy do estar. Trwała cecha, nie stan tymczasowy — soy.', trapType: 'grammar' },
            ],
            words: [
                { correct: 'No', prompt: 'Jak zaprzeczyć własnej cesze?', distractors: [{ value: 'Nunca', reason: 'Nunca to „nigdy”, o częstotliwości w czasie. Proste przeczenie to no.', trapType: 'grammar' }] },
                { correct: 'soy', prompt: 'Jak powiedzieć „ja” po no?', distractors: [
                        { value: 'eres', reason: 'Eres dotyczy ciebie. Mówiący o sobie — soy.', trapType: 'grammar' },
                        { value: 'estoy', reason: 'Estoy należy do estar. Trwała cecha, nie stan tymczasowy — soy.', trapType: 'grammar' },
                    ] },
            ] },
    },
    'es-e01-s01-somos-dos': {
        ru: { meaning: 'Нас двое', explanation: 'Так отвечают на вопрос о количестве человек — например, в ресторане.', distractors: [
                { value: 'Son', reason: 'Son — «они» или вежливое «вы» много человек. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
                { value: 'Estamos', reason: 'Estamos — от estar, про место или состояние. Количество людей — somos.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Somos', prompt: 'Как сказать «мы» о количестве?', distractors: [
                        { value: 'Son', reason: 'Son — «они» или вежливое «вы» много человек. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
                        { value: 'Estamos', reason: 'Estamos — от estar, про место или состояние. Количество людей — somos.', trapType: 'grammar' },
                    ] }] },
        uk: { meaning: 'Нас двоє', explanation: 'Так відповідають на питання про кількість людей — наприклад, у ресторані.', distractors: [
                { value: 'Son', reason: 'Son — «вони» або ввічливе «ви» багато людей. Про себе разом з кимось — somos.', trapType: 'grammar' },
                { value: 'Estamos', reason: 'Estamos — від estar, про місце або стан. Кількість людей — somos.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Somos', prompt: 'Як сказати «ми» про кількість?', distractors: [
                        { value: 'Son', reason: 'Son — «вони» або ввічливе «ви» багато людей. Про себе разом з кимось — somos.', trapType: 'grammar' },
                        { value: 'Estamos', reason: 'Estamos — від estar, про місце або стан. Кількість людей — somos.', trapType: 'grammar' },
                    ] }] },
        en: { meaning: 'There are two of us', explanation: 'This is how you answer a question about how many people — for example, at a restaurant.', distractors: [
                { value: 'Son', reason: 'Son is “they” or formal “you” for several people. About yourself with someone else — somos.', trapType: 'grammar' },
                { value: 'Estamos', reason: 'Estamos belongs to estar, for place or state. A count of people — somos.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Somos', prompt: 'How do you say “we” about a count?', distractors: [
                        { value: 'Son', reason: 'Son is “they” or formal “you” for several people. About yourself with someone else — somos.', trapType: 'grammar' },
                        { value: 'Estamos', reason: 'Estamos belongs to estar, for place or state. A count of people — somos.', trapType: 'grammar' },
                    ] }] },
        'pt-BR': { meaning: 'Somos dois', explanation: 'É assim que se responde a uma pergunta sobre quantas pessoas — por exemplo, num restaurante.', distractors: [
                { value: 'Son', reason: 'Son é “eles” ou “vocês” formal para várias pessoas. Sobre si mesmo com outra pessoa — somos.', trapType: 'grammar' },
                { value: 'Estamos', reason: 'Estamos pertence a estar, para lugar ou estado. Uma quantidade de pessoas — somos.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Somos', prompt: 'Como dizer “nós” sobre uma quantidade?', distractors: [
                        { value: 'Son', reason: 'Son é “eles” ou “vocês” formal para várias pessoas. Sobre si mesmo com outra pessoa — somos.', trapType: 'grammar' },
                        { value: 'Estamos', reason: 'Estamos pertence a estar, para lugar ou estado. Uma quantidade de pessoas — somos.', trapType: 'grammar' },
                    ] }] },
        vi: { meaning: 'Chúng tôi có hai người', explanation: 'Đây là cách trả lời câu hỏi về số người — ví dụ, ở nhà hàng.', distractors: [
                { value: 'Son', reason: 'Son là “họ” hoặc “quý vị” trang trọng cho nhiều người. Về bản thân cùng người khác — somos.', trapType: 'grammar' },
                { value: 'Estamos', reason: 'Estamos thuộc estar, dùng cho nơi chốn hoặc trạng thái. Số lượng người — somos.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Somos', prompt: 'Nói “chúng tôi” về số lượng như thế nào?', distractors: [
                        { value: 'Son', reason: 'Son là “họ” hoặc “quý vị” trang trọng cho nhiều người. Về bản thân cùng người khác — somos.', trapType: 'grammar' },
                        { value: 'Estamos', reason: 'Estamos thuộc estar, dùng cho nơi chốn hoặc trạng thái. Số lượng người — somos.', trapType: 'grammar' },
                    ] }] },
        id: { meaning: 'Kami berdua', explanation: 'Begini cara menjawab pertanyaan tentang berapa orang — misalnya, di restoran.', distractors: [
                { value: 'Son', reason: 'Son adalah "mereka" atau "Anda" formal untuk beberapa orang. Tentang diri sendiri bersama orang lain — somos.', trapType: 'grammar' },
                { value: 'Estamos', reason: 'Estamos berasal dari estar, untuk tempat atau keadaan. Jumlah orang — somos.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Somos', prompt: 'Bagaimana mengatakan "kami" tentang jumlah?', distractors: [
                        { value: 'Son', reason: 'Son adalah "mereka" atau "Anda" formal untuk beberapa orang. Tentang diri sendiri bersama orang lain — somos.', trapType: 'grammar' },
                        { value: 'Estamos', reason: 'Estamos berasal dari estar, untuk tempat atau keadaan. Jumlah orang — somos.', trapType: 'grammar' },
                    ] }] },
        tr: { meaning: 'İkimiziz', explanation: 'Kaç kişi olduğu hakkındaki bir soruya böyle cevap verirsiniz — örneğin restoranda.', distractors: [
                { value: 'Son', reason: 'Son birkaç kişi için "onlar" veya resmi "siz" demektir. Başka biriyle kendiniz hakkında — somos.', trapType: 'grammar' },
                { value: 'Estamos', reason: 'Estamos, estar fiiline aittir, yer veya durum içindir. Kişi sayısı — somos.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Somos', prompt: 'Sayı hakkında "biz" nasıl söylenir?', distractors: [
                        { value: 'Son', reason: 'Son birkaç kişi için "onlar" veya resmi "siz" demektir. Başka biriyle kendiniz hakkında — somos.', trapType: 'grammar' },
                        { value: 'Estamos', reason: 'Estamos, estar fiiline aittir, yer veya durum içindir. Kişi sayısı — somos.', trapType: 'grammar' },
                    ] }] },
        pl: { meaning: 'Jest nas dwoje', explanation: 'Tak odpowiada się na pytanie o liczbę osób — na przykład w restauracji.', distractors: [
                { value: 'Son', reason: 'Son to „oni” albo grzecznościowe „państwo” dla kilku osób. O sobie razem z kimś — somos.', trapType: 'grammar' },
                { value: 'Estamos', reason: 'Estamos należy do estar, dla miejsca lub stanu. Liczba osób — somos.', trapType: 'grammar' },
            ],
            words: [{ correct: 'Somos', prompt: 'Jak powiedzieć „my” o liczbie?', distractors: [
                        { value: 'Son', reason: 'Son to „oni” albo grzecznościowe „państwo” dla kilku osób. O sobie razem z kimś — somos.', trapType: 'grammar' },
                        { value: 'Estamos', reason: 'Estamos należy do estar, dla miejsca lub stanu. Liczba osób — somos.', trapType: 'grammar' },
                    ] }] },
    },
    'es-e01-s01-es-importante': {
        ru: { meaning: 'Это важно', explanation: 'Одна из самых частых оценок при обсуждении дел. Importante не меняется по роду.', distractors: [
                { value: 'importanta', reason: 'Importante не меняется по роду — формы importanta не существует.', trapType: 'grammar' },
                { value: 'importancia', reason: 'Importancia — «важность», предмет. Признак — importante.', trapType: 'grammar' },
            ],
            words: [{ correct: 'importante', prompt: 'Каким словом сказать «важно»?', distractors: [
                        { value: 'importanta', reason: 'Importante не меняется по роду — формы importanta не существует.', trapType: 'grammar' },
                        { value: 'importancia', reason: 'Importancia — «важность», предмет. Признак — importante.', trapType: 'grammar' },
                    ] }] },
        uk: { meaning: 'Це важливо', explanation: 'Одна з найчастіших оцінок при обговоренні справ. Importante не змінюється за родом.', distractors: [
                { value: 'importanta', reason: 'Importante не змінюється за родом — форми importanta не існує.', trapType: 'grammar' },
                { value: 'importancia', reason: 'Importancia — «важливість», предмет. Ознака — importante.', trapType: 'grammar' },
            ],
            words: [{ correct: 'importante', prompt: 'Яким словом сказати «важливо»?', distractors: [
                        { value: 'importanta', reason: 'Importante не змінюється за родом — форми importanta не існує.', trapType: 'grammar' },
                        { value: 'importancia', reason: 'Importancia — «важливість», предмет. Ознака — importante.', trapType: 'grammar' },
                    ] }] },
        en: { meaning: 'It is important', explanation: 'One of the most common verdicts when discussing matters. Importante does not change for gender.', distractors: [
                { value: 'importanta', reason: 'Importante does not change for gender — the form importanta does not exist.', trapType: 'grammar' },
                { value: 'importancia', reason: 'Importancia is “importance”, a noun. The quality is importante.', trapType: 'grammar' },
            ],
            words: [{ correct: 'importante', prompt: 'Which word means “important”?', distractors: [
                        { value: 'importanta', reason: 'Importante does not change for gender — the form importanta does not exist.', trapType: 'grammar' },
                        { value: 'importancia', reason: 'Importancia is “importance”, a noun. The quality is importante.', trapType: 'grammar' },
                    ] }] },
        'pt-BR': { meaning: 'É importante', explanation: 'Um dos vereditos mais comuns ao discutir assuntos. Importante não muda de gênero.', distractors: [
                { value: 'importanta', reason: 'Importante não muda de gênero — a forma importanta não existe.', trapType: 'grammar' },
                { value: 'importancia', reason: 'Importancia é “importância”, um substantivo. A qualidade é importante.', trapType: 'grammar' },
            ],
            words: [{ correct: 'importante', prompt: 'Qual palavra significa “importante”?', distractors: [
                        { value: 'importanta', reason: 'Importante não muda de gênero — a forma importanta não existe.', trapType: 'grammar' },
                        { value: 'importancia', reason: 'Importancia é “importância”, um substantivo. A qualidade é importante.', trapType: 'grammar' },
                    ] }] },
        vi: { meaning: 'Điều đó quan trọng', explanation: 'Một trong những nhận định phổ biến nhất khi bàn về công việc. Importante không đổi theo giống.', distractors: [
                { value: 'importanta', reason: 'Importante không đổi theo giống — dạng importanta không tồn tại.', trapType: 'grammar' },
                { value: 'importancia', reason: 'Importancia là “tầm quan trọng”, danh từ. Đặc tính là importante.', trapType: 'grammar' },
            ],
            words: [{ correct: 'importante', prompt: 'Từ nào nghĩa là “quan trọng”?', distractors: [
                        { value: 'importanta', reason: 'Importante không đổi theo giống — dạng importanta không tồn tại.', trapType: 'grammar' },
                        { value: 'importancia', reason: 'Importancia là “tầm quan trọng”, danh từ. Đặc tính là importante.', trapType: 'grammar' },
                    ] }] },
        id: { meaning: 'Itu penting', explanation: 'Salah satu penilaian paling umum saat membahas urusan. Importante tidak berubah menurut gender.', distractors: [
                { value: 'importanta', reason: 'Importante tidak berubah menurut gender — bentuk importanta tidak ada.', trapType: 'grammar' },
                { value: 'importancia', reason: 'Importancia adalah "kepentingan", kata benda. Sifatnya adalah importante.', trapType: 'grammar' },
            ],
            words: [{ correct: 'importante', prompt: 'Kata mana yang berarti "penting"?', distractors: [
                        { value: 'importanta', reason: 'Importante tidak berubah menurut gender — bentuk importanta tidak ada.', trapType: 'grammar' },
                        { value: 'importancia', reason: 'Importancia adalah "kepentingan", kata benda. Sifatnya adalah importante.', trapType: 'grammar' },
                    ] }] },
        tr: { meaning: 'Bu önemli', explanation: 'Konular tartışılırken en yaygın yargılardan biri. Importante cinsiyete göre değişmez.', distractors: [
                { value: 'importanta', reason: 'Importante cinsiyete göre değişmez — importanta biçimi yoktur.', trapType: 'grammar' },
                { value: 'importancia', reason: 'Importancia "önem" demektir, bir isimdir. Nitelik importante\'dir.', trapType: 'grammar' },
            ],
            words: [{ correct: 'importante', prompt: '"Önemli" anlamına hangi kelime gelir?', distractors: [
                        { value: 'importanta', reason: 'Importante cinsiyete göre değişmez — importanta biçimi yoktur.', trapType: 'grammar' },
                        { value: 'importancia', reason: 'Importancia "önem" demektir, bir isimdir. Nitelik importante\'dir.', trapType: 'grammar' },
                    ] }] },
        pl: { meaning: 'To ważne', explanation: 'Jedna z najczęstszych ocen przy omawianiu spraw. Importante nie zmienia się przez rodzaj.', distractors: [
                { value: 'importanta', reason: 'Importante nie zmienia się przez rodzaj — forma importanta nie istnieje.', trapType: 'grammar' },
                { value: 'importancia', reason: 'Importancia to „ważność”, rzeczownik. Cecha to importante.', trapType: 'grammar' },
            ],
            words: [{ correct: 'importante', prompt: 'Które słowo znaczy „ważne”?', distractors: [
                        { value: 'importanta', reason: 'Importante nie zmienia się przez rodzaj — forma importanta nie istnieje.', trapType: 'grammar' },
                        { value: 'importancia', reason: 'Importancia to „ważność”, rzeczownik. Cecha to importante.', trapType: 'grammar' },
                    ] }] },
    },
    'es-e01-s01-eres-simpatica': {
        ru: { meaning: 'Ты приятная', explanation: 'Комплимент женщине. Eres — потому что «ты», simpática — потому что речь о женщине.', distractors: [
                { value: 'simpático', reason: 'Simpático — если говорят мужчине. Здесь про женщину.', trapType: 'grammar' },
                { value: 'simpáticas', reason: 'Simpáticas — если говорят нескольким женщинам.', trapType: 'grammar' },
            ],
            words: [{ correct: 'simpática', prompt: 'Каким словом сделать комплимент женщине?', distractors: [
                        { value: 'simpático', reason: 'Simpático — если говорят мужчине. Здесь про женщину.', trapType: 'grammar' },
                        { value: 'simpáticas', reason: 'Simpáticas — если говорят нескольким женщинам.', trapType: 'grammar' },
                    ] }] },
        uk: { meaning: 'Ти приємна', explanation: 'Комплімент жінці. Eres — бо «ти», simpática — бо мова про жінку.', distractors: [
                { value: 'simpático', reason: 'Simpático — якщо кажуть чоловіку. Тут про жінку.', trapType: 'grammar' },
                { value: 'simpáticas', reason: 'Simpáticas — якщо кажуть декільком жінкам.', trapType: 'grammar' },
            ],
            words: [{ correct: 'simpática', prompt: 'Яким словом зробити комплімент жінці?', distractors: [
                        { value: 'simpático', reason: 'Simpático — якщо кажуть чоловіку. Тут про жінку.', trapType: 'grammar' },
                        { value: 'simpáticas', reason: 'Simpáticas — якщо кажуть декільком жінкам.', trapType: 'grammar' },
                    ] }] },
        en: { meaning: 'You are nice', explanation: 'A compliment to a woman. Eres because it is “you”, simpática because it is about a woman.', distractors: [
                { value: 'simpático', reason: 'Simpático is said to a man. Here it is about a woman.', trapType: 'grammar' },
                { value: 'simpáticas', reason: 'Simpáticas is said to several women.', trapType: 'grammar' },
            ],
            words: [{ correct: 'simpática', prompt: 'Which word compliments a woman?', distractors: [
                        { value: 'simpático', reason: 'Simpático is said to a man. Here it is about a woman.', trapType: 'grammar' },
                        { value: 'simpáticas', reason: 'Simpáticas is said to several women.', trapType: 'grammar' },
                    ] }] },
        'pt-BR': { meaning: 'Você é simpática', explanation: 'Um elogio a uma mulher. Eres porque é “você”, simpática porque é sobre uma mulher.', distractors: [
                { value: 'simpático', reason: 'Simpático se diz a um homem. Aqui é sobre uma mulher.', trapType: 'grammar' },
                { value: 'simpáticas', reason: 'Simpáticas se diz a várias mulheres.', trapType: 'grammar' },
            ],
            words: [{ correct: 'simpática', prompt: 'Qual palavra é um elogio a uma mulher?', distractors: [
                        { value: 'simpático', reason: 'Simpático se diz a um homem. Aqui é sobre uma mulher.', trapType: 'grammar' },
                        { value: 'simpáticas', reason: 'Simpáticas se diz a várias mulheres.', trapType: 'grammar' },
                    ] }] },
        vi: { meaning: 'Bạn dễ mến', explanation: 'Lời khen cho một phụ nữ. Eres vì đó là “bạn”, simpática vì nói về phụ nữ.', distractors: [
                { value: 'simpático', reason: 'Simpático dùng để nói với đàn ông. Ở đây nói về phụ nữ.', trapType: 'grammar' },
                { value: 'simpáticas', reason: 'Simpáticas dùng để nói với nhiều phụ nữ.', trapType: 'grammar' },
            ],
            words: [{ correct: 'simpática', prompt: 'Từ nào khen một phụ nữ?', distractors: [
                        { value: 'simpático', reason: 'Simpático dùng để nói với đàn ông. Ở đây nói về phụ nữ.', trapType: 'grammar' },
                        { value: 'simpáticas', reason: 'Simpáticas dùng để nói với nhiều phụ nữ.', trapType: 'grammar' },
                    ] }] },
        id: { meaning: 'Kamu ramah', explanation: 'Pujian untuk perempuan. Eres karena itu "kamu", simpática karena tentang perempuan.', distractors: [
                { value: 'simpático', reason: 'Simpático diucapkan kepada laki-laki. Di sini tentang perempuan.', trapType: 'grammar' },
                { value: 'simpáticas', reason: 'Simpáticas diucapkan kepada beberapa perempuan.', trapType: 'grammar' },
            ],
            words: [{ correct: 'simpática', prompt: 'Kata mana yang memuji perempuan?', distractors: [
                        { value: 'simpático', reason: 'Simpático diucapkan kepada laki-laki. Di sini tentang perempuan.', trapType: 'grammar' },
                        { value: 'simpáticas', reason: 'Simpáticas diucapkan kepada beberapa perempuan.', trapType: 'grammar' },
                    ] }] },
        tr: { meaning: 'Sen hoşsun', explanation: 'Bir kadına iltifat. Eres çünkü "sen", simpática çünkü bir kadın hakkında.', distractors: [
                { value: 'simpático', reason: 'Simpático bir erkeğe söylenir. Burada bir kadın hakkında.', trapType: 'grammar' },
                { value: 'simpáticas', reason: 'Simpáticas birkaç kadına söylenir.', trapType: 'grammar' },
            ],
            words: [{ correct: 'simpática', prompt: 'Hangi kelime bir kadına iltifattır?', distractors: [
                        { value: 'simpático', reason: 'Simpático bir erkeğe söylenir. Burada bir kadın hakkında.', trapType: 'grammar' },
                        { value: 'simpáticas', reason: 'Simpáticas birkaç kadına söylenir.', trapType: 'grammar' },
                    ] }] },
        pl: { meaning: 'Jesteś miła', explanation: 'Komplement dla kobiety. Eres, bo to „ty”, simpática, bo mowa o kobiecie.', distractors: [
                { value: 'simpático', reason: 'Simpático mówi się do mężczyzny. Tu mowa o kobiecie.', trapType: 'grammar' },
                { value: 'simpáticas', reason: 'Simpáticas mówi się do kilku kobiet.', trapType: 'grammar' },
            ],
            words: [{ correct: 'simpática', prompt: 'Które słowo jest komplementem dla kobiety?', distractors: [
                        { value: 'simpático', reason: 'Simpático mówi się do mężczyzny. Tu mowa o kobiecie.', trapType: 'grammar' },
                        { value: 'simpáticas', reason: 'Simpáticas mówi się do kilku kobiet.', trapType: 'grammar' },
                    ] }] },
    },
    'es-e01-s01-no-es-verdad': {
        ru: { meaning: 'Это неправда', explanation: 'Прямое опровержение чужих слов. No встаёт перед es.', distractors: [
                { value: 'mentira', reason: 'Mentira значит «ложь» само по себе — сказали бы Es mentira, без no. Здесь строим отрицание готовой фразы Es verdad.', trapType: 'semantic_neighbor' },
                { value: 'verdadero', reason: 'Verdadero — «истинный» как признак предмета. Устойчивая реакция — именно (no) es verdad, с существительным, а не прилагательным.', trapType: 'grammar' },
            ],
            words: [{ correct: 'verdad', prompt: 'Каким словом опровергнуть, добавив no перед es?', distractors: [
                        { value: 'mentira', reason: 'Mentira значит «ложь» само по себе — сказали бы Es mentira, без no. Здесь строим отрицание готовой фразы Es verdad.', trapType: 'semantic_neighbor' },
                        { value: 'verdadero', reason: 'Verdadero — «истинный» как признак предмета. Устойчивая реакция — именно (no) es verdad, с существительным, а не прилагательным.', trapType: 'grammar' },
                    ] }] },
        uk: { meaning: 'Це неправда', explanation: 'Пряме спростування чужих слів. No стоїть перед es.', distractors: [
                { value: 'mentira', reason: 'Mentira означає «брехня» саме по собі — сказали б Es mentira, без no. Тут будуємо заперечення готової фрази Es verdad.', trapType: 'semantic_neighbor' },
                { value: 'verdadero', reason: 'Verdadero — «істинний» як ознака предмета. Стійка реакція — саме (no) es verdad, з іменником, а не прикметником.', trapType: 'grammar' },
            ],
            words: [{ correct: 'verdad', prompt: 'Яким словом спростувати, додавши no перед es?', distractors: [
                        { value: 'mentira', reason: 'Mentira означає «брехня» саме по собі — сказали б Es mentira, без no. Тут будуємо заперечення готової фрази Es verdad.', trapType: 'semantic_neighbor' },
                        { value: 'verdadero', reason: 'Verdadero — «істинний» як ознака предмета. Стійка реакція — саме (no) es verdad, з іменником, а не прикметником.', trapType: 'grammar' },
                    ] }] },
        en: { meaning: 'That is not true', explanation: 'A direct denial of someone else’s words. No goes before es.', distractors: [
                { value: 'mentira', reason: 'Mentira means “lie” by itself — you would say Es mentira, without no. Here we negate the fixed phrase Es verdad.', trapType: 'semantic_neighbor' },
                { value: 'verdadero', reason: 'Verdadero is “true” as a quality of a thing. The fixed reaction is exactly (no) es verdad, with the noun, not an adjective.', trapType: 'grammar' },
            ],
            words: [{ correct: 'verdad', prompt: 'Which word denies it, adding no before es?', distractors: [
                        { value: 'mentira', reason: 'Mentira means “lie” by itself — you would say Es mentira, without no. Here we negate the fixed phrase Es verdad.', trapType: 'semantic_neighbor' },
                        { value: 'verdadero', reason: 'Verdadero is “true” as a quality of a thing. The fixed reaction is exactly (no) es verdad, with the noun, not an adjective.', trapType: 'grammar' },
                    ] }] },
        'pt-BR': { meaning: 'Não é verdade', explanation: 'Uma negação direta do que outra pessoa disse. No fica antes de es.', distractors: [
                { value: 'mentira', reason: 'Mentira significa “mentira” por si só — se diria Es mentira, sem no. Aqui negamos a frase fixa Es verdad.', trapType: 'semantic_neighbor' },
                { value: 'verdadero', reason: 'Verdadero é “verdadeiro” como qualidade de uma coisa. A reação fixa é exatamente (no) es verdad, com o substantivo, não um adjetivo.', trapType: 'grammar' },
            ],
            words: [{ correct: 'verdad', prompt: 'Qual palavra nega, colocando no antes de es?', distractors: [
                        { value: 'mentira', reason: 'Mentira significa “mentira” por si só — se diria Es mentira, sem no. Aqui negamos a frase fixa Es verdad.', trapType: 'semantic_neighbor' },
                        { value: 'verdadero', reason: 'Verdadero é “verdadeiro” como qualidade de uma coisa. A reação fixa é exatamente (no) es verdad, com o substantivo, não um adjetivo.', trapType: 'grammar' },
                    ] }] },
        vi: { meaning: 'Điều đó không đúng', explanation: 'Bác bỏ trực tiếp lời người khác. No đứng trước es.', distractors: [
                { value: 'mentira', reason: 'Mentira tự nó nghĩa là “lời nói dối” — sẽ nói Es mentira, không có no. Ở đây ta phủ định cụm từ cố định Es verdad.', trapType: 'semantic_neighbor' },
                { value: 'verdadero', reason: 'Verdadero là “đúng thật” như một đặc tính của sự vật. Phản ứng cố định chính là (no) es verdad, với danh từ, không phải tính từ.', trapType: 'grammar' },
            ],
            words: [{ correct: 'verdad', prompt: 'Từ nào bác bỏ, thêm no trước es?', distractors: [
                        { value: 'mentira', reason: 'Mentira tự nó nghĩa là “lời nói dối” — sẽ nói Es mentira, không có no. Ở đây ta phủ định cụm từ cố định Es verdad.', trapType: 'semantic_neighbor' },
                        { value: 'verdadero', reason: 'Verdadero là “đúng thật” như một đặc tính của sự vật. Phản ứng cố định chính là (no) es verdad, với danh từ, không phải tính từ.', trapType: 'grammar' },
                    ] }] },
        id: { meaning: 'Itu tidak benar', explanation: 'Sanggahan langsung terhadap kata-kata orang lain. No berada sebelum es.', distractors: [
                { value: 'mentira', reason: 'Mentira dengan sendirinya berarti "kebohongan" — akan dikatakan Es mentira, tanpa no. Di sini kita menyangkal frasa tetap Es verdad.', trapType: 'semantic_neighbor' },
                { value: 'verdadero', reason: 'Verdadero adalah "benar" sebagai sifat suatu benda. Reaksi tetapnya adalah (no) es verdad, dengan kata benda, bukan kata sifat.', trapType: 'grammar' },
            ],
            words: [{ correct: 'verdad', prompt: 'Kata mana yang menyanggah, menambahkan no sebelum es?', distractors: [
                        { value: 'mentira', reason: 'Mentira dengan sendirinya berarti "kebohongan" — akan dikatakan Es mentira, tanpa no. Di sini kita menyangkal frasa tetap Es verdad.', trapType: 'semantic_neighbor' },
                        { value: 'verdadero', reason: 'Verdadero adalah "benar" sebagai sifat suatu benda. Reaksi tetapnya adalah (no) es verdad, dengan kata benda, bukan kata sifat.', trapType: 'grammar' },
                    ] }] },
        tr: { meaning: 'Bu doğru değil', explanation: 'Başkasının sözlerinin doğrudan reddi. No, es\'ten önce gelir.', distractors: [
                { value: 'mentira', reason: 'Mentira tek başına "yalan" demektir — Es mentira denirdi, no olmadan. Burada sabit ifade Es verdad\'ı olumsuzluyoruz.', trapType: 'semantic_neighbor' },
                { value: 'verdadero', reason: 'Verdadero bir şeyin niteliği olarak "doğru" demektir. Sabit tepki tam olarak (no) es verdad\'dır, sıfat değil isimle.', trapType: 'grammar' },
            ],
            words: [{ correct: 'verdad', prompt: 'Es\'ten önce no ekleyerek hangi kelime reddeder?', distractors: [
                        { value: 'mentira', reason: 'Mentira tek başına "yalan" demektir — Es mentira denirdi, no olmadan. Burada sabit ifade Es verdad\'ı olumsuzluyoruz.', trapType: 'semantic_neighbor' },
                        { value: 'verdadero', reason: 'Verdadero bir şeyin niteliği olarak "doğru" demektir. Sabit tepki tam olarak (no) es verdad\'dır, sıfat değil isimle.', trapType: 'grammar' },
                    ] }] },
        pl: { meaning: 'To nieprawda', explanation: 'Bezpośrednie zaprzeczenie czyichś słów. No stoi przed es.', distractors: [
                { value: 'mentira', reason: 'Mentira samo w sobie znaczy „kłamstwo” — powiedziałoby się Es mentira, bez no. Tu zaprzeczamy stałemu wyrażeniu Es verdad.', trapType: 'semantic_neighbor' },
                { value: 'verdadero', reason: 'Verdadero to „prawdziwy” jako cecha przedmiotu. Stała reakcja to dokładnie (no) es verdad, z rzeczownikiem, nie przymiotnikiem.', trapType: 'grammar' },
            ],
            words: [{ correct: 'verdad', prompt: 'Które słowo zaprzecza, dodając no przed es?', distractors: [
                        { value: 'mentira', reason: 'Mentira samo w sobie znaczy „kłamstwo” — powiedziałoby się Es mentira, bez no. Tu zaprzeczamy stałemu wyrażeniu Es verdad.', trapType: 'semantic_neighbor' },
                        { value: 'verdadero', reason: 'Verdadero to „prawdziwy” jako cecha przedmiotu. Stała reakcja to dokładnie (no) es verdad, z rzeczownikiem, nie przymiotnikiem.', trapType: 'grammar' },
                    ] }] },
    },
    'es-e01-s01-eres-tranquila': {
        ru: { meaning: 'Ты спокойная?', explanation: 'Вопрос о характере, не о моменте — поэтому ser, а не estar.', distractors: [
                { value: 'tranquilo', reason: 'Tranquilo — если спрашивают мужчину. Здесь женщина.', trapType: 'grammar' },
                { value: 'tranquilamente', reason: 'Tranquilamente — «спокойно» при действии. Признак характера — tranquila.', trapType: 'grammar' },
            ],
            words: [{ correct: 'tranquila', prompt: 'Каким словом спросить женщину о спокойствии характера?', distractors: [
                        { value: 'tranquilo', reason: 'Tranquilo — если спрашивают мужчину. Здесь женщина.', trapType: 'grammar' },
                        { value: 'tranquilamente', reason: 'Tranquilamente — «спокойно» при действии. Признак характера — tranquila.', trapType: 'grammar' },
                    ] }] },
        uk: { meaning: 'Ти спокійна?', explanation: 'Питання про характер, не про момент — тому ser, а не estar.', distractors: [
                { value: 'tranquilo', reason: 'Tranquilo — якщо питають чоловіка. Тут жінка.', trapType: 'grammar' },
                { value: 'tranquilamente', reason: 'Tranquilamente — «спокійно» при дії. Ознака характеру — tranquila.', trapType: 'grammar' },
            ],
            words: [{ correct: 'tranquila', prompt: 'Яким словом запитати жінку про спокій характеру?', distractors: [
                        { value: 'tranquilo', reason: 'Tranquilo — якщо питають чоловіка. Тут жінка.', trapType: 'grammar' },
                        { value: 'tranquilamente', reason: 'Tranquilamente — «спокійно» при дії. Ознака характеру — tranquila.', trapType: 'grammar' },
                    ] }] },
        en: { meaning: 'Are you calm (by nature)?', explanation: 'A question about character, not a moment — that is why ser, not estar.', distractors: [
                { value: 'tranquilo', reason: 'Tranquilo is asked to a man. Here it is a woman.', trapType: 'grammar' },
                { value: 'tranquilamente', reason: 'Tranquilamente is “calmly” describing an action. A character trait is tranquila.', trapType: 'grammar' },
            ],
            words: [{ correct: 'tranquila', prompt: 'Which word asks a woman about her calm nature?', distractors: [
                        { value: 'tranquilo', reason: 'Tranquilo is asked to a man. Here it is a woman.', trapType: 'grammar' },
                        { value: 'tranquilamente', reason: 'Tranquilamente is “calmly” describing an action. A character trait is tranquila.', trapType: 'grammar' },
                    ] }] },
        'pt-BR': { meaning: 'Você é tranquila?', explanation: 'Uma pergunta sobre o caráter, não um momento — por isso ser, não estar.', distractors: [
                { value: 'tranquilo', reason: 'Tranquilo se pergunta a um homem. Aqui é uma mulher.', trapType: 'grammar' },
                { value: 'tranquilamente', reason: 'Tranquilamente é “calmamente” descrevendo uma ação. Um traço de caráter é tranquila.', trapType: 'grammar' },
            ],
            words: [{ correct: 'tranquila', prompt: 'Qual palavra pergunta a uma mulher sobre seu caráter calmo?', distractors: [
                        { value: 'tranquilo', reason: 'Tranquilo se pergunta a um homem. Aqui é uma mulher.', trapType: 'grammar' },
                        { value: 'tranquilamente', reason: 'Tranquilamente é “calmamente” descrevendo uma ação. Um traço de caráter é tranquila.', trapType: 'grammar' },
                    ] }] },
        vi: { meaning: 'Bạn là người điềm tĩnh phải không?', explanation: 'Câu hỏi về tính cách, không phải nhất thời — vì vậy dùng ser, không phải estar.', distractors: [
                { value: 'tranquilo', reason: 'Tranquilo dùng để hỏi đàn ông. Ở đây là phụ nữ.', trapType: 'grammar' },
                { value: 'tranquilamente', reason: 'Tranquilamente là “một cách điềm tĩnh” mô tả hành động. Đặc điểm tính cách là tranquila.', trapType: 'grammar' },
            ],
            words: [{ correct: 'tranquila', prompt: 'Từ nào hỏi một phụ nữ về bản tính điềm tĩnh?', distractors: [
                        { value: 'tranquilo', reason: 'Tranquilo dùng để hỏi đàn ông. Ở đây là phụ nữ.', trapType: 'grammar' },
                        { value: 'tranquilamente', reason: 'Tranquilamente là “một cách điềm tĩnh” mô tả hành động. Đặc điểm tính cách là tranquila.', trapType: 'grammar' },
                    ] }] },
        id: { meaning: 'Apakah kamu tenang (secara sifat)?', explanation: 'Pertanyaan tentang karakter, bukan sesaat — karena itu ser, bukan estar.', distractors: [
                { value: 'tranquilo', reason: 'Tranquilo ditanyakan kepada laki-laki. Di sini perempuan.', trapType: 'grammar' },
                { value: 'tranquilamente', reason: 'Tranquilamente adalah "dengan tenang" menggambarkan tindakan. Sifat karakter adalah tranquila.', trapType: 'grammar' },
            ],
            words: [{ correct: 'tranquila', prompt: 'Kata mana yang menanyakan perempuan tentang sifat tenangnya?', distractors: [
                        { value: 'tranquilo', reason: 'Tranquilo ditanyakan kepada laki-laki. Di sini perempuan.', trapType: 'grammar' },
                        { value: 'tranquilamente', reason: 'Tranquilamente adalah "dengan tenang" menggambarkan tindakan. Sifat karakter adalah tranquila.', trapType: 'grammar' },
                    ] }] },
        tr: { meaning: 'Sakin misin (yaradılıştan)?', explanation: 'Bir an değil, karakter hakkında bir soru — bu yüzden estar değil, ser.', distractors: [
                { value: 'tranquilo', reason: 'Tranquilo bir erkeğe sorulur. Burada bir kadın var.', trapType: 'grammar' },
                { value: 'tranquilamente', reason: 'Tranquilamente bir eylemi niteleyen "sakince" demektir. Karakter özelliği tranquila\'dır.', trapType: 'grammar' },
            ],
            words: [{ correct: 'tranquila', prompt: 'Bir kadına sakin karakteri hakkında hangi kelime sorar?', distractors: [
                        { value: 'tranquilo', reason: 'Tranquilo bir erkeğe sorulur. Burada bir kadın var.', trapType: 'grammar' },
                        { value: 'tranquilamente', reason: 'Tranquilamente bir eylemi niteleyen "sakince" demektir. Karakter özelliği tranquila\'dır.', trapType: 'grammar' },
                    ] }] },
        pl: { meaning: 'Jesteś spokojna?', explanation: 'Pytanie o charakter, nie o chwilę — dlatego ser, nie estar.', distractors: [
                { value: 'tranquilo', reason: 'Tranquilo pyta się mężczyznę. Tu jest kobieta.', trapType: 'grammar' },
                { value: 'tranquilamente', reason: 'Tranquilamente to „spokojnie” opisujące czynność. Cecha charakteru to tranquila.', trapType: 'grammar' },
            ],
            words: [{ correct: 'tranquila', prompt: 'Które słowo pyta kobietę o spokojny charakter?', distractors: [
                        { value: 'tranquilo', reason: 'Tranquilo pyta się mężczyznę. Tu jest kobieta.', trapType: 'grammar' },
                        { value: 'tranquilamente', reason: 'Tranquilamente to „spokojnie” opisujące czynność. Cecha charakteru to tranquila.', trapType: 'grammar' },
                    ] }] },
    },
    'es-e01-s01-no-somos-iguales': {
        ru: { meaning: 'Мы не одинаковые', explanation: 'Множественное число igual — меняется только по числу, не по роду.', distractors: [
                { value: 'igual', reason: 'Igual — единственное число. Речь о нескольких (somos) — нужно iguales.', trapType: 'grammar' },
                { value: 'igualas', reason: 'У igual нет родовых форм — только число меняется: igual/iguales, без -a.', trapType: 'grammar' },
            ],
            words: [{ correct: 'iguales', prompt: 'Как сказать «одинаковые» про нескольких?', distractors: [
                        { value: 'igual', reason: 'Igual — единственное число. Речь о нескольких (somos) — нужно iguales.', trapType: 'grammar' },
                        { value: 'igualas', reason: 'У igual нет родовых форм — только число меняется: igual/iguales, без -a.', trapType: 'grammar' },
                    ] }] },
        uk: { meaning: 'Ми не однакові', explanation: 'Множина igual — змінюється тільки за числом, не за родом.', distractors: [
                { value: 'igual', reason: 'Igual — однина. Мова про декількох (somos) — потрібно iguales.', trapType: 'grammar' },
                { value: 'igualas', reason: 'У igual немає родових форм — тільки число змінюється: igual/iguales, без -a.', trapType: 'grammar' },
            ],
            words: [{ correct: 'iguales', prompt: 'Як сказати «однакові» про декількох?', distractors: [
                        { value: 'igual', reason: 'Igual — однина. Мова про декількох (somos) — потрібно iguales.', trapType: 'grammar' },
                        { value: 'igualas', reason: 'У igual немає родових форм — тільки число змінюється: igual/iguales, без -a.', trapType: 'grammar' },
                    ] }] },
        en: { meaning: 'We are not the same', explanation: 'The plural of igual — it changes only for number, not gender.', distractors: [
                { value: 'igual', reason: 'Igual is singular. Talking about several (somos) — you need iguales.', trapType: 'grammar' },
                { value: 'igualas', reason: 'Igual has no gender forms — only number changes: igual/iguales, no -a.', trapType: 'grammar' },
            ],
            words: [{ correct: 'iguales', prompt: 'How do you say “the same” about several people?', distractors: [
                        { value: 'igual', reason: 'Igual is singular. Talking about several (somos) — you need iguales.', trapType: 'grammar' },
                        { value: 'igualas', reason: 'Igual has no gender forms — only number changes: igual/iguales, no -a.', trapType: 'grammar' },
                    ] }] },
        'pt-BR': { meaning: 'Não somos iguais', explanation: 'O plural de igual — muda só de número, não de gênero.', distractors: [
                { value: 'igual', reason: 'Igual é singular. Falando de várias pessoas (somos) — precisa de iguales.', trapType: 'grammar' },
                { value: 'igualas', reason: 'Igual não tem formas de gênero — só o número muda: igual/iguales, sem -a.', trapType: 'grammar' },
            ],
            words: [{ correct: 'iguales', prompt: 'Como se diz “iguais” sobre várias pessoas?', distractors: [
                        { value: 'igual', reason: 'Igual é singular. Falando de várias pessoas (somos) — precisa de iguales.', trapType: 'grammar' },
                        { value: 'igualas', reason: 'Igual não tem formas de gênero — só o número muda: igual/iguales, sem -a.', trapType: 'grammar' },
                    ] }] },
        vi: { meaning: 'Chúng tôi không giống nhau', explanation: 'Số nhiều của igual — chỉ đổi theo số, không đổi theo giống.', distractors: [
                { value: 'igual', reason: 'Igual là số ít. Nói về nhiều người (somos) — cần iguales.', trapType: 'grammar' },
                { value: 'igualas', reason: 'Igual không có dạng giống — chỉ đổi số: igual/iguales, không có -a.', trapType: 'grammar' },
            ],
            words: [{ correct: 'iguales', prompt: 'Nói “giống nhau” về nhiều người như thế nào?', distractors: [
                        { value: 'igual', reason: 'Igual là số ít. Nói về nhiều người (somos) — cần iguales.', trapType: 'grammar' },
                        { value: 'igualas', reason: 'Igual không có dạng giống — chỉ đổi số: igual/iguales, không có -a.', trapType: 'grammar' },
                    ] }] },
        id: { meaning: 'Kami tidak sama', explanation: 'Bentuk jamak igual — hanya berubah menurut jumlah, bukan gender.', distractors: [
                { value: 'igual', reason: 'Igual adalah tunggal. Berbicara tentang beberapa orang (somos) — perlu iguales.', trapType: 'grammar' },
                { value: 'igualas', reason: 'Igual tidak punya bentuk gender — hanya jumlah yang berubah: igual/iguales, tanpa -a.', trapType: 'grammar' },
            ],
            words: [{ correct: 'iguales', prompt: 'Bagaimana mengatakan "sama" tentang beberapa orang?', distractors: [
                        { value: 'igual', reason: 'Igual adalah tunggal. Berbicara tentang beberapa orang (somos) — perlu iguales.', trapType: 'grammar' },
                        { value: 'igualas', reason: 'Igual tidak punya bentuk gender — hanya jumlah yang berubah: igual/iguales, tanpa -a.', trapType: 'grammar' },
                    ] }] },
        tr: { meaning: 'Biz aynı değiliz', explanation: 'Igual\'in çoğulu — sadece sayıya göre değişir, cinsiyete göre değil.', distractors: [
                { value: 'igual', reason: 'Igual tekildir. Birkaç kişi hakkında (somos) — iguales gerekir.', trapType: 'grammar' },
                { value: 'igualas', reason: 'Igual\'in cinsiyet biçimi yoktur — sadece sayı değişir: igual/iguales, -a olmadan.', trapType: 'grammar' },
            ],
            words: [{ correct: 'iguales', prompt: 'Birkaç kişi hakkında "aynı" nasıl söylenir?', distractors: [
                        { value: 'igual', reason: 'Igual tekildir. Birkaç kişi hakkında (somos) — iguales gerekir.', trapType: 'grammar' },
                        { value: 'igualas', reason: 'Igual\'in cinsiyet biçimi yoktur — sadece sayı değişir: igual/iguales, -a olmadan.', trapType: 'grammar' },
                    ] }] },
        pl: { meaning: 'Nie jesteśmy tacy sami', explanation: 'Liczba mnoga igual — zmienia się tylko przez liczbę, nie przez rodzaj.', distractors: [
                { value: 'igual', reason: 'Igual to liczba pojedyncza. Mowa o kilku (somos) — potrzeba iguales.', trapType: 'grammar' },
                { value: 'igualas', reason: 'Igual nie ma form rodzajowych — zmienia się tylko liczba: igual/iguales, bez -a.', trapType: 'grammar' },
            ],
            words: [{ correct: 'iguales', prompt: 'Jak powiedzieć „tacy sami” o kilku osobach?', distractors: [
                        { value: 'igual', reason: 'Igual to liczba pojedyncza. Mowa o kilku (somos) — potrzeba iguales.', trapType: 'grammar' },
                        { value: 'igualas', reason: 'Igual nie ma form rodzajowych — zmienia się tylko liczba: igual/iguales, bez -a.', trapType: 'grammar' },
                    ] }] },
    },
    'es-e01-s01-es-caro': {
        ru: { meaning: 'Это дорого', explanation: 'Оценка цены — одна из самых частых в поездке или магазине.', distractors: [
                { value: 'cara', reason: 'Cara согласуется с существительным женского рода. Здесь безличная оценка «это» — по умолчанию мужской род: caro.', trapType: 'grammar' },
                { value: 'caramente', reason: 'Caramente — «дорогой ценой» при действии. Признак предмета — caro.', trapType: 'grammar' },
            ],
            words: [{ correct: 'caro', prompt: 'Каким словом сказать «дорого»?', distractors: [
                        { value: 'cara', reason: 'Cara согласуется с существительным женского рода. Здесь безличная оценка «это» — по умолчанию мужской род: caro.', trapType: 'grammar' },
                        { value: 'caramente', reason: 'Caramente — «дорогой ценой» при действии. Признак предмета — caro.', trapType: 'grammar' },
                    ] }] },
        uk: { meaning: 'Це дорого', explanation: 'Оцінка ціни — одна з найчастіших у поїздці чи магазині.', distractors: [
                { value: 'cara', reason: 'Cara узгоджується з іменником жіночого роду. Тут безособова оцінка «це» — за замовчуванням чоловічий рід: caro.', trapType: 'grammar' },
                { value: 'caramente', reason: 'Caramente — «дорогою ціною» при дії. Ознака предмета — caro.', trapType: 'grammar' },
            ],
            words: [{ correct: 'caro', prompt: 'Яким словом сказати «дорого»?', distractors: [
                        { value: 'cara', reason: 'Cara узгоджується з іменником жіночого роду. Тут безособова оцінка «це» — за замовчуванням чоловічий рід: caro.', trapType: 'grammar' },
                        { value: 'caramente', reason: 'Caramente — «дорогою ціною» при дії. Ознака предмета — caro.', trapType: 'grammar' },
                    ] }] },
        en: { meaning: 'It is expensive', explanation: 'A price verdict — one of the most common ones while traveling or shopping.', distractors: [
                { value: 'cara', reason: 'Cara agrees with a feminine noun. Here the impersonal “it” takes the default masculine: caro.', trapType: 'grammar' },
                { value: 'caramente', reason: 'Caramente is “at a high cost” describing an action. The quality of the thing is caro.', trapType: 'grammar' },
            ],
            words: [{ correct: 'caro', prompt: 'Which word means “expensive”?', distractors: [
                        { value: 'cara', reason: 'Cara agrees with a feminine noun. Here the impersonal “it” takes the default masculine: caro.', trapType: 'grammar' },
                        { value: 'caramente', reason: 'Caramente is “at a high cost” describing an action. The quality of the thing is caro.', trapType: 'grammar' },
                    ] }] },
        'pt-BR': { meaning: 'É caro', explanation: 'Uma avaliação de preço — uma das mais comuns em viagens ou compras.', distractors: [
                { value: 'cara', reason: 'Cara concorda com um substantivo feminino. Aqui a avaliação impessoal “isto” usa o masculino padrão: caro.', trapType: 'grammar' },
                { value: 'caramente', reason: 'Caramente é “a um custo alto” descrevendo uma ação. A qualidade da coisa é caro.', trapType: 'grammar' },
            ],
            words: [{ correct: 'caro', prompt: 'Qual palavra significa “caro”?', distractors: [
                        { value: 'cara', reason: 'Cara concorda com um substantivo feminino. Aqui a avaliação impessoal “isto” usa o masculino padrão: caro.', trapType: 'grammar' },
                        { value: 'caramente', reason: 'Caramente é “a um custo alto” descrevendo uma ação. A qualidade da coisa é caro.', trapType: 'grammar' },
                    ] }] },
        vi: { meaning: 'Cái này đắt', explanation: 'Nhận định về giá cả — một trong những nhận định phổ biến nhất khi đi du lịch hoặc mua sắm.', distractors: [
                { value: 'cara', reason: 'Cara hòa hợp với danh từ giống cái. Ở đây nhận định vô nhân xưng “điều này” dùng giống đực mặc định: caro.', trapType: 'grammar' },
                { value: 'caramente', reason: 'Caramente là “với giá đắt” mô tả hành động. Đặc tính của đồ vật là caro.', trapType: 'grammar' },
            ],
            words: [{ correct: 'caro', prompt: 'Từ nào nghĩa là “đắt”?', distractors: [
                        { value: 'cara', reason: 'Cara hòa hợp với danh từ giống cái. Ở đây nhận định vô nhân xưng “điều này” dùng giống đực mặc định: caro.', trapType: 'grammar' },
                        { value: 'caramente', reason: 'Caramente là “với giá đắt” mô tả hành động. Đặc tính của đồ vật là caro.', trapType: 'grammar' },
                    ] }] },
        id: { meaning: 'Ini mahal', explanation: 'Penilaian harga — salah satu yang paling umum saat bepergian atau berbelanja.', distractors: [
                { value: 'cara', reason: 'Cara sesuai dengan kata benda feminin. Di sini penilaian tak berpribadi "ini" memakai maskulin bawaan: caro.', trapType: 'grammar' },
                { value: 'caramente', reason: 'Caramente adalah "dengan biaya mahal" menggambarkan tindakan. Sifat bendanya adalah caro.', trapType: 'grammar' },
            ],
            words: [{ correct: 'caro', prompt: 'Kata mana yang berarti "mahal"?', distractors: [
                        { value: 'cara', reason: 'Cara sesuai dengan kata benda feminin. Di sini penilaian tak berpribadi "ini" memakai maskulin bawaan: caro.', trapType: 'grammar' },
                        { value: 'caramente', reason: 'Caramente adalah "dengan biaya mahal" menggambarkan tindakan. Sifat bendanya adalah caro.', trapType: 'grammar' },
                    ] }] },
        tr: { meaning: 'Bu pahalı', explanation: 'Bir fiyat yargısı — seyahat ederken veya alışverişte en yaygın olanlardan biri.', distractors: [
                { value: 'cara', reason: 'Cara dişil bir isimle uyumludur. Burada kişisiz "bu" yargısı varsayılan eril biçimi kullanır: caro.', trapType: 'grammar' },
                { value: 'caramente', reason: 'Caramente bir eylemi niteleyen "yüksek bedelle" demektir. Şeyin niteliği caro\'dur.', trapType: 'grammar' },
            ],
            words: [{ correct: 'caro', prompt: '"Pahalı" anlamına hangi kelime gelir?', distractors: [
                        { value: 'cara', reason: 'Cara dişil bir isimle uyumludur. Burada kişisiz "bu" yargısı varsayılan eril biçimi kullanır: caro.', trapType: 'grammar' },
                        { value: 'caramente', reason: 'Caramente bir eylemi niteleyen "yüksek bedelle" demektir. Şeyin niteliği caro\'dur.', trapType: 'grammar' },
                    ] }] },
        pl: { meaning: 'To drogie', explanation: 'Ocena ceny — jedna z najczęstszych w podróży lub sklepie.', distractors: [
                { value: 'cara', reason: 'Cara zgadza się z rzeczownikiem rodzaju żeńskiego. Tu bezosobowa ocena „to” używa domyślnego rodzaju męskiego: caro.', trapType: 'grammar' },
                { value: 'caramente', reason: 'Caramente to „za wysoką cenę” opisujące czynność. Cecha rzeczy to caro.', trapType: 'grammar' },
            ],
            words: [{ correct: 'caro', prompt: 'Które słowo znaczy „drogie”?', distractors: [
                        { value: 'cara', reason: 'Cara zgadza się z rzeczownikiem rodzaju żeńskiego. Tu bezosobowa ocena „to” używa domyślnego rodzaju męskiego: caro.', trapType: 'grammar' },
                        { value: 'caramente', reason: 'Caramente to „za wysoką cenę” opisujące czynność. Cecha rzeczy to caro.', trapType: 'grammar' },
                    ] }] },
    },
});
//# sourceMappingURL=es_episode_01_session_01_localized_details_v1.js.map