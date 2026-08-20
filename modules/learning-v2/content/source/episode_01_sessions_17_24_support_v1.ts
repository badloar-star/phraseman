import type { EpisodeSourcePhrase, EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { SessionKind } from './episode_01_session_map_v1';
import type { LocalizedIntroRunsSource, LocalizedSource, SessionSource } from './session_shard_from_source_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];

type Copy = { title: string; concept: string; formula: string; trap: string; choose: string; correct: string; wrong: string; meaning: string; explanation: string };
const COPY: Record<Locale, Copy> = {
  ru: { title: 'Он, она и оно', concept: 'Русское «он готов» обходится без слова «есть», но английский между человеком и признаком ставит is. В живой фразе He is ready и She is ready связь слышна сразу; без is остаются только два несоединённых слова.', formula: 'He, she и it требуют is. Последнее слово сообщает состояние, место, погоду или вещь, а маленькое is соединяет эту информацию с тем, о ком говорят.', trap: 'Не переносите русскую короткую форму прямо в английский. He ready и She tired не становятся разговорными вариантами: в них пропал обязательный мост is.', choose: 'Выберите полную английскую фразу.', correct: 'Верно: is связывает подлежащее с описанием.', wrong: 'Этот вариант не показывает нужную форму is или меняет порядок слов.', meaning: 'Значение', explanation: 'Так говорят о человеке, вещи или погоде; форма is остаётся между подлежащим и описанием.' },
  uk: { title: 'Він, вона і воно', concept: 'Українське «він готовий» часто обходиться без «є», але англійська ставить is між людиною та ознакою. У He is ready і She is ready зв’язок чути одразу; без is лишаються нез’єднані слова.', formula: 'He, she та it вимагають is. Останнє слово називає стан, місце, погоду або річ, а is з’єднує цю інформацію з тим, про кого йдеться.', trap: 'Не переносіть українську коротку модель прямо в англійську. He ready і She tired не є розмовними варіантами: у них зникла обов’язкова зв’язка is.', choose: 'Оберіть повну англійську фразу.', correct: 'Правильно: is поєднує підмет з описом.', wrong: 'У цьому варіанті немає потрібної форми is або змінено порядок слів.', meaning: 'Значення', explanation: 'Так говорять про людину, річ або погоду; is стоїть між підметом і описом.' },
  es: { title: 'Él, ella y ello', concept: 'En español «él está listo» ya lleva la unión en está, pero el inglés muestra una pieza separada: is. He is ready y She is ready son frases completas; sin is quedan palabras sin conexión.', formula: 'Con he, she e it se usa is. La última palabra aporta estado, lugar, tiempo o cosa, y is une esa información con el sujeto.', trap: 'No copies la frase española palabra por palabra. He ready y She tired no son versiones cortas: les falta la cópula is.', choose: 'Elige la frase inglesa completa.', correct: 'Correcto: is une el sujeto con la descripción.', wrong: 'Esta opción omite is o cambia el orden inglés.', meaning: 'Significado', explanation: 'Se dice así sobre una persona, una cosa o el tiempo; is queda entre el sujeto y la descripción.' },
  'pt-BR': { title: 'Ele, ela e isso', concept: 'Em português, «ele está pronto» concentra a ligação em está; em inglês ela aparece separada como is. He is ready e She is ready ficam completos; sem is sobram palavras sem ligação.', formula: 'Com he, she e it usa-se is. A palavra final traz estado, lugar, clima ou coisa, e is liga essa informação ao sujeito.', trap: 'Não copie a frase portuguesa palavra por palavra. He ready e She tired não são formas curtas: falta-lhes a cópula is.', choose: 'Escolha a frase inglesa completa.', correct: 'Certo: is liga o sujeito à descrição.', wrong: 'Esta opção omite is ou muda a ordem inglesa.', meaning: 'Significado', explanation: 'A frase fala de uma pessoa, coisa ou clima; is fica entre o sujeito e a descrição.' },
  vi: { title: 'Anh ấy, cô ấy và nó', concept: 'Tiếng Việt có thể đặt đặc điểm sau người mà không cần một từ nối chung, nhưng tiếng Anh cần is. He is ready và She is ready là câu hoàn chỉnh; thiếu is thì các từ chưa được nối.', formula: 'He, she và it đi với is. Từ cuối nêu trạng thái, nơi chốn, thời tiết hoặc đồ vật; is nối thông tin đó với chủ ngữ.', trap: 'Đừng chép thẳng mẫu tiếng Việt. He ready và She tired không phải dạng ngắn: chúng thiếu is bắt buộc.', choose: 'Chọn câu tiếng Anh hoàn chỉnh.', correct: 'Đúng: is nối chủ ngữ với phần miêu tả.', wrong: 'Phương án này thiếu is hoặc đổi trật tự tiếng Anh.', meaning: 'Nghĩa', explanation: 'Câu này nói về người, vật hoặc thời tiết; is đứng giữa chủ ngữ và phần miêu tả.' },
  id: { title: 'Dia laki-laki, dia perempuan, dan itu', concept: 'Bahasa Indonesia dapat menaruh sifat langsung setelah orangnya, tetapi bahasa Inggris memerlukan is. He is ready dan She is ready lengkap; tanpa is kata-katanya belum tersambung.', formula: 'He, she, dan it memakai is. Kata terakhir menyatakan keadaan, tempat, cuaca, atau benda; is menghubungkannya dengan subjek.', trap: 'Jangan salin pola Indonesia langsung. He ready dan She tired bukan bentuk pendek: keduanya kehilangan is yang wajib.', choose: 'Pilih kalimat bahasa Inggris lengkap.', correct: 'Benar: is menghubungkan subjek dengan keterangan.', wrong: 'Pilihan ini tidak memakai is atau mengubah urutan Inggris.', meaning: 'Arti', explanation: 'Kalimat ini dipakai untuk orang, benda, atau cuaca; is berada di antara subjek dan keterangan.' },
  tr: { title: 'O, o ve o', concept: 'Türkçede kişi ve yüklem eklerde birleşebilir; İngilizce ise bağlantıyı ayrı bir is sözcüğüyle gösterir. He is ready ve She is ready tamdır; is olmadan sözcükler bağlanmaz.', formula: 'He, she ve it ile is kullanılır. Son sözcük durum, yer, hava ya da nesneyi söyler; is bu bilgiyi özneye bağlar.', trap: 'Türkçe kısa yapıyı doğrudan taşımayın. He ready ve She tired kısa biçimler değildir: zorunlu is eksiktir.', choose: 'Tam İngilizce cümleyi seçin.', correct: 'Doğru: is özneyi açıklamaya bağlar.', wrong: 'Bu seçenekte is yoktur ya da İngilizce sıra değişmiştir.', meaning: 'Anlam', explanation: 'Bu cümle kişi, nesne veya hava için kullanılır; is özne ile açıklama arasındadır.' },
  pl: { title: 'On, ona i to', concept: 'Po polsku „on gotowy” może pominąć jest, lecz angielski wymaga osobnego is. He is ready i She is ready są pełne; bez is zostają niepołączone słowa.', formula: 'Z he, she i it używa się is. Ostatnie słowo opisuje stan, miejsce, pogodę albo rzecz, a is łączy je z podmiotem.', trap: 'Nie przenoś polskiego skrótu wprost. He ready i She tired nie są krótszymi formami: brakuje w nich obowiązkowego is.', choose: 'Wybierz pełne zdanie po angielsku.', correct: 'Dobrze: is łączy podmiot z opisem.', wrong: 'W tej opcji brakuje is albo zmieniono angielski szyk.', meaning: 'Znaczenie', explanation: 'To zdanie mówi o osobie, rzeczy albo pogodzie; is stoi między podmiotem a opisem.' },
};

const L = (select: (copy: Copy) => string): LocalizedSource => Object.fromEntries(LOCALES.map((locale) => [locale, select(COPY[locale])])) as unknown as LocalizedSource;
const tokenise = (english: string) => english.replace(/[?.!]/g, '').split(/\s+/).filter(Boolean);
const wordCategory = (word: string): 'pronoun' | 'to-be' | 'negation' | 'lexical' => /^(He|She|It|he|she|it)$/u.test(word) ? 'pronoun' : /^(is|Is|[Hh]e’s|[Ss]he’s|[Ii]t’s)$/u.test(word) ? 'to-be' : word === 'not' ? 'negation' : 'lexical';
const turkishQuestionParticle = (word: string): 'mı' | 'mi' | 'mu' | 'mü' => {
  if (word.toLocaleLowerCase('tr') === 'meşgul') return 'mü';
  const vowel = [...word.toLocaleLowerCase('tr')].reverse().find((letter) => 'aıeiouöü'.includes(letter));
  return vowel === 'a' || vowel === 'ı' ? 'mı' : vowel === 'e' || vowel === 'i' ? 'mi' : vowel === 'o' || vowel === 'u' ? 'mu' : 'mü';
};

function localizedDetails(english: string): Record<Locale, EpisodeSourcePhraseLocalizedDetails> {
  return Object.fromEntries(LOCALES.map((locale) => {
    const words = tokenise(english);
    return [locale, {
      meaning: translateMeaning(locale, english),
      explanation: localizedExplanation(locale, english, translateMeaning(locale, english)),
      distractors: wordAlternatives(words[0] ?? 'is').map((value) => ({ value, reason: localizedReason(locale, words[0] ?? 'is', value) })),
      words: words.map((word) => ({ correct: word, prompt: wordPrompt(locale, english, word), distractors: wordAlternatives(word).map((value) => ({ value, reason: localizedReason(locale, word, value) })) })),
    }];
  })) as unknown as Record<Locale, EpisodeSourcePhraseLocalizedDetails>;
}

function wordPrompt(locale: Locale, english: string, word: string): string {
  const meaning = translateMeaning(locale, english);
  const prompts: Record<Locale, string> = {
    ru: `Какое английское слово нужно в фразе со смыслом «${meaning}»?`,
    uk: `Яке англійське слово потрібне у фразі зі значенням «${meaning}»?`,
    es: `¿Qué palabra inglesa hace falta en la frase que significa «${meaning}»?`,
    'pt-BR': `Qual palavra em inglês falta na frase que significa «${meaning}»?`,
    vi: `Từ tiếng Anh nào cần có trong câu mang nghĩa «${meaning}»?`,
    id: `Kata bahasa Inggris mana yang diperlukan dalam kalimat bermakna «${meaning}»?`,
    tr: `«${meaning}» anlamındaki cümlede hangi İngilizce sözcük gerekir?`,
    pl: `Jakie angielskie słowo jest potrzebne w zdaniu znaczącym „${meaning}”?`,
  };
  // The meaning sets a real situation without showing the English answer.
  return prompts[locale];
}

function localizedContrast(locale: Locale, correct: string, alternative: string): string {
  const kind = /^(was|were)$/u.test(alternative) ? 'past' : /^(be|been)$/u.test(alternative) ? 'base' : /^(I’m|you’re|we’re|they’re)$/u.test(alternative) ? 'contraction' : /^(an|the|this|that|my)$/u.test(alternative) ? 'article' : null;
  if (!kind) return '';
  const copy: Record<Locale, Record<typeof kind, string>> = {
    ru: { past: `«${alternative}» переносит смысл в прошлое, а «${correct}» описывает настоящее.`, base: `«${alternative}» — неличная форма be, а здесь нужна личная форма «${correct}».`, contraction: `«${alternative}» содержит другое местоимение; здесь требуется именно «${correct}».`, article: `«${alternative}» меняет артикль или принадлежность, а здесь нужен элемент «${correct}».` },
    uk: { past: `«${alternative}» переносить зміст у минуле, а «${correct}» описує теперішнє.`, base: `«${alternative}» — неособова форма be, а тут потрібна особова форма «${correct}».`, contraction: `«${alternative}» містить інший займенник; тут потрібне саме «${correct}».`, article: `«${alternative}» змінює артикль або належність, а тут потрібен елемент «${correct}».` },
    es: { past: `«${alternative}» sitúa el mensaje en el pasado, mientras «${correct}» describe el presente.`, base: `«${alternative}» es una forma no personal de be; aquí hace falta «${correct}».`, contraction: `«${alternative}» contiene otro pronombre; aquí se necesita exactamente «${correct}».`, article: `«${alternative}» cambia el artículo o la posesión; aquí corresponde «${correct}».` },
    'pt-BR': { past: `«${alternative}» leva a mensagem ao passado, enquanto «${correct}» descreve o presente.`, base: `«${alternative}» é uma forma não pessoal de be; aqui é necessário «${correct}».`, contraction: `«${alternative}» contém outro pronome; aqui é preciso exatamente «${correct}».`, article: `«${alternative}» muda o artigo ou a posse; aqui corresponde «${correct}».` },
    vi: { past: `«${alternative}» đưa ý nghĩa về quá khứ, còn «${correct}» mô tả hiện tại.`, base: `«${alternative}» là dạng không chia của be; vị trí này cần «${correct}».`, contraction: `«${alternative}» chứa một đại từ khác; ở đây phải là «${correct}».`, article: `«${alternative}» làm đổi mạo từ hoặc quan hệ sở hữu; ở đây cần «${correct}».` },
    id: { past: `«${alternative}» memindahkan makna ke masa lalu, sedangkan «${correct}» menyatakan keadaan sekarang.`, base: `«${alternative}» adalah bentuk be yang tidak sesuai subjek; di sini diperlukan «${correct}».`, contraction: `«${alternative}» memuat kata ganti lain; bagian ini harus memakai «${correct}».`, article: `«${alternative}» mengubah artikel atau kepemilikan; di sini diperlukan «${correct}».` },
    tr: { past: `«${alternative}» anlamı geçmişe taşır; «${correct}» ise şimdiki durumu anlatır.`, base: `«${alternative}» çekimsiz bir be biçimidir; burada «${correct}» gerekir.`, contraction: `«${alternative}» başka bir zamir içerir; burada tam olarak «${correct}» gerekir.`, article: `«${alternative}» tanımlığı ya da sahipliği değiştirir; burada «${correct}» gerekir.` },
    pl: { past: `„${alternative}” przenosi sens do przeszłości, a „${correct}” opisuje teraźniejszość.`, base: `„${alternative}” jest nieosobową formą be; tutaj potrzebne jest „${correct}”.`, contraction: `„${alternative}” zawiera inny zaimek; tutaj potrzebne jest dokładnie „${correct}”.`, article: `„${alternative}” zmienia rodzajnik albo przynależność; tutaj potrzebne jest „${correct}”.` },
  };
  return copy[locale][kind];
}

function localizedReason(locale: Locale, correct: string, alternative: string): string {
  if (alternative === 'this') {
    const thisReason: Record<Locale, string> = {
      ru: `«this» указывает на предмет рядом, а «${correct}» называет нужного человека или ситуацию в этой фразе.`, uk: `«this» вказує на предмет поруч, а «${correct}» називає потрібну людину або ситуацію в цій фразі.`, es: `«this» señala una cosa cercana; «${correct}» nombra a la persona o situación necesaria aquí.`, 'pt-BR': `«this» aponta uma coisa próxima; «${correct}» nomeia a pessoa ou situação necessária aqui.`, vi: `«this» chỉ một vật ở gần, còn «${correct}» nêu đúng người hoặc tình huống trong câu.`, id: `«this» menunjuk benda dekat, sedangkan «${correct}» menyebut orang atau situasi yang diperlukan.`, tr: `«this» yakındaki bir nesneyi gösterir; «${correct}» ise gerekli kişi ya da durumu adlandırır.`, pl: `„this” wskazuje pobliską rzecz, a „${correct}” nazywa potrzebną osobę albo sytuację.`,
    };
    return thisReason[locale];
  }
  const category = /^(He|She|It|he|she|it)$/u.test(correct) ? 'pronoun' : /^(is|Is|he’s|she’s|it’s)$/u.test(correct) ? 'copula' : correct === 'not' ? 'negation' : 'word';
  const text: Record<Locale, Record<typeof category, string>> = {
    ru: { pronoun: `«${alternative}» называет другого участника, а здесь нужен именно «${correct}».`, copula: `«${alternative}» не является нужной формой связки; после этого подлежащего нужна «${correct}».`, negation: `«${alternative}» не отрицает смысл; здесь отрицание создаёт именно «${correct}».`, word: `«${alternative}» меняет нужный смысл; в этой позиции должно стоять «${correct}».` },
    uk: { pronoun: `«${alternative}» називає іншу особу, а тут потрібне саме «${correct}».`, copula: `«${alternative}» не є потрібною формою зв’язки; тут потрібне «${correct}».`, negation: `«${alternative}» не заперечує зміст; заперечення дає саме «${correct}».`, word: `«${alternative}» змінює потрібний зміст; тут має стояти «${correct}».` },
    es: { pronoun: `«${alternative}» nombra a otra persona; aquí hace falta «${correct}».`, copula: `«${alternative}» no es la cópula correcta; aquí se necesita «${correct}».`, negation: `«${alternative}» no niega la idea; la negación es «${correct}».`, word: `«${alternative}» cambia el sentido; en este lugar va «${correct}».` },
    'pt-BR': { pronoun: `«${alternative}» aponta outra pessoa; aqui é preciso «${correct}».`, copula: `«${alternative}» não é a cópula correta; aqui se usa «${correct}».`, negation: `«${alternative}» não nega a ideia; a negação é «${correct}».`, word: `«${alternative}» muda o sentido; nesta posição vai «${correct}».` },
    vi: { pronoun: `«${alternative}» chỉ người khác; ở đây cần «${correct}».`, copula: `«${alternative}» không phải dạng nối đúng; ở đây cần «${correct}».`, negation: `«${alternative}» không phủ định ý; từ phủ định là «${correct}».`, word: `«${alternative}» đổi nghĩa; vị trí này cần «${correct}».` },
    id: { pronoun: `«${alternative}» menunjuk orang lain; di sini diperlukan «${correct}».`, copula: `«${alternative}» bukan bentuk penghubung yang benar; di sini perlu «${correct}».`, negation: `«${alternative}» tidak menyangkal makna; penyangkalannya adalah «${correct}».`, word: `«${alternative}» mengubah arti; posisi ini memerlukan «${correct}».` },
    tr: { pronoun: `«${alternative}» başka bir kişiyi gösterir; burada «${correct}» gerekir.`, copula: `«${alternative}» doğru bağlayıcı biçim değildir; burada «${correct}» gerekir.`, negation: `«${alternative}» anlamı olumsuz yapmaz; olumsuzluk «${correct}» ile kurulur.`, word: `«${alternative}» anlamı değiştirir; bu yerde «${correct}» gerekir.` },
    pl: { pronoun: `«${alternative}» wskazuje inną osobę; tutaj potrzebne jest «${correct}».`, copula: `«${alternative}» nie jest właściwą formą łącznika; tutaj potrzebne jest «${correct}».`, negation: `«${alternative}» nie przeczy znaczeniu; przeczenie tworzy «${correct}».`, word: `«${alternative}» zmienia sens; w tym miejscu potrzebne jest «${correct}».` },
  };
  const contrast = localizedContrast(locale, correct, alternative);
  const suffix: Record<Locale, string> = { ru: ' Это меняет точный смысл готовой фразы.', uk: ' Це змінює точний зміст готової фрази.', es: ' Eso cambia el sentido preciso de la frase completa.', 'pt-BR': ' Isso muda o sentido exato da frase completa.', vi: ' Vì vậy nghĩa chính xác của cả câu sẽ đổi.', id: ' Karena itu arti tepat dari seluruh kalimat berubah.', tr: ' Böylece bütün cümlenin kesin anlamı değişir.', pl: ' Przez to zmienia się dokładny sens całego zdania.' };
  return `${contrast || text[locale][category]}${suffix[locale]}`;
}

const wordAlternatives = (word: string): readonly string[] => {
  if (/^(He|She|It|he|she|it)$/u.test(word)) return ['I', 'you', 'we', 'they', 'this'];
  if (/^(is|Is)$/u.test(word)) return ['am', 'are', 'was', 'be', 'been'];
  if (/^([Hh]e|[Ss]he|[Ii]t)’s$/u.test(word)) return ['I’m', 'you’re', 'we’re', 'they’re', 'is'];
  if (word === 'not') return ['very', 'also', 'too', 'really', 'quite'];
  if (word === 'a') return ['an', 'the', 'this', 'that', 'my'];
  if (/^(My|my)$/u.test(word)) return ['your', 'his', 'her', 'our', 'their'];
  if (/^(mother|father|sister|brother)$/u.test(word)) return ['friend', 'teacher', 'child', 'neighbor', 'parent'];
  if (/^(ready|tired|calm|happy|busy|cold|warm|okay|sunny|rainy|windy|cloudy)$/u.test(word)) return ['ready', 'tired', 'calm', 'happy', 'busy', 'cold', 'warm', 'okay', 'sunny', 'rainy'].filter((value) => value !== word).slice(0, 5);
  if (/^(here|book|bag|cup|pen|phone|key)$/u.test(word)) return ['here', 'home', 'book', 'bag', 'phone', 'key'].filter((value) => value !== word).slice(0, 5);
  return ['I', 'you', 'he', 'she', 'it'];
};

function localizedExplanation(locale: Locale, english: string, meaning: string): string {
  const question = english.startsWith('Is ');
  const contraction = /’s/u.test(english);
  const negative = / not /u.test(english);
  const shape = question ? 'question' : contraction ? 'contraction' : negative ? 'negative' : 'statement';
  const copy: Record<Locale, Record<typeof shape, string>> = {
    ru: { statement: `В «${english}» сначала назван участник или предмет, затем is связывает его с описанием.`, negative: `В «${english}» not стоит сразу после is и отменяет названный признак; без not смысл станет противоположным.`, question: `В «${english}» Is стоит первым, затем идёт тот, о ком спрашивают, и описание; именно инверсия создаёт вопрос.`, contraction: `В «${english}» знак ’s соединяет местоимение с is в короткий звучащий блок, не меняя исходного смысла.` },
    uk: { statement: `У «${english}» спочатку названо людину чи річ, а is поєднує її з описом.`, negative: `У «${english}» not стоїть одразу після is і заперечує названу ознаку; без not зміст стане протилежним.`, question: `У «${english}» Is стоїть першим, далі йде той, про кого запитують, і опис; саме інверсія створює запитання.`, contraction: `У «${english}» знак ’s поєднує займенник з is у короткий звуковий блок, не змінюючи змісту.` },
    es: { statement: `En «${english}» se nombra primero a la persona o cosa e is la une con la descripción.`, negative: `En «${english}», not va justo después de is y niega la característica; sin not el mensaje sería el contrario.`, question: `En «${english}», Is abre la frase, seguido por la persona y la descripción; esa inversión crea la pregunta.`, contraction: `En «${english}», ’s une el pronombre con is en un bloque breve y conserva el mismo significado.` },
    'pt-BR': { statement: `Em «${english}», a pessoa ou coisa vem primeiro e is a liga à descrição.`, negative: `Em «${english}», not vem logo depois de is e nega a característica; sem not a mensagem seria oposta.`, question: `Em «${english}», Is abre a frase, seguido pela pessoa e pela descrição; essa inversão cria a pergunta.`, contraction: `Em «${english}», ’s junta o pronome a is num bloco curto e mantém o mesmo sentido.` },
    vi: { statement: `Trong «${english}», người hoặc vật được nêu trước rồi is nối chủ thể với phần miêu tả.`, negative: `Trong «${english}», not đứng ngay sau is để phủ định đặc điểm; bỏ not sẽ tạo ra ý nghĩa ngược lại.`, question: `Trong «${english}», Is đứng đầu, sau đó là người được hỏi và phần miêu tả; đảo trật tự như vậy tạo câu hỏi.`, contraction: `Trong «${english}», ’s ghép đại từ với is thành một cụm ngắn mà không đổi nghĩa.` },
    id: { statement: `Dalam «${english}», orang atau benda disebut lebih dulu lalu is menghubungkannya dengan keterangan.`, negative: `Dalam «${english}», not langsung mengikuti is dan menyangkal sifatnya; tanpa not pesannya menjadi kebalikan.`, question: `Dalam «${english}», Is berada di awal, lalu orang yang ditanyakan dan keterangannya; pembalikan ini membentuk pertanyaan.`, contraction: `Dalam «${english}», ’s menyatukan kata ganti dengan is menjadi satu blok pendek tanpa mengubah arti.` },
    tr: { statement: `«${english}» içinde kişi ya da nesne önce gelir; is onu açıklamaya bağlar.`, negative: `«${english}» içinde not doğrudan is sonrasına gelir ve özelliği olumsuz yapar; not kalkarsa anlam tersine döner.`, question: `«${english}» Is ile başlar, ardından sorulan kişi ve açıklama gelir; soruyu bu ters sıra kurar.`, contraction: `«${english}» içinde ’s, zamir ile is biçimini kısa bir ses bloğunda birleştirir ve anlamı korur.` },
    pl: { statement: `W „${english}” najpierw pojawia się osoba lub rzecz, a is łączy ją z opisem.`, negative: `W „${english}” not stoi bezpośrednio po is i przeczy cesze; bez not komunikat miałby przeciwny sens.`, question: `W „${english}” Is stoi na początku, potem osoba i opis; właśnie ten odwrócony szyk tworzy pytanie.`, contraction: `W „${english}” znak ’s łączy zaimek z is w krótki blok brzmieniowy bez zmiany sensu.` },
  };
  const context: Record<Locale, string> = { ru: 'Такую фразу используют в обычной ситуации, когда нужно точно назвать состояние, место, предмет или погоду.', uk: 'Такий вислів уживають у звичайній ситуації, коли треба точно назвати стан, місце, предмет або погоду.', es: 'Esta frase sirve en una situación cotidiana para expresar con precisión un estado, lugar, objeto o tiempo.', 'pt-BR': 'A frase serve numa situação cotidiana para expressar com precisão estado, lugar, objeto ou clima.', vi: 'Câu này dùng trong tình huống thường ngày để nói chính xác về trạng thái, nơi chốn, đồ vật hoặc thời tiết.', id: 'Kalimat ini digunakan dalam situasi sehari-hari untuk menyatakan keadaan, tempat, benda, atau cuaca secara tepat.', tr: 'Bu cümle günlük bir durumda hâl, yer, nesne veya havayı kesin biçimde anlatmak için kullanılır.', pl: 'Takiego zdania używa się w codziennej sytuacji, aby dokładnie wyrazić stan, miejsce, rzecz albo pogodę.' };
  const combinedNegative: Record<Locale, string> = { ru: 'После сокращённой связки not отдельно создаёт отрицание; без not фраза утверждала бы обратное.', uk: 'Після скороченої зв’язки not окремо створює заперечення; без not вислів стверджував би протилежне.', es: 'Después de la cópula contraída, not crea la negación; sin not la frase afirmaría lo contrario.', 'pt-BR': 'Depois da cópula contraída, not cria a negação; sem not a frase afirmaria o contrário.', vi: 'Sau dạng nối rút gọn, not tạo nghĩa phủ định; bỏ not thì câu sẽ khẳng định điều ngược lại.', id: 'Setelah penghubung singkat, not membentuk penyangkalan; tanpa not kalimat menyatakan kebalikannya.', tr: 'Kısalmış bağlayıcıdan sonra not olumsuzluğu kurar; not olmadan cümle tersini bildirir.', pl: 'Po skróconym łączniku not tworzy przeczenie; bez not zdanie twierdziłoby coś przeciwnego.' };
  return `${meaning} ${context[locale]} ${copy[locale][shape]}${contraction && negative ? ` ${combinedNegative[locale]}` : ''}`;
}

function translateMeaning(locale: Locale, english: string): string {
  const clean = english.replace(/[?.!]/g, '');
  const question = english.endsWith('?');
  const negative = clean.includes(' not ');
  const contracted = clean.replace(/’s/g, ' is');
  const tokens = contracted.split(' ');
  const subject = tokens[0] === 'My' ? `My ${tokens[1]}` : tokens[0] === 'Is' ? (tokens[1] ?? '').replace(/^./u, (letter) => letter.toUpperCase()) : tokens[0] ?? '';
  const adjective = tokens.at(-1) ?? '';
  const predicate = adjective === 'ready' ? 'ready' : adjective;
  const base: Record<Locale, Record<string, string>> = {
    ru: { ready: 'готов', tired: 'устал', calm: 'спокоен', happy: 'счастлив', busy: 'занят', cold: 'холоден', warm: 'в тепле', okay: 'в порядке', sunny: 'солнечно', rainy: 'дождливо', windy: 'ветрено', cloudy: 'облачно', here: 'здесь', book: 'книга', bag: 'сумка', cup: 'чашка', pen: 'ручка', phone: 'телефон', key: 'ключ' },
    uk: { ready: 'готовий', tired: 'втомлений', calm: 'спокійний', happy: 'щасливий', busy: 'зайнятий', cold: 'холодно', warm: 'тепло', okay: 'гаразд', sunny: 'сонячно', rainy: 'дощить', windy: 'вітряно', cloudy: 'хмарно', here: 'тут', book: 'книга', bag: 'сумка', cup: 'чашка', pen: 'ручка', phone: 'телефон', key: 'ключ' },
    es: { ready: 'listo', tired: 'cansado', calm: 'tranquilo', happy: 'feliz', busy: 'ocupado', cold: 'frío', warm: 'calor', okay: 'bien', sunny: 'soleado', rainy: 'lluvioso', windy: 'ventoso', cloudy: 'nublado', here: 'aquí', book: 'un libro', bag: 'una bolsa', cup: 'una taza', pen: 'un bolígrafo', phone: 'un teléfono', key: 'una llave' },
    'pt-BR': { ready: 'pronto', tired: 'cansado', calm: 'calmo', happy: 'feliz', busy: 'ocupado', cold: 'frio', warm: 'calor', okay: 'bem', sunny: 'ensolarado', rainy: 'chuvoso', windy: 'ventando', cloudy: 'nublado', here: 'aqui', book: 'um livro', bag: 'uma bolsa', cup: 'uma xícara', pen: 'uma caneta', phone: 'um telefone', key: 'uma chave' },
    vi: { ready: 'sẵn sàng', tired: 'mệt', calm: 'bình tĩnh', happy: 'vui', busy: 'bận', cold: 'lạnh', warm: 'ấm', okay: 'ổn', sunny: 'nắng', rainy: 'mưa', windy: 'gió', cloudy: 'nhiều mây', here: 'ở đây', book: 'một quyển sách', bag: 'một cái túi', cup: 'một cái cốc', pen: 'một cây bút', phone: 'một chiếc điện thoại', key: 'một chiếc chìa khóa' },
    id: { ready: 'siap', tired: 'lelah', calm: 'tenang', happy: 'senang', busy: 'sibuk', cold: 'dingin', warm: 'hangat', okay: 'baik-baik saja', sunny: 'cerah', rainy: 'hujan', windy: 'berangin', cloudy: 'mendung', here: 'di sini', book: 'sebuah buku', bag: 'sebuah tas', cup: 'sebuah cangkir', pen: 'sebuah pena', phone: 'sebuah ponsel', key: 'sebuah kunci' },
    tr: { ready: 'hazır', tired: 'yorgun', calm: 'sakin', happy: 'mutlu', busy: 'meşgul', cold: 'soğuk', warm: 'ılık', okay: 'iyi', sunny: 'güneşli', rainy: 'yağmurlu', windy: 'rüzgârlı', cloudy: 'bulutlu', here: 'burada', book: 'bir kitap', bag: 'bir çanta', cup: 'bir fincan', pen: 'bir kalem', phone: 'bir telefon', key: 'bir anahtar' },
    pl: { ready: 'gotowy', tired: 'zmęczony', calm: 'spokojny', happy: 'szczęśliwy', busy: 'zajęty', cold: 'zimno', warm: 'ciepło', okay: 'w porządku', sunny: 'słonecznie', rainy: 'deszczowo', windy: 'wietrznie', cloudy: 'pochmurno', here: 'tutaj', book: 'książka', bag: 'torba', cup: 'kubek', pen: 'długopis', phone: 'telefon', key: 'klucz' },
  };
  const value = base[locale][predicate] ?? predicate;
  const female = subject === 'She' || subject === 'My mother' || subject === 'My sister';
  const isIt = subject === 'It';
  const isObject = isIt && tokens.includes('a');
  const isLocation = isIt && adjective === 'here';
  const isPersonTemperature = !isIt && (adjective === 'cold' || adjective === 'warm');
  const punctuation = question ? '?' : '.';
  // `it` has three different jobs in this material.  Weather is impersonal,
  // while an object has identity and `here` has location.  Keep those meanings
  // apart before the locale-specific grammar below gets a chance to flatten them.
  if (isObject || isLocation) {
    const object = adjective;
    const forms: Record<Locale, { readonly object: Record<string, string>; readonly here: string }> = {
      ru: { object: { book: 'Это книга', bag: 'Это сумка', cup: 'Это чашка', pen: 'Это ручка', phone: 'Это телефон', key: 'Это ключ' }, here: 'Это здесь' },
      uk: { object: { book: 'Це книга', bag: 'Це сумка', cup: 'Це чашка', pen: 'Це ручка', phone: 'Це телефон', key: 'Це ключ' }, here: 'Це тут' },
      es: { object: { book: 'Es un libro', bag: 'Es una bolsa', cup: 'Es una taza', pen: 'Es un bolígrafo', phone: 'Es un teléfono', key: 'Es una llave' }, here: 'Está aquí' },
      'pt-BR': { object: { book: 'É um livro', bag: 'É uma bolsa', cup: 'É uma xícara', pen: 'É uma caneta', phone: 'É um telefone', key: 'É uma chave' }, here: 'Está aqui' },
      vi: { object: { book: 'Đây là một quyển sách', bag: 'Đây là một cái túi', cup: 'Đây là một cái cốc', pen: 'Đây là một cây bút', phone: 'Đây là một chiếc điện thoại', key: 'Đây là một chiếc chìa khóa' }, here: 'Nó ở đây' },
      id: { object: { book: 'Ini sebuah buku', bag: 'Ini sebuah tas', cup: 'Ini sebuah cangkir', pen: 'Ini sebuah pena', phone: 'Ini sebuah ponsel', key: 'Ini sebuah kunci' }, here: 'Itu di sini' },
      tr: { object: { book: 'Bu bir kitap', bag: 'Bu bir çanta', cup: 'Bu bir fincan', pen: 'Bu bir kalem', phone: 'Bu bir telefon', key: 'Bu bir anahtar' }, here: 'O burada' },
      pl: { object: { book: 'To jest książka', bag: 'To jest torba', cup: 'To jest kubek', pen: 'To jest długopis', phone: 'To jest telefon', key: 'To jest klucz' }, here: 'To jest tutaj' },
    };
    const result = isLocation ? forms[locale].here : forms[locale].object[object];
    if (!question) return `${result}${punctuation}`;
  }
  if (isPersonTemperature) {
    const personTemperature: Record<Locale, Record<string, string>> = {
      ru: { He: 'Ему', She: 'Ей', 'My mother': 'Моей маме', 'My father': 'Моему папе', 'My sister': 'Моей сестре', 'My brother': 'Моему брату' }, uk: { He: 'Йому', She: 'Їй', 'My mother': 'Моїй мамі', 'My father': 'Моєму татові', 'My sister': 'Моїй сестрі', 'My brother': 'Моєму братові' }, es: { He: 'Él tiene', She: 'Ella tiene', 'My mother': 'Mi madre tiene', 'My father': 'Mi padre tiene', 'My sister': 'Mi hermana tiene', 'My brother': 'Mi hermano tiene' }, 'pt-BR': { He: 'Ele está com', She: 'Ela está com', 'My mother': 'Minha mãe está com', 'My father': 'Meu pai está com', 'My sister': 'Minha irmã está com', 'My brother': 'Meu irmão está com' }, vi: { He: 'Anh ấy', She: 'Cô ấy', 'My mother': 'Mẹ tôi', 'My father': 'Bố tôi', 'My sister': 'Chị tôi', 'My brother': 'Anh tôi' }, id: { He: 'Dia', She: 'Dia', 'My mother': 'Ibu saya', 'My father': 'Ayah saya', 'My sister': 'Saudari saya', 'My brother': 'Saudara laki-laki saya' }, tr: { He: 'O', She: 'O', 'My mother': 'Annem', 'My father': 'Babam', 'My sister': 'Kız kardeşim', 'My brother': 'Erkek kardeşim' }, pl: { He: 'Jemu jest', She: 'Jej jest', 'My mother': 'Mojej mamie jest', 'My father': 'Mojemu tacie jest', 'My sister': 'Mojej siostrze jest', 'My brother': 'Mojemu bratu jest' },
    };
    const person = personTemperature[locale][subject] ?? '';
    const temperatures: Record<Locale, string> = { ru: adjective === 'cold' ? 'холодно' : 'тепло', uk: adjective === 'cold' ? 'холодно' : 'тепло', es: adjective === 'cold' ? 'frío' : 'calor', 'pt-BR': adjective === 'cold' ? 'frio' : 'calor', vi: adjective === 'cold' ? 'lạnh' : 'ấm', id: adjective === 'cold' ? 'kedinginan' : 'hangat', tr: adjective === 'cold' ? 'üşüyor' : 'sıcak', pl: adjective === 'cold' ? 'zimno' : 'ciepło' };
    const temperature = temperatures[locale];
    if (question) {
      const questions: Record<Locale, string> = { ru: `${person} ${temperature}?`, uk: `${person} ${temperature}?`, es: `¿${person} ${temperature}?`, 'pt-BR': `${person} ${temperature}?`, vi: `${person} ${temperature} phải không?`, id: `Apakah ${person.toLowerCase()} ${temperature}?`, tr: `${person} ${temperature} ${turkishQuestionParticle(temperature)}?`, pl: `Czy ${person.toLowerCase()} ${temperature}?` };
      return questions[locale];
    }
    if (!negative) return `${person} ${temperature}${punctuation}`;
    const negativeTemperature: Record<Locale, string> = {
      ru: `${person} не ${temperature}`,
      uk: `${person} не ${temperature}`,
      es: `${person.replace(' tiene', ' no tiene')} ${temperature}`,
      'pt-BR': `${person.replace(' está com', ' não está com')} ${temperature}`,
      vi: `${person} không ${temperature}`,
      id: `${person} tidak ${temperature}`,
      tr: temperature === 'üşüyor' ? `${person} üşümüyor` : `${person} sıcak değil`,
      pl: `${person.replace(' jest', ' nie jest')} ${temperature}`,
    };
    return `${negativeTemperature[locale]}${punctuation}`;
  }
  if (isIt) {
    const weather: Record<Locale, Record<string, readonly [string, string, string]>> = {
      ru: { cold: ['Холодно', 'Не холодно', 'Холодно?'], warm: ['Тепло', 'Не тепло', 'Тепло?'], sunny: ['Солнечно', 'Не солнечно', 'Солнечно?'], rainy: ['Идёт дождь', 'Дождя нет', 'Дождливо?'], windy: ['Ветрено', 'Не ветрено', 'Ветрено?'], cloudy: ['Облачно', 'Не облачно', 'Облачно?'] },
      uk: { cold: ['Холодно', 'Не холодно', 'Холодно?'], warm: ['Тепло', 'Не тепло', 'Тепло?'], sunny: ['Сонячно', 'Не сонячно', 'Сонячно?'], rainy: ['Іде дощ', 'Дощу немає', 'Дощить?'], windy: ['Вітряно', 'Не вітряно', 'Вітряно?'], cloudy: ['Хмарно', 'Не хмарно', 'Хмарно?'] },
      es: { cold: ['Hace frío', 'No hace frío', '¿Hace frío?'], warm: ['Hace calor', 'No hace calor', '¿Hace calor?'], sunny: ['Hace sol', 'No hace sol', '¿Hace sol?'], rainy: ['Llueve', 'No llueve', '¿Llueve?'], windy: ['Hace viento', 'No hace viento', '¿Hace viento?'], cloudy: ['Está nublado', 'No está nublado', '¿Está nublado?'] },
      'pt-BR': { cold: ['Está frio', 'Não está frio', 'Está frio?'], warm: ['Está quente', 'Não está quente', 'Está quente?'], sunny: ['Está ensolarado', 'Não está ensolarado', 'Está ensolarado?'], rainy: ['Está chovendo', 'Não está chovendo', 'Está chovendo?'], windy: ['Está ventando', 'Não está ventando', 'Está ventando?'], cloudy: ['Está nublado', 'Não está nublado', 'Está nublado?'] },
      vi: { cold: ['Trời lạnh', 'Trời không lạnh', 'Trời lạnh không?'], warm: ['Trời ấm', 'Trời không ấm', 'Trời ấm không?'], sunny: ['Trời nắng', 'Trời không nắng', 'Trời có nắng không?'], rainy: ['Trời mưa', 'Trời không mưa', 'Trời mưa không?'], windy: ['Trời có gió', 'Trời không có gió', 'Trời có gió không?'], cloudy: ['Trời nhiều mây', 'Trời không nhiều mây', 'Trời nhiều mây không?'] },
      id: { cold: ['Cuacanya dingin', 'Cuacanya tidak dingin', 'Apakah cuacanya dingin?'], warm: ['Cuacanya hangat', 'Cuacanya tidak hangat', 'Apakah cuacanya hangat?'], sunny: ['Cuacanya cerah', 'Cuacanya tidak cerah', 'Apakah cuacanya cerah?'], rainy: ['Sedang hujan', 'Tidak hujan', 'Apakah sedang hujan?'], windy: ['Cuacanya berangin', 'Cuacanya tidak berangin', 'Apakah cuacanya berangin?'], cloudy: ['Cuacanya mendung', 'Cuacanya tidak mendung', 'Apakah cuacanya mendung?'] },
      tr: { cold: ['Hava soğuk', 'Hava soğuk değil', 'Hava soğuk mu?'], warm: ['Hava sıcak', 'Hava sıcak değil', 'Hava sıcak mı?'], sunny: ['Hava güneşli', 'Hava güneşli değil', 'Hava güneşli mi?'], rainy: ['Hava yağmurlu', 'Hava yağmurlu değil', 'Hava yağmurlu mu?'], windy: ['Hava rüzgârlı', 'Hava rüzgârlı değil', 'Hava rüzgârlı mı?'], cloudy: ['Hava bulutlu', 'Hava bulutlu değil', 'Hava bulutlu mu?'] },
      pl: { cold: ['Jest zimno', 'Nie jest zimno', 'Czy jest zimno?'], warm: ['Jest ciepło', 'Nie jest ciepło', 'Czy jest ciepło?'], sunny: ['Jest słonecznie', 'Nie jest słonecznie', 'Czy jest słonecznie?'], rainy: ['Pada deszcz', 'Nie pada deszcz', 'Czy pada deszcz?'], windy: ['Jest wietrznie', 'Nie jest wietrznie', 'Czy jest wietrznie?'], cloudy: ['Jest pochmurno', 'Nie jest pochmurno', 'Czy jest pochmurno?'] },
    };
    const forms = weather[locale][adjective];
    if (forms) return `${forms[question ? 2 : negative ? 1 : 0]}${forms[question ? 2 : negative ? 1 : 0].endsWith('?') ? '' : '.'}`;
  }
  if (locale === 'ru') {
    if (subject === 'It') {
      const weather = adjective === 'rainy' ? (negative ? 'Дождя нет' : 'Идёт дождь') : adjective === 'cold' ? 'Холодно' : adjective === 'warm' ? 'Тепло' : adjective === 'sunny' ? 'Солнечно' : adjective === 'windy' ? 'Ветрено' : adjective === 'cloudy' ? 'Облачно' : `Это ${value}`;
      const spokenWeather = negative && adjective !== 'rainy' ? weather.replace(/^./u, (letter) => letter.toLocaleLowerCase('ru')) : weather;
      return `${negative && adjective !== 'rainy' ? 'Не ' : ''}${spokenWeather}${question ? '?' : '.'}`;
    }
    if ((subject === 'He' || subject === 'She') && (adjective === 'cold' || adjective === 'warm')) {
      const dative = subject === 'He' ? 'Ему' : 'Ей';
      return `${dative} ${negative ? 'не ' : ''}${adjective === 'cold' ? 'холодно' : 'тепло'}${question ? '?' : '.'}`;
    }
    const person = subject === 'She' ? 'Она' : subject === 'He' ? 'Он' : subject === 'My mother' ? 'Моя мама' : subject === 'My father' ? 'Мой папа' : subject === 'My sister' ? 'Моя сестра' : 'Мой брат';
    const feminine: Record<string, string> = { готов: 'готова', устал: 'устала', спокоен: 'спокойна', счастлив: 'счастлива', занят: 'занята', холоден: 'холодна' };
    const spoken = female ? (feminine[value] ?? value) : value;
    return `${person} ${negative ? 'не ' : ''}${spoken}${question ? '?' : '.'}`;
  }
  if (locale === 'uk') {
    if (subject === 'It') {
      const weather = adjective === 'rainy' ? (negative ? 'Дощу немає' : 'Іде дощ') : adjective === 'cold' ? 'Холодно' : adjective === 'warm' ? 'Тепло' : adjective === 'sunny' ? 'Сонячно' : adjective === 'windy' ? 'Вітряно' : adjective === 'cloudy' ? 'Хмарно' : `Це ${value}`;
      const spokenWeather = negative && adjective !== 'rainy' ? weather.replace(/^./u, (letter) => letter.toLocaleLowerCase('uk')) : weather;
      return `${negative && adjective !== 'rainy' ? 'Не ' : ''}${spokenWeather}${question ? '?' : '.'}`;
    }
    if ((subject === 'He' || subject === 'She') && (adjective === 'cold' || adjective === 'warm')) {
      const dative = subject === 'He' ? 'Йому' : 'Їй';
      return `${dative} ${negative ? 'не ' : ''}${adjective === 'cold' ? 'холодно' : 'тепло'}${question ? '?' : '.'}`;
    }
    const person = subject === 'She' ? 'Вона' : subject === 'He' ? 'Він' : subject === 'My mother' ? 'Моя мама' : subject === 'My father' ? 'Мій тато' : subject === 'My sister' ? 'Моя сестра' : 'Мій брат';
    const feminine: Record<string, string> = { готовий: 'готова', втомлений: 'втомлена', спокійний: 'спокійна', щасливий: 'щаслива', зайнятий: 'зайнята' };
    const spoken = female ? (feminine[value] ?? value) : value;
    return `${person} ${negative ? 'не ' : ''}${spoken}${question ? '?' : '.'}`;
  }
  if (locale === 'es') {
    const p = subject === 'She' ? 'Ella' : subject === 'He' ? 'Él' : subject === 'It' ? 'El tiempo' : ({ 'My mother': 'Mi madre', 'My father': 'Mi padre', 'My sister': 'Mi hermana', 'My brother': 'Mi hermano' }[subject] ?? 'Mi madre');
    if (subject === 'It' && (adjective === 'cold' || adjective === 'warm')) return `${negative ? 'No ' : ''}Hace ${adjective === 'cold' ? 'frío' : 'calor'}${question ? '?' : '.'}`;
    if ((subject === 'He' || subject === 'She') && (adjective === 'cold' || adjective === 'warm')) return `${p} ${negative ? 'no ' : ''}tiene ${adjective === 'cold' ? 'frío' : 'calor'}${question ? '?' : '.'}`;
    const feminine: Record<string, string> = { listo: 'lista', cansado: 'cansada', tranquilo: 'tranquila', ocupado: 'ocupada', frío: 'fría' };
    const spoken = female ? (feminine[value] ?? value) : value;
    return `${question ? '¿' : ''}${p} ${negative ? 'no ' : ''}está ${spoken}${question ? '?' : '.'}`;
  }
  if (locale === 'pt-BR') {
    const p = subject === 'She' ? 'Ela' : subject === 'He' ? 'Ele' : subject === 'It' ? 'O tempo' : ({ 'My mother': 'Minha mãe', 'My father': 'Meu pai', 'My sister': 'Minha irmã', 'My brother': 'Meu irmão' }[subject] ?? 'Minha mãe');
    if (subject === 'It' && (adjective === 'cold' || adjective === 'warm')) return `${negative ? 'Não ' : ''}Está ${adjective === 'cold' ? 'frio' : 'quente'}${question ? '?' : '.'}`;
    if ((subject === 'He' || subject === 'She') && (adjective === 'cold' || adjective === 'warm')) return `${p} ${negative ? 'não ' : ''}está com ${adjective === 'cold' ? 'frio' : 'calor'}${question ? '?' : '.'}`;
    const feminine: Record<string, string> = { pronto: 'pronta', cansado: 'cansada', calmo: 'calma', ocupado: 'ocupada', frio: 'fria' };
    const spoken = female ? (feminine[value] ?? value) : value;
    return `${p} ${negative ? 'não ' : ''}está ${spoken}${question ? '?' : '.'}`;
  }
  if (locale === 'vi') { const p = subject === 'She' ? 'Cô ấy' : subject === 'He' ? 'Anh ấy' : subject === 'It' ? 'Trời' : ({ 'My mother': 'Mẹ tôi', 'My father': 'Bố tôi', 'My sister': 'Chị tôi', 'My brother': 'Anh tôi' }[subject] ?? 'Mẹ tôi'); return subject === 'It' && adjective === 'cold' ? 'Trời lạnh.' : question ? `${p} ${value} phải không?` : negative ? `${p} không ${value}.` : `${p} ${value}.`; }
  if (locale === 'id') { const p = subject === 'It' ? 'Cuacanya' : ({ 'My mother': 'Ibu saya', 'My father': 'Ayah saya', 'My sister': 'Saudari saya', 'My brother': 'Saudara laki-laki saya' }[subject] ?? 'Dia'); return subject === 'It' && adjective === 'cold' ? 'Cuacanya dingin.' : question ? `Apakah ${p.toLowerCase()} ${value}?` : negative ? `${p} tidak ${value}.` : `${p} ${value}.`; }
  if (locale === 'tr') { const p = subject === 'It' ? 'Hava' : ({ 'My mother': 'Annem', 'My father': 'Babam', 'My sister': 'Kız kardeşim', 'My brother': 'Erkek kardeşim' }[subject] ?? 'O'); return subject === 'It' && adjective === 'cold' ? 'Hava soğuk.' : question ? `${p} ${value} ${turkishQuestionParticle(value)}?` : negative ? `${p} ${value} değil.` : `${p} ${value}.`; }
  const p = subject === 'She' ? 'Ona' : subject === 'He' ? 'On' : subject === 'It' ? 'Jest' : ({ 'My mother': 'Moja mama', 'My father': 'Mój tata', 'My sister': 'Moja siostra', 'My brother': 'Mój brat' }[subject] ?? 'Moja mama');
  if (subject === 'It') {
    const weather = adjective === 'rainy' ? 'deszczowo' : value;
    return `${question ? 'Czy jest ' : negative ? 'Nie jest ' : 'Jest '}${weather}${question ? '?' : '.'}`;
  }
  const feminine: Record<string, string> = { gotowy: 'gotowa', zmęczony: 'zmęczona', spokojny: 'spokojna', szczęśliwy: 'szczęśliwa', zajęty: 'zajęta' };
  const spoken = female ? (feminine[value] ?? value) : value;
  return question ? `Czy ${p.toLowerCase()} jest ${spoken}?` : `${p} ${negative ? 'nie ' : ''}jest ${spoken}.`;
}

function phrase(ordinal: number, position: number, english: string, features: readonly string[]): EpisodeSourcePhrase {
  const details = localizedDetails(english);
  return { id: `e01-s${String(ordinal).padStart(2, '0')}-${String(position + 1).padStart(2, '0')}`, english, russian: details.ru.meaning, explanation: details.ru.explanation, words: tokenise(english).map((correct) => ({ correct, category: wordCategory(correct), distractors: wordAlternatives(correct).map((value) => ({ value, reasonCode: 'wrong_token', why: localizedReason('ru', correct, value) })) })), localizedDetails: details, features };
}

function runs(body: LocalizedSource, target: string): LocalizedIntroRunsSource {
  return Object.fromEntries(LOCALES.map((locale) => {
    const text = body[locale] ?? ''; const at = text.indexOf(target);
    return [locale, at < 0 ? [{ text, semantic: 'explanation' as const }] : [{ text: text.slice(0, at), semantic: 'explanation' as const }, { text: target, semantic: 'targetCorrect' as const }, { text: text.slice(at + target.length), semantic: 'explanation' as const }]];
  })) as unknown as LocalizedIntroRunsSource;
}

const PHRASES: Record<number, readonly string[]> = {
  17: ['He is ready.', 'She is ready.', 'He is tired.', 'She is tired.', 'He is here.', 'She is here.', 'He is calm.', 'She is calm.', 'He is happy.', 'She is happy.', 'He is busy.', 'She is busy.', 'He is cold.', 'She is warm.', 'She is okay.'],
  18: ['He is not ready.', 'She is not ready.', 'He is not tired.', 'She is not tired.', 'He is not here.', 'She is not here.', 'He is not calm.', 'She is not calm.', 'He is not happy.', 'She is not happy.', 'He is not busy.', 'She is not busy.', 'He is not cold.', 'She is not warm.', 'She is not okay.'],
  19: ['Is he ready?', 'Is she ready?', 'Is he tired?', 'Is she tired?', 'Is he here?', 'Is she here?', 'Is he calm?', 'Is she calm?', 'Is he happy?', 'Is she happy?', 'Is he busy?', 'Is she busy?', 'Is he cold?', 'Is she warm?', 'Is she okay?'],
  20: ['It is cold.', 'It is warm.', 'It is sunny.', 'It is rainy.', 'It is windy.', 'It is cloudy.', 'It is a book.', 'It is a bag.', 'It is a cup.', 'It is a pen.', 'It is here.', 'It is not cold.', 'It is not warm.', 'It is a phone.', 'It is a key.'],
  21: ["He’s ready.", "She’s ready.", "It’s cold.", "He’s tired.", "She’s happy.", "It’s warm.", "He’s here.", "She’s here.", "It’s sunny.", "He’s not busy.", "She’s not tired.", "It’s not rainy.", "He’s calm.", "She’s okay.", "It’s a book."],
  22: ['My mother is here.', 'My father is here.', 'My sister is ready.', 'My brother is ready.', 'My mother is calm.', 'My father is tired.', 'My sister is happy.', 'My brother is busy.', 'My mother is not here.', 'My father is not ready.', 'My sister is not tired.', 'My brother is not calm.', 'My mother is okay.', 'My father is warm.', 'My sister is cold.'],
  23: ['He is ready.', 'She is not ready.', 'Is he tired?', 'Is she here?', 'It is cold.', "It’s warm.", 'My mother is here.', 'My father is tired.', 'He is calm.', 'She is happy.', 'Is he busy?', 'It is sunny.', "She’s okay.", 'My brother is ready.', 'Is she cold?'],
  24: ['He is ready.', 'She is not tired.', 'Is he here?', 'Is she calm?', 'It is cold.', 'It is a book.', "He’s busy.", "She’s happy.", 'My mother is here.', 'My father is not ready.', 'My sister is warm.', 'My brother is cold.', 'Is it sunny?', 'It is not rainy.', "It’s a key."],
};

const FEATURES: Record<number, readonly string[]> = { 17: ['copula_be', 'third_person_pronoun', 'third_person_singular'], 18: ['copula_be', 'third_person_pronoun', 'third_person_singular', 'negation_not'], 19: ['copula_be', 'third_person_pronoun', 'third_person_singular', 'question_inversion'], 20: ['copula_be', 'impersonal_it', 'weather_adjective'], 21: ['copula_be', 'third_person_pronoun', 'impersonal_it', 'contraction_thirdperson', 'negation_not'], 22: ['copula_be', 'third_person_pronoun', 'family_noun', 'possessive_my', 'negation_not'], 23: ['copula_be', 'third_person_pronoun', 'impersonal_it', 'contraction_thirdperson', 'family_noun', 'possessive_my', 'spoken_production'], 24: ['copula_be', 'third_person_pronoun', 'impersonal_it', 'contraction_thirdperson', 'family_noun', 'possessive_my', 'question_inversion', 'negation_not'] };

const TITLES: Record<Locale, readonly string[]> = {
  ru: ['Он и она: связка is', 'Он и она: отрицание', 'Вопросы с is', 'It: вещи и погода', 'Короткие формы с ’s', 'Моя семья рядом', 'Говорим о людях и вещах', 'Всё вместе: he, she, it'],
  uk: ['Він і вона: зв’язка is', 'Він і вона: заперечення', 'Запитання з is', 'It: речі й погода', 'Короткі форми з ’s', 'Моя родина', 'Говоримо про людей і речі', 'Усе разом: he, she, it'],
  es: ['He y she con is', 'Negar con he y she', 'Preguntas con is', 'It: cosas y tiempo', 'Formas breves con ’s', 'Mi familia', 'Hablar de personas y cosas', 'Todo junto: he, she, it'],
  'pt-BR': ['He e she com is', 'Negação com he e she', 'Perguntas com is', 'It: coisas e clima', 'Formas curtas com ’s', 'Minha família', 'Falando de pessoas e coisas', 'Tudo junto: he, she, it'],
  vi: ['He và she đi với is', 'Phủ định với he và she', 'Câu hỏi với is', 'It: đồ vật và thời tiết', 'Dạng ngắn với ’s', 'Gia đình của tôi', 'Nói về người và vật', 'Kết hợp he, she, it'],
  id: ['He dan she memakai is', 'Penyangkalan dengan he dan she', 'Pertanyaan dengan is', 'It: benda dan cuaca', 'Bentuk singkat dengan ’s', 'Keluarga saya', 'Berbicara tentang orang dan benda', 'Gabungan he, she, it'],
  tr: ['He ve she ile is', 'He ve she ile olumsuzluk', 'Is ile sorular', 'It: nesneler ve hava', '’s ile kısa biçimler', 'Benim ailem', 'Kişiler ve nesneler hakkında konuşmak', 'He, she, it bir arada'],
  pl: ['He i she z is', 'Przeczenie z he i she', 'Pytania z is', 'It: rzeczy i pogoda', 'Krótkie formy z ’s', 'Moja rodzina', 'Mówimy o osobach i rzeczach', 'Razem: he, she, it'],
};

const TOPICS: Record<Locale, readonly string[]> = {
  ru: ['Когда речь об одном мужчине или одной женщине, he и she требуют связку is.', 'Чтобы отрицать состояние he или she, not ставят сразу после is.', 'В вопросе is выходит перед he или she, поэтому намерение слышно с первого слова.', 'It называет одну вещь, а в погоде позволяет описать обстановку без человека.', 'He’s, she’s и it’s сжимают местоимение и is, но не меняют смысл.', 'Сочетания my mother, my father, my sister и my brother называют конкретного близкого человека.', 'Чёткое произношение связки, отрицания и вопросительного порядка сохраняет смысл всей фразы.', 'Утверждение, отрицание, вопрос и сокращение различаются по форме и порядку слов.'],
  uk: ['Коли йдеться про одного чоловіка або одну жінку, he та she вимагають зв’язку is.', 'Щоб заперечити стан he або she, not ставлять одразу після is.', 'У запитанні is виходить перед he або she, тому намір чути з першого слова.', 'It називає одну річ, а в погоді дає описати обстановку без людини.', 'He’s, she’s та it’s стискають займенник і is, але не змінюють зміст.', 'Сполуки my mother, my father, my sister та my brother називають конкретну близьку людину.', 'Чітка вимова зв’язки, заперечення й питального порядку зберігає зміст усього вислову.', 'Твердження, заперечення, запитання й скорочення різняться формою та порядком слів.'],
  es: ['Cuando hablas de un hombre o una mujer, he y she necesitan la unión is.', 'Para negar un estado con he o she, not se coloca justo después de is.', 'En una pregunta, is pasa delante de he o she y la intención se oye desde la primera palabra.', 'It nombra una cosa y también permite describir el tiempo sin inventar una persona.', 'He’s, she’s e it’s juntan el pronombre con is sin cambiar el significado.', 'My mother, my father, my sister y my brother señalan a una persona concreta de la familia.', 'Pronunciar con claridad la cópula, la negación y el orden interrogativo conserva el sentido completo.', 'Afirmación, negación, pregunta y contracción se distinguen por su forma y su orden.'],
  'pt-BR': ['Quando você fala de um homem ou de uma mulher, he e she precisam da ligação is.', 'Para negar um estado com he ou she, not vem logo depois de is.', 'Numa pergunta, is passa para antes de he ou she e a intenção aparece na primeira palavra.', 'It nomeia uma coisa e também descreve o clima sem inventar uma pessoa.', 'He’s, she’s e it’s juntam o pronome a is sem mudar o sentido.', 'My mother, my father, my sister e my brother apontam uma pessoa específica da família.', 'Pronunciar com clareza a cópula, a negação e a ordem da pergunta preserva o sentido completo.', 'Afirmação, negação, pergunta e contração se distinguem pela forma e pela ordem.'],
  vi: ['Khi nói về một người nam hoặc nữ, he và she cần từ nối is.', 'Để phủ định trạng thái của he hoặc she, not đứng ngay sau is.', 'Trong câu hỏi, is đứng trước he hoặc she nên ý hỏi xuất hiện từ đầu.', 'It gọi tên một đồ vật và cũng giúp mô tả thời tiết mà không cần một người cụ thể.', 'He’s, she’s và it’s ghép đại từ với is nhưng không đổi nghĩa.', 'My mother, my father, my sister và my brother chỉ một người thân cụ thể.', 'Phát âm rõ từ nối, phủ định và trật tự câu hỏi giúp giữ nguyên nghĩa của cả câu.', 'Khẳng định, phủ định, câu hỏi và dạng rút gọn khác nhau ở hình thức và trật tự.'],
  id: ['Saat membicarakan seorang laki-laki atau perempuan, he dan she memerlukan is.', 'Untuk menyangkal keadaan he atau she, not diletakkan tepat setelah is.', 'Dalam pertanyaan, is berpindah ke depan he atau she sehingga maksudnya langsung terdengar.', 'It menamai satu benda dan juga menggambarkan cuaca tanpa membuat tokoh baru.', 'He’s, she’s, dan it’s menyatukan kata ganti dengan is tanpa mengubah arti.', 'My mother, my father, my sister, dan my brother menunjuk anggota keluarga tertentu.', 'Pengucapan penghubung, penyangkalan, dan urutan pertanyaan yang jelas menjaga arti seluruh kalimat.', 'Pernyataan, penyangkalan, pertanyaan, dan bentuk singkat berbeda dalam bentuk serta urutan.'],
  tr: ['Bir erkek ya da kadından söz ederken he ve she, is bağlayıcısını ister.', 'He ya da she ile durumu olumsuz yapmak için not doğrudan is sonrasına gelir.', 'Soruda is, he ya da she önüne geçer; soru niyeti ilk sözcükte duyulur.', 'It bir nesneyi adlandırır ve hava durumunu kişisiz anlatmaya da yarar.', 'He’s, she’s ve it’s zamirle is biçimini birleştirir, anlamı değiştirmez.', 'My mother, my father, my sister ve my brother belirli bir aile üyesini gösterir.', 'Bağlayıcıyı, olumsuzluğu ve soru sırasını açık söylemek bütün cümlenin anlamını korur.', 'Bildirim, olumsuzluk, soru ve kısa biçim biçim ve sıra bakımından ayrılır.'],
  pl: ['Gdy mówisz o jednym mężczyźnie albo kobiecie, he i she wymagają łącznika is.', 'Aby zaprzeczyć stanowi z he albo she, not stawia się bezpośrednio po is.', 'W pytaniu is przechodzi przed he albo she, więc zamiar słychać od pierwszego słowa.', 'It nazywa jedną rzecz, a przy pogodzie pozwala opisać sytuację bez osoby.', 'He’s, she’s i it’s łączą zaimek z is, ale nie zmieniają znaczenia.', 'My mother, my father, my sister i my brother wskazują konkretną osobę z rodziny.', 'Wyraźna wymowa łącznika, przeczenia i szyku pytania zachowuje sens całego zdania.', 'Twierdzenie, przeczenie, pytanie i skrót różnią się formą oraz szykiem.'],
};

const SESSION_RULES: Record<17 | 18 | 19 | 20 | 21 | 22 | 23 | 24, { readonly formula: string }> = {
  17: { formula: 'he/she + is + description' }, 18: { formula: 'he/she + is + not + description' }, 19: { formula: 'Is + he/she + description?' }, 20: { formula: 'It + is + weather/place, or It + is + a + noun' }, 21: { formula: 'he/she/it + ’s + description' }, 22: { formula: 'my + family noun + is + description' }, 23: { formula: 'he/she/it or my + family noun + is/’s + description' }, 24: { formula: 'statement: subject + is; negative: subject + is + not; question: Is + subject' },
};

function pageRule(locale: Locale, ordinal: 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24, index: number): string {
  const rule = SESSION_RULES[ordinal];
  const trapLead: Record<Locale, readonly string[]> = {
    ru: ['Не пропускайте is между местоимением и описанием.', 'Не отделяйте not от is.', 'Вопрос не оставляет порядок утверждения.', 'Не смешивайте погоду, предмет и место.', 'Короткая форма не меняет смысл.', 'Семейное слово остаётся единственным числом.', 'При произнесении не теряйте форму и порядок.', 'Сначала выберите тип сообщения, затем его порядок.'],
    uk: ['Не пропускайте is між займенником і описом.', 'Не відділяйте not від is.', 'Питання не зберігає порядок твердження.', 'Не змішуйте погоду, предмет і місце.', 'Коротка форма не змінює зміст.', 'Слово про родину лишається в однині.', 'У вимові не втрачайте форму й порядок.', 'Спершу виберіть тип повідомлення, потім його порядок.'],
    es: ['No omitas is entre el pronombre y la descripción.', 'No separes not de is.', 'Una pregunta no conserva el orden de una afirmación.', 'No mezcles tiempo, objeto y lugar.', 'La forma breve no cambia el sentido.', 'El familiar sigue siendo singular.', 'Al hablar, no pierdas la forma ni el orden.', 'Elige primero el tipo de mensaje y luego su orden.'],
    'pt-BR': ['Não omita is entre o pronome e a descrição.', 'Não separe not de is.', 'Pergunta não conserva a ordem da afirmação.', 'Não misture clima, objeto e lugar.', 'A forma curta não muda o sentido.', 'O familiar continua no singular.', 'Ao falar, não perca a forma nem a ordem.', 'Escolha primeiro o tipo de mensagem e depois a ordem.'],
    vi: ['Đừng bỏ is giữa đại từ và phần miêu tả.', 'Đừng tách not khỏi is.', 'Câu hỏi không giữ trật tự câu khẳng định.', 'Đừng lẫn thời tiết, đồ vật và nơi chốn.', 'Dạng ngắn không đổi nghĩa.', 'Từ chỉ người thân vẫn ở số ít.', 'Khi nói, đừng làm mất hình thức hay trật tự.', 'Hãy chọn kiểu thông điệp rồi chọn trật tự.'],
    id: ['Jangan hilangkan is antara kata ganti dan keterangan.', 'Jangan pisahkan not dari is.', 'Pertanyaan tidak memakai urutan pernyataan.', 'Jangan campurkan cuaca, benda, dan tempat.', 'Bentuk singkat tidak mengubah arti.', 'Kata keluarga tetap tunggal.', 'Saat mengucapkan, jangan hilangkan bentuk atau urutan.', 'Pilih jenis pesan lalu urutannya.'],
    tr: ['Zamir ile açıklama arasındaki is biçimini atlamayın.', 'not sözcüğünü is biçiminden ayırmayın.', 'Soru, bildirim sırasını korumaz.', 'Hava, nesne ve yeri karıştırmayın.', 'Kısa biçim anlamı değiştirmez.', 'Aile sözcüğü tekil kalır.', 'Söylerken biçimi ve sırayı kaybetmeyin.', 'Önce ileti türünü, sonra sırasını seçin.'],
    pl: ['Nie pomijaj is między zaimkiem a opisem.', 'Nie oddzielaj not od is.', 'Pytanie nie zachowuje szyku twierdzenia.', 'Nie mieszaj pogody, rzeczy i miejsca.', 'Skrót nie zmienia sensu.', 'Nazwa członka rodziny pozostaje w liczbie pojedynczej.', 'W wymowie nie gub formy ani szyku.', 'Najpierw wybierz rodzaj komunikatu, potem jego szyk.'],
  };
  const pageCopy: Record<Locale, readonly [string, string, string]> = {
    ru: [
      'Смысл начинается с того, кого или что мы называем: местоимение, предмет, погода либо один член семьи задают точную ситуацию.',
      `Рабочий порядок здесь такой: ${rule.formula}. Каждая часть занимает своё место и делает высказывание законченным.`,
      `Проверяйте именно эту ошибку: ${trapLead.ru[ordinal - 17]} Из-за неё меняется форма или намерение всей фразы.`,
    ],
    uk: [
      'Зміст починається з того, кого або що ми називаємо: займенник, предмет, погода чи один член родини задають точну ситуацію.',
      `Робочий порядок тут такий: ${rule.formula}. Кожна частина має своє місце й робить вислів завершеним.`,
      `Перевіряйте саме цю помилку: ${trapLead.uk[ordinal - 17]} Через неї змінюється форма або намір усього вислову.`,
    ],
    es: [
      'El sentido empieza por identificar de quién o de qué se habla: un pronombre, una cosa, el tiempo o un familiar fijan la situación exacta.',
      `El orden operativo es ${rule.formula}. Cada pieza ocupa una posición concreta y completa el mensaje.`,
      `Vigila este error preciso: ${trapLead.es[ordinal - 17]} Cambia la forma o la intención de toda la frase.`,
    ],
    'pt-BR': [
      'O sentido começa ao identificar de quem ou do que se fala: pronome, objeto, clima ou familiar definem a situação exata.',
      `A ordem que funciona é ${rule.formula}. Cada parte ocupa uma posição definida e completa a mensagem.`,
      `Observe este erro específico: ${trapLead['pt-BR'][ordinal - 17]} Ele muda a forma ou a intenção da frase inteira.`,
    ],
    vi: [
      'Ý nghĩa bắt đầu từ việc xác định người hay vật được nói tới: đại từ, đồ vật, thời tiết hoặc một người thân tạo nên tình huống chính xác.',
      `Trật tự cần dùng là ${rule.formula}. Mỗi phần có vị trí riêng để tạo thành một thông điệp trọn vẹn. Mẫu này giúp người nghe nhận ra ngay đó là lời khẳng định, phủ định hay câu hỏi.`,
      `Hãy tránh đúng lỗi này: ${trapLead.vi[ordinal - 17]} Lỗi đó làm đổi hình thức hoặc mục đích của cả câu. Hãy đối chiếu từng vị trí với ý định thật trước khi nói.`,
    ],
    id: [
      'Makna dimulai dengan menentukan siapa atau apa yang dibicarakan: kata ganti, benda, cuaca, atau satu anggota keluarga membentuk situasi yang tepat.',
      `Urutan yang dipakai adalah ${rule.formula}. Setiap bagian memiliki tempat sendiri dan melengkapi pesannya.`,
      `Periksa kesalahan khusus ini: ${trapLead.id[ordinal - 17]} Kesalahan itu mengubah bentuk atau maksud seluruh kalimat.`,
    ],
    tr: [
      'Anlam, kimden ya da neden söz edildiğini belirlemekle başlar: zamir, nesne, hava veya tek bir aile üyesi kesin durumu kurar.',
      `İşleyen sıra şöyledir: ${rule.formula}. Her parça kendi yerinde durur ve iletiyi tamamlar. Bu kalıp, bildirimin mi, olumsuzluğun mu yoksa sorunun mu amaçlandığını hemen gösterir.`,
      `Özellikle şu hataya dikkat edin: ${trapLead.tr[ordinal - 17]} Bu hata bütün cümlenin biçimini ya da amacını değiştirir.`,
    ],
    pl: [
      'Sens zaczyna się od wskazania, o kim albo o czym mówimy: zaimek, rzecz, pogoda lub jedna osoba z rodziny określają dokładną sytuację.',
      `Właściwy szyk to ${rule.formula}. Każdy element ma swoje miejsce i tworzy pełny komunikat.`,
      `Pilnuj właśnie tego błędu: ${trapLead.pl[ordinal - 17]} Zmienia on formę albo intencję całego zdania.`,
    ],
  };
  return pageCopy[locale][index];
}

function introTail(locale: Locale, english: string): string {
  const meaning = translateMeaning(locale, english);
  const copy: Record<Locale, string> = {
    ru: `Например, «${english}» означает «${meaning}». Английские слова передают именно этот смысл, поэтому их порядок нельзя менять наугад.`,
    uk: `Наприклад, «${english}» означає «${meaning}». Англійські слова передають саме цей зміст, тому їхній порядок не можна змінювати навмання.`,
    es: `Por ejemplo, «${english}» significa «${meaning}». Las palabras inglesas expresan exactamente esa idea y no se reordenan al azar.`,
    'pt-BR': `Por exemplo, «${english}» significa «${meaning}». As palavras em inglês expressam exatamente essa ideia e não podem ser reordenadas ao acaso.`,
    vi: `Ví dụ, «${english}» có nghĩa là «${meaning}». Các từ tiếng Anh truyền đúng ý đó nên không thể đổi chỗ tùy ý.`,
    id: `Contohnya, «${english}» berarti «${meaning}». Kata-kata Inggris menyampaikan arti itu secara tepat sehingga urutannya tidak boleh diacak.`,
    tr: `Örneğin «${english}», «${meaning}» demektir. İngilizce sözcükler tam bu anlamı taşır; sıraları rastgele değiştirilemez.`,
    pl: `Na przykład „${english}” znaczy „${meaning}”. Angielskie słowa przekazują dokładnie ten sens, więc nie można dowolnie zmieniać ich szyku.`,
  };
  return copy[locale];
}

function answerExplanation(locale: Locale, english: string, formula: string): string {
  const meaning = translateMeaning(locale, english);
  const copy: Record<Locale, string> = {
    ru: `Верно: «${english}» означает «${meaning}». Здесь соблюдён каркас ${formula}; остальные варианты меняют связку, отрицание или порядок.`,
    uk: `Правильно: «${english}» означає «${meaning}». Тут збережено каркас ${formula}; інші варіанти змінюють зв’язку, заперечення або порядок.`,
    es: `Correcto: «${english}» significa «${meaning}». Respeta el patrón ${formula}; las demás opciones cambian la cópula, la negación o el orden.`,
    'pt-BR': `Certo: «${english}» significa «${meaning}». A forma segue ${formula}; as outras opções mudam a cópula, a negação ou a ordem.`,
    vi: `Đúng: «${english}» có nghĩa là «${meaning}». Câu giữ đúng mẫu ${formula}; các phương án khác làm đổi từ nối, phủ định hoặc trật tự.`,
    id: `Benar: «${english}» berarti «${meaning}». Kalimat mengikuti pola ${formula}; pilihan lain mengubah penghubung, penyangkalan, atau urutan.`,
    tr: `Doğru: «${english}», «${meaning}» demektir. Cümle ${formula} kalıbını korur; diğer seçenekler bağlayıcıyı, olumsuzluğu ya da sırayı değiştirir.`,
    pl: `Dobrze: „${english}” znaczy „${meaning}”. Zdanie zachowuje wzór ${formula}; pozostałe opcje zmieniają łącznik, przeczenie albo szyk.`,
  };
  return copy[locale];
}

const DEPTH: Record<Locale, readonly [string, string, string]> = {
  ru: ['Сначала назовите участника, затем дайте связку и только после неё описание. Так фраза сразу сообщает, о ком идёт речь и что именно с ним связано.', 'У этой конструкции устойчивый каркас: подлежащее + форма be + состояние, место или предмет. Смена одного элемента меняет смысл, но не разрешает выбрасывать связку.', 'Главная ловушка — копировать короткую фразу родного языка и оставлять he или she рядом с признаком без is. Английская речь такую пустоту не скрывает.'],
  uk: ['Спочатку назвіть учасника, потім дайте зв’язку й лише після неї опис. Так вислів одразу показує, про кого йдеться і що саме з ним пов’язано.', 'Конструкція має сталий каркас: підмет + форма be + стан, місце або предмет. Заміна одного елемента змінює зміст, але не дозволяє прибирати зв’язку.', 'Головна пастка — копіювати короткий вислів рідної мови й лишати he або she поруч з ознакою без is. Англійська таку прогалину не приховує.'],
  es: ['Nombra primero al participante, añade la unión y coloca después la descripción. Así se entiende de inmediato de quién hablas y qué información le atribuyes.', 'La estructura es estable: sujeto + forma de be + estado, lugar o cosa. Cambiar una pieza cambia el sentido, pero nunca permite borrar la cópula.', 'La trampa principal es copiar una frase corta de tu idioma y dejar he o she junto a la cualidad sin is. El inglés no oculta ese hueco.'],
  'pt-BR': ['Nomeie primeiro a pessoa, acrescente a ligação e só então diga a descrição. Assim fica claro de quem você fala e qual informação pertence a essa pessoa.', 'A estrutura é estável: sujeito + forma de be + estado, lugar ou coisa. Trocar uma peça muda o sentido, mas não permite apagar a cópula.', 'A principal armadilha é copiar uma frase curta do seu idioma e deixar he ou she junto da característica sem is. O inglês não esconde essa falta.'],
  vi: ['Hãy nêu người hoặc vật trước, thêm từ nối rồi mới đưa phần miêu tả. Nhờ vậy người nghe biết ngay bạn đang nói về ai và gắn thông tin gì với họ.', 'Khung câu ổn định: chủ ngữ + dạng be + trạng thái, nơi chốn hoặc đồ vật. Đổi một phần sẽ đổi nghĩa nhưng không cho phép bỏ từ nối.', 'Bẫy lớn nhất là chép câu ngắn của tiếng mẹ đẻ và đặt he hoặc she cạnh đặc điểm mà thiếu is. Tiếng Anh không che được khoảng trống đó.'],
  id: ['Sebutkan orang atau bendanya terlebih dahulu, tambahkan penghubung, lalu berikan keterangannya. Dengan begitu pendengar langsung tahu siapa yang dibicarakan dan informasi apa yang melekat padanya.', 'Kerangkanya tetap: subjek + bentuk be + keadaan, tempat, atau benda. Mengganti satu bagian mengubah arti, tetapi tidak membolehkan penghubung dihapus.', 'Jebakan utamanya adalah menyalin kalimat pendek bahasa sendiri dan menaruh he atau she di samping sifat tanpa is. Bahasa Inggris tidak menyembunyikan kekosongan itu.'],
  tr: ['Önce kişi ya da nesneyi söyleyin, bağlayıcıyı ekleyin ve açıklamayı sonuna getirin. Böylece kimin hakkında hangi bilginin verildiği hemen anlaşılır.', 'Kalıp sabittir: özne + be biçimi + durum, yer ya da nesne. Bir parçayı değiştirmek anlamı değiştirir, fakat bağlayıcıyı silmeye izin vermez.', 'Temel tuzak, ana dildeki kısa yapıyı kopyalayıp he ya da she ile özellik arasındaki is biçimini düşürmektir. İngilizce bu boşluğu gizlemez.'],
  pl: ['Najpierw nazwij osobę albo rzecz, dodaj łącznik, a dopiero potem opis. Dzięki temu od razu wiadomo, o kim mówisz i jaką informację z nim łączysz.', 'Szkielet jest stały: podmiot + forma be + stan, miejsce albo rzecz. Zmiana jednego elementu zmienia sens, lecz nie pozwala usunąć łącznika.', 'Główna pułapka to kopiowanie krótkiego zdania z własnego języka i zostawienie he albo she przy cesze bez is. Angielski nie ukryje tej luki.'],
};

const QUIZ_PROMPT: Record<Locale, (meaning: string) => string> = {
  ru: (meaning) => `Какая английская фраза значит «${meaning}»?`, uk: (meaning) => `Який англійський вислів означає «${meaning}»?`, es: (meaning) => `¿Qué frase inglesa significa «${meaning}»?`, 'pt-BR': (meaning) => `Qual frase em inglês significa «${meaning}»?`, vi: (meaning) => `Câu tiếng Anh nào có nghĩa là «${meaning}»?`, id: (meaning) => `Kalimat Inggris mana yang berarti «${meaning}»?`, tr: (meaning) => `Hangi İngilizce cümle «${meaning}» anlamına gelir?`, pl: (meaning) => `Które angielskie zdanie znaczy „${meaning}”?`,
};

export function buildEpisode01Session17To24(ordinal: 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24): SessionSource {
  const topicIndex = ordinal - 17;
  const bodies = ([0, 1, 2] as const).map((index) => Object.fromEntries(LOCALES.map((locale) => {
    const pageTarget = PHRASES[ordinal][index];
    return [locale, `${TOPICS[locale][topicIndex]} ${pageRule(locale, ordinal, index)} ${introTail(locale, pageTarget)}`];
  })) as unknown as LocalizedSource);
  const title = Object.fromEntries(LOCALES.map((locale) => [locale, TITLES[locale][topicIndex]])) as unknown as LocalizedSource;
  const pageLabels: Record<Locale, readonly string[]> = {
    ru: ['Кого описываем', 'Точный порядок', 'Где легко ошибиться'], uk: ['Кого описуємо', 'Точний порядок', 'Де легко помилитися'], es: ['A quién describimos', 'El orden exacto', 'Dónde es fácil fallar'], 'pt-BR': ['Quem descrevemos', 'A ordem exata', 'Onde é fácil errar'], vi: ['Ta đang nói về ai', 'Trật tự chính xác', 'Chỗ dễ sai'], id: ['Siapa yang dijelaskan', 'Urutan yang tepat', 'Bagian yang mudah keliru'], tr: ['Kimi anlatıyoruz', 'Kesin sıra', 'Kolay hata noktası'], pl: ['Kogo opisujemy', 'Dokładny szyk', 'Łatwa pułapka'],
  };
  const introPages = bodies.map((body, index) => {
    const pageTitle = Object.fromEntries(LOCALES.map((locale) => [locale, `${title[locale]}: ${pageLabels[locale][index]}`])) as unknown as LocalizedSource;
    const pageTarget = PHRASES[ordinal][index];
    const pageWrongOne = pageTarget.replace(/\bis\b/u, 'are').replace(/\bIs\b/u, 'Are').replace(/’s/u, ' are');
    const pageWrongTwo = pageTarget.includes(' not ') ? pageTarget.replace(' not ', ' ') : pageTarget.replace(/\bIs\b/u, 'Is not').replace(/\bis\b/u, 'is not').replace(/’s/u, ' is not');
    const explanation = Object.fromEntries(LOCALES.map((locale) => [locale, answerExplanation(locale, pageTarget, SESSION_RULES[ordinal].formula)])) as unknown as LocalizedSource;
    return { kind: (['concept', 'formula', 'trap'] as const)[index], title: pageTitle, body, bodyRuns: runs(body, pageTarget), question: { prompt: Object.fromEntries(LOCALES.map((locale) => [locale, QUIZ_PROMPT[locale](translateMeaning(locale, pageTarget))])) as unknown as LocalizedSource, choices: [L(() => pageTarget), L(() => pageWrongOne), L(() => pageWrongTwo)], correctChoiceIndex: 0 as const, explanation } };
  }) as unknown as SessionSource['introPages'];
  return { packageId: 'learning-v2-en-v1', targetLanguage: 'en', episodeOrdinal: 1, requiredSessionOrdinal: ordinal, canDoOutcomeId: 'obj-e01-third-person-is', generationInputFingerprint: `authored-e01-s${ordinal}-v1`, title, summary: L((copy) => copy.explanation), learningGoal: L((copy) => copy.formula), introPages, phrases: PHRASES[ordinal].map((english, index) => phrase(ordinal, index, english, FEATURES[ordinal])) };
}

export function assertEpisode01Session17To24Contract(source: SessionSource, ordinal: number, kind: SessionKind, teaches: readonly string[]): void {
  expect(source.requiredSessionOrdinal).toBe(ordinal); expect(source.phrases).toHaveLength(15); expect(source.introPages.map((page) => page.kind)).toEqual(['concept', 'formula', 'trap']); expect(kind).toBeTruthy();
  source.introPages.forEach((page) => LOCALES.forEach((locale) => { expect(page.title[locale]).toBeTruthy(); expect(page.body[locale]).toBeTruthy(); expect(page.bodyRuns?.[locale]?.map((run) => run.text).join('')).toBe(page.body[locale]); }));
  source.phrases.forEach((item) => { expect(item.words.length).toBeGreaterThan(0); item.words.forEach((word) => expect(new Set(word.distractors.map((entry) => entry.value)).size).toBe(5)); LOCALES.forEach((locale) => expect(item.localizedDetails?.[locale]).toBeDefined()); });
  teaches.forEach((feature) => expect(source.phrases.some((item) => item.features.includes(feature))).toBe(true));
}
