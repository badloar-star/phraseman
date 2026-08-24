"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EPISODE_01_SESSION_12_LISTEN_FEEDBACK_V1 = void 0;
exports.episode01Session12ListenFeedbackV1 = episode01Session12ListenFeedbackV1;
exports.episode01Session12FormFeedbackV1 = episode01Session12FormFeedbackV1;
const L = (value) => value;
/** Exact listening traps for the two meaning-choice tasks in session 12. */
exports.EPISODE_01_SESSION_12_LISTEN_FEEDBACK_V1 = Object.freeze({
    'Am I busy?\u0000Am I tired?': L({
        ru: 'Am I tired? спрашивает, хватает ли сил; усталость может быть и при свободном расписании. Здесь проверяется занятость и наличие времени, поэтому нужен вопрос Am I busy?',
        uk: 'Am I tired? питає, чи вистачає сил; утома можлива й за вільного розкладу. Тут перевіряється зайнятість і наявність часу, тому потрібне Am I busy?',
        es: 'Am I tired? pregunta por la falta de energía, que puede existir aunque tengas tiempo libre. Aquí se comprueba si estás ocupado, por eso corresponde Am I busy?',
        'pt-BR': 'Am I tired? pergunta pela falta de energia, que pode existir mesmo com tempo livre. Aqui se confirma se você está ocupado, por isso a resposta é Am I busy?',
        vi: 'Am I tired? hỏi bạn có thiếu sức hay không; mệt vẫn có thể xảy ra khi lịch đang trống. Ở đây cần kiểm tra sự bận rộn và thời gian, nên phải chọn Am I busy?',
        id: 'Am I tired? menanyakan kekurangan tenaga, yang bisa terjadi meskipun jadwal kosong. Di sini yang diperiksa ialah kesibukan dan waktu, jadi pilih Am I busy?',
        tr: 'Am I tired? enerjinizin kalıp kalmadığını sorar; boş vaktiniz olsa da yorgun olabilirsiniz. Burada zamanınızın dolu olup olmadığı kontrol edilir, bu yüzden Am I busy? gerekir.',
        pl: 'Am I tired? pyta o brak energii, który może wystąpić także przy wolnym kalendarzu. Tutaj sprawdzasz zajętość i dostępny czas, dlatego potrzebne jest Am I busy?',
    }),
    'Am I busy?\u0000Am I happy?': L({
        ru: 'Am I happy? проверяет чувство счастья, а счастливый человек всё равно может быть занят. Здесь вопрос относится к расписанию и свободному времени, поэтому точная фраза — Am I busy?',
        uk: 'Am I happy? перевіряє відчуття щастя, але щаслива людина все одно може бути зайнята. Тут запитання стосується розкладу й вільного часу, тому точна фраза — Am I busy?',
        es: 'Am I happy? comprueba una emoción; una persona feliz también puede estar ocupada. Aquí la pregunta trata de la agenda y del tiempo disponible, así que la frase exacta es Am I busy?',
        'pt-BR': 'Am I happy? confirma uma emoção; uma pessoa feliz também pode estar ocupada. Aqui a pergunta trata da agenda e do tempo disponível, então a frase exata é Am I busy?',
        vi: 'Am I happy? kiểm tra cảm giác hạnh phúc; một người vui vẫn có thể đang bận. Ở đây câu hỏi nói về lịch và thời gian rảnh, nên câu chính xác là Am I busy?',
        id: 'Am I happy? memeriksa perasaan bahagia; orang yang bahagia tetap bisa sibuk. Di sini pertanyaannya tentang jadwal dan waktu luang, jadi kalimat tepatnya Am I busy?',
        tr: 'Am I happy? mutluluk duygusunu sorgular; mutlu bir insan yine de meşgul olabilir. Burada takvim ve boş zaman sorulduğundan doğru cümle Am I busy? olur.',
        pl: 'Am I happy? sprawdza poczucie szczęścia, a szczęśliwa osoba nadal może być zajęta. Tutaj pytanie dotyczy kalendarza i wolnego czasu, więc dokładna fraza to Am I busy?',
    }),
    'Am I calm?\u0000Am I busy?': L({
        ru: 'Am I busy? спрашивает о количестве дел и свободном времени. Занятый человек может оставаться спокойным, а здесь нужно назвать внутреннее состояние: Am I calm?',
        uk: 'Am I busy? питає про кількість справ і вільний час. Зайнята людина може лишатися спокійною, а тут треба назвати внутрішній стан: Am I calm?',
        es: 'Am I busy? pregunta por las tareas y el tiempo disponible. Puedes estar ocupado y seguir tranquilo; aquí se pide el estado interior, Am I calm?',
        'pt-BR': 'Am I busy? pergunta pelas tarefas e pelo tempo disponível. Você pode estar ocupado e continuar calmo; aqui se pede o estado interior, Am I calm?',
        vi: 'Am I busy? hỏi về số việc và thời gian rảnh. Bạn vẫn có thể bình tĩnh khi đang bận; ở đây cần nói đến trạng thái bên trong: Am I calm?',
        id: 'Am I busy? menanyakan banyaknya pekerjaan dan waktu luang. Kamu bisa sibuk sekaligus tetap tenang; di sini yang dicari ialah keadaan batin, Am I calm?',
        tr: 'Am I busy? işlerin ve boş zamanın durumunu sorar. Meşgulken de sakin kalabilirsiniz; burada iç durum sorulduğu için Am I calm? gerekir.',
        pl: 'Am I busy? pyta o liczbę spraw i wolny czas. Można być zajętym i jednocześnie spokojnym; tutaj chodzi o stan wewnętrzny, czyli Am I calm?',
    }),
    'Am I calm?\u0000Am I tired?': L({
        ru: 'Am I tired? проверяет физическую или умственную усталость. Усталость не говорит, насколько вы спокойны, а здесь нужно оценить именно внутреннее напряжение: Am I calm?',
        uk: 'Am I tired? перевіряє фізичну або розумову втому. Утома не показує, наскільки ви спокійні, а тут треба оцінити саме внутрішнє напруження: Am I calm?',
        es: 'Am I tired? comprueba el cansancio físico o mental. El cansancio no dice si estás tranquilo; aquí se evalúa la tensión interior con Am I calm?',
        'pt-BR': 'Am I tired? confirma o cansaço físico ou mental. O cansaço não diz se você está calmo; aqui se avalia a tensão interior com Am I calm?',
        vi: 'Am I tired? kiểm tra sự mệt mỏi về thể chất hoặc tinh thần. Mệt không cho biết bạn có bình tĩnh hay không; ở đây cần đánh giá căng thẳng bên trong bằng Am I calm?',
        id: 'Am I tired? memeriksa kelelahan fisik atau mental. Lelah tidak menunjukkan apakah kamu tenang; di sini yang dinilai ialah ketegangan batin melalui Am I calm?',
        tr: 'Am I tired? bedensel ya da zihinsel yorgunluğu kontrol eder. Yorgunluk sakin olup olmadığınızı göstermez; burada iç gerginlik Am I calm? ile sorgulanır.',
        pl: 'Am I tired? sprawdza zmęczenie fizyczne albo psychiczne. Zmęczenie nie mówi, czy jesteś spokojny; tutaj oceniasz napięcie wewnętrzne przez Am I calm?',
    }),
});
function episode01Session12ListenFeedbackV1(locale, correct, wrong) {
    return exports.EPISODE_01_SESSION_12_LISTEN_FEEDBACK_V1[`${correct}\u0000${wrong}`]?.[locale];
}
const FORM_FEEDBACK = Object.freeze({
    Is: L({
        ru: 'Is заманчиво, потому что это знакомая форма to be, но она работает с he, she, it или одним предметом. Здесь человек называет себя через I, а с I возможна только форма am.',
        uk: 'Is приваблює як знайома форма to be, але вона працює з he, she, it або одним предметом. Тут людина називає себе через I, а з I можлива лише форма am.',
        es: 'Is atrae porque también es una forma conocida de to be, pero acompaña a he, she, it o una sola cosa. Aquí la persona es I, y con I la única forma posible es am.',
        'pt-BR': 'Is chama atenção por também ser uma forma conhecida de to be, mas acompanha he, she, it ou uma coisa. Aqui a pessoa é I, e com I a única forma possível é am.',
        vi: 'Is dễ gây nhầm vì cũng là một dạng quen thuộc của to be, nhưng nó đi với he, she, it hoặc một vật số ít. Ở đây người nói là I, và I chỉ đi với am.',
        id: 'Is menggoda karena juga merupakan bentuk to be yang dikenal, tetapi dipakai dengan he, she, it, atau satu benda. Di sini orangnya ialah I, dan I hanya berpasangan dengan am.',
        tr: 'Is tanıdık bir to be biçimi olduğu için çekici gelir, ancak he, she, it ya da tek bir nesneyle kullanılır. Burada kişi I olduğundan yalnız am kullanılabilir.',
        pl: 'Is kusi, bo także jest znaną formą to be, lecz łączy się z he, she, it albo jedną rzeczą. Tutaj osobą jest I, a z I możliwa jest tylko forma am.',
    }),
    Are: L({
        ru: 'Are часто встречается в вопросах и потому легко просится на первое место. Но сразу после связки стоит I: пара I + are невозможна, вопрос о себе начинается с am.',
        uk: 'Are часто трапляється в запитаннях, тому його легко поставити на початок. Але відразу після зв’язки стоїть I: пара I + are неможлива, запитання про себе починається з am.',
        es: 'Are aparece con frecuencia al principio de preguntas y por eso resulta tentador. Pero la palabra siguiente es I: I + are no concuerda y la pregunta sobre uno mismo empieza con am.',
        'pt-BR': 'Are aparece muitas vezes no início de perguntas e por isso parece tentador. Mas a palavra seguinte é I: I + are não concorda e a pergunta sobre si começa com am.',
        vi: 'Are thường xuất hiện ở đầu câu hỏi nên rất dễ được chọn. Nhưng từ ngay sau đó là I: I không đi với are, câu hỏi về bản thân phải bắt đầu bằng am.',
        id: 'Are sering muncul di awal pertanyaan sehingga mudah dipilih. Namun kata berikutnya ialah I: I tidak berpasangan dengan are, jadi pertanyaan tentang diri dimulai dengan am.',
        tr: 'Are soruların başında sık görüldüğü için kolayca seçilebilir. Fakat hemen ardından I gelir: I + are eşleşmez, kişinin kendisiyle ilgili soru am ile başlar.',
        pl: 'Are często pojawia się na początku pytań, dlatego łatwo je wybrać. Jednak zaraz po nim stoi I: I + are nie zgadza się, a pytanie o siebie zaczyna się od am.',
    }),
});
function episode01Session12FormFeedbackV1(locale, target, wrong) {
    if (!/^Am I\b/u.test(target) || (wrong !== 'Is' && wrong !== 'Are'))
        return undefined;
    return FORM_FEEDBACK[wrong][locale];
}
//# sourceMappingURL=episode_01_session_12_task_feedback_v1.js.map