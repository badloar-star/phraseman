import type { LocalizedSource } from './session_shard_from_source_v1';

const diagnostic = (
  chosen: string,
  target: string,
  detail: LocalizedSource,
): LocalizedSource => ({
  ru: `${chosen}: ${detail.ru}. Нужен ${target}; сравните эту одну решающую разницу ещё раз.`,
  uk: `${chosen}: ${detail.uk}. Потрібен ${target}; ще раз порівняйте цю вирішальну відмінність.`,
  es: `${chosen}: ${detail.es}. La respuesta es ${target}; compara de nuevo esa diferencia decisiva.`,
  'pt-BR': `${chosen}: ${detail['pt-BR']}. A resposta é ${target}; compare outra vez essa diferença decisiva.`,
  vi: `${chosen}: ${detail.vi}. Đáp án là ${target}; hãy so sánh lại điểm khác biệt quyết định này.`,
  id: `${chosen}: ${detail.id}. Jawabannya ${target}; bandingkan lagi perbedaan penentu ini.`,
  tr: `${chosen}: ${detail.tr}. Doğru cevap ${target}; bu belirleyici farkı yeniden karşılaştırın.`,
  pl: `${chosen}: ${detail.pl}. Poprawna odpowiedź to ${target}; porównaj jeszcze tę decydującą różnicę.`,
});

export const EPISODE_01_SESSION_03_FULL_B1_CONTENT_V2 = Object.freeze({
  title: {
    ru: 'Три состояния: занят, свободен, опаздываю',
    uk: 'Три стани: зайнятий, вільний, запізнююсь',
    es: 'Tres estados: ocupado, libre, tarde',
    'pt-BR': 'Três estados: ocupado, livre, atrasado',
    vi: 'Ba trạng thái: bận, rảnh, muộn',
    id: 'Tiga keadaan: sibuk, luang, terlambat',
    tr: 'Üç durum: meşgul, müsait, geç kalmış',
    pl: 'Trzy stany: zajęty, wolny, spóźniony',
  } satisfies LocalizedSource,
  summary: {
    ru: 'Называем своё состояние с уже знакомой формой I am.',
    uk: 'Називаємо свій стан уже знайомою формою I am.',
    es: 'Nombramos nuestro estado con la forma ya conocida I am.',
    'pt-BR': 'Nomeamos nosso estado com a forma já conhecida I am.',
    vi: 'Gọi tên trạng thái của mình bằng mẫu I am đã biết.',
    id: 'Menyebut keadaan diri dengan bentuk I am yang sudah dikenal.',
    tr: 'Durumumuzu bilinen I am biçimiyle söyleriz.',
    pl: 'Nazywamy swój stan znaną już formą I am.',
  } satisfies LocalizedSource,
  goal: {
    ru: 'Сказать: «Я занят», «Я свободен» или «Я опаздываю».',
    uk: 'Сказати: «Я зайнятий», «Я вільний» або «Я запізнююсь».',
    es: 'Decir: «Estoy ocupado», «Estoy libre» o «Llego tarde».',
    'pt-BR': 'Dizer: «Estou ocupado», «Estou livre» ou «Estou atrasado».',
    vi: 'Nói: “Tôi bận”, “Tôi rảnh” hoặc “Tôi muộn”.',
    id: 'Mengatakan: “Saya sibuk”, “Saya luang”, atau “Saya terlambat”.',
    tr: '“Meşgulüm”, “Müsaitim” ya da “Geç kaldım” demek.',
    pl: 'Powiedzieć: „Jestem zajęty”, „Jestem wolny” albo „Jestem spóźniony”.',
  } satisfies LocalizedSource,
  vocabulary: Object.freeze([
    { id: 'e01-s03-word-busy', target: 'busy', meaning: { ru: 'занят', uk: 'зайнятий', es: 'ocupado', 'pt-BR': 'ocupado', vi: 'bận', id: 'sibuk', tr: 'meşgul', pl: 'zajęty' } satisfies LocalizedSource, distractors: [
      { value: 'buzzy', feedback: diagnostic('buzzy', 'busy', { ru: 'лишний звук z меняет слово', uk: 'зайвий звук z змінює слово', es: 'la z extra cambia la palabra', 'pt-BR': 'o z extra muda a palavra', vi: 'âm z thêm vào đổi từ', id: 'bunyi z tambahan mengubah kata', tr: 'fazladan z sesi sözcüğü değiştirir', pl: 'dodatkowe z zmienia słowo' }) },
      { value: 'bossy', feedback: diagnostic('bossy', 'busy', { ru: 'это «властный», а не «занят»', uk: 'це «владний», а не «зайнятий»', es: 'significa mandón, no ocupado', 'pt-BR': 'significa mandão, não ocupado', vi: 'nghĩa là hay ra lệnh, không phải bận', id: 'berarti suka memerintah, bukan sibuk', tr: 'buyurgan demektir, meşgul değil', pl: 'znaczy apodyktyczny, nie zajęty' }) },
      { value: 'easy', feedback: diagnostic('easy', 'busy', { ru: 'означает «лёгкий»', uk: 'означає «легкий»', es: 'significa fácil', 'pt-BR': 'significa fácil', vi: 'nghĩa là dễ', id: 'berarti mudah', tr: 'kolay demektir', pl: 'znaczy łatwy' }) },
    ] },
    { id: 'e01-s03-word-free', target: 'free', meaning: { ru: 'свободен', uk: 'вільний', es: 'libre', 'pt-BR': 'livre', vi: 'rảnh', id: 'luang', tr: 'müsait', pl: 'wolny' } satisfies LocalizedSource, distractors: [
      { value: 'three', feedback: diagnostic('three', 'free', { ru: 'это число «три»', uk: 'це число «три»', es: 'es el número tres', 'pt-BR': 'é o número três', vi: 'đó là số ba', id: 'itu angka tiga', tr: 'üç sayısıdır', pl: 'to liczba trzy' }) },
      { value: 'tree', feedback: diagnostic('tree', 'free', { ru: 'это «дерево»', uk: 'це «дерево»', es: 'es árbol', 'pt-BR': 'é árvore', vi: 'đó là cây', id: 'itu pohon', tr: 'ağaç demektir', pl: 'to drzewo' }) },
      { value: 'fee', feedback: diagnostic('fee', 'free', { ru: 'это плата; в free есть r', uk: 'це плата; у free є r', es: 'es una tarifa; free lleva r', 'pt-BR': 'é uma taxa; free tem r', vi: 'là khoản phí; free có r', id: 'berarti biaya; free memiliki r', tr: 'ücret demektir; free içinde r vardır', pl: 'to opłata; free ma r' }) },
    ] },
    { id: 'e01-s03-word-late', target: 'late', meaning: { ru: 'опаздываю', uk: 'запізнююсь', es: 'tarde', 'pt-BR': 'atrasado', vi: 'muộn', id: 'terlambat', tr: 'geç', pl: 'spóźniony' } satisfies LocalizedSource, distractors: [
      { value: 'light', feedback: diagnostic('light', 'late', { ru: 'это «свет»; добавлены i и gh', uk: 'це «світло»; додано i та gh', es: 'es luz; añade i y gh', 'pt-BR': 'é luz; acrescenta i e gh', vi: 'là ánh sáng; có thêm i và gh', id: 'berarti cahaya; ada i dan gh tambahan', tr: 'ışık demektir; i ve gh eklenir', pl: 'to światło; dodaje i i gh' }) },
      { value: 'lake', feedback: diagnostic('lake', 'late', { ru: 'это «озеро»: k не подходит', uk: 'це «озеро»: k не підходить', es: 'es lago: la k no corresponde', 'pt-BR': 'é lago: k não serve', vi: 'là hồ: k không đúng', id: 'berarti danau: k tidak tepat', tr: 'göl demektir: k uygun değildir', pl: 'to jezioro: k nie pasuje' }) },
      { value: 'last', feedback: diagnostic('last', 'late', { ru: 'это «последний»; конец другой', uk: 'це «останній»; закінчення інше', es: 'significa último; el final es distinto', 'pt-BR': 'significa último; o final é diferente', vi: 'nghĩa là cuối cùng; phần cuối khác', id: 'berarti terakhir; akhir katanya berbeda', tr: 'son demektir; sonu farklıdır', pl: 'znaczy ostatni; końcówka jest inna' }) },
    ] },
  ]),
  phrases: Object.freeze([
    { id: 'e01-s03-phrase-busy', english: 'I am busy.', meaning: { ru: 'Я занят / занята.', uk: 'Я зайнятий / зайнята.', es: 'Estoy ocupado / ocupada.', 'pt-BR': 'Estou ocupado / ocupada.', vi: 'Tôi bận.', id: 'Saya sibuk.', tr: 'Meşgulüm.', pl: 'Jestem zajęty / zajęta.' } satisfies LocalizedSource },
    { id: 'e01-s03-phrase-free', english: 'I am free.', meaning: { ru: 'Я свободен / свободна.', uk: 'Я вільний / вільна.', es: 'Estoy libre.', 'pt-BR': 'Estou livre.', vi: 'Tôi rảnh.', id: 'Saya luang.', tr: 'Müsaitim.', pl: 'Jestem wolny / wolna.' } satisfies LocalizedSource },
    { id: 'e01-s03-phrase-late', english: 'I am late.', meaning: { ru: 'Я опаздываю.', uk: 'Я запізнююсь.', es: 'Llego tarde.', 'pt-BR': 'Estou atrasado / atrasada.', vi: 'Tôi bị muộn.', id: 'Saya terlambat.', tr: 'Geç kaldım.', pl: 'Jestem spóźniony / spóźniona.' } satisfies LocalizedSource },
  ]),
  practice: Object.freeze([
    { family: 'scripted_repeat_compare', primaryTarget: 'busy' },
    { family: 'listen_choose', primaryTarget: 'free' },
    { family: 'scripted_repeat_compare', primaryTarget: 'late' },
    { family: 'speed_match', primaryTarget: 'happy|sad|tired' },
    { family: 'phrase_builder', primaryTarget: 'I am late.' },
    { family: 'listen_build_dictation', primaryTarget: 'I am busy.' },
    { family: 'context_gap_grammar', primaryTarget: 'I am free.' },
  ]),
});
