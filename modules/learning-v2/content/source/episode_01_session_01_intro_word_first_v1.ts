import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type { LocalizedSource, SessionSourceIntroPage } from './session_shard_from_source_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const targetChoice = (value: string): LocalizedSource => L({ ru: value, uk: value, es: value, 'pt-BR': value, vi: value, id: value, tr: value, pl: value });
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

// Тексты ниже написаны вручную. Функция создаёт только визуальную разметку
// готовых строк, чтобы target-язык всегда имел отдельный цвет и начертание.
function bodyRuns(
  body: LocalizedSource,
  targets: readonly string[],
): NonNullable<SessionSourceIntroPage['bodyRuns']> {
  const escaped = targets
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((target) => target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'));
  const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'giu');
  const targetSet = new Set(targets.map((value) => value.toLocaleLowerCase('en')));
  return Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      (body[locale] ?? '').split(pattern).filter(Boolean).map(
        (text): LearningV2IntroTextRunV1 => ({
          text,
          semantic: targetSet.has(text.toLocaleLowerCase('en'))
            ? 'targetCorrect'
            : 'explanation',
        }),
      ),
    ]),
  ) as NonNullable<SessionSourceIntroPage['bodyRuns']>;
}

export const EPISODE_01_SESSION_01_WORD_FIRST_TITLE = L({
  ru: 'Я здесь', uk: 'Я тут', es: 'Estoy aquí', 'pt-BR': 'Estou aqui',
  vi: 'Tôi ở đây', id: 'Saya di sini', tr: 'Buradayım', pl: 'Jestem tutaj',
});

export const EPISODE_01_SESSION_01_WORD_FIRST_SUMMARY = L({
  ru: 'Четыре коротких английских слова становятся понятными по отдельности, а затем соединяются в речь о себе.',
  uk: 'Чотири короткі англійські слова стають зрозумілими окремо, а потім поєднуються у вислів про себе.',
  es: 'Cuatro palabras inglesas se aclaran por separado antes de formar una idea completa sobre quien habla.',
  'pt-BR': 'Quatro palavras inglesas ficam claras separadamente antes de formar uma ideia completa sobre quem fala.',
  vi: 'Bốn từ tiếng Anh được hiểu riêng từng từ trước khi ghép thành lời nói trọn vẹn về bản thân.',
  id: 'Empat kata bahasa Inggris dipahami satu per satu sebelum digabungkan menjadi gagasan lengkap tentang diri sendiri.',
  tr: 'Dört İngilizce sözcük önce ayrı ayrı anlaşılır, sonra kişinin kendisiyle ilgili tam bir anlatı kurar.',
  pl: 'Cztery angielskie słowa najpierw stają się jasne osobno, a potem łączą się w pełną wypowiedź o sobie.',
});

export const EPISODE_01_SESSION_01_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно написать I, am, here и ready, а затем правильно соединить их.',
  uk: 'Упізнати на слух, зрозуміти й точно написати I, am, here та ready, а потім правильно їх поєднати.',
  es: 'Reconocer, comprender y escribir I, am, here y ready antes de combinarlas correctamente.',
  'pt-BR': 'Reconhecer, compreender e escrever I, am, here e ready antes de combiná-las corretamente.',
  vi: 'Nghe ra, hiểu và viết đúng I, am, here và ready trước khi ghép chúng chính xác.',
  id: 'Mengenali bunyi, memahami, dan menulis I, am, here, serta ready sebelum menggabungkannya dengan tepat.',
  tr: 'I, am, here ve ready sözcüklerini duyup anlamak ve doğru yazmak; ardından doğru biçimde birleştirmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zapisać I, am, here oraz ready, a potem właściwie je połączyć.',
});

const CONCEPT_BODY = L({
  ru: 'I — слово с воображаемым микрофоном: оно означает «я» у того, кто сейчас говорит. Передайте микрофон другому человеку — и его I уже указывает на него. На письме английское I всегда заглавное, даже посреди фразы.',
  uk: 'I — слово з уявним мікрофоном: воно означає «я» для того, хто зараз говорить. Передайте мікрофон іншій людині — і її I вже вказує на неї. В англійському письмі I завжди велике, навіть усередині вислову.',
  es: 'I viaja con un micrófono imaginario: nombra a quien habla en ese momento y significa «yo». Si otra persona toma el micrófono, su I pasa a señalarla a ella. En inglés, I siempre se escribe con mayúscula, incluso en medio de una frase.',
  'pt-BR': 'I acompanha um microfone imaginário: nomeia quem está falando naquele momento e significa «eu». Quando outra pessoa pega o microfone, o I dela passa a apontar para ela. Em inglês, I é sempre maiúsculo, até no meio de uma frase.',
  vi: 'I đi theo chiếc micro tưởng tượng: ai đang nói thì I mang nghĩa “tôi” và chỉ người đó. Khi micro chuyển sang người khác, I của họ lại chỉ chính họ. Trong tiếng Anh, I luôn được viết hoa, kể cả khi đứng giữa câu.',
  id: 'I mengikuti mikrofon khayalan: bagi orang yang sedang berbicara, I berarti “saya”. Saat mikrofon berpindah, I milik pembicara baru menunjuk dirinya. Dalam tulisan bahasa Inggris, I selalu memakai huruf besar, bahkan di tengah kalimat.',
  tr: 'I hayalî mikrofonu izler: o anda konuşan kişiyi gösterir ve onun için “ben” demektir. Mikrofon başkasına geçince onun söylediği I artık onu gösterir. İngilizcede I, cümlenin ortasında bile her zaman büyük yazılır.',
  pl: 'I wędruje z wyobrażonym mikrofonem i wskazuje osobę, która mówi: dla niej znaczy „ja”. Gdy mikrofon przejmuje ktoś inny, jego I wskazuje już jego. Po angielsku I zawsze zapisuje się wielką literą, nawet w środku zdania.',
});

const FORMULA_BODY = L({
  ru: 'I называет говорящего, а am присоединяет к нему важную информацию. Поэтому английская мысль строится как маленький мост: I am here или I am ready. Уберите am — мост исчезнет, и слова останутся по разным берегам.',
  uk: 'I називає мовця, а am приєднує до нього важливу інформацію. Тому англійська думка будується як маленький міст: I am here або I am ready. Заберіть am — міст зникне, а слова залишаться на різних берегах.',
  es: 'I nombra a quien habla y am lo conecta con la información importante. Por eso la idea inglesa usa un pequeño puente: I am here o I am ready. Si quitas am, el puente desaparece y las palabras quedan separadas.',
  'pt-BR': 'I identifica quem fala, e am liga essa pessoa à informação importante. Por isso a ideia inglesa usa uma pequena ponte: I am here ou I am ready. Sem am, a ponte some e as palavras ficam separadas.',
  vi: 'I gọi tên người nói, còn am nối người đó với thông tin quan trọng. Vì vậy tiếng Anh dùng một cây cầu nhỏ: I am here hoặc I am ready. Bỏ am đi, cây cầu biến mất và các từ đứng rời nhau.',
  id: 'I menyebut orang yang berbicara, lalu am menghubungkannya dengan informasi penting. Karena itu bahasa Inggris memakai jembatan kecil: I am here atau I am ready. Tanpa am, jembatannya hilang dan kata-kata terpisah.',
  tr: 'I konuşan kişiyi gösterir, am ise onu önemli bilgiye bağlar. Bu yüzden İngilizce düşüncede küçük bir köprü vardır: I am here ya da I am ready. Am çıkarılırsa köprü kaybolur ve sözcükler ayrı kalır.',
  pl: 'I wskazuje osobę mówiącą, a am łączy ją z ważną informacją. Dlatego angielska myśl ma mały most: I am here albo I am ready. Bez am most znika, a słowa zostają po dwóch stronach.',
});

const TRAP_BODY = L({
  ru: 'По-русски можно сказать «я здесь» без отдельного слова между частями. Английская фраза так не любит: ей нужен порядок I am here. Am может не появиться в переводе, но в самой английской фразе оно работает и держит всё вместе.',
  uk: 'Українською можна сказати «я тут» без окремого слова між частинами. Англійська фраза так не любить: їй потрібен порядок I am here. Am може не з’явитися в перекладі, але в англійському вислові воно тримає все разом.',
  es: 'En español, estoy puede reunir a la persona y su situación en una sola forma. El inglés separa las piezas y necesita I am here. Aunque am no aparezca como palabra independiente en la traducción, sostiene la frase inglesa.',
  'pt-BR': 'Em português, estou pode reunir a pessoa e a situação numa única forma. O inglês separa as peças e precisa de I am here. Mesmo sem uma palavra isolada na tradução, am sustenta a frase inglesa.',
  vi: 'Tiếng Việt có thể nói “tôi ở đây” mà không cần một từ nối giống hệt tiếng Anh. Tiếng Anh tách rõ ba phần và cần I am here. Am có thể không hiện thành một từ riêng trong bản dịch, nhưng nó giữ câu tiếng Anh liền mạch.',
  id: 'Bahasa Indonesia dapat mengatakan “saya di sini” tanpa penghubung yang sama seperti bahasa Inggris. Bahasa Inggris memisahkan tiga bagian dan memerlukan I am here. Am mungkin tidak tampak sebagai kata tersendiri dalam terjemahan, tetapi tetap menyatukan kalimat.',
  tr: 'Türkçe “buradayım” derken kişi ve yer bilgisini tek sözcükte toplayabilir. İngilizce parçaları ayırır ve I am here düzenini ister. Am çeviride ayrı görünmese bile İngilizce ifadeyi bir arada tutar.',
  pl: 'Po polsku jestem potrafi połączyć osobę i jej sytuację w jednym słowie. Angielski rozdziela te części i potrzebuje I am here. Choć am nie ma osobnego odpowiednika w tłumaczeniu, spina angielskie zdanie.',
});

export const EPISODE_01_SESSION_01_WORD_FIRST_INTRO: readonly [SessionSourceIntroPage, SessionSourceIntroPage, SessionSourceIntroPage] = [
  {
    kind: 'concept',
    title: L({ ru: 'I называет говорящего', uk: 'I називає мовця', es: 'I nombra a quien habla', 'pt-BR': 'I nomeia quem fala', vi: 'I gọi tên người đang nói', id: 'I menunjuk orang yang berbicara', tr: 'I konuşan kişiyi gösterir', pl: 'I nazywa osobę mówiącą' }),
    body: CONCEPT_BODY,
    bodyRuns: bodyRuns(CONCEPT_BODY, ['I']),
    question: {
      grammarFeatureId: 'copula_be',
      testedDimension: 'first_person_subject_I',
      prompt: L({ ru: 'Кого называет I, когда говорите вы?', uk: 'Кого називає I, коли говорите ви?', es: '¿A quién nombra I cuando hablas tú?', 'pt-BR': 'Quem I nomeia quando você está falando?', vi: 'I chỉ ai khi chính bạn đang nói?', id: 'Siapa yang ditunjuk I saat kamu sedang berbicara?', tr: 'Siz konuşurken I kimi gösterir?', pl: 'Kogo oznacza I, gdy mówisz ty?' }),
      choices: [targetChoice('I'), targetChoice('i'), targetChoice('l')],
      correctChoiceIndex: 0,
      explanation: L({ ru: 'I — правильное английское «я»: оно всегда заглавное. i нарушает написание, а l является другой буквой.', uk: 'I — правильне англійське «я»: воно завжди велике. i порушує написання, а l є іншою літерою.', es: 'I es el «yo» inglés correcto y siempre va en mayúscula. i rompe la escritura y l es otra letra.', 'pt-BR': 'I é o «eu» inglês correto e sempre fica em maiúscula. i quebra a escrita e l é outra letra.', vi: 'I là từ tiếng Anh đúng cho “tôi” và luôn viết hoa. i sai cách viết, còn l là chữ khác.', id: 'I adalah bentuk Inggris yang benar untuk “saya” dan selalu huruf besar. i salah eja, sedangkan l huruf lain.', tr: 'Doğru İngilizce “ben” biçimi I olur ve her zaman büyüktür. i yazımı bozar, l ise başka bir harftir.', pl: 'I jest poprawnym angielskim „ja” i zawsze ma wielką literę. i ma złą pisownię, a l jest inną literą.' }),
    },
  },
  {
    kind: 'formula',
    title: L({ ru: 'Am создаёт связь', uk: 'Am створює зв’язок', es: 'Am crea la unión', 'pt-BR': 'Am cria a ligação', vi: 'Am tạo mối nối', id: 'Am menjadi penghubung', tr: 'Am bağlantıyı kurar', pl: 'Am tworzy połączenie' }),
    body: FORMULA_BODY,
    bodyRuns: bodyRuns(FORMULA_BODY, ['I', 'am', 'here', 'ready']),
    question: {
      grammarFeatureId: 'copula_be',
      testedDimension: 'first_person_copula_am',
      prompt: L({ ru: 'Какое слово соединяет I с дальнейшей информацией?', uk: 'Яке слово поєднує I з подальшою інформацією?', es: '¿Qué palabra conecta I con la información siguiente?', 'pt-BR': 'Qual palavra liga I à informação seguinte?', vi: 'Từ nào nối I với thông tin phía sau?', id: 'Kata mana menghubungkan I dengan informasi berikutnya?', tr: 'I sözcüğünü sonraki bilgiye hangisi bağlar?', pl: 'Które słowo łączy I z dalszą informacją?' }),
      choices: [L({ ru: 'am', uk: 'am', es: 'am', 'pt-BR': 'am', vi: 'am', id: 'am', tr: 'am', pl: 'am' }), L({ ru: 'an', uk: 'an', es: 'an', 'pt-BR': 'an', vi: 'an', id: 'an', tr: 'an', pl: 'an' }), L({ ru: 'm', uk: 'm', es: 'm', 'pt-BR': 'm', vi: 'm', id: 'm', tr: 'm', pl: 'm' })],
      correctChoiceIndex: 0,
      explanation: L({ ru: 'Am строит нужный мост после I. An заканчивается другим звуком, а m остаётся одной буквой.', uk: 'Am будує потрібний міст після I. An закінчується іншим звуком, а m лишається однією літерою.', es: 'Am construye el puente después de I. An termina con otro sonido y m es solo una letra.', 'pt-BR': 'Am constrói a ponte depois de I. An termina com outro som, e m é apenas uma letra.', vi: 'Am tạo cây cầu sau I. An kết thúc bằng âm khác, còn m chỉ là một chữ cái.', id: 'Am membangun jembatan setelah I. An berakhir dengan bunyi lain, sedangkan m hanya satu huruf.', tr: 'I sonrasındaki köprüyü am kurar. An başka bir sesle biter, m ise tek bir harftir.', pl: 'Potrzebny most po I tworzy am. An kończy się innym dźwiękiem, a m jest tylko literą.' }),
    },
  },
  {
    kind: 'trap',
    title: L({ ru: 'Am нельзя потерять', uk: 'Am не можна загубити', es: 'No pierdas am', 'pt-BR': 'Não perca am', vi: 'Đừng làm mất am', id: 'Jangan hilangkan am', tr: 'Am kaybolmasın', pl: 'Nie zgub am' }),
    body: TRAP_BODY,
    bodyRuns: bodyRuns(TRAP_BODY, ['I', 'am', 'here']),
    question: {
      grammarFeatureId: 'copula_be',
      testedDimension: 'affirmative_I_am_word_order',
      prompt: L({ ru: 'Какая английская фраза собрана полностью?', uk: 'Який англійський вислів зібрано повністю?', es: '¿Qué frase inglesa está completa?', 'pt-BR': 'Qual frase inglesa está completa?', vi: 'Câu tiếng Anh nào đã đủ các phần?', id: 'Kalimat Inggris mana yang lengkap?', tr: 'Hangi İngilizce ifade tamamdır?', pl: 'Które angielskie zdanie jest kompletne?' }),
      choices: [L({ ru: 'I am here', uk: 'I am here', es: 'I am here', 'pt-BR': 'I am here', vi: 'I am here', id: 'I am here', tr: 'I am here', pl: 'I am here' }), L({ ru: 'I here', uk: 'I here', es: 'I here', 'pt-BR': 'I here', vi: 'I here', id: 'I here', tr: 'I here', pl: 'I here' }), L({ ru: 'Am here', uk: 'Am here', es: 'Am here', 'pt-BR': 'Am here', vi: 'Am here', id: 'Am here', tr: 'Am here', pl: 'Am here' })],
      correctChoiceIndex: 0,
      explanation: L({ ru: 'I am here собрано полностью: I называет говорящего, а am удерживает связь.', uk: 'I am here зібрано повністю: I називає мовця, а am утримує зв’язок.', es: 'I am here está completa: I nombra a quien habla y am mantiene la conexión.', 'pt-BR': 'I am here está completa: I identifica quem fala e am mantém a ligação.', vi: 'I am here đã đầy đủ: I gọi tên người nói và am giữ mối nối.', id: 'I am here sudah lengkap: I menyebut penutur dan am menjaga penghubungnya.', tr: 'I am here tamamdır: I konuşanı gösterir, am ise bağlantıyı korur.', pl: 'I am here jest kompletne: I wskazuje mówiącego, a am utrzymuje połączenie.' }),
    },
  },
];
