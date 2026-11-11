/**
 * Подписи экранов двенадцати новых механик на девяти языках интерфейса.
 * зачем: тексты самого задания (инструкция, условие, пояснения) приходят с заданием;
 * здесь только неизменные подписи экрана — из макета Кодекса `peak-all-languages.html`.
 * Обращение на «вы», как в макете и в остальном Пике.
 */
import { triLang, type Lang } from '../../constants/i18n';

type Row = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;

const STRINGS = {
  check: { ru: 'Проверить', uk: 'Перевірити', en: 'Check', es: 'Comprobar', 'pt-BR': 'Verificar', vi: 'Kiểm tra', id: 'Periksa', tr: 'Kontrol et', pl: 'Sprawdź' },
  next: { ru: 'Дальше', uk: 'Далі', en: 'Next', es: 'Siguiente', 'pt-BR': 'Avançar', vi: 'Tiếp', id: 'Lanjut', tr: 'İleri', pl: 'Dalej' },
  right: { ru: 'Верно', uk: 'Правильно', en: 'Correct', es: 'Correcto', 'pt-BR': 'Correto', vi: 'Đúng', id: 'Benar', tr: 'Doğru', pl: 'Dobrze' },
  correctIs: { ru: 'Правильно: {x}', uk: 'Правильно: {x}', en: 'Correct: {x}', es: 'Correcto: {x}', 'pt-BR': 'Correto: {x}', vi: 'Đáp án: {x}', id: 'Jawaban: {x}', tr: 'Doğrusu: {x}', pl: 'Poprawnie: {x}' },
  replaceWith: { ru: 'Заменить на', uk: 'Замінити на', en: 'Replace with', es: 'Sustituir por', 'pt-BR': 'Trocar por', vi: 'Thay bằng', id: 'Ganti dengan', tr: 'Şununla değiştir', pl: 'Zamień na' },
  gapN: { ru: 'Пропуск {n}', uk: 'Пропуск {n}', en: 'Gap {n}', es: 'Hueco {n}', 'pt-BR': 'Lacuna {n}', vi: 'Chỗ trống {n}', id: 'Rumpang {n}', tr: 'Boşluk {n}', pl: 'Luka {n}' },
  missingWord: { ru: 'Пропущенное слово', uk: 'Пропущене слово', en: 'Missing word', es: 'Palabra que falta', 'pt-BR': 'Palavra que falta', vi: 'Từ còn thiếu', id: 'Kata yang hilang', tr: 'Eksik kelime', pl: 'Brakujące słowo' },
  yourSentence: { ru: 'Ваше предложение', uk: 'Ваше речення', en: 'Your sentence', es: 'Su frase', 'pt-BR': 'Sua frase', vi: 'Câu của bạn', id: 'Kalimat Anda', tr: 'Cümleniz', pl: 'Twoje zdanie' },
  countOrder: {
    ru: '{k} из {n} · нажмите на реплику, чтобы вернуть её', uk: '{k} з {n} · натисніть на репліку, щоб повернути її',
    en: '{k} of {n} · tap a line to put it back', es: '{k} de {n} · toque una réplica para devolverla',
    'pt-BR': '{k} de {n} · toque em uma fala para devolvê-la', vi: '{k}/{n} · chạm vào câu để trả lại',
    id: '{k} dari {n} · ketuk kalimat untuk mengembalikannya', tr: '{k} / {n} · geri koymak için cümleye dokunun',
    pl: '{k} z {n} · dotknij kwestii, aby ją cofnąć',
  },
  countWords: {
    ru: '{k} из {n} · нажмите на слово, чтобы вернуть его', uk: '{k} з {n} · натисніть на слово, щоб повернути його',
    en: '{k} of {n} · tap a word to put it back', es: '{k} de {n} · toque una palabra para devolverla',
    'pt-BR': '{k} de {n} · toque em uma palavra para devolvê-la', vi: '{k}/{n} · chạm vào từ để trả lại',
    id: '{k} dari {n} · ketuk kata untuk mengembalikannya', tr: '{k} / {n} · geri koymak için kelimeye dokunun',
    pl: '{k} z {n} · dotknij słowa, aby je cofnąć',
  },
  countPicked: { ru: 'Выбрано {k} из {n}', uk: 'Обрано {k} з {n}', en: '{k} of {n} selected', es: '{k} de {n} elegidas', 'pt-BR': '{k} de {n} selecionadas', vi: 'Đã chọn {k}/{n}', id: '{k} dari {n} dipilih', tr: '{k} / {n} seçildi', pl: 'Wybrano {k} z {n}' },
} as const satisfies Record<string, Row>;

export type ExpandedStringKey = keyof typeof STRINGS;

export function expandedText(lang: Lang, key: ExpandedStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const template = triLang(lang, STRINGS[key]);
  if (!vars) return template;
  return Object.entries(vars).reduce((text, [name, value]) => text.split(`{${name}}`).join(String(value)), template);
}
