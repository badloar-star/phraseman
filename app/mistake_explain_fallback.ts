/**
 * Локальное короткое объяснение ошибки, когда ИИ не ответил (D158, 03.10).
 *
 * зачем: после 2 автоповторов человек не должен смотреть на вечный скелетон. Показываем
 * мгновенный текст, собранный ТОЛЬКО из уже известных данных ошибки (слово, которое нужно, и
 * слово, которое написал ученик). Грамматику не выдумываем и терминов не используем (Библия
 * текстов Learning V2): шаблон лишь указывает, где расхождение. Чистый модуль — без сети и
 * побочных эффектов, тестируется в node.
 */
import { triLang, type Lang } from '../constants/i18n';

export interface MistakeFallbackInput {
  /** Слово, которое написал ученик (undefined — слова не хватило). */
  picked?: string | null;
  /** Слово, которое было нужно. */
  expected?: string | null;
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildMistakeExplainFallbackText(lang: Lang, input: MistakeFallbackInput): string {
  const expected = clean(input.expected);
  const picked = clean(input.picked);
  if (expected && picked) {
    return triLang(lang, {
      ru: `Здесь нужно «${expected}», а у тебя «${picked}». Скажи правильную фразу вслух ещё раз.`,
      uk: `Тут потрібно «${expected}», а в тебе «${picked}». Скажи правильний вислів вголос ще раз.`,
      en: `Here you need “${expected}”, and you wrote “${picked}”. Say the correct phrase out loud once more.`,
      es: `Aquí va «${expected}», y tú pusiste «${picked}». Di la frase correcta en voz alta otra vez.`,
      'pt-BR': `Aqui vai «${expected}», e você escreveu «${picked}». Diga a frase certa em voz alta mais uma vez.`,
      vi: `Ở đây cần “${expected}”, còn bạn viết “${picked}”. Hãy đọc to câu đúng thêm một lần nữa.`,
      id: `Di sini seharusnya “${expected}”, sedangkan kamu menulis “${picked}”. Ucapkan kalimat yang benar sekali lagi dengan lantang.`,
      tr: `Burada “${expected}” olmalı, sen “${picked}” yazdın. Doğru cümleyi bir kez daha yüksek sesle söyle.`,
      pl: `Tutaj pasuje „${expected}”, a w Twojej odpowiedzi jest „${picked}”. Powiedz poprawne zdanie jeszcze raz na głos.`,
    });
  }
  if (expected) {
    return triLang(lang, {
      ru: `Здесь не хватает «${expected}». Скажи правильную фразу вслух ещё раз.`,
      uk: `Тут бракує «${expected}». Скажи правильний вислів вголос ще раз.`,
      en: `“${expected}” is missing here. Say the correct phrase out loud once more.`,
      es: `Aquí falta «${expected}». Di la frase correcta en voz alta otra vez.`,
      'pt-BR': `Aqui falta «${expected}». Diga a frase certa em voz alta mais uma vez.`,
      vi: `Ở đây còn thiếu “${expected}”. Hãy đọc to câu đúng thêm một lần nữa.`,
      id: `Di sini kurang “${expected}”. Ucapkan kalimat yang benar sekali lagi dengan lantang.`,
      tr: `Burada “${expected}” eksik. Doğru cümleyi bir kez daha yüksek sesle söyle.`,
      pl: `Tutaj brakuje „${expected}”. Powiedz poprawne zdanie jeszcze raz na głos.`,
    });
  }
  return triLang(lang, {
    ru: 'Сравни свой ответ с правильным и найди, где они расходятся.',
    uk: 'Порівняй свою відповідь з правильною і знайди, де вони розходяться.',
    en: 'Compare your answer with the correct one and find where they differ.',
    es: 'Compara tu respuesta con la correcta y busca dónde se separan.',
    'pt-BR': 'Compare sua resposta com a certa e encontre onde elas diferem.',
    vi: 'Hãy so câu của bạn với câu đúng và tìm chỗ khác nhau.',
    id: 'Bandingkan jawabanmu dengan yang benar dan temukan bagian yang berbeda.',
    tr: 'Cevabını doğru cevapla karşılaştır ve nerede ayrıldıklarını bul.',
    pl: 'Porównaj swoją odpowiedź z poprawną i znajdź, gdzie się różnią.',
  });
}

/** Неброская строка рядом с шаблоном: настоящий разбор ИИ ещё придёт. */
export function aiExplainLaterNote(lang: Lang): string {
  return triLang(lang, {
    ru: 'Разбор ИИ появится позже',
    uk: 'Розбір ШІ з’явиться пізніше',
    en: 'The AI breakdown will appear later',
    es: 'El análisis de la IA llegará más tarde',
    'pt-BR': 'A análise da IA aparece mais tarde',
    vi: 'Phần phân tích của AI sẽ có sau',
    id: 'Analisis AI akan muncul nanti',
    tr: 'Yapay zekâ analizi sonra gelecek',
    pl: 'Analiza AI pojawi się później',
  });
}

/** Ручная кнопка: ещё одна попытка получить разбор ИИ. */
export function aiExplainRefreshLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'Обновить',
    uk: 'Оновити',
    en: 'Refresh',
    es: 'Actualizar',
    'pt-BR': 'Atualizar',
    vi: 'Làm mới',
    id: 'Muat ulang',
    tr: 'Yenile',
    pl: 'Odśwież',
  });
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
