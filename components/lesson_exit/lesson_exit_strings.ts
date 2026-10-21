// ═══════════════════════════════════════════════════════════════════════════
// lesson_exit_strings.ts — тексты шторки «Выйти из урока?» (момент m15), 9 языков.
//
// зачем (владелец 14.10: «перенести точно по макетам»; координатор: «выдуманных фактов нет»): образец engagement-moments-v3-all.html, m15 — «Выйти из урока? Попытка не сохранится, повторный вход — −1 энергия».
// В коде это верно НЕ всегда: энергия списывается в момент показа первого вопроса (D72), повторный вход в тот же урок в течение окна ENERGY_FREE_REENTRY_WINDOW_MS (D159, 10 мин) бесплатен,
// у Plus энергия не тратится (D07). Поэтому фраза про энергию — отдельная строка с числами из app/energy_contract.ts и показывается только тем, у кого энергия действительно тратится.
// Переводы кроме RU — предложение, носителем не проверены.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  title: ['Выйти из урока?', 'Вийти з уроку?', 'Leave the lesson?', '¿Salir de la lección?', 'Sair da lição?', 'Thoát bài học?', 'Keluar dari pelajaran?', 'Dersten çıkılsın mı?', 'Wyjść z lekcji?'],
  body: ['Попытка не сохранится.', 'Спроба не збережеться.', 'This attempt won’t be saved.', 'El intento no se guardará.', 'A tentativa não será salva.', 'Lượt này sẽ không được lưu.', 'Percobaan ini tidak akan disimpan.', 'Bu deneme kaydedilmez.', 'Ta próba nie zostanie zapisana.'],
  energy: ['Вернёшься позже, чем через {min} мин — спишется {cost} энергия.', 'Повернешся пізніше, ніж за {min} хв — спишеться {cost} енергія.', 'Come back after more than {min} min and it costs {cost} energy.', 'Si vuelves pasados {min} min, costará {cost} de energía.', 'Se voltar depois de {min} min, custa {cost} de energia.', 'Quay lại sau hơn {min} phút sẽ tốn {cost} năng lượng.', 'Kembali setelah lebih dari {min} menit memakai {cost} energi.', '{min} dakikadan sonra dönersen {cost} enerji harcanır.', 'Powrót po ponad {min} min kosztuje {cost} energii.'],
  keep: ['Продолжить', 'Продовжити', 'Continue', 'Continuar', 'Continuar', 'Tiếp tục', 'Lanjutkan', 'Devam et', 'Kontynuuj'],
  leave: ['Выйти', 'Вийти', 'Leave', 'Salir', 'Sair', 'Thoát', 'Keluar', 'Çık', 'Wyjdź'],
  // Вариант «эпизод Learning V2» (№22): эпизод сохраняется на телефоне и продолжается с того же задания. Переводы кроме RU/UK — предложение, сверка у Переводчика.
  titleEpisode: ['Выйти из эпизода?', 'Вийти з епізоду?', 'Leave the episode?', '¿Salir del episodio?', 'Sair do episódio?', 'Thoát tập này?', 'Keluar dari episode?', 'Bölümden çıkılsın mı?', 'Wyjść z odcinka?'],
  bodyEpisode: ['Прогресс сохранится — продолжишь с этого места.', 'Прогрес збережеться — продовжиш із цього місця.', 'Your progress is saved — you’ll pick up right here.', 'Tu progreso se guarda: seguirás desde aquí.', 'Seu progresso fica salvo: você continua daqui.', 'Tiến độ được lưu — bạn sẽ tiếp tục từ đây.', 'Progresmu tersimpan — kamu lanjut dari sini.', 'İlerlemen kaydedilir — buradan devam edersin.', 'Postęp zostanie zapisany — wrócisz do tego miejsca.'],
  stay: ['Остаться', 'Залишитися', 'Stay', 'Quedarme', 'Ficar', 'Ở lại', 'Tetap di sini', 'Kal', 'Zostań'],
  // Карточка продолжения эпизода (№22б), строки Переводчика 21.10: {n} — номер задания, {m} — всего.
  resumeFrom: ['Продолжить с задания {n} из {m}', 'Продовжити із завдання {n} з {m}', 'Continue from task {n} of {m}', 'Seguir desde la tarea {n} de {m}', 'Continuar da tarefa {n} de {m}', 'Tiếp tục từ bài {n}/{m}', 'Lanjutkan tugas {n} dari {m}', 'Görevlere devam et: {n}/{m}', 'Kontynuuj od zadania {n} z {m}'],
  close: ['Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij'],
} as const satisfies Readonly<Record<string, Nine>>;

export type LessonExitStringKey = keyof typeof S;
export const LESSON_EXIT_STRING_KEYS = Object.keys(S) as readonly LessonExitStringKey[];
export const LESSON_EXIT_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Текст на языке интерфейса; `{ключ}` заменяется значением из vars. Неизвестный язык — английский. */
export function lessonExitText(lang: Lang, key: LessonExitStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const raw = (S[key] as Nine)[LANG_INDEX[lang] ?? LANG_INDEX.en];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}
