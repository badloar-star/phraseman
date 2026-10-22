// ════════════════════════════════════════════════════════════════════════════
// learning_v2_task_titles.ts — название задания V2 (значок + жирная строка) на 9 языках.
//
// зачем (вердикт «Сверки» 21.10): вместо мелкой серой инструкции — значок-плитка и ОДНО жирное название, как в одобренном макете
// learning-v2-tasks-review.html («Послушай и выбери», «Послушай и собери», «Собери фразу», «Вставь слово», «Найди пары», «Скажи вслух»).
// Русский — дословно из макета; остальные языки — предложение для «Переводчика» (там, где в приложении уже есть утверждённая фраза Шпиля
// для того же задания — взята она). Порядок кортежа: ru, uk, en, es, pt-BR, vi, id, tr, pl.
// ════════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];

export type LearningV2TaskTitleKind = 'listen_choose' | 'listen_build' | 'build_phrase' | 'fill_gap' | 'match_pairs' | 'speak';
export type LearningV2TaskTitleIcon = 'ear-outline' | 'headset-outline' | 'extension-puzzle-outline' | 'create-outline' | 'swap-horizontal-outline' | 'mic';

const TITLES: Readonly<Record<LearningV2TaskTitleKind, Nine>> = {
  listen_choose: ['Послушай и выбери', 'Послухай і обери', 'Listen and choose', 'Escucha y elige', 'Ouça e escolha', 'Nghe và chọn', 'Dengarkan dan pilih', 'Dinle ve seç', 'Posłuchaj i wybierz'],
  listen_build: ['Послушай и собери', 'Послухай і склади', 'Listen and build', 'Escucha y arma', 'Ouça e monte', 'Nghe và ghép', 'Dengarkan dan susun', 'Dinle ve oluştur', 'Posłuchaj i ułóż'],
  build_phrase: ['Собери фразу', 'Склади фразу', 'Build the phrase', 'Arma la frase', 'Monte a frase', 'Ghép câu', 'Susun frasa', 'Cümleyi oluştur', 'Ułóż frazę'],
  fill_gap: ['Вставь слово', 'Встав слово', 'Fill in the word', 'Completa la palabra', 'Complete a palavra', 'Điền từ', 'Isi kata', 'Kelimeyi yerleştir', 'Wstaw słowo'],
  match_pairs: ['Найди пары', 'Знайди пари', 'Match the pairs', 'Une las parejas', 'Ligue os pares', 'Nối các cặp', 'Cari pasangan', 'Eşleri bul', 'Połącz pary'],
  speak: ['Скажи вслух', 'Скажи вголос', 'Say it out loud', 'Dilo en voz alta', 'Diga em voz alta', 'Nói thành tiếng', 'Ucapkan dengan lantang', 'Sesli söyle', 'Powiedz na głos'],
};

/** Значки макета (`IC`: ear f2c0, headset f368, puzzle f2e4, create f293, swap f5b1, mic f454) — имена Ionicons; в макете они контурные (Сверка 22.10, №23). */
export const LEARNING_V2_TASK_TITLE_ICONS: Readonly<Record<LearningV2TaskTitleKind, LearningV2TaskTitleIcon>> = {
  listen_choose: 'ear-outline',
  listen_build: 'headset-outline',
  build_phrase: 'extension-puzzle-outline',
  fill_gap: 'create-outline',
  match_pairs: 'swap-horizontal-outline',
  speak: 'mic',
};

export const LEARNING_V2_TASK_TITLE_KINDS = Object.keys(TITLES) as readonly LearningV2TaskTitleKind[];

/** Таблица для сторожа полноты (9 языков в каждом ключе). */
export const LEARNING_V2_TASK_TITLES: Readonly<Record<LearningV2TaskTitleKind, Nine>> = TITLES;

export function learningV2TaskTitle(lang: Lang, kind: LearningV2TaskTitleKind): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = TITLES[kind];
  return triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
}
