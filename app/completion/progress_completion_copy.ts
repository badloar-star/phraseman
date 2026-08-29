import { triLang, type Lang } from '../../constants/i18n';

export function lessonSavedResultCopy(lang: Lang): string {
  return triLang(lang, { ru: 'Результат сохранён в твоём пути', uk: 'Результат збережено у твоєму шляху', en: 'Your result has been saved to your path', es: 'El resultado quedó guardado en tu camino', 'pt-BR': 'O resultado foi salvo no seu caminho', vi: 'Kết quả đã được lưu vào hành trình của bạn', id: 'Hasil tersimpan di perjalananmu', tr: 'Sonuç yolculuğuna kaydedildi', pl: 'Wynik zapisano na twojej drodze' });
}
