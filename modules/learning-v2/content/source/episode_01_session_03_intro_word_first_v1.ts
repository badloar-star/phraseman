import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type { LocalizedIntroRunsSource, LocalizedSource, SessionSourceIntroPage } from './session_shard_from_source_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const CORRECT = ["I'm ready", "I'm fine", "I'm here", "I'm", 'I am'] as const;
const WRONG = ["I'm am ready", 'I ready', "I'am", 'Im'] as const;
const TERMS = [...CORRECT, ...WRONG].sort((left, right) => right.length - left.length);

function runs(body: LocalizedSource): LocalizedIntroRunsSource {
  return Object.fromEntries(LOCALES.map((locale) => {
    const text = body[locale];
    const result: LearningV2IntroTextRunV1[] = [];
    let cursor = 0;
    while (cursor < text.length) {
      const term = TERMS.find((candidate) => text.startsWith(candidate, cursor));
      if (term) {
        result.push({ text: term, semantic: WRONG.includes(term as never) ? 'targetWrong' : 'targetCorrect' });
        cursor += term.length;
        continue;
      }
      let end = cursor + 1;
      while (end < text.length && !TERMS.some((candidate) => text.startsWith(candidate, end))) end += 1;
      result.push({ text: text.slice(cursor, end), semantic: 'explanation' });
      cursor = end;
    }
    return [locale, result];
  })) as unknown as LocalizedIntroRunsSource;
}

const C = (value: string): LocalizedSource => L(Object.fromEntries(
  LOCALES.map((locale) => [locale, value]),
) as unknown as LocalizedSource);

export const EPISODE_01_SESSION_03_WORD_FIRST_TITLE = L({
  ru: 'I’m — коротко и живо', uk: 'I’m — коротко й живо', es: 'I’m: corto y natural',
  'pt-BR': 'I’m: curto e natural', vi: 'I’m: ngắn và tự nhiên', id: 'I’m: singkat dan alami',
  tr: 'I’m: kısa ve doğal', pl: 'I’m — krótko i naturalnie',
});

export const EPISODE_01_SESSION_03_WORD_FIRST_SUMMARY = L({
  ru: 'Сжимаем I am в I’m без потери смысла.', uk: 'Стискаємо I am до I’m без втрати змісту.',
  es: 'Acortamos I am a I’m sin cambiar el sentido.', 'pt-BR': 'Encurtamos I am para I’m sem mudar o sentido.',
  vi: 'Rút gọn I am thành I’m mà không đổi nghĩa.', id: 'Meringkas I am menjadi I’m tanpa mengubah arti.',
  tr: 'I am biçimini anlamı değiştirmeden I’m yapıyoruz.', pl: 'Skracamy I am do I’m bez zmiany znaczenia.',
});

export const EPISODE_01_SESSION_03_WORD_FIRST_GOAL = L({
  ru: 'Узнавать, собирать и произносить I’m в знакомых фразах.',
  uk: 'Упізнавати, складати й вимовляти I’m у знайомих фразах.',
  es: 'Reconocer, construir y pronunciar I’m en frases conocidas.',
  'pt-BR': 'Reconhecer, montar e pronunciar I’m em frases conhecidas.',
  vi: 'Nhận ra, ghép và phát âm I’m trong các câu quen thuộc.',
  id: 'Mengenali, menyusun, dan mengucapkan I’m dalam kalimat yang sudah dikenal.',
  tr: 'I’m biçimini tanıdık cümlelerde tanımak, kurmak ve söylemek.',
  pl: 'Rozpoznawać, układać i wymawiać I’m w znanych zdaniach.',
});

const concept = L({
  ru: 'I’m — это короткое I am. Смысл не меняется: I’m here и I am here сообщают одно и то же, но короткая форма звучит живее. Апостроф показывает место исчезнувшей буквы a.',
  uk: 'I’m — це коротке I am. Зміст не змінюється: I’m here та I am here повідомляють те саме, але коротка форма звучить жвавіше. Апостроф показує місце зниклої літери a.',
  es: 'I’m es la forma corta de I am. I’m here e I am here dicen lo mismo, pero la forma corta suena más natural al hablar. El apóstrofo ocupa el lugar de la letra a.',
  'pt-BR': 'I’m é a forma curta de I am. I’m here e I am here dizem a mesma coisa, mas a forma curta soa mais natural na fala. O apóstrofo marca o lugar da letra a.',
  vi: 'I’m là dạng ngắn của I am. I’m here và I am here có cùng nghĩa, nhưng dạng ngắn nghe tự nhiên hơn khi nói. Dấu nháy đứng ở chỗ chữ a được lược đi.',
  id: 'I’m adalah bentuk singkat dari I am. I’m here dan I am here memiliki arti yang sama, tetapi bentuk singkat terdengar lebih alami saat diucapkan. Apostrof menandai tempat huruf a yang hilang.',
  tr: 'I’m, I am biçiminin kısasıdır. I’m here ile I am here aynı şeyi söyler; kısa biçim konuşmada daha doğal duyulur. Kesme işareti düşen a harfinin yerini gösterir.',
  pl: 'I’m to krótka forma I am. I’m here i I am here znaczą to samo, lecz krótka forma brzmi naturalniej w mowie. Apostrof zajmuje miejsce usuniętej litery a.',
});

const formula = L({
  ru: 'Склейте I и am: оставьте I, уберите a и поставьте апостроф — I’m. После готового I’m сразу идёт знакомое состояние или место: I’m ready, I’m fine, I’m here.',
  uk: 'З’єднайте I та am: залиште I, приберіть a й поставте апостроф — I’m. Після готового I’m одразу йде знайомий стан або місце: I’m ready, I’m fine, I’m here.',
  es: 'Une I y am: conserva I, quita la a y coloca el apóstrofo — I’m. Después de I’m va directamente un estado o lugar conocido: I’m ready, I’m fine, I’m here.',
  'pt-BR': 'Junte I e am: mantenha I, retire o a e coloque o apóstrofo — I’m. Depois de I’m vem diretamente um estado ou lugar conhecido: I’m ready, I’m fine, I’m here.',
  vi: 'Ghép I với am: giữ I, bỏ a và đặt dấu nháy — I’m. Sau I’m là trạng thái hoặc nơi chốn đã quen: I’m ready, I’m fine, I’m here.',
  id: 'Gabungkan I dan am: pertahankan I, hilangkan a, lalu pasang apostrof — I’m. Setelah I’m langsung muncul keadaan atau tempat yang sudah dikenal: I’m ready, I’m fine, I’m here.',
  tr: 'I ile am biçimini birleştirin: I kalsın, a düşsün ve kesme işareti gelsin — I’m. I’m sonrasında tanıdık bir durum ya da yer gelir: I’m ready, I’m fine, I’m here.',
  pl: 'Połącz I z am: zostaw I, usuń a i wstaw apostrof — I’m. Po I’m od razu pojawia się znany stan lub miejsce: I’m ready, I’m fine, I’m here.',
});

const trap = L({
  ru: 'В I’m уже спрятано am, поэтому I’m am ready повторяет связку. Im без апострофа — просто две буквы, а I ready теряет am целиком. Рабочая форма одна: I’m ready.',
  uk: 'У I’m уже заховано am, тому I’m am ready повторює зв’язку. Im без апострофа — лише дві літери, а I ready втрачає am повністю. Робоча форма одна: I’m ready.',
  es: 'I’m ya contiene am, por eso I’m am ready repite el enlace. Im sin apóstrofo son solo dos letras, mientras I ready pierde am por completo. La forma correcta es I’m ready.',
  'pt-BR': 'I’m já contém am, por isso I’m am ready repete a ligação. Im sem apóstrofo são apenas duas letras, enquanto I ready perde am por completo. A forma certa é I’m ready.',
  vi: 'I’m đã chứa am nên I’m am ready lặp từ nối. Im không có dấu nháy chỉ là hai chữ cái, còn I ready làm mất hẳn am. Dạng đúng là I’m ready.',
  id: 'I’m sudah memuat am, jadi I’m am ready mengulang penghubung. Im tanpa apostrof hanya dua huruf, sedangkan I ready membuang am sepenuhnya. Bentuk yang tepat ialah I’m ready.',
  tr: 'I’m zaten am içerir; bu yüzden I’m am ready bağı iki kez kullanır. Kesmesiz Im yalnızca iki harftir, I ready ise am biçimini tamamen düşürür. Doğru biçim I’m ready olur.',
  pl: 'I’m już zawiera am, więc I’m am ready powtarza łącznik. Im bez apostrofu to tylko dwie litery, a I ready całkiem gubi am. Poprawna forma to I’m ready.',
});

export const EPISODE_01_SESSION_03_WORD_FIRST_INTRO: readonly [SessionSourceIntroPage, SessionSourceIntroPage, SessionSourceIntroPage] = Object.freeze([
  {
    kind: 'concept', title: L({ ru: 'Два слова становятся одним', uk: 'Два слова стають одним', es: 'Dos palabras se vuelven una', 'pt-BR': 'Duas palavras viram uma', vi: 'Hai từ thành một', id: 'Dua kata menjadi satu', tr: 'İki sözcük tek biçim olur', pl: 'Dwa słowa stają się jednym' }),
    body: concept, bodyRuns: runs(concept),
    question: {
      grammarFeatureId: 'contraction_im', testedDimension: 'contraction_meaning_equivalence',
      prompt: L({ ru: 'Какая короткая форма означает то же, что I am?', uk: 'Яка коротка форма означає те саме, що I am?', es: '¿Qué forma corta significa lo mismo que I am?', 'pt-BR': 'Qual forma curta significa o mesmo que I am?', vi: 'Dạng ngắn nào có cùng nghĩa với I am?', id: 'Bentuk singkat mana yang sama artinya dengan I am?', tr: 'Hangi kısa biçim I am ile aynı anlama gelir?', pl: 'Która krótka forma znaczy to samo co I am?' }),
      choices: [C('I’m'), C('Im'), C('I')], correctChoiceIndex: 0,
      explanation: L({ ru: 'I’m сохраняет и I, и am; апостроф отмечает пропущенную a.', uk: 'I’m зберігає і I, і am; апостроф позначає пропущену a.', es: 'I’m conserva I y am; el apóstrofo marca la a omitida.', 'pt-BR': 'I’m preserva I e am; o apóstrofo marca o a omitido.', vi: 'I’m vẫn giữ nghĩa của I và am; dấu nháy đánh dấu chữ a bị lược.', id: 'I’m mempertahankan arti I dan am; apostrof menandai huruf a yang hilang.', tr: 'I’m hem I hem de am anlamını korur; kesme işareti düşen a harfini gösterir.', pl: 'I’m zachowuje I i am; apostrof wskazuje pominięte a.' }),
    },
  },
  {
    kind: 'formula', title: L({ ru: 'Апостроф занимает место a', uk: 'Апостроф займає місце a', es: 'El apóstrofo ocupa el lugar de a', 'pt-BR': 'O apóstrofo ocupa o lugar de a', vi: 'Dấu nháy thay chỗ chữ a', id: 'Apostrof menggantikan huruf a', tr: 'Kesme işareti a harfinin yerini alır', pl: 'Apostrof zajmuje miejsce a' }),
    body: formula, bodyRuns: runs(formula),
    question: {
      grammarFeatureId: 'contraction_im', testedDimension: 'contraction_apostrophe_position',
      prompt: L({ ru: 'Где апостроф стоит правильно?', uk: 'Де апостроф стоїть правильно?', es: '¿Dónde está bien colocado el apóstrofo?', 'pt-BR': 'Onde o apóstrofo está no lugar certo?', vi: 'Dấu nháy được đặt đúng ở đâu?', id: 'Di mana apostrof ditempatkan dengan benar?', tr: 'Kesme işareti nerede doğru yerde?', pl: 'Gdzie apostrof stoi poprawnie?' }),
      choices: [C('I’m'), C('I’am'), C('Im')], correctChoiceIndex: 0,
      explanation: L({ ru: 'I’m ставит апостроф ровно там, где из am исчезла a.', uk: 'I’m ставить апостроф саме там, де з am зникла a.', es: 'I’m coloca el apóstrofo justo donde desapareció la a de am.', 'pt-BR': 'I’m coloca o apóstrofo exatamente onde o a de am desapareceu.', vi: 'I’m đặt dấu nháy đúng nơi chữ a của am được lược đi.', id: 'I’m menaruh apostrof tepat di tempat huruf a dari am dihilangkan.', tr: 'I’m kesme işaretini am içindeki a harfinin düştüğü yere koyar.', pl: 'I’m stawia apostrof dokładnie tam, gdzie z am zniknęło a.' }),
    },
  },
  {
    kind: 'trap', title: L({ ru: 'Второй am уже лишний', uk: 'Другий am уже зайвий', es: 'Un segundo am sobra', 'pt-BR': 'Um segundo am sobra', vi: 'Không cần thêm am', id: 'am kedua tidak diperlukan', tr: 'İkinci am gereksizdir', pl: 'Drugie am jest zbędne' }),
    body: trap, bodyRuns: runs(trap),
    question: {
      grammarFeatureId: 'contraction_im', testedDimension: 'contraction_without_double_copula',
      prompt: L({ ru: 'Где связка использована ровно один раз?', uk: 'Де зв’язку використано рівно один раз?', es: '¿Dónde aparece el enlace una sola vez?', 'pt-BR': 'Onde a ligação aparece apenas uma vez?', vi: 'Câu nào chỉ dùng từ nối một lần?', id: 'Di mana penghubung dipakai tepat satu kali?', tr: 'Bağ hangi biçimde yalnızca bir kez kullanılır?', pl: 'Gdzie łącznik występuje dokładnie raz?' }),
      choices: [C('I’m ready'), C('I’m am ready'), C('I ready')], correctChoiceIndex: 0,
      explanation: L({ ru: 'I’m ready уже содержит am внутри I’m: ничего добавлять и убирать не нужно.', uk: 'I’m ready уже містить am усередині I’m: нічого додавати чи прибирати не треба.', es: 'I’m ready ya contiene am dentro de I’m: no hace falta añadir ni quitar nada.', 'pt-BR': 'I’m ready já contém am dentro de I’m: não é preciso acrescentar nem retirar nada.', vi: 'I’m ready đã có am bên trong I’m nên không cần thêm hay bỏ gì.', id: 'I’m ready sudah memuat am di dalam I’m; tidak perlu menambah atau membuang apa pun.', tr: 'I’m ready içinde am zaten I’m biçimindedir; ekleme ya da çıkarma gerekmez.', pl: 'I’m ready zawiera już am w I’m; niczego nie trzeba dodawać ani usuwać.' }),
    },
  },
]);
