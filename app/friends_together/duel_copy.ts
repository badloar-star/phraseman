/**
 * «Дуэль на 5 фраз» (идея 3) — тексты на 9 языках: вызов, ожидание, вызов у друга, итог.
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html, идея 3): одно место для текстов дуэли. Имена не склоняем
 * («Дуэль с Ириной» нельзя собрать для любого имени) — имя стоит под монетой, а в тексте — «друг». Род неизвестен — безлично.
 * Черновик — на сверку Переводчику.
 */
import { triLang, type Lang } from '../../constants/i18n';
import type { DuelOutcome } from './duel_core';

type L9 = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;
const L = (ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string): L9 =>
  ({ ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
const pick = (lang: Lang, copy: L9): string => triLang(lang, copy);

const COPY = {
  title: L('Дуэль на 5 фраз', 'Дуель на 5 фраз', '5-phrase duel', 'Duelo de 5 frases', 'Duelo de 5 frases', 'Đấu 5 câu', 'Duel 5 frasa', '5 cümle düellosu', 'Pojedynek na 5 fraz'),
  challengeBody: L(
    'Собери пять фраз точнее и быстрее. Ты ходишь первым, друг — когда откроет вызов.',
    'Збери п’ять фраз точніше й швидше. Ти ходиш першим, друг — коли відкриє виклик.',
    'Build five phrases faster and more accurately than your friend. You go first; they play when they open the challenge.',
    'Arma cinco frases con más precisión y rapidez. Empiezas tú; tu amigo juega al abrir el desafío.',
    'Monte cinco frases com mais precisão e rapidez. Você começa; seu amigo joga ao abrir o desafio.',
    'Ghép năm câu chính xác và nhanh hơn. Bạn đi trước, bạn của bạn chơi khi mở lời thách đấu.',
    'Susun lima frasa lebih tepat dan cepat. Kamu main duluan, temanmu main saat membuka tantangan.',
    'Beş cümleyi daha doğru ve hızlı kur. İlk sen oynarsın, arkadaşın düello davetini açınca oynar.',
    'Ułóż pięć fraz dokładniej i szybciej. Zaczynasz ty, znajomy gra, gdy otworzy wyzwanie.',
  ),
  start: L('Начать дуэль', 'Почати дуель', 'Start duel', 'Empezar duelo', 'Começar duelo', 'Bắt đầu đấu', 'Mulai duel', 'Düelloya başla', 'Zacznij pojedynek'),
  freeNote: L('Без энергии · три вызова в день', 'Без енергії · три виклики на день', 'Costs no energy · three challenges a day', 'No gasta energía · tres desafíos al día', 'Não gasta energia · três desafios por dia', 'Không tốn năng lượng · ba lời thách mỗi ngày', 'Tidak pakai energi · tiga tantangan per hari', 'Enerji gerekmez · günde üç düello', 'Nie zużywa energii · trzy wyzwania dziennie'),
  later: L('Позже', 'Пізніше', 'Later', 'Más tarde', 'Mais tarde', 'Để sau', 'Nanti', 'Sonra', 'Później'),
  otherLanguage: L('Дуэль — когда учите один язык', 'Дуель — коли вчите одну мову', 'Duels need the same language', 'Los duelos son para el mismo idioma', 'Duelos são para o mesmo idioma', 'Đấu khi hai bạn học cùng một ngôn ngữ', 'Duel untuk yang belajar bahasa yang sama', 'Düello aynı dili öğrenenler için', 'Pojedynek — gdy uczycie się tego samego języka'),
  notEnough: L('Пока мало пройденных фраз', 'Поки мало пройдених фраз', 'Not enough phrases learned yet', 'Aún hay pocas frases aprendidas', 'Ainda há poucas frases aprendidas', 'Chưa đủ câu đã học', 'Frasa yang dipelajari masih sedikit', 'Henüz yeterince cümle öğrenilmedi', 'Na razie za mało przerobionych fraz'),
  limit: L('Сегодня уже три вызова', 'Сьогодні вже три виклики', 'You’ve sent three challenges today', 'Hoy ya enviaste tres desafíos', 'Hoje você já enviou três desafios', 'Hôm nay đã gửi ba lời thách', 'Hari ini sudah tiga tantangan', 'Bugün zaten üç düello başlattın', 'Dziś już trzy wyzwania'),
  openDuel: L('Дуэль с другом уже идёт', 'Дуель з другом уже триває', 'A duel is already on', 'Ya hay un duelo en curso', 'Já há um duelo em andamento', 'Đang có một trận đấu', 'Duel sedang berlangsung', 'Zaten bir düello var', 'Pojedynek już trwa'),
  inviteToLesson: L('Позвать на занятие', 'Покликати на заняття', 'Invite to a session', 'Invitar a una sesión', 'Convidar para uma sessão', 'Rủ học cùng', 'Ajak ke sesi', 'Oturuma çağır', 'Zaproś na zajęcia'),
  sentTitle: L('Ход отправлен', 'Хід надіслано', 'Move sent', 'Jugada enviada', 'Jogada enviada', 'Đã gửi lượt', 'Giliran terkirim', 'Hamle gönderildi', 'Ruch wysłany'),
  sentBody: L('У друга сутки. Напишем, когда будет итог.', 'У друга доба. Напишемо, коли буде підсумок.', 'Your friend has 24 hours. We’ll tell you the result.', 'Tu amigo tiene 24 horas. Te avisaremos del resultado.', 'Seu amigo tem 24 horas. Avisaremos o resultado.', 'Bạn của bạn có 24 giờ. Mình sẽ báo kết quả cho bạn.', 'Temanmu punya 24 jam. Kami kabari hasilnya.', 'Arkadaşının 24 saati var. Sonucu bildireceğiz.', 'Znajomy ma dobę. Damy znać o wyniku.'),
  offlineTitle: L('Ход готов', 'Хід готовий', 'Move ready', 'Jugada lista', 'Jogada pronta', 'Lượt đã sẵn sàng', 'Giliran siap', 'Hamle hazır', 'Ruch gotowy'),
  offlineBody: L('Как только телефон выйдет в сеть, друг получит вызов.', 'Щойно телефон вийде в мережу, друг отримає виклик.', 'Your friend gets the challenge as soon as you’re back online.', 'Tu amigo recibirá el desafío en cuanto haya conexión.', 'Seu amigo receberá o desafio assim que houver conexão.', 'Bạn của bạn sẽ nhận lời thách khi có mạng.', 'Temanmu menerima tantangan begitu ada jaringan.', 'Bağlantı gelince arkadaşın düello davetini alır.', 'Znajomy dostanie wyzwanie, gdy tylko będzie sieć.'),
  offlineStrip: L('Ход сохранён на телефоне', 'Хід збережено на телефоні', 'Move saved on this phone', 'Jugada guardada en el teléfono', 'Jogada salva no telefone', 'Lượt đã lưu trên điện thoại', 'Giliran tersimpan di ponsel', 'Hamle telefonda kayıtlı', 'Ruch zapisany w telefonie'),
  toFriends: L('К друзьям', 'До друзів', 'Back to friends', 'Volver a amigos', 'Voltar aos amigos', 'Về bạn bè', 'Ke teman', 'Arkadaşlara dön', 'Do znajomych'),
  incomingBody: L(
    'Пять фраз из уроков, которые вы оба прошли. Счёт друга откроется после твоего хода.',
    'П’ять фраз з уроків, які ви обоє пройшли. Рахунок друга відкриється після твого ходу.',
    'Five phrases from lessons you’ve both done. Your friend’s score shows after your move.',
    'Cinco frases de lecciones que ambos hicieron. La puntuación de tu amigo se verá tras tu jugada.',
    'Cinco frases de lições que vocês dois fizeram. A pontuação do amigo aparece após sua jogada.',
    'Năm câu từ các bài cả hai đã học. Điểm của bạn ấy hiện sau lượt của bạn.',
    'Lima frasa dari pelajaran yang sudah kalian ikuti. Skor temanmu terlihat setelah giliranmu.',
    'İkinizin de bitirdiği derslerden beş cümle. Arkadaşının puanı senin hamlenden sonra görünür.',
    'Pięć fraz z lekcji, które oboje przerobiliście. Wynik znajomego zobaczysz po swoim ruchu.',
  ),
  accept: L('Принять', 'Прийняти', 'Accept', 'Aceptar', 'Aceitar', 'Nhận', 'Terima', 'Kabul et', 'Przyjmij'),
  decline: L('Отказаться', 'Відмовитися', 'Decline', 'Rechazar', 'Recusar', 'Từ chối', 'Tolak', 'Reddet', 'Odrzuć'),
  win: L('Победа', 'Перемога', 'Victory', 'Victoria', 'Vitória', 'Chiến thắng', 'Menang', 'Zafer', 'Zwycięstwo'),
  loss: L('Победа друга', 'Перемога друга', 'Your friend won', 'Ganó tu amigo', 'Seu amigo venceu', 'Bạn ấy thắng', 'Temanmu menang', 'Arkadaşın kazandı', 'Wygrana znajomego'),
  draw: L('Ничья', 'Нічия', 'Draw', 'Empate', 'Empate', 'Hòa', 'Seri', 'Berabere', 'Remis'),
  rematch: L('Реванш', 'Реванш', 'Rematch', 'Revancha', 'Revanche', 'Đấu lại', 'Tanding ulang', 'Rövanş', 'Rewanż'),
  phrase: L('Фраза', 'Фраза', 'Phrase', 'Frase', 'Frase', 'Câu', 'Frasa', 'Cümle', 'Fraza'),
  you: L('Ты', 'Ти', 'You', 'Tú', 'Você', 'Bạn', 'Kamu', 'Sen', 'Ty'),
  friend: L('Друг', 'Друг', 'Friend', 'Amigo', 'Amigo', 'Bạn ấy', 'Teman', 'Arkadaş', 'Znajomy'),
  versus: L('против', 'проти', 'vs', 'contra', 'contra', 'đấu', 'lawan', 'karşı', 'przeciw'),
  sentMid: L('ход отправлен', 'хід надіслано', 'move sent', 'jugada enviada', 'jogada enviada', 'đã gửi lượt', 'giliran terkirim', 'hamle gönderildi', 'ruch wysłany'),
  resultMid: L('итог', 'підсумок', 'result', 'resultado', 'resultado', 'kết quả', 'hasil', 'sonuç', 'wynik'),
} as const;

export type DuelCopyKey = keyof typeof COPY;
export const duelCopy = (lang: Lang, key: DuelCopyKey): string => pick(lang, COPY[key]);

/** Факты вызова: «5 · фраз», «24 ч · на ответ», «0 · энергии»; у друга — «N ч · осталось». */
export function duelFacts(lang: Lang, hoursLeft: number | null): readonly Readonly<{ value: string; label: string }>[] {
  const hour = pick(lang, L('ч', 'год', 'h', 'h', 'h', 'giờ', 'jam', 'sa', 'godz.'));
  return [
    { value: '5', label: pick(lang, L('фраз', 'фраз', 'phrases', 'frases', 'frases', 'câu', 'frasa', 'cümle', 'fraz')) },
    hoursLeft === null
      ? { value: `24 ${hour}`, label: pick(lang, L('на ответ', 'на відповідь', 'to answer', 'para responder', 'para responder', 'để trả lời', 'untuk menjawab', 'yanıt için', 'na odpowiedź')) }
      : { value: `${hoursLeft} ${hour}`, label: pick(lang, L('осталось', 'залишилось', 'left', 'quedan', 'restantes', 'còn lại', 'tersisa', 'kaldı', 'zostało')) },
    { value: '0', label: pick(lang, L('энергии', 'енергії', 'energy', 'energía', 'energia', 'năng lượng', 'energi', 'enerji', 'energii')) },
  ];
}

/** «{Имя} вызывает на дуэль» — имя в именительном, склонять не нужно. */
export function duelIncomingTitle(lang: Lang, name: string): string {
  return pick(lang, L(`${name} вызывает на дуэль`, `${name} викликає на дуель`, `${name} challenges you to a duel`, `${name} te reta a un duelo`, `${name} te desafia para um duelo`, `${name} thách bạn đấu`, `${name} menantangmu duel`, `${name} seni düelloya çağırıyor`, `${name} wyzywa cię na pojedynek`));
}

/** Строка под итогом: что решило дуэль. Время — «0:48». */
export function duelOutcomeLine(lang: Lang, outcome: DuelOutcome, mineCorrect: number, theirsCorrect: number, mineMs: number, theirsMs: number): string {
  // зачем: сначала округляем до секунд, потом делим — иначе 59,6 с превращались бы в «0:60»
  const clock = (ms: number) => {
    const total = Math.round(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };
  if (outcome === 'draw') {
    return pick(lang, L('Одинаково точно и одинаково быстро.', 'Однаково точно й однаково швидко.', 'Same accuracy, same time.', 'Misma precisión, mismo tiempo.', 'Mesma precisão, mesmo tempo.', 'Chính xác như nhau, nhanh như nhau.', 'Sama tepat, sama cepat.', 'Aynı doğruluk, aynı süre.', 'Ta sama dokładność i ten sam czas.'));
  }
  const m = mineCorrect;
  const t = theirsCorrect;
  if (m !== t) {
    return outcome === 'win'
      ? pick(lang, L(`Точность решила: ${m} из 5 против ${t}.`, `Точність вирішила: ${m} з 5 проти ${t}.`, `Accuracy decided it: ${m} of 5 vs ${t}.`, `Decidió la precisión: ${m} de 5 contra ${t}.`, `A precisão decidiu: ${m} de 5 contra ${t}.`, `Độ chính xác quyết định: ${m}/5 so với ${t}.`, `Ketepatan menentukan: ${m} dari 5 lawan ${t}.`, `Doğruluk belirledi: sen ${m}/5, arkadaşın ${t}/5.`, `Zdecydowała dokładność: ${m} z 5 wobec ${t}.`))
      : pick(lang, L(`${m} из 5 — разберём ошибки и возьмём реванш.`, `${m} з 5 — розберемо помилки й візьмемо реванш.`, `${m} of 5 — review the mistakes and take a rematch.`, `${m} de 5: repasa los errores y pide revancha.`, `${m} de 5: revise os erros e peça revanche.`, `${m}/5 — xem lại lỗi rồi đấu lại.`, `${m} dari 5 — tinjau kesalahan lalu tanding ulang.`, `5'te ${m} — hataları gözden geçir, rövanş al.`, `${m} z 5 — przejrzyj błędy i weź rewanż.`));
  }
  return pick(lang, L(
    `Точность равная — решило время: ${clock(mineMs)} против ${clock(theirsMs)}.`, `Точність рівна — вирішив час: ${clock(mineMs)} проти ${clock(theirsMs)}.`,
    `Same accuracy — time decided it: ${clock(mineMs)} vs ${clock(theirsMs)}.`, `Misma precisión: decidió el tiempo, ${clock(mineMs)} contra ${clock(theirsMs)}.`,
    `Mesma precisão: o tempo decidiu, ${clock(mineMs)} contra ${clock(theirsMs)}.`, `Chính xác như nhau — thời gian quyết định: ${clock(mineMs)} so với ${clock(theirsMs)}.`,
    `Sama tepat — waktu menentukan: ${clock(mineMs)} lawan ${clock(theirsMs)}.`, `Doğruluk eşit — süre belirledi: sen ${clock(mineMs)}, arkadaşın ${clock(theirsMs)}.`,
    `Równa dokładność — zdecydował czas: ${clock(mineMs)} wobec ${clock(theirsMs)}.`,
  ));
}

/** «Разобрать ошибку / ошибки». */
export function duelReviewLabel(lang: Lang, mistakes: number): string {
  return mistakes === 1
    ? pick(lang, L('Разобрать ошибку', 'Розібрати помилку', 'Review the mistake', 'Repasar el error', 'Revisar o erro', 'Xem lại lỗi', 'Tinjau kesalahan', 'Hatayı incele', 'Przejrzyj błąd'))
    : pick(lang, L('Разобрать ошибки', 'Розібрати помилки', 'Review mistakes', 'Repasar errores', 'Revisar erros', 'Xem lại các lỗi', 'Tinjau kesalahan', 'Hataları incele', 'Przejrzyj błędy'));
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
