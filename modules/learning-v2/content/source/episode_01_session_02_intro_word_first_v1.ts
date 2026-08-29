import type {
  LocalizedIntroRunsSource,
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';
import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const TERMS = ['I am', 'I', 'am'] as const;

function markEnglish(body: LocalizedSource): LocalizedIntroRunsSource {
  return Object.fromEntries(
    LOCALES.map((locale) => {
      const text = body[locale] ?? '';
      const runs: LearningV2IntroTextRunV1[] = [];
      let cursor = 0;
      const isLetter = (value: string): boolean => /\p{L}/u.test(value);
      while (cursor < text.length) {
        const term = TERMS.find((candidate) => {
          const slice = text.slice(cursor, cursor + candidate.length);
          if (candidate === 'I' ? slice !== 'I' : slice.toLocaleLowerCase('en') !== candidate.toLocaleLowerCase('en')) return false;
          return !isLetter(text[cursor - 1] ?? '') && !isLetter(text[cursor + candidate.length] ?? '');
        });
        if (term) {
          runs.push({ text: text.slice(cursor, cursor + term.length), semantic: 'targetCorrect' });
          cursor += term.length;
          continue;
        }
        let end = cursor + 1;
        while (end < text.length && !TERMS.some((candidate) => {
          const slice = text.slice(end, end + candidate.length);
          if (candidate === 'I' ? slice !== 'I' : slice.toLocaleLowerCase('en') !== candidate.toLocaleLowerCase('en')) return false;
          return !isLetter(text[end - 1] ?? '') && !isLetter(text[end + candidate.length] ?? '');
        })) end += 1;
        runs.push({ text: text.slice(cursor, end), semantic: 'explanation' });
        cursor = end;
      }
      return [locale, runs];
    }),
  ) as unknown as LocalizedIntroRunsSource;
}

function target(value: string): LocalizedSource {
  return L({ ru: value, uk: value, es: value, 'pt-BR': value, vi: value, id: value, tr: value, pl: value });
}

export const EPISODE_01_SESSION_02_WORD_FIRST_TITLE = L({
  ru: 'I am целиком', uk: 'I am повністю', es: 'I am completo',
  'pt-BR': 'I am completo', vi: 'I am trọn vẹn', id: 'I am secara utuh',
  tr: 'Tam hâliyle I am', pl: 'Pełne I am',
});

export const EPISODE_01_SESSION_02_WORD_FIRST_SUMMARY = L({
  ru: 'Собираем точное начало фразы о себе: I am.',
  uk: 'Складаємо точний початок фрази про себе: I am.',
  es: 'Construimos el inicio exacto de una frase sobre uno mismo: I am.',
  'pt-BR': 'Montamos o início exato de uma frase sobre si: I am.',
  vi: 'Ghép đúng phần mở đầu của câu nói về bản thân: I am.',
  id: 'Menyusun awal yang tepat untuk kalimat tentang diri sendiri: I am.',
  tr: 'Kendinizle ilgili cümlenin doğru başlangıcını kuruyoruz: I am.',
  pl: 'Budujemy dokładny początek zdania o sobie: I am.',
});

export const EPISODE_01_SESSION_02_WORD_FIRST_GOAL = L({
  ru: 'Уверенно начинать утвердительную фразу словами I am.',
  uk: 'Упевнено починати стверджувальну фразу словами I am.',
  es: 'Empezar con seguridad una afirmación usando I am.',
  'pt-BR': 'Começar com segurança uma afirmação usando I am.',
  vi: 'Tự tin mở đầu một câu khẳng định bằng I am.',
  id: 'Memulai pernyataan dengan yakin memakai I am.',
  tr: 'Olumlu bir cümleye I am ile güvenle başlamak.',
  pl: 'Pewnie zaczynać zdanie oznajmujące od I am.',
});

const conceptBody = L({
  ru: 'Чтобы сообщить что-то о себе, английскому нужны два маленьких работника. I называет говорящего, а am открывает место для сообщения о нём. Вместе I am — крепкое начало: короткое, но уже держит всю фразу.',
  uk: 'Щоб повідомити щось про себе, англійській потрібні два маленькі працівники. I називає мовця, а am відкриває місце для повідомлення про нього. Разом I am — міцний початок: короткий, але вже тримає всю фразу.',
  es: 'Para decir algo sobre ti, el inglés necesita dos pequeños trabajadores. I nombra a quien habla y am abre el lugar para la información. Juntos, I am es un inicio firme: breve, pero ya sostiene toda la frase.',
  'pt-BR': 'Para dizer algo sobre você, o inglês precisa de dois pequenos trabalhadores. I mostra quem fala e am abre espaço para a informação. Juntos, I am é um começo firme: curto, mas já sustenta a frase inteira.',
  vi: 'Để nói điều gì đó về bản thân, tiếng Anh cần hai “nhân viên” nhỏ. I gọi tên người đang nói, còn am mở chỗ cho thông tin tiếp theo. I am là một mở đầu gọn mà chắc: ngắn thôi nhưng đỡ được cả câu.',
  id: 'Untuk mengatakan sesuatu tentang diri sendiri, bahasa Inggris membutuhkan dua pekerja kecil. I menamai penutur, sedangkan am membuka tempat bagi informasi. Bersama, I am menjadi awal yang kokoh: pendek, tetapi menopang seluruh kalimat.',
  tr: 'Kendinizle ilgili bir şey söylemek için İngilizce iki küçük çalışana ihtiyaç duyar. I konuşanı gösterir, am ise bilgiye yer açar. I am birlikte sağlam bir başlangıçtır: kısa ama bütün cümleyi taşır.',
  pl: 'Aby powiedzieć coś o sobie, angielski potrzebuje dwóch małych pracowników. I wskazuje mówiącego, a am otwiera miejsce na informację. Razem I am tworzy mocny początek: krótki, ale utrzymuje całe zdanie.',
});

const formulaBody = L({
  ru: 'Порядок не меняется: сначала I, сразу за ним am. По-русски слово «есть» часто молчит, а по-английски am честно выходит на работу. Поэтому начало строится слева направо: I am.',
  uk: 'Порядок не змінюється: спочатку I, одразу за ним am. Українською слово «є» часто мовчить, а англійською am чесно виходить на роботу. Тому початок будується зліва направо: I am.',
  es: 'El orden no cambia: primero I y justo después am. En español la conexión suele esconderse dentro del verbo, pero en inglés am sale a trabajar. Por eso el comienzo se construye de izquierda a derecha: I am.',
  'pt-BR': 'A ordem não muda: primeiro I e logo depois am. Em português a ligação costuma ficar dentro do verbo, mas em inglês am aparece para trabalhar. Por isso o começo vai da esquerda para a direita: I am.',
  vi: 'Thứ tự không đổi: I đứng trước, am theo ngay sau. Trong tiếng Việt ta thường không cần một từ nối riêng, nhưng tiếng Anh bắt am đi làm. Vì vậy phần mở đầu đi từ trái sang phải: I am.',
  id: 'Urutannya tidak berubah: I lebih dulu, lalu am tepat sesudahnya. Dalam bahasa Indonesia penghubung sering tidak tampak, tetapi dalam bahasa Inggris am wajib bekerja. Jadi awalnya disusun dari kiri ke kanan: I am.',
  tr: 'Sıra değişmez: önce I, hemen ardından am gelir. Türkçede bu bağ çoğu zaman ekin içinde saklanır; İngilizcede am açıkça işe çıkar. Bu yüzden başlangıç soldan sağa kurulur: I am.',
  pl: 'Szyk się nie zmienia: najpierw I, zaraz po nim am. Po polsku „jestem” mieści wszystko w jednym słowie, lecz angielski wysyła am osobno do pracy. Początek układamy więc od lewej: I am.',
});

const trapBody = L({
  ru: 'На слух I am может проскочить почти одним толчком, но на письме это два слова. I всегда заглавная, am — маленькое и второе. Если середина потерялась, верните простой ритм: I — am.',
  uk: 'На слух I am може промайнути майже одним поштовхом, але на письмі це два слова. I завжди велика, am — маленьке й друге. Якщо середина загубилася, поверніть простий ритм: I — am.',
  es: 'Al oído, I am puede pasar casi de un solo golpe, pero al escribir son dos palabras. I siempre va en mayúscula y am, pequeño, ocupa el segundo lugar. Si el centro se pierde, recupera el ritmo: I — am.',
  'pt-BR': 'Ao ouvir, I am pode passar quase num só impulso, mas na escrita são duas palavras. I fica sempre em maiúscula e am, pequeno, vem em segundo. Se o meio sumir, recupere o ritmo: I — am.',
  vi: 'Khi nghe, I am có thể lướt qua gần như một nhịp, nhưng khi viết vẫn là hai từ. I luôn viết hoa, còn am viết thường và đứng thứ hai. Nếu phần giữa biến mất, hãy gọi nhịp về: I — am.',
  id: 'Saat didengar, I am dapat meluncur hampir dalam satu dorongan, tetapi saat ditulis tetap dua kata. I selalu huruf besar, sedangkan am kecil dan berada di urutan kedua. Jika bagian tengah hilang, kembalikan iramanya: I — am.',
  tr: 'Duyarken I am neredeyse tek vuruşta geçebilir, ama yazıda iki sözcüktür. I her zaman büyük, am küçük ve ikinci sıradadır. Orta kaybolursa ritmi geri çağırın: I — am.',
  pl: 'W mowie I am może przemknąć niemal jednym ruchem, ale w piśmie to dwa słowa. I jest zawsze wielkie, a małe am stoi drugie. Gdy środek zniknie, przywróć rytm: I — am.',
});

export const EPISODE_01_SESSION_02_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = Object.freeze([
  {
    kind: 'concept',
    title: L({ ru: 'Два слова — одна команда', uk: 'Два слова працюють разом', es: 'Dos palabras, un equipo', 'pt-BR': 'Duas palavras, uma equipe', vi: 'Hai từ, một đội', id: 'Dua kata, satu tim', tr: 'İki sözcük, tek takım', pl: 'Dwa słowa, jedna drużyna' }),
    body: conceptBody,
    bodyRuns: markEnglish(conceptBody),
    question: {
      grammarFeatureId: 'affirmative_self_statement',
      testedDimension: 'complete_I_am_frame',
      prompt: L({ ru: 'Какое начало полностью называет говорящего и связь?', uk: 'Який початок повністю називає мовця й зв’язок?', es: '¿Qué inicio muestra al hablante y la conexión?', 'pt-BR': 'Qual início mostra quem fala e a ligação?', vi: 'Mở đầu nào có cả người nói lẫn từ nối?', id: 'Awal mana memuat penutur dan penghubung?', tr: 'Hangi başlangıçta hem konuşan hem bağ vardır?', pl: 'Który początek zawiera mówiącego i łącznik?' }),
      choices: [target('I'), target('I am'), target('am')],
      correctChoiceIndex: 1,
      explanation: L({ ru: 'I am сохраняет обе роли: I называет говорящего, am связывает его с продолжением.', uk: 'I am зберігає обидві ролі: I називає мовця, am пов’язує його з продовженням.', es: 'I am conserva ambos papeles: I nombra al hablante y am lo conecta con lo que sigue.', 'pt-BR': 'I am mantém os dois papéis: I mostra quem fala e am liga ao que vem depois.', vi: 'I am giữ đủ hai vai trò: I chỉ người nói, am nối với phần tiếp theo.', id: 'I am menjaga kedua peran: I menamai penutur dan am menghubungkannya dengan kelanjutan.', tr: 'I am iki görevi de korur: I konuşanı gösterir, am devamına bağlar.', pl: 'I am zachowuje obie role: I wskazuje mówiącego, a am łączy go z dalszą częścią.' }),
    },
  },
  {
    kind: 'formula',
    title: L({ ru: 'Сначала I, затем am', uk: 'Спочатку I, потім am', es: 'Primero I, después am', 'pt-BR': 'Primeiro I, depois am', vi: 'I trước, am sau', id: 'I dahulu, lalu am', tr: 'Önce I, sonra am', pl: 'Najpierw I, potem am' }),
    body: formulaBody,
    bodyRuns: markEnglish(formulaBody),
    question: {
      grammarFeatureId: 'affirmative_self_statement',
      testedDimension: 'I_then_am_order',
      prompt: L({ ru: 'Какой порядок даёт точное начало утверждения?', uk: 'Який порядок дає точний початок твердження?', es: '¿Qué orden da el inicio exacto de una afirmación?', 'pt-BR': 'Qual ordem forma o início exato de uma afirmação?', vi: 'Thứ tự nào tạo đúng phần mở đầu câu khẳng định?', id: 'Urutan mana membentuk awal pernyataan yang tepat?', tr: 'Hangi sıra olumlu cümlenin doğru başlangıcını verir?', pl: 'Która kolejność tworzy dokładny początek oznajmienia?' }),
      choices: [target('I I'), target('am am'), target('I am')],
      correctChoiceIndex: 2,
      explanation: L({ ru: 'Верный порядок — I am: говорящий стоит первым, связка идёт сразу следом.', uk: 'Правильний порядок — I am: мовець стоїть першим, зв’язок іде одразу слідом.', es: 'El orden correcto es I am: primero el hablante y justo después la conexión.', 'pt-BR': 'A ordem correta é I am: primeiro quem fala e logo depois a ligação.', vi: 'Thứ tự đúng là I am: người nói đứng trước, từ nối theo ngay sau.', id: 'Urutan yang benar adalah I am: penutur lebih dulu, penghubung tepat sesudahnya.', tr: 'Doğru sıra I am: önce konuşan, hemen ardından bağ gelir.', pl: 'Właściwy szyk to I am: najpierw mówiący, zaraz potem łącznik.' }),
    },
  },
  {
    kind: 'trap',
    title: L({ ru: 'Не теряйте am', uk: 'Не губіть am', es: 'No pierdas am', 'pt-BR': 'Não perca am', vi: 'Đừng làm rơi am', id: 'Jangan kehilangan am', tr: 'Am kaybolmasın', pl: 'Nie zgub am' }),
    body: trapBody,
    bodyRuns: markEnglish(trapBody),
    question: {
      grammarFeatureId: 'affirmative_self_statement',
      testedDimension: 'orthographic_I_am_integrity',
      prompt: L({ ru: 'Как записано точное начало фразы о себе?', uk: 'Як записано точний початок фрази про себе?', es: '¿Cómo se escribe el inicio exacto de una frase sobre ti?', 'pt-BR': 'Como se escreve o início exato de uma frase sobre você?', vi: 'Phần mở đầu đúng của câu nói về bản thân được viết thế nào?', id: 'Bagaimana awal tepat kalimat tentang diri sendiri ditulis?', tr: 'Kendinizle ilgili cümlenin doğru başlangıcı nasıl yazılır?', pl: 'Jak zapisać dokładny początek zdania o sobie?' }),
      choices: [target('I am'), target('l am'), target('I arn')],
      correctChoiceIndex: 0,
      explanation: L({ ru: 'I am начинается с заглавной I и сохраняет маленькое am отдельным вторым словом.', uk: 'I am починається з великої I й зберігає маленьке am окремим другим словом.', es: 'I am empieza con I mayúscula y mantiene am como segunda palabra separada.', 'pt-BR': 'I am começa com I maiúsculo e mantém am como segunda palavra separada.', vi: 'I am bắt đầu bằng I viết hoa và giữ am thành từ thứ hai riêng biệt.', id: 'I am dimulai dengan I besar dan mempertahankan am sebagai kata kedua yang terpisah.', tr: 'I am büyük I ile başlar ve küçük am ayrı ikinci sözcük olarak kalır.', pl: 'I am zaczyna się wielkim I, a małe am pozostaje osobnym drugim słowem.' }),
    },
  },
]);
