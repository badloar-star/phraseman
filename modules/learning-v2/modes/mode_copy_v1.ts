import type { LearningV2InterfaceLocale } from "../content/generator_course_contract";

const CHECK_LABEL: Readonly<Record<LearningV2InterfaceLocale, string>> =
  Object.freeze({
    ru: "Проверить",
    uk: "Перевірити",
    es: "Comprobar",
    "pt-BR": "Verificar",
    vi: "Kiểm tra",
    id: "Periksa",
    tr: "Kontrol et",
    pl: "Sprawdź",
    en: "Check",
  });

export function learningV2ModeCheckLabelV1(
  locale: LearningV2InterfaceLocale,
): string {
  return CHECK_LABEL[locale];
}

type AudioCopy = Readonly<{
  slow: string;
  unavailable: string;
  loading: string;
  playing: string;
  replay: string;
  play: string;
}>;

const AUDIO_COPY: Readonly<Record<LearningV2InterfaceLocale, AudioCopy>> = Object.freeze({
  ru: { slow: "Прослушать медленнее", unavailable: "Звук пока не загрузился", loading: "Загружаем звук…", playing: "Звучит…", replay: "Прослушать ещё раз", play: "Нажми, чтобы послушать" },
  uk: { slow: "Прослухати повільніше", unavailable: "Звук поки не завантажився", loading: "Завантажуємо звук…", playing: "Відтворюється…", replay: "Прослухати ще раз", play: "Натисни, щоб прослухати" },
  es: { slow: "Escuchar más despacio", unavailable: "El audio no está disponible", loading: "Reproduciendo…", playing: "Reproduciendo…", replay: "Escuchar de nuevo", play: "Pulsa para escuchar" },
  "pt-BR": { slow: "Ouvir mais devagar", unavailable: "O áudio está indisponível", loading: "Reproduzindo…", playing: "Reproduzindo…", replay: "Ouvir novamente", play: "Toque para ouvir" },
  vi: { slow: "Nghe chậm hơn", unavailable: "Âm thanh chưa khả dụng", loading: "Đang phát…", playing: "Đang phát…", replay: "Nghe lại", play: "Chạm để nghe" },
  id: { slow: "Dengarkan lebih lambat", unavailable: "Audio belum tersedia", loading: "Sedang diputar…", playing: "Sedang diputar…", replay: "Dengarkan lagi", play: "Ketuk untuk mendengarkan" },
  tr: { slow: "Daha yavaş dinle", unavailable: "Ses şu anda kullanılamıyor", loading: "Çalıyor…", playing: "Çalıyor…", replay: "Tekrar dinle", play: "Dinlemek için dokun" },
  pl: { slow: "Posłuchaj wolniej", unavailable: "Dźwięk jest niedostępny", loading: "Odtwarzanie…", playing: "Odtwarzanie…", replay: "Posłuchaj ponownie", play: "Dotknij, aby posłuchać" },
  en: { slow: "Listen more slowly", unavailable: "Audio is unavailable", loading: "Playing…", playing: "Playing…", replay: "Listen again", play: "Tap to listen" },
});

export function learningV2ModeAudioCopyV1(locale: LearningV2InterfaceLocale): AudioCopy {
  return AUDIO_COPY[locale];
}

type SpeedMatchCopy = Readonly<{
  title: string;
  timeout: string;
  again: string;
  withoutTimer: string;
  secondsSuffix: string;
}>;

const SPEED_MATCH_COPY: Readonly<Record<LearningV2InterfaceLocale, SpeedMatchCopy>> = Object.freeze({
  ru: { title: "Найди пару быстро", timeout: "Время вышло!", again: "Ещё раунд", withoutTimer: "Продолжить без таймера", secondsSuffix: "с" },
  uk: { title: "Швидко знайди пару", timeout: "Час вийшов!", again: "Ще раунд", withoutTimer: "Продовжити без таймера", secondsSuffix: "с" },
  es: { title: "Encuentra la pareja", timeout: "Se acabó el tiempo", again: "Otra ronda", withoutTimer: "Continuar sin tiempo", secondsSuffix: "s" },
  "pt-BR": { title: "Encontre o par", timeout: "O tempo acabou", again: "Outra rodada", withoutTimer: "Continuar sem cronômetro", secondsSuffix: "s" },
  vi: { title: "Tìm cặp thật nhanh", timeout: "Hết giờ", again: "Chơi lại", withoutTimer: "Tiếp tục không tính giờ", secondsSuffix: "giây" },
  id: { title: "Temukan pasangannya", timeout: "Waktu habis", again: "Ronde lagi", withoutTimer: "Lanjut tanpa waktu", secondsSuffix: "d" },
  tr: { title: "Eşini hızlı bul", timeout: "Süre doldu", again: "Bir tur daha", withoutTimer: "Süresiz devam et", secondsSuffix: "sn" },
  pl: { title: "Szybko znajdź parę", timeout: "Czas minął", again: "Jeszcze jedna runda", withoutTimer: "Kontynuuj bez czasu", secondsSuffix: "s" },
  en: { title: "Find the match", timeout: "Time is up", again: "Another round", withoutTimer: "Continue without a timer", secondsSuffix: "s" },
});

export function learningV2ModeSpeedMatchCopyV1(locale: LearningV2InterfaceLocale): SpeedMatchCopy {
  return SPEED_MATCH_COPY[locale];
}

const NEW_WORD_FLIP_HINT: Readonly<Record<LearningV2InterfaceLocale, string>> = Object.freeze({
  ru: "Нажми на карточку — она перевернётся",
  uk: "Натисни на картку — вона перевернеться",
  es: "Toca la tarjeta para darle la vuelta",
  "pt-BR": "Toque no cartão para virar",
  vi: "Chạm vào thẻ để lật",
  id: "Ketuk kartu untuk membaliknya",
  tr: "Kartı çevirmek için dokun",
  pl: "Dotknij karty, żeby ją odwrócić",
  en: "Tap the card to flip it",
});

export function learningV2NewWordFlipHintV1(locale: LearningV2InterfaceLocale): string {
  return NEW_WORD_FLIP_HINT[locale];
}

type ContextGapCopy = Readonly<{ title: string; playPhrase: string }>;
const CONTEXT_GAP_COPY: Readonly<Record<LearningV2InterfaceLocale, ContextGapCopy>> = Object.freeze({
  ru: { title: "Заполни пропуск", playPhrase: "Прослушать фразу" },
  uk: { title: "Заповни пропуск", playPhrase: "Прослухати фразу" },
  es: { title: "Completa el espacio", playPhrase: "Escuchar la frase" },
  "pt-BR": { title: "Complete a lacuna", playPhrase: "Ouvir a frase" },
  vi: { title: "Điền vào chỗ trống", playPhrase: "Nghe câu" },
  id: { title: "Isi bagian kosong", playPhrase: "Dengarkan frasa" },
  tr: { title: "Boşluğu doldur", playPhrase: "İfadeyi dinle" },
  pl: { title: "Uzupełnij lukę", playPhrase: "Posłuchaj zwrotu" },
  en: { title: "Fill in the gap", playPhrase: "Listen to the phrase" },
});

export function learningV2ModeContextGapCopyV1(locale: LearningV2InterfaceLocale): ContextGapCopy {
  return CONTEXT_GAP_COPY[locale];
}

type RepeatCompareCopy = Readonly<{
  recording: string;
  listening: string;
  listenReference: string;
  preparingMicrophone: string;
  success: string;
}>;
const REPEAT_COMPARE_COPY: Readonly<Record<LearningV2InterfaceLocale, RepeatCompareCopy>> = Object.freeze({
  ru: { recording: "Идёт запись", listening: "Слушаю", listenReference: "Послушать, как надо", preparingMicrophone: "Готовим микрофон…", success: "Отлично сказано!" },
  uk: { recording: "Триває запис", listening: "Слухаю", listenReference: "Послухати, як треба", preparingMicrophone: "Готуємо мікрофон…", success: "Чудово сказано!" },
  es: { recording: "Grabando", listening: "Escuchando", listenReference: "Escuchar el modelo", preparingMicrophone: "Preparando el micrófono…", success: "¡Muy bien dicho!" },
  "pt-BR": { recording: "Gravando", listening: "Ouvindo", listenReference: "Ouvir o modelo", preparingMicrophone: "Preparando o microfone…", success: "Muito bem falado!" },
  vi: { recording: "Đang ghi âm", listening: "Đang nghe", listenReference: "Nghe câu mẫu", preparingMicrophone: "Đang chuẩn bị micrô…", success: "Nói rất tốt!" },
  id: { recording: "Sedang merekam", listening: "Mendengarkan", listenReference: "Dengarkan contoh", preparingMicrophone: "Menyiapkan mikrofon…", success: "Bagus sekali!" },
  tr: { recording: "Kayıt yapılıyor", listening: "Dinliyorum", listenReference: "Örneği dinle", preparingMicrophone: "Mikrofon hazırlanıyor…", success: "Harika söyledin!" },
  pl: { recording: "Nagrywanie", listening: "Słucham", listenReference: "Posłuchaj wzoru", preparingMicrophone: "Przygotowujemy mikrofon…", success: "Świetnie powiedziane!" },
  en: { recording: "Recording", listening: "Listening", listenReference: "Listen to the model", preparingMicrophone: "Preparing the microphone…", success: "Well said!" },
});

export function learningV2ModeRepeatCompareCopyV1(locale: LearningV2InterfaceLocale): RepeatCompareCopy {
  return REPEAT_COMPARE_COPY[locale];
}

export function learningV2RuneAccessibilityLabelV1(
  locale: LearningV2InterfaceLocale,
  count: number,
): string {
  const integer = Math.max(0, Math.trunc(count));
  const mod10 = integer % 10;
  const mod100 = integer % 100;
  const slavicOne = mod10 === 1 && mod100 !== 11;
  const slavicFew = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
  const noun: Readonly<Record<LearningV2InterfaceLocale, string>> = {
    ru: slavicOne ? "монета" : slavicFew ? "монеты" : "монет",
    uk: slavicOne ? "монета" : slavicFew ? "монети" : "монет",
    es: integer === 1 ? "runa" : "runas",
    "pt-BR": integer === 1 ? "runa" : "runas",
    vi: "xu",
    id: "koin",
    tr: "jeton",
    pl: integer === 1 ? "runa" : slavicFew ? "runy" : "run",
    en: integer === 1 ? "rune" : "runes",
  };
  return `${integer} ${noun[locale]}`;
}
