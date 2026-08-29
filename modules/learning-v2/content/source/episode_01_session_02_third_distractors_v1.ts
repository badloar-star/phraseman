import type {
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

type ContactStage = keyof SessionVocabularySourceV1['contacts'];
type VocabularyDistractor = SessionVocabularyContactSourceV1['distractors'][number];

export const EPISODE_01_SESSION_02_THIRD_DISTRACTORS_V1: Readonly<
  Record<string, Partial<Record<ContactStage, VocabularyDistractor>>>
> = Object.freeze({
  happy: Object.freeze({
    recognize: Object.freeze({ value: 'hoppy', reasonCode: 'happy_recognize_hoppy_open_vowel', trapType: 'phonetic', feedback: {
      ru: 'Hoppy звучит похоже, но начинается с открытого /ɒ/ и означает «хмельной». В happy слышно /hæ/ и речь идёт о радости.', uk: 'Hoppy звучить схоже, але починається відкритим /ɒ/ і означає «хмільний». У happy чути /hæ/ і йдеться про радість.', es: 'Hoppy se parece, pero empieza con /ɒ/ y significa «con sabor a lúpulo». Happy lleva /hæ/ y expresa alegría.', 'pt-BR': 'Hoppy soa parecido, mas começa com /ɒ/ e significa «com sabor de lúpulo». Happy tem /hæ/ e expressa alegria.', vi: 'Hoppy nghe gần giống nhưng bắt đầu bằng /ɒ/ và nói về vị hoa bia. Happy có /hæ/ và chỉ niềm vui.', id: 'Hoppy terdengar mirip, tetapi dimulai /ɒ/ dan berarti berasa hop. Happy memakai /hæ/ dan menyatakan kegembiraan.', tr: 'Hoppy benzer duyulur ama /ɒ/ ile başlar ve “şerbetçiotlu” demektir. Happy /hæ/ ile başlar ve sevinci anlatır.', pl: 'Hoppy brzmi podobnie, ale zaczyna się /ɒ/ i znaczy „chmielowy”. Happy ma /hæ/ i opisuje radość.',
    } }),
    retrieve_meaning: Object.freeze({ value: 'ready', reasonCode: 'happy_meaning_ready_preparation', trapType: 'semantic_neighbor', feedback: {
      ru: 'Ready означает «готов» и говорит о возможности начать. Happy означает «счастлив» и называет радость.', uk: 'Ready означає «готовий» і говорить про можливість почати. Happy означає «щасливий» і називає радість.', es: 'Ready significa «listo para empezar». Happy significa «feliz» y nombra la alegría.', 'pt-BR': 'Ready significa «pronto para começar». Happy significa «feliz» e nomeia a alegria.', vi: 'Ready nghĩa là sẵn sàng bắt đầu. Happy nghĩa là vui và gọi tên niềm vui.', id: 'Ready berarti siap memulai. Happy berarti senang dan menamai kegembiraan.', tr: 'Ready başlamaya hazır olmayı anlatır. Happy “mutlu” demektir ve sevinci adlandırır.', pl: 'Ready znaczy „gotowy do rozpoczęcia”. Happy znaczy „szczęśliwy” i nazywa radość.',
    } }),
    build_form: Object.freeze({ value: 'hapy', reasonCode: 'happy_form_missing_second_p', trapType: 'orthographic', feedback: {
      ru: 'Hapy теряет одну p. Слово happy держит в середине две p перед y.', uk: 'Hapy губить одну p. Слово happy має всередині дві p перед y.', es: 'Hapy pierde una p. Happy lleva dos p antes de la y.', 'pt-BR': 'Hapy perde um p. Happy leva dois p antes do y.', vi: 'Hapy thiếu một chữ p. Happy có hai chữ p trước y.', id: 'Hapy kehilangan satu p. Happy memakai dua p sebelum y.', tr: 'Hapy bir p harfini eksiltir. Happy, y öncesinde iki p ile yazılır.', pl: 'Hapy gubi jedną literę p. Happy ma dwa p przed y.',
    } }),
  }),
  sad: Object.freeze({
    retrieve_meaning: Object.freeze({ value: 'angry', reasonCode: 'sad_meaning_angry_wrong_emotion', trapType: 'semantic_neighbor', feedback: {
      ru: 'Angry тоже называет неприятное чувство, но означает «злой». Sad означает «грустный».', uk: 'Angry теж називає неприємне почуття, але означає «злий». Sad означає «сумний».', es: 'Angry también es una emoción incómoda, pero significa «enfadado». Sad significa «triste».', 'pt-BR': 'Angry também é uma emoção desagradável, mas significa «bravo». Sad significa «triste».', vi: 'Angry cũng là cảm xúc khó chịu nhưng nghĩa là tức giận. Sad nghĩa là buồn.', id: 'Angry juga emosi yang tidak nyaman, tetapi berarti marah. Sad berarti sedih.', tr: 'Angry de rahatsız edici bir duygudur ama “kızgın” demektir. Sad “üzgün” demektir.', pl: 'Angry też nazywa nieprzyjemne uczucie, ale znaczy „zły”. Sad znaczy „smutny”.',
    } }),
    build_form: Object.freeze({ value: 'sand', reasonCode: 'sad_form_extra_n', trapType: 'orthographic', feedback: {
      ru: 'Sand добавляет n и означает «песок». Грусть пишется короче: sad.', uk: 'Sand додає n й означає «пісок». Смуток пишеться коротше: sad.', es: 'Sand añade una n y significa «arena». El estado triste se escribe sad.', 'pt-BR': 'Sand acrescenta n e significa «areia». O estado triste se escreve sad.', vi: 'Sand thêm chữ n và nghĩa là cát. Trạng thái buồn được viết sad.', id: 'Sand menambah n dan berarti pasir. Keadaan sedih ditulis sad.', tr: 'Sand n harfi ekler ve “kum” demektir. Üzgün durum sad yazılır.', pl: 'Sand dodaje n i znaczy „piasek”. Smutny stan zapisuje się sad.',
    } }),
  }),
  tired: Object.freeze({
    recognize: Object.freeze({ value: 'tide', reasonCode: 'tired_recognize_tide_missing_r', trapType: 'phonetic', feedback: {
      ru: 'Tide означает «прилив» и заканчивается сразу /d/. В tired перед /d/ слышно /ər/: /ˈtaɪərd/.', uk: 'Tide означає «приплив» і закінчується одразу /d/. У tired перед /d/ чути /ər/: /ˈtaɪərd/.', es: 'Tide significa «marea» y llega directamente a /d/. Tired conserva /ər/ antes de /d/: /ˈtaɪərd/.', 'pt-BR': 'Tide significa «maré» e chega direto ao /d/. Tired mantém /ər/ antes de /d/: /ˈtaɪərd/.', vi: 'Tide nghĩa là thủy triều và đi thẳng tới âm /d/. Tired có /ər/ trước /d/: /ˈtaɪərd/.', id: 'Tide berarti pasang dan langsung berakhir /d/. Tired memiliki /ər/ sebelum /d/: /ˈtaɪərd/.', tr: 'Tide “gelgit” demektir ve doğrudan /d/ ile biter. Tired içinde /d/ öncesinde /ər/ duyulur: /ˈtaɪərd/.', pl: 'Tide znaczy „przypływ” i od razu kończy się /d/. W tired przed /d/ słychać /ər/: /ˈtaɪərd/.',
    } }),
    retrieve_meaning: Object.freeze({ value: 'busy', reasonCode: 'tired_meaning_busy_activity', trapType: 'semantic_neighbor', feedback: {
      ru: 'Busy означает «занят» и говорит о количестве дел. Tired означает «устал» и говорит о нехватке сил.', uk: 'Busy означає «зайнятий» і говорить про кількість справ. Tired означає «втомлений» і говорить про брак сил.', es: 'Busy significa «ocupado» y habla de tareas. Tired significa «cansado» y habla de falta de energía.', 'pt-BR': 'Busy significa «ocupado» e fala de tarefas. Tired significa «cansado» e fala de falta de energia.', vi: 'Busy nghĩa là bận và nói về nhiều việc. Tired nghĩa là mệt và nói về thiếu sức.', id: 'Busy berarti sibuk dan berkaitan dengan banyak tugas. Tired berarti lelah dan kekurangan tenaga.', tr: 'Busy “meşgul” demektir ve işleri anlatır. Tired “yorgun” demektir ve enerji eksikliğini anlatır.', pl: 'Busy znaczy „zajęty” i mówi o obowiązkach. Tired znaczy „zmęczony” i mówi o braku sił.',
    } }),
    build_form: Object.freeze({ value: 'tire', reasonCode: 'tired_form_missing_final_d', trapType: 'grammar', feedback: {
      ru: 'Tire — форма «утомлять» или слово «шина». Состояние человека получает d: tired.', uk: 'Tire — форма «втомлювати» або слово «шина». Стан людини отримує d: tired.', es: 'Tire significa «cansar» o «neumático». El estado de una persona añade d: tired.', 'pt-BR': 'Tire significa «cansar» ou «pneu». O estado da pessoa acrescenta d: tired.', vi: 'Tire nghĩa là làm mệt hoặc lốp xe. Trạng thái của người thêm d: tired.', id: 'Tire berarti membuat lelah atau ban. Keadaan orang menambahkan d: tired.', tr: 'Tire “yormak” ya da “lastik” demektir. Kişinin durumu d alır: tired.', pl: 'Tire znaczy „męczyć” albo „opona”. Stan osoby otrzymuje d: tired.',
    } }),
  }),
  fine: Object.freeze({
    retrieve_meaning: Object.freeze({ value: 'ready', reasonCode: 'fine_meaning_ready_preparation', trapType: 'semantic_neighbor', feedback: {
      ru: 'Ready означает «готов» и отвечает на вопрос о начале. Fine означает «нормально» и описывает самочувствие.', uk: 'Ready означає «готовий» і відповідає на питання про початок. Fine означає «нормально» й описує самопочуття.', es: 'Ready significa «listo para empezar». Fine significa «bien» y describe cómo se siente la persona.', 'pt-BR': 'Ready significa «pronto para começar». Fine significa «bem» e descreve como a pessoa está.', vi: 'Ready nghĩa là sẵn sàng bắt đầu. Fine nghĩa là ổn và tả trạng thái của người nói.', id: 'Ready berarti siap memulai. Fine berarti baik-baik saja dan menggambarkan keadaan penutur.', tr: 'Ready başlamaya hazır olmayı anlatır. Fine “iyiyim” demektir ve kişinin durumunu anlatır.', pl: 'Ready znaczy „gotowy do rozpoczęcia”. Fine znaczy „w porządku” i opisuje samopoczucie.',
    } }),
    build_form: Object.freeze({ value: 'line', reasonCode: 'fine_form_initial_l_instead_of_f', trapType: 'orthographic', feedback: {
      ru: 'Line начинается с l и означает «линия». Состояние «нормально» начинается с f: fine.', uk: 'Line починається з l й означає «лінія». Стан «нормально» починається з f: fine.', es: 'Line empieza con l y significa «línea». El estado «bien» empieza con f: fine.', 'pt-BR': 'Line começa com l e significa «linha». O estado «bem» começa com f: fine.', vi: 'Line bắt đầu bằng l và nghĩa là đường kẻ. Trạng thái “ổn” bắt đầu bằng f: fine.', id: 'Line dimulai l dan berarti garis. Keadaan “baik” dimulai f: fine.', tr: 'Line l ile başlar ve “çizgi” demektir. “İyiyim” durumu f ile başlar: fine.', pl: 'Line zaczyna się l i znaczy „linia”. Stan „w porządku” zaczyna się f: fine.',
    } }),
  }),
});
