import { triLang } from '../constants/i18n';
import type { FeatureIntroDef } from './feature_intro_registry';

const choosePacks: FeatureIntroDef['ctaLabel'] = lang => triLang(lang, {
  ru: 'Выбрать наборы', uk: 'Вибрати набори', en: 'Choose packs', es: 'Elegir packs', 'pt-BR': 'Escolher pacotes',
  vi: 'Chọn bộ thẻ', id: 'Pilih paket', tr: 'Paket seç', pl: 'Wybierz zestawy',
});
/** Introductions happen before starting a session, never in front of a paywall. */
export const TRAINING_FEATURE_INTROS: readonly FeatureIntroDef[] = [{
  id: 'training_listening_first_visit', trigger: 'first_visit', screenRoute: '/flashcards_training_setup?mode=listening', family: 'orbit', art: 'training_listening', icon: 'headset', ctaLabel: choosePacks,
  title: lang => triLang(lang, { ru: 'Сначала — услышать', uk: 'Спершу — почути', en: 'Hear it first', es: 'Primero, escuchar', 'pt-BR': 'Primeiro, escutar', vi: 'Nghe trước đã', id: 'Dengar dulu', tr: 'Önce duymak', pl: 'Najpierw usłysz' }),
  body: lang => triLang(lang, {
    ru: 'Здесь фраза звучит, а ты учишься узнавать её на слух. Выбери наборы, слушай столько раз, сколько нужно, и двигайся в своём темпе — это не экзамен, а тренировка слуха.',
    uk: 'Тут фраза звучить, а ти вчишся впізнавати її на слух. Вибери набори, слухай стільки разів, скільки потрібно, і рухайся у своєму темпі — це не іспит, а тренування слуху.',
    en: 'Here, a phrase plays and you learn to recognise it by ear. Choose your packs, listen as many times as you need, and move at your own pace — this is listening practice, not an exam.',
    es: 'Aquí suena una frase y aprendes a reconocerla de oído. Elige tus packs, escucha las veces que necesites y avanza a tu ritmo: es práctica de escucha, no un examen.',
    'pt-BR': 'Aqui uma frase toca e você aprende a reconhecê-la de ouvido. Escolha seus pacotes, ouça quantas vezes precisar e siga no seu ritmo — é prática de escuta, não uma prova.',
    vi: 'Ở đây bạn nghe một câu và học cách nhận ra câu đó bằng tai. Hãy chọn bộ thẻ, nghe lại bao nhiêu lần tùy cần và đi theo nhịp của mình — đây là luyện nghe, không phải bài kiểm tra.',
    id: 'Di sini sebuah frasa diputar dan kamu belajar mengenalinya lewat pendengaran. Pilih paketmu, dengarkan sebanyak yang kamu perlu, lalu lanjut dengan ritmemu sendiri — ini latihan mendengar, bukan ujian.',
    tr: 'Burada bir cümle çalar; onu kulaktan tanımayı öğrenirsin. Paketlerini seç, ihtiyacın kadar dinle ve kendi hızında ilerle — bu bir sınav değil, dinleme pratiği.',
    pl: 'Tutaj usłyszysz frazę i nauczysz się rozpoznawać ją ze słuchu. Wybierz zestawy, słuchaj tyle razy, ile potrzebujesz, i idź swoim tempem — to trening słuchania, nie egzamin.',
  }),
}, {
  id: 'training_speaking_first_visit', trigger: 'first_visit', screenRoute: '/flashcards_training_setup?mode=speaking', family: 'orbit', art: 'training_speaking', icon: 'mic', ctaLabel: choosePacks,
  title: lang => triLang(lang, { ru: 'Теперь твой голос', uk: 'Тепер твій голос', en: 'Your voice, your turn', es: 'Ahora, tu voz', 'pt-BR': 'Agora, sua voz', vi: 'Đến lượt giọng của bạn', id: 'Kini giliran suaramu', tr: 'Şimdi sıra sesinde', pl: 'Teraz twój głos' }),
  body: lang => triLang(lang, {
    ru: 'Вспоминай фразу по переводу или слушай и повторяй. Зажми микрофон, пока говоришь, и отпусти, когда закончишь. Здесь можно пробовать — идеальный дубль с первого раза не требуется.',
    uk: 'Пригадуй фразу за перекладом або слухай і повторюй. Утримуй мікрофон, поки говориш, і відпусти, коли закінчиш. Ідеальний дубль із першої спроби не потрібен.',
    en: 'Recall a phrase from its translation, or listen and repeat. Hold the microphone while speaking, then release it. You can try things out here; a perfect first take is not required.',
    es: 'Recuerda la frase a partir de su traducción o escucha y repite. Mantén pulsado el micrófono mientras hablas y suéltalo al terminar. No necesitas una primera toma perfecta.',
    'pt-BR': 'Lembre a frase pela tradução ou ouça e repita. Segure o microfone enquanto fala e solte ao terminar. Não precisa acertar tudo na primeira tentativa.',
    vi: 'Nhớ lại câu từ bản dịch hoặc nghe và nhắc lại. Giữ nút mic khi nói rồi thả ra khi xong. Không cần hoàn hảo ngay lần đầu.',
    id: 'Ingat frasa dari terjemahannya, atau dengarkan lalu ulangi. Tahan mikrofon saat berbicara, lalu lepaskan. Percobaan pertama tidak harus sempurna.',
    tr: 'Çeviriden cümleyi hatırla veya dinleyip tekrarla. Konuşurken mikrofona basılı tut, bitirince bırak. İlk denemenin kusursuz olması gerekmiyor.',
    pl: 'Przypomnij sobie frazę z tłumaczenia albo posłuchaj i powtórz. Przytrzymaj mikrofon, gdy mówisz, i puść po zakończeniu. Pierwsza próba nie musi być idealna.',
  }),
}, {
  id: 'training_blitz_first_visit', trigger: 'first_visit', screenRoute: '/flashcards_training_setup?mode=blitz', family: 'orbit', art: 'training_blitz', icon: 'flash', ctaLabel: choosePacks,
  title: lang => triLang(lang, { ru: 'Фразы на быстром старте', uk: 'Фрази на швидкому старті', en: 'A quick start for your phrases', es: 'Un arranque rápido', 'pt-BR': 'Frases em ritmo rápido', vi: 'Khởi động nhanh với các câu', id: 'Mulai cepat dengan frasa', tr: 'Cümlelerle hızlı başlangıç', pl: 'Szybki start z frazami' }),
  body: lang => triLang(lang, {
    ru: 'Выбирай ответ из вариантов и проверяй, что уже вспоминается без долгих раздумий. Для блица нужны хотя бы 4 карточки: из них собираются варианты. Сначала выбери наборы — гонка ещё не началась.',
    uk: 'Вибирай відповідь із варіантів і перевіряй, що вже пригадується швидко. Для бліцу потрібні хоча б 4 картки: з них складаються варіанти. Спочатку вибери набори — перегони ще не почалися.',
    en: 'Choose an answer and see what you can recall quickly. Blitz needs at least 4 cards to build the answer choices. Pick your packs first; the race has not started yet.',
    es: 'Elige una respuesta y comprueba qué recuerdas rápidamente. Blitz necesita al menos 4 tarjetas para crear las opciones. Primero elige los packs; la carrera aún no empieza.',
    'pt-BR': 'Escolha uma resposta e veja o que já lembra rapidamente. O Blitz precisa de pelo menos 4 cartões para montar as opções. Escolha os pacotes primeiro; a corrida ainda não começou.',
    vi: 'Chọn đáp án và xem bạn nhớ nhanh được gì. Blitz cần ít nhất 4 thẻ để tạo các lựa chọn. Hãy chọn bộ thẻ trước; cuộc đua chưa bắt đầu.',
    id: 'Pilih jawaban dan lihat yang bisa kamu ingat dengan cepat. Blitz perlu minimal 4 kartu untuk membuat pilihan jawaban. Pilih paket dulu; balapannya belum dimulai.',
    tr: 'Bir cevap seç ve neleri hızlıca hatırladığını gör. Blitz, seçenekleri oluşturmak için en az 4 kart ister. Önce paketlerini seç; yarış henüz başlamadı.',
    pl: 'Wybierz odpowiedź i sprawdź, co szybko pamiętasz. Blitz potrzebuje co najmniej 4 kart do utworzenia opcji. Najpierw wybierz zestawy; wyścig jeszcze się nie zaczął.',
  }),
}];
