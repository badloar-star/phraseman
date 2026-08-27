import type { Lang } from "../constants/i18n";

type SessionCopy = Readonly<{
  modes: Readonly<Record<string, string>>;
  preparing: string;
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
      speed_match: "Быстрое совпадение",
      phrase_builder: "Собери фразу",
      listen_build_dictation: "Диктант-конструктор",
      context_gap_grammar: "Точная грамматика",
      scripted_repeat_compare: "Повтори и сравни",
    },
    preparing: "Подготавливаем занятие и локальное аудио…",
    unavailable: "Сессия недоступна",
    captureFailed: "Не удалось записать ответ. Попробуй ещё раз — попытка не потрачена",
    retry: "Повторить",
    close: "Закрыть сессию",
    introCheck: (n) => `Проверка интро · вопрос ${n} из 3`,
    independent: "Самостоятельно",
    supportFades: "Поддержка постепенно исчезает",
    showPhrase: "Показать фразу текстом",
    listenOffline: "Прослушать локальную запись фразы",
    audioUnavailableHint: "Аудиозапись недоступна, фраза показана текстом ниже",
    audioOfflineHint: "Воспроизводит встроенную запись без подключения к сети",
    localAudioUnavailable:
      "Локальная запись недоступна. Фраза показана текстом.",
    localAudioFailed:
      "Не удалось воспроизвести локальную запись. Фраза показана текстом.",
    listenPrompt: "Прослушай фразу и выбери её смысл",
    chooseExactPhrase: "Выбери точную фразу",
    repeatPrivacy:
      "Тренировочный повтор · голос не записывается и не оценивается",
    builtPhrase: "Собранная фраза",
    tapWords: "Нажимай слова по порядку",
    repeatWithoutGrade: "Продолжить без оценки голоса",
    repeatedAloud: "Я повторил вслух",
    taskActions: "Действия задания",
    reportTask: "Отправить репорт об этом задании",
    savePhrase: "Сохранить фразу в карточки",
    saveAdded: "Фраза сохранена в карточки",
    saveFirstEver:
      "Вы сохранили свою первую карточку. Потренируйте её в любое время в разделе «Карточки»",
    saveDuplicate: "Фраза уже есть в карточках",
    saveFailed: "Не удалось сохранить фразу",
    voiceSpeaking: "Говорите — отпустите кнопку, чтобы остановить",
    voicePermission: "Разрешите доступ к микрофону в настройках",
    voiceUnavailable: "Голосовой ответ сейчас недоступен",
    voiceStopped: "Голосовой ответ завершён",
    voiceFailed: "Не удалось начать голосовой ответ",
    stopVoice: "Остановить голосовой ответ",
    startVoice: "Удерживайте, чтобы ответить голосом",
    secondError: "Почти. Посмотри внимательнее и попробуй ещё.",
    showHint: "Показать подсказку",
    hint: "Подсказка",
    hintFallback: "Попробуй ещё раз без раскрытия ответа",
    skipTask: "Пропустить это задание",
    skipHint: "Задание получит ноль звёзд, сессия продолжится",
    skip: "Пропустить",
    attempt: "попытка",
    check: "Проверить",
    finish: "Завершить сессию",
    next: "Дальше",
    map: "На карту",
    scorePossible: "из 36 возможных",
    perfect: "Идеально",
    recovered: "Исправлено",
    supported: "С поддержкой",
    skipped: "Пропущено",
    repeatReward:
      "Награда за повтор подтвердится отдельно и появится в общем балансе автоматически.",
    stored:
      "Результат сохранён на устройстве и синхронизируется автоматически.",
    perfectBody: "Идеальная сессия — ты собрал все звёзды результата.",
    improveBody: (n) => `Можно улучшить результат ещё на ${n} ${ruStar(n)}.`,
    cardProgress: (n) => `${n} из 12`,
    starsProgress: (n) => `Собрано ${n} из 36 звёзд в этой сессии`,
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
    unavailable: "Сесія недоступна",
    close: "Закрити сесію",
    independent: "Самостійно",
    supportFades: "Підтримка поступово зникає",
    hint: "Підказка",
    skip: "Пропустити",
    check: "Перевірити",
    finish: "Завершити сесію",
    next: "Далі",
    map: "На мапу",
    perfect: "Ідеально",
    recovered: "Виправлено",
    supported: "З підтримкою",
    skipped: "Пропущено",
    language: "uk",
  }),
  en: {
    modes: {
      listen_choose: "Listen and choose",
      sound_contrast: "Tell the sounds apart",
      speed_match: "Speed match",
      phrase_builder: "Build the phrase",
      listen_build_dictation: "Dictation builder",
      context_gap_grammar: "Precise grammar",
      scripted_repeat_compare: "Repeat and compare",
    },
    preparing: "Preparing the lesson and local audio…",
    unavailable: "Session unavailable",
    captureFailed: "We couldn't record your answer. Try again — this attempt wasn't used up",
    retry: "Try again",
    close: "Close session",
    introCheck: (n) => `Intro check · question ${n} of 3`,
    independent: "On your own",
    supportFades: "Support fades away gradually",
    showPhrase: "Show the phrase as text",
    listenOffline: "Play the local recording of the phrase",
    audioUnavailableHint: "Audio isn't available, the phrase is shown as text below",
    audioOfflineHint: "Plays a built-in recording with no internet connection",
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
    repeatedAloud: "I repeated it aloud",
    taskActions: "Task actions",
    reportTask: "Send a report about this task",
    savePhrase: "Save phrase to flashcards",
    saveAdded: "Phrase saved to flashcards",
    saveFirstEver:
      "You saved your first flashcard. Practice it anytime in the «Flashcards» section",
    saveDuplicate: "This phrase is already in your flashcards",
    saveFailed: "Couldn't save the phrase",
    voiceSpeaking: "Speak now — release the button to stop",
    voicePermission: "Allow microphone access in settings",
    voiceUnavailable: "Voice answers aren't available right now",
    voiceStopped: "Voice answer finished",
    voiceFailed: "Couldn't start the voice answer",
    stopVoice: "Stop voice answer",
    startVoice: "Hold to answer with your voice",
    secondError: "Almost. Look more closely and try again.",
    showHint: "Show hint",
    hint: "Hint",
    hintFallback: "Try again without revealing the answer",
    skipTask: "Skip this task",
    skipHint: "This task will get zero stars and the session will continue",
    skip: "Skip",
    attempt: "attempt",
    check: "Check",
    finish: "Finish session",
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
      "The result is saved on your device and will sync automatically.",
    perfectBody: "Perfect session — you collected every star.",
    improveBody: (n) => `You can still improve your result by ${n} ${enStar(n)}.`,
    cardProgress: (n) => `${n} of 12`,
    starsProgress: (n) => `Collected ${n} of 36 stars in this session`,
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
    unavailable: "Sesión no disponible",
    close: "Cerrar sesión",
    independent: "Sin ayuda",
    supportFades: "La ayuda desaparece poco a poco",
    hint: "Pista",
    skip: "Saltar",
    check: "Comprobar",
    finish: "Terminar sesión",
    next: "Siguiente",
    map: "Al mapa",
    perfect: "Perfecto",
    recovered: "Corregido",
    supported: "Con ayuda",
    skipped: "Omitido",
    language: "es",
  }),
  "pt-BR": makeCopy({
    unavailable: "Sessão indisponível",
    close: "Fechar sessão",
    independent: "Sem ajuda",
    supportFades: "A ajuda diminui aos poucos",
    hint: "Dica",
    skip: "Pular",
    check: "Verificar",
    finish: "Concluir sessão",
    next: "Avançar",
    map: "Ir ao mapa",
    perfect: "Perfeito",
    recovered: "Corrigido",
    supported: "Com ajuda",
    skipped: "Pulado",
    language: "pt-BR",
  }),
  vi: makeCopy({
    unavailable: "Không thể mở phiên học",
    close: "Đóng phiên học",
    independent: "Tự làm",
    supportFades: "Hỗ trợ giảm dần",
    hint: "Gợi ý",
    skip: "Bỏ qua",
    check: "Kiểm tra",
    finish: "Kết thúc phiên",
    next: "Tiếp",
    map: "Về bản đồ",
    perfect: "Hoàn hảo",
    recovered: "Đã sửa",
    supported: "Có hỗ trợ",
    skipped: "Đã bỏ qua",
    language: "vi",
  }),
  id: makeCopy({
    unavailable: "Sesi tidak tersedia",
    close: "Tutup sesi",
    independent: "Mandiri",
    supportFades: "Bantuan berkurang perlahan",
    hint: "Petunjuk",
    skip: "Lewati",
    check: "Periksa",
    finish: "Selesaikan sesi",
    next: "Lanjut",
    map: "Ke peta",
    perfect: "Sempurna",
    recovered: "Diperbaiki",
    supported: "Dengan bantuan",
    skipped: "Dilewati",
    language: "id",
  }),
  tr: makeCopy({
    unavailable: "Oturum kullanılamıyor",
    close: "Oturumu kapat",
    independent: "Bağımsız",
    supportFades: "Destek kademeli olarak azalır",
    hint: "İpucu",
    skip: "Atla",
    check: "Kontrol et",
    finish: "Oturumu bitir",
    next: "İleri",
    map: "Haritaya dön",
    perfect: "Kusursuz",
    recovered: "Düzeltildi",
    supported: "Destekli",
    skipped: "Atlandı",
    language: "tr",
  }),
  pl: makeCopy({
    unavailable: "Sesja jest niedostępna",
    close: "Zamknij sesję",
    independent: "Samodzielnie",
    supportFades: "Pomoc stopniowo znika",
    hint: "Podpowiedź",
    skip: "Pomiń",
    check: "Sprawdź",
    finish: "Zakończ sesję",
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
        ? "СИЛЬНАЯ СЕССИЯ"
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
        ? "STRONG SESSION"
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
  const noun =
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
  const t = <T extends Record<MakeCopyLocale, string>>(rows: T) =>
    rows[locale as keyof T] as string;
  const rows = {
    uk: [
      "Слухай і вибирай",
      "Розрізняй звучання",
      "Швидка відповідність",
      "Склади фразу",
      "Диктант-конструктор",
      "Точна граматика",
      "Повтори й порівняй",
    ],
    es: [
      "Escucha y elige",
      "Distingue los sonidos",
      "Coincidencia rápida",
      "Construye la frase",
      "Construye el dictado",
      "Gramática precisa",
      "Repite y compara",
    ],
    "pt-BR": [
      "Ouça e escolha",
      "Diferencie os sons",
      "Correspondência rápida",
      "Monte a frase",
      "Monte o ditado",
      "Gramática precisa",
      "Repita e compare",
    ],
    vi: [
      "Nghe và chọn",
      "Phân biệt âm thanh",
      "Ghép nhanh",
      "Xếp câu",
      "Ghép chính tả",
      "Ngữ pháp chính xác",
      "Lặp lại và so sánh",
    ],
    id: [
      "Dengar dan pilih",
      "Bedakan bunyi",
      "Cocokkan cepat",
      "Susun frasa",
      "Susun dikte",
      "Tata bahasa tepat",
      "Ulangi dan bandingkan",
    ],
    tr: [
      "Dinle ve seç",
      "Sesleri ayırt et",
      "Hızlı eşleştirme",
      "Cümleyi kur",
      "Dikteyi kur",
      "Doğru dil bilgisi",
      "Tekrarla ve karşılaştır",
    ],
    pl: [
      "Słuchaj i wybierz",
      "Rozróżniaj dźwięki",
      "Szybkie dopasowanie",
      "Ułóż frazę",
      "Ułóż dyktando",
      "Precyzyjna gramatyka",
      "Powtórz i porównaj",
    ],
  } as const;
  const labels = rows[locale as MakeCopyLocale];
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
    preparing: phrase(
      "Готуємо заняття й локальне аудіо…",
      "Preparando la sesión y el audio local…",
      "Preparando a sessão e o áudio local…",
      "Đang chuẩn bị bài học và âm thanh trên máy…",
      "Menyiapkan sesi dan audio lokal…",
      "Ders ve yerel ses hazırlanıyor…",
      "Przygotowujemy sesję i nagrania lokalne…",
    ),
    unavailable: base.unavailable,
    captureFailed: phrase(
      "Не вдалося записати відповідь. Спробуй ще раз — спроба не витрачена",
      "No se pudo grabar tu respuesta. Inténtalo otra vez: no se gastó el intento",
      "Não foi possível gravar sua resposta. Tente de novo: a tentativa não foi gasta",
      "Không ghi được câu trả lời. Hãy thử lại — lượt của bạn vẫn còn",
      "Jawabanmu tidak terekam. Coba lagi — percobaanmu tidak terpakai",
      "Yanıtın kaydedilemedi. Tekrar dene — hakkın harcanmadı",
      "Nie udało się nagrać odpowiedzi. Spróbuj ponownie — próba nie przepadła",
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
        `Перевірка вступу · питання ${n} з 3`,
        `Comprobación inicial · pregunta ${n} de 3`,
        `Revisão inicial · pergunta ${n} de 3`,
        `Kiểm tra mở đầu · câu ${n}/3`,
        `Pemeriksaan awal · soal ${n} dari 3`,
        `Giriş kontrolü · soru ${n}/3`,
        `Sprawdzenie wstępu · pytanie ${n} z 3`,
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
      "Прослухати локальний запис",
      "Escuchar la grabación local",
      "Ouvir a gravação local",
      "Nghe bản ghi trên máy",
      "Dengarkan rekaman lokal",
      "Yerel kaydı dinle",
      "Odtwórz nagranie lokalne",
    ),
    audioUnavailableHint: phrase(
      "Аудіо недоступне, фразу показано нижче",
      "El audio no está disponible; la frase aparece abajo",
      "O áudio não está disponível; a frase aparece abaixo",
      "Âm thanh không khả dụng; câu ở bên dưới",
      "Audio tidak tersedia; frasa ditampilkan di bawah",
      "Ses kullanılamıyor; cümle aşağıda gösteriliyor",
      "Nagranie jest niedostępne; fraza znajduje się niżej",
    ),
    audioOfflineHint: phrase(
      "Відтворює запис без інтернету",
      "Reproduce una grabación sin conexión",
      "Reproduz uma gravação sem internet",
      "Phát bản ghi không cần mạng",
      "Memutar rekaman tanpa internet",
      "Kaydı internet olmadan oynatır",
      "Odtwarza nagranie bez internetu",
    ),
    localAudioUnavailable: phrase(
      "Локальний запис недоступний. Фразу показано текстом.",
      "La grabación local no está disponible. Se muestra la frase.",
      "A gravação local não está disponível. A frase foi exibida.",
      "Bản ghi không khả dụng. Câu được hiển thị bằng chữ.",
      "Rekaman lokal tidak tersedia. Frasa ditampilkan.",
      "Yerel kayıt kullanılamıyor. Cümle metin olarak gösteriliyor.",
      "Nagranie lokalne jest niedostępne. Fraza jest pokazana jako tekst.",
    ),
    localAudioFailed: phrase(
      "Не вдалося відтворити запис. Фразу показано текстом.",
      "No se pudo reproducir la grabación. Se muestra la frase.",
      "Não foi possível reproduzir a gravação. A frase foi exibida.",
      "Không thể phát bản ghi. Câu được hiển thị bằng chữ.",
      "Rekaman gagal diputar. Frasa ditampilkan.",
      "Kayıt oynatılamadı. Cümle metin olarak gösteriliyor.",
      "Nie udało się odtworzyć nagrania. Fraza jest pokazana jako tekst.",
    ),
    listenPrompt: phrase(
      "Прослухай фразу й вибери її значення",
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
      "Тренувальне повторення · голос не записується й не оцінюється",
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
      "Я повторив уголос",
      "Lo repetí en voz alta",
      "Repeti em voz alta",
      "Tôi đã đọc to",
      "Saya mengulanginya dengan suara keras",
      "Yüksek sesle tekrarladım",
      "Powtórzono na głos",
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
      "Надіслати звіт про завдання",
      "Enviar un reporte sobre esta tarea",
      "Enviar um relato sobre esta tarefa",
      "Báo cáo bài tập này",
      "Laporkan tugas ini",
      "Bu görevi bildir",
      "Zgłoś to zadanie",
    ),
    savePhrase: phrase(
      "Зберегти фразу в картки",
      "Guardar la frase en tarjetas",
      "Salvar a frase nos cartões",
      "Lưu câu vào thẻ",
      "Simpan frasa ke kartu",
      "Cümleyi kartlara kaydet",
      "Zapisz frazę w fiszkach",
    ),
    saveAdded: phrase(
      "Фразу збережено в картки",
      "Frase guardada en tarjetas",
      "Frase salva nos cartões",
      "Đã lưu câu vào thẻ",
      "Frasa disimpan ke kartu",
      "Cümle kartlara kaydedildi",
      "Fraza została zapisana w fiszkach",
    ),
    saveFirstEver: phrase(
      "Ви зберегли свою першу картку. Потренуйте її будь-коли в розділі «Картки»",
      "Has guardado tu primera tarjeta. Practícala cuando quieras en «Tarjetas»",
      "Você salvou seu primeiro cartão. Pratique quando quiser em «Cartões»",
      "Bạn đã lưu thẻ đầu tiên. Luyện tập bất cứ lúc nào trong mục «Thẻ»",
      "Kamu menyimpan kartu pertamamu. Latih kapan saja di bagian «Kartu»",
      "İlk kartını kaydettin. İstediğin zaman «Kartlar» bölümünde çalış",
      "Zapisano pierwszą fiszkę. Poćwicz ją kiedy chcesz w sekcji «Fiszki»",
    ),
    saveDuplicate: phrase(
      "Фраза вже є в картках",
      "La frase ya está en tus tarjetas",
      "A frase já está nos cartões",
      "Câu đã có trong thẻ",
      "Frasa sudah ada di kartu",
      "Cümle zaten kartlarda",
      "Fraza jest już w fiszkach",
    ),
    saveFailed: phrase(
      "Не вдалося зберегти фразу",
      "No se pudo guardar la frase",
      "Não foi possível salvar a frase",
      "Không thể lưu câu",
      "Gagal menyimpan frasa",
      "Cümle kaydedilemedi",
      "Nie udało się zapisać frazy",
    ),
    voiceSpeaking: phrase(
      "Говоріть — відпустіть кнопку, щоб зупинити",
      "Habla; suelta el botón para parar",
      "Fale; solte o botão para parar",
      "Hãy nói — thả nút để dừng",
      "Bicara — lepaskan tombol untuk berhenti",
      "Konuşun — durdurmak için düğmeyi bırakın",
      "Mów — puść przycisk, aby zatrzymać",
    ),
    voicePermission: phrase(
      "Дозвольте доступ до мікрофона в налаштуваннях",
      "Permite el acceso al micrófono en ajustes",
      "Permita o acesso ao microfone nos ajustes",
      "Hãy cho phép dùng micrô trong cài đặt",
      "Izinkan akses mikrofon di pengaturan",
      "Ayarlardan mikrofon erişimine izin verin",
      "Zezwól na mikrofon w ustawieniach",
    ),
    voiceUnavailable: phrase(
      "Голосова відповідь зараз недоступна",
      "La respuesta por voz no está disponible",
      "A resposta por voz não está disponível",
      "Hiện không thể trả lời bằng giọng nói",
      "Jawaban suara tidak tersedia",
      "Sesli yanıt kullanılamıyor",
      "Odpowiedź głosowa jest niedostępna",
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
      "Не вдалося почати голосову відповідь",
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
      "Утримуйте, щоб відповісти голосом",
      "Mantén pulsado para responder por voz",
      "Segure para responder por voz",
      "Giữ để trả lời bằng giọng nói",
      "Tahan untuk menjawab dengan suara",
      "Sesle yanıtlamak için basılı tutun",
      "Przytrzymaj, aby odpowiedzieć głosem",
    ),
    secondError: phrase(
      "Майже. Подивись уважніше й спробуй ще раз.",
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
      "Спробуй ще раз без розкриття відповіді",
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
      "Завдання отримає нуль зірок, сесія продовжиться",
      "La tarea recibirá cero estrellas y la sesión continuará",
      "A tarefa receberá zero estrelas e a sessão continuará",
      "Bài tập nhận 0 sao và phiên học tiếp tục",
      "Tugas mendapat nol bintang dan sesi berlanjut",
      "Görev sıfır yıldız alır ve oturum devam eder",
      "Zadanie otrzyma zero gwiazdek, a sesja będzie kontynuowana",
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
      "Нагороду за повтор буде підтверджено окремо й автоматично додано до загального балансу.",
      "La recompensa por repetir se confirmará por separado y se añadirá automáticamente.",
      "A recompensa da repetição será confirmada separadamente e adicionada automaticamente.",
      "Phần thưởng học lại sẽ được xác nhận riêng và tự động cộng vào tổng điểm.",
      "Hadiah pengulangan akan dikonfirmasi terpisah dan ditambahkan otomatis.",
      "Tekrar ödülü ayrıca onaylanıp toplam puana otomatik eklenir.",
      "Nagroda za powtórkę zostanie potwierdzona osobno i dodana automatycznie.",
    ),
    stored: phrase(
      "Результат збережено на пристрої та буде синхронізовано автоматично.",
      "El resultado se guardó en el dispositivo y se sincronizará automáticamente.",
      "O resultado foi salvo no dispositivo e será sincronizado automaticamente.",
      "Kết quả đã lưu trên thiết bị và sẽ tự đồng bộ.",
      "Hasil disimpan di perangkat dan akan disinkronkan otomatis.",
      "Sonuç cihaza kaydedildi ve otomatik eşitlenecek.",
      "Wynik zapisano na urządzeniu i zostanie zsynchronizowany automatycznie.",
    ),
    perfectBody: phrase(
      "Ідеальна сесія — зібрано всі зірки.",
      "Sesión perfecta: conseguiste todas las estrellas.",
      "Sessão perfeita: você ganhou todas as estrelas.",
      "Phiên học hoàn hảo — bạn đã nhận đủ sao.",
      "Sesi sempurna — semua bintang terkumpul.",
      "Kusursuz oturum — tüm yıldızları topladın.",
      "Idealna sesja — zdobyto wszystkie gwiazdki.",
    ),
    improveBody: (n) =>
      phrase(
        `Результат можна покращити ще на ${number(n)} ${noun}.`,
        `Puedes mejorar el resultado en ${number(n)} ${noun} más.`,
        `Você pode melhorar o resultado em mais ${number(n)} ${noun}.`,
        `Bạn có thể tăng thêm ${number(n)} ${noun}.`,
        `Hasil masih bisa ditingkatkan sebanyak ${number(n)} ${noun}.`,
        `Sonucu ${number(n)} ${noun} daha artırabilirsin.`,
        `Możesz poprawić wynik o jeszcze ${number(n)} ${noun}.`,
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
        `Зібрано ${n} із 36 зірок у цій сесії`,
        `${n} de 36 estrellas en esta sesión`,
        `${n} de 36 estrelas nesta sessão`,
        `Đã nhận ${n}/36 sao trong phiên này`,
        `${n} dari 36 bintang di sesi ini`,
        `Bu oturumda 36 yıldızın ${n} tanesi toplandı`,
        `Zdobyto ${n} z 36 gwiazdek w tej sesji`,
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
    starWord: () => noun,
    collected: (n) =>
      phrase(
        `Зібрано ${number(n)} ${noun}`,
        `Conseguiste ${number(n)} ${noun}`,
        `Você ganhou ${number(n)} ${noun}`,
        `Đã nhận ${number(n)} ${noun}`,
        `Terkumpul ${number(n)} ${noun}`,
        `${number(n)} ${noun} toplandı`,
        `Zdobyto ${number(n)} ${noun}`,
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
      `${base.perfect} ${a}. ${base.recovered} ${b}. ${base.supported} ${c}. ${base.skipped} ${d}.`,
    backToMap: (n) =>
      phrase(
        `Повернутися на мапу з результатом ${n} ${noun}`,
        `Volver al mapa con ${n} ${noun}`,
        `Voltar ao mapa com ${n} ${noun}`,
        `Về bản đồ với ${n} ${noun}`,
        `Kembali ke peta dengan ${n} ${noun}`,
        `${n} ${noun} ile haritaya dön`,
        `Wróć do mapy z wynikiem ${n} ${noun}`,
      ),
    rewardLabel: (award) => {
      const quality =
        award === 1
          ? { title: base.supported, detail: base.supported }
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
                title: base.perfect,
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
      return `${quality.title}. +${award} ${noun}. ${quality.detail}.`;
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
                "СИЛЬНА СЕСІЯ",
                "SESIÓN SÓLIDA",
                "SESSÃO FORTE",
                "PHIÊN HỌC TỐT",
                "SESI KUAT",
                "GÜÇLÜ OTURUM",
                "MOCNA SESJA",
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
      1: { title: base.supported, detail: base.supported },
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
        title: base.perfect,
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

export function learningV2SessionCopy(lang: Lang): SessionCopy {
  return copies[lang];
}
