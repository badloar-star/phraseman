import type { Lang } from "../constants/i18n";

type SessionCopy = Readonly<{
  modes: Readonly<Record<string, string>>;
  unavailable: string;
  /**
   * зачем: сбой ЗАХВАТА ответа (микрофон без разрешения, тишина, оценщик не смог
   * посчитать) — не ошибка ученика. Звёзды не снимаются, попытка не тратится;
   * текст обязан звать повторить, а не обвинять.
   */
  captureFailed: string;
  retry: string;
  close: string;
  introCheck: (question: number) => string;
  independent: string;
  supportFades: string;
  showPhrase: string;
  listenOffline: string;
  audioUnavailableHint: string;
  audioOfflineHint: string;
  localAudioUnavailable: string;
  localAudioFailed: string;
  listenPrompt: string;
  chooseExactPhrase: string;
  repeatPrivacy: string;
  builtPhrase: string;
  tapWords: string;
  repeatWithoutGrade: string;
  repeatedAloud: string;
  taskActions: string;
  reportTask: string;
  savePhrase: string;
  saveAdded: string;
  /** Тост самого первого сохранения: объясняет, куда делась карточка. */
  saveFirstEver: string;
  saveDuplicate: string;
  saveFailed: string;
  voiceSpeaking: string;
  voicePermission: string;
  voiceUnavailable: string;
  voiceStopped: string;
  voiceFailed: string;
  stopVoice: string;
  startVoice: string;
  secondError: string;
  showHint: string;
  hint: string;
  hintFallback: string;
  skipTask: string;
  skipHint: string;
  skip: string;
  attempt: string;
  check: string;
  finish: string;
  next: string;
  map: string;
  scorePossible: string;
  perfect: string;
  recovered: string;
  supported: string;
  skipped: string;
  repeatReward: string;
  stored: string;
  perfectBody: string;
  improveBody: (missing: number) => string;
  cardProgress: (card: number) => string;
  starsProgress: (stars: number) => string;
  answer: (letter: string, text: string) => string;
  attemptLabel: (attempt: number) => string;
  starWord: (value: number) => string;
  collected: (stars: number) => string;
  filled: (stars: number) => string;
  breakdown: (
    perfect: number,
    recovered: number,
    supported: number,
    skipped: number,
  ) => string;
  backToMap: (stars: number) => string;
  rewardLabel: (award: 1 | 2 | 3) => string;
  tier: (stars: number) => string;
  quality: Readonly<
    Record<1 | 2 | 3, Readonly<{ title: string; detail: string }>>
  >;
}>;

const copies: Readonly<Record<Lang, SessionCopy>> = {
  ru: {
    modes: {
      listen_choose: "Слушай и выбирай",
      sound_contrast: "Различай звучание",
      speed_match: "Найди пару на скорость",
      phrase_builder: "Собери фразу",
      listen_build_dictation: "Собери услышанное",
      context_gap_grammar: "Вставь нужное слово",
      scripted_repeat_compare: "Повтори и сравни",
    },
    unavailable: "Этот эпизод пока не открылся",
    captureFailed: "Ответ не записался. Попробуй ещё раз — попытка не сгорела",
    retry: "Повторить",
    close: "Закрыть эпизод",
    introCheck: (n) => `Вспоминаем начало · вопрос ${n} из 3`,
    independent: "Самостоятельно",
    supportFades: "Подсказок всё меньше — ты справишься",
    showPhrase: "Показать фразу текстом",
    listenOffline: "Послушать фразу",
    audioUnavailableHint: "Звук не загрузился — фраза написана ниже",
    audioOfflineHint: "Работает и без интернета",
    localAudioUnavailable:
      "Звука нет, но фраза написана ниже",
    localAudioFailed:
      "Звук не включился — фраза написана ниже",
    listenPrompt: "Прослушай фразу и выбери её смысл",
    chooseExactPhrase: "Выбери точную фразу",
    repeatPrivacy:
      "Просто повтори вслух — голос не записываем и не оцениваем",
    builtPhrase: "Собранная фраза",
    tapWords: "Нажимай слова по порядку",
    repeatWithoutGrade: "Продолжить без оценки голоса",
    repeatedAloud: "Повторено вслух",
    taskActions: "Действия задания",
    reportTask: "Сообщить об ошибке в задании",
    savePhrase: "Сохранить фразу в карточки",
    saveAdded: "Фраза сохранена в карточки",
    saveFirstEver:
      "Первая карточка в коллекции! Тренируй её когда угодно в «Карточках»",
    saveDuplicate: "Фраза уже есть в карточках",
    saveFailed: "Фраза не сохранилась — попробуй ещё раз",
    voiceSpeaking: "Говори — отпусти кнопку, чтобы остановить",
    voicePermission: "Разреши доступ к микрофону в настройках",
    voiceUnavailable: "Голосом сейчас не получится — ответь кнопками",
    voiceStopped: "Голосовой ответ завершён",
    voiceFailed: "Микрофон не включился — попробуй ещё раз",
    stopVoice: "Остановить голосовой ответ",
    startVoice: "Держи кнопку и говори",
    secondError: "Почти! Посмотри ещё раз — ответ рядом",
    showHint: "Показать подсказку",
    hint: "Подсказка",
    hintFallback: "Попробуй ещё раз — ответ пока не показываем",
    skipTask: "Пропустить это задание",
    skipHint: "За это задание звёзд не будет, а эпизод пойдёт дальше",
    skip: "Пропустить",
    attempt: "попытка",
    check: "Проверить",
    finish: "Завершить", // зачем (владелец 25.10, снимок «Скажи вслух» 20/20): «убери слово эпизод из кнопки „Завершить“»
    next: "Дальше",
    map: "На карту",
    scorePossible: "из 36 возможных",
    perfect: "Идеально!",
    recovered: "Исправлено",
    supported: "С поддержкой",
    skipped: "Пропущено",
    repeatReward:
      "Награда за повтор придёт сама — загляни в баланс чуть позже",
    stored:
      "Результат сохранён — он будет на всех твоих устройствах",
    perfectBody: "Идеальный эпизод — все звёзды твои!",
    improveBody: (n) => `Можно добрать ещё ${n} ${ruStar(n)}`,
    cardProgress: (n) => `${n} из 12`,
    starsProgress: (n) => `Собрано ${n} из 36 звёзд в этом эпизоде`,
    answer: (l, t) => `Ответ ${l}: ${t}`,
    attemptLabel: (n) => `попытка ${n}`,
    starWord: ruStar,
    collected: (n) => `Собрано ${n} ${ruStar(n)}`,
    filled: (n) => `Заполнено ${n} из 36 звёзд`,
    breakdown: (a, b, c, d) =>
      `Идеально ${a}. После исправления ${b}. С поддержкой ${c}. Пропущено ${d}.`,
    backToMap: (n) => `Вернуться на карту с результатом ${n} ${ruStar(n)}`,
    rewardLabel: (award) =>
      `${({ 1: "Зачтено", 2: "Отлично", 3: "Идеально" } as const)[award]}. Плюс ${award} ${ruStar(award)}. ${{ 1: "С поддержкой", 2: "После исправления", 3: "С первой попытки" }[award]}`,
    tier: ruTier,
    quality: {
      1: { title: "Зачтено", detail: "С поддержкой" },
      2: { title: "Отлично", detail: "После исправления" },
      3: { title: "Идеально", detail: "С первой попытки" },
    },
  },
  uk: makeCopy({
    unavailable: "Цей епізод поки не відкрився",
    close: "Закрити епізод",
    independent: "Самостійно",
    supportFades: "Підказок усе менше — ти впораєшся",
    hint: "Підказка",
    skip: "Пропустити",
    check: "Перевірити",
    finish: "Завершити",
    next: "Далі",
    map: "На мапу",
    perfect: "Ідеально!",
    recovered: "Виправлено",
    supported: "З підтримкою",
    skipped: "Пропущено",
    language: "uk",
  }),
  en: {
    modes: {
      listen_choose: "Listen and choose",
      sound_contrast: "Tell the sounds apart",
      speed_match: "Match pairs against the clock",
      phrase_builder: "Build the phrase",
      listen_build_dictation: "Build what you hear",
      context_gap_grammar: "Fill in the right word",
      scripted_repeat_compare: "Repeat and compare",
    },
    unavailable: "Episode unavailable",
    captureFailed: "Your answer didn’t record. Try again — you haven’t lost the attempt",
    retry: "Try again",
    close: "Close episode",
    introCheck: (n) => `Back to the start · question ${n} of 3`,
    independent: "On your own",
    supportFades: "Fewer hints now — you’ve got this",
    showPhrase: "Show the phrase as text",
    listenOffline: "Play the local recording of the phrase",
    audioUnavailableHint: "Audio isn't available, the phrase is shown as text below",
    audioOfflineHint: "Works without internet too",
    localAudioUnavailable:
      "Local recording unavailable. The phrase is shown as text.",
    localAudioFailed:
      "Couldn't play the local recording. The phrase is shown as text.",
    listenPrompt: "Listen to the phrase and choose its meaning",
    chooseExactPhrase: "Choose the exact phrase",
    repeatPrivacy:
      "Practice repeat · your voice isn't recorded or graded",
    builtPhrase: "Built phrase",
    tapWords: "Tap the words in order",
    repeatWithoutGrade: "Continue without grading your voice",
    repeatedAloud: "Said out loud",
    taskActions: "Task actions",
    reportTask: "Report a problem with this task",
    savePhrase: "Save phrase to flashcards",
    saveAdded: "Phrase saved to flashcards",
    saveFirstEver:
      "First card in your collection! Practice it anytime in Cards",
    saveDuplicate: "This phrase is already in your flashcards",
    saveFailed: "The phrase didn’t save — try again",
    voiceSpeaking: "Speak now — release the button to stop",
    voicePermission: "Allow microphone access in settings",
    voiceUnavailable: "Voice won’t work right now — answer with the buttons",
    voiceStopped: "Voice answer finished",
    voiceFailed: "Couldn't start the voice answer",
    stopVoice: "Stop voice answer",
    startVoice: "Hold to answer with your voice",
    secondError: "Almost. Look more closely and try again.",
    showHint: "Show hint",
    hint: "Hint",
    hintFallback: "Try again without revealing the answer",
    skipTask: "Skip this task",
    skipHint: "This task will get zero stars and the episode will continue",
    skip: "Skip",
    attempt: "attempt",
    check: "Check",
    finish: "Finish",
    next: "Next",
    map: "To map",
    scorePossible: "out of 36 possible",
    perfect: "Perfect",
    recovered: "Recovered",
    supported: "With support",
    skipped: "Skipped",
    repeatReward:
      "The repeat reward will be confirmed separately and added to your total balance automatically.",
    stored:
      "Result saved — it’ll show up on all your devices.",
    perfectBody: "Perfect episode — you collected every star.",
    improveBody: (n) => `You can still improve your result by ${n} ${enStar(n)}.`,
    cardProgress: (n) => `${n} of 12`,
    starsProgress: (n) => `Collected ${n} of 36 stars in this episode`,
    answer: (l, t) => `Answer ${l}: ${t}`,
    attemptLabel: (n) => `attempt ${n}`,
    starWord: enStar,
    collected: (n) => `Collected ${n} ${enStar(n)}`,
    filled: (n) => `Filled ${n} of 36 stars`,
    breakdown: (a, b, c, d) =>
      `Perfect ${a}. Recovered ${b}. With support ${c}. Skipped ${d}.`,
    backToMap: (n) => `Back to map with a result of ${n} ${enStar(n)}`,
    rewardLabel: (award) =>
      `${({ 1: "Counted", 2: "Great", 3: "Perfect" } as const)[award]}. Plus ${award} ${enStar(award)}. ${{ 1: "With support", 2: "After correction", 3: "On the first try" }[award]}`,
    tier: enTier,
    quality: {
      1: { title: "Counted", detail: "With support" },
      2: { title: "Great", detail: "After correction" },
      3: { title: "Perfect", detail: "On the first try" },
    },
  },
  es: makeCopy({
    unavailable: "Episodio no disponible",
    close: "Cerrar episodio",
    independent: "Sin ayuda",
    supportFades: "Cada vez menos pistas: tú puedes",
    hint: "Pista",
    skip: "Saltar",
    check: "Comprobar",
    finish: "Terminar",
    next: "Siguiente",
    map: "Al mapa",
    perfect: "Perfecto",
    recovered: "Corregido",
    supported: "Con ayuda",
    skipped: "Omitido",
    language: "es",
  }),
  "pt-BR": makeCopy({
    unavailable: "Episódio indisponível",
    close: "Fechar episódio",
    independent: "Sem ajuda",
    supportFades: "Cada vez menos dicas — você consegue",
    hint: "Dica",
    skip: "Pular",
    check: "Verificar",
    finish: "Concluir",
    next: "Avançar",
    map: "Ir ao mapa",
    perfect: "Perfeito",
    recovered: "Corrigido",
    supported: "Com ajuda",
    skipped: "Pulado",
    language: "pt-BR",
  }),
  vi: makeCopy({
    unavailable: "Không mở được tập này",
    close: "Đóng tập",
    independent: "Tự làm",
    supportFades: "Gợi ý ít dần — bạn làm được mà",
    hint: "Gợi ý",
    skip: "Bỏ qua",
    check: "Kiểm tra",
    finish: "Kết thúc",
    next: "Tiếp",
    map: "Về bản đồ",
    perfect: "Hoàn hảo",
    recovered: "Đã sửa",
    supported: "Có hỗ trợ",
    skipped: "Đã bỏ qua",
    language: "vi",
  }),
  id: makeCopy({
    unavailable: "Episode tidak tersedia",
    close: "Tutup episode",
    independent: "Mandiri",
    supportFades: "Petunjuk makin sedikit — kamu pasti bisa",
    hint: "Petunjuk",
    skip: "Lewati",
    check: "Periksa",
    finish: "Selesaikan",
    next: "Lanjut",
    map: "Ke peta",
    perfect: "Sempurna",
    recovered: "Diperbaiki",
    supported: "Dengan bantuan",
    skipped: "Dilewati",
    language: "id",
  }),
  tr: makeCopy({
    unavailable: "Bölüm açılamıyor",
    close: "Bölümü kapat",
    independent: "Bağımsız",
    supportFades: "İpuçları azalıyor — sen yaparsın",
    hint: "İpucu",
    skip: "Atla",
    check: "Kontrol et",
    finish: "Bitir",
    next: "İleri",
    map: "Haritaya dön",
    perfect: "Kusursuz",
    recovered: "Düzeltildi",
    supported: "Destekli",
    skipped: "Atlandı",
    language: "tr",
  }),
  pl: makeCopy({
    unavailable: "Odcinek jest niedostępny",
    close: "Zamknij odcinek",
    independent: "Samodzielnie",
    supportFades: "Coraz mniej podpowiedzi — dasz radę",
    hint: "Podpowiedź",
    skip: "Pomiń",
    check: "Sprawdź",
    finish: "Zakończ",
    next: "Dalej",
    map: "Do mapy",
    perfect: "Idealnie",
    recovered: "Poprawione",
    supported: "Z pomocą",
    skipped: "Pominięte",
    language: "pl",
  }),
};

function ruStar(value: number): string {
  return value === 1 ? "звезда" : value >= 2 && value <= 4 ? "звезды" : "звёзд";
}

function ruTier(value: number): string {
  return value === 36
    ? "ЗВЁЗДНЫЙ МАКСИМУМ"
    : value >= 30
      ? "СИЯЮЩИЙ РЕЗУЛЬТАТ"
      : value >= 24
        ? "СИЛЬНЫЙ ЭПИЗОД"
        : value >= 12
          ? "ХОРОШАЯ ОСНОВА"
          : "ПУТЬ НАЧАТ";
}

// зачем: en — обычный singular/"count !== 1" plural, никакой отдельной формы для 2-4 как в ru
function enStar(value: number): string {
  return value === 1 ? "star" : "stars";
}

function enTier(value: number): string {
  return value === 36
    ? "MAXIMUM STARS"
    : value >= 30
      ? "SHINING RESULT"
      : value >= 24
        ? "STRONG EPISODE"
        : value >= 12
          ? "GOOD FOUNDATION"
          : "JOURNEY STARTED";
}

// зачем: makeCopy обслуживает только эти 7 локалей — ru и en заполняются
// вручную отдельными полными объектами (см. copies.ru / copies.en), поэтому
// внутренняя машинерия t/rows/phrase типизирована по этому подмножеству,
// а не по Exclude<Lang, "ru"> (который после добавления en включал бы 'en'
// и требовал 8-й позиционный аргумент в каждом вызове phrase(...)).
type MakeCopyLocale = Exclude<Lang, "ru" | "en">;

function makeCopy(
  base: Readonly<{
    unavailable: string;
    close: string;
    independent: string;
    supportFades: string;
    hint: string;
    skip: string;
    check: string;
    finish: string;
    next: string;
    map: string;
    perfect: string;
    recovered: string;
    supported: string;
    skipped: string;
    language: MakeCopyLocale;
  }>,
): SessionCopy {
  const locale = base.language;
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const nounMany =
    locale === "uk"
      ? "зірок"
      : locale === "es"
        ? "estrellas"
        : locale === "pt-BR"
          ? "estrelas"
          : locale === "vi"
            ? "sao"
            : locale === "id"
              ? "bintang"
              : locale === "tr"
                ? "yıldız"
                : "gwiazdek";
  // зачем (Переводчик 4a04ededa, 🔴 «3 зірок»): форма числа зависит от числа — uk/pl: 1 / 2–4 / 5+, es/pt-BR: 1 / много; vi/id/tr не меняются
  const noun = (value: number): string => {
    const mod10 = value % 10; const mod100 = value % 100;
    const few = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
    if (locale === "uk") return mod10 === 1 && mod100 !== 11 ? "зірка" : few ? "зірки" : "зірок";
    if (locale === "pl") return value === 1 ? "gwiazdka" : few ? "gwiazdki" : "gwiazdek";
    if (locale === "es") return value === 1 ? "estrella" : nounMany;
    if (locale === "pt-BR") return value === 1 ? "estrela" : nounMany;
    return nounMany;
  };
  const t = <T extends Record<MakeCopyLocale, string>>(rows: T) =>
    rows[locale as keyof T] as string;
  const rows = {
    uk: [
      "Слухай і вибирай",
      "Розрізняй звучання",
      "Знайди пару на швидкість",
      "Склади фразу",
      "Склади почуте",
      "Встав потрібне слово",
      "Повтори й порівняй",
    ],
    es: [
      "Escucha y elige",
      "Distingue los sonidos",
      "Empareja a contrarreloj",
      "Construye la frase",
      "Arma lo que oyes",
      "Pon la palabra correcta",
      "Repite y compara",
    ],
    "pt-BR": [
      "Ouça e escolha",
      "Diferencie os sons",
      "Combine pares contra o relógio",
      "Monte a frase",
      "Monte o que você ouvir",
      "Coloque a palavra certa",
      "Repita e compare",
    ],
    vi: [
      "Nghe và chọn",
      "Phân biệt âm thanh",
      "Ghép cặp tính giờ",
      "Xếp câu",
      "Ghép những gì bạn nghe",
      "Điền từ phù hợp",
      "Lặp lại và so sánh",
    ],
    id: [
      "Dengar dan pilih",
      "Bedakan bunyi",
      "Cocokkan pasangan secepatnya",
      "Susun frasa",
      "Susun yang kamu dengar",
      "Isi kata yang tepat",
      "Ulangi dan bandingkan",
    ],
    tr: [
      "Dinle ve seç",
      "Sesleri ayırt et",
      "Zamana karşı eşleştir",
      "Cümleyi kur",
      "Duyduğunu kur",
      "Doğru kelimeyi yerleştir",
      "Tekrarla ve karşılaştır",
    ],
    pl: [
      "Słuchaj i wybierz",
      "Rozróżniaj dźwięki",
      "Dopasuj pary na czas",
      "Ułóż frazę",
      "Złóż to, co słyszysz",
      "Wstaw właściwe słowo",
      "Powtórz i porównaj",
    ],
  } as const;
  const labels = rows[locale as MakeCopyLocale];
  // зачем (Переводчик 4a04ededa): «Ідеально!» с восклицанием — для отдельной строки; в заголовке вердикта и разборе — без «!», иначе «Ідеально!. Плюс…»
  const perfectWord = base.perfect.replace(/!$/u, "");
  // uk: оценка «1» называется «Зараховано» (как ru «Зачтено»), а не «З підтримкою» — та пояснение, а не оценка
  const countedWord = locale === "uk" ? "Зараховано" : base.supported;
  const phrase = (
    uk: string,
    es: string,
    pt: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => t({ uk, es, "pt-BR": pt, vi, id, tr, pl });
  return {
    modes: {
      listen_choose: labels[0],
      sound_contrast: labels[1],
      speed_match: labels[2],
      phrase_builder: labels[3],
      listen_build_dictation: labels[4],
      context_gap_grammar: labels[5],
      scripted_repeat_compare: labels[6],
    },
    unavailable: base.unavailable,
    captureFailed: phrase(
      "Відповідь не записалась. Спробуй ще раз — спроба не згоріла",
      "No se grabó la respuesta. Inténtalo otra vez: no pierdes el intento",
      "A resposta não foi gravada. Tente de novo — a tentativa não foi perdida",
      "Câu trả lời chưa được ghi. Thử lại nhé — lượt này không bị mất",
      "Jawaban tidak terekam. Coba lagi — kesempatanmu tidak hangus",
      "Cevap kaydedilmedi. Tekrar dene — hakkın yanmadı",
      "Odpowiedź się nie nagrała. Spróbuj jeszcze raz — próba nie przepadła",
    ),
    retry: phrase(
      "Повторити",
      "Reintentar",
      "Tentar novamente",
      "Thử lại",
      "Coba lagi",
      "Tekrar dene",
      "Spróbuj ponownie",
    ),
    close: base.close,
    introCheck: (n) =>
      phrase(
        `Згадуємо початок · питання ${n} з 3`,
        `Repasamos el inicio · pregunta ${n} de 3`,
        `Relembrando o início · pergunta ${n} de 3`,
        `Nhớ lại phần đầu · câu ${n}/3`,
        `Mengingat bagian awal · pertanyaan ${n} dari 3`,
        `Başa dönelim · soru ${n}/3`,
        `Wracamy do początku · pytanie ${n} z 3`,
      ),
    independent: base.independent,
    supportFades: base.supportFades,
    showPhrase: phrase(
      "Показати фразу текстом",
      "Mostrar la frase",
      "Mostrar a frase",
      "Hiện câu bằng chữ",
      "Tampilkan frasa",
      "Cümleyi metin olarak göster",
      "Pokaż frazę jako tekst",
    ),
    listenOffline: phrase(
      "Послухати вислів",
      "Escuchar la grabación local",
      "Ouvir a gravação local",
      "Nghe bản ghi trên máy",
      "Dengarkan rekaman lokal",
      "Yerel kaydı dinle",
      "Odtwórz nagranie lokalne",
    ),
    audioUnavailableHint: phrase(
      "Звук не завантажився — вислів написано нижче",
      "El audio no está disponible; la frase aparece abajo",
      "O áudio não está disponível; a frase aparece abaixo",
      "Âm thanh không khả dụng; câu ở bên dưới",
      "Audio tidak tersedia; frasa ditampilkan di bawah",
      "Ses kullanılamıyor; cümle aşağıda gösteriliyor",
      "Nagranie jest niedostępne; fraza znajduje się niżej",
    ),
    audioOfflineHint: phrase(
      "Працює і без інтернету",
      "Funciona también sin internet",
      "Funciona até sem internet",
      "Vẫn chạy khi không có mạng",
      "Tetap jalan tanpa internet",
      "İnternetsiz de çalışır",
      "Działa też bez internetu",
    ),
    localAudioUnavailable: phrase(
      "Звуку немає, але вислів написано нижче",
      "La grabación local no está disponible. Se muestra la frase.",
      "A gravação local não está disponível. A frase foi exibida.",
      "Bản ghi không khả dụng. Câu được hiển thị bằng chữ.",
      "Rekaman lokal tidak tersedia. Frasa ditampilkan.",
      "Yerel kayıt kullanılamıyor. Cümle metin olarak gösteriliyor.",
      "Nagranie lokalne jest niedostępne. Fraza jest pokazana jako tekst.",
    ),
    localAudioFailed: phrase(
      "Звук не ввімкнувся — вислів написано нижче",
      "No se pudo reproducir la grabación. Se muestra la frase.",
      "Não foi possível reproduzir a gravação. A frase foi exibida.",
      "Không thể phát bản ghi. Câu được hiển thị bằng chữ.",
      "Rekaman gagal diputar. Frasa ditampilkan.",
      "Kayıt oynatılamadı. Cümle metin olarak gösteriliyor.",
      "Nie udało się odtworzyć nagrania. Fraza jest pokazana jako tekst.",
    ),
    listenPrompt: phrase(
      "Прослухай вислів і вибери його значення",
      "Escucha la frase y elige su significado",
      "Ouça a frase e escolha o significado",
      "Nghe câu và chọn nghĩa",
      "Dengarkan frasa dan pilih artinya",
      "Cümleyi dinle ve anlamını seç",
      "Posłuchaj frazy i wybierz jej znaczenie",
    ),
    chooseExactPhrase: phrase(
      "Вибери точну фразу",
      "Elige la frase exacta",
      "Escolha a frase exata",
      "Chọn đúng câu",
      "Pilih frasa yang tepat",
      "Doğru cümleyi seç",
      "Wybierz dokładną frazę",
    ),
    repeatPrivacy: phrase(
      "Просто повтори вголос — голос не записуємо й не оцінюємо",
      "Repetición de práctica · tu voz no se graba ni se evalúa",
      "Repetição de treino · sua voz não é gravada nem avaliada",
      "Luyện lặp lại · giọng nói không được ghi hoặc chấm",
      "Latihan mengulang · suara tidak direkam atau dinilai",
      "Alıştırma tekrarı · ses kaydedilmez veya değerlendirilmez",
      "Powtórka ćwiczeniowa · głos nie jest nagrywany ani oceniany",
    ),
    builtPhrase: phrase(
      "Складена фраза",
      "Frase construida",
      "Frase montada",
      "Câu đã xếp",
      "Frasa tersusun",
      "Kurulan cümle",
      "Ułożona fraza",
    ),
    tapWords: phrase(
      "Натискай слова по черзі",
      "Toca las palabras en orden",
      "Toque nas palavras na ordem",
      "Chạm các từ theo thứ tự",
      "Ketuk kata sesuai urutan",
      "Kelimelere sırayla dokun",
      "Naciskaj słowa po kolei",
    ),
    repeatWithoutGrade: phrase(
      "Продовжити без оцінки голосу",
      "Continuar sin evaluar la voz",
      "Continuar sem avaliar a voz",
      "Tiếp tục mà không chấm giọng",
      "Lanjut tanpa menilai suara",
      "Sesi değerlendirmeden devam et",
      "Kontynuuj bez oceny głosu",
    ),
    repeatedAloud: phrase(
      "Повторено вголос",
      "Dicho en voz alta",
      "Falado em voz alta",
      "Đã nói thành tiếng",
      "Sudah diucapkan",
      "Sesli söylendi",
      "Powiedziane na głos",
    ),
    taskActions: phrase(
      "Дії завдання",
      "Acciones de la tarea",
      "Ações da tarefa",
      "Thao tác bài tập",
      "Tindakan tugas",
      "Görev işlemleri",
      "Działania zadania",
    ),
    reportTask: phrase(
      "Повідомити про помилку в завданні",
      "Informar de un error en la tarea",
      "Informar um erro na tarefa",
      "Báo lỗi trong bài này",
      "Laporkan kesalahan di tugas ini",
      "Bu görevdeki hatayı bildir",
      "Zgłoś błąd w zadaniu",
    ),
    savePhrase: phrase(
      "Зберегти фразу в картки",
      "Guardar la frase en tarjetas",
      "Salvar a frase nos cartões",
      "Lưu câu vào thẻ",
      "Simpan frasa ke kartu",
      "Cümleyi kartlara kaydet",
      "Zapisz frazę w kartach",
    ),
    saveAdded: phrase(
      "Фразу збережено в картки",
      "Frase guardada en tarjetas",
      "Frase salva nos cartões",
      "Đã lưu câu vào thẻ",
      "Frasa disimpan ke kartu",
      "Cümle kartlara kaydedildi",
      "Fraza została zapisana w kartach",
    ),
    saveFirstEver: phrase(
      "Перша картка в колекції! Тренуй її будь-коли в «Картках»",
      "¡Primera tarjeta en tu colección! Practícala cuando quieras en Tarjetas",
      "Primeiro cartão na coleção! Pratique quando quiser em Cartões",
      "Thẻ đầu tiên trong bộ sưu tập! Luyện bất cứ lúc nào ở mục Thẻ",
      "Kartu pertama di koleksimu! Latih kapan saja di Kartu",
      "Koleksiyondaki ilk kart! İstediğin zaman Kartlar’da çalış",
      "Pierwsza karta w kolekcji! Ćwicz ją kiedy chcesz w Kartach",
    ),
    saveDuplicate: phrase(
      "Вислів уже є в картках",
      "La frase ya está en tus tarjetas",
      "A frase já está nos cartões",
      "Câu đã có trong thẻ",
      "Frasa sudah ada di kartu",
      "Cümle zaten kartlarda",
      "Fraza jest już w kartach",
    ),
    saveFailed: phrase(
      "Вислів не зберігся — спробуй ще раз",
      "La frase no se guardó: inténtalo otra vez",
      "A frase não foi salva — tente de novo",
      "Chưa lưu được cụm từ — thử lại nhé",
      "Frasa belum tersimpan — coba lagi",
      "İfade kaydedilmedi — tekrar dene",
      "Zwrot się nie zapisał — spróbuj jeszcze raz",
    ),
    voiceSpeaking: phrase(
      "Говори — відпусти кнопку, щоб зупинити",
      "Habla; suelta el botón para parar",
      "Fale; solte o botão para parar",
      "Hãy nói — thả nút để dừng",
      "Bicara — lepaskan tombol untuk berhenti",
      "Konuşun — durdurmak için düğmeyi bırakın",
      "Mów — puść przycisk, aby zatrzymać",
    ),
    voicePermission: phrase(
      "Дозволь доступ до мікрофона в налаштуваннях",
      "Permite el acceso al micrófono en ajustes",
      "Permita o acesso ao microfone nos ajustes",
      "Hãy cho phép dùng micrô trong cài đặt",
      "Izinkan akses mikrofon di pengaturan",
      "Ayarlardan mikrofon erişimine izin verin",
      "Zezwól na mikrofon w ustawieniach",
    ),
    voiceUnavailable: phrase(
      "Голосом зараз не вийде — відповідай кнопками",
      "Ahora no se puede por voz: responde con los botones",
      "Por voz não dá agora — responda com os botões",
      "Giờ chưa dùng giọng nói được — trả lời bằng nút nhé",
      "Suara belum bisa dipakai — jawab pakai tombol",
      "Şu an sesle olmuyor — butonlarla cevap ver",
      "Głosem teraz się nie da — odpowiedz przyciskami",
    ),
    voiceStopped: phrase(
      "Голосову відповідь завершено",
      "Respuesta por voz terminada",
      "Resposta por voz concluída",
      "Đã kết thúc trả lời bằng giọng nói",
      "Jawaban suara selesai",
      "Sesli yanıt tamamlandı",
      "Odpowiedź głosowa zakończona",
    ),
    voiceFailed: phrase(
      "Мікрофон не ввімкнувся — спробуй ще раз",
      "No se pudo iniciar la respuesta por voz",
      "Não foi possível iniciar a resposta por voz",
      "Không thể bắt đầu trả lời bằng giọng nói",
      "Gagal memulai jawaban suara",
      "Sesli yanıt başlatılamadı",
      "Nie udało się rozpocząć odpowiedzi głosowej",
    ),
    stopVoice: phrase(
      "Зупинити голосову відповідь",
      "Detener la respuesta por voz",
      "Parar a resposta por voz",
      "Dừng trả lời bằng giọng nói",
      "Hentikan jawaban suara",
      "Sesli yanıtı durdur",
      "Zatrzymaj odpowiedź głosową",
    ),
    startVoice: phrase(
      "Тримай кнопку й говори",
      "Mantén pulsado para responder por voz",
      "Segure para responder por voz",
      "Giữ để trả lời bằng giọng nói",
      "Tahan untuk menjawab dengan suara",
      "Sesle yanıtlamak için basılı tutun",
      "Przytrzymaj, aby odpowiedzieć głosem",
    ),
    secondError: phrase(
      "Майже! Подивись ще раз — відповідь поруч",
      "Casi. Mira con atención e inténtalo de nuevo.",
      "Quase. Observe com atenção e tente de novo.",
      "Gần đúng. Hãy xem kỹ và thử lại.",
      "Hampir. Perhatikan lagi dan coba ulang.",
      "Neredeyse. Dikkatlice bakıp tekrar dene.",
      "Prawie. Przyjrzyj się i spróbuj ponownie.",
    ),
    showHint: phrase(
      "Показати підказку",
      "Mostrar pista",
      "Mostrar dica",
      "Hiện gợi ý",
      "Tampilkan petunjuk",
      "İpucunu göster",
      "Pokaż podpowiedź",
    ),
    hint: base.hint,
    hintFallback: phrase(
      "Спробуй ще раз — відповідь поки не показуємо",
      "Inténtalo otra vez sin revelar la respuesta",
      "Tente de novo sem revelar a resposta",
      "Thử lại mà không xem đáp án",
      "Coba lagi tanpa melihat jawaban",
      "Yanıtı görmeden tekrar dene",
      "Spróbuj ponownie bez ujawniania odpowiedzi",
    ),
    skipTask: phrase(
      "Пропустити це завдання",
      "Saltar esta tarea",
      "Pular esta tarefa",
      "Bỏ qua bài tập này",
      "Lewati tugas ini",
      "Bu görevi atla",
      "Pomiń to zadanie",
    ),
    skipHint: phrase(
      "За це завдання зірок не буде, а епізод піде далі",
      "La tarea recibirá cero estrellas y el episodio continuará",
      "A tarefa receberá zero estrelas e o episódio continuará",
      "Bài tập nhận 0 sao và tập học tiếp tục",
      "Tugas mendapat nol bintang dan episode berlanjut",
      "Görev sıfır yıldız alır ve bölüm devam eder",
      "Zadanie otrzyma zero gwiazdek, a odcinek będzie kontynuowany",
    ),
    skip: base.skip,
    attempt: phrase(
      "спроба",
      "intento",
      "tentativa",
      "lần thử",
      "percobaan",
      "deneme",
      "próba",
    ),
    check: base.check,
    finish: base.finish,
    next: base.next,
    map: base.map,
    scorePossible: phrase(
      "із 36 можливих",
      "de 36 posibles",
      "de 36 possíveis",
      "trên 36",
      "dari 36",
      "36 üzerinden",
      "z 36 możliwych",
    ),
    perfect: base.perfect,
    recovered: base.recovered,
    supported: base.supported,
    skipped: base.skipped,
    repeatReward: phrase(
      "Нагорода за повтор прийде сама — зазирни в баланс трохи згодом",
      "La recompensa por repetir se confirmará por separado y se añadirá automáticamente.",
      "A recompensa da repetição será confirmada separadamente e adicionada automaticamente.",
      "Phần thưởng học lại sẽ được xác nhận riêng và tự động cộng vào tổng điểm.",
      "Hadiah pengulangan akan dikonfirmasi terpisah dan ditambahkan otomatis.",
      "Tekrar ödülü ayrıca onaylanıp toplam puana otomatik eklenir.",
      "Nagroda za powtórkę zostanie potwierdzona osobno i dodana automatycznie.",
    ),
    stored: phrase(
      "Результат збережено — він буде на всіх твоїх пристроях",
      "El resultado se guardó en el dispositivo y se sincronizará automáticamente.",
      "O resultado foi salvo no dispositivo e será sincronizado automaticamente.",
      "Kết quả đã lưu trên thiết bị và sẽ tự đồng bộ.",
      "Hasil disimpan di perangkat dan akan disinkronkan otomatis.",
      "Sonuç cihaza kaydedildi ve otomatik eşitlenecek.",
      "Wynik zapisano na urządzeniu i zostanie zsynchronizowany automatycznie.",
    ),
    perfectBody: phrase(
      "Ідеальний епізод — усі зірки твої!",
      "Episodio perfecto: conseguiste todas las estrellas.",
      "Episódio perfeito: você ganhou todas as estrelas.",
      "Tập học hoàn hảo — bạn đã nhận đủ sao.",
      "Episode sempurna — semua bintang terkumpul.",
      "Kusursuz bölüm — tüm yıldızları topladın.",
      "Idealny odcinek — zdobyto wszystkie gwiazdki.",
    ),
    improveBody: (n) =>
      phrase(
        `Можна добрати ще ${number(n)} ${noun(n)}`,
        `Puedes mejorar el resultado en ${number(n)} ${noun(n)} más.`,
        `Você pode melhorar o resultado em mais ${number(n)} ${noun(n)}.`,
        `Bạn có thể tăng thêm ${number(n)} ${noun(n)}.`,
        `Hasil masih bisa ditingkatkan sebanyak ${number(n)} ${noun(n)}.`,
        `Sonucu ${number(n)} ${noun(n)} daha artırabilirsin.`,
        `Możesz poprawić wynik o jeszcze ${number(n)} ${noun(n)}.`,
      ),
    cardProgress: (n) =>
      phrase(
        `${n} із 12`,
        `${n} de 12`,
        `${n} de 12`,
        `${n}/12`,
        `${n} dari 12`,
        `${n}/12`,
        `${n} z 12`,
      ),
    starsProgress: (n) =>
      phrase(
        `Зібрано ${n} із 36 зірок у цьому епізоді`,
        `${n} de 36 estrellas en este episodio`,
        `${n} de 36 estrelas neste episódio`,
        `Đã nhận ${n}/36 sao trong tập này`,
        `${n} dari 36 bintang di episode ini`,
        `Bu bölümde 36 yıldızın ${n} tanesi toplandı`,
        `Zdobyto ${n} z 36 gwiazdek w tym odcinku`,
      ),
    answer: (l, text) =>
      phrase(
        `Відповідь ${l}: ${text}`,
        `Respuesta ${l}: ${text}`,
        `Resposta ${l}: ${text}`,
        `Đáp án ${l}: ${text}`,
        `Jawaban ${l}: ${text}`,
        `Yanıt ${l}: ${text}`,
        `Odpowiedź ${l}: ${text}`,
      ),
    attemptLabel: (n) =>
      `${base.language === "vi" ? "lần thử" : base.language === "id" ? "percobaan" : base.language === "tr" ? "deneme" : base.language === "pl" ? "próba" : base.language === "es" ? "intento" : base.language === "pt-BR" ? "tentativa" : "спроба"} ${number(n)}`,
    starWord: (value) => noun(value),
    collected: (n) =>
      phrase(
        `Зібрано ${number(n)} ${noun(n)}`,
        `Conseguiste ${number(n)} ${noun(n)}`,
        `Você ganhou ${number(n)} ${noun(n)}`,
        `Đã nhận ${number(n)} ${noun(n)}`,
        `Terkumpul ${number(n)} ${noun(n)}`,
        `${number(n)} ${noun(n)} toplandı`,
        `Zdobyto ${number(n)} ${noun(n)}`,
      ),
    filled: (n) =>
      phrase(
        `Заповнено ${n} із 36 зірок`,
        `${n} de 36 estrellas`,
        `${n} de 36 estrelas`,
        `${n}/36 sao`,
        `${n} dari 36 bintang`,
        `36 yıldızın ${n} tanesi`,
        `${n} z 36 gwiazdek`,
      ),
    breakdown: (a, b, c, d) =>
      `${perfectWord} ${a}. ${base.recovered} ${b}. ${base.supported} ${c}. ${base.skipped} ${d}.`,
    backToMap: (n) =>
      phrase(
        `Повернутися на мапу з результатом ${n} ${noun(n)}`,
        `Volver al mapa con ${n} ${noun(n)}`,
        `Voltar ao mapa com ${n} ${noun(n)}`,
        `Về bản đồ với ${n} ${noun(n)}`,
        `Kembali ke peta dengan ${n} ${noun(n)}`,
        `${n} ${noun(n)} ile haritaya dön`,
        `Wróć do mapy z wynikiem ${n} ${noun(n)}`,
      ),
    rewardLabel: (award) => {
      const quality =
        award === 1
          ? { title: countedWord, detail: base.supported }
          : award === 2
            ? {
                title: phrase(
                  "Чудово",
                  "Muy bien",
                  "Muito bem",
                  "Rất tốt",
                  "Bagus",
                  "Harika",
                  "Świetnie",
                ),
                detail: base.recovered,
              }
            : {
                title: perfectWord,
                detail: phrase(
                  "З першої спроби",
                  "Al primer intento",
                  "Na primeira tentativa",
                  "Đúng ngay lần đầu",
                  "Benar pada percobaan pertama",
                  "İlk denemede",
                  "Za pierwszym razem",
                ),
              };
      // зачем (Переводчик 4a04ededa): uk словами «Плюс 3 зірки», без точки в конце; остальные языки — прежний формат
      if (locale === "uk") return `${quality.title}. Плюс ${award} ${noun(award)}. ${quality.detail}`;
      return `${quality.title}. +${award} ${noun(award)}. ${quality.detail}.`;
    },
    tier: (n) =>
      n === 36
        ? phrase(
            "МАКСИМУМ ЗІРОК",
            "MÁXIMO DE ESTRELLAS",
            "MÁXIMO DE ESTRELAS",
            "TỐI ĐA SAO",
            "BINTANG MAKSIMAL",
            "MAKSİMUM YILDIZ",
            "MAKSIMUM GWIAZDEK",
          )
        : n >= 30
          ? phrase(
              "СЯЮЧИЙ РЕЗУЛЬТАТ",
              "RESULTADO BRILLANTE",
              "RESULTADO BRILHANTE",
              "KẾT QUẢ RỰC RỠ",
              "HASIL GEMILANG",
              "PARLAK SONUÇ",
              "ŚWIETNY WYNIK",
            )
          : n >= 24
            ? phrase(
                "СИЛЬНИЙ ЕПІЗОД",
                "EPISODIO SÓLIDO",
                "EPISÓDIO FORTE",
                "TẬP HỌC TỐT",
                "EPISODE KUAT",
                "GÜÇLÜ BÖLÜM",
                "MOCNY ODCINEK",
              )
            : n >= 12
              ? phrase(
                  "ГАРНА ОСНОВА",
                  "BUENA BASE",
                  "BOA BASE",
                  "NỀN TẢNG TỐT",
                  "DASAR YANG BAIK",
                  "İYİ BİR TEMEL",
                  "DOBRA PODSTAWA",
                )
              : phrase(
                  "ШЛЯХ РОЗПОЧАТО",
                  "CAMINO INICIADO",
                  "CAMINHO INICIADO",
                  "ĐÃ BẮT ĐẦU",
                  "PERJALANAN DIMULAI",
                  "YOLCULUK BAŞLADI",
                  "DROGA ROZPOCZĘTA",
                ),
    quality: {
      1: { title: countedWord, detail: base.supported },
      2: {
        title: phrase(
          "Чудово",
          "Muy bien",
          "Muito bem",
          "Rất tốt",
          "Bagus",
          "Harika",
          "Świetnie",
        ),
        detail: base.recovered,
      },
      3: {
        title: perfectWord,
        detail: phrase(
          "З першої спроби",
          "Al primer intento",
          "Na primeira tentativa",
          "Đúng ngay lần đầu",
          "Benar pada percobaan pertama",
          "İlk denemede",
          "Za pierwszym razem",
        ),
      },
    },
  };
}

// зачем (№7, решение владельца 21.10): «Эпизод» вместо «Сессия» в ru/uk; остальные 7 языков — по списку Переводчика.
export function learningV2SessionCopy(lang: Lang): SessionCopy {
  return copies[lang];
}
