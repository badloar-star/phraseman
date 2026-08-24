import { EPISODE_01_SESSION_12_EDITORIAL_COPY_V1 } from "./episode_01_session_12_editorial_copy_v1";
import { EPISODE_01_SESSION_13_EDITORIAL_COPY_V1 } from "./episode_01_session_13_editorial_copy_v1";
import { EPISODE_01_SESSION_15_EDITORIAL_COPY_V1 } from "./episode_01_session_15_editorial_copy_v1";

type Locale = "ru" | "uk" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl";
type PhraseCopy = Readonly<{ meaning: string; explanation: string }>;
const L = (value: Record<Locale, PhraseCopy>): Readonly<Record<Locale, PhraseCopy>> => value;

const NEW_COPY: Readonly<Record<string, Readonly<Record<Locale, PhraseCopy>>>> = Object.freeze({
  "I am here.": L({
    ru: { meaning: "Я здесь.", explanation: "I am here. спокойно сообщает место самого говорящего. I стоит первым, а am связывает его с наречием here без дополнительного предлога." },
    uk: { meaning: "Я тут.", explanation: "I am here. спокійно повідомляє місце самого мовця. I стоїть першим, а am пов’язує його з прислівником here без додаткового прийменника." },
    es: { meaning: "Estoy aquí.", explanation: "I am here. indica de manera directa dónde está quien habla. I aparece primero y am lo enlaza con here sin añadir ninguna preposición." },
    "pt-BR": { meaning: "Estou aqui.", explanation: "I am here. informa diretamente onde está quem fala. I vem primeiro e am o liga a here sem acrescentar nenhuma preposição." },
    vi: { meaning: "Tôi ở đây.", explanation: "I am here. cho biết trực tiếp vị trí của người nói. I đứng trước, còn am nối người nói với here mà không cần thêm giới từ." },
    id: { meaning: "Saya di sini.", explanation: "I am here. menyatakan langsung tempat penutur. I berada di awal dan am menghubungkannya dengan here tanpa preposisi tambahan." },
    tr: { meaning: "Buradayım.", explanation: "I am here. konuşanın bulunduğu yeri doğrudan bildirir. I başta durur, am ise kişiyi ek bir edat almayan here sözcüğüne bağlar." },
    pl: { meaning: "Jestem tutaj.", explanation: "I am here. bezpośrednio podaje miejsce mówiącego. I stoi pierwsze, a am łączy tę osobę z here bez dodatkowego przyimka." },
  }),
  "You are here.": L({
    ru: { meaning: "Ты здесь.", explanation: "You are here. подтверждает место собеседника. С you используется are, а here завершает сообщение о текущем месте без at, in или on." },
    uk: { meaning: "Ти тут.", explanation: "You are here. підтверджує місце співрозмовника. З you вживається are, а here завершує повідомлення про поточне місце без at, in чи on." },
    es: { meaning: "Estás aquí.", explanation: "You are here. confirma la ubicación del interlocutor. You requiere are y here completa el lugar actual sin at, in ni on." },
    "pt-BR": { meaning: "Você está aqui.", explanation: "You are here. confirma a localização do interlocutor. You pede are e here completa o lugar atual sem at, in ou on." },
    vi: { meaning: "Bạn ở đây.", explanation: "You are here. xác nhận vị trí của người nghe. You đi với are, còn here hoàn tất địa điểm hiện tại mà không thêm at, in hay on." },
    id: { meaning: "Kamu di sini.", explanation: "You are here. menegaskan lokasi lawan bicara. You memakai are dan here melengkapi tempat saat ini tanpa at, in, atau on." },
    tr: { meaning: "Buradasın.", explanation: "You are here. karşıdaki kişinin yerini doğrular. You, are biçimini alır; here ise at, in ya da on olmadan mevcut yeri tamamlar." },
    pl: { meaning: "Jesteś tutaj.", explanation: "You are here. potwierdza miejsce rozmówcy. You łączy się z are, a here kończy informację o miejscu bez at, in ani on." },
  }),
  "Are you here?": L({
    ru: { meaning: "Ты здесь?", explanation: "Are you here? уточняет, находится ли собеседник рядом или в ожидаемом месте. Are выходит перед you, а here не требует предлога." },
    uk: { meaning: "Ти тут?", explanation: "Are you here? уточнює, чи перебуває співрозмовник поруч або в очікуваному місці. Are виходить перед you, а here не потребує прийменника." },
    es: { meaning: "¿Estás aquí?", explanation: "Are you here? comprueba si la otra persona está presente o en el lugar esperado. Are se coloca delante de you y here no necesita preposición." },
    "pt-BR": { meaning: "Você está aqui?", explanation: "Are you here? verifica se a outra pessoa está presente ou no lugar esperado. Are vem antes de you e here não precisa de preposição." },
    vi: { meaning: "Bạn có ở đây không?", explanation: "Are you here? kiểm tra người nghe có mặt tại nơi đang nói tới hay không. Are đứng trước you, còn here không cần thêm giới từ." },
    id: { meaning: "Apakah kamu di sini?", explanation: "Are you here? memeriksa apakah lawan bicara hadir di tempat yang dimaksud. Are berada sebelum you dan here tidak memerlukan preposisi." },
    tr: { meaning: "Burada mısın?", explanation: "Are you here? karşıdaki kişinin beklenen yerde olup olmadığını sorar. Are, you önüne gelir; here ayrıca bir edat istemez." },
    pl: { meaning: "Czy jesteś tutaj?", explanation: "Are you here? sprawdza, czy rozmówca jest obecny w oczekiwanym miejscu. Are stoi przed you, a here nie potrzebuje przyimka." },
  }),
  "I am not ready.": L({
    ru: { meaning: "Я не готов.", explanation: "I am not ready. прямо сообщает о неготовности говорящего. Not стоит после am и отрицает состояние ready, не меняя пару I am." },
    uk: { meaning: "Я не готовий.", explanation: "I am not ready. прямо повідомляє про неготовність мовця. Not стоїть після am і заперечує стан ready, не змінюючи пару I am." },
    es: { meaning: "No estoy listo.", explanation: "I am not ready. comunica que quien habla todavía no está preparado. Not aparece después de am y niega ready sin cambiar la pareja I am." },
    "pt-BR": { meaning: "Não estou pronto.", explanation: "I am not ready. informa que quem fala ainda não está preparado. Not vem depois de am e nega ready sem alterar a dupla I am." },
    vi: { meaning: "Tôi chưa sẵn sàng.", explanation: "I am not ready. cho biết người nói chưa sẵn sàng. Not đứng sau am để phủ định ready, trong khi cặp I am vẫn được giữ nguyên." },
    id: { meaning: "Saya belum siap.", explanation: "I am not ready. menyatakan bahwa penutur belum siap. Not berada setelah am dan menyangkal ready tanpa mengubah pasangan I am." },
    tr: { meaning: "Hazır değilim.", explanation: "I am not ready. konuşanın henüz hazır olmadığını bildirir. Not, am sonrasında ready durumunu olumsuz yapar; I am çifti değişmez." },
    pl: { meaning: "Nie jestem gotowy.", explanation: "I am not ready. informuje, że mówiący nie jest jeszcze gotowy. Not stoi po am i przeczy ready, nie zmieniając pary I am." },
  }),
  "You are not ready.": L({
    ru: { meaning: "Ты не готов.", explanation: "You are not ready. описывает неготовность собеседника. Are согласуется с you, а not после are отрицает только признак ready." },
    uk: { meaning: "Ти не готовий.", explanation: "You are not ready. описує неготовність співрозмовника. Are узгоджується з you, а not після are заперечує лише ознаку ready." },
    es: { meaning: "No estás listo.", explanation: "You are not ready. describe que el interlocutor no está preparado. Are concuerda con you y not, colocado después, niega únicamente ready." },
    "pt-BR": { meaning: "Você não está pronto.", explanation: "You are not ready. descreve que o interlocutor não está preparado. Are concorda com you e not, logo depois, nega apenas ready." },
    vi: { meaning: "Bạn chưa sẵn sàng.", explanation: "You are not ready. nói rằng người nghe chưa sẵn sàng. Are đi đúng với you, còn not đứng sau are để phủ định riêng trạng thái ready." },
    id: { meaning: "Kamu belum siap.", explanation: "You are not ready. menyatakan bahwa lawan bicara belum siap. Are sesuai dengan you dan not setelah are menyangkal keadaan ready." },
    tr: { meaning: "Hazır değilsin.", explanation: "You are not ready. karşıdaki kişinin hazır olmadığını anlatır. Are, you ile eşleşir; ardından gelen not yalnız ready durumunu olumsuzlar." },
    pl: { meaning: "Nie jesteś gotowy.", explanation: "You are not ready. opisuje brak gotowości rozmówcy. Are pasuje do you, a stojące po nim not przeczy wyłącznie stanowi ready." },
  }),
  "I am cold.": L({
    ru: { meaning: "Мне холодно.", explanation: "I am cold. говорит об ощущении холода у самого говорящего. Английский называет человека через I am, хотя по-русски естественно сказать «мне»." },
    uk: { meaning: "Мені холодно.", explanation: "I am cold. говорить про відчуття холоду в самого мовця. Англійська називає людину через I am, хоча українською природно сказати «мені»." },
    es: { meaning: "Tengo frío.", explanation: "I am cold. expresa que quien habla siente frío. El inglés construye el estado con I am, aunque en español la expresión natural usa tener." },
    "pt-BR": { meaning: "Estou com frio.", explanation: "I am cold. expresa que quem fala sente frio. O inglês constrói o estado com I am, enquanto o português natural usa estar com frio." },
    vi: { meaning: "Tôi thấy lạnh.", explanation: "I am cold. diễn tả cảm giác lạnh của người nói. Tiếng Anh dùng I am để gắn người với trạng thái, còn tiếng Việt thường thêm ý “cảm thấy”." },
    id: { meaning: "Saya kedinginan.", explanation: "I am cold. menyatakan bahwa penutur merasa dingin. Bahasa Inggris memakai I am untuk menghubungkan orang dengan keadaan cold." },
    tr: { meaning: "Üşüyorum.", explanation: "I am cold. konuşanın soğuk hissettiğini anlatır. İngilizce bu durumu I am ile kurar; Türkçede doğal karşılık tek bir çekimli fiildir." },
    pl: { meaning: "Jest mi zimno.", explanation: "I am cold. mówi o odczuciu chłodu przez mówiącego. Angielski używa I am, choć po polsku naturalna konstrukcja zaczyna się od „jest mi”." },
  }),
  "I am warm.": L({
    ru: { meaning: "Мне тепло.", explanation: "I am warm. сообщает, что говорящему тепло. I am связывает человека с ощущением warm; это не описание погоды и не противоположное cold." },
    uk: { meaning: "Мені тепло.", explanation: "I am warm. повідомляє, що мовцеві тепло. I am пов’язує людину з відчуттям warm; це не опис погоди й не протилежне cold." },
    es: { meaning: "Tengo calor.", explanation: "I am warm. indica que quien habla siente calor agradable. I am enlaza a la persona con warm; no describe el tiempo ni significa cold." },
    "pt-BR": { meaning: "Estou aquecido.", explanation: "I am warm. indica que quem fala sente calor. I am liga a pessoa a warm; não descreve o clima nem expressa o contrário cold." },
    vi: { meaning: "Tôi thấy ấm.", explanation: "I am warm. cho biết người nói đang cảm thấy ấm. I am nối người với trạng thái warm; câu này không tả thời tiết và không mang nghĩa cold." },
    id: { meaning: "Saya merasa hangat.", explanation: "I am warm. menyatakan bahwa penutur merasa hangat. I am menghubungkan orang dengan warm; kalimat ini bukan cuaca dan bukan cold." },
    tr: { meaning: "İçim sıcak.", explanation: "I am warm. konuşanın sıcaklık hissettiğini bildirir. I am kişiyi warm durumuna bağlar; bu bir hava anlatımı ya da cold anlamı değildir." },
    pl: { meaning: "Jest mi ciepło.", explanation: "I am warm. informuje, że mówiącemu jest ciepło. I am łączy osobę ze stanem warm; nie jest to opis pogody ani znaczenie cold." },
  }),
  "Are you on the bus?": L({
    ru: { meaning: "Ты в автобусе?", explanation: "Are you on the bus? уточняет, едет ли собеседник на автобусе или находится в нём. В готовом английском сочетании используется on the bus, не in и не at." },
    uk: { meaning: "Ти в автобусі?", explanation: "Are you on the bus? уточнює, чи їде співрозмовник автобусом або перебуває в ньому. У готовому англійському поєднанні вживається on the bus, не in і не at." },
    es: { meaning: "¿Estás en el autobús?", explanation: "Are you on the bus? pregunta si el interlocutor está viajando o se encuentra en el autobús. La combinación inglesa fija es on the bus, no in ni at." },
    "pt-BR": { meaning: "Você está no ônibus?", explanation: "Are you on the bus? pergunta se o interlocutor está viajando ou se encontra no ônibus. A combinação inglesa fixa é on the bus, não in nem at." },
    vi: { meaning: "Bạn đang ở trên xe buýt à?", explanation: "Are you on the bus? hỏi người nghe có đang đi hoặc ở trên xe buýt hay không. Cụm tiếng Anh cố định là on the bus, không dùng in hay at." },
    id: { meaning: "Apakah kamu sedang di bus?", explanation: "Are you on the bus? menanyakan apakah lawan bicara sedang naik atau berada di bus. Gabungan Inggris yang tepat ialah on the bus, bukan in atau at." },
    tr: { meaning: "Otobüste misin?", explanation: "Are you on the bus? karşıdaki kişinin otobüste yolculuk edip etmediğini sorar. İngilizcede yerleşik bütün on the bus biçimidir; in ya da at kullanılmaz." },
    pl: { meaning: "Czy jesteś w autobusie?", explanation: "Are you on the bus? pyta, czy rozmówca jedzie autobusem lub w nim przebywa. Ustalonym angielskim połączeniem jest on the bus, nie in ani at." },
  }),
});

export const EPISODE_01_SESSION_16_EDITORIAL_COPY_V1: Readonly<
  Record<string, Readonly<Record<Locale, PhraseCopy>>>
> = Object.freeze({
  ...NEW_COPY,
  "Am I here?": EPISODE_01_SESSION_12_EDITORIAL_COPY_V1["Am I here?"]!,
  "You’re here.": EPISODE_01_SESSION_13_EDITORIAL_COPY_V1["You’re here."]!,
  "Are you ready?": EPISODE_01_SESSION_15_EDITORIAL_COPY_V1["Are you ready?"]!,
  "Am I ready?": EPISODE_01_SESSION_12_EDITORIAL_COPY_V1["Am I ready?"]!,
  "You’re not ready.": EPISODE_01_SESSION_13_EDITORIAL_COPY_V1["You’re not ready."]!,
  "Am I okay?": EPISODE_01_SESSION_12_EDITORIAL_COPY_V1["Am I okay?"]!,
  "You’re all right.": EPISODE_01_SESSION_13_EDITORIAL_COPY_V1["You’re all right."]!,
});
