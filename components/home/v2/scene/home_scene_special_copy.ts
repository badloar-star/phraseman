// ═══════════════════════════════════════════════════════════════════════════
// home_scene_special_copy.ts — тексты 12 особых сцен Главной (тот же вид HomeSceneCopy, что у обычного героя).
//
// зачем (владелец 25.10 утвердил макет docs/design/v2-app/home-new-states.html, спецификация
// docs/work/tasks/home-scene-new-states-spec-2026-10-25.md): RU — из макета; где макет говорил с родом («Ты сказал», «Аня прошла»),
// фраза переписана без рода (замок «без рода» в приветствиях, координатор 22.10). Без «кухни»: ни слова о журналах и графиках.
// Переводы кроме RU — черновик для 10 · ПЕРЕВОДЧИКА.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../../../constants/i18n';
import type { HomeSceneCopy } from './home_scene_copy';
import type { HomeSceneSpecialState } from './home_scene_special';

/** Данные сцены — всё уже посчитано Главной из телефона. Нет нужного числа — сцена не выбирается (см. модель). */
export type HomeSceneSpecialCopyInput = Readonly<{
  lang: Lang;
  special: HomeSceneSpecialState;
  /** Главное число сцены: ошибки, слова, фразы, уроки друга. */
  n?: number;
  /** Рекорд дня и сделано сегодня (personal_best). */
  best?: number;
  today?: number;
  /** Имя взаимного друга (friend_nudge). */
  friendName?: string;
  /** Место в комнате было → стало (peak_overtaken). */
  placeTo?: number;
  /** Фраза из журнала ошибок (mistake_poke / mistake_mastered) — верная. */
  right?: string;
  /** Фраза дня и перевод (phrase_of_day_unseen). */
  phrase?: string;
  phraseTr?: string;
  /** Праздник (holiday): ключ из HOME_SCENE_HOLIDAYS. */
  holiday?: string;
  /** Место продолжения, как у «Продолжить» (holiday, personal_best). */
  place?: string;
  /** Рубеж (milestone): 'phrases_100' | 'lessons_10' | 'rank_N'. */
  milestoneKey?: string;
  /** Итоги недели: дней с занятиями из 7. */
  weekDays?: number;
}>;

const ruPl = (n: number, one: string, few: string, many: string): string => {
  const a = Math.abs(n) % 100; const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
};
const plPl = (n: number, one: string, few: string, many: string): string => {
  if (n === 1) return one;
  const a = Math.abs(n) % 100; const b = a % 10;
  return b >= 2 && b <= 4 && (a < 12 || a > 14) ? few : many;
};
const en = (n: number, one: string, many: string): string => (n === 1 ? one : many);

const T = {
  myMistakes: (l: Lang) => triLang(l, { ru: 'Мои ошибки', uk: 'Мої помилки', en: 'My mistakes', es: 'Mis errores', 'pt-BR': 'Meus erros', vi: 'Lỗi của tôi', id: 'Kesalahanku', tr: 'Hatalarım', pl: 'Moje błędy' }),
  pileTitle: (l: Lang, n: number) => triLang(l, {
    ru: `Накопилось ${n} ${ruPl(n, 'ошибка', 'ошибки', 'ошибок')}`, uk: `Накопичилося ${n} ${ruPl(n, 'помилка', 'помилки', 'помилок')}`,
    en: `${n} ${en(n, 'mistake', 'mistakes')} piled up`, es: `Se juntaron ${n} errores`, 'pt-BR': `Juntaram-se ${n} erros`,
    vi: `Đã có ${n} lỗi cần xem lại`, id: `Sudah ada ${n} kesalahan`, tr: `${n} hata birikti`, pl: `Zebrało się ${n} ${plPl(n, 'błąd', 'błędy', 'błędów')}`,
  }),
  pileLine: (l: Lang) => triLang(l, { ru: 'Половину можно разобрать прямо сейчас', uk: 'Половину можна розібрати просто зараз', en: 'You can sort out half of them right now', es: 'Puedes repasar la mitad ahora mismo', 'pt-BR': 'Dá para revisar metade agora mesmo', vi: 'Có thể xem lại một nửa ngay bây giờ', id: 'Separuhnya bisa dibahas sekarang juga', tr: 'Yarısını hemen şimdi çözebilirsin', pl: 'Połowę możesz przejrzeć od razu' }),
  sortOut: (l: Lang) => triLang(l, { ru: 'Разобрать', uk: 'Розібрати', en: 'Review them', es: 'Repasar', 'pt-BR': 'Revisar', vi: 'Xem lại', id: 'Bahas', tr: 'Gözden geçir', pl: 'Przejrzyj' }),
  pokeKicker: (l: Lang) => triLang(l, { ru: 'Ошибка из твоего списка', uk: 'Помилка з твого списку', en: 'A mistake from your list', es: 'Un error de tu lista', 'pt-BR': 'Um erro da sua lista', vi: 'Một lỗi trong danh sách của bạn', id: 'Kesalahan dari daftarmu', tr: 'Listendeki bir hata', pl: 'Błąd z twojej listy' }),
  // зачем (координатор 25.10): в журнале ошибок хранится верная фраза, а не неверный ответ — сцена называет фразу, на которой споткнулся
  pokeTitle: (l: Lang) => triLang(l, { ru: 'Серьёзно? Снова эта фраза', uk: 'Серйозно? Знову цей вислів', en: 'Really? This one again', es: '¿En serio? Otra vez esta frase', 'pt-BR': 'Sério? Essa frase de novo', vi: 'Thật à? Lại câu này', id: 'Serius? Frasa ini lagi', tr: 'Cidden mi? Yine bu ifade', pl: 'Serio? Znowu ten zwrot' }),
  fix: (l: Lang) => triLang(l, { ru: 'Исправить', uk: 'Виправити', en: 'Fix it', es: 'Corregir', 'pt-BR': 'Corrigir', vi: 'Sửa lỗi', id: 'Perbaiki', tr: 'Düzelt', pl: 'Popraw' }),
  phraseKicker: (l: Lang) => triLang(l, { ru: 'Фраза дня', uk: 'Вислів дня', en: 'Phrase of the day', es: 'Frase del día', 'pt-BR': 'Frase do dia', vi: 'Cụm từ hôm nay', id: 'Frasa hari ini', tr: 'Günün ifadesi', pl: 'Fraza dnia' }),
  listen: (l: Lang) => triLang(l, { ru: 'Послушать', uk: 'Послухати', en: 'Listen', es: 'Escuchar', 'pt-BR': 'Ouvir', vi: 'Nghe', id: 'Dengarkan', tr: 'Dinle', pl: 'Posłuchaj' }),
  aboutYou: (l: Lang) => triLang(l, { ru: 'Про тебя', uk: 'Про тебе', en: 'About you', es: 'Sobre ti', 'pt-BR': 'Sobre você', vi: 'Về bạn', id: 'Tentang kamu', tr: 'Senin hakkında', pl: 'O tobie' }),
  // зачем (координатор 25.10): «фраз вслух» на телефоне не считается — берём выученные фразы
  phrasesLearned: (l: Lang, n: number) => triLang(l, {
    ru: `${n} ${ruPl(n, 'фраза выучена', 'фразы выучены', 'фраз выучено')}`, uk: `${n} ${ruPl(n, 'вислів вивчено', 'вислови вивчено', 'висловів вивчено')}`, en: `${n} ${en(n, 'phrase', 'phrases')} learned`,
    es: `${n} frases aprendidas`, 'pt-BR': `${n} frases aprendidas`, vi: `Đã học ${n} câu`, id: `${n} frasa dipelajari`, tr: `${n} ifade öğrenildi`, pl: `${n} ${plPl(n, 'zwrot opanowany', 'zwroty opanowane', 'zwrotów opanowanych')}`,
  }),
  everyDay: (l: Lang) => triLang(l, { ru: 'И каждая уже твоя', uk: 'І кожен уже твій', en: 'And every one is yours now', es: 'Y cada una ya es tuya', 'pt-BR': 'E cada uma já é sua', vi: 'Và câu nào cũng đã là của bạn', id: 'Dan semuanya sudah milikmu', tr: 'Ve hepsi artık senin', pl: 'I każdy jest już twój' }),
  myStats: (l: Lang) => triLang(l, { ru: 'Моя статистика', uk: 'Моя статистика', en: 'My stats', es: 'Mis estadísticas', 'pt-BR': 'Minhas estatísticas', vi: 'Thống kê của tôi', id: 'Statistikku', tr: 'İstatistiklerim', pl: 'Moje statystyki' }),
  milestoneKicker: (l: Lang) => triLang(l, { ru: 'Новый рубеж', uk: 'Новий рубіж', en: 'New milestone', es: 'Nuevo hito', 'pt-BR': 'Novo marco', vi: 'Cột mốc mới', id: 'Pencapaian baru', tr: 'Yeni eşik', pl: 'Nowy próg' }),
  phrasesBang: (l: Lang, n: number) => triLang(l, { ru: `${n} ${ruPl(n, 'фраза', 'фразы', 'фраз')}!`, uk: `${n} ${ruPl(n, 'вислів', 'вислови', 'висловів')}!`, en: `${n} phrases!`, es: `¡${n} frases!`, 'pt-BR': `${n} frases!`, vi: `${n} câu!`, id: `${n} frasa!`, tr: `${n} ifade!`, pl: `${n} ${plPl(n, 'zwrot', 'zwroty', 'zwrotów')}!` }),
  phrasebook: (l: Lang) => triLang(l, { ru: 'Это уже настоящий разговорник', uk: 'Це вже справжній розмовник', en: "That's a real phrasebook now", es: 'Ya es un verdadero libro de frases', 'pt-BR': 'Já é um guia de conversação de verdade', vi: 'Đã thành một cuốn sổ tay thật sự', id: 'Sudah jadi buku frasa sungguhan', tr: 'Artık gerçek bir konuşma kılavuzu', pl: 'To już prawdziwe rozmówki' }),
  lessonsBang: (l: Lang, n: number) => triLang(l, { ru: `${n} ${ruPl(n, 'урок', 'урока', 'уроков')}!`, uk: `${n} ${ruPl(n, 'урок', 'уроки', 'уроків')}!`, en: `${n} lessons!`, es: `¡${n} lecciones!`, 'pt-BR': `${n} lições!`, vi: `${n} bài học!`, id: `${n} pelajaran!`, tr: `${n} ders!`, pl: `${n} ${plPl(n, 'lekcja', 'lekcje', 'lekcji')}!` }),
  newRank: (l: Lang) => triLang(l, { ru: 'Новый ранг!', uk: 'Новий ранг!', en: 'New rank!', es: '¡Nuevo rango!', 'pt-BR': 'Nova patente!', vi: 'Hạng mới!', id: 'Peringkat baru!', tr: 'Yeni rütbe!', pl: 'Nowa ranga!' }),
  keepGoing: (l: Lang) => triLang(l, { ru: 'Так держать', uk: 'Так тримати', en: 'Keep it up', es: 'Sigue así', 'pt-BR': 'Continue assim', vi: 'Cứ thế phát huy', id: 'Pertahankan', tr: 'Böyle devam', pl: 'Tak trzymaj' }),
  look: (l: Lang) => triLang(l, { ru: 'Посмотреть', uk: 'Переглянути', en: 'Take a look', es: 'Ver', 'pt-BR': 'Ver', vi: 'Xem', id: 'Lihat', tr: 'Göz at', pl: 'Zobacz' }),
  // зачем (координатор 25.10, замена данных): рекорд — серии в днях (счётчики заданий дня в разных единицах)
  bestStreakKicker: (l: Lang, n: number) => triLang(l, {
    ru: `Твой рекорд серии — ${n} ${ruPl(n, 'день', 'дня', 'дней')}`, uk: `Твій рекорд серії — ${n} ${ruPl(n, 'день', 'дні', 'днів')}`, en: `Your best streak: ${n} ${en(n, 'day', 'days')}`,
    es: `Tu mejor racha: ${n} días`, 'pt-BR': `Sua melhor sequência: ${n} dias`, vi: `Chuỗi dài nhất của bạn: ${n} ngày`, id: `Runtunan terbaikmu: ${n} hari`, tr: `En iyi serin: ${n} gün`, pl: `Twoja najlepsza seria: ${n} ${plPl(n, 'dzień', 'dni', 'dni')}`,
  }),
  beatStreak: (l: Lang) => triLang(l, { ru: 'Побьёшь?', uk: 'Поб’єш?', en: 'Beat it?', es: '¿Lo superas?', 'pt-BR': 'Vai bater?', vi: 'Phá kỷ lục chứ?', id: 'Pecahkan?', tr: 'Geçer misin?', pl: 'Pobijesz?' }),
  bestKicker: (l: Lang, n: number) => triLang(l, {
    ru: `Твой рекорд — ${n} ${ruPl(n, 'задание', 'задания', 'заданий')}`, uk: `Твій рекорд — ${n} ${ruPl(n, 'завдання', 'завдання', 'завдань')}`, en: `Your record: ${n} ${en(n, 'task', 'tasks')}`,
    es: `Tu récord: ${n} tareas`, 'pt-BR': `Seu recorde: ${n} tarefas`, vi: `Kỷ lục của bạn: ${n} bài`, id: `Rekormu: ${n} tugas`, tr: `Rekorun: ${n} görev`, pl: `Twój rekord: ${n} ${plPl(n, 'zadanie', 'zadania', 'zadań')}`,
  }),
  beatIt: (l: Lang) => triLang(l, { ru: 'Побьёшь сегодня?', uk: 'Поб’єш сьогодні?', en: 'Beat it today?', es: '¿Lo superas hoy?', 'pt-BR': 'Vai bater hoje?', vi: 'Hôm nay phá kỷ lục chứ?', id: 'Pecahkan hari ini?', tr: 'Bugün geçer misin?', pl: 'Pobijesz dziś?' }),
  of: (l: Lang, d: number, t: number) => triLang(l, { ru: `${d} из ${t}`, uk: `${d} з ${t}`, en: `${d} of ${t}`, es: `${d} de ${t}`, 'pt-BR': `${d} de ${t}`, vi: `${d}/${t}`, id: `${d} dari ${t}`, tr: `${d}/${t}`, pl: `${d} z ${t}` }),
  cont: (l: Lang) => triLang(l, { ru: 'Продолжить', uk: 'Продовжити', en: 'Continue', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' }),
  cards: (l: Lang) => triLang(l, { ru: 'Карточки', uk: 'Картки', en: 'Cards', es: 'Tarjetas', 'pt-BR': 'Cartões', vi: 'Thẻ học', id: 'Kartu', tr: 'Kartlar', pl: 'Karty' }),
  wordsDue: (l: Lang, n: number) => triLang(l, {
    ru: `${n} ${ruPl(n, 'слово просится', 'слова просятся', 'слов просятся')} на повтор`, uk: `${n} ${ruPl(n, 'слово проситься', 'слова просяться', 'слів просяться')} на повторення`,
    en: `${n} ${en(n, 'word wants', 'words want')} a review`, es: `${n} palabras piden repaso`, 'pt-BR': `${n} palavras pedem revisão`, vi: `${n} từ cần ôn lại`, id: `${n} kata minta diulang`, tr: `${n} kelime tekrar bekliyor`, pl: `${n} ${plPl(n, 'słowo czeka', 'słowa czekają', 'słów czeka')} na powtórkę`,
  }),
  beforeForget: (l: Lang) => triLang(l, { ru: 'Пока не забылись', uk: 'Поки не забулися', en: 'Before they slip away', es: 'Antes de que se olviden', 'pt-BR': 'Antes que você esqueça', vi: 'Trước khi quên mất', id: 'Sebelum terlupa', tr: 'Unutulmadan önce', pl: 'Zanim wylecą z głowy' }),
  review: (l: Lang) => triLang(l, { ru: 'Повторить', uk: 'Повторити', en: 'Review', es: 'Repasar', 'pt-BR': 'Revisar', vi: 'Ôn tập', id: 'Ulang', tr: 'Tekrar et', pl: 'Powtórz' }),
  friends: (l: Lang) => triLang(l, { ru: 'Друзья', uk: 'Друзі', en: 'Friends', es: 'Amigos', 'pt-BR': 'Amigos', vi: 'Bạn bè', id: 'Teman', tr: 'Arkadaşlar', pl: 'Znajomi' }),
  // зачем (координатор 25.10: числа уроков друга нет — «друг сегодня уже занимался»; замок «без рода»): фраза без глагола прошедшего времени
  friendToday: (l: Lang, name: string) => triLang(l, {
    ru: `${name} сегодня уже в деле`, uk: `${name} сьогодні вже в ділі`, en: `${name} already practised today`,
    es: `${name} ya practicó hoy`, 'pt-BR': `${name} já praticou hoje`, vi: `${name} hôm nay đã học rồi`, id: `${name} sudah belajar hari ini`, tr: `${name} bugün zaten çalıştı`, pl: `${name} już dziś ćwiczy`,
  }),
  catchUp: (l: Lang) => triLang(l, { ru: 'Догонишь?', uk: 'Наздоженеш?', en: 'Catch up?', es: '¿Le alcanzas?', 'pt-BR': 'Vai alcançar?', vi: 'Đuổi kịp nhé?', id: 'Bisa menyusul?', tr: 'Yetişir misin?', pl: 'Dogonisz?' }),
  catchUpCta: (l: Lang) => triLang(l, { ru: 'Догнать', uk: 'Наздогнати', en: 'Catch up', es: 'Alcanzar', 'pt-BR': 'Alcançar', vi: 'Đuổi kịp', id: 'Susul', tr: 'Yetiş', pl: 'Dogoń' }),
  peakKicker: (l: Lang) => triLang(l, { ru: 'Пик · комната недели', uk: 'Пік · кімната тижня', en: 'Peak · room of the week', es: 'Pico · sala de la semana', 'pt-BR': 'Pico · sala da semana', vi: 'Đỉnh · phòng của tuần', id: 'Puncak · ruang minggu ini', tr: 'Zirve · haftanın odası', pl: 'Szczyt · pokój tygodnia' }),
  overtaken: (l: Lang) => triLang(l, { ru: 'Тебя обогнали', uk: 'Тебе обігнали', en: 'Someone passed you', es: 'Te han adelantado', 'pt-BR': 'Passaram na sua frente', vi: 'Bạn vừa bị vượt', id: 'Kamu tersalip', tr: 'Geçildin', pl: 'Ktoś cię wyprzedził' }),
  placeBack: (l: Lang, n: number) => triLang(l, { ru: `${n} место — вернёшь?`, uk: `${n} місце — повернеш?`, en: `Place ${n} — take it back?`, es: `Puesto ${n}: ¿lo recuperas?`, 'pt-BR': `${n}º lugar — vai recuperar?`, vi: `Hạng ${n} — giành lại chứ?`, id: `Peringkat ${n} — rebut kembali?`, tr: `${n}. sıra — geri alır mısın?`, pl: `${n}. miejsce — odzyskasz?` }),
  toPeak: (l: Lang) => triLang(l, { ru: 'В Пик', uk: 'До Піку', en: 'To Peak', es: 'Al Pico', 'pt-BR': 'Para o Pico', vi: 'Tới Đỉnh', id: 'Ke Puncak', tr: 'Zirveye', pl: 'Do Szczytu' }),
  halloweenKicker: (l: Lang) => triLang(l, { ru: '31 октября · Хэллоуин', uk: '31 жовтня · Гелловін', en: 'October 31 · Halloween', es: '31 de octubre · Halloween', 'pt-BR': '31 de outubro · Halloween', vi: '31 tháng 10 · Halloween', id: '31 Oktober · Halloween', tr: '31 Ekim · Cadılar Bayramı', pl: '31 października · Halloween' }),
  halloweenTitle: (l: Lang) => triLang(l, { ru: 'Страшно полезный урок', uk: 'Страшенно корисний урок', en: 'A scarily useful lesson', es: 'Una lección terroríficamente útil', 'pt-BR': 'Uma aula assustadoramente útil', vi: 'Bài học hữu ích đến rợn người', id: 'Pelajaran yang seram bermanfaatnya', tr: 'Korkunç derecede faydalı bir ders', pl: 'Strasznie przydatna lekcja' }),
  newYearKicker: (l: Lang) => triLang(l, { ru: 'Новый год', uk: 'Новий рік', en: 'New Year', es: 'Año Nuevo', 'pt-BR': 'Ano-Novo', vi: 'Năm mới', id: 'Tahun Baru', tr: 'Yılbaşı', pl: 'Nowy Rok' }),
  // зачем (Переводчик 25.10): прежний заголовок обрывался («Один урок в честь») — строки из утверждённого home-new-states-copy (968be05e6)
  newYearTitle: (l: Lang) => triLang(l, { ru: 'Новый год — новые фразы', uk: 'Новий рік — нові вислови', en: 'New year, new phrases', es: 'Año nuevo, frases nuevas', 'pt-BR': 'Ano novo, frases novas', vi: 'Năm mới, câu mới', id: 'Tahun baru, frasa baru', tr: 'Yeni yıl, yeni ifadeler', pl: 'Nowy rok, nowe zwroty' }),
  weekKicker: (l: Lang) => triLang(l, { ru: 'Итоги недели', uk: 'Підсумки тижня', en: 'Your week', es: 'Tu semana', 'pt-BR': 'Sua semana', vi: 'Tổng kết tuần', id: 'Ringkasan minggu', tr: 'Haftan', pl: 'Twój tydzień' }),
  daysOf7: (l: Lang, n: number) => triLang(l, { ru: `${n} ${ruPl(n, 'день', 'дня', 'дней')} из 7`, uk: `${n} ${ruPl(n, 'день', 'дні', 'днів')} із 7`, en: `${n} of 7 days`, es: `${n} de 7 días`, 'pt-BR': `${n} de 7 dias`, vi: `${n}/7 ngày`, id: `${n} dari 7 hari`, tr: `7 günün ${n}'i`, pl: `${n} z 7 dni` }),
  almostNoGaps: (l: Lang) => triLang(l, { ru: 'Почти без пропусков', uk: 'Майже без пропусків', en: 'Almost no gaps', es: 'Casi sin faltar', 'pt-BR': 'Quase sem faltas', vi: 'Gần như không bỏ buổi', id: 'Hampir tanpa bolos', tr: 'Neredeyse hiç boşluk yok', pl: 'Prawie bez przerw' }),
  seeWeek: (l: Lang) => triLang(l, { ru: 'Смотреть итоги', uk: 'Дивитися підсумки', en: 'See the week', es: 'Ver la semana', 'pt-BR': 'Ver a semana', vi: 'Xem tổng kết', id: 'Lihat ringkasan', tr: 'Haftayı gör', pl: 'Zobacz tydzień' }),
  learned: (l: Lang) => triLang(l, { ru: 'Выучено!', uk: 'Вивчено!', en: 'Learned!', es: '¡Aprendido!', 'pt-BR': 'Aprendido!', vi: 'Đã thuộc!', id: 'Sudah hafal!', tr: 'Öğrenildi!', pl: 'Opanowane!' }),

};

// зачем (Переводчик 25.10): кавычки — по типографике языка интерфейса, а не «ёлочки» во всех 9
function quoted(l: Lang, text: string): string {
  if (l === 'ru' || l === 'uk' || l === 'es') return `«${text}»`;
  if (l === 'pl') return `„${text}”`;
  return `“${text}”`;
}

/** Тексты особой сцены; кнопка — своя у каждой сцены (куда ведёт — homeSceneSpecialRoute). */
export function buildHomeSceneSpecialCopy(i: HomeSceneSpecialCopyInput): HomeSceneCopy {
  const { lang: l } = i;
  const base = { warm: null, note: null, chips: [] as HomeSceneCopy['chips'], bar: null as number | null };
  const n = i.n ?? 0;
  switch (i.special) {
    case 'mistakes_pile':
      return { ...base, kicker: T.myMistakes(l), title: T.pileTitle(l, n), line: T.pileLine(l), cta: T.sortOut(l) };
    case 'mistake_poke':
      return { ...base, kicker: T.pokeKicker(l), title: T.pokeTitle(l), line: i.right ? quoted(l, i.right) : null, cta: T.fix(l) };
    case 'phrase_of_day_unseen':
      return { ...base, kicker: T.phraseKicker(l), title: i.phrase ?? '', line: i.phraseTr ?? null, cta: T.listen(l) };
    case 'fun_stats':
      return { ...base, kicker: T.aboutYou(l), title: T.phrasesLearned(l, n), line: T.everyDay(l), cta: T.myStats(l) };
    case 'milestone': {
      const key = i.milestoneKey ?? '';
      const title = key.startsWith('phrases_') ? T.phrasesBang(l, n) : key.startsWith('lessons_') ? T.lessonsBang(l, n) : T.newRank(l);
      return { ...base, kicker: T.milestoneKicker(l), title, line: key.startsWith('phrases_') ? T.phrasebook(l) : T.keepGoing(l), cta: T.look(l) };
    }
    case 'personal_best': {
      const best = i.best ?? 0; const today = Math.min(i.today ?? 0, best);
      return { ...base, kicker: T.bestStreakKicker(l, best), title: T.beatStreak(l), line: T.of(l, today, best), bar: best > 0 ? today / best : null, cta: T.cont(l) };
    }
    case 'words_due':
      return { ...base, kicker: T.cards(l), title: T.wordsDue(l, n), line: T.beforeForget(l), cta: T.review(l) };
    case 'friend_nudge':
      return { ...base, kicker: T.friends(l), title: T.friendToday(l, i.friendName ?? ''), line: T.catchUp(l), cta: T.catchUpCta(l) };
    case 'peak_overtaken':
      return { ...base, kicker: T.peakKicker(l), title: T.overtaken(l), line: i.placeTo ? T.placeBack(l, i.placeTo) : null, cta: T.toPeak(l) };
    case 'holiday':
      return i.holiday === 'halloween'
        ? { ...base, kicker: T.halloweenKicker(l), title: T.halloweenTitle(l), line: i.place ?? null, cta: T.cont(l) }
        : { ...base, kicker: T.newYearKicker(l), title: T.newYearTitle(l), line: i.place ?? null, cta: T.cont(l) };
    case 'weekly_recap':
      // зачем: «почти без пропусков» — правда только от 5 дней из 7; иначе строку не показываем
      return { ...base, kicker: T.weekKicker(l), title: T.daysOf7(l, i.weekDays ?? 0), line: (i.weekDays ?? 0) >= 5 ? T.almostNoGaps(l) : null, cta: T.seeWeek(l) };
    case 'mistake_mastered':
      return { ...base, kicker: T.myMistakes(l), title: T.learned(l), line: i.right ? quoted(l, i.right) : null, cta: T.myMistakes(l) };
    default: {
      const never: never = i.special;
      return { ...base, kicker: '', title: String(never), line: null, cta: null };
    }
  }
}
