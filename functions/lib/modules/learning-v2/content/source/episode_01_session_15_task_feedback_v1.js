"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.episode01Session15ChoiceTargetsV1 = episode01Session15ChoiceTargetsV1;
exports.episode01Session15ChoiceFeedbackV1 = episode01Session15ChoiceFeedbackV1;
exports.episode01Session15FormFeedbackV1 = episode01Session15FormFeedbackV1;
const L = (value) => value;
const CHOICE_TARGETS = Object.freeze({
    "Am I ready?": ["I am ready.", "Are you ready?"],
    "I am ready.": ["Am I ready?", "You’re ready."],
    "Are you at home?": ["Am I at home?", "Are you okay?"],
    "Am I at home?": ["I am at home.", "Are you at home?"],
});
function episode01Session15ChoiceTargetsV1(correct) {
    return CHOICE_TARGETS[correct];
}
const FEEDBACK = Object.freeze({
    "Am I ready?\u0000I am ready.": L({
        ru: "I am ready. звучит почти так же, но прямой порядок сообщает «Я готов». В записи am стоит перед I, поэтому человек спрашивает о себе: Am I ready?",
        uk: "I am ready. звучить майже так само, але прямий порядок повідомляє «Я готовий». У записі am стоїть перед I, тому людина запитує про себе: Am I ready?",
        es: "I am ready. contiene las mismas palabras, pero su orden directo afirma «estoy listo». En el audio, am aparece antes de I, así que la frase es la pregunta Am I ready?",
        "pt-BR": "I am ready. tem as mesmas palavras, mas a ordem direta afirma «estou pronto». No áudio, am vem antes de I, portanto a frase é a pergunta Am I ready?",
        vi: "I am ready. có cùng từ nhưng trật tự thẳng tạo câu kể “tôi sẵn sàng”. Trong âm thanh, am đứng trước I nên đây là câu hỏi Am I ready?",
        id: "I am ready. memakai kata yang sama, tetapi urutan langsung menyatakan “saya siap”. Dalam audio, am terdengar sebelum I, jadi bentuknya Am I ready?",
        tr: "I am ready. aynı sözcükleri düz sırada kullanıp “Hazırım” bildirimi yapar. Kayıtta am, I önünde duyulduğu için doğru biçim Am I ready? sorusudur.",
        pl: "I am ready. ma te same słowa, lecz prosty szyk stwierdza „jestem gotowy”. W nagraniu am stoi przed I, dlatego słychać pytanie Am I ready?",
    }),
    "Am I ready?\u0000Are you ready?": L({
        ru: "Are you ready? тоже вопрос о готовности, поэтому отвлекает сильнее всего, но он обращён к you. Здесь слышно Am I: говорящий спрашивает именно о себе.",
        uk: "Are you ready? теж питає про готовність і тому легко збиває, але звертається до you. Тут чути Am I: мовець запитує саме про себе.",
        es: "Are you ready? también pregunta por la preparación y por eso resulta tentadora, pero se dirige a you. Aquí se oye Am I: quien habla pregunta por sí mismo.",
        "pt-BR": "Are you ready? também pergunta sobre prontidão e por isso parece próxima, mas se dirige a you. Aqui se ouve Am I: quem fala pergunta sobre si mesmo.",
        vi: "Are you ready? cũng hỏi về sự sẵn sàng nên rất dễ gây nhầm, nhưng câu đó hướng tới you. Âm thanh ở đây mở đầu Am I, tức người nói hỏi về mình.",
        id: "Are you ready? juga menanyakan kesiapan sehingga tampak sangat dekat, tetapi diarahkan kepada you. Di sini terdengar Am I, jadi penutur bertanya tentang dirinya.",
        tr: "Are you ready? de hazırlığı sorduğu için güçlü bir tuzaktır, fakat you kişisine yönelir. Burada Am I duyulur; konuşan kendi durumunu sorar.",
        pl: "Are you ready? także pyta o gotowość, więc łatwo je wybrać, lecz zwraca się do you. Tutaj słychać Am I: mówiący pyta właśnie o siebie.",
    }),
    "I am ready.\u0000Am I ready?": L({
        ru: "Am I ready? сохраняет те же слова, но am перед I превращает их в вопрос. В записи первым слышно I, поэтому это спокойное утверждение I am ready.",
        uk: "Am I ready? зберігає ті самі слова, але am перед I перетворює їх на запитання. У записі першим чути I, тому це спокійне твердження I am ready.",
        es: "Am I ready? conserva las mismas palabras, pero am delante de I las convierte en pregunta. En la grabación se oye primero I, por eso corresponde la afirmación I am ready.",
        "pt-BR": "Am I ready? mantém as mesmas palavras, mas am antes de I cria uma pergunta. Na gravação, I aparece primeiro, então a frase é a afirmação I am ready.",
        vi: "Am I ready? giữ nguyên các từ nhưng am đứng trước I sẽ tạo câu hỏi. Trong âm thanh, I được nghe trước nên đây là câu khẳng định I am ready.",
        id: "Am I ready? mempertahankan kata yang sama, tetapi am sebelum I membuat pertanyaan. Dalam rekaman, I terdengar lebih dahulu, jadi jawabannya I am ready.",
        tr: "Am I ready? aynı sözcükleri korur, fakat am biçimini I önüne alarak soru kurar. Kayıtta önce I duyulduğu için doğru bildirim I am ready. olur.",
        pl: "Am I ready? zachowuje te same słowa, ale am przed I tworzy pytanie. W nagraniu pierwsze słychać I, więc jest to spokojne stwierdzenie I am ready.",
    }),
    "I am ready.\u0000You’re ready.": L({
        ru: "You’re ready. тоже утверждает готовность, но говорит о собеседнике: в начале слышно you. Здесь говорящий произносит I am и сообщает о собственной готовности.",
        uk: "You’re ready. теж стверджує готовність, але говорить про співрозмовника: на початку чути you. Тут мовець вимовляє I am і повідомляє про власну готовність.",
        es: "You’re ready. también afirma preparación, pero habla del interlocutor y empieza con you. Aquí se oye I am: quien habla comunica su propia preparación.",
        "pt-BR": "You’re ready. também afirma prontidão, mas fala do interlocutor e começa com you. Aqui se ouve I am: quem fala comunica a própria prontidão.",
        vi: "You’re ready. cũng xác nhận sự sẵn sàng nhưng nói về người nghe và mở đầu bằng you. Ở đây nghe thấy I am nên người nói đang nói về chính mình.",
        id: "You’re ready. juga menyatakan kesiapan, tetapi membicarakan lawan bicara dan dimulai dengan you. Di sini terdengar I am, sehingga penutur berbicara tentang dirinya.",
        tr: "You’re ready. de hazırlık bildirir, ancak you ile başlayıp karşıdaki kişiyi anlatır. Burada I am duyulur; konuşan kendi hazırlığını bildirir.",
        pl: "You’re ready. także stwierdza gotowość, lecz mówi o rozmówcy i zaczyna się od you. Tutaj słychać I am, więc mówiący opisuje własną gotowość.",
    }),
    "Am I okay?\u0000Are": L({
        ru: "Are кажется подходящим началом вопроса, но оно требует you и направляет вопрос собеседнику. Здесь после пропуска стоит I, поэтому нужна личная пара Am I.",
        uk: "Are здається доречним початком запитання, але воно потребує you і спрямовує питання співрозмовнику. Тут після пропуску стоїть I, тому потрібна пара Am I.",
        es: "Are parece un buen inicio de pregunta, pero necesita you y dirige la pregunta al interlocutor. Aquí después del espacio aparece I, de modo que la pareja correcta es Am I.",
        "pt-BR": "Are parece um bom começo de pergunta, mas precisa de you e dirige a pergunta ao interlocutor. Aqui, depois do espaço, aparece I; portanto a dupla correta é Am I.",
        vi: "Are trông giống phần mở đầu câu hỏi nhưng phải đi với you và hướng tới người nghe. Sau chỗ trống ở đây là I nên cặp đúng phải là Am I.",
        id: "Are tampak seperti awal pertanyaan yang tepat, tetapi berpasangan dengan you dan diarahkan kepada lawan bicara. Setelah celah ada I, jadi pasangan yang benar Am I.",
        tr: "Are bir soru başlangıcı gibi görünür, fakat you ile eşleşir ve soruyu karşıdaki kişiye yöneltir. Boşluktan sonra I geldiği için doğru çift Am I olmalıdır.",
        pl: "Are wygląda jak właściwy początek pytania, lecz łączy się z you i kieruje pytanie do rozmówcy. Po luce stoi I, dlatego potrzebna jest para Am I.",
    }),
    "Am I okay?\u0000Is": L({
        ru: "Is часто стоит в начале английского вопроса, поэтому выглядит правдоподобно, но относится к he, she или it. С местоимением I используется только am: Am I okay?",
        uk: "Is часто стоїть на початку англійського запитання й тому виглядає правдоподібно, але стосується he, she або it. Із займенником I вживається лише am: Am I okay?",
        es: "Is abre muchas preguntas inglesas y por eso parece posible, pero corresponde a he, she o it. Con el pronombre I se usa exclusivamente am: Am I okay?",
        "pt-BR": "Is inicia muitas perguntas em inglês e por isso parece possível, mas pertence a he, she ou it. Com o pronome I usa-se apenas am: Am I okay?",
        vi: "Is thường mở đầu câu hỏi tiếng Anh nên dễ bị chọn, nhưng nó đi với he, she hoặc it. Với đại từ I chỉ dùng am, vì vậy câu đúng là Am I okay?",
        id: "Is sering membuka pertanyaan bahasa Inggris sehingga tampak masuk akal, tetapi dipakai bersama he, she, atau it. Untuk I bentuknya hanya am: Am I okay?",
        tr: "Is birçok İngilizce soruyu açtığı için olası görünür, fakat he, she ya da it ile kullanılır. I zamiri yalnız am biçimini seçer: Am I okay?",
        pl: "Is często otwiera angielskie pytania, więc wygląda wiarygodnie, lecz pasuje do he, she lub it. Z zaimkiem I używa się wyłącznie am: Am I okay?",
    }),
    "Are you at home?\u0000Am I at home?": L({
        ru: "Am I at home? сохраняет то же место, но меняет человека: говорящий спрашивает о себе. В записи слышно Are you, поэтому вопрос обращён к собеседнику.",
        uk: "Am I at home? зберігає те саме місце, але змінює людину: мовець запитує про себе. У записі чути Are you, тому питання звернене до співрозмовника.",
        es: "Am I at home? conserva el mismo lugar, pero cambia la persona: quien habla pregunta por sí mismo. En el audio se oye Are you, así que la pregunta va al interlocutor.",
        "pt-BR": "Am I at home? mantém o mesmo lugar, mas muda a pessoa: quem fala pergunta sobre si. No áudio se ouve Are you, então a pergunta é dirigida ao interlocutor.",
        vi: "Am I at home? giữ cùng địa điểm nhưng đổi người, vì người nói hỏi về chính mình. Âm thanh ở đây là Are you nên câu hỏi hướng tới người nghe.",
        id: "Am I at home? mempertahankan tempat yang sama, tetapi mengganti orang karena penutur bertanya tentang dirinya. Audio berbunyi Are you, jadi pertanyaan ditujukan kepada lawan bicara.",
        tr: "Am I at home? aynı yeri korur fakat kişiyi değiştirir; konuşan kendisini sorar. Kayıtta Are you duyulduğu için soru karşınızdaki kişiye yönelir.",
        pl: "Am I at home? zachowuje to samo miejsce, lecz zmienia osobę: mówiący pyta o siebie. W nagraniu słychać Are you, dlatego pytanie jest skierowane do rozmówcy.",
    }),
    "Are you at home?\u0000Are you okay?": L({
        ru: "Are you okay? правильно сохраняет обращение Are you, поэтому начало звучит одинаково, но окончание okay спрашивает о состоянии. В записи слышно at home — вопрос именно о месте.",
        uk: "Are you okay? правильно зберігає звертання Are you, тому початок звучить однаково, але закінчення okay питає про стан. У записі чути at home — питання саме про місце.",
        es: "Are you okay? conserva correctamente Are you y por eso comparte el mismo comienzo, pero okay pregunta por el estado. En el audio se oye at home: la pregunta es sobre el lugar.",
        "pt-BR": "Are you okay? preserva corretamente Are you e por isso tem o mesmo começo, mas okay pergunta sobre o estado. No áudio se ouve at home: a pergunta é sobre o lugar.",
        vi: "Are you okay? giữ đúng phần đầu Are you nên nghe rất giống, nhưng okay hỏi về tình trạng. Âm thanh ở đây có at home, vì vậy câu hỏi nói về địa điểm.",
        id: "Are you okay? mempertahankan awal Are you sehingga bunyinya sangat dekat, tetapi okay menanyakan keadaan. Dalam audio terdengar at home, jadi pertanyaannya tentang tempat.",
        tr: "Are you okay? Are you başlangıcını doğru koruduğu için çok yakın duyulur, fakat okay durumu sorar. Kayıtta at home vardır; soru kişinin bulunduğu yer hakkındadır.",
        pl: "Are you okay? poprawnie zachowuje początek Are you, więc brzmi bardzo podobnie, lecz okay pyta o stan. W nagraniu słychać at home, dlatego pytanie dotyczy miejsca.",
    }),
    "Am I at home?\u0000I am at home.": L({
        ru: "I am at home. содержит те же место и человека, но прямой порядок утверждает «Я дома». Здесь am слышно перед I, значит говорящий задаёт вопрос Am I at home?",
        uk: "I am at home. містить те саме місце й ту саму людину, але прямий порядок стверджує «Я вдома». Тут am чути перед I, отже мовець ставить питання Am I at home?",
        es: "I am at home. mantiene la misma persona y el mismo lugar, pero el orden directo afirma «estoy en casa». Aquí am se oye antes de I, así que la frase es Am I at home?",
        "pt-BR": "I am at home. mantém a mesma pessoa e o mesmo lugar, mas a ordem direta afirma «estou em casa». Aqui am é ouvido antes de I, então a frase é Am I at home?",
        vi: "I am at home. giữ cùng người và địa điểm nhưng trật tự thẳng tạo câu kể “tôi ở nhà”. Ở đây am được nghe trước I nên câu đúng là Am I at home?",
        id: "I am at home. menjaga orang dan tempat yang sama, tetapi urutan langsung menyatakan “saya di rumah”. Di sini am terdengar sebelum I, jadi bentuknya Am I at home?",
        tr: "I am at home. aynı kişiyi ve yeri korur, fakat düz sıra “Evdeyim” bildirimi yapar. Burada am, I önünde duyulduğu için doğru soru Am I at home? olur.",
        pl: "I am at home. zachowuje tę samą osobę i miejsce, lecz prosty szyk stwierdza „jestem w domu”. Tutaj am słychać przed I, więc właściwe jest pytanie Am I at home?",
    }),
    "Am I at home?\u0000Are you at home?": L({
        ru: "Are you at home? спрашивает о том же месте, но обращается к you. Здесь начало Am I показывает, что говорящий просит подтвердить собственное местонахождение.",
        uk: "Are you at home? питає про те саме місце, але звертається до you. Тут початок Am I показує, що мовець просить підтвердити власне місцезнаходження.",
        es: "Are you at home? pregunta por el mismo lugar, pero se dirige a you. Aquí el comienzo Am I muestra que quien habla pide confirmar su propia ubicación.",
        "pt-BR": "Are you at home? pergunta sobre o mesmo lugar, mas se dirige a you. Aqui o começo Am I mostra que quem fala pede confirmação da própria localização.",
        vi: "Are you at home? hỏi cùng một địa điểm nhưng hướng tới you. Phần mở đầu Am I ở đây cho biết người nói đang nhờ xác nhận vị trí của chính mình.",
        id: "Are you at home? menanyakan tempat yang sama, tetapi diarahkan kepada you. Awal Am I menunjukkan bahwa penutur meminta kepastian tentang lokasinya sendiri.",
        tr: "Are you at home? aynı yeri sorar, fakat you kişisine yönelir. Buradaki Am I başlangıcı, konuşanın kendi yerini doğrulatmak istediğini gösterir.",
        pl: "Are you at home? pyta o to samo miejsce, lecz zwraca się do you. Początek Am I pokazuje tutaj, że mówiący prosi o potwierdzenie własnego położenia.",
    }),
});
function feedback(locale, correct, wrong) {
    return FEEDBACK[`${correct}\u0000${wrong}`]?.[locale];
}
function episode01Session15ChoiceFeedbackV1(locale, correct, wrong) {
    return feedback(locale, correct, wrong);
}
function episode01Session15FormFeedbackV1(locale, target, wrong) {
    return feedback(locale, target, wrong);
}
//# sourceMappingURL=episode_01_session_15_task_feedback_v1.js.map