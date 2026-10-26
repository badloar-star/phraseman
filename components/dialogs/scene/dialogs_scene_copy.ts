// ═══════════════════════════════════════════════════════════════════════════
// dialogs_scene_copy.ts — тексты «Сцены» «Диалогов» на 9 языках и их сборка по состоянию.
//
// зачем (владелец 21.10; эталон docs/design/v2-app/dialogs-scene-states.html, STATE и hubInner): русский — дословно из эталона, остальные языки — предложение
// для «Переводчика» (ревью — через координатора). Порядок кортежа: ru, uk, en, es, pt-BR, vi, id, tr, pl. Подстановки: {name} {who} {world} {title} {goals}
// {k} {n} {m} {date} {task} {total} {voice}. Чистый модуль без React: что показывать — решает dialogs_scene_state, как показывать — DialogsSceneStage.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../../constants/i18n';
import { dialogsSceneMeterUsed, type DialogsSceneState } from './dialogs_scene_state';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
type IonName = 'chatbubbles-outline' | 'time-outline' | 'checkmark-circle' | 'play' | 'reload' | 'diamond' | 'refresh' | 'mic' | 'people-outline' | 'briefcase-outline' | 'airplane-outline' | 'cafe-outline';

export const DIALOGS_SCENE_COPY = {
  dialogs: ['Диалоги', 'Діалоги', 'Dialogues', 'Diálogos', 'Diálogos', 'Hội thoại', 'Dialog', 'Diyaloglar', 'Dialogi'],
  consentTitle: ['Разговоры с персонажами', 'Розмови з персонажами', 'Conversations with characters', 'Conversaciones con personajes', 'Conversas com personagens', 'Trò chuyện với nhân vật', 'Percakapan dengan karakter', 'Karakterlerle sohbetler', 'Rozmowy z postaciami'],
  // зачем (голос PhraseMan, VOICE.md 25.10): живо и про пользу, без «получай обратную связь»
  consentSub: ['Болтай с персонажами, выполняй цели — и узнаешь, как сказать лучше.', 'Балакай з персонажами, виконуй цілі — і дізнаєшся, як сказати краще.', 'Chat with characters, hit your goals — and learn how to say it better.', 'Charla con personajes, cumple objetivos y aprende a decirlo mejor.', 'Converse com personagens, cumpra metas e aprenda a dizer melhor.', 'Trò chuyện với nhân vật, hoàn thành mục tiêu — và biết cách nói hay hơn.', 'Ngobrol dengan karakter, capai tujuan — dan tahu cara bilang yang lebih baik.', 'Karakterlerle sohbet et, hedefleri tamamla — nasıl daha iyi söyleneceğini öğren.', 'Gadaj z postaciami, realizuj cele — i dowiedz się, jak powiedzieć to lepiej.'],
  consentCta: ['Включить AI-диалоги', 'Увімкнути AI-діалоги', 'Turn on AI dialogues', 'Activar diálogos con IA', 'Ativar diálogos com IA', 'Bật hội thoại AI', 'Aktifkan dialog AI', 'AI diyaloglarını aç', 'Włącz dialogi AI'],
  continueIn: ['Продолжить · {world}', 'Продовжити · {world}', 'Continue · {world}', 'Continuar · {world}', 'Continuar · {world}', 'Tiếp tục · {world}', 'Lanjutkan · {world}', 'Devam et · {world}', 'Kontynuuj · {world}'],
  offlineTitle: ['Диалоги недоступны', 'Діалоги недоступні', 'Dialogues unavailable', 'Diálogos no disponibles', 'Diálogos indisponíveis', 'Hội thoại không khả dụng', 'Dialog tidak tersedia', 'Diyaloglar kullanılamıyor', 'Dialogi niedostępne'],
  // зачем (голос PhraseMan, VOICE.md 25.10): без кухни «отвечает с сервера» — человеку важно, что нужен интернет и ничего не пропадёт
  offlineSub: ['Собеседнику нужен интернет. Появится — продолжим с того же места.', 'Співрозмовнику потрібен інтернет. З’явиться — продовжимо з того ж місця.', 'Your chat partner needs the internet. Once it’s back, we’ll pick up right where you left off.', 'Tu interlocutor necesita internet. Cuando vuelva, seguimos donde lo dejaste.', 'Seu interlocutor precisa de internet. Quando voltar, seguimos de onde parou.', 'Người đối thoại cần có mạng. Có mạng là mình tiếp tục ngay chỗ cũ.', 'Lawan bicara butuh internet. Begitu kembali, kita lanjut dari tempat tadi.', 'Muhatabının internete ihtiyacı var. Gelince kaldığımız yerden devam ederiz.', 'Rozmówca potrzebuje internetu. Gdy wróci, ruszymy od tego samego miejsca.'],
  offlineCta: ['Повторить', 'Повторити', 'Retry', 'Reintentar', 'Tentar de novo', 'Thử lại', 'Coba lagi', 'Tekrar dene', 'Spróbuj ponownie'],
  offlineBold: ['Нет сети.', 'Немає мережі.', 'No connection.', 'Sin conexión.', 'Sem conexão.', 'Không có mạng.', 'Tidak ada jaringan.', 'Bağlantı yok.', 'Brak sieci.'],
  offlineRest: ['Собеседнику нужен интернет. А уроки и карточки работают и без него.', 'Співрозмовнику потрібен інтернет. А уроки й картки працюють і без нього.', 'Your chat partner needs the internet. Lessons and cards work without it.', 'Tu interlocutor necesita internet. Las lecciones y las tarjetas funcionan sin él.', 'Seu interlocutor precisa de internet. As lições e os cartões funcionam sem ela.', 'Người đối thoại cần có mạng. Còn bài học và thẻ vẫn chạy khi không có mạng.', 'Lawan bicara butuh internet. Pelajaran dan kartu tetap jalan tanpa internet.', 'Muhatabının internete ihtiyacı var. Dersler ve kartlar internetsiz de çalışır.', 'Rozmówca potrzebuje internetu. Lekcje i karty działają bez niego.'],
  limitKick: ['Новые ответы {date}', 'Нові відповіді {date}', 'New replies on {date}', 'Nuevas respuestas el {date}', 'Novas respostas em {date}', 'Lượt trả lời mới vào {date}', 'Balasan baru pada {date}', 'Yeni yanıtlar {date} tarihinde', 'Nowe odpowiedzi {date}'],
  limitKickNoDate: ['Новые ответы — со следующего месяца', 'Нові відповіді — з наступного місяця', 'New replies next month', 'Nuevas respuestas el próximo mes', 'Novas respostas no próximo mês', 'Lượt trả lời mới vào tháng sau', 'Balasan baru bulan depan', 'Yeni yanıtlar gelecek ay', 'Nowe odpowiedzi w przyszłym miesiącu'],
  // зачем (голос PhraseMan, VOICE.md 25.10): честно про деньги; дата новых ответов уже стоит над заголовком (limitKick), второй раз её не повторяем
  limitTitle: ['Ответы на этот месяц кончились — дальше с Plus', 'Відповіді на цей місяць скінчилися — далі з Plus', 'This month’s replies are used up — keep going with Plus', 'Se acabaron las respuestas de este mes: sigue con Plus', 'As respostas deste mês acabaram — siga com o Plus', 'Hết lượt trả lời tháng này — học tiếp với Plus', 'Balasan bulan ini habis — lanjut dengan Plus', 'Bu ayın yanıtları bitti — Plus ile devam et', 'Odpowiedzi na ten miesiąc się skończyły — dalej z Plus'],
  limitProg: ['{total} из {total} ответов', '{total} із {total} відповідей', '{total} of {total} replies', '{total} de {total} respuestas', '{total} de {total} respostas', '{total}/{total} lượt trả lời', '{total} dari {total} balasan', '{total}/{total} yanıt', '{total} z {total} odpowiedzi'],
  limitVoice: ['голосом {voice} раза в день', 'голосом {voice} рази на день', '{voice} voice replies a day', 'por voz {voice} veces al día', 'por voz {voice} vezes ao dia', 'bằng giọng nói {voice} lần mỗi ngày', 'suara {voice} kali sehari', 'sesle günde {voice} kez', 'głosem {voice} razy dziennie'],
  limitCta: ['Plus снимает лимит', 'Plus знімає ліміт', 'Plus removes the limit', 'Plus quita el límite', 'O Plus remove o limite', 'Plus bỏ giới hạn', 'Plus menghapus batas', 'Plus limiti kaldırır', 'Plus znosi limit'],
  firstTitle: ['Начни первый разговор', 'Почни першу розмову', 'Start your first conversation', 'Empieza tu primera conversación', 'Comece sua primeira conversa', 'Bắt đầu cuộc trò chuyện đầu tiên', 'Mulai percakapan pertamamu', 'İlk konuşmanı başlat', 'Zacznij pierwszą rozmowę'],
  start: ['Начать', 'Почати', 'Start', 'Empezar', 'Começar', 'Bắt đầu', 'Mulai', 'Başla', 'Zacznij'],
  continue: ['Продолжить', 'Продовжити', 'Continue', 'Continuar', 'Continuar', 'Tiếp tục', 'Lanjutkan', 'Devam et', 'Kontynuuj'],
  // зачем (голос PhraseMan, VOICE.md 25.10): радость; «новые скоро» уже сказано строкой ниже (allDoneSub)
  allDoneTitle: ['Все диалоги пройдены!', 'Усі діалоги пройдено!', 'All dialogues done!', '¡Diálogos completados!', 'Todos os diálogos concluídos!', 'Đã xong mọi hội thoại!', 'Semua dialog selesai!', 'Tüm diyaloglar tamam!', 'Wszystkie dialogi zaliczone!'],
  allDoneSub: ['Новые сценки скоро. Пока можно пройти любимые ещё раз — цели засчитаются заново.', 'Нові сценки скоро. Поки можна пройти улюблені ще раз — цілі зарахуються заново.', 'New scenes are coming soon. Meanwhile, replay your favorites — goals count again.', 'Pronto habrá escenas nuevas. Mientras tanto, repite tus favoritas: los objetivos cuentan de nuevo.', 'Cenas novas chegam em breve. Por enquanto, refaça as favoritas — as metas contam de novo.', 'Sắp có tình huống mới. Trong lúc chờ, hãy chơi lại những bài yêu thích — mục tiêu được tính lại.', 'Adegan baru segera hadir. Sementara itu, ulangi yang favorit — tujuan dihitung lagi.', 'Yeni sahneler yakında. Şimdilik favorilerini tekrar oyna — hedefler yeniden sayılır.', 'Nowe scenki wkrótce. Na razie powtórz ulubione — cele zaliczą się od nowa.'],
  allDoneCta: ['Пройти ещё раз', 'Пройти ще раз', 'Play again', 'Repetir', 'Repetir', 'Chơi lại', 'Ulangi', 'Tekrar oyna', 'Przejdź jeszcze raz'],
  dayDoneTask: ['Потренировать диалог', 'Потренувати діалог', 'Practice a dialogue', 'Practicar un diálogo', 'Praticar um diálogo', 'Luyện một hội thoại', 'Latih satu dialog', 'Bir diyalog çalış', 'Przećwicz dialog'],
  dayDoneTitle: ['Сегодня разговор засчитан', 'Сьогодні розмову зараховано', 'Today’s conversation counted', 'La conversación de hoy cuenta', 'A conversa de hoje foi contada', 'Hôm nay đã tính một cuộc trò chuyện', 'Percakapan hari ini terhitung', 'Bugünkü konuşma sayıldı', 'Dzisiejsza rozmowa zaliczona'],
  dayDoneNext: ['Следующий: {title} · {with}', 'Наступний: {title} · {with}', 'Next: {title} · {with}', 'Siguiente: {title} · {with}', 'Próximo: {title} · {with}', 'Tiếp theo: {title} · {with}', 'Berikutnya: {title} · {with}', 'Sıradaki: {title} · {with}', 'Następny: {title} · {with}'],
  dayDoneCta: ['Ещё диалог', 'Ще діалог', 'Another dialogue', 'Otro diálogo', 'Mais um diálogo', 'Thêm hội thoại', 'Dialog lagi', 'Bir diyalog daha', 'Jeszcze dialog'],
  withWho: ['с {who}', 'з {who}', 'with {who}', 'con {who}', 'com {who}', 'với {who}', 'dengan {who}', '{who} ile', 'z {who}'],
  ofPair: ['{k} из {n}', '{k} з {n}', '{k} of {n}', '{k} de {n}', '{k} de {n}', '{k}/{n}', '{k} dari {n}', '{k}/{n}', '{k} z {n}'],
  unlimited: ['Без лимита', 'Без ліміту', 'Unlimited', 'Sin límite', 'Sem limite', 'Không giới hạn', 'Tanpa batas', 'Sınırsız', 'Bez limitu'],
  firstGoal: ['первая: {goal}', 'перша: {goal}', 'first: {goal}', 'primera: {goal}', 'primeira: {goal}', 'đầu tiên: {goal}', 'pertama: {goal}', 'ilk: {goal}', 'pierwszy: {goal}'],
  plusRowDialogs: ['Диалоги без лимита', 'Діалоги без ліміту', 'Unlimited dialogues', 'Diálogos sin límite', 'Diálogos sem limite', 'Hội thoại không giới hạn', 'Dialog tanpa batas', 'Sınırsız diyalog', 'Dialogi bez limitu'],
  plusRowVoice: ['Голосом без лимита', 'Голосом без ліміту', 'Unlimited voice replies', 'Por voz sin límite', 'Por voz sem limite', 'Nói bằng giọng không giới hạn', 'Suara tanpa batas', 'Sınırsız sesli yanıt', 'Głosem bez limitu'],
  plusRowLessons: ['Уроки без энергии', 'Уроки без енергії', 'Lessons without energy', 'Lecciones sin energía', 'Lições sem energia', 'Bài học không cần năng lượng', 'Pelajaran tanpa energi', 'Enerjisiz dersler', 'Lekcje bez energii'],
  allWorlds: ['Все', 'Усі', 'All', 'Todos', 'Todos', 'Tất cả', 'Semua', 'Tümü', 'Wszystkie'],
  // зачем (макет dialogs-hub-v4, «Да, переносить» 22.10): подпись над плитками тем и широкая плитка; ⚠ ЖДУТ ревью «Переводчика» (10) на 7 языках
  topics: ['Темы', 'Теми', 'Topics', 'Temas', 'Temas', 'Chủ đề', 'Topik', 'Konular', 'Tematy'],
  allDialogs: ['Все диалоги', 'Усі діалоги', 'All dialogues', 'Todos los diálogos', 'Todos os diálogos', 'Tất cả hội thoại', 'Semua dialog', 'Tüm diyaloglar', 'Wszystkie dialogi'],
  showMore: ['Показать ещё', 'Показати ще', 'Show more', 'Mostrar más', 'Mostrar mais', 'Xem thêm', 'Tampilkan lebih banyak', 'Daha fazla göster', 'Pokaż więcej'],
  noOpenTitle: ['Пока всё открытое пройдено', 'Поки все відкрите пройдено', 'You’ve finished everything unlocked', 'Ya completaste todo lo desbloqueado', 'Tudo o que está liberado foi concluído', 'Đã xong mọi hội thoại đang mở', 'Semua yang terbuka sudah selesai', 'Açık olan her şey tamamlandı', 'Wszystko odblokowane już ukończone'],
  noOpenSub: ['Следующие диалоги откроются с новым рангом.', 'Наступні діалоги відкриються з новим рангом.', 'The next dialogues open with a new rank.', 'Los siguientes diálogos se abren con un nuevo rango.', 'Os próximos diálogos abrem com um novo rank.', 'Hội thoại tiếp theo sẽ mở khi bạn lên hạng mới.', 'Dialog berikutnya terbuka dengan peringkat baru.', 'Sonraki diyaloglar yeni rütbeyle açılır.', 'Kolejne dialogi odblokują się z nową rangą.'],
  voiceA11y: ['Сказать голосом', 'Сказати голосом', 'Speak', 'Hablar', 'Falar', 'Nói bằng giọng', 'Bicara', 'Sesle söyle', 'Powiedz głosem'],
} as const satisfies Record<string, Nine>;

export type DialogsSceneCopyKey = keyof typeof DIALOGS_SCENE_COPY;

export function dialogsSceneText(lang: Lang, key: DialogsSceneCopyKey, vars?: Readonly<Record<string, string | number>>): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = DIALOGS_SCENE_COPY[key];
  const raw = triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
  if (!vars) return raw;
  return raw.replace(/\{([a-z]+)\}/giu, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

// ── числа с существительными: цели и ответы ──
function slavicForm(n: number, one: string, few: string, many: string): string {
  const a = n % 10;
  const b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
}

/** «6 целей», «1 цель»: склонение ru/uk/pl, остальные — одна форма во множественном. */
export function dialogsSceneGoalsLabel(lang: Lang, n: number): string {
  if (lang === 'ru') return `${n} ${slavicForm(n, 'цель', 'цели', 'целей')}`;
  if (lang === 'uk') return `${n} ${slavicForm(n, 'ціль', 'цілі', 'цілей')}`;
  if (lang === 'pl') return `${n} ${slavicForm(n, 'cel', 'cele', 'celów')}`;
  const word = triLang(lang, { ru: '', uk: '', en: n === 1 ? 'goal' : 'goals', es: n === 1 ? 'objetivo' : 'objetivos', 'pt-BR': n === 1 ? 'meta' : 'metas', vi: 'mục tiêu', id: 'tujuan', tr: 'hedef', pl: '' });
  return `${n} ${word}`;
}

/** «2 из 6 целей»: после «из» — родительный (ru/uk: «из 1 цели», «из 6 целей»). */
export function dialogsSceneGoalsDoneLabel(lang: Lang, done: number, total: number): string {
  if (lang === 'ru') return `${done} из ${total} ${total === 1 ? 'цели' : 'целей'}`;
  if (lang === 'uk') return `${done} з ${total} ${total === 1 ? 'цілі' : 'цілей'}`;
  if (lang === 'pl') return `${done} z ${total} ${total === 1 ? 'celu' : 'celów'}`;
  const word = triLang(lang, { ru: '', uk: '', en: total === 1 ? 'goal' : 'goals', es: total === 1 ? 'objetivo' : 'objetivos', 'pt-BR': total === 1 ? 'meta' : 'metas', vi: 'mục tiêu', id: 'tujuan', tr: 'hedef', pl: '' });
  return `${dialogsSceneText(lang, 'ofPair', { k: done, n: total })} ${word}`;
}

/** «Осталось 3 ответа в этом месяце». */
export function dialogsSceneRemainingLabel(lang: Lang, n: number): string {
  if (lang === 'ru') return `${slavicForm(n, 'Остался', 'Осталось', 'Осталось')} ${n} ${slavicForm(n, 'ответ', 'ответа', 'ответов')} в этом месяце`;
  if (lang === 'uk') return `${slavicForm(n, 'Залишилась', 'Залишилось', 'Залишилось')} ${n} ${slavicForm(n, 'відповідь', 'відповіді', 'відповідей')} цього місяця`;
  if (lang === 'pl') return `${slavicForm(n, 'Została', 'Zostały', 'Zostało')} ${n} ${slavicForm(n, 'odpowiedź', 'odpowiedzi', 'odpowiedzi')} w tym miesiącu`;
  return triLang(lang, {
    ru: '', uk: '', pl: '',
    en: `${n} ${n === 1 ? 'reply' : 'replies'} left this month`,
    es: n === 1 ? 'Queda 1 respuesta este mes' : `Quedan ${n} respuestas este mes`,
    'pt-BR': n === 1 ? 'Resta 1 resposta neste mês' : `Restam ${n} respostas neste mês`,
    vi: `Còn ${n} lượt trả lời trong tháng này`,
    id: `Sisa ${n} balasan bulan ini`,
    tr: `Bu ay ${n} yanıt kaldı`,
  });
}

/** Дата обновления ответов своим языком («1 ноября»); без Intl или при сбое — «01.11». */
export function dialogsSceneResetDateLabel(lang: Lang, date: Date): string {
  const locale = triLang(lang, { ru: 'ru', uk: 'uk', en: 'en', es: 'es', 'pt-BR': 'pt-BR', vi: 'vi', id: 'id', tr: 'tr', pl: 'pl' });
  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(date);
  } catch (error: unknown) {
    console.warn('[DIALOGS-SCENE] date-format:fallback', JSON.stringify({ lang, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: причина падения Intl
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

/**
 * Имя собеседника для «с Милой»: ru/uk/pl ставят имя в творительный (в снимке только именительный «Мила»), остальные языки — как есть.
 * зачем: «Общение · с Мила» режет глаз; список имён небольшой, правило по окончанию покрывает его (Мила, Марина, Зоя, Ира, Денис, Олег, Сэм, Нико).
 */
export function dialogsSceneWhoName(lang: Lang, name: string): string {
  const n = name.trim();
  if (n.length < 2) return n;
  const last = n[n.length - 1];
  const stem = n.slice(0, -1);
  if (lang === 'ru') {
    if (last === 'а') return `${stem}ой`;
    if (last === 'я') return `${stem}ей`;
    if (last === 'й') return `${stem}ем`;
    if (/[бвгджзклмнпрстфхцчшщ]/i.test(last)) return `${n}ом`;
    return n;
  }
  if (lang === 'uk') {
    if (last === 'а') return `${stem}ою`;
    if (last === 'я') return `${stem}ею`;
    if (last === 'й') return `${stem}єм`;
    if (/[бвгджзклмнпрстфхцчшщ]/i.test(last)) return `${n}ом`;
    return n;
  }
  if (lang === 'pl') {
    if (last === 'a') return `${stem}ą`;
    if (/[bcdfghjklmnprstwzł]/i.test(last)) return `${n}em`;
    return n;
  }
  return n;
}

// ── сборка текстов сцены ──
export type DialogsSceneDialogInfo = Readonly<{
  /** Название мира («Общение») и значок мира. */
  world: string;
  worldIcon: 'people-outline' | 'briefcase-outline' | 'airplane-outline' | 'cafe-outline';
  /** Имя собеседника (в карточке диалога, не герой сцены). */
  who: string;
  title: string;
  goals: number;
  /** Цели, выполненные в начатом диалоге; null — диалог не начат. */
  goalsDone: number | null;
}>;

export type DialogsSceneCopyInput = Readonly<{
  lang: Lang;
  state: DialogsSceneState;
  plus: boolean;
  /** Диалог, на котором стоит сцена (следующий / текущий). null — каталога ещё нет. */
  dialog: DialogsSceneDialogInfo | null;
  /** Диалог после засчитанного сегодня (состояние day_done). */
  following: DialogsSceneDialogInfo | null;
  quotaRemaining: number | null;
  quotaTotal: number;
  /** Когда обновятся ответы месяца; null — «со следующего месяца». */
  resetDate: Date | null;
  /** Сколько раз в день Free может ответить голосом; null — не упоминаем. */
  voicePerDay: number | null;
  doneCount: number | null;
  totalCount: number | null;
}>;

export type DialogsSceneCopy = Readonly<{
  kicker: string | null;
  kickerIcon: IonName | null;
  title: string;
  /** Крупный заголовок 28 вместо 34: длинные («Ответы месяца закончились…»). */
  small: boolean;
  sub: string | null;
  prog: string | null;
  /** Полоска прогресса 0..1 перед строкой; null — нет. */
  bar: number | null;
  /** Шкала ответов: сколько из 10 делений закрашено; null — шкалы нет. */
  meterUsed: number | null;
  /** Подпись главной кнопки; null — кнопки нет (нечего открывать: честное состояние, а не «Начать» в пустоту). */
  cta: string | null;
  ctaIcon: IonName | null;
  ctaDisabled: boolean;
  /** Круглая кнопка рядом с главной; null — нет. */
  round: 'mic' | 'diamond' | null;
  roundLabel: string | null;
  /** Строка «Нет сети» над текстом (только состояние offline). */
  offlineLine: Readonly<{ bold: string; rest: string }> | null;
  /** Пилюля в шапке сцены: «28 из 30» у Free, «∞ Без лимита» у Plus; null — остаток неизвестен. */
  quota: Readonly<{ label: string }> | null;
}>;

const BASE: Omit<DialogsSceneCopy, 'title' | 'cta'> = {
  kicker: null, kickerIcon: null, small: false, sub: null, prog: null, bar: null, meterUsed: null,
  ctaIcon: 'play', ctaDisabled: false, round: null, roundLabel: null, offlineLine: null, quota: null,
};

function withWhoLabel(lang: Lang, who: string): string {
  return dialogsSceneText(lang, 'withWho', { who });
}

function worldKicker(lang: Lang, d: DialogsSceneDialogInfo | null): string | null {
  // нет собеседника в снимке — подпись «с …» не выдумываем, остаётся мир
  return d ? (d.who ? `${d.world} · ${withWhoLabel(lang, d.who)}` : d.world) : null;
}

export function buildDialogsSceneCopy(input: DialogsSceneCopyInput): DialogsSceneCopy {
  const { lang, state, dialog } = input;
  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «без пилюль энергии и лимита» у Plus (макет dialogs-hub-v4, решение (б)) — у Plus пилюли остатка нет совсем; у Free — «N/30», как на экране диалога
  const quota = input.plus || input.quotaRemaining === null ? null : { label: `${input.quotaRemaining}/${input.quotaTotal}` };
  const done = { ...BASE, quota };
  const voice = input.voicePerDay !== null ? ` · ${dialogsSceneText(lang, 'limitVoice', { voice: input.voicePerDay })}` : '';
  // зачем (координатор 22.10): следующий — первый ОТКРЫТЫЙ непройденный диалог. Если его нет (всё открытое пройдено, остальное закрыто по рангу),
  // кнопка «Начать/Продолжить» вела бы в пустоту или в закрытый диалог — рисуем честный текст без кнопки.
  if ((state === 'first' || state === 'low' || state === 'next') && dialog === null) {
    return { ...done, title: dialogsSceneText(lang, 'noOpenTitle'), sub: dialogsSceneText(lang, 'noOpenSub'), cta: null, ctaIcon: null };
  }
  switch (state) {
    case 'consent':
      return { ...done, kicker: dialogsSceneText(lang, 'dialogs'), kickerIcon: 'chatbubbles-outline', title: dialogsSceneText(lang, 'consentTitle'), sub: dialogsSceneText(lang, 'consentSub'), cta: dialogsSceneText(lang, 'consentCta'), ctaIcon: null };
    case 'offline':
      return {
        ...done, kicker: dialog ? dialogsSceneText(lang, 'continueIn', { world: dialog.world }) : dialogsSceneText(lang, 'dialogs'), title: dialogsSceneText(lang, 'offlineTitle'),
        sub: dialogsSceneText(lang, 'offlineSub'), cta: dialogsSceneText(lang, 'offlineCta'), ctaIcon: 'reload', ctaDisabled: false, // зачем (аудит кнопок 22.10, F2): «Повторить» нажимается всегда — перепроверяет сеть и каталог
        offlineLine: { bold: dialogsSceneText(lang, 'offlineBold'), rest: dialogsSceneText(lang, 'offlineRest') },
      };
    case 'limit': {
      const kicker = input.resetDate ? dialogsSceneText(lang, 'limitKick', { date: dialogsSceneResetDateLabel(lang, input.resetDate) }) : dialogsSceneText(lang, 'limitKickNoDate');
      return {
        ...done, kicker, kickerIcon: 'time-outline', title: dialogsSceneText(lang, 'limitTitle'), small: true, meterUsed: 10,
        prog: `${dialogsSceneText(lang, 'limitProg', { total: input.quotaTotal })}${voice}`, cta: dialogsSceneText(lang, 'limitCta'), ctaIcon: 'diamond',
      };
    }
    case 'first':
      return {
        ...done, kicker: worldKicker(lang, dialog), kickerIcon: dialog ? dialog.worldIcon : null, title: dialogsSceneText(lang, 'firstTitle'),
        prog: dialog ? (dialog.goals > 0 ? `${dialog.title} · ${dialogsSceneGoalsLabel(lang, dialog.goals)}` : dialog.title) : null, cta: dialogsSceneText(lang, 'start'), round: 'mic', roundLabel: dialogsSceneText(lang, 'voiceA11y'),
      };
    case 'low': {
      const remaining = input.quotaRemaining ?? 0;
      return {
        ...done, kicker: worldKicker(lang, dialog), kickerIcon: dialog ? dialog.worldIcon : null, title: dialog ? dialog.title : dialogsSceneText(lang, 'dialogs'),
        meterUsed: dialogsSceneMeterUsed(input.quotaRemaining, input.quotaTotal), prog: dialogsSceneRemainingLabel(lang, remaining),
        cta: dialogsSceneText(lang, 'continue'), round: 'diamond', roundLabel: dialogsSceneText(lang, 'limitCta'),
      };
    }
    case 'all_done':
      return {
        ...done, kicker: dialogsSceneText(lang, 'ofPair', { k: input.doneCount ?? 0, n: input.totalCount ?? 0 }), kickerIcon: 'checkmark-circle', title: dialogsSceneText(lang, 'allDoneTitle'),
        sub: dialogsSceneText(lang, 'allDoneSub'), cta: dialogsSceneText(lang, 'allDoneCta'), ctaIcon: 'refresh',
      };
    case 'day_done': {
      const task = lang === 'ru' || lang === 'uk' ? `«${dialogsSceneText(lang, 'dayDoneTask')}»` : dialogsSceneText(lang, 'dayDoneTask');
      const f = input.following;
      return {
        ...done, kicker: `${task} · 1/1`, kickerIcon: 'checkmark-circle', title: dialogsSceneText(lang, 'dayDoneTitle'),
        prog: f ? (f.who ? dialogsSceneText(lang, 'dayDoneNext', { title: f.title, with: withWhoLabel(lang, f.who) }) : f.title) : null, cta: f ? dialogsSceneText(lang, 'dayDoneCta') : null, ctaIcon: f ? 'play' : null,
      };
    }
    case 'next': {
      const started = dialog !== null && dialog.goalsDone !== null;
      return {
        ...done, kicker: worldKicker(lang, dialog), kickerIcon: dialog ? dialog.worldIcon : null, title: dialog ? dialog.title : dialogsSceneText(lang, 'dialogs'),
        prog: dialog && dialog.goals > 0 ? (started ? dialogsSceneGoalsDoneLabel(lang, dialog.goalsDone ?? 0, dialog.goals) : dialogsSceneGoalsLabel(lang, dialog.goals)) : null,
        bar: dialog ? (started && dialog.goals > 0 ? (dialog.goalsDone ?? 0) / dialog.goals : 0) : null,
        cta: started ? dialogsSceneText(lang, 'continue') : dialogsSceneText(lang, 'start'), round: 'mic', roundLabel: dialogsSceneText(lang, 'voiceA11y'),
      };
    }
  }
}
