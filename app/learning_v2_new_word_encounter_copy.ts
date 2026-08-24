import type { LearningV2InterfaceLocale } from "../modules/learning-v2/content/generator_course_contract";

export type LearningV2NewWordSaveStateV1 =
  | "not_saved"
  | "saving"
  | "saved"
  | "save_failed";

export type LearningV2NewWordAudioStateV1 =
  | "autoplay_pending"
  | "playing"
  | "idle"
  | "unavailable";

type StaticCopy = Readonly<{
  label: string;
  continue: string;
  saving: string;
  saveFailed: string;
  unavailable: string;
  counter: (position: number, total: number) => string;
  save: (word: string) => string;
  remove: (word: string) => string;
  play: (word: string) => string;
  playing: (word: string) => string;
}>;

const COPY: Readonly<Record<LearningV2InterfaceLocale, StaticCopy>> = {
  ru: {
    label: "Новое слово",
    continue: "Продолжить",
    saving: "Сохраняем…",
    saveFailed: "Не сохранилось. Можно попробовать ещё раз.",
    unavailable: "Озвучка пока недоступна",
    counter: (position, total) => `${position} из ${total}`,
    save: (word) => `Сохранить ${word} в карточки`,
    remove: (word) => `Убрать ${word} из карточек`,
    play: (word) => `Повторить слово ${word}`,
    playing: (word) => `Звучит слово ${word}`,
  },
  uk: {
    label: "Нове слово",
    continue: "Продовжити",
    saving: "Зберігаємо…",
    saveFailed: "Не збереглося. Спробуйте ще раз.",
    unavailable: "Озвучення поки недоступне",
    counter: (position, total) => `${position} із ${total}`,
    save: (word) => `Зберегти ${word} у картки`,
    remove: (word) => `Прибрати ${word} з карток`,
    play: (word) => `Повторити слово ${word}`,
    playing: (word) => `Звучить слово ${word}`,
  },
  es: {
    label: "Palabra nueva",
    continue: "Continuar",
    saving: "Guardando…",
    saveFailed: "No se guardó. Puedes intentarlo de nuevo.",
    unavailable: "El audio aún no está disponible",
    counter: (position, total) => `${position} de ${total}`,
    save: (word) => `Guardar ${word} en tarjetas`,
    remove: (word) => `Quitar ${word} de las tarjetas`,
    play: (word) => `Repetir la palabra ${word}`,
    playing: (word) => `Reproduciendo ${word}`,
  },
  en: {
    label: "New word",
    continue: "Continue",
    saving: "Saving…",
    saveFailed: "It did not save. You can try again.",
    unavailable: "Audio is not available yet",
    counter: (position, total) => `${position} of ${total}`,
    save: (word) => `Save ${word} to cards`,
    remove: (word) => `Remove ${word} from cards`,
    play: (word) => `Play the word ${word} again`,
    playing: (word) => `Playing the word ${word}`,
  },
  "pt-BR": {
    label: "Palavra nova",
    continue: "Continuar",
    saving: "Salvando…",
    saveFailed: "Não foi salva. Você pode tentar de novo.",
    unavailable: "O áudio ainda não está disponível",
    counter: (position, total) => `${position} de ${total}`,
    save: (word) => `Salvar ${word} nos cartões`,
    remove: (word) => `Remover ${word} dos cartões`,
    play: (word) => `Ouvir a palavra ${word} novamente`,
    playing: (word) => `Reproduzindo ${word}`,
  },
  vi: {
    label: "Từ mới",
    continue: "Tiếp tục",
    saving: "Đang lưu…",
    saveFailed: "Chưa lưu được. Bạn có thể thử lại.",
    unavailable: "Âm thanh hiện chưa có",
    counter: (position, total) => `${position} / ${total}`,
    save: (word) => `Lưu ${word} vào thẻ`,
    remove: (word) => `Bỏ ${word} khỏi thẻ`,
    play: (word) => `Nghe lại từ ${word}`,
    playing: (word) => `Đang phát từ ${word}`,
  },
  id: {
    label: "Kata baru",
    continue: "Lanjutkan",
    saving: "Menyimpan…",
    saveFailed: "Belum tersimpan. Coba lagi.",
    unavailable: "Audio belum tersedia",
    counter: (position, total) => `${position} dari ${total}`,
    save: (word) => `Simpan ${word} ke kartu`,
    remove: (word) => `Hapus ${word} dari kartu`,
    play: (word) => `Putar ulang kata ${word}`,
    playing: (word) => `Memutar kata ${word}`,
  },
  tr: {
    label: "Yeni kelime",
    continue: "Devam et",
    saving: "Kaydediliyor…",
    saveFailed: "Kaydedilemedi. Yeniden deneyebilirsiniz.",
    unavailable: "Ses henüz kullanılamıyor",
    counter: (position, total) => `${position} / ${total}`,
    save: (word) => `${word} kelimesini kartlara kaydet`,
    remove: (word) => `${word} kelimesini kartlardan çıkar`,
    play: (word) => `${word} kelimesini yeniden dinle`,
    playing: (word) => `${word} kelimesi çalıyor`,
  },
  pl: {
    label: "Nowe słowo",
    continue: "Dalej",
    saving: "Zapisywanie…",
    saveFailed: "Nie zapisano. Możesz spróbować ponownie.",
    unavailable: "Nagranie nie jest jeszcze dostępne",
    counter: (position, total) => `${position} z ${total}`,
    save: (word) => `Zapisz ${word} w kartach`,
    remove: (word) => `Usuń ${word} z kart`,
    play: (word) => `Odtwórz słowo ${word} ponownie`,
    playing: (word) => `Odtwarzanie słowa ${word}`,
  },
};

export function learningV2NewWordEncounterCopy(
  input: Readonly<{
    locale: LearningV2InterfaceLocale;
    word: string;
    position: number;
    total: number;
    saveState: LearningV2NewWordSaveStateV1;
    audioState: LearningV2NewWordAudioStateV1;
  }>,
) {
  const copy = COPY[input.locale];
  return Object.freeze({
    label: copy.label,
    counter: copy.counter(input.position, input.total),
    continue: copy.continue,
    saveLabel:
      input.saveState === "saved"
        ? copy.remove(input.word)
        : copy.save(input.word),
    saveStatus:
      input.saveState === "saving"
        ? copy.saving
        : input.saveState === "save_failed"
          ? copy.saveFailed
          : null,
    audioLabel:
      input.audioState === "playing" || input.audioState === "autoplay_pending"
        ? copy.playing(input.word)
        : input.audioState === "unavailable"
          ? copy.unavailable
          : copy.play(input.word),
  });
}
