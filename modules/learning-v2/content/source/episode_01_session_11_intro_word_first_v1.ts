import type {
  LocalizedIntroRunsSource,
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';
import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const L = (value: LocalizedSource): LocalizedSource => value;
const CORRECT = ['Are you ready?', 'Are you here?', 'Are you busy?', 'You are ready.'] as const;
const WRONG = ['You are ready?', 'Are ready you?', 'Is you here?', 'Are here you?', 'Do you are busy?', 'Are do you busy?'] as const;
const TERMS = [...CORRECT, ...WRONG].sort((left, right) => right.length - left.length);

function bodyRuns(body: LocalizedSource): LocalizedIntroRunsSource {
  return Object.fromEntries(LOCALES.map((locale) => {
    const text = body[locale] ?? '';
    const runs: LearningV2IntroTextRunV1[] = [];
    let cursor = 0;
    while (cursor < text.length) {
      const term = TERMS.find((candidate) => text.startsWith(candidate, cursor));
      if (term) {
        runs.push({
          text: term,
          semantic: (WRONG as readonly string[]).includes(term) ? 'targetWrong' : 'targetCorrect',
        });
        cursor += term.length;
        continue;
      }
      let end = cursor + 1;
      while (end < text.length && !TERMS.some((candidate) => text.startsWith(candidate, end))) end += 1;
      runs.push({ text: text.slice(cursor, end), semantic: 'explanation' });
      cursor = end;
    }
    return [locale, runs];
  })) as unknown as LocalizedIntroRunsSource;
}

const target = (text: string): LocalizedSource => L({ ru: text, uk: text, es: text, 'pt-BR': text, vi: text, id: text, tr: text, pl: text });

export const EPISODE_01_SESSION_11_WORD_FIRST_TITLE = L({
  ru: 'Ты готов?', uk: 'Ти готовий?', es: '¿Estás preparado?', 'pt-BR': 'Você está pronto?',
  vi: 'Bạn sẵn sàng chưa?', id: 'Apakah kamu siap?', tr: 'Hazır mısın?', pl: 'Czy jesteś gotowy?',
});

export const EPISODE_01_SESSION_11_WORD_FIRST_SUMMARY = L({
  ru: 'В нейтральном вопросе are встаёт перед you.', uk: 'У нейтральному питанні are стає перед you.',
  es: 'En una pregunta neutra, are se coloca delante de you.', 'pt-BR': 'Numa pergunta neutra, are fica antes de you.',
  vi: 'Trong câu hỏi trung tính, are đứng trước you.', id: 'Dalam pertanyaan netral, are berada sebelum you.',
  tr: 'Nötr soruda are, you önüne gelir.', pl: 'W neutralnym pytaniu are stoi przed you.',
});

export const EPISODE_01_SESSION_11_WORD_FIRST_GOAL = L({
  ru: 'Спрашивать о состоянии или месте собеседника с помощью Are you ...?',
  uk: 'Запитувати про стан або місце співрозмовника за допомогою Are you ...?',
  es: 'Preguntar por el estado o el lugar del interlocutor con Are you ...?',
  'pt-BR': 'Perguntar pelo estado ou local da outra pessoa com Are you ...?',
  vi: 'Hỏi trạng thái hoặc nơi chốn của người nghe bằng Are you ...?',
  id: 'Menanyakan keadaan atau tempat lawan bicara dengan Are you ...?',
  tr: 'Muhatabın durumunu ya da yerini Are you ...? ile sormak.',
  pl: 'Pytać o stan lub miejsce rozmówcy za pomocą Are you ...?',
});

const conceptBody = L({
  ru: 'You are ready. сообщает факт: «Ты готов». Чтобы не утверждать, а спросить, английский меняет порядок двух первых слов: Are you ready? Are сразу показывает, что от собеседника ждут ответа, а you по-прежнему называет того, к кому обращаются. Одной вопросительной интонации для нейтральной полной формы недостаточно.',
  uk: 'You are ready. повідомляє факт: «Ти готовий». Щоб не стверджувати, а запитати, англійська змінює порядок перших двох слів: Are you ready? Are одразу показує, що від співрозмовника чекають відповіді, а you й далі називає того, до кого звертаються. Самої питальної інтонації для нейтральної повної форми недостатньо.',
  es: 'You are ready. afirma un hecho: la otra persona está preparada. Para convertirlo en una pregunta, el inglés cambia el orden de las dos primeras palabras: Are you ready? Are avisa desde el principio que esperas una respuesta y you sigue señalando al interlocutor. La entonación por sí sola no forma aquí la pregunta neutral completa.',
  'pt-BR': 'You are ready. afirma um fato: a outra pessoa está pronta. Para transformar isso em pergunta, o inglês troca a ordem das duas primeiras palavras: Are you ready? Are já avisa que se espera uma resposta, e you continua indicando o interlocutor. Só a entonação não forma aqui a pergunta neutra completa.',
  vi: 'You are ready. là một lời khẳng định rằng người nghe đã sẵn sàng. Muốn hỏi, tiếng Anh đổi chỗ hai từ đầu: Are you ready? Are báo ngay rằng bạn đang chờ câu trả lời, còn you vẫn chỉ người nghe. Chỉ lên giọng thôi chưa tạo được câu hỏi trung tính đầy đủ.',
  id: 'You are ready. menyatakan bahwa lawan bicara siap. Untuk menjadikannya pertanyaan, bahasa Inggris menukar urutan dua kata pertama: Are you ready? Are langsung menandai bahwa jawaban ditunggu, sedangkan you tetap menunjuk lawan bicara. Intonasi saja tidak membentuk pertanyaan netral yang lengkap.',
  tr: 'You are ready. karşındaki kişinin hazır olduğunu bildiren bir cümledir. Sormak için İngilizce ilk iki sözcüğün sırasını değiştirir: Are you ready? Are daha baştan cevap beklendiğini gösterir, you ise konuşulan kişiyi belirtmeye devam eder. Yalnızca ses tonunu yükseltmek tam ve nötr soruyu kurmaz.',
  pl: 'You are ready. stwierdza fakt: rozmówca jest gotowy. Aby z tego zrobić pytanie, angielski zamienia kolejność dwóch pierwszych słów: Are you ready? Are od razu zapowiada oczekiwanie odpowiedzi, a you nadal wskazuje rozmówcę. Sama intonacja nie tworzy tu pełnego neutralnego pytania.',
});

const formulaBody = L({
  ru: 'Начало Are you остаётся целым, а после него меняется только нужная информация. Are you ready? проверяет готовность, Are you tired? — усталость, Are you here? — присутствие. Сначала произнесите вопросительную опору Are you, затем добавьте одно точное состояние или место. Так порядок не приходится собирать заново для каждого вопроса.',
  uk: 'Початок Are you лишається цілим, а після нього змінюється лише потрібна інформація. Are you ready? перевіряє готовність, Are you tired? — втому, Are you here? — присутність. Спершу вимовте питальну опору Are you, потім додайте один точний стан або місце. Так порядок не доводиться складати заново для кожного питання.',
  es: 'El comienzo Are you se mantiene unido y solo cambia la información final. Are you ready? comprueba la preparación, Are you tired? el cansancio y Are you here? la presencia. Pronuncia primero el apoyo interrogativo Are you y añade después un estado o lugar preciso. Así no reconstruyes el orden en cada pregunta.',
  'pt-BR': 'O começo Are you permanece inteiro, e apenas a informação final muda. Are you ready? confirma a prontidão, Are you tired? o cansaço e Are you here? a presença. Diga primeiro o apoio interrogativo Are you e acrescente depois um estado ou local exato. Assim não é preciso remontar a ordem a cada pergunta.',
  vi: 'Phần mở đầu Are you luôn đi liền, chỉ thông tin phía sau thay đổi. Are you ready? hỏi sự sẵn sàng, Are you tired? hỏi sự mệt mỏi, còn Are you here? hỏi người nghe có mặt hay không. Hãy nói Are you trước rồi thêm đúng một trạng thái hoặc nơi chốn; bạn không cần dựng lại trật tự cho từng câu.',
  id: 'Awal Are you tetap utuh; hanya informasi sesudahnya yang berubah. Are you ready? memeriksa kesiapan, Are you tired? kelelahan, dan Are you here? keberadaan. Ucapkan penyangga pertanyaan Are you lebih dahulu, lalu tambahkan satu keadaan atau tempat yang tepat. Urutannya tidak perlu dirakit ulang setiap kali.',
  tr: 'Are you başlangıcı bir bütün olarak kalır; yalnızca sonundaki bilgi değişir. Are you ready? hazırlığı, Are you tired? yorgunluğu, Are you here? burada bulunmayı sorar. Önce Are you soru dayanağını söyleyin, ardından tek ve kesin bir durum ya da yer ekleyin. Her soruda sırayı yeniden kurmanız gerekmez.',
  pl: 'Początek Are you pozostaje całością, a zmienia się tylko końcowa informacja. Are you ready? sprawdza gotowość, Are you tired? zmęczenie, a Are you here? obecność. Najpierw wypowiedz pytający początek Are you, potem dodaj dokładny stan lub miejsce. Nie trzeba za każdym razem układać szyku od nowa.',
});

const trapBody = L({
  ru: 'Are уже выполняет работу вопроса, поэтому Do you are busy? смешивает две разные конструкции. Is тоже не подходит: эта форма связывается с he, she или it, но не с you. Нейтральный вопрос звучит Are you busy? Быстрая проверка проста: перед you стоит are, а второго вспомогательного слова нет.',
  uk: 'Are вже виконує роботу питання, тому Do you are busy? змішує дві різні конструкції. Is також не підходить: ця форма поєднується з he, she або it, але не з you. Нейтральне питання звучить Are you busy? Швидка перевірка проста: перед you стоїть are, а другого допоміжного слова немає.',
  es: 'Are ya realiza el trabajo interrogativo, por eso Do you are busy? mezcla dos construcciones distintas. Is tampoco sirve: esa forma acompaña a he, she o it, no a you. La pregunta neutral es Are you busy? Compruébalo rápido: are aparece delante de you y no hay un segundo auxiliar.',
  'pt-BR': 'Are já faz o trabalho interrogativo, por isso Do you are busy? mistura duas construções diferentes. Is também não serve: essa forma acompanha he, she ou it, não you. A pergunta neutra é Are you busy? A conferência é simples: are vem antes de you e não existe um segundo auxiliar.',
  vi: 'Are đã tự tạo câu hỏi nên Do you are busy? trộn hai cấu trúc khác nhau. Is cũng không đi với you; dạng đó dùng với he, she hoặc it. Câu hỏi trung tính là Are you busy? Hãy kiểm tra nhanh: are đứng trước you và không có trợ từ thứ hai.',
  id: 'Are sudah menjalankan fungsi pertanyaan, sehingga Do you are busy? mencampur dua susunan berbeda. Is juga tidak cocok karena bentuk itu dipakai bersama he, she, atau it, bukan you. Pertanyaan netralnya Are you busy? Periksa cepat: are berada sebelum you dan tidak ada kata bantu kedua.',
  tr: 'Are soru görevini zaten yaptığı için Do you are busy? iki ayrı yapıyı karıştırır. Is de uygun değildir; bu biçim he, she ya da it ile kullanılır, you ile değil. Nötr soru Are you busy? olur. Hızlı kontrol: are, you önünde durur ve ikinci bir yardımcı sözcük bulunmaz.',
  pl: 'Are samo wykonuje pracę pytania, dlatego Do you are busy? miesza dwie różne konstrukcje. Is także nie pasuje: ta forma łączy się z he, she lub it, a nie z you. Neutralne pytanie brzmi Are you busy? Szybka kontrola: przed you stoi are i nie ma drugiego czasownika pomocniczego.',
});

export const EPISODE_01_SESSION_11_WORD_FIRST_INTRO: readonly [SessionSourceIntroPage, SessionSourceIntroPage, SessionSourceIntroPage] = Object.freeze([
  {
    kind: 'concept',
    title: L({ ru: 'Are первым открывает вопрос', uk: 'Are першим відкриває питання', es: 'Are abre la pregunta', 'pt-BR': 'Are abre a pergunta', vi: 'Are mở đầu câu hỏi', id: 'Are membuka pertanyaan', tr: 'Soruyu Are açar', pl: 'Are otwiera pytanie' }),
    body: conceptBody, bodyRuns: bodyRuns(conceptBody),
    question: {
      prompt: L({ ru: 'Как спросить «Ты готов?»?', uk: 'Як запитати «Ти готовий?»?', es: '¿Cómo preguntas «¿Estás preparado?»?', 'pt-BR': 'Como perguntar «Você está pronto?»?', vi: 'Câu nào hỏi “Bạn sẵn sàng chưa”?', id: 'Bagaimana menanyakan “Apakah kamu siap”?', tr: '«Hazır mısın?» nasıl sorulur?', pl: 'Jak zapytać „Czy jesteś gotowy?”?' }),
      choices: [target('Are you ready?'), target('You are ready?'), target('Are ready you?')], correctChoiceIndex: 0,
      explanation: L({ ru: 'Are you ready? ставит are перед you и сразу обозначает вопрос. You are ready? сохраняет порядок утверждения, а Are ready you? отрывает состояние от собеседника.', uk: 'Are you ready? ставить are перед you й одразу позначає питання. You are ready? зберігає порядок твердження, а Are ready you? відриває стан від співрозмовника.', es: 'Are you ready? coloca are delante de you y marca la pregunta. You are ready? conserva el orden afirmativo; Are ready you? separa el estado del interlocutor.', 'pt-BR': 'Are you ready? põe are antes de you e marca a pergunta. You are ready? mantém a ordem afirmativa; Are ready you? separa o estado do interlocutor.', vi: 'Are you ready? đặt are trước you để báo câu hỏi. You are ready? giữ trật tự câu kể; Are ready you? tách trạng thái khỏi người nghe.', id: 'Are you ready? menaruh are sebelum you dan menandai pertanyaan. You are ready? mempertahankan urutan pernyataan; Are ready you? memisahkan keadaan dari lawan bicara.', tr: 'Are you ready? are biçimini you önüne koyup soruyu gösterir. You are ready? bildirim sırasını korur; Are ready you? durumu kişiden ayırır.', pl: 'Are you ready? stawia are przed you i zaznacza pytanie. You are ready? zachowuje szyk oznajmujący, a Are ready you? oddziela stan od rozmówcy.' }),
    },
  },
  {
    kind: 'formula',
    title: L({ ru: 'Are you — готовое начало', uk: 'Are you — готовий початок', es: 'Are you es un comienzo completo', 'pt-BR': 'Are you é um começo completo', vi: 'Are you là phần mở đầu trọn vẹn', id: 'Are you adalah awal yang utuh', tr: 'Are you hazır bir başlangıçtır', pl: 'Are you to gotowy początek' }),
    body: formulaBody, bodyRuns: bodyRuns(formulaBody),
    question: {
      prompt: L({ ru: 'Как спросить, здесь ли собеседник?', uk: 'Як запитати, чи співрозмовник тут?', es: '¿Cómo preguntas si el interlocutor está aquí?', 'pt-BR': 'Como perguntar se a outra pessoa está aqui?', vi: 'Câu nào hỏi người nghe có ở đây không?', id: 'Bagaimana menanyakan apakah lawan bicara ada di sini?', tr: 'Karşındaki kişinin burada olup olmadığı nasıl sorulur?', pl: 'Jak zapytać, czy rozmówca jest tutaj?' }),
      choices: [target('Are you here?'), target('Is you here?'), target('Are here you?')], correctChoiceIndex: 0,
      explanation: L({ ru: 'Are you here? сохраняет вопросительное начало Are you и ставит here в конец. Is не согласуется с you, а Are here you? ломает связь между are и собеседником.', uk: 'Are you here? зберігає питальний початок Are you й ставить here наприкінці. Is не узгоджується з you, а Are here you? руйнує зв’язок між are та співрозмовником.', es: 'Are you here? conserva el comienzo interrogativo Are you y coloca here al final. Is no concuerda con you; Are here you? rompe el enlace entre are y el interlocutor.', 'pt-BR': 'Are you here? mantém o início interrogativo Are you e coloca here no fim. Is não combina com you; Are here you? quebra a ligação entre are e o interlocutor.', vi: 'Are you here? giữ phần mở đầu Are you và đặt here ở cuối. Is không đi với you; Are here you? làm vỡ liên kết giữa are và người nghe.', id: 'Are you here? mempertahankan awal Are you dan menaruh here di akhir. Is tidak cocok dengan you; Are here you? memutus hubungan are dengan lawan bicara.', tr: 'Are you here? Are you soru başlangıcını korur ve here sözcüğünü sona koyar. Is, you ile eşleşmez; Are here you? are ile kişi arasındaki bağı bozar.', pl: 'Are you here? zachowuje początek Are you i stawia here na końcu. Is nie pasuje do you, a Are here you? rozrywa połączenie are z rozmówcą.' }),
    },
  },
  {
    kind: 'trap',
    title: L({ ru: 'Ни do, ни is не нужны', uk: 'Ані do, ані is не потрібні', es: 'No hacen falta ni do ni is', 'pt-BR': 'Nem do nem is são necessários', vi: 'Không cần do hay is', id: 'Tidak perlu do atau is', tr: 'Ne do ne de is gerekir', pl: 'Nie potrzeba ani do, ani is' }),
    body: trapBody, bodyRuns: bodyRuns(trapBody),
    question: {
      prompt: L({ ru: 'Как правильно спросить «Ты занят?»?', uk: 'Як правильно запитати «Ти зайнятий?»?', es: '¿Cómo preguntas correctamente «¿Estás ocupado?»?', 'pt-BR': 'Como perguntar corretamente «Você está ocupado?»?', vi: 'Câu nào hỏi đúng “Bạn có bận không”?', id: 'Bagaimana bertanya dengan benar “Apakah kamu sibuk”?', tr: '«Meşgul müsün?» doğru nasıl sorulur?', pl: 'Jak poprawnie zapytać „Czy jesteś zajęty?”?' }),
      choices: [target('Are you busy?'), target('Do you are busy?'), target('Are do you busy?')], correctChoiceIndex: 0,
      explanation: L({ ru: 'Are you busy? использует одну связку are и ставит её перед you. Варианты с do добавляют лишний механизм вопроса и смешивают несовместимые конструкции.', uk: 'Are you busy? використовує одну зв’язку are й ставить її перед you. Варіанти з do додають зайвий механізм питання та змішують несумісні конструкції.', es: 'Are you busy? utiliza una sola cópula, are, delante de you. Las opciones con do añaden otro mecanismo interrogativo y mezclan construcciones incompatibles.', 'pt-BR': 'Are you busy? usa uma única ligação, are, antes de you. As opções com do acrescentam outro mecanismo de pergunta e misturam construções incompatíveis.', vi: 'Are you busy? chỉ dùng are và đặt nó trước you. Hai phương án có do thêm một cơ chế hỏi thừa và trộn các cấu trúc không đi cùng nhau.', id: 'Are you busy? memakai satu penghubung, are, sebelum you. Pilihan dengan do menambah mekanisme pertanyaan kedua dan mencampur susunan yang tidak serasi.', tr: 'Are you busy? tek bağ olan are biçimini you önüne koyar. Do içeren seçenekler ikinci bir soru mekanizması ekleyip uyumsuz yapıları karıştırır.', pl: 'Are you busy? używa jednego łącznika are przed you. Odpowiedzi z do dodają drugi mechanizm pytania i mieszają niezgodne konstrukcje.' }),
    },
  },
]);
