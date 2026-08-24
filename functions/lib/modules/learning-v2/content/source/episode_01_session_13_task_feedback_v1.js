"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.episode01Session13ListenFeedbackV1 = episode01Session13ListenFeedbackV1;
exports.episode01Session13FormFeedbackV1 = episode01Session13FormFeedbackV1;
const L = (value) => value;
/** Exact meaning contrasts for the two listening choices in session 13. */
const LISTEN_FEEDBACK = Object.freeze({
    "You’re busy.\u0000You’re tired.": L({
        ru: "You’re tired. говорит об усталости и нехватке сил, но уставший человек может иметь свободное время. Здесь слышно busy — занятость делами, поэтому точная фраза You’re busy.",
        uk: "You’re tired. говорить про втому й нестачу сил, але втомлена людина може мати вільний час. Тут чути busy — зайнятість справами, тому точна фраза You’re busy.",
        es: "You’re tired. habla de cansancio y falta de energía, pero una persona cansada puede tener tiempo libre. Aquí se oye busy, que indica ocupación, por eso la frase exacta es You’re busy.",
        "pt-BR": "You’re tired. fala de cansaço e falta de energia, mas uma pessoa cansada pode ter tempo livre. Aqui se ouve busy, que indica ocupação, então a frase exata é You’re busy.",
        vi: "You’re tired. nói về sự mệt mỏi và thiếu sức, nhưng người mệt vẫn có thể đang rảnh. Ở đây âm cần nhận ra là busy, chỉ sự bận rộn, nên câu đúng là You’re busy.",
        id: "You’re tired. menyatakan kelelahan dan kurang tenaga, tetapi orang lelah masih bisa punya waktu luang. Di sini yang terdengar ialah busy, yaitu kesibukan, jadi kalimat tepatnya You’re busy.",
        tr: "You’re tired. yorgunluğu ve enerji eksikliğini anlatır; yorgun birinin yine de boş vakti olabilir. Burada işlerle dolu olmayı belirten busy duyulur, bu yüzden tam cümle You’re busy. olur.",
        pl: "You’re tired. mówi o zmęczeniu i braku energii, ale zmęczona osoba może mieć wolny czas. Tutaj słychać busy, czyli zajętość, dlatego dokładna fraza to You’re busy.",
    }),
    "You’re busy.\u0000You’re happy.": L({
        ru: "You’re happy. описывает чувство счастья, которое не показывает, свободен ли человек. Здесь речь о количестве дел и слышно busy, поэтому нужен вариант You’re busy.",
        uk: "You’re happy. описує відчуття щастя, яке не показує, чи людина вільна. Тут ідеться про кількість справ і чути busy, тому потрібний варіант You’re busy.",
        es: "You’re happy. describe felicidad y no indica si la persona tiene tiempo. Aquí se habla de sus tareas y se oye busy, así que corresponde You’re busy.",
        "pt-BR": "You’re happy. descreve felicidade e não indica se a pessoa tem tempo. Aqui se fala das tarefas e se ouve busy, portanto a opção correta é You’re busy.",
        vi: "You’re happy. mô tả niềm vui chứ không cho biết người đó có rảnh hay không. Ở đây nói về số việc và nghe thấy busy, vì thế phải chọn You’re busy.",
        id: "You’re happy. menggambarkan kebahagiaan, bukan apakah orang itu punya waktu. Di sini yang dibahas ialah pekerjaan dan terdengar busy, sehingga pilih You’re busy.",
        tr: "You’re happy. mutluluğu anlatır ve kişinin boş vakti olup olmadığını göstermez. Burada iş yoğunluğu söylenir ve busy duyulur; bu yüzden You’re busy. gerekir.",
        pl: "You’re happy. opisuje szczęście, a nie dostępny czas. Tutaj chodzi o liczbę spraw i słychać busy, dlatego właściwym wyborem jest You’re busy.",
    }),
    "You’re calm.\u0000You’re busy.": L({
        ru: "You’re busy. сообщает, что у человека много дел. Занятость не исключает спокойствия, а здесь слышно calm и оценивается внутреннее состояние, поэтому нужно You’re calm.",
        uk: "You’re busy. повідомляє, що людина має багато справ. Зайнятість не виключає спокою, а тут чути calm і оцінюється внутрішній стан, тому потрібне You’re calm.",
        es: "You’re busy. indica que alguien tiene muchas tareas. Estar ocupado no impide estar tranquilo; aquí se oye calm y se valora el estado interior, por eso corresponde You’re calm.",
        "pt-BR": "You’re busy. indica que alguém tem muitas tarefas. Estar ocupado não impede estar calmo; aqui se ouve calm e se avalia o estado interior, então a resposta é You’re calm.",
        vi: "You’re busy. cho biết một người có nhiều việc. Bận rộn không có nghĩa là mất bình tĩnh; ở đây nghe thấy calm và cần nói trạng thái bên trong, nên chọn You’re calm.",
        id: "You’re busy. menunjukkan bahwa seseorang memiliki banyak pekerjaan. Sibuk tidak berarti tidak tenang; di sini terdengar calm dan yang dinilai keadaan batin, jadi pilih You’re calm.",
        tr: "You’re busy. kişinin çok işi olduğunu söyler. Meşgul olmak sakin olmaya engel değildir; burada calm duyulur ve iç durum anlatılır, bu yüzden You’re calm. gerekir.",
        pl: "You’re busy. mówi, że ktoś ma wiele spraw. Zajętość nie wyklucza spokoju; tutaj słychać calm i oceniany jest stan wewnętrzny, więc potrzebne jest You’re calm.",
    }),
    "You’re calm.\u0000You’re tired.": L({
        ru: "You’re tired. относится к физической или умственной усталости. Усталость не определяет внутреннее напряжение, а здесь слышно calm — «спокоен», поэтому ответ You’re calm.",
        uk: "You’re tired. стосується фізичної або розумової втоми. Втома не визначає внутрішнього напруження, а тут чути calm — «спокійний», тому відповідь You’re calm.",
        es: "You’re tired. se refiere al cansancio físico o mental. El cansancio no determina la tensión interior; aquí se oye calm, «tranquilo», por eso la respuesta es You’re calm.",
        "pt-BR": "You’re tired. refere-se ao cansaço físico ou mental. O cansaço não determina a tensão interior; aqui se ouve calm, «calmo», então a resposta é You’re calm.",
        vi: "You’re tired. nói về sự mệt mỏi thể chất hoặc tinh thần. Mệt không cho biết mức căng thẳng bên trong; ở đây nghe thấy calm, nghĩa là “bình tĩnh”, nên đáp án là You’re calm.",
        id: "You’re tired. berkaitan dengan kelelahan fisik atau mental. Lelah tidak menentukan ketegangan batin; di sini terdengar calm, “tenang”, jadi jawabannya You’re calm.",
        tr: "You’re tired. bedensel ya da zihinsel yorgunluğu anlatır. Yorgunluk iç gerginliği belirlemez; burada “sakin” anlamındaki calm duyulduğu için cevap You’re calm. olur.",
        pl: "You’re tired. dotyczy zmęczenia fizycznego albo psychicznego. Zmęczenie nie określa napięcia wewnętrznego; tutaj słychać calm, „spokojny”, więc odpowiedź to You’re calm.",
    }),
});
function episode01Session13ListenFeedbackV1(locale, correct, wrong) {
    return LISTEN_FEEDBACK[`${correct}\u0000${wrong}`]?.[locale];
}
const YOUR_FEEDBACK = Object.freeze({
    ru: (target) => `Your звучит так же, как You’re, но это притяжательное слово: после него нужна вещь, например your book. В «${target}» после начала идёт состояние или место, поэтому требуется You’re = you are.`,
    uk: (target) => `Your звучить так само, як You’re, але це присвійне слово: після нього потрібна річ, наприклад your book. У «${target}» після початку йде стан або місце, тому потрібне You’re = you are.`,
    es: (target) => `Your suena igual que You’re, pero es posesivo y necesita una cosa después, como en your book. En «${target}» sigue un estado o lugar, así que corresponde You’re = you are.`,
    "pt-BR": (target) => `Your tem o mesmo som de You’re, mas é possessivo e precisa de uma coisa depois, como em your book. Em «${target}» vem um estado ou lugar, então é necessário You’re = you are.`,
    vi: (target) => `Your phát âm giống You’re nhưng là từ sở hữu và phải có tên một vật phía sau, như your book. Trong “${target}”, phần sau là trạng thái hoặc nơi chốn nên cần You’re = you are.`,
    id: (target) => `Your terdengar sama dengan You’re, tetapi menyatakan kepemilikan dan harus diikuti benda, seperti your book. Dalam “${target}” sesudahnya ada keadaan atau tempat, jadi bentuknya You’re = you are.`,
    tr: (target) => `Your, You’re ile aynı duyulur; ancak sahiplik bildirir ve ardından your book gibi bir nesne ister. «${target}» içinde ardından durum ya da yer geldiği için You’re = you are gerekir.`,
    pl: (target) => `Your brzmi tak samo jak You’re, ale oznacza przynależność i wymaga potem rzeczy, jak w your book. W „${target}” dalej jest stan albo miejsce, więc potrzebne jest You’re = you are.`,
});
const YOU_FEEDBACK = Object.freeze({
    ru: (target) => `You правильно называет собеседника, но само по себе не связывает его с признаком или местом. В «${target}» нужна связка are; сокращение You’re сохраняет её, а вариант с одним You оставляет связку пропущенной.`,
    uk: (target) => `You правильно називає співрозмовника, але саме не пов’язує його з ознакою чи місцем. У «${target}» потрібна зв’язка are; скорочення You’re зберігає її, а варіант з одним You лишає зв’язку пропущеною.`,
    es: (target) => `You identifica correctamente al interlocutor, pero por sí solo no lo une con una cualidad o lugar. En «${target}» hace falta are; You’re la conserva y el You aislado deja el enlace ausente.`,
    "pt-BR": (target) => `You identifica corretamente o interlocutor, mas sozinho não o liga a uma característica ou lugar. Em «${target}» é preciso are; You’re preserva essa ligação e o You isolado a deixa ausente.`,
    vi: (target) => `You gọi đúng người nghe nhưng một mình nó không nối người ấy với đặc điểm hoặc nơi chốn. Trong “${target}” cần are; You’re giữ từ nối này, còn chỉ có You thì câu bị thiếu liên kết.`,
    id: (target) => `You menyebut lawan bicara dengan benar, tetapi sendirian tidak menghubungkannya dengan sifat atau tempat. Dalam “${target}” diperlukan are; You’re menyimpannya, sedangkan You saja menghilangkan penghubung.`,
    tr: (target) => `You doğru kişiyi gösterir, fakat tek başına onu özellik ya da yerle bağlamaz. «${target}» içinde are bağı gerekir; You’re bu bağı korur, yalnız You ise bağı eksik bırakır.`,
    pl: (target) => `You poprawnie wskazuje rozmówcę, lecz samo nie łączy go z cechą ani miejscem. W „${target}” potrzebne jest are; You’re je zachowuje, a samo You pozostawia brak łącznika.`,
});
function episode01Session13FormFeedbackV1(locale, target, wrong) {
    if (!/^You’re\b/u.test(target))
        return undefined;
    if (wrong === "Your")
        return YOUR_FEEDBACK[locale](target);
    if (wrong === "You")
        return YOU_FEEDBACK[locale](target);
    return undefined;
}
//# sourceMappingURL=episode_01_session_13_task_feedback_v1.js.map