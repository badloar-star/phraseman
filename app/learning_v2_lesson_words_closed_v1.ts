// learning_v2_lesson_words_closed_v1.ts — сколько слов урока ещё закрыто и как об этом сказать (экран «Слова» Learning V2).
// зачем (координатор 22.10, одобрено): экран «Слова» показывал только открытые слова, и не было видно, что впереди ещё слова.
// Закрытые — числом, без названий (не раскрываем занятия наперёд). Число — из каталога фабрики, вшитого в сборку: без чтений.
import { factoryNativeLearningV2NewWordCountV1 } from '../modules/learning-v2/content/factory_native/factory_native_catalog_v1';
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from '../modules/learning-v2/content/course_topology_v1';

/** Сколько новых слов в уроке всего — сумма по занятиям урока из каталога фабрики. */
export function learningV2LessonNewWordTotalV1(lessonOrdinal: number): number {
  let total = 0;
  for (let session = 1; session <= LEARNING_V2_LESSON_SESSION_COUNT_V1; session += 1) total += factoryNativeLearningV2NewWordCountV1(lessonOrdinal, session) ?? 0;
  return total;
}

/** «Ещё N слов откроются в эпизодах урока». ru/uk/pl — три формы числа; es/pt-BR/en — единственное при 1; vi/id/tr форм не меняют. Вычитано Переводчиком 22.10. */
export function learningV2ClosedWordsLineV1(lang: string, n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const one = mod10 === 1 && mod100 !== 11;
  const few = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
  switch (lang) {
    case 'ru': return `Ещё ${n} ${one ? 'слово откроется' : few ? 'слова откроются' : 'слов откроются'} в эпизодах урока`;
    case 'uk': return `Ще ${n} ${one ? 'слово відкриється' : few ? 'слова відкриються' : 'слів відкриються'} в епізодах уроку`;
    case 'pl': return `Jeszcze ${n} ${n === 1 ? 'słowo odblokuje się' : few ? 'słowa odblokują się' : 'słów odblokuje się'} w odcinkach lekcji`;
    case 'es': return `${n === 1 ? 'Se abrirá 1 palabra más' : `Se abrirán ${n} palabras más`} en los episodios de la lección`;
    case 'pt-BR': return `${n === 1 ? 'Mais 1 palavra será liberada' : `Mais ${n} palavras serão liberadas`} nos episódios da lição`;
    case 'vi': return `Còn ${n} từ sẽ mở trong các tập của bài`;
    case 'id': return `${n} kata lagi akan terbuka di episode pelajaran`;
    case 'tr': return `Dersin bölümlerinde ${n} kelime daha açılacak`;
    default: return `${n} more ${n === 1 ? 'word unlocks' : 'words unlock'} in this lesson's episodes`;
  }
}

export default function __RouteShim() { return null; }
