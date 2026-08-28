import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 23 "Скажи вслух: оцени ситуацию" / kind: 'voice', builtOn: [17,18,20],
// recalls: [17,18,20]): интро НЕ упоминает "сессию/урок/главу/курс/экран/
// карточку" ни в каком контексте (intro_meta_narration), по образцу сессий 7
// и 15 (es_episode_01_session_07_intro_v1.ts, es_episode_01_session_15_intro_v1.ts).
// Тема — произношение УТВЕРДИТЕЛЬНОЙ оценки вслух, в противовес уже изученному
// в сессии 15 восходящему тону вопроса: уверенное суждение звучит с ударением
// именно на признаке в конце фразы (fácil, caro, verdadero), а не с общим
// подъёмом к концу, как в вопросе. Каждое bodyRuns собрано ИЗ ТОГО ЖЕ текста,
// что и body, — никаких отдельных черновиков (см. проверочный скрипт в задаче).
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_23_VOICE_TITLE = L({
  ru: 'Скажи вслух: оцени ситуацию',
  uk: 'Скажи вголос: оціни ситуацію',
  es: 'Say it out loud: give a verdict on the situation',
  'pt-BR': 'Diga em voz alta: avalie a situação',
  vi: 'Nói to lên: đánh giá tình huống',
  id: 'Ucapkan dengan keras: nilai situasinya',
  tr: 'Yüksek sesle söyle: durumu değerlendir',
  pl: 'Powiedz na głos: oceń sytuację',
});

export const ES_EPISODE_01_SESSION_23_VOICE_SUMMARY = L({
  ru: 'Знакомые оценочные суждения о ситуации звучат вслух, уверенным голосом, без опоры на письменный текст перед глазами.',
  uk: 'Знайомі оціночні судження про ситуацію звучать уголос, упевненим голосом, без опори на письмовий текст перед очима.',
  es: 'Familiar verdicts about a situation are spoken out loud, in a confident voice, without written text in front of the eyes.',
  'pt-BR': 'Vereditos já conhecidos sobre uma situação são ditos em voz alta, com voz confiante, sem texto escrito diante dos olhos.',
  vi: 'Những nhận định quen thuộc về một tình huống được nói to lên, bằng giọng tự tin, không có chữ viết trước mắt.',
  id: 'Penilaian yang sudah dikenal tentang suatu situasi diucapkan dengan keras, dengan suara percaya diri, tanpa teks tertulis di depan mata.',
  tr: 'Bir durum hakkındaki tanıdık yargılar, gözlerin önünde yazılı metin olmadan, kendinden emin bir sesle yüksek sesle söylenir.',
  pl: 'Znajome osądy o sytuacji brzmią na głos, pewnym głosem, bez pisemnego tekstu przed oczami.',
});

export const ES_EPISODE_01_SESSION_23_VOICE_GOAL = L({
  ru: 'Произнести знакомую оценку ситуации вслух уверенно и точно, с ударением на самом признаке, без запинки и без взгляда на письменный текст.',
  uk: 'Вимовити знайому оцінку ситуації вголос упевнено й точно, з наголосом на самій ознаці, без запинки й без погляду на письмовий текст.',
  es: 'Say a familiar verdict about a situation out loud confidently and accurately, with the stress on the quality itself, without hesitation and without looking at written text.',
  'pt-BR': 'Dizer um veredito conhecido sobre uma situação em voz alta com confiança e precisão, com o acento na própria qualidade, sem hesitar e sem olhar para o texto escrito.',
  vi: 'Nói ra một nhận định quen thuộc về tình huống to lên một cách tự tin và chính xác, với trọng âm rơi vào chính đặc điểm đó, không do dự và không nhìn vào chữ viết.',
  id: 'Mengucapkan penilaian yang sudah dikenal tentang suatu situasi dengan keras secara percaya diri dan akurat, dengan tekanan pada sifatnya sendiri, tanpa ragu-ragu dan tanpa melihat teks tertulis.',
  tr: 'Bir durum hakkındaki tanıdık bir yargıyı, vurguyu doğrudan niteliğin üzerine koyarak, duraksamadan ve yazılı metne bakmadan, kendinden emin ve doğru bir şekilde yüksek sesle söylemek.',
  pl: 'Wypowiedzieć znajomy osąd o sytuacji na głos pewnie i dokładnie, z akcentem na samej cesze, bez wahania i bez patrzenia na pisemny tekst.',
});

const CONCEPT_BODY = L({
  ru: 'Уверенное суждение звучит иначе, чем вопрос: голос не поднимается к концу фразы, а твёрдо опускается на признаке. Es fácil произносится с явным ударением на fácil — именно там голос звучит увереннее всего. Голос сравнивается со звучанием образца, а не с буквами на бумаге — так узнают уверенное суждение на слух.',
  uk: 'Впевнене судження звучить інакше, ніж питання: голос не піднімається до кінця фрази, а твердо опускається на ознаці. Es fácil вимовляється з явним наголосом на fácil — саме там голос звучить найупевненіше. Голос порівнюється зі звучанням зразка, а не з літерами на папері — так впізнають впевнене судження на слух.',
  es: 'A confident verdict sounds different from a question: the voice does not rise toward the end of the phrase — it settles firmly on the quality. Es fácil is said with a clear stress on fácil — that is where the voice sounds most confident. The voice is compared with the sound of the model, not with the letters on paper.',
  'pt-BR': 'Um veredito confiante soa diferente de uma pergunta: a voz não sobe em direção ao fim da frase — ela se firma sobre a qualidade. Es fácil é dito com um acento claro em fácil — é ali que a voz soa mais confiante. A voz é comparada com o som do modelo, não com as letras no papel.',
  vi: 'Một nhận định tự tin nghe khác với câu hỏi: giọng nói không lên cao về cuối câu — nó đọng lại chắc chắn trên đặc điểm. Es fácil được nói với trọng âm rõ ràng vào fácil — đó là nơi giọng nói nghe tự tin nhất. Giọng nói được so sánh với âm thanh của mẫu, không phải chữ viết.',
  id: 'Penilaian percaya diri terdengar berbeda dari pertanyaan: suara tidak naik menuju akhir frasa — ia mantap pada sifatnya. Es fácil diucapkan dengan tekanan jelas pada fácil — di situlah suara terdengar paling percaya diri. Suara dibandingkan dengan bunyi contoh, bukan huruf di kertas.',
  tr: 'Kendinden emin bir yargı, sorudan farklı duyulur: ses cümlenin sonuna doğru yükselmez — nitelik üzerinde sağlam biçimde yerleşir. Es fácil, fácil üzerinde belirgin vurguyla söylenir — sesin en kendinden emin duyulduğu yer orasıdır. Ses, örneğin sesiyle karşılaştırılır, harflerle değil.',
  pl: 'Pewny osąd brzmi inaczej niż pytanie: głos nie wznosi się ku końcowi zdania — stanowczo osiada na cesze. Es fácil wymawia się z wyraźnym akcentem na fácil — właśnie tam głos brzmi najpewniej. Głos porównuje się z brzmieniem wzoru, a nie z literami na papierze — tak rozpoznaje się pewny osąd na słuch.',
});

const FORMULA_BODY = L({
  ru: 'Формула проста: сначала звучит образец с ударением на признаке, затем голос повторяет его целиком с той же твёрдостью. Es caro звучит с явным нажимом на caro, а не на es. Es barato строится точно так же: нажим падает на barato — обычно последнее слово фразы, суть суждения.',
  uk: 'Формула проста: спершу звучить зразок із наголосом на ознаці, потім голос повторює його цілком із тією ж твердістю. Es caro звучить із явним натиском на caro, а не на es. Es barato будується так само: натиск падає на barato — зазвичай останнє слово фрази, суть судження.',
  es: 'The formula is simple: first the model sounds with the stress on the quality, then the voice repeats it whole with the same firmness. Es caro is said with a clear push on caro, not on es. Es barato is built the same way: the push falls on barato — usually the last word of the phrase, the core of the verdict.',
  'pt-BR': 'A fórmula é simples: primeiro o modelo soa com o acento na qualidade, depois a voz o repete inteiro com a mesma firmeza. Es caro é dito com uma ênfase clara em caro, não em es. Es barato se constrói do mesmo jeito: a ênfase cai em barato — geralmente a última palavra da frase, o cerne do veredito.',
  vi: 'Công thức rất đơn giản: đầu tiên mẫu vang lên với trọng âm trên đặc điểm, sau đó giọng nói lặp lại trọn vẹn với cùng sự chắc chắn đó. Es caro được nói với sự nhấn mạnh rõ ràng vào caro, không phải ở es. Es barato được xây dựng theo cách y hệt: sự nhấn mạnh rơi vào barato — thường là từ cuối cùng của câu.',
  id: 'Rumusnya sederhana: pertama contoh terdengar dengan tekanan pada sifatnya, kemudian suara mengulanginya secara utuh dengan kemantapan yang sama. Es caro diucapkan dengan penekanan jelas pada caro, bukan pada es. Es barato dibangun dengan cara yang sama: penekanan jatuh pada barato — biasanya kata terakhir dari frasa.',
  tr: 'Formül basittir: önce örnek nitelik üzerindeki vurguyla duyulur, ardından ses onu aynı kararlılıkla bütün olarak tekrarlar. Es caro, caro üzerinde belirgin bir baskıyla söylenir, es üzerinde değil. Es barato da aynı şekilde kurulur: baskı barato üzerine düşer — genellikle cümlenin son kelimesidir.',
  pl: 'Formuła jest prosta: najpierw brzmi wzór z akcentem na cesze, potem głos powtarza go w całości z tą samą stanowczością. Es caro wymawia się z wyraźnym naciskiem na caro, nie na es. Es barato buduje się tak samo: nacisk pada na barato — zwykle ostatnie słowo zdania, sedno osądu.',
});

const TRAP_BODY = L({
  ru: 'Легко подумать, что раз слова знакомы, суждение прозвучит уверенно само собой, — но можно точно знать, что означает No es fácil, и всё равно смазать звук. Самая опасная ошибка — произнести ¿Es fácil? тем же твёрдым нисходящим тоном, что и уверенное утверждение: собеседник услышит готовый вывод, а не вопрос.',
  uk: 'Легко подумати, що раз слова знайомі, судження прозвучить упевнено само собою, — але можна точно знати, що означає No es fácil, і все одно змазати звук. Найнебезпечніша помилка — вимовити ¿Es fácil? тим самим твердим низхідним тоном, що й впевнене твердження: співрозмовник почує готовий висновок, а не питання.',
  es: 'It is easy to think a verdict will sound confident by itself since the words are familiar — but one can know exactly what No es fácil means and still blur the sound. The dangerous mistake is saying ¿Es fácil? with that same firm falling tone: the listener hears a ready conclusion, not a question.',
  'pt-BR': 'É fácil pensar que o veredito vai soar confiante sozinho, já que as palavras são conhecidas — mas dá para saber exatamente o que No es fácil significa e ainda assim borrar o som. O erro perigoso é dizer ¿Es fácil? com o mesmo tom firme e descendente: o interlocutor ouve uma conclusão pronta, não uma pergunta.',
  vi: 'Dễ nghĩ rằng nhận định sẽ tự nhiên nghe tự tin vì các từ đã quen thuộc — nhưng có thể biết chính xác No es fácil nghĩa là gì mà vẫn làm mờ âm thanh. Sai lầm nguy hiểm là nói ¿Es fácil? bằng cùng tông điệu chắc chắn đi xuống: người nghe sẽ nghe thấy một kết luận có sẵn, không phải một câu hỏi.',
  id: 'Mudah berpikir penilaian akan terdengar percaya diri dengan sendirinya karena kata sudah dikenal — tetapi bisa tahu persis apa arti No es fácil dan tetap mengaburkan bunyinya. Kesalahan berbahaya: mengucapkan ¿Es fácil? dengan nada tegas menurun sama: pendengar mendengar kesimpulan yang sudah jadi, bukan pertanyaan.',
  tr: 'Kelimeler tanıdık olduğu için yargının kendiliğinden kendinden emin duyulacağını düşünmek kolaydır — ama No es fácil’in ne anlama geldiğini bilip yine de sesi bulanıklaştırabilirsiniz. Tehlikeli hata, ¿Es fácil?’ı aynı sağlam düşen tonla söylemektir: dinleyici bir soru değil, hazır bir sonuç duyar.',
  pl: 'Łatwo pomyśleć, że osąd zabrzmi pewnie sam z siebie, skoro słowa są znajome — ale można dokładnie wiedzieć, co znaczy No es fácil, i mimo to zamazać dźwięk. Niebezpiecznym błędem jest wypowiedzenie ¿Es fácil? tym samym stanowczym, opadającym tonem: rozmówca usłyszy gotowy wniosek, a nie pytanie.',
});

export const ES_EPISODE_01_SESSION_23_VOICE_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Уверенное суждение опирается на признак',
      uk: 'Впевнене судження спирається на ознаку',
      es: 'A confident verdict rests on the quality',
      'pt-BR': 'Um veredito confiante se apoia na qualidade',
      vi: 'Một nhận định tự tin dựa vào đặc điểm',
      id: 'Penilaian percaya diri bersandar pada sifatnya',
      tr: 'Kendinden emin bir yargı niteliğe dayanır',
      pl: 'Pewny osąd opiera się na cesze',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Уверенное суждение о ситуации звучит иначе, чем вопрос из прошлой практики: голос не поднимается к концу фразы, а, наоборот, твёрдо опускается на признаке. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' произносится с явным ударением на fácil — именно там голос звучит увереннее всего, будто ставит точку. Сначала звучит образец целиком, с этим самым ударением на признаке, и только затем его нужно повторить своим голосом. Голос при этом сравнивается со звучанием образца, а не с буквами на бумаге, — именно так узнают уверенное суждение на слух.', semantic: 'explanation' }),
      uk: R({ text: 'Впевнене судження про ситуацію звучить інакше, ніж питання з попередньої практики: голос не піднімається до кінця фрази, а навпаки, твердо опускається на ознаці. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' вимовляється з явним наголосом на fácil — саме там голос звучить найупевненіше, ніби ставить крапку. Спершу звучить зразок цілком, із цим самим наголосом на ознаці, і лише потім його потрібно повторити власним голосом. Голос при цьому порівнюється зі звучанням зразка, а не з літерами на папері, — саме так впізнають впевнене судження на слух.', semantic: 'explanation' }),
      es: R({ text: 'A confident verdict about a situation sounds different from the question from the earlier practice: the voice does not rise toward the end of the phrase — instead, it settles firmly on the quality. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' is said with a clear stress on fácil — that is exactly where the voice sounds most confident, as if placing a full stop. The model sounds first in full, with that same stress on the quality, and only then does it need to be repeated with one\'s own voice. The voice is compared with the sound of the model, not with the letters on paper — that is exactly how a confident verdict is recognized by ear.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Um veredito confiante sobre uma situação soa diferente da pergunta da prática anterior: a voz não sobe em direção ao fim da frase — em vez disso, ela se firma sobre a qualidade. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' é dito com um acento claro em fácil — é exatamente aí que a voz soa mais confiante, como se pusesse um ponto final. O modelo soa primeiro por inteiro, com esse mesmo acento na qualidade, e só depois precisa ser repetido com a própria voz. A voz é comparada com o som do modelo, não com as letras no papel — é exatamente assim que se reconhece um veredito confiante pelo ouvido.', semantic: 'explanation' }),
      vi: R({ text: 'Một nhận định tự tin về tình huống nghe khác với câu hỏi trong bài luyện trước đó: giọng nói không lên cao về cuối câu — mà thay vào đó, nó đọng lại chắc chắn trên đặc điểm được nhắc đến. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' được nói với trọng âm rõ ràng vào fácil — đó chính xác là nơi giọng nói nghe tự tin nhất, như thể đặt một dấu chấm hết. Mẫu vang lên trọn vẹn trước, với chính trọng âm đó trên đặc điểm, và chỉ sau đó mới cần lặp lại bằng chính giọng nói của mình. Giọng nói được so sánh với âm thanh của mẫu, không phải với chữ viết trên giấy — đó chính xác là cách một nhận định tự tin được nhận ra khi nghe.', semantic: 'explanation' }),
      id: R({ text: 'Sebuah penilaian percaya diri tentang suatu situasi terdengar berbeda dari pertanyaan pada latihan sebelumnya: suara tidak naik menuju akhir frasa — sebaliknya, ia mantap pada sifatnya. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' diucapkan dengan tekanan jelas pada fácil — di situlah persisnya suara terdengar paling percaya diri, seolah membubuhkan titik akhir. Contohnya terdengar utuh terlebih dahulu, dengan tekanan yang sama pada sifat itu, dan baru setelah itu perlu diulangi dengan suara sendiri. Suara dibandingkan dengan bunyi contoh, bukan dengan huruf di atas kertas — begitulah persisnya sebuah penilaian percaya diri dikenali oleh telinga.', semantic: 'explanation' }),
      tr: R({ text: 'Bir durum hakkındaki kendinden emin bir yargı, önceki pratikteki sorudan farklı duyulur: ses cümlenin sonuna doğru yükselmez — bunun yerine nitelik üzerinde sağlam biçimde yerleşir. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', fácil üzerinde belirgin bir vurguyla söylenir — sesin en kendinden emin duyulduğu yer tam olarak orasıdır, sanki bir nokta koyuyormuş gibi. Önce örnek baştan sona, nitelik üzerindeki o aynı vurguyla duyulur, ancak sonrasında kendi sesiyle tekrarlanması gerekir. Ses, örneğin sesiyle karşılaştırılır, kağıt üzerindeki harflerle değil — kendinden emin bir yargı kulakla tam olarak böyle tanınır.', semantic: 'explanation' }),
      pl: R({ text: 'Pewny osąd o sytuacji brzmi inaczej niż pytanie z poprzedniej praktyki: głos nie wznosi się ku końcowi zdania — przeciwnie, stanowczo osiada na cesze. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' wymawia się z wyraźnym akcentem na fácil — właśnie tam głos brzmi najpewniej, jakby stawiał kropkę. Najpierw brzmi cały wzór, z tym samym akcentem na cesze, a dopiero potem trzeba go powtórzyć własnym głosem. Głos porównuje się z brzmieniem wzoru, a nie z literami na papierze — właśnie tak rozpoznaje się pewny osąd na słuch.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что происходит с голосом к концу уверенного суждения?',
        uk: 'Що відбувається з голосом до кінця впевненого судження?',
        es: 'What happens to the voice toward the end of a confident verdict?',
        'pt-BR': 'O que acontece com a voz em direção ao fim de um veredito confiante?',
        vi: 'Điều gì xảy ra với giọng nói về cuối một nhận định tự tin?',
        id: 'Apa yang terjadi pada suara menuju akhir penilaian yang percaya diri?',
        tr: 'Kendinden emin bir yargının sonuna doğru sesle ne olur?',
        pl: 'Co dzieje się z głosem ku końcowi pewnego osądu?',
      }),
      choices: [
        L({ ru: 'Твёрдо опускается на признаке', uk: 'Твердо опускається на ознаці', es: 'It settles firmly on the quality', 'pt-BR': 'Ela se firma sobre a qualidade', vi: 'Nó đọng lại chắc chắn trên đặc điểm', id: 'Ia mantap pada sifatnya', tr: 'Nitelik üzerinde sağlam biçimde yerleşir', pl: 'Stanowczo osiada na cesze' }),
        L({ ru: 'Поднимается к концу фразы', uk: 'Піднімається до кінця фрази', es: 'It rises toward the end of the phrase', 'pt-BR': 'Ela sobe em direção ao fim da frase', vi: 'Nó lên cao về cuối câu', id: 'Ia naik menuju akhir frasa', tr: 'Cümlenin sonuna doğru yükselir', pl: 'Wznosi się ku końcowi zdania' }),
        L({ ru: 'Совсем пропадает', uk: 'Зовсім зникає', es: 'It disappears entirely', 'pt-BR': 'Desaparece completamente', vi: 'Biến mất hoàn toàn', id: 'Hilang sepenuhnya', tr: 'Tamamen kaybolur', pl: 'Znika całkowicie' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Голос твёрдо опускается на признаке — он не поднимается к концу фразы, как в вопросе, и не пропадает.',
        uk: 'Голос твердо опускається на ознаці — він не піднімається до кінця фрази, як у питанні, і не зникає.',
        es: 'The voice settles firmly on the quality — it does not rise toward the end of the phrase like in a question, and it does not disappear.',
        'pt-BR': 'A voz se firma sobre a qualidade — ela não sobe em direção ao fim da frase como numa pergunta, e não desaparece.',
        vi: 'Giọng nói đọng lại chắc chắn trên đặc điểm — nó không lên cao về cuối câu như trong câu hỏi, và không biến mất.',
        id: 'Suara mantap pada sifatnya — ia tidak naik menuju akhir frasa seperti dalam pertanyaan, dan tidak hilang.',
        tr: 'Ses nitelik üzerinde sağlam biçimde yerleşir — bir sorudaki gibi cümlenin sonuna doğru yükselmez ve kaybolmaz.',
        pl: 'Głos stanowczo osiada na cesze — nie wznosi się ku końcowi zdania jak w pytaniu i nie znika.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Нажим падает на последнее слово',
      uk: 'Натиск припадає на останнє слово',
      es: 'The push falls on the last word',
      'pt-BR': 'A ênfase cai na última palavra',
      vi: 'Sự nhấn mạnh rơi vào từ cuối cùng',
      id: 'Penekanan jatuh pada kata terakhir',
      tr: 'Baskı son kelimeye düşer',
      pl: 'Nacisk przypada na ostatnie słowo',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула проста: сначала звучит образец с ударением на признаке, затем голос повторяет его целиком с той же твёрдостью. ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ' звучит с явным нажимом на caro — именно там голос звучит весомее всего, а не на es. ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetCorrect' }, { text: ' строится точно так же: нажим падает на barato. Слово, несущее это ударение, — обычно последнее слово фразы, сам признак или суть суждения. Точность здесь измеряется на слух: звучит ли признак весомо и твёрдо, как в образце, а не то, правильно ли выбрана буква на письме.', semantic: 'explanation' }),
      uk: R({ text: 'Формула проста: спершу звучить зразок із наголосом на ознаці, потім голос повторює його цілком із тією ж твердістю. ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ' звучить із явним натиском на caro — саме там голос звучить вагоміше за все, а не на es. ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetCorrect' }, { text: ' будується так само: натиск падає на barato. Слово, що несе цей наголос, — зазвичай останнє слово фрази, сама ознака чи суть судження. Точність тут вимірюється на слух: чи звучить ознака вагомо й твердо, як у зразку, а не чи правильно обрана літера на письмі.', semantic: 'explanation' }),
      es: R({ text: 'The formula is simple: first the model sounds with the stress on the quality, then the voice repeats it whole with the same firmness. ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ' is said with a clear push on caro — that is exactly where the voice sounds most weighty, not on es. ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetCorrect' }, { text: ' is built the same way: the push falls on barato. The word carrying this stress is usually the last word of the phrase, the quality itself or the core of the verdict. Accuracy here is measured by ear: whether the quality sounds weighty and firm the way it does in the model, not whether the right letter was picked in writing.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é simples: primeiro o modelo soa com o acento na qualidade, depois a voz o repete inteiro com a mesma firmeza. ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ' é dito com uma ênfase clara em caro — é exatamente aí que a voz soa mais firme, não em es. ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetCorrect' }, { text: ' se constrói do mesmo jeito: a ênfase cai em barato. A palavra que carrega esse acento costuma ser a última palavra da frase, a própria qualidade ou o cerne do veredito. A precisão aqui é medida pelo ouvido: se a qualidade soa firme e com peso como no modelo, não se a letra certa foi escolhida por escrito.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức rất đơn giản: đầu tiên mẫu vang lên với trọng âm trên đặc điểm, sau đó giọng nói lặp lại trọn vẹn với cùng sự chắc chắn đó. ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ' được nói với sự nhấn mạnh rõ ràng vào caro — đó chính xác là nơi giọng nói nghe có sức nặng nhất, không phải ở es. ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetCorrect' }, { text: ' được xây dựng theo cách y hệt: sự nhấn mạnh rơi vào barato. Từ mang trọng âm này thường là từ cuối cùng của câu, chính đặc điểm đó hoặc cốt lõi của nhận định. Độ chính xác ở đây được đo bằng tai: đặc điểm có nghe có sức nặng và chắc chắn như trong mẫu hay không, chứ không phải chữ đúng có được chọn khi viết hay không.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sederhana: pertama contoh terdengar dengan tekanan pada sifatnya, kemudian suara mengulanginya secara utuh dengan kemantapan yang sama. ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ' diucapkan dengan penekanan jelas pada caro — di situlah persisnya suara terdengar paling berbobot, bukan pada es. ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetCorrect' }, { text: ' dibangun dengan cara yang sama: penekanan jatuh pada barato. Kata yang membawa tekanan ini biasanya kata terakhir dari frasa, sifat itu sendiri atau inti dari penilaian. Akurasi di sini diukur dengan telinga: apakah sifatnya terdengar berbobot dan mantap seperti pada contoh, bukan apakah huruf yang tepat dipilih secara tertulis.', semantic: 'explanation' }),
      tr: R({ text: 'Formül basittir: önce örnek nitelik üzerindeki vurguyla duyulur, ardından ses onu aynı kararlılıkla bütün olarak tekrarlar. ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ', caro üzerinde belirgin bir baskıyla söylenir — sesin en ağırlıklı duyulduğu yer tam olarak orasıdır, es değil. ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetCorrect' }, { text: ' da aynı şekilde kurulur: baskı barato üzerine düşer. Bu vurguyu taşıyan kelime genellikle cümlenin son kelimesidir, niteliğin kendisi ya da yargının özü. Buradaki doğruluk kulakla ölçülür: nitelik örnekteki gibi ağırlıklı ve kararlı duyulur mu, yazıda doğru harfin seçilip seçilmediği değil.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest prosta: najpierw brzmi wzór z akcentem na cesze, potem głos powtarza go w całości z tą samą stanowczością. ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ' wymawia się z wyraźnym naciskiem na caro — właśnie tam głos brzmi najbardziej ważko, nie na es. ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetCorrect' }, { text: ' buduje się tak samo: nacisk pada na barato. Słowo niosące ten akcent to zwykle ostatnie słowo zdania, sama cecha lub sedno osądu. Dokładność mierzy się tu na słuch: czy cecha brzmi ważko i stanowczo tak jak we wzorze, a nie czy wybrano właściwą literę na piśmie.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'На каком слове обычно звучит нажим в уверенном суждении?',
        uk: 'На якому слові зазвичай звучить натиск у впевненому судженні?',
        es: 'On which word does the push usually fall in a confident verdict?',
        'pt-BR': 'Em qual palavra a ênfase costuma cair num veredito confiante?',
        vi: 'Sự nhấn mạnh thường rơi vào từ nào trong một nhận định tự tin?',
        id: 'Pada kata mana penekanan biasanya jatuh dalam penilaian yang percaya diri?',
        tr: 'Kendinden emin bir yargıda baskı genellikle hangi kelimeye düşer?',
        pl: 'Na którym słowie zwykle pada nacisk w pewnym osądzie?',
      }),
      choices: [
        L({ ru: 'последнее слово фразы', uk: 'останнє слово фрази', es: 'the last word of the phrase', 'pt-BR': 'a última palavra da frase', vi: 'từ cuối cùng của câu', id: 'kata terakhir dari frasa', tr: 'cümlenin son kelimesidir', pl: 'ostatnie słowo zdania' }),
        L({ ru: 'Первое слово фразы', uk: 'Перше слово фрази', es: 'The first word of the phrase', 'pt-BR': 'A primeira palavra da frase', vi: 'Từ đầu tiên của câu', id: 'Kata pertama dari frasa', tr: 'Cümlenin ilk kelimesi', pl: 'Pierwsze słowo zdania' }),
        L({ ru: 'Голос вообще не меняется', uk: 'Голос узагалі не змінюється', es: 'The voice does not change at all', 'pt-BR': 'A voz não muda em nada', vi: 'Giọng nói hoàn toàn không thay đổi', id: 'Suara sama sekali tidak berubah', tr: 'Ses hiç değişmez', pl: 'Głos w ogóle się nie zmienia' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Правильный ответ — последнее слово фразы: нажим падает именно туда, не на первое слово, и голос определённо меняется, а не остаётся ровным.',
        uk: 'Правильна відповідь — останнє слово фрази: натиск припадає саме туди, не на перше слово, і голос точно змінюється, а не лишається рівним.',
        es: 'The correct answer is the last word of the phrase: the push falls exactly there, not on the first word, and the voice definitely changes rather than staying level.',
        'pt-BR': 'A resposta certa é a última palavra da frase: a ênfase cai exatamente ali, não na primeira palavra, e a voz definitivamente muda, em vez de ficar nivelada.',
        vi: 'Câu trả lời đúng là từ cuối cùng của câu: sự nhấn mạnh rơi chính xác vào đó, không phải từ đầu tiên, và giọng nói chắc chắn thay đổi chứ không giữ đều đều.',
        id: 'Jawaban yang benar adalah kata terakhir dari frasa: penekanan jatuh persis di situ, bukan pada kata pertama, dan suara pasti berubah, bukan tetap datar.',
        tr: 'Doğru cevap cümlenin son kelimesidir: baskı tam olarak oraya düşer, ilk kelimeye değil, ve ses kesinlikle değişir, düz kalmaz.',
        pl: 'Poprawna odpowiedź to ostatnie słowo zdania: nacisk pada dokładnie tam, nie na pierwszym słowie, a głos zdecydowanie się zmienia, a nie pozostaje równy.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Суждение и вопрос звучат по-разному',
      uk: 'Судження і питання звучать по-різному',
      es: 'A verdict and a question sound different',
      'pt-BR': 'Um veredito e uma pergunta soam diferente',
      vi: 'Nhận định và câu hỏi nghe khác nhau',
      id: 'Penilaian dan pertanyaan terdengar berbeda',
      tr: 'Bir yargı ile bir soru farklı duyulur',
      pl: 'Osąd i pytanie brzmią różnie',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Легко подумать, что раз слова знакомы, суждение прозвучит уверенно само собой, — но узнавание фразы и уверенность в голосе проверяются по-разному. Можно точно знать, что означает ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ', и всё равно смазать звук, если торопиться и не довести ударение на признаке до конца. Самая опасная ошибка — произнести ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' тем же твёрдым нисходящим тоном, что и уверенное утверждение: тогда собеседник услышит готовый вывод, а не вопрос. Проверка простая: в суждении голос твёрдо ложится на признак в конце фразы, а в вопросе — поднимается.', semantic: 'explanation' }),
      uk: R({ text: 'Легко подумати, що раз слова знайомі, судження прозвучить упевнено само собою, — але впізнавання фрази й упевненість у голосі перевіряються по-різному. Можна точно знати, що означає ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ', і все одно змазати звук, якщо поспішати й не довести наголос на ознаці до кінця. Найнебезпечніша помилка — вимовити ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' тим самим твердим низхідним тоном, що й впевнене твердження: тоді співрозмовник почує готовий висновок, а не питання. Перевірка проста: у судженні голос твердо лягає на ознаку в кінці фрази, а в питанні — піднімається.', semantic: 'explanation' }),
      es: R({ text: 'It is easy to think that since the words are familiar, the verdict will sound confident by itself — but recognizing the phrase and sounding confident are checked differently. One can know exactly what ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' means and still blur the sound if rushing and not carrying the stress on the quality through to the end. The most dangerous mistake is saying ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' with that same firm falling tone as a confident statement: then the listener hears a ready conclusion, not a question. The check is simple: in a verdict the voice settles firmly on the quality at the end of the phrase, while in a question it rises.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'É fácil pensar que, como as palavras são conhecidas, o veredito vai soar confiante sozinho — mas reconhecer a frase e soar confiante são verificados de formas diferentes. Dá para saber exatamente o que ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' significa e ainda assim borrar o som se apressar e não levar o acento na qualidade até o fim. O erro mais perigoso é dizer ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' com o mesmo tom firme e descendente de uma afirmação confiante: aí o interlocutor ouve uma conclusão pronta, não uma pergunta. A checagem é simples: num veredito a voz se firma sobre a qualidade no fim da frase, enquanto numa pergunta ela sobe.', semantic: 'explanation' }),
      vi: R({ text: 'Dễ nghĩ rằng vì các từ đã quen thuộc, nhận định sẽ tự nhiên nghe tự tin — nhưng việc nhận ra câu và nghe tự tin được kiểm tra khác nhau. Có thể biết chính xác ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' nghĩa là gì mà vẫn làm mờ âm thanh nếu vội vàng và không kéo trọng âm trên đặc điểm đến hết. Sai lầm nguy hiểm nhất là nói ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' bằng cùng tông điệu chắc chắn đi xuống như một câu khẳng định tự tin: khi đó người nghe sẽ nghe thấy một kết luận có sẵn, không phải một câu hỏi. Cách kiểm tra đơn giản: trong nhận định, giọng nói đọng chắc chắn trên đặc điểm ở cuối câu, còn trong câu hỏi thì nó lên cao.', semantic: 'explanation' }),
      id: R({ text: 'Mudah untuk berpikir bahwa karena kata-katanya sudah dikenal, penilaian akan terdengar percaya diri dengan sendirinya — tetapi mengenali frasa dan terdengar percaya diri diperiksa dengan cara berbeda. Seseorang bisa tahu persis apa arti ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' dan tetap mengaburkan bunyinya jika terburu-buru dan tidak menuntaskan tekanan pada sifat hingga akhir. Kesalahan paling berbahaya adalah mengucapkan ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' dengan nada tegas menurun yang sama seperti pernyataan percaya diri: maka pendengar akan mendengar kesimpulan yang sudah jadi, bukan pertanyaan. Pengecekannya sederhana: dalam penilaian, suara mantap pada sifat di akhir frasa, sedangkan dalam pertanyaan, suara naik.', semantic: 'explanation' }),
      tr: R({ text: 'Kelimeler tanıdık olduğu için yargının kendiliğinden kendinden emin duyulacağını düşünmek kolaydır — ama cümleyi tanımak ve kendinden emin duyulmak farklı şekilde kontrol edilir. ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: '’in ne anlama geldiğini tam olarak bilebilir ve yine de acele edip nitelik üzerindeki vurguyu sona kadar taşımazsa sesi bulanıklaştırabilirsiniz. En tehlikeli hata, ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: '’ı kendinden emin bir ifadeyle aynı sağlam düşen tonla söylemektir: o zaman dinleyici bir soru değil, hazır bir sonuç duyar. Kontrol basittir: bir yargıda ses cümlenin sonundaki nitelik üzerine sağlam biçimde oturur, bir soruda ise yükselir.', semantic: 'explanation' }),
      pl: R({ text: 'Łatwo pomyśleć, że skoro słowa są znajome, osąd zabrzmi pewnie sam z siebie — ale rozpoznanie zdania i brzmienie pewności siebie sprawdza się inaczej. Można dokładnie wiedzieć, co znaczy ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ', i mimo to zamazać dźwięk, jeśli się śpieszy i nie doprowadzi akcentu na cesze do końca. Najniebezpieczniejszym błędem jest wypowiedzenie ', semantic: 'explanation' }, { text: '¿Es fácil?', semantic: 'targetCorrect' }, { text: ' tym samym stanowczym, opadającym tonem co pewne twierdzenie: wtedy rozmówca usłyszy gotowy wniosek, a nie pytanie. Sprawdzenie jest proste: w osądzie głos stanowczo osiada na cesze na końcu zdania, a w pytaniu — wznosi się.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что услышит собеседник, если вопрос произнести нисходящим тоном суждения?',
        uk: 'Що почує співрозмовник, якщо питання вимовити низхідним тоном судження?',
        es: 'What does the listener hear if a question is said with the falling tone of a verdict?',
        'pt-BR': 'O que o interlocutor ouve se uma pergunta for dita com o tom descendente de um veredito?',
        vi: 'Người nghe sẽ nghe thấy gì nếu một câu hỏi được nói với tông điệu đi xuống của một nhận định?',
        id: 'Apa yang didengar pendengar jika sebuah pertanyaan diucapkan dengan nada menurun seperti penilaian?',
        tr: 'Bir soru, bir yargının düşen tonuyla söylenirse dinleyici ne duyar?',
        pl: 'Co usłyszy rozmówca, jeśli pytanie zostanie wypowiedziane opadającym tonem osądu?',
      }),
      choices: [
        L({ ru: 'Готовый вывод, а не вопрос', uk: 'Готовий висновок, а не питання', es: 'A ready conclusion, not a question', 'pt-BR': 'Uma conclusão pronta, não uma pergunta', vi: 'Một kết luận có sẵn, không phải một câu hỏi', id: 'Kesimpulan yang sudah jadi, bukan pertanyaan', tr: 'bir soru değil, hazır bir sonuç duyar', pl: 'Gotowy wniosek, a nie pytanie' }),
        L({ ru: 'Ничего не изменится', uk: 'Нічого не зміниться', es: 'Nothing changes', 'pt-BR': 'Nada muda', vi: 'Không có gì thay đổi', id: 'Tidak ada yang berubah', tr: 'Hiçbir şey değişmez', pl: 'Nic się nie zmieni' }),
        L({ ru: 'Фраза станет длиннее', uk: 'Фраза стане довшою', es: 'The phrase becomes longer', 'pt-BR': 'A frase fica mais longa', vi: 'Câu sẽ dài hơn', id: 'Frasa menjadi lebih panjang', tr: 'Cümle daha uzun olur', pl: 'Zdanie stanie się dłuższe' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Собеседник услышит готовый вывод, а не вопрос, — нисходящий тон меняет смысл на слух, а длина фразы тут ни при чём.',
        uk: 'Співрозмовник почує готовий висновок, а не питання, — низхідний тон змінює сенс на слух, а довжина фрази тут ні до чого.',
        es: 'The listener hears a ready conclusion, not a question — the falling tone changes the meaning to the ear, and the length of the phrase has nothing to do with it.',
        'pt-BR': 'O interlocutor ouve uma conclusão pronta, não uma pergunta — o tom descendente muda o sentido ao ouvido, e o comprimento da frase não tem nada a ver com isso.',
        vi: 'Người nghe sẽ nghe thấy một kết luận có sẵn, không phải câu hỏi — tông điệu đi xuống làm thay đổi ý nghĩa khi nghe, và độ dài câu không liên quan gì đến điều đó.',
        id: 'Pendengar mendengar kesimpulan yang sudah jadi, bukan pertanyaan — nada menurun mengubah makna di telinga, dan panjang frasa tidak ada hubungannya dengan itu.',
        tr: 'Dinleyici hazır bir sonuç duyar, soru değil — düşen ton anlamı kulakta değiştirir ve cümlenin uzunluğunun bununla ilgisi yoktur.',
        pl: 'Rozmówca usłyszy gotowy wniosek, a nie pytanie — opadający ton zmienia znaczenie dla ucha, a długość zdania nie ma z tym nic wspólnego.',
      }),
    },
  },
];
