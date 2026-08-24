import type { EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';

export type Episode01WorldLocale = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

export const EPISODE_01_WORLD_LOCALES: readonly Episode01WorldLocale[] = [
  'ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl',
];

type Labels = {
  question: string; statement: string; near: string; far: string; owner: string;
  speaker: string; listener: string; male: string; female: string; groupUs: string;
  groupThem: string; thing: string; object: string; quality: string; place: string;
  age: string; years: string; and: string; but: string; too: string;
  clarification: Record<string, string>;
  words: Record<string, string>;
};

const LABELS: Record<Episode01WorldLocale, Labels> = {
  ru: { question: 'Вопрос', statement: 'Сообщение', near: 'предмет рядом', far: 'предмет дальше', owner: 'владелец', speaker: 'говорящий', listener: 'собеседник', male: 'он', female: 'она', groupUs: 'мы', groupThem: 'они', thing: 'это', object: 'предмет', quality: 'признак', place: 'место', age: 'возраст', years: 'лет', and: 'и одновременно', but: 'но в отличие от этого', too: 'тоже', clarification: { 'sorry': 'Извините, повторите?', 'pardon': 'Простите, повторите?', 'excuse me': 'Извините, можно уточнить?' }, words: { book: 'книга', bag: 'сумка', cup: 'чашка', key: 'ключ', red: 'красный цвет', blue: 'синий цвет', green: 'зелёный цвет', big: 'большой размер', small: 'маленький размер', here: 'здесь', home: 'дома', ready: 'готовность', happy: 'радость', kind: 'доброта', funny: 'весёлый характер', quiet: 'спокойствие', calm: 'спокойствие', busy: 'занятость', tired: 'усталость', fine: 'всё хорошо', okay: 'всё в порядке', cold: 'холод', warm: 'тепло', sunny: 'солнечно', rainy: 'дождливо', mother: 'мама', father: 'папа', sister: 'сестра', brother: 'брат', mine: 'говорящий', yours: 'собеседник', his: 'он', hers: 'она', my: 'говорящий', your: 'собеседник', her: 'она' } },
  uk: { question: 'Запитання', statement: 'Повідомлення', near: 'річ поруч', far: 'річ далі', owner: 'власник', speaker: 'мовець', listener: 'співрозмовник', male: 'він', female: 'вона', groupUs: 'ми', groupThem: 'вони', thing: 'це', object: 'річ', quality: 'ознака', place: 'місце', age: 'вік', years: 'років', and: 'і водночас', but: 'але на відміну від цього', too: 'також', clarification: { 'sorry': 'Вибачте, повторіть?', 'pardon': 'Перепрошую, повторіть?', 'excuse me': 'Вибачте, можна уточнити?' }, words: { book: 'книга', bag: 'сумка', cup: 'чашка', key: 'ключ', red: 'червоний колір', blue: 'синій колір', green: 'зелений колір', big: 'великий розмір', small: 'малий розмір', here: 'тут', home: 'вдома', ready: 'готовність', happy: 'радість', kind: 'доброта', funny: 'весела вдача', quiet: 'тиша', calm: 'спокій', busy: 'зайнятість', tired: 'втома', fine: 'усе добре', okay: 'усе гаразд', cold: 'холод', warm: 'тепло', sunny: 'сонячно', rainy: 'дощить', mother: 'мама', father: 'тато', sister: 'сестра', brother: 'брат', mine: 'мовець', yours: 'співрозмовник', his: 'він', hers: 'вона', my: 'мовець', your: 'співрозмовник', her: 'вона' } },
  es: { question: 'Pregunta', statement: 'Mensaje', near: 'objeto cercano', far: 'objeto más lejano', owner: 'propietario', speaker: 'quien habla', listener: 'la persona interlocutora', male: 'él', female: 'ella', groupUs: 'nosotros', groupThem: 'ellos', thing: 'eso', object: 'objeto', quality: 'característica', place: 'lugar', age: 'edad', years: 'años', and: 'y al mismo tiempo', but: 'pero, en contraste', too: 'también', clarification: { 'sorry': 'Perdona, ¿puedes repetir?', 'pardon': 'Perdón, ¿puedes repetir?', 'excuse me': 'Disculpa, ¿puedo aclararlo?' }, words: { book: 'libro', bag: 'bolso', cup: 'taza', key: 'llave', red: 'color rojo', blue: 'color azul', green: 'color verde', big: 'tamaño grande', small: 'tamaño pequeño', here: 'aquí', home: 'en casa', ready: 'preparación', happy: 'felicidad', kind: 'amabilidad', funny: 'carácter divertido', quiet: 'tranquilidad', calm: 'calma', busy: 'ocupación', tired: 'cansancio', fine: 'bien', okay: 'todo bien', cold: 'frío', warm: 'calor', sunny: 'tiempo soleado', rainy: 'lluvia', mother: 'madre', father: 'padre', sister: 'hermana', brother: 'hermano', mine: 'quien habla', yours: 'la persona interlocutora', his: 'él', hers: 'ella', my: 'quien habla', your: 'la persona interlocutora', her: 'ella' } },
  'pt-BR': { question: 'Pergunta', statement: 'Mensagem', near: 'objeto próximo', far: 'objeto mais distante', owner: 'dono', speaker: 'quem fala', listener: 'a pessoa ouvinte', male: 'ele', female: 'ela', groupUs: 'nós', groupThem: 'eles', thing: 'isso', object: 'objeto', quality: 'característica', place: 'lugar', age: 'idade', years: 'anos', and: 'e ao mesmo tempo', but: 'mas, em contraste', too: 'também', clarification: { 'sorry': 'Desculpe, pode repetir?', 'pardon': 'Perdão, pode repetir?', 'excuse me': 'Com licença, posso esclarecer?' }, words: { book: 'livro', bag: 'bolsa', cup: 'xícara', key: 'chave', red: 'cor vermelha', blue: 'cor azul', green: 'cor verde', big: 'tamanho grande', small: 'tamanho pequeno', here: 'aqui', home: 'em casa', ready: 'prontidão', happy: 'felicidade', kind: 'gentileza', funny: 'jeito divertido', quiet: 'tranquilidade', calm: 'calma', busy: 'ocupação', tired: 'cansaço', fine: 'bem', okay: 'tudo bem', cold: 'frio', warm: 'calor', sunny: 'tempo ensolarado', rainy: 'chuva', mother: 'mãe', father: 'pai', sister: 'irmã', brother: 'irmão', mine: 'quem fala', yours: 'a pessoa ouvinte', his: 'ele', hers: 'ela', my: 'quem fala', your: 'a pessoa ouvinte', her: 'ela' } },
  vi: { question: 'Câu hỏi', statement: 'Thông báo', near: 'đồ vật ở gần', far: 'đồ vật ở xa hơn', owner: 'chủ sở hữu', speaker: 'người nói', listener: 'người nghe', male: 'anh ấy', female: 'cô ấy', groupUs: 'chúng ta', groupThem: 'họ', thing: 'vật đó', object: 'đồ vật', quality: 'đặc điểm', place: 'nơi chốn', age: 'tuổi', years: 'tuổi', and: 'và đồng thời', but: 'nhưng trái lại', too: 'cũng vậy', clarification: { 'sorry': 'Xin lỗi, bạn nhắc lại được không?', 'pardon': 'Xin lỗi, bạn nói lại được không?', 'excuse me': 'Xin phép, tôi muốn hỏi lại.' }, words: { book: 'sách', bag: 'túi', cup: 'cốc', key: 'chìa khóa', red: 'màu đỏ', blue: 'màu xanh lam', green: 'màu xanh lá', big: 'kích thước lớn', small: 'kích thước nhỏ', here: 'ở đây', home: 'ở nhà', ready: 'sẵn sàng', happy: 'vui', kind: 'tử tế', funny: 'vui tính', quiet: 'yên lặng', calm: 'bình tĩnh', busy: 'bận', tired: 'mệt', fine: 'ổn', okay: 'ổn', cold: 'lạnh', warm: 'ấm', sunny: 'trời nắng', rainy: 'trời mưa', mother: 'mẹ', father: 'bố', sister: 'chị hoặc em gái', brother: 'anh hoặc em trai', mine: 'người nói', yours: 'người nghe', his: 'anh ấy', hers: 'cô ấy', my: 'người nói', your: 'người nghe', her: 'cô ấy' } },
  id: { question: 'Pertanyaan', statement: 'Pesan', near: 'benda dekat', far: 'benda lebih jauh', owner: 'pemilik', speaker: 'penutur', listener: 'lawan bicara', male: 'dia laki-laki', female: 'dia perempuan', groupUs: 'kami', groupThem: 'mereka', thing: 'benda itu', object: 'benda', quality: 'sifat', place: 'tempat', age: 'usia', years: 'tahun', and: 'dan pada saat yang sama', but: 'tetapi, sebagai perbandingan', too: 'juga', clarification: { 'sorry': 'Maaf, bisa diulangi?', 'pardon': 'Maaf, boleh diulangi?', 'excuse me': 'Permisi, boleh saya memastikan?' }, words: { book: 'buku', bag: 'tas', cup: 'cangkir', key: 'kunci', red: 'warna merah', blue: 'warna biru', green: 'warna hijau', big: 'ukuran besar', small: 'ukuran kecil', here: 'di sini', home: 'di rumah', ready: 'siap', happy: 'senang', kind: 'baik hati', funny: 'lucu', quiet: 'tenang', calm: 'tenang', busy: 'sibuk', tired: 'lelah', fine: 'baik', okay: 'baik-baik saja', cold: 'dingin', warm: 'hangat', sunny: 'cerah', rainy: 'hujan', mother: 'ibu', father: 'ayah', sister: 'saudari', brother: 'saudara laki-laki', mine: 'penutur', yours: 'lawan bicara', his: 'dia laki-laki', hers: 'dia perempuan', my: 'penutur', your: 'lawan bicara', her: 'dia perempuan' } },
  tr: { question: 'Soru', statement: 'Bildirim', near: 'yakındaki nesne', far: 'daha uzaktaki nesne', owner: 'sahip', speaker: 'konuşan', listener: 'dinleyen', male: 'o erkek', female: 'o kadın', groupUs: 'biz', groupThem: 'onlar', thing: 'o şey', object: 'nesne', quality: 'özellik', place: 'yer', age: 'yaş', years: 'yaşında', and: 've aynı zamanda', but: 'ama buna karşılık', too: 'de', clarification: { 'sorry': 'Pardon, tekrar eder misiniz?', 'pardon': 'Affedersiniz, tekrar eder misiniz?', 'excuse me': 'Affedersiniz, netleştirebilir miyiz?' }, words: { book: 'kitap', bag: 'çanta', cup: 'fincan', key: 'anahtar', red: 'kırmızı renk', blue: 'mavi renk', green: 'yeşil renk', big: 'büyük boyut', small: 'küçük boyut', here: 'burada', home: 'evde', ready: 'hazır olma', happy: 'mutluluk', kind: 'kibarlık', funny: 'komik olma', quiet: 'sessizlik', calm: 'sakinlik', busy: 'meşguliyet', tired: 'yorgunluk', fine: 'iyi', okay: 'iyi', cold: 'soğuk', warm: 'sıcak', sunny: 'güneşli hava', rainy: 'yağmur', mother: 'anne', father: 'baba', sister: 'kız kardeş', brother: 'erkek kardeş', mine: 'konuşan', yours: 'dinleyen', his: 'o erkek', hers: 'o kadın', my: 'konuşan', your: 'dinleyen', her: 'o kadın' } },
  pl: { question: 'Pytanie', statement: 'Komunikat', near: 'przedmiot blisko', far: 'przedmiot dalej', owner: 'właściciel', speaker: 'osoba mówiąca', listener: 'rozmówca', male: 'on', female: 'ona', groupUs: 'my', groupThem: 'oni', thing: 'to', object: 'przedmiot', quality: 'cecha', place: 'miejsce', age: 'wiek', years: 'lat', and: 'i jednocześnie', but: 'ale dla kontrastu', too: 'również', clarification: { 'sorry': 'Przepraszam, możesz powtórzyć?', 'pardon': 'Słucham, możesz powtórzyć?', 'excuse me': 'Przepraszam, mogę dopytać?' }, words: { book: 'książka', bag: 'torba', cup: 'filiżanka', key: 'klucz', red: 'czerwony kolor', blue: 'niebieski kolor', green: 'zielony kolor', big: 'duży rozmiar', small: 'mały rozmiar', here: 'tutaj', home: 'w domu', ready: 'gotowość', happy: 'radość', kind: 'życzliwość', funny: 'wesoły charakter', quiet: 'spokój', calm: 'spokój', busy: 'zajęcie', tired: 'zmęczenie', fine: 'dobrze', okay: 'w porządku', cold: 'zimno', warm: 'ciepło', sunny: 'słonecznie', rainy: 'deszczowo', mother: 'mama', father: 'tata', sister: 'siostra', brother: 'brat', mine: 'osoba mówiąca', yours: 'rozmówca', his: 'on', hers: 'ona', my: 'osoba mówiąca', your: 'rozmówca', her: 'ona' } },
};

const NUMBERS: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20' };

function subjectLabel(labels: Labels, value: string): string {
  return ({ i: labels.speaker, you: labels.listener, he: labels.male, she: labels.female, we: labels.groupUs, they: labels.groupThem, it: labels.thing } as Record<string, string>)[value] ?? value;
}

function semanticParts(locale: Episode01WorldLocale, english: string): string[] {
  const labels = LABELS[locale];
  const clean = english.replace(/[?.!]/gu, '').replace(/[’']/gu, "'").trim();
  const lower = clean.toLocaleLowerCase('en');
  const fixed = labels.clarification[lower];
  if (fixed) return [fixed];
  const parts: string[] = [];
  const isQuestion = /^(?:is|are|am|how old|whose)\b/iu.test(lower);
  parts.push(isQuestion ? labels.question : labels.statement);
  if (/\bthis\b/iu.test(lower)) parts.push(labels.near);
  if (/\bthat\b/iu.test(lower)) parts.push(labels.far);
  if (/^whose\b/iu.test(lower)) parts.push(`${labels.owner}: ?`);
  const subject = lower.match(/^(?:is |are |am )?(i|you|he|she|it|we|they)\b/u)?.[1];
  if (subject) parts.push(subjectLabel(labels, subject));
  const owner = lower.match(/\b(my|your|his|her|mine|yours|hers)\b/u)?.[1];
  if (owner) parts.push(`${labels.owner}: ${labels.words[owner]}`);
  const family = lower.match(/\b(mother|father|sister|brother)'s\b/u)?.[1];
  if (family) parts.push(`${labels.owner}: ${labels.words[family]}`);
  const number = lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/u)?.[1];
  const age = lower.match(/\b(ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty) years old\b/u)?.[1];
  if (age) parts.push(`${labels.age}: ${NUMBERS[age]} ${labels.years}`);
  else if (number) parts.push(`× ${NUMBERS[number]}`);
  const noun = lower.match(/\b(book|books|bag|bags|cup|cups|key|keys)\b/u)?.[1]?.replace(/s$/u, '');
  if (noun) parts.push(`${labels.object}: ${labels.words[noun]}`);
  for (const word of ['red', 'blue', 'green', 'big', 'small', 'ready', 'happy', 'kind', 'funny', 'quiet', 'calm', 'busy', 'tired', 'fine', 'okay', 'cold', 'warm', 'sunny', 'rainy']) {
    if (new RegExp(`\\b${word}\\b`, 'iu').test(lower)) parts.push(`${labels.quality}: ${labels.words[word]}`);
  }
  if (/\bhere\b/iu.test(lower)) parts.push(`${labels.place}: ${labels.words.here}`);
  if (/\bhome\b/iu.test(lower)) parts.push(`${labels.place}: ${labels.words.home}`);
  if (/\btoo\b/iu.test(lower)) parts.push(labels.too);
  if (/\band\b/iu.test(lower)) parts.push(labels.and);
  if (/\bbut\b/iu.test(lower)) parts.push(labels.but);
  return parts;
}

export function episode01WorldMeaning(locale: Episode01WorldLocale, english: string): string {
  return `${semanticParts(locale, english).join('; ')}.`;
}

function explanation(locale: Episode01WorldLocale, english: string): string {
  const question = /^(?:Is|Are|Am|How old|Whose)\b/u.test(english);
  const possession = /\b(?:whose|mine|yours|his|hers|mother's|father's|sister's|brother's)\b/iu.test(english);
  const joined = /\b(?:and|but|too)\b/iu.test(english);
  const fixed = /^(?:Sorry|Pardon|Excuse me)\?$/u.test(english);
  const copy: Record<Episode01WorldLocale, readonly [string, string, string, string, string]> = {
    ru: ['Так говорят, когда нужно уточнить состояние, предмет, человека или принадлежность.', 'Вопросительная форма ставит ключевое слово перед тем, о ком или о чём спрашивают.', 'Форма принадлежности показывает владельца и не заменяет обязательную связку.', 'And добавляет совместный факт, but противопоставляет, а too присоединяет такой же признак.', 'Эта короткая вежливая реплика просит повторить услышанное и произносится как готовый блок.'],
    uk: ['Так кажуть, коли треба уточнити стан, річ, людину або належність.', 'Питальна форма ставить ключове слово перед тим, про кого чи про що питають.', 'Форма належності показує власника й не замінює обов’язкову зв’язку.', 'And додає спільний факт, but протиставляє, а too приєднує таку саму ознаку.', 'Ця коротка ввічлива репліка просить повторити почуте й вимовляється готовим блоком.'],
    es: ['Se usa para precisar un estado, un objeto, una persona o una relación de pertenencia.', 'La forma interrogativa coloca la palabra clave delante de la persona o cosa consultada.', 'La forma posesiva identifica al propietario y no sustituye la cópula necesaria.', 'And suma un hecho, but lo contrasta y too añade la misma característica.', 'Esta fórmula breve y cortés pide que repitan lo oído y funciona como un bloque fijo.'],
    'pt-BR': ['Usa-se para indicar com precisão um estado, objeto, pessoa ou relação de posse.', 'A forma interrogativa leva a palavra-chave para antes da pessoa ou coisa perguntada.', 'A forma possessiva identifica o dono e não substitui a ligação necessária.', 'And soma um fato, but cria contraste e too acrescenta a mesma característica.', 'Esta fala curta e educada pede repetição e funciona como um bloco fixo.'],
    vi: ['Câu này dùng để nói rõ trạng thái, đồ vật, con người hoặc quan hệ sở hữu.', 'Dạng câu hỏi đưa từ khóa lên trước người hoặc vật được hỏi.', 'Dạng sở hữu chỉ ra chủ sở hữu nhưng không thay thế từ nối bắt buộc.', 'And thêm một ý cùng chiều, but tạo tương phản, còn too thêm đặc điểm giống nhau.', 'Cụm lịch sự ngắn này đề nghị người nghe nhắc lại và được dùng như một khối cố định.'],
    id: ['Kalimat ini dipakai untuk menyatakan keadaan, benda, orang, atau kepemilikan secara tepat.', 'Bentuk pertanyaan memindahkan kata kunci ke depan orang atau benda yang ditanyakan.', 'Bentuk kepemilikan menunjukkan pemilik dan tidak menggantikan penghubung yang wajib.', 'And menambah fakta, but membandingkannya, dan too menambahkan sifat yang sama.', 'Ungkapan sopan pendek ini meminta pengulangan dan dipakai sebagai satu blok tetap.'],
    tr: ['Bu söz durum, nesne, kişi ya da sahiplik ilişkisini kesin biçimde belirtir.', 'Soru biçimi anahtar sözcüğü sorulan kişi ya da nesnenin önüne taşır.', 'Sahiplik biçimi sahibini gösterir ve gerekli bağlayıcının yerini tutmaz.', 'And ortak bir bilgi ekler, but karşıtlık kurar, too ise aynı özelliği ekler.', 'Bu kısa ve nazik kalıp duyulan sözün tekrarlanmasını ister ve bütün olarak kullanılır.'],
    pl: ['Tak mówi się, aby dokładnie wskazać stan, rzecz, osobę albo własność.', 'Forma pytająca przenosi kluczowe słowo przed osobę lub rzecz, o którą pytamy.', 'Forma dzierżawcza wskazuje właściciela i nie zastępuje wymaganego łącznika.', 'And dodaje zgodny fakt, but przeciwstawia, a too dołącza tę samą cechę.', 'Ta krótka uprzejma formuła prosi o powtórzenie i działa jako gotowy blok.'],
  };
  const reason = fixed ? copy[locale][4] : joined ? copy[locale][3] : possession ? copy[locale][2] : question ? copy[locale][1] : copy[locale][0];
  const endings: Record<Episode01WorldLocale, string> = {
    ru: `В «${english}» выбранные am, is или are и порядок слов связывают все названные части в одно точное сообщение.`,
    uk: `У «${english}» вибрані am, is або are та порядок слів поєднують усі частини в одне точне повідомлення.`,
    es: `En «${english}», la forma am, is o are y el orden unen todos los elementos en un mensaje preciso.`,
    'pt-BR': `Em «${english}», a forma am, is ou are e a ordem unem todos os elementos numa mensagem precisa.`,
    vi: `Trong «${english}», dạng am, is hoặc are cùng trật tự từ nối mọi phần thành một thông điệp chính xác.`,
    id: `Dalam «${english}», bentuk am, is, atau are dan urutan kata menyatukan semua bagian menjadi pesan yang tepat.`,
    tr: `«${english}» içinde am, is ya da are biçimi ile sözcük sırası bütün parçaları kesin bir iletide birleştirir.`,
    pl: `W „${english}” forma am, is albo are oraz szyk łączą wszystkie elementy w dokładny komunikat.`,
  };
  const fixedEndings: Record<Episode01WorldLocale, string> = {
    ru: `«${english}» не разбирают как новое правило: выбор зависит от степени формальности и ситуации.`, uk: `«${english}» не розбирають як нове правило: вибір залежить від формальності та ситуації.`, es: `«${english}» no introduce una regla nueva: se elige según el grado de formalidad y la situación.`, 'pt-BR': `«${english}» não introduz regra nova: a escolha depende do grau de formalidade e da situação.`, vi: `«${english}» không tạo quy tắc mới; lựa chọn phụ thuộc mức độ trang trọng và tình huống.`, id: `«${english}» bukan aturan baru; pilihannya bergantung pada tingkat kesopanan dan situasi.`, tr: `«${english}» yeni bir kural değildir; seçim resmiyet derecesine ve duruma bağlıdır.`, pl: `„${english}” nie wprowadza nowej reguły; wybór zależy od formalności i sytuacji.`,
  };
  return `${reason} ${fixed ? fixedEndings[locale] : endings[locale]}`;
}

function wordRole(word: string): 'link' | 'owner' | 'connector' | 'content' {
  if (/^(?:am|is|are)$/iu.test(word)) return 'link';
  if (/^(?:my|your|his|her|mine|yours|hers|whose)$/iu.test(word) || /'s$/iu.test(word)) return 'owner';
  if (/^(?:and|but|too)$/iu.test(word)) return 'connector';
  return 'content';
}

function wordPrompt(locale: Episode01WorldLocale, english: string, word: string): string {
  const copy: Record<Episode01WorldLocale, string> = {
    ru: `Какое слово сохраняет роль «${word}» в фразе «${english}»?`, uk: `Яке слово зберігає роль «${word}» у вислові «${english}»?`, es: `¿Qué palabra conserva la función de «${word}» en «${english}»?`, 'pt-BR': `Qual palavra mantém a função de «${word}» em «${english}»?`, vi: `Từ nào giữ đúng vai trò của “${word}” trong “${english}”?`, id: `Kata mana mempertahankan fungsi “${word}” dalam “${english}”?`, tr: `«${english}» içinde «${word}» görevini hangi sözcük korur?`, pl: `Które słowo zachowuje rolę „${word}” w „${english}”?`,
  };
  return copy[locale];
}

export function episode01WorldDistractorReason(locale: Episode01WorldLocale, correct: string, alternative: string): string {
  const role = wordRole(correct);
  const copy: Record<Episode01WorldLocale, Record<typeof role, string>> = {
    ru: { link: `«${alternative}» не согласуется с подлежащим в этой позиции; здесь требуется форма «${correct}».`, owner: `«${alternative}» указывает другого владельца или занимает другую позицию; нужен вариант «${correct}».`, connector: `«${alternative}» связывает мысли иначе; требуемое отношение передаёт «${correct}».`, content: `«${alternative}» называет другой предмет, признак или участника; смысл требует «${correct}».` },
    uk: { link: `«${alternative}» не узгоджується з підметом у цій позиції; тут потрібна форма «${correct}».`, owner: `«${alternative}» вказує іншого власника або має іншу позицію; потрібне «${correct}».`, connector: `«${alternative}» інакше поєднує думки; потрібне відношення передає «${correct}».`, content: `«${alternative}» називає іншу річ, ознаку чи учасника; зміст потребує «${correct}».` },
    es: { link: `«${alternative}» no concuerda con el sujeto en esta posición; aquí se necesita «${correct}».`, owner: `«${alternative}» señala otro propietario o ocupa otra posición; se necesita «${correct}».`, connector: `«${alternative}» relaciona las ideas de otra manera; «${correct}» expresa la relación requerida.`, content: `«${alternative}» nombra otra cosa, característica o persona; el sentido exige «${correct}».` },
    'pt-BR': { link: `«${alternative}» não concorda com o sujeito nesta posição; aqui é preciso «${correct}».`, owner: `«${alternative}» indica outro dono ou ocupa outra posição; é necessário «${correct}».`, connector: `«${alternative}» relaciona as ideias de outro modo; «${correct}» expressa a relação desejada.`, content: `«${alternative}» nomeia outro objeto, característica ou pessoa; o sentido exige «${correct}».` },
    vi: { link: `“${alternative}” không hòa hợp với chủ ngữ ở vị trí này; câu cần đúng dạng “${correct}”.`, owner: `“${alternative}” chỉ chủ sở hữu khác hoặc đứng ở vị trí khác; cần dùng “${correct}”.`, connector: `“${alternative}” nối hai ý theo quan hệ khác; quan hệ cần thiết được diễn đạt bằng “${correct}”.`, content: `“${alternative}” gọi đồ vật, đặc điểm hoặc người khác; ý nghĩa của câu cần “${correct}”.` },
    id: { link: `“${alternative}” tidak sesuai dengan subjek pada posisi ini; bentuk yang diperlukan adalah “${correct}”.`, owner: `“${alternative}” menunjukkan pemilik lain atau menempati posisi lain; diperlukan “${correct}”.`, connector: `“${alternative}” menghubungkan gagasan dengan cara berbeda; hubungan yang diperlukan memakai “${correct}”.`, content: `“${alternative}” menamai benda, sifat, atau orang lain; makna kalimat memerlukan “${correct}”.` },
    tr: { link: `«${alternative}» bu konumda özneyle uyuşmaz; burada «${correct}» biçimi gerekir.`, owner: `«${alternative}» başka sahibi gösterir ya da başka konumda kullanılır; «${correct}» gerekir.`, connector: `«${alternative}» düşünceler arasında başka ilişki kurar; gereken ilişkiyi «${correct}» verir.`, content: `«${alternative}» başka nesne, özellik ya da kişiyi adlandırır; anlam «${correct}» ister.` },
    pl: { link: `„${alternative}” nie zgadza się z podmiotem w tej pozycji; tutaj potrzebna jest forma „${correct}”.`, owner: `„${alternative}” wskazuje innego właściciela albo zajmuje inną pozycję; potrzebne jest „${correct}”.`, connector: `„${alternative}” inaczej łączy myśli; wymaganą relację wyraża „${correct}”.`, content: `„${alternative}” nazywa inną rzecz, cechę lub osobę; sens wymaga słowa „${correct}”.` },
  };
  return copy[locale][role];
}

export function buildEpisode01WorldLocalizedDetails(
  english: string,
  phraseTokens: readonly string[],
  alternatives: (word: string) => readonly string[],
): Record<Episode01WorldLocale, EpisodeSourcePhraseLocalizedDetails> {
  return Object.fromEntries(EPISODE_01_WORLD_LOCALES.map((locale) => [locale, {
    meaning: episode01WorldMeaning(locale, english),
    explanation: explanation(locale, english),
    distractors: alternatives(phraseTokens[0] ?? 'is').map((value) => ({ value, reason: episode01WorldDistractorReason(locale, phraseTokens[0] ?? 'is', value) })),
    words: phraseTokens.map((correct) => ({ correct, prompt: wordPrompt(locale, english, correct), distractors: alternatives(correct).map((value) => ({ value, reason: episode01WorldDistractorReason(locale, correct, value) })) })),
  }])) as unknown as Record<Episode01WorldLocale, EpisodeSourcePhraseLocalizedDetails>;
}
