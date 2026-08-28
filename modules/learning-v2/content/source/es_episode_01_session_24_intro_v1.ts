import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-28, карта сессий es_episode_01_session_map_v1.ts,
// сессия 24 "Он, она, оно целиком" / kind: 'checkpoint', builtOn: [17..23],
// recalls: [17,19,20,21,22]): интро НЕ упоминает "сессию/урок/главу/курс/экран/
// карточку" (тот же чёрный список слов, что и в сессиях 8 и 16) — вместо
// этого прямо говорит о том, что проверяется владение материалом главы 3
// целиком, без подсказок, без разбивки на отдельные темы.
//
// ВАЖНО (перепись 2026-08-28, первая версия этого файла блокировалась
// intro_body_overloaded ВО ВСЕХ 8 локалях сразу — тексты были по 600-750
// знаков и по 5 предложений вместо лимита 320/4): ES_EPISODE_01_SESSION_24_CHECKPOINT_PHRASES
// — это ровно те же 15 фраз, что и у voice-сессии 23
// (es_episode_01_session_23_phrases_v1.ts), взятые ТОЛЬКО из сессий 17/18/20
// (findPhrase из ES_S17/ES_S18/ES_S20 — сессии 19/21/22 в пуле физически
// нет, хотя map перечисляет их в recalls). sessionVisibleTargetWords()
// строит разрешённый словарь ИЗ ЭТИХ ЖЕ 15 фраз — поэтому "el"/"la"/"libro"/
// "negación" (тема сессии 21/19) гейтом intro_mentions_unknown_word
// отклоняются как непройденные слова, а вот caro/barato (18), no es fácil
// (17, отрицание), es verdad/¿Es fácil? (17/20, вопрос-согласие),
// importante/igual (17) — пройдены и упоминать их можно. Тексты ниже сужены
// именно до этого фактического набора: путаница caro/barato (цена) и
// пропуск отрицания в no es fácil — единственные две реальные ловушки
// внутри имеющихся 15 фраз.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_24_CHECKPOINT_TITLE = L({
  ru: 'Он, она, оно целиком',
  uk: 'Він, вона, воно цілком',
  es: '"He", "she", "it" all together',
  'pt-BR': '"Ele", "ela", "isso" juntos',
  vi: 'Tất cả về "anh ấy", "cô ấy", "nó" cùng một lúc',
  id: 'Semua tentang "dia", "dia", "itu" sekaligus',
  tr: '"O" hakkında her şey birlikte',
  pl: '„On”, „ona”, „to” razem',
});

export const ES_EPISODE_01_SESSION_24_CHECKPOINT_SUMMARY = L({
  ru: 'Все связки и оценочные слова про предметы и ситуации, встречавшиеся до сих пор, проверяются вместе, без подсказок и без разбивки по темам.',
  uk: 'Усі зв’язки й оцінні слова про предмети й ситуації, що траплялися досі, перевіряються разом, без підказок і без розбивки за темами.',
  es: 'All the linking words and judgment words about things and situations seen so far are checked together, without hints and without splitting by topic.',
  'pt-BR': 'Todas as ligações e palavras de avaliação sobre coisas e situações vistas até agora são verificadas juntas, sem dicas e sem divisão por tema.',
  vi: 'Tất cả các từ nối và từ đánh giá về vật và tình huống đã gặp cho đến nay được kiểm tra cùng nhau, không gợi ý và không chia theo chủ đề.',
  id: 'Semua kata penghubung dan kata penilaian tentang benda dan situasi yang sudah dijumpai sejauh ini diperiksa bersama, tanpa petunjuk dan tanpa pembagian berdasarkan topik.',
  tr: 'Şimdiye kadar görülen, şeyler ve durumlar hakkındaki tüm bağlayıcılar ve değerlendirme kelimeleri birlikte kontrol edilir, ipucu olmadan ve konuya göre ayrım yapılmadan.',
  pl: 'Wszystkie łączniki i słowa oceny o rzeczach i sytuacjach poznane dotąd są sprawdzane razem, bez podpowiedzi i bez podziału na tematy.',
});

export const ES_EPISODE_01_SESSION_24_CHECKPOINT_GOAL = L({
  ru: 'Правильно применить любое из уже известных слов и формул о предметах и ситуациях без подсказки, в произвольном порядке.',
  uk: 'Правильно застосувати будь-яке з уже відомих слів і формул про предмети й ситуації без підказки, у довільному порядку.',
  es: 'Correctly apply any of the already-known words and formulas about things and situations without a hint, in any order.',
  'pt-BR': 'Aplicar corretamente qualquer uma das palavras e fórmulas sobre coisas e situações já conhecidas sem dica, em qualquer ordem.',
  vi: 'Áp dụng đúng bất kỳ từ hoặc công thức nào về vật và tình huống đã biết mà không có gợi ý, theo bất kỳ thứ tự nào.',
  id: 'Menerapkan dengan benar salah satu dari kata dan rumus tentang benda dan situasi yang sudah dikenal tanpa petunjuk, dalam urutan apa pun.',
  tr: 'Zaten bilinen, şeyler ve durumlar hakkındaki kelimelerden ve formüllerden herhangi birini ipucu olmadan, herhangi bir sırayla doğru şekilde uygulamak.',
  pl: 'Poprawnie zastosować dowolne ze znanych już słów i formuł o rzeczach i sytuacjach bez podpowiedzi, w dowolnej kolejności.',
});

const CONCEPT_BODY = L({
  ru: 'До сих пор каждое правило встречалось отдельно: то только цена (caro и barato), то только фраза-согласие (es verdad), то только отрицание (no es fácil). Здесь темы перемешаны без предупреждения. Проверяется умение самому узнать нужное правило, а не вспомнить одно заученное. Подсказки заранее не будет.',
  uk: 'Досі кожне правило траплялося окремо: то лише ціна (caro та barato), то лише фраза-згода (es verdad), то лише заперечення (no es fácil). Тут теми перемішані без попередження. Перевіряється вміння самому впізнати потрібне правило, а не згадати одне завчене. Підказки заздалегідь не буде.',
  es: 'Until now, each rule showed up on its own: only price (caro/barato), only the agreement phrase (es verdad), or only the negation (no es fácil). Here the topics mix with no warning. What is checked is recognizing the right rule on your own, not recalling one memorized rule. No hint is given in advance.',
  'pt-BR': 'Até agora, cada regra aparecia sozinha: só preço (caro e barato), ou só a frase de concordância (es verdad), ou só a negação (no es fácil). Aqui os temas se misturam sem aviso. O que se verifica é a capacidade de reconhecer a regra certa sozinho, não de lembrar uma regra decorada. Não há dica dada de antemão.',
  vi: 'Cho đến giờ, mỗi quy tắc xuất hiện riêng lẻ: chỉ giá cả (caro và barato), hoặc chỉ cụm đồng ý (es verdad), hoặc chỉ phủ định (no es fácil). Ở đây các chủ đề trộn lẫn không báo trước. Điều được kiểm tra là khả năng tự nhận ra đúng quy tắc, không phải nhớ lại một quy tắc đã học thuộc. Không có gợi ý cho trước.',
  id: 'Sampai sekarang, tiap aturan muncul sendiri: hanya harga (caro/barato), hanya frasa setuju (es verdad), atau hanya negasi (no es fácil). Di sini topik tercampur tanpa peringatan. Yang diperiksa adalah kemampuan mengenali aturan yang tepat sendiri, bukan mengingat satu aturan hafalan. Tidak ada petunjuk sebelumnya.',
  tr: 'Şimdiye kadar her kural tek başına vardı: yalnızca fiyat (caro/barato), yalnızca onay ifadesi (es verdad) ya da yalnızca olumsuzlama (no es fácil). Burada konular uyarı yapılmadan karışır. Kontrol edilen, doğru kuralı kendi başına tanıma becerisidir, ezberlenmiş bir kuralı hatırlamak değil. Önceden ipucu yoktur.',
  pl: 'Do tej pory każda reguła pojawiała się osobno: albo tylko cena (caro/barato), albo tylko fraza zgody (es verdad), albo tylko przeczenie (no es fácil). Tutaj tematy są pomieszane bez ostrzeżenia. Sprawdza się samodzielne rozpoznanie właściwej reguły, a nie przypomnienie wyuczonej reguły. Nie ma podpowiedzi z góry.',
});

const FORMULA_BODY = L({
  ru: 'Формула проверки простая: сначала понять, о чём фраза — о цене, о согласии или о признаке вроде importante, — и только потом выбрать нужное слово. Es caro и Es barato звучат похоже, но значат противоположное. No es fácil берёт то же no es, что и обычное утверждение, только с отрицанием впереди.',
  uk: 'Формула перевірки проста: спершу зрозуміти, про що фраза — про ціну, згоду чи ознаку на кшталт importante, — і лише потім обрати потрібне слово. Es caro та Es barato звучать подібно, але означають протилежне. No es fácil бере те саме no es, що й звичайне твердження, лише із запереченням спереду.',
  es: 'The checking formula is simple: first work out what the phrase is about — price, agreement, or a quality like importante — then pick the right word. Es caro and Es barato sound similar but mean the opposite. No es fácil uses the same no es as a plain statement, just with a negation in front.',
  'pt-BR': 'A fórmula de verificação é simples: primeiro entender do que a frase trata — preço, concordância ou uma qualidade como importante — depois escolher a palavra certa. Es caro e Es barato soam parecidos, mas significam o oposto. No es fácil usa o mesmo no es de uma afirmação comum, só com uma negação na frente.',
  vi: 'Công thức kiểm tra rất đơn giản: trước tiên hiểu câu nói về điều gì — giá cả, sự đồng ý, hay đặc điểm như importante — rồi chọn đúng từ. Es caro và Es barato nghe giống nhau nhưng có nghĩa trái ngược. No es fácil dùng cùng no es như câu khẳng định bình thường, chỉ thêm phủ định phía trước.',
  id: 'Rumus pemeriksaannya sederhana: pertama pahami inti kalimat — harga, persetujuan, atau sifat seperti importante — lalu pilih kata yang tepat. Es caro dan Es barato terdengar mirip tetapi artinya berlawanan. No es fácil memakai no es yang sama dengan pernyataan biasa, hanya dengan negasi di depan.',
  tr: 'Kontrol formülü basittir: önce cümlenin neyle ilgili olduğunu anlamak — fiyat, onay ya da importante gibi bir nitelik — sonra doğru kelimeyi seçmek. Es caro ve Es barato benzer görünür ama zıt anlama gelir. No es fácil, sıradan bir ifadeyle aynı no es\'i kullanır, sadece önünde olumsuzlama vardır.',
  pl: 'Formuła sprawdzenia jest prosta: najpierw zrozumieć, o czym jest fraza — o cenie, zgodzie czy cesze jak importante — potem wybrać właściwe słowo. Es caro i Es barato brzmią podobnie, ale znaczą coś przeciwnego. No es fácil używa tego samego no es co zwykłe stwierdzenie, tylko z przeczeniem z przodu.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка здесь — перепутать caro и barato: оба про цену, но означают противоположное. Вторая ловушка — забыть отрицание в no es fácil и ответить так, будто фраза утвердительная. Проверка простая: сначала понять, что отрицается или сравнивается, и только потом выбрать слово.',
  uk: 'Найчастіша помилка тут — сплутати caro та barato: обидва про ціну, але означають протилежне. Друга пастка — забути заперечення в no es fácil і відповісти так, ніби фраза стверджувальна. Перевірка проста: спершу зрозуміти, що заперечується чи порівнюється, і лише потім обрати слово.',
  es: 'The most common mistake here is confusing caro and barato: both are about price, but mean the opposite. A second trap is forgetting the negation in no es fácil and answering as if the phrase were positive. The check is simple: first work out what is negated or compared, then choose the word.',
  'pt-BR': 'O erro mais comum aqui é confundir caro e barato: ambos falam de preço, mas significam o oposto. Uma segunda armadilha é esquecer a negação em no es fácil e responder como se a frase fosse afirmativa. A checagem é simples: primeiro descobrir o que é negado ou comparado, depois escolher a palavra.',
  vi: 'Lỗi phổ biến nhất ở đây là nhầm lẫn caro và barato: cả hai đều nói về giá cả, nhưng có nghĩa trái ngược nhau. Cái bẫy thứ hai là quên phủ định trong no es fácil và trả lời như thể câu là khẳng định. Cách kiểm tra đơn giản: trước tiên xác định điều gì bị phủ định hay so sánh, rồi chọn từ.',
  id: 'Kesalahan paling umum di sini adalah tertukar antara caro dan barato: keduanya tentang harga, tetapi artinya berlawanan. Jebakan kedua adalah lupa negasi dalam no es fácil dan menjawab seolah kalimat itu positif. Pengecekannya sederhana: pertama tentukan apa yang dinegasikan atau dibandingkan, baru pilih kata.',
  tr: 'Buradaki en yaygın hata, caro ve barato\'yu karıştırmaktır: ikisi de fiyatla ilgilidir, ama zıt anlamlara gelir. İkinci tuzak, no es fácil\'deki olumsuzlamayı unutup cümleyi olumluymuş gibi yanıtlamaktır. Kontrol basittir: önce neyin olumsuzlandığını ya da karşılaştırıldığını belirlemek, sonra kelimeyi seçmek.',
  pl: 'Najczęstszym błędem jest tu pomylenie caro i barato: oba dotyczą ceny, ale znaczą coś przeciwnego. Drugą pułapką jest zapomnienie przeczenia w no es fácil i odpowiedź tak, jakby fraza była twierdząca. Sprawdzenie jest proste: najpierw ustalić, co jest zaprzeczane lub porównywane, potem wybrać słowo.',
});

export const ES_EPISODE_01_SESSION_24_CHECKPOINT_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Темы больше не идут по очереди',
      uk: 'Теми більше не йдуть по черзі',
      es: 'Topics no longer come one at a time',
      'pt-BR': 'Os temas não vêm mais um de cada vez',
      vi: 'Các chủ đề không còn đến lần lượt',
      id: 'Topik tidak lagi datang satu per satu',
      tr: 'Konular artık sırayla gelmiyor',
      pl: 'Tematy nie następują już po kolei',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'До сих пор каждое правило встречалось отдельно: то только цена (', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: ' и ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: '), то только фраза-согласие (es verdad), то только отрицание (no es fácil). Здесь темы перемешаны без предупреждения. ', semantic: 'explanation' }, { text: 'Проверяется умение самому узнать нужное правило', semantic: 'targetCorrect' }, { text: ', а не вспомнить одно заученное. Подсказки заранее не будет.', semantic: 'explanation' }),
      uk: R({ text: 'Досі кожне правило траплялося окремо: то лише ціна (', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: ' та ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: '), то лише фраза-згода (es verdad), то лише заперечення (no es fácil). Тут теми перемішані без попередження. ', semantic: 'explanation' }, { text: 'Перевіряється вміння самому впізнати потрібне правило', semantic: 'targetCorrect' }, { text: ', а не згадати одне завчене. Підказки заздалегідь не буде.', semantic: 'explanation' }),
      es: R({ text: 'Until now, each rule showed up on its own: only price (', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: '), only the agreement phrase (es verdad), or only the negation (no es fácil). Here the topics mix with no warning. ', semantic: 'explanation' }, { text: 'What is checked is recognizing the right rule on your own', semantic: 'targetCorrect' }, { text: ', not recalling one memorized rule. No hint is given in advance.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Até agora, cada regra aparecia sozinha: só preço (', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: ' e ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: '), ou só a frase de concordância (es verdad), ou só a negação (no es fácil). Aqui os temas se misturam sem aviso. ', semantic: 'explanation' }, { text: 'O que se verifica é a capacidade de reconhecer a regra certa sozinho', semantic: 'targetCorrect' }, { text: ', não de lembrar uma regra decorada. Não há dica dada de antemão.', semantic: 'explanation' }),
      vi: R({ text: 'Cho đến giờ, mỗi quy tắc xuất hiện riêng lẻ: chỉ giá cả (', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: ' và ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: '), hoặc chỉ cụm đồng ý (es verdad), hoặc chỉ phủ định (no es fácil). Ở đây các chủ đề trộn lẫn không báo trước. ', semantic: 'explanation' }, { text: 'Điều được kiểm tra là khả năng tự nhận ra đúng quy tắc', semantic: 'targetCorrect' }, { text: ', không phải nhớ lại một quy tắc đã học thuộc. Không có gợi ý cho trước.', semantic: 'explanation' }),
      id: R({ text: 'Sampai sekarang, tiap aturan muncul sendiri: hanya harga (', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: '), hanya frasa setuju (es verdad), atau hanya negasi (no es fácil). Di sini topik tercampur tanpa peringatan. ', semantic: 'explanation' }, { text: 'Yang diperiksa adalah kemampuan mengenali aturan yang tepat sendiri', semantic: 'targetCorrect' }, { text: ', bukan mengingat satu aturan hafalan. Tidak ada petunjuk sebelumnya.', semantic: 'explanation' }),
      tr: R({ text: 'Şimdiye kadar her kural tek başına vardı: yalnızca fiyat (', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: '), yalnızca onay ifadesi (es verdad) ya da yalnızca olumsuzlama (no es fácil). Burada konular uyarı yapılmadan karışır. ', semantic: 'explanation' }, { text: 'Kontrol edilen, doğru kuralı kendi başına tanıma becerisidir', semantic: 'targetCorrect' }, { text: ', ezberlenmiş bir kuralı hatırlamak değil. Önceden ipucu yoktur.', semantic: 'explanation' }),
      pl: R({ text: 'Do tej pory każda reguła pojawiała się osobno: albo tylko cena (', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: '), albo tylko fraza zgody (es verdad), albo tylko przeczenie (no es fácil). Tutaj tematy są pomieszane bez ostrzeżenia. ', semantic: 'explanation' }, { text: 'Sprawdza się samodzielne rozpoznanie właściwej reguły', semantic: 'targetCorrect' }, { text: ', a nie przypomnienie wyuczonej reguły. Nie ma podpowiedzi z góry.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что именно проверяется здесь?',
        uk: 'Що саме перевіряється тут?',
        es: 'What exactly is being checked here?',
        'pt-BR': 'O que exatamente é verificado aqui?',
        vi: 'Điều gì chính xác đang được kiểm tra ở đây?',
        id: 'Apa sebenarnya yang diperiksa di sini?',
        tr: 'Burada tam olarak ne kontrol edilir?',
        pl: 'Co dokładnie jest tu sprawdzane?',
      }),
      choices: [
        L({ ru: 'Умение самому узнать нужное правило', uk: 'Уміння самому впізнати потрібне правило', es: 'The ability to recognize the right rule on your own', 'pt-BR': 'A capacidade de reconhecer a regra certa sozinho', vi: 'Khả năng tự nhận ra đúng quy tắc', id: 'Kemampuan mengenali aturan yang tepat sendiri', tr: 'Doğru kuralı kendi başına tanıma becerisi', pl: 'Samodzielne rozpoznanie właściwej reguły' }),
        L({ ru: 'Память об одном правиле', uk: 'Пам’ять про одне правило', es: 'Memory of one rule', 'pt-BR': 'A memória de uma regra só', vi: 'Trí nhớ về một quy tắc', id: 'Ingatan tentang satu aturan', tr: 'Tek bir kuralın hafızası', pl: 'Pamięć jednej reguły' }),
        L({ ru: 'Скорость печати', uk: 'Швидкість друку', es: 'Typing speed', 'pt-BR': 'Velocidade de digitação', vi: 'Tốc độ gõ phím', id: 'Kecepatan mengetik', tr: 'Yazma hızı', pl: 'Szybkość pisania' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Проверяется умение самому узнать нужное правило без подсказки — не память об одном правиле и не скорость печати.',
        uk: 'Перевіряється вміння самому впізнати потрібне правило без підказки — не пам’ять про одне правило і не швидкість друку.',
        es: 'What is checked is the ability to recognize the right rule on your own without a hint — not memory of one rule and not typing speed.',
        'pt-BR': 'O que se verifica é a capacidade de reconhecer a regra certa sozinho sem dica — não a memória de uma regra só nem a velocidade de digitação.',
        vi: 'Điều được kiểm tra là khả năng tự nhận ra đúng quy tắc mà không có gợi ý — không phải trí nhớ về một quy tắc hay tốc độ gõ phím.',
        id: 'Yang diperiksa adalah kemampuan mengenali aturan yang tepat sendiri tanpa petunjuk — bukan ingatan tentang satu aturan dan bukan kecepatan mengetik.',
        tr: 'Kontrol edilen, doğru kuralı ipucu olmadan kendi başına tanıma becerisidir — tek bir kuralın hafızası ya da yazma hızı değil.',
        pl: 'Sprawdza się samodzielne rozpoznanie właściwej reguły bez podpowiedzi — nie pamięć jednej reguły ani szybkość pisania.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Сначала суть, потом слово',
      uk: 'Спершу суть, потім слово',
      es: 'First the meaning, then the word',
      'pt-BR': 'Primeiro o sentido, depois a palavra',
      vi: 'Trước tiên là ý nghĩa, sau đó là từ',
      id: 'Dulukan makna, baru kata',
      tr: 'Önce anlam, sonra kelime',
      pl: 'Najpierw sens, potem słowo',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула проверки простая: ', semantic: 'explanation' }, { text: 'сначала понять, о чём фраза — о цене, о согласии или о признаке вроде importante, — и только потом выбрать нужное слово', semantic: 'targetCorrect' }, { text: '. Es caro и Es barato звучат похоже, но значат противоположное. No es fácil берёт то же no es, что и обычное утверждение, только с отрицанием впереди.', semantic: 'explanation' }),
      uk: R({ text: 'Формула перевірки проста: ', semantic: 'explanation' }, { text: 'спершу зрозуміти, про що фраза — про ціну, згоду чи ознаку на кшталт importante, — і лише потім обрати потрібне слово', semantic: 'targetCorrect' }, { text: '. Es caro та Es barato звучать подібно, але означають протилежне. No es fácil бере те саме no es, що й звичайне твердження, лише із запереченням спереду.', semantic: 'explanation' }),
      es: R({ text: 'The checking formula is simple: ', semantic: 'explanation' }, { text: 'first work out what the phrase is about — price, agreement, or a quality like importante — then pick the right word', semantic: 'targetCorrect' }, { text: '. Es caro and Es barato sound similar but mean the opposite. No es fácil uses the same no es as a plain statement, just with a negation in front.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de verificação é simples: ', semantic: 'explanation' }, { text: 'primeiro entender do que a frase trata — preço, concordância ou uma qualidade como importante — depois escolher a palavra certa', semantic: 'targetCorrect' }, { text: '. Es caro e Es barato soam parecidos, mas significam o oposto. No es fácil usa o mesmo no es de uma afirmação comum, só com uma negação na frente.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức kiểm tra rất đơn giản: ', semantic: 'explanation' }, { text: 'trước tiên hiểu câu nói về điều gì — giá cả, sự đồng ý, hay đặc điểm như importante — rồi chọn đúng từ', semantic: 'targetCorrect' }, { text: '. Es caro và Es barato nghe giống nhau nhưng có nghĩa trái ngược. No es fácil dùng cùng no es như câu khẳng định bình thường, chỉ thêm phủ định phía trước.', semantic: 'explanation' }),
      id: R({ text: 'Rumus pemeriksaannya sederhana: ', semantic: 'explanation' }, { text: 'pertama pahami inti kalimat — harga, persetujuan, atau sifat seperti importante — lalu pilih kata yang tepat', semantic: 'targetCorrect' }, { text: '. Es caro dan Es barato terdengar mirip tetapi artinya berlawanan. No es fácil memakai no es yang sama dengan pernyataan biasa, hanya dengan negasi di depan.', semantic: 'explanation' }),
      tr: R({ text: 'Kontrol formülü basittir: ', semantic: 'explanation' }, { text: 'önce cümlenin neyle ilgili olduğunu anlamak — fiyat, onay ya da importante gibi bir nitelik — sonra doğru kelimeyi seçmek', semantic: 'targetCorrect' }, { text: '. Es caro ve Es barato benzer görünür ama zıt anlama gelir. No es fácil, sıradan bir ifadeyle aynı no es\'i kullanır, sadece önünde olumsuzlama vardır.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła sprawdzenia jest prosta: ', semantic: 'explanation' }, { text: 'najpierw zrozumieć, o czym jest fraza — o cenie, zgodzie czy cesze jak importante — potem wybrać właściwe słowo', semantic: 'targetCorrect' }, { text: '. Es caro i Es barato brzmią podobnie, ale znaczą coś przeciwnego. No es fácil używa tego samego no es co zwykłe stwierdzenie, tylko z przeczeniem z przodu.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что нужно сделать в первую очередь?',
        uk: 'Що потрібно зробити в першу чергу?',
        es: 'What should you do first?',
        'pt-BR': 'O que fazer primeiro?',
        vi: 'Cần làm gì trước tiên?',
        id: 'Apa yang harus dilakukan lebih dulu?',
        tr: 'Önce ne yapılmalı?',
        pl: 'Co należy zrobić najpierw?',
      }),
      choices: [
        L({ ru: 'Понять, о чём фраза, и только потом выбрать слово', uk: 'Зрозуміти, про що фраза, і лише потім обрати слово', es: 'Work out what the phrase is about, then pick the word', 'pt-BR': 'Entender do que a frase trata, depois escolher a palavra', vi: 'Hiểu câu nói về điều gì, rồi chọn từ', id: 'Memahami inti kalimat, lalu memilih kata', tr: 'Cümlenin neyle ilgili olduğunu anlamak, sonra kelimeyi seçmek', pl: 'Zrozumieć, o czym jest fraza, potem wybrać słowo' }),
        L({ ru: 'Выбрать любое слово наугад', uk: 'Обрати будь-яке слово навмання', es: 'Pick any word at random', 'pt-BR': 'Escolher qualquer palavra ao acaso', vi: 'Chọn bất kỳ từ nào ngẫu nhiên', id: 'Memilih kata mana pun secara acak', tr: 'Rastgele herhangi bir kelime seçmek', pl: 'Wybrać dowolne słowo na chybił trafił' }),
        L({ ru: 'Всегда выбирать caro', uk: 'Завжди обирати caro', es: 'Always pick caro', 'pt-BR': 'Sempre escolher caro', vi: 'Luôn chọn caro', id: 'Selalu memilih caro', tr: 'Her zaman caro seçmek', pl: 'Zawsze wybierać caro' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Сначала нужно понять, о чём фраза — о цене, о согласии или о признаке, — и только потом выбрать слово, а не выбирать наугад или всегда одно и то же.',
        uk: 'Спершу потрібно зрозуміти, про що фраза — про ціну, згоду чи ознаку, — і лише потім обрати слово, а не навмання чи завжди одне й те саме.',
        es: 'First you need to work out what the phrase is about — price, agreement, or a quality — and only then pick the word, not pick at random or always the same one.',
        'pt-BR': 'Primeiro é preciso entender do que a frase trata — preço, concordância ou qualidade — e só depois escolher a palavra, não ao acaso nem sempre a mesma.',
        vi: 'Trước tiên cần hiểu câu nói về điều gì — giá cả, sự đồng ý hay đặc điểm — rồi mới chọn từ, không phải chọn ngẫu nhiên hay luôn cùng một từ.',
        id: 'Pertama perlu memahami inti kalimat — harga, persetujuan, atau sifat — baru memilih kata, bukan memilih secara acak atau selalu kata yang sama.',
        tr: 'Önce cümlenin neyle ilgili olduğunu anlamak gerekir — fiyat, onay ya da nitelik — ancak sonra kelime seçilir, rastgele ya da hep aynısı değil.',
        pl: 'Najpierw trzeba zrozumieć, o czym jest fraza — o cenie, zgodzie czy cesze — a dopiero potem wybrać słowo, nie na chybił trafił ani zawsze to samo.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Цена и отрицание — где чаще всего спотыкаются',
      uk: 'Ціна й заперечення — де найчастіше спотикаються',
      es: 'Price and negation — the usual stumbling points',
      'pt-BR': 'Preço e negação — onde mais se tropeça',
      vi: 'Giá cả và phủ định — nơi hay vấp nhất',
      id: 'Harga dan negasi — titik tersandung yang umum',
      tr: 'Fiyat ve olumsuzlama — en sık takılınan yerler',
      pl: 'Cena i przeczenie — najczęstsze potknięcia',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка здесь — ', semantic: 'explanation' }, { text: 'перепутать caro и barato', semantic: 'targetCorrect' }, { text: ': оба про цену, но означают противоположное. Вторая ловушка — ', semantic: 'explanation' }, { text: 'забыть отрицание в no es fácil', semantic: 'targetCorrect' }, { text: ' и ответить так, будто фраза утвердительная. Проверка простая: сначала понять, что отрицается или сравнивается, и только потом выбрать слово.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка тут — ', semantic: 'explanation' }, { text: 'сплутати caro та barato', semantic: 'targetCorrect' }, { text: ': обидва про ціну, але означають протилежне. Друга пастка — ', semantic: 'explanation' }, { text: 'забути заперечення в no es fácil', semantic: 'targetCorrect' }, { text: ' і відповісти так, ніби фраза стверджувальна. Перевірка проста: спершу зрозуміти, що заперечується чи порівнюється, і лише потім обрати слово.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake here is ', semantic: 'explanation' }, { text: 'confusing caro and barato', semantic: 'targetCorrect' }, { text: ': both are about price, but mean the opposite. A second trap is ', semantic: 'explanation' }, { text: 'forgetting the negation in no es fácil', semantic: 'targetCorrect' }, { text: ' and answering as if the phrase were positive. The check is simple: first work out what is negated or compared, then choose the word.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum aqui é ', semantic: 'explanation' }, { text: 'confundir caro e barato', semantic: 'targetCorrect' }, { text: ': ambos falam de preço, mas significam o oposto. Uma segunda armadilha é ', semantic: 'explanation' }, { text: 'esquecer a negação em no es fácil', semantic: 'targetCorrect' }, { text: ' e responder como se a frase fosse afirmativa. A checagem é simples: primeiro descobrir o que é negado ou comparado, depois escolher a palavra.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất ở đây là ', semantic: 'explanation' }, { text: 'nhầm lẫn caro và barato', semantic: 'targetCorrect' }, { text: ': cả hai đều nói về giá cả, nhưng có nghĩa trái ngược nhau. Cái bẫy thứ hai là ', semantic: 'explanation' }, { text: 'quên phủ định trong no es fácil', semantic: 'targetCorrect' }, { text: ' và trả lời như thể câu là khẳng định. Cách kiểm tra đơn giản: trước tiên xác định điều gì bị phủ định hay so sánh, rồi chọn từ.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum di sini adalah ', semantic: 'explanation' }, { text: 'tertukar antara caro dan barato', semantic: 'targetCorrect' }, { text: ': keduanya tentang harga, tetapi artinya berlawanan. Jebakan kedua adalah ', semantic: 'explanation' }, { text: 'lupa negasi dalam no es fácil', semantic: 'targetCorrect' }, { text: ' dan menjawab seolah kalimat itu positif. Pengecekannya sederhana: pertama tentukan apa yang dinegasikan atau dibandingkan, baru pilih kata.', semantic: 'explanation' }),
      tr: R({ text: 'Buradaki en yaygın hata, ', semantic: 'explanation' }, { text: 'caro ve barato\'yu karıştırmaktır', semantic: 'targetCorrect' }, { text: ': ikisi de fiyatla ilgilidir, ama zıt anlamlara gelir. İkinci tuzak, ', semantic: 'explanation' }, { text: 'no es fácil\'deki olumsuzlamayı unutmaktır', semantic: 'targetCorrect' }, { text: ' ve cümleyi olumluymuş gibi yanıtlamaktır. Kontrol basittir: önce neyin olumsuzlandığını ya da karşılaştırıldığını belirlemek, sonra kelimeyi seçmek.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszym błędem jest tu ', semantic: 'explanation' }, { text: 'pomylenie caro i barato', semantic: 'targetCorrect' }, { text: ': oba dotyczą ceny, ale znaczą coś przeciwnego. Drugą pułapką jest ', semantic: 'explanation' }, { text: 'zapomnienie przeczenia w no es fácil', semantic: 'targetCorrect' }, { text: ' i odpowiedź tak, jakby fraza była twierdząca. Sprawdzenie jest proste: najpierw ustalić, co jest zaprzeczane lub porównywane, potem wybrać słowo.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какие тут две главные ловушки?',
        uk: 'Які тут дві головні пастки?',
        es: 'What are the two main traps here?',
        'pt-BR': 'Quais são as duas principais armadilhas aqui?',
        vi: 'Hai cái bẫy chính ở đây là gì?',
        id: 'Apa dua jebakan utama di sini?',
        tr: 'Buradaki iki ana tuzak nedir?',
        pl: 'Jakie są tu dwie główne pułapki?',
      }),
      choices: [
        L({ ru: 'Перепутать caro и barato, забыть отрицание в no es fácil', uk: 'Сплутати caro та barato, забути заперечення в no es fácil', es: 'Confusing caro and barato, forgetting the negation in no es fácil', 'pt-BR': 'Confundir caro e barato, esquecer a negação em no es fácil', vi: 'Nhầm lẫn caro và barato, quên phủ định trong no es fácil', id: 'Tertukar caro dan barato, lupa negasi dalam no es fácil', tr: 'Caro ve barato\'yu karıştırmak, no es fácil\'deki olumsuzlamayı unutmak', pl: 'Pomylenie caro i barato, zapomnienie przeczenia w no es fácil' }),
        L({ ru: 'Слишком быстрый темп и долгая пауза', uk: 'Занадто швидкий темп і довга пауза', es: 'Too fast a pace and a long pause', 'pt-BR': 'Um ritmo rápido demais e uma pausa longa', vi: 'Tốc độ quá nhanh và khoảng dừng dài', id: 'Kecepatan yang terlalu cepat dan jeda yang lama', tr: 'Çok hızlı bir tempo ve uzun bir duraklama', pl: 'Zbyt szybkie tempo i długa pauza' }),
        L({ ru: 'Неправильный порядок букв в слове', uk: 'Неправильний порядок літер у слові', es: 'The wrong order of letters in a word', 'pt-BR': 'A ordem errada das letras em uma palavra', vi: 'Thứ tự chữ cái sai trong một từ', id: 'Urutan huruf yang salah dalam sebuah kata', tr: 'Bir kelimedeki yanlış harf sırası', pl: 'Zła kolejność liter w słowie' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Две главные ловушки — перепутать caro и barato и забыть отрицание в no es fácil, а не темп речи или порядок букв.',
        uk: 'Дві головні пастки — сплутати caro та barato і забути заперечення в no es fácil, а не темп мовлення чи порядок літер.',
        es: 'The two main traps are confusing caro and barato and forgetting the negation in no es fácil, not pace of speech or letter order.',
        'pt-BR': 'As duas principais armadilhas são confundir caro e barato e esquecer a negação em no es fácil, não o ritmo da fala ou a ordem das letras.',
        vi: 'Hai cái bẫy chính là nhầm lẫn caro và barato và quên phủ định trong no es fácil, không phải tốc độ nói hay thứ tự chữ cái.',
        id: 'Dua jebakan utama adalah tertukar caro dan barato serta lupa negasi dalam no es fácil, bukan kecepatan bicara atau urutan huruf.',
        tr: 'İki ana tuzak, caro ve barato\'yu karıştırmak ve no es fácil\'deki olumsuzlamayı unutmaktır, konuşma temposu ya da harf sırası değil.',
        pl: 'Dwie główne pułapki to pomylenie caro i barato oraz zapomnienie przeczenia w no es fácil, a nie tempo mowy czy kolejność liter.',
      }),
    },
  },
];
