// ════════════════════════════════════════════════════════════════════════════
// daily_tasks.ts — Ежедневные задания
// Хранение: English legacy 'daily_tasks_YYYY-MM-DD'; French scoped через dailyTasksProgressKey(day, 'fr').
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumStatus } from './premium_guard';
import { getStreakFreezeCostShards } from './remote_flags';
import { actionToastTri, emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import { withStorageLock } from './storage_mutex';
import { getShardsBalance, spendShards } from './shards_system';
import { bumpDailyTaskClaimed } from './lifetime_profile_stats';
import { DAILY_TASK_STRINGS_ES } from './daily_tasks_es_locale';
import { countDueItemsToday } from './active_recall';
import { getTrainerCounts, type TrainerQueue } from './trainer_store';
import {
  dailyTasksAdminOverrideKey,
  dailyTasksProgressKey,
  dailyTasksRerollKey,
  irregularVerbsGlobalKey,
  lessonLastCompletedAtKey,
  lessonPassCountKey,
  lessonWordsKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from './target_storage_keys';

const DAILY_PROGRESS_WRITE_ERR_TOAST_COOLDOWN_MS = 45_000;
const DATED_DAILY_TASKS_STORAGE_MAX_KEYS = 420;
const DATED_DAILY_TASKS_STORAGE_TTL_MS = 120 * 24 * 60 * 60 * 1000;
const DATED_DAILY_TASKS_STORAGE_PRUNE_INTERVAL_MS = 12 * 60 * 60 * 1000;
let _lastDailyProgressWriteErrorToastAt = 0;
let _lastDatedDailyTasksStoragePruneAt = 0;
let _datedDailyTasksStoragePruneInFlight = false;

function dailyTaskEventPayload(taskId: string, studyTarget?: RuntimeStudyTarget) {
  return studyTarget == null ? { taskId } : { taskId, studyTarget };
}

function emitDailyTaskCompleted(taskId: string, studyTarget?: RuntimeStudyTarget): void {
  emitAppEvent('daily_task_completed', dailyTaskEventPayload(taskId, studyTarget));
}

function emitDailyTaskRewardClaimed(taskId: string, studyTarget?: RuntimeStudyTarget): void {
  emitAppEvent('daily_task_reward_claimed', dailyTaskEventPayload(taskId, studyTarget));
}

export type LegacyTaskType =
  | 'correct_streak'      // N правильных подряд в уроке
  | 'lesson_no_mistakes'  // урок без ошибок (N подряд)
  | 'quiz_hard'           // N правильных ответов на сложном квизе
  | 'quiz_score'          // набрать N XP в квизах за день
  | 'words_learned'       // выучить N слов в разделе Слова
  | 'total_answers'       // собрать N фраз в уроках за день
  | 'open_theory'         // открыть теорию урока N раз
  | 'daily_active'        // открыть урок и собрать хотя бы одну фразу
  | 'verb_learned'        // выучить N неправильных глаголов
  | 'flashcard_view'      // просмотреть N карточек (сохранённые фразы)
  | 'flashcard_save'      // сохранить N фраз в карточки через Save в уроке
  | 'flashcard_flip'      // перевернуть N карточек (увидеть перевод)
  | 'recall_session'      // начать сессию повторения (правильный ответ хотя бы на одну карточку)
  | 'recall_answers'      // N фраз в Повторении (max 7/сессия)
  | 'recall_perfect'      // сессия Повторения без ошибок (минимум 5 карточек)
  | 'trainer_words'       // N правильных карточек слов в новом Тренере ошибок
  | 'trainer_phrases'     // N правильных карточек фраз в новом Тренере ошибок
  | 'trainer_arena'       // N правильных карточек арены в новом Тренере ошибок
  | 'daily_phrase_read'   // прочитать фразу дня на главном экране
  | 'daily_phrase_save'   // сохранить фразу дня в карточки
  | 'diagnostic_complete' // пройти диагностический тест целиком (20 вопросов)
  | 'quiz_easy'           // N правильных ответов на лёгком квизе
  | 'quiz_medium'         // N правильных ответов на среднем квизе
  | 'quiz_perfect'        // раунд квиза без ошибок
  | 'quiz_hard_perfect'   // раунд сложного квиза без ошибок
  | 'different_lessons'   // заниматься в N разных уроках за день
  | 'lesson_complete'     // завершить урок полностью до экрана финиша
  | 'morning_session'     // N фраз в уроке до 12:00
  | 'evening_session'     // N фраз в уроке после 18:00
  | 'energy_spend'        // потратить N единиц энергии (только для Free-аккаунта)
  | 'arena_play'              // сыграть N рейтинг-матчей за день (только PvP, не бот)
  | 'arena_win'               // выиграть N рейтинг-матчей за день (только PvP)
  | 'arena_plays_wins_combo' // N рейтинг-матчей + ≥M побед (arenaCombo, comboPlays/comboWins)
  | 'arena_rank_promoted'   // повысить ранг (уровень/лигу вверх) в рейтинговой Арене за день
  | 'invite_friend';        // отправить приглашение другу (экран «Пригласить друга», Share без отмены)

// ── Ежедневные челленджи второго поколения (meta/время/возвращение/социум) ──
export type MetaTaskType =
  | 'early_all_done'      // закрыть все остальные вызовы дня до 12:00 (локальное время)
  | 'last_chance'         // выполнить любое другое задание в 23:00–00:00 UTC
  | 'comeback_lesson'     // урок в день возвращения после 3+ дней перерыва
  | 'revision_lesson'     // повторить урок, пройденный 7+ дней назад
  | 'polyglot_day'        // активность и в EN, и во FR за один день
  | 'perfect_big_lesson'  // урок от 20 фраз без единой ошибки
  | 'blitz_speed'         // 10 верных ответов за 60 секунд в уроке
  | 'streak_freeze_use'   // использовать заморозку стрика
  | 'club_attend'         // заглянуть в спикинг-клуб (первый заход за день)
  | 'weekend_marathon'    // 2 урока в выходной (добавляется 4-м заданием в сб/вс)
  | 'mentor_friend';      // приглашённый друг прошёл первый урок (нужен серверный сигнал)

export type TaskType = LegacyTaskType | MetaTaskType;

const RETIRED_QUIZ_ARENA_TASK_TYPES: ReadonlySet<TaskType> = new Set([
  'quiz_hard', 'quiz_score', 'quiz_easy', 'quiz_medium', 'quiz_perfect', 'quiz_hard_perfect',
  'trainer_arena', 'arena_play', 'arena_win', 'arena_plays_wins_combo', 'arena_rank_promoted',
]);

export const isRetiredQuizArenaTaskType = (type: TaskType): boolean =>
  RETIRED_QUIZ_ARENA_TASK_TYPES.has(type);

/** Типы заданий, которые считаются «про Арену» (лимит 1 на день в DAILY_SETS_*). */
export function isArenaDailyTaskType(type: TaskType): boolean {
  return (
    type === 'arena_play'
    || type === 'arena_win'
    || type === 'arena_plays_wins_combo'
    || type === 'arena_rank_promoted'
  );
}

/** Пороги для type arena_plays_wins_combo (PvP, не бот). */
export type ArenaComboRequirement = { minPlays: number; minWins: number };

export interface DailyTask {
  id: string;
  type: TaskType;
  titleRU: string;
  titleUK: string;
  descRU: string;
  descUK: string;
  titleES?: string;
  descES?: string;
  titlePtBr?: string;
  titleVi?: string;
  titleId?: string;
  titleTr?: string;
  titlePl?: string;
  descPtBr?: string;
  descVi?: string;
  descId?: string;
  descTr?: string;
  descPl?: string;
  icon: string;
  target: number;
  xp: number;
  /** Минимальный игровой уровень (1–50) для этого задания. По умолчанию 1 (всем доступно). */
  minPlayerLevel?: number;
  /** Только для Free-аккаунта. Premium-пользователи не могут выполнить (напр. energy_spend при безлимитной энергии). */
  freeOnly?: boolean;
  /** Для arena_plays_wins_combo: сколько матчей сыграть и сколько выиграть за день. */
  arenaCombo?: ArenaComboRequirement;
}

export interface TaskProgress {
  taskId: string;
  current: number;
  completed: boolean;
  claimed: boolean;
  /** Только arena_plays_wins_combo: сыграно PvP-матчей за день по этому заданию */
  comboPlays?: number;
  /** Только arena_plays_wins_combo: число побед за день по этому заданию */
  comboWins?: number;
}

export const getArenaComboRequirement = (task: DailyTask): ArenaComboRequirement =>
  task.arenaCombo ?? { minPlays: 2, minWins: 1 };

// ── 90 заданий (30 дней × 3) ─────────────────────────────────────────────
const ALL_TASKS: DailyTask[] = [
  // da* — ежедневный слот вместо слишком лёгкого daily_active: завершить урок полностью
  { id:'da1', type:'lesson_complete', icon:'☀️', target:1, xp:60,
    titleRU:'До финиша', titleUK:'До фінішу',
    titlePtBr:'Até o fim', titleVi:'Đến đích', titleId:'Sampai akhir', titleTr:'Bitişe kadar', titlePl:'Do mety',
    descRU:'Пройди любой урок полностью — дойди до экрана завершения.',
    descPtBr:'Conclua qualquer lição inteira até chegar à tela de conclusão.',
    descVi:'Hoàn thành trọn vẹn bất kỳ bài học nào cho đến màn hình kết thúc.',
    descId:'Selesaikan pelajaran apa pun sepenuhnya sampai layar selesai.',
    descTr:'Herhangi bir dersi tamamen bitir ve tamamlama ekranına ulaş.',
    descPl:'Przejdź dowolną lekcję do końca, aż do ekranu ukończenia.',
    descUK:'Пройди будь-який урок повністю — дійди до екрана завершення.' },
  { id:'da2', type:'lesson_complete', icon:'🌅', target:1, xp:60,
    titleRU:'Закрой урок', titleUK:'Закрий урок',
    titlePtBr:'Feche a lição', titleVi:'Hoàn tất bài học', titleId:'Tuntaskan pelajaran', titleTr:'Dersi kapat', titlePl:'Zamknij lekcję',
    descRU:'Заверши любой урок сегодня до финального экрана.',
    descPtBr:'Conclua qualquer lição hoje até a tela final.',
    descVi:'Hoàn thành bất kỳ bài học nào hôm nay đến màn hình cuối.',
    descId:'Selesaikan pelajaran apa pun hari ini sampai layar akhir.',
    descTr:'Bugün herhangi bir dersi son ekrana kadar tamamla.',
    descPl:'Ukończ dziś dowolną lekcję aż do ekranu końcowego.',
    descUK:'Заверши будь-який урок сьогодні до фінального екрана.' },
  { id:'da3', type:'lesson_complete', icon:'💪', target:1, xp:60,
    titleRU:'Полный урок', titleUK:'Повний урок',
    titlePtBr:'Lição completa', titleVi:'Bài học trọn vẹn', titleId:'Pelajaran penuh', titleTr:'Tam ders', titlePl:'Pełna lekcja',
    descRU:'Заверши любой урок полностью — от первой фразы до финала.',
    descPtBr:'Conclua qualquer lição inteira, da primeira frase até o final.',
    descVi:'Hoàn thành trọn vẹn bất kỳ bài học nào, từ câu đầu đến cuối bài.',
    descId:'Selesaikan pelajaran apa pun dari frasa pertama sampai akhir.',
    descTr:'Herhangi bir dersi ilk ifadeden finale kadar tamamla.',
    descPl:'Ukończ dowolną lekcję w całości, od pierwszej frazy do finału.',
    descUK:'Заверши будь-який урок повністю — від першої фрази до фіналу.' },

  // total_answers — правильные ответы в уроках (каждый правильный тап по слову = +1)
  { id:'ta1', type:'total_answers', icon:'⚡', target:10, xp:24,
    titleRU:'Разогрев', titleUK:'Розігрів',
    titlePtBr:'Aquecimento', titleVi:'Khởi động', titleId:'Pemanasan', titleTr:'Isınma', titlePl:'Rozgrzewka',
    descRU:'Собери 10 фраз в уроке.',
    descPtBr:'Monte 10 frases em uma lição.',
    descVi:'Ghép 10 câu trong một bài học.',
    descId:'Susun 10 frasa dalam pelajaran.',
    descTr:'Bir derste 10 ifadeyi kur.',
    descPl:'Ułóż 10 fraz w lekcji.',
    descUK:'Збери 10 фраз в уроці.' },
  { id:'ta2', type:'total_answers', icon:'🔥', target:20, xp:36,
    titleRU:'Двадцатка', titleUK:'Двадцятка',
    titlePtBr:'Vinte', titleVi:'Hai mươi câu', titleId:'Dua puluh', titleTr:'Yirmilik', titlePl:'Dwudziestka',
    descRU:'Собери 20 фраз в уроках за день.',
    descPtBr:'Monte 20 frases nas lições durante o dia.',
    descVi:'Ghép 20 câu trong các bài học trong ngày.',
    descId:'Susun 20 frasa di pelajaran dalam sehari.',
    descTr:'Gün içinde derslerde 20 ifadeyi kur.',
    descPl:'Ułóż 20 fraz w lekcjach w ciągu dnia.',
    descUK:'Збери 20 фраз у уроках за день.' },
  { id:'ta3', type:'total_answers', icon:'💥', target:30, xp:48,
    titleRU:'Тридцатник', titleUK:'Тридцятник',
    titlePtBr:'Trinta', titleVi:'Ba mươi câu', titleId:'Tiga puluh', titleTr:'Otuzluk', titlePl:'Trzydziestka',
    descRU:'Собери 30 фраз в уроках за день.',
    descPtBr:'Monte 30 frases nas lições durante o dia.',
    descVi:'Ghép 30 câu trong các bài học trong ngày.',
    descId:'Susun 30 frasa di pelajaran dalam sehari.',
    descTr:'Gün içinde derslerde 30 ifadeyi kur.',
    descPl:'Ułóż 30 fraz w lekcjach w ciągu dnia.',
    descUK:'Збери 30 фраз у уроках за день.' },
  { id:'ta4', type:'total_answers', icon:'🚀', target:50, xp:66,
    titleRU:'Полтинник', titleUK:'П\'ятдесятка',
    titlePtBr:'Cinquenta', titleVi:'Năm mươi câu', titleId:'Lima puluh', titleTr:'Ellilik', titlePl:'Pięćdziesiątka',
    descRU:'Собери 50 фраз в уроках за день.',
    descPtBr:'Monte 50 frases nas lições durante o dia.',
    descVi:'Ghép 50 câu trong các bài học trong ngày.',
    descId:'Susun 50 frasa di pelajaran dalam sehari.',
    descTr:'Gün içinde derslerde 50 ifadeyi kur.',
    descPl:'Ułóż 50 fraz w lekcjach w ciągu dnia.',
    descUK:'Збери 50 фраз у уроках за день.' },
  { id:'ta5', type:'total_answers', icon:'🌪️', target:75, xp:90,
    titleRU:'На всех парах', titleUK:'На повних парах',
    titlePtBr:'A todo vapor', titleVi:'Tăng hết tốc lực', titleId:'Dengan kecepatan penuh', titleTr:'Tam gaz', titlePl:'Pełną parą',
    descRU:'Собери 75 фраз в уроках за день.',
    descPtBr:'Monte 75 frases nas lições durante o dia.',
    descVi:'Ghép 75 câu trong các bài học trong ngày.',
    descId:'Susun 75 frasa di pelajaran dalam sehari.',
    descTr:'Gün içinde derslerde 75 ifadeyi kur.',
    descPl:'Ułóż 75 fraz w lekcjach w ciągu dnia.',
    descUK:'Збери 75 фраз у уроках за день.' },
  { id:'ta6', type:'total_answers', icon:'💯', target:100, xp:120,
    titleRU:'Сотня', titleUK:'Сотня',
    titlePtBr:'Cem', titleVi:'Một trăm câu', titleId:'Seratus', titleTr:'Yüzlük', titlePl:'Setka',
    descRU:'Собери 100 фраз в уроках за день.',
    descPtBr:'Monte 100 frases nas lições durante o dia.',
    descVi:'Ghép 100 câu trong các bài học trong ngày.',
    descId:'Susun 100 frasa di pelajaran dalam sehari.',
    descTr:'Gün içinde derslerde 100 ifadeyi kur.',
    descPl:'Ułóż 100 fraz w lekcjach w ciągu dnia.',
    descUK:'Збери 100 фраз у уроках за день.' },

  // correct_streak — N правильных тапов подряд без единой ошибки (сбрасывается при ошибке)
  { id:'cs1', type:'correct_streak', icon:'🎯', target:5, xp:30,
    titleRU:'Первая серия', titleUK:'Перша серія',
    titlePtBr:'Primeira sequência', titleVi:'Chuỗi đầu tiên', titleId:'Rangkaian pertama', titleTr:'İlk seri', titlePl:'Pierwsza seria',
    descRU:'Собери 5 фраз подряд в уроке — ни одной ошибки.',
    descPtBr:'Monte 5 frases seguidas em uma lição sem errar.',
    descVi:'Ghép 5 câu liên tiếp trong một bài học, không mắc lỗi.',
    descId:'Susun 5 frasa beruntun dalam pelajaran tanpa kesalahan.',
    descTr:'Bir derste arka arkaya 5 ifadeyi hatasız kur.',
    descPl:'Ułóż 5 fraz z rzędu w lekcji, bez żadnego błędu.',
    descUK:'Збери 5 фраз поспіль в уроці — жодної помилки.' },
  { id:'cs2', type:'correct_streak', icon:'🎯', target:10, xp:48,
    titleRU:'Горячая десятка', titleUK:'Гаряча десятка',
    titlePtBr:'Dez em ritmo quente', titleVi:'Mười câu nóng máy', titleId:'Sepuluh panas', titleTr:'Sıcak onlu', titlePl:'Gorąca dziesiątka',
    descRU:'Собери 10 фраз подряд в уроке без единой ошибки.',
    descPtBr:'Monte 10 frases seguidas em uma lição sem nenhum erro.',
    descVi:'Ghép 10 câu liên tiếp trong một bài học mà không mắc lỗi nào.',
    descId:'Susun 10 frasa beruntun dalam pelajaran tanpa satu pun kesalahan.',
    descTr:'Bir derste arka arkaya 10 ifadeyi tek hata yapmadan kur.',
    descPl:'Ułóż 10 fraz z rzędu w lekcji bez ani jednego błędu.',
    descUK:'Збери 10 фраз поспіль в уроці без жодної помилки.' },
  { id:'cs3', type:'correct_streak', icon:'⚡', target:15, xp:66,
    titleRU:'15 без промаха', titleUK:'15 без промаху',
    titlePtBr:'15 sem errar', titleVi:'15 câu không sai', titleId:'15 tanpa meleset', titleTr:'15 hatasız', titlePl:'15 bez pudła',
    descRU:'Собери 15 фраз подряд без ошибок — не сбей серию.',
    descPtBr:'Monte 15 frases seguidas sem erros; não quebre a sequência.',
    descVi:'Ghép 15 câu liên tiếp không lỗi; đừng làm đứt chuỗi.',
    descId:'Susun 15 frasa beruntun tanpa kesalahan; jangan putuskan rangkaian.',
    descTr:'Arka arkaya 15 ifadeyi hatasız kur; seriyi bozma.',
    descPl:'Ułóż 15 fraz z rzędu bez błędów; nie przerwij serii.',
    descUK:'Збери 15 фраз поспіль без помилок — не збий серію.' },
  { id:'cs4', type:'correct_streak', icon:'🔥', target:20, xp:84,
    titleRU:'В зоне потока', titleUK:'В зоні потоку',
    titlePtBr:'No estado de fluxo', titleVi:'Trong trạng thái nhập tâm', titleId:'Dalam zona fokus', titleTr:'Akış bölgesinde', titlePl:'W stanie skupienia',
    descRU:'Собери 20 фраз подряд — войди в состояние потока.',
    descPtBr:'Monte 20 frases seguidas e entre no estado de fluxo.',
    descVi:'Ghép 20 câu liên tiếp và vào trạng thái nhập tâm.',
    descId:'Susun 20 frasa beruntun dan masuk ke zona fokus.',
    descTr:'Arka arkaya 20 ifadeyi kur ve akışa gir.',
    descPl:'Ułóż 20 fraz z rzędu i wejdź w stan skupienia.',
    descUK:'Збери 20 фраз поспіль — увійди в стан потоку.' },

  // lesson_no_mistakes — N правильных тапов без единой ошибки (тот же счётчик, сбрасывается при ошибке)
  { id:'lnm1', type:'lesson_no_mistakes', icon:'✨', target:10, xp:72,
    titleRU:'Чистая серия', titleUK:'Чиста серія',
    titlePtBr:'Sequência limpa', titleVi:'Chuỗi sạch', titleId:'Rangkaian bersih', titleTr:'Temiz seri', titlePl:'Czysta seria',
    descRU:'Собери 10 фраз подряд в уроке — ноль ошибок.',
    descPtBr:'Monte 10 frases seguidas em uma lição com zero erros.',
    descVi:'Ghép 10 câu liên tiếp trong một bài học với không lỗi nào.',
    descId:'Susun 10 frasa beruntun dalam pelajaran dengan nol kesalahan.',
    descTr:'Bir derste arka arkaya 10 ifadeyi sıfır hatayla kur.',
    descPl:'Ułóż 10 fraz z rzędu w lekcji z zerem błędów.',
    descUK:'Збери 10 фраз поспіль в уроці — нуль помилок.' },
  { id:'lnm2', type:'lesson_no_mistakes', icon:'🎖️', target:15, xp:96,
    titleRU:'Снайпер', titleUK:'Снайпер',
    titlePtBr:'Atirador de precisão', titleVi:'Xạ thủ', titleId:'Penembak jitu', titleTr:'Nişancı', titlePl:'Snajper',
    descRU:'Собери 15 фраз подряд в уроке — абсолютная точность.',
    descPtBr:'Monte 15 frases seguidas em uma lição com precisão total.',
    descVi:'Ghép 15 câu liên tiếp trong một bài học với độ chính xác tuyệt đối.',
    descId:'Susun 15 frasa beruntun dalam pelajaran dengan akurasi penuh.',
    descTr:'Bir derste arka arkaya 15 ifadeyi tam isabetle kur.',
    descPl:'Ułóż 15 fraz z rzędu w lekcji z pełną dokładnością.',
    descUK:'Збери 15 фраз поспіль в уроці — абсолютна точність.' },
  { id:'lnm3', type:'lesson_no_mistakes', icon:'💎', target:20, xp:120,
    titleRU:'Безупречность', titleUK:'Бездоганність',
    titlePtBr:'Impecável', titleVi:'Hoàn hảo', titleId:'Tanpa cela', titleTr:'Kusursuzluk', titlePl:'Bezbłędność',
    descRU:'Собери 20 фраз подряд без единой ошибки.',
    descPtBr:'Monte 20 frases seguidas sem nenhum erro.',
    descVi:'Ghép 20 câu liên tiếp mà không mắc lỗi nào.',
    descId:'Susun 20 frasa beruntun tanpa satu pun kesalahan.',
    descTr:'Arka arkaya 20 ifadeyi tek hata yapmadan kur.',
    descPl:'Ułóż 20 fraz z rzędu bez ani jednego błędu.',
    descUK:'Збери 20 фраз поспіль без жодної помилки.' },

  // quiz_hard — правильные ответы в квизе уровня «Сложно»
  { id:'qh1', type:'quiz_hard', icon:'💪', target:3, xp:36, minPlayerLevel:15,
    titleRU:'Первый вызов', titleUK:'Перший виклик',
    titlePtBr:'Primeiro desafio', titleVi:'Thử thách đầu tiên', titleId:'Tantangan pertama', titleTr:'İlk meydan okuma', titlePl:'Pierwsze wyzwanie',
    descRU:'Открой Вызовы → Сложно и ответь правильно на 3 вопроса.',
    descPtBr:'Abra Quizzes → Difícil e responda corretamente a 3 perguntas.',
    descVi:'Mở Quiz → Khó và trả lời đúng 3 câu hỏi.',
    descId:'Buka Kuis → Sulit dan jawab 3 pertanyaan dengan benar.',
    descTr:'Quizler → Zor bölümünü aç ve 3 soruyu doğru yanıtla.',
    descPl:'Otwórz Quizy → Trudne i odpowiedz poprawnie na 3 pytania.',
    descUK:'Відкрий Квізи → Складно й дай правильну відповідь на 3 запитання.' },
  { id:'qh2', type:'quiz_hard', icon:'🗡️', target:5, xp:54, minPlayerLevel:15,
    titleRU:'Принял вызов', titleUK:'Прийняв виклик',
    titlePtBr:'Desafio aceito', titleVi:'Đã nhận thử thách', titleId:'Tantangan diterima', titleTr:'Meydan okumayı kabul ettin', titlePl:'Wyzwanie przyjęte',
    descRU:'Открой Вызовы → Сложно и ответь правильно на 5 вопросов.',
    descPtBr:'Abra Quizzes → Difícil e responda corretamente a 5 perguntas.',
    descVi:'Mở Quiz → Khó và trả lời đúng 5 câu hỏi.',
    descId:'Buka Kuis → Sulit dan jawab 5 pertanyaan dengan benar.',
    descTr:'Quizler → Zor bölümünü aç ve 5 soruyu doğru yanıtla.',
    descPl:'Otwórz Quizy → Trudne i odpowiedz poprawnie na 5 pytań.',
    descUK:'Відкрий Квізи → Складно й дай правильну відповідь на 5 запитань.' },
  { id:'qh3', type:'quiz_hard', icon:'🏆', target:10, xp:78, minPlayerLevel:15,
    titleRU:'Хардкорщик', titleUK:'Хардкорщик',
    titlePtBr:'Fã do modo difícil', titleVi:'Người chơi khó', titleId:'Pemain hardcore', titleTr:'Zor mod oyuncusu', titlePl:'Hardkorowiec',
    descRU:'Открой Вызовы → Сложно и ответь правильно на 10 вопросов.',
    descPtBr:'Abra Quizzes → Difícil e responda corretamente a 10 perguntas.',
    descVi:'Mở Quiz → Khó và trả lời đúng 10 câu hỏi.',
    descId:'Buka Kuis → Sulit dan jawab 10 pertanyaan dengan benar.',
    descTr:'Quizler → Zor bölümünü aç ve 10 soruyu doğru yanıtla.',
    descPl:'Otwórz Quizy → Trudne i odpowiedz poprawnie na 10 pytań.',
    descUK:'Відкрий Квізи → Складно й дай правильну відповідь на 10 запитань.' },
  { id:'qh4', type:'quiz_hard', icon:'👑', target:15, xp:102, minPlayerLevel:15,
    titleRU:'Легенда', titleUK:'Легенда',
    titlePtBr:'Lenda', titleVi:'Huyền thoại', titleId:'Legenda', titleTr:'Efsane', titlePl:'Legenda',
    descRU:'Открой Вызовы → Сложно и ответь правильно на 15 вопросов.',
    descPtBr:'Abra Quizzes → Difícil e responda corretamente a 15 perguntas.',
    descVi:'Mở Quiz → Khó và trả lời đúng 15 câu hỏi.',
    descId:'Buka Kuis → Sulit dan jawab 15 pertanyaan dengan benar.',
    descTr:'Quizler → Zor bölümünü aç ve 15 soruyu doğru yanıtla.',
    descPl:'Otwórz Quizy → Trudne i odpowiedz poprawnie na 15 pytań.',
    descUK:'Відкрий Квізи → Складно й дай правильну відповідь на 15 запитань.' },

  // quiz_score — XP заработанный в квизах за день
  { id:'qs1', type:'quiz_score', icon:'⭐', target:10, xp:30,
    titleRU:'Первый опыт', titleUK:'Перший досвід',
    titlePtBr:'Primeira experiência', titleVi:'Trải nghiệm đầu tiên', titleId:'Pengalaman pertama', titleTr:'İlk deneyim', titlePl:'Pierwsze doświadczenie',
    descRU:'Заработай 10 XP в Вызовах за день.',
    descPtBr:'Ganhe 10 XP em Quizzes durante o dia.',
    descVi:'Kiếm 10 XP trong Quiz trong ngày.',
    descId:'Dapatkan 10 XP di Kuis dalam sehari.',
    descTr:'Gün içinde Quizlerde 10 XP kazan.',
    descPl:'Zdobądź 10 XP w Quizach w ciągu dnia.',
    descUK:'Зароби 10 XP у Квізах за день.' },
  { id:'qs2', type:'quiz_score', icon:'🌟', target:20, xp:48,
    titleRU:'Набираю обороты', titleUK:'Набираю оберти',
    titlePtBr:'Ganhando ritmo', titleVi:'Tăng nhịp', titleId:'Mulai cepat', titleTr:'Hız kazanıyorum', titlePl:'Nabieram tempa',
    descRU:'Заработай 20 XP в Вызовах за день.',
    descPtBr:'Ganhe 20 XP em Quizzes durante o dia.',
    descVi:'Kiếm 20 XP trong Quiz trong ngày.',
    descId:'Dapatkan 20 XP di Kuis dalam sehari.',
    descTr:'Gün içinde Quizlerde 20 XP kazan.',
    descPl:'Zdobądź 20 XP w Quizach w ciągu dnia.',
    descUK:'Зароби 20 XP у Квізах за день.' },
  { id:'qs3', type:'quiz_score', icon:'💫', target:30, xp:66,
    titleRU:'Вызов-машина', titleUK:'Квіз-машина',
    titlePtBr:'Máquina dos quizzes', titleVi:'Cỗ máy quiz', titleId:'Mesin kuis', titleTr:'Quiz makinesi', titlePl:'Maszyna quizowa',
    descRU:'Заработай 30 XP в Вызовах за день.',
    descPtBr:'Ganhe 30 XP em Quizzes durante o dia.',
    descVi:'Kiếm 30 XP trong Quiz trong ngày.',
    descId:'Dapatkan 30 XP di Kuis dalam sehari.',
    descTr:'Gün içinde Quizlerde 30 XP kazan.',
    descPl:'Zdobądź 30 XP w Quizach w ciągu dnia.',
    descUK:'Зароби 30 XP у Квізах за день.' },
  { id:'qs4', type:'quiz_score', icon:'💥', target:50, xp:90, minPlayerLevel:15,
    titleRU:'Неудержимый', titleUK:'Нестримний',
    titlePtBr:'Imparável', titleVi:'Không thể cản', titleId:'Tak terbendung', titleTr:'Durdurulamaz', titlePl:'Nie do zatrzymania',
    descRU:'Заработай 50 XP в Квизах за день — играй на Сложно, держи серию.',
    descPtBr:'Ganhe 50 XP em Quizzes durante o dia: jogue no Difícil e mantenha a sequência.',
    descVi:'Kiếm 50 XP trong Quiz trong ngày: chơi mức Khó và giữ chuỗi.',
    descId:'Dapatkan 50 XP di Kuis dalam sehari: mainkan mode Sulit dan pertahankan rangkaian.',
    descTr:'Gün içinde Quizlerde 50 XP kazan: Zor modda oyna ve seriyi koru.',
    descPl:'Zdobądź 50 XP w Quizach w ciągu dnia: graj na poziomie Trudne i utrzymaj serię.',
    descUK:'Зароби 50 XP у Квізах за день — грай на Складно і тримай серію.' },

  // words_learned — правильные ответы в разделе Слова (каждое выученное слово = +1)
  { id:'wl1', type:'words_learned', icon:'📖', target:3, xp:30,
    titleRU:'Три слова в копилку', titleUK:'Три слова в скарбничку',
    titlePtBr:'Três palavras na coleção', titleVi:'Ba từ bỏ túi', titleId:'Tiga kata untuk koleksi', titleTr:'Kumbaraya üç kelime', titlePl:'Trzy słowa do skarbca',
    descRU:'Выучи 3 слова в разделе Слова любого урока — пройди их тренировку.',
    descPtBr:'Aprenda 3 palavras na seção Palavras de qualquer lição: complete o treino delas.',
    descVi:'Học 3 từ trong phần Từ của bất kỳ bài học nào: hoàn thành phần luyện tập của chúng.',
    descId:'Pelajari 3 kata di bagian Kata dari pelajaran apa pun: selesaikan latihannya.',
    descTr:'Herhangi bir dersin Kelimeler bölümünde 3 kelime öğren: alıştırmalarını tamamla.',
    descPl:'Naucz się 3 słów w sekcji Słowa dowolnej lekcji: ukończ ich trening.',
    descUK:'Вивчи 3 слова в розділі Слова будь-якого уроку — пройди їх тренування.' },
  { id:'wl2', type:'words_learned', icon:'📚', target:5, xp:48,
    titleRU:'Пополняю словарь', titleUK:'Поповнюю словник',
    titlePtBr:'Aumentando o vocabulário', titleVi:'Mở rộng vốn từ', titleId:'Menambah kosakata', titleTr:'Sözlüğü büyütüyorum', titlePl:'Uzupełniam słownik',
    descRU:'Выучи 5 слов в разделе Слова — пройди тренировку слов в уроке.',
    descPtBr:'Aprenda 5 palavras na seção Palavras: complete o treino de palavras na lição.',
    descVi:'Học 5 từ trong phần Từ: hoàn thành bài luyện từ trong bài học.',
    descId:'Pelajari 5 kata di bagian Kata: selesaikan latihan kata dalam pelajaran.',
    descTr:'Kelimeler bölümünde 5 kelime öğren: dersteki kelime alıştırmasını tamamla.',
    descPl:'Naucz się 5 słów w sekcji Słowa: ukończ trening słów w lekcji.',
    descUK:'Вивчи 5 слів в розділі Слова — пройди тренування слів у уроці.' },
  { id:'wl3', type:'words_learned', icon:'🧠', target:10, xp:72,
    titleRU:'Словарный марафон', titleUK:'Словниковий марафон',
    titlePtBr:'Maratona de vocabulário', titleVi:'Cuộc đua từ vựng', titleId:'Maraton kosakata', titleTr:'Kelime maratonu', titlePl:'Maraton słownictwa',
    descRU:'Выучи 10 слов в разделе Слова — можно в разных уроках.',
    descPtBr:'Aprenda 10 palavras na seção Palavras; pode ser em lições diferentes.',
    descVi:'Học 10 từ trong phần Từ; có thể ở nhiều bài học khác nhau.',
    descId:'Pelajari 10 kata di bagian Kata; boleh dari pelajaran yang berbeda.',
    descTr:'Kelimeler bölümünde 10 kelime öğren; farklı derslerde olabilir.',
    descPl:'Naucz się 10 słów w sekcji Słowa; mogą być z różnych lekcji.',
    descUK:'Вивчи 10 слів в розділі Слова — можна в різних уроках.' },

  // verb_learned — выучить N неправильных глаголов в разделе Глаголы
  { id:'vl1', type:'verb_learned', icon:'⚙️', target:2, xp:30,
    titleRU:'Первые глаголы', titleUK:'Перші дієслова',
    titlePtBr:'Primeiros verbos', titleVi:'Những động từ đầu tiên', titleId:'Kata kerja pertama', titleTr:'İlk fiiller', titlePl:'Pierwsze czasowniki',
    descRU:'Выучи 2 неправильных глагола в разделе Глаголы любого урока.',
    descPtBr:'Aprenda 2 verbos irregulares na seção Verbos de qualquer lição.',
    descVi:'Học 2 động từ bất quy tắc trong phần Động từ của bất kỳ bài học nào.',
    descId:'Pelajari 2 kata kerja tidak beraturan di bagian Kata Kerja dari pelajaran apa pun.',
    descTr:'Herhangi bir dersin Fiiller bölümünde 2 düzensiz fiil öğren.',
    descPl:'Naucz się 2 czasowników nieregularnych w sekcji Czasowniki dowolnej lekcji.',
    descUK:'Вивчи 2 неправильних дієслова в розділі Дієслова будь-якого уроку.' },
  { id:'vl2', type:'verb_learned', icon:'🔧', target:4, xp:54,
    titleRU:'Глагольный рывок', titleUK:'Дієслівний ривок',
    titlePtBr:'Arranque dos verbos', titleVi:'Bứt tốc động từ', titleId:'Dorongan kata kerja', titleTr:'Fiil atağı', titlePl:'Czasownikowy zryw',
    descRU:'Выучи 4 неправильных глагола в разделе Глаголы.',
    descPtBr:'Aprenda 4 verbos irregulares na seção Verbos.',
    descVi:'Học 4 động từ bất quy tắc trong phần Động từ.',
    descId:'Pelajari 4 kata kerja tidak beraturan di bagian Kata Kerja.',
    descTr:'Fiiller bölümünde 4 düzensiz fiil öğren.',
    descPl:'Naucz się 4 czasowników nieregularnych w sekcji Czasowniki.',
    descUK:'Вивчи 4 неправильних дієслова в розділі Дієслова.' },
  { id:'vl3', type:'verb_learned', icon:'🔩', target:6, xp:78,
    titleRU:'Мастер форм', titleUK:'Майстер форм',
    titlePtBr:'Mestre das formas', titleVi:'Bậc thầy dạng từ', titleId:'Ahli bentuk', titleTr:'Form ustası', titlePl:'Mistrz form',
    descRU:'Выучи 6 неправильных глаголов в разделе Глаголы.',
    descPtBr:'Aprenda 6 verbos irregulares na seção Verbos.',
    descVi:'Học 6 động từ bất quy tắc trong phần Động từ.',
    descId:'Pelajari 6 kata kerja tidak beraturan di bagian Kata Kerja.',
    descTr:'Fiiller bölümünde 6 düzensiz fiil öğren.',
    descPl:'Naucz się 6 czasowników nieregularnych w sekcji Czasowniki.',
    descUK:'Вивчи 6 неправильних дієслів в розділі Дієслова.' },

  // open_theory — открыть раздел Теория в уроке
  { id:'ot1', type:'open_theory', icon:'💡', target:1, xp:12,
    titleRU:'Загляни в Теорию', titleUK:'Зазирни в Теорію',
    titlePtBr:'Veja a Teoria', titleVi:'Xem phần Lý thuyết', titleId:'Lihat Teori', titleTr:'Teoriye bak', titlePl:'Zajrzyj do Teorii',
    descRU:'Открой вкладку Теория в любом уроке и прочитай правило.',
    descPtBr:'Abra a aba Teoria em qualquer lição e leia a regra.',
    descVi:'Mở tab Lý thuyết trong bất kỳ bài học nào và đọc quy tắc.',
    descId:'Buka tab Teori di pelajaran apa pun dan baca aturannya.',
    descTr:'Herhangi bir derste Teori sekmesini aç ve kuralı oku.',
    descPl:'Otwórz kartę Teoria w dowolnej lekcji i przeczytaj zasadę.',
    descUK:'Відкрий вкладку Теорія в будь-якому уроці і прочитай правило.' },
  { id:'ot2', type:'open_theory', icon:'📖', target:2, xp:18,
    titleRU:'Теоретик', titleUK:'Теоретик',
    titlePtBr:'Teórico', titleVi:'Người học lý thuyết', titleId:'Ahli teori', titleTr:'Teorisyen', titlePl:'Teoretyk',
    descRU:'Открой вкладку Теория в 2 разных уроках сегодня.',
    descPtBr:'Abra a aba Teoria em 2 lições diferentes hoje.',
    descVi:'Mở tab Lý thuyết trong 2 bài học khác nhau hôm nay.',
    descId:'Buka tab Teori di 2 pelajaran berbeda hari ini.',
    descTr:'Bugün 2 farklı derste Teori sekmesini aç.',
    descPl:'Otwórz dziś kartę Teoria w 2 różnych lekcjach.',
    descUK:'Відкрий вкладку Теорія в 2 різних уроках сьогодні.' },

  // flashcard_view — просмотреть N карточек (листать в разделе Карточки)
  { id:'fv1', type:'flashcard_view', icon:'🃏', target:5, xp:24,
    titleRU:'Загляни в карточки', titleUK:'Зазирни в картки',
    titlePtBr:'Veja os cartões', titleVi:'Xem thẻ ghi nhớ', titleId:'Lihat kartu', titleTr:'Kartlara göz at', titlePl:'Zajrzyj do fiszek',
    descRU:'Открой раздел Карточки и пролистай 5 карточек.',
    descPtBr:'Abra a seção Cartões e passe por 5 cartões.',
    descVi:'Mở phần Thẻ ghi nhớ và lướt qua 5 thẻ.',
    descId:'Buka bagian Kartu dan lihat 5 kartu.',
    descTr:'Kartlar bölümünü aç ve 5 karta göz at.',
    descPl:'Otwórz sekcję Fiszki i przejrzyj 5 fiszek.',
    descUK:'Відкрий розділ Картки і перегортай 5 карток.' },
  { id:'fv2', type:'flashcard_view', icon:'🃏', target:10, xp:42,
    titleRU:'Карточный час', titleUK:'Картковий час',
    titlePtBr:'Hora dos cartões', titleVi:'Giờ thẻ ghi nhớ', titleId:'Waktunya kartu', titleTr:'Kart zamanı', titlePl:'Czas na fiszki',
    descRU:'Открой раздел Карточки и пролистай 10 карточек.',
    descPtBr:'Abra a seção Cartões e passe por 10 cartões.',
    descVi:'Mở phần Thẻ ghi nhớ và lướt qua 10 thẻ.',
    descId:'Buka bagian Kartu dan lihat 10 kartu.',
    descTr:'Kartlar bölümünü aç ve 10 karta göz at.',
    descPl:'Otwórz sekcję Fiszki i przejrzyj 10 fiszek.',
    descUK:'Відкрий розділ Картки і перегортай 10 карток.' },
  { id:'fv3', type:'flashcard_view', icon:'🃏', target:20, xp:66,
    titleRU:'Карточный марафон', titleUK:'Картковий марафон',
    titlePtBr:'Maratona de cartões', titleVi:'Cuộc đua thẻ ghi nhớ', titleId:'Maraton kartu', titleTr:'Kart maratonu', titlePl:'Maraton fiszek',
    descRU:'Открой раздел Карточки и пролистай 20 карточек.',
    descPtBr:'Abra a seção Cartões e passe por 20 cartões.',
    descVi:'Mở phần Thẻ ghi nhớ và lướt qua 20 thẻ.',
    descId:'Buka bagian Kartu dan lihat 20 kartu.',
    descTr:'Kartlar bölümünü aç ve 20 karta göz at.',
    descPl:'Otwórz sekcję Fiszki i przejrzyj 20 fiszek.',
    descUK:'Відкрий розділ Картки і перегортай 20 карток.' },

  // flashcard_save — сохранить фразу в карточки через кнопку в уроке
  { id:'fs1', type:'flashcard_save', icon:'💾', target:1, xp:18,
    titleRU:'Первая карточка', titleUK:'Перша картка',
    titlePtBr:'Primeiro cartão', titleVi:'Thẻ đầu tiên', titleId:'Kartu pertama', titleTr:'İlk kart', titlePl:'Pierwsza fiszka',
    descRU:'В уроке нажми Save на любой фразе — она попадёт в Карточки.',
    descPtBr:'Na lição, toque em Save em qualquer frase; ela irá para Cartões.',
    descVi:'Trong bài học, nhấn Save ở bất kỳ câu nào; câu đó sẽ vào Thẻ ghi nhớ.',
    descId:'Di pelajaran, ketuk Save pada frasa apa pun; frasa itu akan masuk ke Kartu.',
    descTr:'Derste herhangi bir ifadede Save düğmesine dokun; Kartlara eklenir.',
    descPl:'W lekcji stuknij Save przy dowolnej frazie; trafi do Fiszek.',
    descUK:'В уроці натисни Save на будь-якій фразі — вона потрапить у Картки.' },
  { id:'fs2', type:'flashcard_save', icon:'💾', target:3, xp:36,
    titleRU:'Коллекционер', titleUK:'Колекціонер',
    titlePtBr:'Colecionador', titleVi:'Nhà sưu tầm', titleId:'Kolektor', titleTr:'Koleksiyoncu', titlePl:'Kolekcjoner',
    descRU:'Сохрани 3 фразы в Карточки через кнопку Save в уроках.',
    descPtBr:'Salve 3 frases em Cartões usando o botão Save nas lições.',
    descVi:'Lưu 3 câu vào Thẻ ghi nhớ bằng nút Save trong các bài học.',
    descId:'Simpan 3 frasa ke Kartu dengan tombol Save di pelajaran.',
    descTr:'Derslerde Save düğmesini kullanarak 3 ifadeyi Kartlara kaydet.',
    descPl:'Zapisz 3 frazy do Fiszek przyciskiem Save w lekcjach.',
    descUK:'Збережи 3 фрази у Картки через кнопку Save на уроках.' },
  { id:'fs3', type:'flashcard_save', icon:'💾', target:5, xp:60,
    titleRU:'Пополняю коллекцию', titleUK:'Поповнюю колекцію',
    titlePtBr:'Aumentando a coleção', titleVi:'Bổ sung bộ sưu tập', titleId:'Menambah koleksi', titleTr:'Koleksiyonu büyütüyorum', titlePl:'Uzupełniam kolekcję',
    descRU:'Сохрани 5 фраз в Карточки через кнопку Save в уроках.',
    descPtBr:'Salve 5 frases em Cartões usando o botão Save nas lições.',
    descVi:'Lưu 5 câu vào Thẻ ghi nhớ bằng nút Save trong các bài học.',
    descId:'Simpan 5 frasa ke Kartu dengan tombol Save di pelajaran.',
    descTr:'Derslerde Save düğmesini kullanarak 5 ifadeyi Kartlara kaydet.',
    descPl:'Zapisz 5 fraz do Fiszek przyciskiem Save w lekcjach.',
    descUK:'Збережи 5 фраз у Картки через кнопку Save на уроках.' },

  // flashcard_flip — перевернуть карточку чтобы увидеть перевод
  { id:'ff1', type:'flashcard_flip', icon:'🔄', target:5, xp:24,
    titleRU:'Переворот', titleUK:'Переворот',
    titlePtBr:'Virada', titleVi:'Lật thẻ', titleId:'Balik kartu', titleTr:'Kart çevirme', titlePl:'Odwrócenie',
    descRU:'В разделе Карточки нажми на 5 карточек чтобы увидеть перевод.',
    descPtBr:'Na seção Cartões, toque em 5 cartões para ver a tradução.',
    descVi:'Trong phần Thẻ ghi nhớ, nhấn vào 5 thẻ để xem bản dịch.',
    descId:'Di bagian Kartu, ketuk 5 kartu untuk melihat terjemahannya.',
    descTr:'Kartlar bölümünde çeviriyi görmek için 5 karta dokun.',
    descPl:'W sekcji Fiszki stuknij 5 fiszek, aby zobaczyć tłumaczenie.',
    descUK:'В розділі Картки натисни на 5 карток щоб побачити переклад.' },
  { id:'ff2', type:'flashcard_flip', icon:'🔄', target:10, xp:42,
    titleRU:'Двойной переворот', titleUK:'Подвійний переворот',
    titlePtBr:'Virada dupla', titleVi:'Lật thẻ gấp đôi', titleId:'Balik ganda', titleTr:'Çifte çevirme', titlePl:'Podwójne odwrócenie',
    descRU:'В разделе Карточки нажми на 10 карточек чтобы увидеть переводы.',
    descPtBr:'Na seção Cartões, toque em 10 cartões para ver as traduções.',
    descVi:'Trong phần Thẻ ghi nhớ, nhấn vào 10 thẻ để xem các bản dịch.',
    descId:'Di bagian Kartu, ketuk 10 kartu untuk melihat terjemahannya.',
    descTr:'Kartlar bölümünde çevirileri görmek için 10 karta dokun.',
    descPl:'W sekcji Fiszki stuknij 10 fiszek, aby zobaczyć tłumaczenia.',
    descUK:'В розділі Картки натисни на 10 карток щоб побачити переклади.' },
  { id:'ff3', type:'flashcard_flip', icon:'🔄', target:15, xp:60,
    titleRU:'Мастер переворота', titleUK:'Майстер перевороту',
    titlePtBr:'Mestre da virada', titleVi:'Bậc thầy lật thẻ', titleId:'Ahli membalik kartu', titleTr:'Çevirme ustası', titlePl:'Mistrz odwracania',
    descRU:'В разделе Карточки нажми на 15 карточек — проверь все переводы.',
    descPtBr:'Na seção Cartões, toque em 15 cartões e confira todas as traduções.',
    descVi:'Trong phần Thẻ ghi nhớ, nhấn vào 15 thẻ và kiểm tra tất cả bản dịch.',
    descId:'Di bagian Kartu, ketuk 15 kartu dan periksa semua terjemahan.',
    descTr:'Kartlar bölümünde 15 karta dokun ve tüm çevirileri kontrol et.',
    descPl:'W sekcji Fiszki stuknij 15 fiszek i sprawdź wszystkie tłumaczenia.',
    descUK:'В розділі Картки натисни на 15 карток — перевір усі переклади.' },

  // recall_session — начать сессию повторения (засчитывается 1 раз за день при первом ответе)
  { id:'rs1', type:'recall_session', icon:'🧠', target:1, xp:24,
    titleRU:'Время повторить', titleUK:'Час повторити',
    titlePtBr:'Hora de revisar', titleVi:'Đến lúc ôn lại', titleId:'Waktunya mengulang', titleTr:'Tekrar zamanı', titlePl:'Czas na powtórkę',
    descRU:'Открой раздел Повторение и правильно ответь хотя бы на одну карточку — засчитается сессия.',
    descPtBr:'Abra a seção Revisão e responda corretamente a pelo menos um cartão; isso conta como uma sessão.',
    descVi:'Mở phần Ôn tập và trả lời đúng ít nhất một thẻ; như vậy sẽ tính là một phiên.',
    descId:'Buka bagian Pengulangan dan jawab setidaknya satu kartu dengan benar; itu dihitung sebagai sesi.',
    descTr:'Tekrar bölümünü aç ve en az bir karta doğru cevap ver; bu bir oturum sayılır.',
    descPl:'Otwórz sekcję Powtórka i odpowiedz poprawnie na co najmniej jedną fiszkę; to zaliczy sesję.',
    descUK:'Відкрий розділ Повторення й відповідай правильно хоча б на одну картку — сесію зарахують.' },

  // recall_answers — правильные ответы в Повторении (SESSION_LIMIT=7, т.е. max 7 за сессию)
  { id:'ra1', type:'recall_answers', icon:'🧠', target:5, xp:36,
    titleRU:'Пятёрка на повторе', titleUK:'П\'ятірка на повторенні',
    titlePtBr:'Cinco na revisão', titleVi:'Năm câu ôn lại', titleId:'Lima dalam pengulangan', titleTr:'Tekrarda beşli', titlePl:'Piątka w powtórce',
    descRU:'Правильно ответь на 5 карточек в разделе Повторение.',
    descPtBr:'Responda corretamente a 5 cartões na seção Revisão.',
    descVi:'Trả lời đúng 5 thẻ trong phần Ôn tập.',
    descId:'Jawab 5 kartu dengan benar di bagian Pengulangan.',
    descTr:'Tekrar bölümünde 5 karta doğru cevap ver.',
    descPl:'Odpowiedz poprawnie na 5 fiszek w sekcji Powtórka.',
    descUK:'Відповідай правильно на 5 карток у розділі Повторення.' },
  { id:'ra2', type:'recall_answers', icon:'🧠', target:7, xp:60,
    titleRU:'Мастер повторения', titleUK:'Майстер повторення',
    titlePtBr:'Mestre da revisão', titleVi:'Bậc thầy ôn tập', titleId:'Ahli pengulangan', titleTr:'Tekrar ustası', titlePl:'Mistrz powtórek',
    descRU:'Правильно ответь на 7 карточек в разделе Повторение — это полная сессия.',
    descPtBr:'Responda corretamente a 7 cartões na seção Revisão; isso é uma sessão completa.',
    descVi:'Trả lời đúng 7 thẻ trong phần Ôn tập; đó là một phiên đầy đủ.',
    descId:'Jawab 7 kartu dengan benar di bagian Pengulangan; itu satu sesi penuh.',
    descTr:'Tekrar bölümünde 7 karta doğru cevap ver; bu tam bir oturumdur.',
    descPl:'Odpowiedz poprawnie na 7 fiszek w sekcji Powtórka; to pełna sesja.',
    descUK:'Відповідай правильно на 7 карток у розділі Повторення — це повна сесія.' },

  // recall_perfect — сессия Повторения без единой ошибки (минимум 5 карточек)
  { id:'rp1', type:'recall_perfect', icon:'💎', target:1, xp:72,
    titleRU:'Безупречное повторение', titleUK:'Бездоганне повторення',
    titlePtBr:'Revisão impecável', titleVi:'Ôn tập hoàn hảo', titleId:'Pengulangan sempurna', titleTr:'Kusursuz tekrar', titlePl:'Bezbłędna powtórka',
    descRU:'Пройди сессию Повторения без единой ошибки (нужно минимум 5 карточек).',
    descPtBr:'Conclua uma sessão de Revisão sem nenhum erro; são necessários pelo menos 5 cartões.',
    descVi:'Hoàn thành một phiên Ôn tập mà không mắc lỗi nào; cần ít nhất 5 thẻ.',
    descId:'Selesaikan sesi Pengulangan tanpa satu pun kesalahan; perlu minimal 5 kartu.',
    descTr:'Bir Tekrar oturumunu tek hata yapmadan tamamla; en az 5 kart gerekir.',
    descPl:'Ukończ sesję Powtórki bez ani jednego błędu; potrzeba co najmniej 5 fiszek.',
    descUK:'Пройди сесію Повторення без жодної помилки (потрібно мінімум 5 карток).' },

  // daily_phrase_read — прочитать фразу дня (1 в день на главном экране)
  { id:'dpr1', type:'daily_phrase_read', icon:'📰', target:1, xp:12,
    titleRU:'Фраза дня', titleUK:'Фраза дня',
    titlePtBr:'Frase do dia', titleVi:'Câu trong ngày', titleId:'Frasa hari ini', titleTr:'Günün ifadesi', titlePl:'Fraza dnia',
    descRU:'На главном экране найди фразу дня и нажми на неё чтобы прочитать.',
    descPtBr:'Na tela inicial, encontre a frase do dia e toque nela para ler.',
    descVi:'Trên màn hình chính, tìm câu trong ngày và nhấn vào đó để đọc.',
    descId:'Di layar utama, temukan frasa hari ini dan ketuk untuk membacanya.',
    descTr:'Ana ekranda günün ifadesini bul ve okumak için ona dokun.',
    descPl:'Na ekranie głównym znajdź frazę dnia i stuknij ją, aby przeczytać.',
    descUK:'На головному екрані знайди фразу дня і натисни на неї щоб прочитати.' },

  // daily_phrase_save — сохранить фразу дня в карточки
  { id:'dps1', type:'daily_phrase_save', icon:'⭐', target:1, xp:18,
    titleRU:'Сохрани фразу дня', titleUK:'Збережи фразу дня',
    titlePtBr:'Salve a frase do dia', titleVi:'Lưu câu trong ngày', titleId:'Simpan frasa hari ini', titleTr:'Günün ifadesini kaydet', titlePl:'Zapisz frazę dnia',
    descRU:'Открой фразу дня на главном экране и сохрани её в Карточки.',
    descPtBr:'Abra a frase do dia na tela inicial e salve-a em Cartões.',
    descVi:'Mở câu trong ngày trên màn hình chính và lưu vào Thẻ ghi nhớ.',
    descId:'Buka frasa hari ini di layar utama dan simpan ke Kartu.',
    descTr:'Ana ekranda günün ifadesini aç ve Kartlara kaydet.',
    descPl:'Otwórz frazę dnia na ekranie głównym i zapisz ją do Fiszek.',
    descUK:'Відкрий фразу дня на головному екрані і збережи її в Картки.' },

  // diagnostic_complete — пройти диагностический тест полностью (20 вопросов)
  { id:'dc1', type:'diagnostic_complete', icon:'🩺', target:1, xp:96,
    titleRU:'Диагностика', titleUK:'Діагностика',
    titlePtBr:'Diagnóstico', titleVi:'Chẩn đoán', titleId:'Diagnostik', titleTr:'Tanılama', titlePl:'Diagnoza',
    descRU:'Пройди диагностический тест целиком — все 20 вопросов до конца.',
    descPtBr:'Conclua o teste diagnóstico inteiro: todas as 20 perguntas até o fim.',
    descVi:'Hoàn thành toàn bộ bài kiểm tra chẩn đoán: đủ 20 câu hỏi đến cuối.',
    descId:'Selesaikan tes diagnostik sepenuhnya: semua 20 pertanyaan sampai akhir.',
    descTr:'Tanılama testinin tamamını bitir: 20 sorunun hepsini sona kadar çöz.',
    descPl:'Ukończ cały test diagnostyczny: wszystkie 20 pytań do końca.',
    descUK:'Пройди діагностичний тест повністю — усі 20 питань до кінця.' },

  // quiz_easy — правильные ответы в квизе уровня «Легко» (бесплатно)
  { id:'qe1', type:'quiz_easy', icon:'🌱', target:5, xp:18,
    titleRU:'Лёгкий старт', titleUK:'Легкий старт',
    titlePtBr:'Começo fácil', titleVi:'Khởi đầu dễ', titleId:'Awal mudah', titleTr:'Kolay başlangıç', titlePl:'Łatwy start',
    descRU:'Ответь правильно на 5 вопросов в Вызовах на уровне Легко.',
    descPtBr:'Responda corretamente a 5 perguntas em Quizzes no nível Fácil.',
    descVi:'Trả lời đúng 5 câu hỏi trong Quiz ở mức Dễ.',
    descId:'Jawab 5 pertanyaan dengan benar di Kuis pada level Mudah.',
    descTr:'Quizlerde Kolay seviyede 5 soruyu doğru yanıtla.',
    descPl:'Odpowiedz poprawnie na 5 pytań w Quizach na poziomie Łatwe.',
    descUK:'Дай правильну відповідь на 5 запитань у Квізах на рівні Легко.' },
  { id:'qe2', type:'quiz_easy', icon:'🌱', target:10, xp:30,
    titleRU:'Разогрев в вызове', titleUK:'Розігрів у квізі',
    titlePtBr:'Aquecimento no quiz', titleVi:'Khởi động trong quiz', titleId:'Pemanasan di kuis', titleTr:'Quiz ısınması', titlePl:'Rozgrzewka w quizie',
    descRU:'Ответь правильно на 10 вопросов в Вызовах на уровне Легко.',
    descPtBr:'Responda corretamente a 10 perguntas em Quizzes no nível Fácil.',
    descVi:'Trả lời đúng 10 câu hỏi trong Quiz ở mức Dễ.',
    descId:'Jawab 10 pertanyaan dengan benar di Kuis pada level Mudah.',
    descTr:'Quizlerde Kolay seviyede 10 soruyu doğru yanıtla.',
    descPl:'Odpowiedz poprawnie na 10 pytań w Quizach na poziomie Łatwe.',
    descUK:'Дай правильну відповідь на 10 запитань у Квізах на рівні Легко.' },
  { id:'qe3', type:'quiz_easy', icon:'🌱', target:20, xp:48,
    titleRU:'Уверенный игрок', titleUK:'Впевнений гравець',
    titlePtBr:'Jogador confiante', titleVi:'Người chơi tự tin', titleId:'Pemain percaya diri', titleTr:'Kendinden emin oyuncu', titlePl:'Pewny gracz',
    descRU:'Ответь правильно на 20 вопросов в Вызовах на уровне Легко.',
    descPtBr:'Responda corretamente a 20 perguntas em Quizzes no nível Fácil.',
    descVi:'Trả lời đúng 20 câu hỏi trong Quiz ở mức Dễ.',
    descId:'Jawab 20 pertanyaan dengan benar di Kuis pada level Mudah.',
    descTr:'Quizlerde Kolay seviyede 20 soruyu doğru yanıtla.',
    descPl:'Odpowiedz poprawnie na 20 pytań w Quizach na poziomie Łatwe.',
    descUK:'Дай правильну відповідь на 20 запитань у Квізах на рівні Легко.' },

  // quiz_medium — правильные ответы в квизе уровня «Средне»
  { id:'qm1', type:'quiz_medium', icon:'⚔️', target:5, xp:24, minPlayerLevel:8,
    titleRU:'Средний уровень', titleUK:'Середній рівень',
    titlePtBr:'Nível médio', titleVi:'Cấp độ trung bình', titleId:'Level menengah', titleTr:'Orta seviye', titlePl:'Średni poziom',
    descRU:'Ответь правильно на 5 вопросов в Вызовах на уровне Средне.',
    descPtBr:'Responda corretamente a 5 perguntas em Quizzes no nível Médio.',
    descVi:'Trả lời đúng 5 câu hỏi trong Quiz ở mức Trung bình.',
    descId:'Jawab 5 pertanyaan dengan benar di Kuis pada level Menengah.',
    descTr:'Quizlerde Orta seviyede 5 soruyu doğru yanıtla.',
    descPl:'Odpowiedz poprawnie na 5 pytań w Quizach na poziomie Średnie.',
    descUK:'Дай правильну відповідь на 5 запитань у Квізах на рівні Середньо.' },
  { id:'qm2', type:'quiz_medium', icon:'⚔️', target:10, xp:42, minPlayerLevel:8,
    titleRU:'Средний мастер', titleUK:'Середній майстер',
    titlePtBr:'Mestre do médio', titleVi:'Bậc thầy trung bình', titleId:'Ahli level menengah', titleTr:'Orta seviye ustası', titlePl:'Mistrz średniego poziomu',
    descRU:'Ответь правильно на 10 вопросов в Вызовах на уровне Средне.',
    descPtBr:'Responda corretamente a 10 perguntas em Quizzes no nível Médio.',
    descVi:'Trả lời đúng 10 câu hỏi trong Quiz ở mức Trung bình.',
    descId:'Jawab 10 pertanyaan dengan benar di Kuis pada level Menengah.',
    descTr:'Quizlerde Orta seviyede 10 soruyu doğru yanıtla.',
    descPl:'Odpowiedz poprawnie na 10 pytań w Quizach na poziomie Średnie.',
    descUK:'Дай правильну відповідь на 10 запитань у Квізах на рівні Середньо.' },

  // quiz_perfect — раунд квиза без ошибок, любой уровень
  { id:'qp1', type:'quiz_perfect', icon:'✨', target:1, xp:54, minPlayerLevel:8,
    titleRU:'Идеальный раунд', titleUK:'Ідеальний раунд',
    titlePtBr:'Rodada perfeita', titleVi:'Vòng hoàn hảo', titleId:'Ronde sempurna', titleTr:'Mükemmel tur', titlePl:'Idealna runda',
    descRU:'Заверши раунд в Вызовах без единой ошибки — любой уровень.',
    descPtBr:'Conclua uma rodada em Quizzes sem nenhum erro, em qualquer nível.',
    descVi:'Hoàn thành một vòng Quiz không mắc lỗi nào, ở bất kỳ mức nào.',
    descId:'Selesaikan ronde di Kuis tanpa satu pun kesalahan, di level apa pun.',
    descTr:'Quizlerde herhangi bir seviyede bir turu tek hata yapmadan tamamla.',
    descPl:'Ukończ rundę w Quizach bez ani jednego błędu, na dowolnym poziomie.',
    descUK:'Заверши раунд у Квізах без жодної помилки — будь-який рівень.' },

  // quiz_hard_perfect — раунд сложного квиза без ошибок
  { id:'qhp1', type:'quiz_hard_perfect', icon:'👑', target:1, xp:84, minPlayerLevel:15,
    titleRU:'Хардкор без ошибок', titleUK:'Хардкор без помилок',
    titlePtBr:'Difícil sem erros', titleVi:'Khó mà không sai', titleId:'Sulit tanpa kesalahan', titleTr:'Hatasız zor mod', titlePl:'Trudny bez błędów',
    descRU:'Заверши раунд Вызовов на уровне Сложно без единой ошибки.',
    descPtBr:'Conclua uma rodada de Quizzes no nível Difícil sem nenhum erro.',
    descVi:'Hoàn thành một vòng Quiz ở mức Khó mà không mắc lỗi nào.',
    descId:'Selesaikan ronde Kuis pada level Sulit tanpa satu pun kesalahan.',
    descTr:'Quizlerde Zor seviyedeki bir turu tek hata yapmadan tamamla.',
    descPl:'Ukończ rundę Quizów na poziomie Trudne bez ani jednego błędu.',
    descUK:'Заверши раунд Квізів на рівні Складно без жодної помилки.' },

  // different_lessons — позаниматься в N разных уроках за день
  { id:'dl1', type:'different_lessons', icon:'📚', target:2, xp:48,
    titleRU:'Два урока за день', titleUK:'Два уроки за день',
    titlePtBr:'Duas lições no dia', titleVi:'Hai bài trong ngày', titleId:'Dua pelajaran sehari', titleTr:'Günde iki ders', titlePl:'Dwie lekcje dziennie',
    descRU:'Собери хотя бы по одной фразе в 2 разных уроках за день.',
    descPtBr:'Monte pelo menos uma frase em 2 lições diferentes durante o dia.',
    descVi:'Ghép ít nhất một câu trong 2 bài học khác nhau trong ngày.',
    descId:'Susun setidaknya satu frasa di 2 pelajaran berbeda dalam sehari.',
    descTr:'Gün içinde 2 farklı derste en az birer ifadeyi kur.',
    descPl:'Ułóż co najmniej po jednej frazie w 2 różnych lekcjach w ciągu dnia.',
    descUK:'Збери хоча б по одній фразі у 2 різних уроках за день.' },
  { id:'dl2', type:'different_lessons', icon:'📚', target:3, xp:78,
    titleRU:'Три урока за день', titleUK:'Три уроки за день',
    titlePtBr:'Três lições no dia', titleVi:'Ba bài trong ngày', titleId:'Tiga pelajaran sehari', titleTr:'Günde üç ders', titlePl:'Trzy lekcje dziennie',
    descRU:'Собери хотя бы по одной фразе в 3 разных уроках за день.',
    descPtBr:'Monte pelo menos uma frase em 3 lições diferentes durante o dia.',
    descVi:'Ghép ít nhất một câu trong 3 bài học khác nhau trong ngày.',
    descId:'Susun setidaknya satu frasa di 3 pelajaran berbeda dalam sehari.',
    descTr:'Gün içinde 3 farklı derste en az birer ifadeyi kur.',
    descPl:'Ułóż co najmniej po jednej frazie w 3 różnych lekcjach w ciągu dnia.',
    descUK:'Збери хоча б по одній фразі у 3 різних уроках за день.' },

  // lesson_complete — пройти урок полностью до конца
  { id:'lc1', type:'lesson_complete', icon:'🏁', target:1, xp:60,
    titleRU:'Завершить урок', titleUK:'Завершити урок',
    titlePtBr:'Concluir a lição', titleVi:'Hoàn thành bài học', titleId:'Selesaikan pelajaran', titleTr:'Dersi tamamla', titlePl:'Ukończ lekcję',
    descRU:'Пройди любой урок полностью — дойди до экрана завершения.',
    descPtBr:'Conclua qualquer lição inteira até chegar à tela de conclusão.',
    descVi:'Hoàn thành trọn vẹn bất kỳ bài học nào cho đến màn hình kết thúc.',
    descId:'Selesaikan pelajaran apa pun sepenuhnya sampai layar selesai.',
    descTr:'Herhangi bir dersi tamamen bitir ve tamamlama ekranına ulaş.',
    descPl:'Przejdź dowolną lekcję do końca, aż do ekranu ukończenia.',
    descUK:'Пройди будь-який урок повністю — дійди до екрана завершення.' },

  // morning_session — правильные ответы в уроке до 12:00
  { id:'ms1', type:'morning_session', icon:'🌅', target:5, xp:36,
    titleRU:'Ранняя птица', titleUK:'Рання пташка',
    titlePtBr:'Pessoa madrugadora', titleVi:'Chim dậy sớm', titleId:'Bangun pagi', titleTr:'Erken kalkan', titlePl:'Ranny ptaszek',
    descRU:'Собери 5 фраз в уроке до 12:00 — утренний старт.',
    descPtBr:'Monte 5 frases em uma lição antes das 12:00: um começo de manhã.',
    descVi:'Ghép 5 câu trong một bài học trước 12:00: khởi đầu buổi sáng.',
    descId:'Susun 5 frasa dalam pelajaran sebelum pukul 12.00: awal pagi.',
    descTr:'12:00’den önce bir derste 5 ifadeyi kur: sabah başlangıcı.',
    descPl:'Ułóż 5 fraz w lekcji przed 12:00: poranny start.',
    descUK:'Збери 5 фраз в уроці до 12:00 — ранній старт.' },

  // evening_session — правильные ответы в уроке после 18:00
  { id:'evs1', type:'evening_session', icon:'🌙', target:5, xp:36,
    titleRU:'Вечерний студент', titleUK:'Вечірній студент',
    titlePtBr:'Estudante da noite', titleVi:'Học viên buổi tối', titleId:'Pelajar malam', titleTr:'Akşam öğrencisi', titlePl:'Wieczorny uczeń',
    descRU:'Собери 5 фраз в уроке после 18:00 — вечерняя сессия.',
    descPtBr:'Monte 5 frases em uma lição depois das 18:00: uma sessão noturna.',
    descVi:'Ghép 5 câu trong một bài học sau 18:00: phiên học buổi tối.',
    descId:'Susun 5 frasa dalam pelajaran setelah pukul 18.00: sesi malam.',
    descTr:'18:00’den sonra bir derste 5 ifadeyi kur: akşam oturumu.',
    descPl:'Ułóż 5 fraz w lekcji po 18:00: wieczorna sesja.',
    descUK:'Збери 5 фраз в уроці після 18:00 — вечірня сесія.' },

  // Дополнительные da*-слоты: тот же визуальный ряд, но задача — полный урок
  { id:'da4', type:'lesson_complete', icon:'🌟', target:1, xp:60,
    titleRU:'Финишный рывок', titleUK:'Фінішний ривок',
    titlePtBr:'Arrancada final', titleVi:'Nước rút về đích', titleId:'Dorongan akhir', titleTr:'Son hamle', titlePl:'Finiszowy zryw',
    descRU:'Дойди до конца любого урока и открой экран завершения.',
    descPtBr:'Chegue ao fim de qualquer lição e abra a tela de conclusão.',
    descVi:'Đi đến cuối bất kỳ bài học nào và mở màn hình hoàn thành.',
    descId:'Capai akhir pelajaran apa pun dan buka layar selesai.',
    descTr:'Herhangi bir dersin sonuna ulaş ve tamamlama ekranını aç.',
    descPl:'Dotrzyj do końca dowolnej lekcji i otwórz ekran ukończenia.',
    descUK:'Дійди до кінця будь-якого уроку й відкрий екран завершення.' },
  { id:'da5', type:'lesson_complete', icon:'🎯', target:1, xp:60,
    titleRU:'Держи ритм', titleUK:'Тримай ритм',
    titlePtBr:'Mantenha o ritmo', titleVi:'Giữ nhịp', titleId:'Jaga ritme', titleTr:'Ritmi koru', titlePl:'Trzymaj rytm',
    descRU:'Заверши один урок полностью сегодня.',
    descPtBr:'Conclua uma lição inteira hoje.',
    descVi:'Hoàn thành trọn vẹn một bài học hôm nay.',
    descId:'Selesaikan satu pelajaran penuh hari ini.',
    descTr:'Bugün bir dersi tamamen tamamla.',
    descPl:'Ukończ dziś jedną pełną lekcję.',
    descUK:'Заверши один урок повністю сьогодні.' },
  { id:'da6', type:'lesson_complete', icon:'💫', target:1, xp:60,
    titleRU:'Ещё один финиш', titleUK:'Ще один фініш',
    titlePtBr:'Mais um final', titleVi:'Thêm một lần về đích', titleId:'Satu akhir lagi', titleTr:'Bir bitiş daha', titlePl:'Jeszcze jeden finisz',
    descRU:'Пройди любой урок до конца — не останавливайся на старте.',
    descPtBr:'Conclua qualquer lição até o fim; não pare logo no começo.',
    descVi:'Hoàn thành bất kỳ bài học nào đến cuối; đừng dừng ngay lúc bắt đầu.',
    descId:'Selesaikan pelajaran apa pun sampai akhir; jangan berhenti di awal.',
    descTr:'Herhangi bir dersi sonuna kadar bitir; başlangıçta durma.',
    descPl:'Ukończ dowolną lekcję do końca; nie zatrzymuj się na starcie.',
    descUK:'Пройди будь-який урок до кінця — не зупиняйся на старті.' },
  { id:'da7', type:'lesson_complete', icon:'🌈', target:1, xp:60,
    titleRU:'Шаг до конца', titleUK:'Крок до кінця',
    titlePtBr:'Passo até o fim', titleVi:'Bước đến cuối', titleId:'Langkah sampai akhir', titleTr:'Sona bir adım', titlePl:'Krok do końca',
    descRU:'Заверши любой урок полностью и забери прогресс.',
    descPtBr:'Conclua qualquer lição inteira e garanta o progresso.',
    descVi:'Hoàn thành trọn vẹn bất kỳ bài học nào và nhận tiến độ.',
    descId:'Selesaikan pelajaran apa pun sepenuhnya dan ambil progresnya.',
    descTr:'Herhangi bir dersi tamamen tamamla ve ilerlemeyi al.',
    descPl:'Ukończ dowolną lekcję w całości i odbierz postęp.',
    descUK:'Заверши будь-який урок повністю й забери прогрес.' },
  { id:'da8', type:'lesson_complete', icon:'☕', target:1, xp:60,
    titleRU:'Полная сессия', titleUK:'Повна сесія',
    titlePtBr:'Sessão completa', titleVi:'Phiên học trọn vẹn', titleId:'Sesi penuh', titleTr:'Tam oturum', titlePl:'Pełna sesja',
    descRU:'Продолжи урок до финала — нужна полная завершённая сессия.',
    descPtBr:'Continue a lição até o final; é preciso uma sessão concluída.',
    descVi:'Tiếp tục bài học đến cuối; cần một phiên học hoàn thành trọn vẹn.',
    descId:'Lanjutkan pelajaran sampai akhir; perlu sesi yang selesai penuh.',
    descTr:'Dersi finale kadar sürdür; tam bitmiş bir oturum gerekir.',
    descPl:'Kontynuuj lekcję do finału; potrzebna jest pełna ukończona sesja.',
    descUK:'Продовж урок до фіналу — потрібна повна завершена сесія.' },

  // Дополнительные total_answers
  { id:'ta7', type:'total_answers', icon:'📈', target:40, xp:60,
    titleRU:'Набираю темп', titleUK:'Набираю темп',
    titlePtBr:'Ganhando ritmo', titleVi:'Tăng tốc', titleId:'Menaikkan tempo', titleTr:'Tempo kazanıyorum', titlePl:'Nabieram tempa',
    descRU:'Собери 40 фраз в уроках за день.',
    descPtBr:'Monte 40 frases nas lições durante o dia.',
    descVi:'Ghép 40 câu trong các bài học trong ngày.',
    descId:'Susun 40 frasa di pelajaran dalam sehari.',
    descTr:'Gün içinde derslerde 40 ifadeyi kur.',
    descPl:'Ułóż 40 fraz w lekcjach w ciągu dnia.',
    descUK:'Збери 40 фраз у уроках за день.' },
  { id:'ta8', type:'total_answers', icon:'✅', target:15, xp:30,
    titleRU:'Хороший старт', titleUK:'Хороший старт',
    titlePtBr:'Bom começo', titleVi:'Khởi đầu tốt', titleId:'Awal yang baik', titleTr:'İyi başlangıç', titlePl:'Dobry start',
    descRU:'Собери 15 фраз в уроке.',
    descPtBr:'Monte 15 frases em uma lição.',
    descVi:'Ghép 15 câu trong một bài học.',
    descId:'Susun 15 frasa dalam pelajaran.',
    descTr:'Bir derste 15 ifadeyi kur.',
    descPl:'Ułóż 15 fraz w lekcji.',
    descUK:'Збери 15 фраз в уроці.' },
  { id:'ta9', type:'total_answers', icon:'⚡', target:5, xp:14,
    titleRU:'Пять ответов', titleUK:'П\'ять відповідей',
    titlePtBr:'Cinco respostas', titleVi:'Năm câu trả lời', titleId:'Lima jawaban', titleTr:'Beş cevap', titlePl:'Pięć odpowiedzi',
    descRU:'Собери всего 5 фраз в уроке — разогрев на сегодня.',
    descPtBr:'Monte apenas 5 frases em uma lição: aquecimento de hoje.',
    descVi:'Chỉ cần ghép 5 câu trong một bài học: phần khởi động hôm nay.',
    descId:'Susun hanya 5 frasa dalam pelajaran: pemanasan hari ini.',
    descTr:'Bir derste sadece 5 ifadeyi kur: bugünün ısınması.',
    descPl:'Ułóż tylko 5 fraz w lekcji: dzisiejsza rozgrzewka.',
    descUK:'Збери всього 5 фраз в уроці — розігрів на сьогодні.' },
  { id:'ta10', type:'total_answers', icon:'🔥', target:35, xp:54,
    titleRU:'Упорный', titleUK:'Завзятий',
    titlePtBr:'Persistente', titleVi:'Bền bỉ', titleId:'Gigih', titleTr:'Azimli', titlePl:'Wytrwały',
    descRU:'Собери 35 фраз в уроках за день.',
    descPtBr:'Monte 35 frases nas lições durante o dia.',
    descVi:'Ghép 35 câu trong các bài học trong ngày.',
    descId:'Susun 35 frasa di pelajaran dalam sehari.',
    descTr:'Gün içinde derslerde 35 ifadeyi kur.',
    descPl:'Ułóż 35 fraz w lekcjach w ciągu dnia.',
    descUK:'Збери 35 фраз у уроках за день.' },
  { id:'ta11', type:'total_answers', icon:'🚀', target:60, xp:84,
    titleRU:'Шесть десятков', titleUK:'Шість десятків',
    titlePtBr:'Seis dezenas', titleVi:'Sáu chục', titleId:'Enam puluh', titleTr:'Altı onluk', titlePl:'Sześć dziesiątek',
    descRU:'Собери 60 фраз в уроках за день.',
    descPtBr:'Monte 60 frases nas lições durante o dia.',
    descVi:'Ghép 60 câu trong các bài học trong ngày.',
    descId:'Susun 60 frasa di pelajaran dalam sehari.',
    descTr:'Gün içinde derslerde 60 ifadeyi kur.',
    descPl:'Ułóż 60 fraz w lekcjach w ciągu dnia.',
    descUK:'Збери 60 фраз у уроках за день.' },

  // Дополнительные correct_streak
  { id:'cs5', type:'correct_streak', icon:'⚡', target:25, xp:102,
    titleRU:'Мастер серий', titleUK:'Майстер серій',
    titlePtBr:'Mestre das sequências', titleVi:'Bậc thầy chuỗi đúng', titleId:'Ahli rangkaian', titleTr:'Seri ustası', titlePl:'Mistrz serii',
    descRU:'Собери 25 фраз подряд в уроке — не прерви серию.',
    descPtBr:'Monte 25 frases seguidas em uma lição; não quebre a sequência.',
    descVi:'Ghép 25 câu liên tiếp trong một bài học; đừng làm đứt chuỗi.',
    descId:'Susun 25 frasa beruntun dalam pelajaran; jangan putuskan rangkaian.',
    descTr:'Bir derste arka arkaya 25 ifadeyi kur; seriyi bozma.',
    descPl:'Ułóż 25 fraz z rzędu w lekcji; nie przerwij serii.',
    descUK:'Збери 25 фраз поспіль в уроці — не переривай серію.' },
  { id:'cs6', type:'correct_streak', icon:'🎯', target:7, xp:38,
    titleRU:'Семь в цель', titleUK:'Сім у ціль',
    titlePtBr:'Sete no alvo', titleVi:'Bảy câu trúng đích', titleId:'Tujuh tepat sasaran', titleTr:'Yedisi hedefte', titlePl:'Siedem w cel',
    descRU:'Собери 7 фраз подряд в уроке без единой ошибки.',
    descPtBr:'Monte 7 frases seguidas em uma lição sem nenhum erro.',
    descVi:'Ghép 7 câu liên tiếp trong một bài học mà không mắc lỗi nào.',
    descId:'Susun 7 frasa beruntun dalam pelajaran tanpa satu pun kesalahan.',
    descTr:'Bir derste arka arkaya 7 ifadeyi tek hata yapmadan kur.',
    descPl:'Ułóż 7 fraz z rzędu w lekcji bez ani jednego błędu.',
    descUK:'Збери 7 фраз поспіль в уроці без жодної помилки.' },
  { id:'cs7', type:'correct_streak', icon:'🔥', target:12, xp:58,
    titleRU:'Дюжина', titleUK:'Дюжина',
    titlePtBr:'Uma dúzia', titleVi:'Một tá', titleId:'Selusin', titleTr:'Bir düzine', titlePl:'Tuzin',
    descRU:'Собери 12 фраз подряд — держи серию.',
    descPtBr:'Monte 12 frases seguidas e mantenha a sequência.',
    descVi:'Ghép 12 câu liên tiếp và giữ chuỗi.',
    descId:'Susun 12 frasa beruntun dan pertahankan rangkaian.',
    descTr:'Arka arkaya 12 ifadeyi kur ve seriyi koru.',
    descPl:'Ułóż 12 fraz z rzędu i utrzymaj serię.',
    descUK:'Збери 12 фраз поспіль — тримай серію.' },

  // Дополнительные lesson_no_mistakes
  { id:'lnm4', type:'lesson_no_mistakes', icon:'🌟', target:25, xp:144,
    titleRU:'Идеальная серия', titleUK:'Ідеальна серія',
    titlePtBr:'Sequência perfeita', titleVi:'Chuỗi hoàn hảo', titleId:'Rangkaian sempurna', titleTr:'Mükemmel seri', titlePl:'Idealna seria',
    descRU:'Собери 25 фраз подряд — максимальная концентрация.',
    descPtBr:'Monte 25 frases seguidas com concentração máxima.',
    descVi:'Ghép 25 câu liên tiếp với mức tập trung tối đa.',
    descId:'Susun 25 frasa beruntun dengan konsentrasi penuh.',
    descTr:'Arka arkaya 25 ifadeyi maksimum odakla kur.',
    descPl:'Ułóż 25 fraz z rzędu z maksymalnym skupieniem.',
    descUK:'Збери 25 фраз поспіль — максимальна концентрація.' },
  { id:'lnm5', type:'lesson_no_mistakes', icon:'💎', target:30, xp:180,
    titleRU:'Совершенство', titleUK:'Досконалість',
    titlePtBr:'Perfeição', titleVi:'Sự hoàn thiện', titleId:'Kesempurnaan', titleTr:'Mükemmellik', titlePl:'Doskonałość',
    descRU:'Собери 30 фраз подряд без единой ошибки — ты неудержим.',
    descPtBr:'Monte 30 frases seguidas sem nenhum erro; você está imparável.',
    descVi:'Ghép 30 câu liên tiếp mà không mắc lỗi nào; bạn không thể bị cản.',
    descId:'Susun 30 frasa beruntun tanpa satu pun kesalahan; kamu tak terbendung.',
    descTr:'Arka arkaya 30 ifadeyi tek hata yapmadan kur; durdurulamazsın.',
    descPl:'Ułóż 30 fraz z rzędu bez ani jednego błędu; jesteś nie do zatrzymania.',
    descUK:'Збери 30 фраз поспіль без жодної помилки — ти нестримний.' },
  { id:'lnm6', type:'lesson_no_mistakes', icon:'✨', target:8, xp:60,
    titleRU:'Восьмёрка без промаха', titleUK:'Вісімка без промаху',
    titlePtBr:'Oito sem errar', titleVi:'Tám câu không trượt', titleId:'Delapan tanpa meleset', titleTr:'Sekiz hatasız', titlePl:'Ósemka bez pudła',
    descRU:'Собери 8 фраз подряд в уроке — хорошая серия.',
    descPtBr:'Monte 8 frases seguidas em uma lição: uma boa sequência.',
    descVi:'Ghép 8 câu liên tiếp trong một bài học: một chuỗi tốt.',
    descId:'Susun 8 frasa beruntun dalam pelajaran: rangkaian yang bagus.',
    descTr:'Bir derste arka arkaya 8 ifadeyi kur: iyi bir seri.',
    descPl:'Ułóż 8 fraz z rzędu w lekcji: dobra seria.',
    descUK:'Збери 8 фраз поспіль в уроці — гарна серія.' },

  // Дополнительные quiz_easy
  { id:'qe4', type:'quiz_easy', icon:'🌿', target:7, xp:22,
    titleRU:'Семёрка в вызове', titleUK:'Сімка в квізі',
    titlePtBr:'Sete no quiz', titleVi:'Bảy câu trong quiz', titleId:'Tujuh di kuis', titleTr:'Quizde yedili', titlePl:'Siódemka w quizie',
    descRU:'Ответь правильно на 7 вопросов в Вызовах на уровне Легко.',
    descPtBr:'Responda corretamente a 7 perguntas em Quizzes no nível Fácil.',
    descVi:'Trả lời đúng 7 câu hỏi trong Quiz ở mức Dễ.',
    descId:'Jawab 7 pertanyaan dengan benar di Kuis pada level Mudah.',
    descTr:'Quizlerde Kolay seviyede 7 soruyu doğru yanıtla.',
    descPl:'Odpowiedz poprawnie na 7 pytań w Quizach na poziomie Łatwe.',
    descUK:'Дай правильну відповідь на 7 запитань у Квізах на рівні Легко.' },
  { id:'qe5', type:'quiz_easy', icon:'🌱', target:15, xp:38,
    titleRU:'Полтора раунда', titleUK:'Півтора раунду',
    titlePtBr:'Uma rodada e meia', titleVi:'Một vòng rưỡi', titleId:'Satu setengah ronde', titleTr:'Bir buçuk tur', titlePl:'Półtorej rundy',
    descRU:'Ответь правильно на 15 вопросов в Квизах на уровне Легко — примерно 1,5 раунда.',
    descPtBr:'Responda corretamente a 15 perguntas em Quizzes no nível Fácil: cerca de 1,5 rodada.',
    descVi:'Trả lời đúng 15 câu hỏi trong Quiz ở mức Dễ: khoảng 1,5 vòng.',
    descId:'Jawab 15 pertanyaan dengan benar di Kuis pada level Mudah: sekitar 1,5 ronde.',
    descTr:'Quizlerde Kolay seviyede 15 soruyu doğru yanıtla: yaklaşık 1,5 tur.',
    descPl:'Odpowiedz poprawnie na 15 pytań w Quizach na poziomie Łatwe: około 1,5 rundy.',
    descUK:'Дай правильну відповідь на 15 запитань у Квізах на рівні Легко — приблизно півтора раунду.' },
  { id:'qe6', type:'quiz_easy', icon:'🌱', target:4, xp:14,
    titleRU:'Разгон', titleUK:'Розгін',
    titlePtBr:'Arranque', titleVi:'Tăng tốc ban đầu', titleId:'Pemacu awal', titleTr:'Hızlanma', titlePl:'Rozpęd',
    descRU:'Ответь правильно на 4 вопроса в Квизах на уровне Легко — быстрый разгон.',
    descPtBr:'Responda corretamente a 4 perguntas em Quizzes no nível Fácil: um arranque rápido.',
    descVi:'Trả lời đúng 4 câu hỏi trong Quiz ở mức Dễ: tăng tốc nhanh.',
    descId:'Jawab 4 pertanyaan dengan benar di Kuis pada level Mudah: pemanasan cepat.',
    descTr:'Quizlerde Kolay seviyede 4 soruyu doğru yanıtla: hızlı bir başlangıç.',
    descPl:'Odpowiedz poprawnie na 4 pytania w Quizach na poziomie Łatwe: szybki rozpęd.',
    descUK:'Дай правильну відповідь на 4 запитання у Квізах на рівні Легко — швидкий розгін.' },

  // Дополнительные quiz_medium
  { id:'qm3', type:'quiz_medium', icon:'⚔️', target:3, xp:18, minPlayerLevel:8,
    titleRU:'Вход на средний', titleUK:'Вхід на середній',
    titlePtBr:'Entrada no médio', titleVi:'Vào mức trung bình', titleId:'Masuk level menengah', titleTr:'Orta seviyeye giriş', titlePl:'Wejście na średni',
    descRU:'Открой Вызовы → Средне и ответь правильно на 3 вопроса.',
    descPtBr:'Abra Quizzes → Médio e responda corretamente a 3 perguntas.',
    descVi:'Mở Quiz → Trung bình và trả lời đúng 3 câu hỏi.',
    descId:'Buka Kuis → Menengah dan jawab 3 pertanyaan dengan benar.',
    descTr:'Quizler → Orta bölümünü aç ve 3 soruyu doğru yanıtla.',
    descPl:'Otwórz Quizy → Średnie i odpowiedz poprawnie na 3 pytania.',
    descUK:'Відкрий Квізи → Середньо й дай правильну відповідь на 3 запитання.' },
  { id:'qm4', type:'quiz_medium', icon:'⚔️', target:15, xp:60, minPlayerLevel:8,
    titleRU:'Средний мастер плюс', titleUK:'Середній майстер плюс',
    titlePtBr:'Mestre médio plus', titleVi:'Bậc thầy trung bình plus', titleId:'Ahli menengah plus', titleTr:'Orta seviye ustası plus', titlePl:'Mistrz średniego plus',
    descRU:'Ответь правильно на 15 вопросов в Вызовах на уровне Средне.',
    descPtBr:'Responda corretamente a 15 perguntas em Quizzes no nível Médio.',
    descVi:'Trả lời đúng 15 câu hỏi trong Quiz ở mức Trung bình.',
    descId:'Jawab 15 pertanyaan dengan benar di Kuis pada level Menengah.',
    descTr:'Quizlerde Orta seviyede 15 soruyu doğru yanıtla.',
    descPl:'Odpowiedz poprawnie na 15 pytań w Quizach na poziomie Średnie.',
    descUK:'Дай правильну відповідь на 15 запитань у Квізах на рівні Середньо.' },

  // Дополнительные quiz_hard
  { id:'qh5', type:'quiz_hard', icon:'💪', target:7, xp:66, minPlayerLevel:15,
    titleRU:'Семь на сложном', titleUK:'Сім на складному',
    titlePtBr:'Sete no difícil', titleVi:'Bảy câu mức khó', titleId:'Tujuh di level sulit', titleTr:'Zorda yedili', titlePl:'Siedem na trudnym',
    descRU:'Открой Вызовы → Сложно и ответь правильно на 7 вопросов.',
    descPtBr:'Abra Quizzes → Difícil e responda corretamente a 7 perguntas.',
    descVi:'Mở Quiz → Khó và trả lời đúng 7 câu hỏi.',
    descId:'Buka Kuis → Sulit dan jawab 7 pertanyaan dengan benar.',
    descTr:'Quizler → Zor bölümünü aç ve 7 soruyu doğru yanıtla.',
    descPl:'Otwórz Quizy → Trudne i odpowiedz poprawnie na 7 pytań.',
    descUK:'Відкрий Квізи → Складно й дай правильну відповідь на 7 запитань.' },
  { id:'qh6', type:'quiz_hard', icon:'👑', target:20, xp:108, minPlayerLevel:15,
    titleRU:'Двадцать на сложном', titleUK:'Двадцять на складному',
    titlePtBr:'Vinte no difícil', titleVi:'Hai mươi câu mức khó', titleId:'Dua puluh di level sulit', titleTr:'Zorda yirmi', titlePl:'Dwadzieścia na trudnym',
    descRU:'Ответь правильно на 20 вопросов в Вызовах на уровне Сложно.',
    descPtBr:'Responda corretamente a 20 perguntas em Quizzes no nível Difícil.',
    descVi:'Trả lời đúng 20 câu hỏi trong Quiz ở mức Khó.',
    descId:'Jawab 20 pertanyaan dengan benar di Kuis pada level Sulit.',
    descTr:'Quizlerde Zor seviyede 20 soruyu doğru yanıtla.',
    descPl:'Odpowiedz poprawnie na 20 pytań w Quizach na poziomie Trudne.',
    descUK:'Дай правильну відповідь на 20 запитань у Квізах на рівні Складно.' },

  // Дополнительные quiz_score
  { id:'qs5', type:'quiz_score', icon:'💥', target:70, xp:114, minPlayerLevel:15,
    titleRU:'Семь десятков', titleUK:'Сім десятків',
    titlePtBr:'Sete dezenas', titleVi:'Bảy chục', titleId:'Tujuh puluh', titleTr:'Yedi onluk', titlePl:'Siedem dziesiątek',
    descRU:'Заработай 70 XP в Квизах за день — играй на Сложно, держи серию.',
    descPtBr:'Ganhe 70 XP em Quizzes durante o dia: jogue no Difícil e mantenha a sequência.',
    descVi:'Kiếm 70 XP trong Quiz trong ngày: chơi mức Khó và giữ chuỗi.',
    descId:'Dapatkan 70 XP di Kuis dalam sehari: mainkan mode Sulit dan pertahankan rangkaian.',
    descTr:'Gün içinde Quizlerde 70 XP kazan: Zor modda oyna ve seriyi koru.',
    descPl:'Zdobądź 70 XP w Quizach w ciągu dnia: graj na poziomie Trudne i utrzymaj serię.',
    descUK:'Зароби 70 XP у Квізах за день — грай на Складно і тримай серію.' },
  { id:'qs6', type:'quiz_score', icon:'⭐', target:5, xp:14,
    titleRU:'Первые очки', titleUK:'Перші очки',
    titlePtBr:'Primeiros pontos', titleVi:'Điểm đầu tiên', titleId:'Poin pertama', titleTr:'İlk puanlar', titlePl:'Pierwsze punkty',
    descRU:'Заработай 5 XP в Квизах за день — любой уровень.',
    descPtBr:'Ganhe 5 XP em Quizzes durante o dia, em qualquer nível.',
    descVi:'Kiếm 5 XP trong Quiz trong ngày, ở bất kỳ mức nào.',
    descId:'Dapatkan 5 XP di Kuis dalam sehari, di level apa pun.',
    descTr:'Gün içinde Quizlerde herhangi bir seviyede 5 XP kazan.',
    descPl:'Zdobądź 5 XP w Quizach w ciągu dnia, na dowolnym poziomie.',
    descUK:'Зароби 5 XP у Квізах за день — будь-який рівень.' },
  { id:'qs7', type:'quiz_score', icon:'🌟', target:15, xp:36,
    titleRU:'Пятнашки', titleUK:'П\'ятнашки',
    titlePtBr:'Quinze pontos', titleVi:'Mười lăm điểm', titleId:'Lima belas poin', titleTr:'On beşlik', titlePl:'Piętnastka',
    descRU:'Заработай 15 XP в Вызовах за день.',
    descPtBr:'Ganhe 15 XP em Quizzes durante o dia.',
    descVi:'Kiếm 15 XP trong Quiz trong ngày.',
    descId:'Dapatkan 15 XP di Kuis dalam sehari.',
    descTr:'Gün içinde Quizlerde 15 XP kazan.',
    descPl:'Zdobądź 15 XP w Quizach w ciągu dnia.',
    descUK:'Зароби 15 XP у Квізах за день.' },

  // Дополнительные quiz_perfect
  { id:'qp2', type:'quiz_perfect', icon:'✨', target:2, xp:96, minPlayerLevel:8,
    titleRU:'Дважды идеально', titleUK:'Двічі ідеально',
    titlePtBr:'Duas vezes perfeito', titleVi:'Hai lần hoàn hảo', titleId:'Dua kali sempurna', titleTr:'İki kez mükemmel', titlePl:'Dwa razy idealnie',
    descRU:'Заверши 2 раунда в Квизах без единой ошибки сегодня.',
    descPtBr:'Conclua 2 rodadas em Quizzes sem nenhum erro hoje.',
    descVi:'Hoàn thành 2 vòng Quiz không mắc lỗi nào hôm nay.',
    descId:'Selesaikan 2 ronde di Kuis tanpa satu pun kesalahan hari ini.',
    descTr:'Bugün Quizlerde 2 turu tek hata yapmadan tamamla.',
    descPl:'Ukończ dziś 2 rundy w Quizach bez ani jednego błędu.',
    descUK:'Заверши 2 раунди в Квізах без жодної помилки сьогодні.' },

  // Дополнительный quiz_hard_perfect
  { id:'qhp2', type:'quiz_hard_perfect', icon:'💥', target:1, xp:108, minPlayerLevel:15,
    titleRU:'Сложно и чисто', titleUK:'Складно і чисто',
    titlePtBr:'Difícil e limpo', titleVi:'Khó và sạch lỗi', titleId:'Sulit dan bersih', titleTr:'Zor ve temiz', titlePl:'Trudno i czysto',
    descRU:'Пройди раунд Вызовов на уровне Сложно без единой ошибки.',
    descPtBr:'Conclua uma rodada de Quizzes no nível Difícil sem nenhum erro.',
    descVi:'Hoàn thành một vòng Quiz ở mức Khó mà không mắc lỗi nào.',
    descId:'Selesaikan ronde Kuis pada level Sulit tanpa satu pun kesalahan.',
    descTr:'Quizlerde Zor seviyedeki bir turu tek hata yapmadan tamamla.',
    descPl:'Ukończ rundę Quizów na poziomie Trudne bez ani jednego błędu.',
    descUK:'Пройди раунд Квізів на рівні Складно без жодної помилки.' },

  // Дополнительные flashcard_view
  { id:'fv4', type:'flashcard_view', icon:'🃏', target:3, xp:14,
    titleRU:'Три карточки', titleUK:'Три картки',
    titlePtBr:'Três cartões', titleVi:'Ba thẻ', titleId:'Tiga kartu', titleTr:'Üç kart', titlePl:'Trzy fiszki',
    descRU:'Открой раздел Карточки и пролистай 3 карточки.',
    descPtBr:'Abra a seção Cartões e passe por 3 cartões.',
    descVi:'Mở phần Thẻ ghi nhớ và lướt qua 3 thẻ.',
    descId:'Buka bagian Kartu dan lihat 3 kartu.',
    descTr:'Kartlar bölümünü aç ve 3 karta göz at.',
    descPl:'Otwórz sekcję Fiszki i przejrzyj 3 fiszki.',
    descUK:'Відкрий розділ Картки і перегортай 3 картки.' },
  { id:'fv5', type:'flashcard_view', icon:'🃏', target:15, xp:54,
    titleRU:'Пятнашки в картах', titleUK:'П\'ятнашки в картах',
    titlePtBr:'Quinze nos cartões', titleVi:'Mười lăm thẻ', titleId:'Lima belas kartu', titleTr:'Kartlarda on beş', titlePl:'Piętnastka w fiszkach',
    descRU:'Открой раздел Карточки и пролистай 15 карточек.',
    descPtBr:'Abra a seção Cartões e passe por 15 cartões.',
    descVi:'Mở phần Thẻ ghi nhớ và lướt qua 15 thẻ.',
    descId:'Buka bagian Kartu dan lihat 15 kartu.',
    descTr:'Kartlar bölümünü aç ve 15 karta göz at.',
    descPl:'Otwórz sekcję Fiszki i przejrzyj 15 fiszek.',
    descUK:'Відкрий розділ Картки і перегортай 15 карток.' },
  { id:'fv6', type:'flashcard_view', icon:'🃏', target:7, xp:30,
    titleRU:'Семь карточек', titleUK:'Сім карток',
    titlePtBr:'Sete cartões', titleVi:'Bảy thẻ', titleId:'Tujuh kartu', titleTr:'Yedi kart', titlePl:'Siedem fiszek',
    descRU:'Открой раздел Карточки и пролистай 7 карточек.',
    descPtBr:'Abra a seção Cartões e passe por 7 cartões.',
    descVi:'Mở phần Thẻ ghi nhớ và lướt qua 7 thẻ.',
    descId:'Buka bagian Kartu dan lihat 7 kartu.',
    descTr:'Kartlar bölümünü aç ve 7 karta göz at.',
    descPl:'Otwórz sekcję Fiszki i przejrzyj 7 fiszek.',
    descUK:'Відкрий розділ Картки і перегортай 7 карток.' },

  // Дополнительные flashcard_save
  { id:'fs4', type:'flashcard_save', icon:'💾', target:2, xp:30,
    titleRU:'Два в копилку', titleUK:'Два в скарбничку',
    titlePtBr:'Dois para a coleção', titleVi:'Hai câu bỏ túi', titleId:'Dua untuk koleksi', titleTr:'Kumbaraya iki tane', titlePl:'Dwie do skarbca',
    descRU:'Сохрани 2 фразы в Карточки через кнопку Save в уроках.',
    descPtBr:'Salve 2 frases em Cartões usando o botão Save nas lições.',
    descVi:'Lưu 2 câu vào Thẻ ghi nhớ bằng nút Save trong các bài học.',
    descId:'Simpan 2 frasa ke Kartu dengan tombol Save di pelajaran.',
    descTr:'Derslerde Save düğmesini kullanarak 2 ifadeyi Kartlara kaydet.',
    descPl:'Zapisz 2 frazy do Fiszek przyciskiem Save w lekcjach.',
    descUK:'Збережи 2 фрази у Картки через кнопку Save на уроках.' },
  { id:'fs5', type:'flashcard_save', icon:'💾', target:4, xp:48,
    titleRU:'Четыре в коллекции', titleUK:'Чотири в колекції',
    titlePtBr:'Quatro na coleção', titleVi:'Bốn câu trong bộ sưu tập', titleId:'Empat dalam koleksi', titleTr:'Koleksiyonda dört', titlePl:'Cztery w kolekcji',
    descRU:'Сохрани 4 фразы в Карточки через кнопку Save в уроках.',
    descPtBr:'Salve 4 frases em Cartões usando o botão Save nas lições.',
    descVi:'Lưu 4 câu vào Thẻ ghi nhớ bằng nút Save trong các bài học.',
    descId:'Simpan 4 frasa ke Kartu dengan tombol Save di pelajaran.',
    descTr:'Derslerde Save düğmesini kullanarak 4 ifadeyi Kartlara kaydet.',
    descPl:'Zapisz 4 frazy do Fiszek przyciskiem Save w lekcjach.',
    descUK:'Збережи 4 фрази у Картки через кнопку Save на уроках.' },
  { id:'fs6', type:'flashcard_save', icon:'⭐', target:1, xp:18,
    titleRU:'Памятная фраза', titleUK:'Пам\'ятна фраза',
    titlePtBr:'Frase memorável', titleVi:'Câu đáng nhớ', titleId:'Frasa berkesan', titleTr:'Akılda kalan ifade', titlePl:'Zapamiętana fraza',
    descRU:'Нажми Save на 1 понравившейся фразе в уроке.',
    descPtBr:'Toque em Save em 1 frase de que você gostou na lição.',
    descVi:'Nhấn Save ở 1 câu bạn thích trong bài học.',
    descId:'Ketuk Save pada 1 frasa yang kamu suka di pelajaran.',
    descTr:'Derste beğendiğin 1 ifadede Save düğmesine dokun.',
    descPl:'Stuknij Save przy 1 frazie, która spodobała ci się w lekcji.',
    descUK:'Натисни Save біля однієї фрази, яка сподобалась, у уроці.' },

  // Дополнительные flashcard_flip
  { id:'ff4', type:'flashcard_flip', icon:'🔄', target:3, xp:14,
    titleRU:'Три поворота', titleUK:'Три поворота',
    titlePtBr:'Três viradas', titleVi:'Ba lần lật thẻ', titleId:'Tiga balikan', titleTr:'Üç çevirme', titlePl:'Trzy odwrócenia',
    descRU:'В разделе Карточки нажми на 3 карточки чтобы увидеть перевод.',
    descPtBr:'Na seção Cartões, toque em 3 cartões para ver a tradução.',
    descVi:'Trong phần Thẻ ghi nhớ, nhấn vào 3 thẻ để xem bản dịch.',
    descId:'Di bagian Kartu, ketuk 3 kartu untuk melihat terjemahannya.',
    descTr:'Kartlar bölümünde çeviriyi görmek için 3 karta dokun.',
    descPl:'W sekcji Fiszki stuknij 3 fiszki, aby zobaczyć tłumaczenie.',
    descUK:'В розділі Картки натисни на 3 картки щоб побачити переклад.' },
  { id:'ff5', type:'flashcard_flip', icon:'🔄', target:20, xp:78,
    titleRU:'Весь набор', titleUK:'Весь набір',
    titlePtBr:'Conjunto completo', titleVi:'Cả bộ', titleId:'Seluruh set', titleTr:'Tüm set', titlePl:'Cały zestaw',
    descRU:'В разделе Карточки нажми на 20 карточек — проверь переводы всех.',
    descPtBr:'Na seção Cartões, toque em 20 cartões e confira todas as traduções.',
    descVi:'Trong phần Thẻ ghi nhớ, nhấn vào 20 thẻ và kiểm tra tất cả bản dịch.',
    descId:'Di bagian Kartu, ketuk 20 kartu dan periksa semua terjemahan.',
    descTr:'Kartlar bölümünde 20 karta dokun ve tüm çevirileri kontrol et.',
    descPl:'W sekcji Fiszki stuknij 20 fiszek i sprawdź wszystkie tłumaczenia.',
    descUK:'В розділі Картки натисни на 20 карток — перевір переклади всіх.' },
  { id:'ff6', type:'flashcard_flip', icon:'🔄', target:7, xp:30,
    titleRU:'Семёрка переворотов', titleUK:'Сімка переворотів',
    titlePtBr:'Sete viradas', titleVi:'Bảy lần lật thẻ', titleId:'Tujuh balikan', titleTr:'Yedi çevirme', titlePl:'Siedem odwróceń',
    descRU:'В разделе Карточки нажми на 7 карточек чтобы увидеть переводы.',
    descPtBr:'Na seção Cartões, toque em 7 cartões para ver as traduções.',
    descVi:'Trong phần Thẻ ghi nhớ, nhấn vào 7 thẻ để xem các bản dịch.',
    descId:'Di bagian Kartu, ketuk 7 kartu untuk melihat terjemahannya.',
    descTr:'Kartlar bölümünde çevirileri görmek için 7 karta dokun.',
    descPl:'W sekcji Fiszki stuknij 7 fiszek, aby zobaczyć tłumaczenia.',
    descUK:'В розділі Картки натисни на 7 карток щоб побачити переклади.' },

  // Дополнительные recall_session
  { id:'rs2', type:'recall_session', icon:'🔁', target:1, xp:24,
    titleRU:'Освежаю память', titleUK:'Освіжаю пам\'ять',
    titlePtBr:'Reavivando a memória', titleVi:'Làm mới trí nhớ', titleId:'Menyegarkan ingatan', titleTr:'Hafızayı tazeliyorum', titlePl:'Odświeżam pamięć',
    descRU:'Открой раздел Повторение и правильно ответь хотя бы на одну карточку — освежи то, что знаешь.',
    descPtBr:'Abra a seção Revisão e responda corretamente a pelo menos um cartão para refrescar o que você sabe.',
    descVi:'Mở phần Ôn tập và trả lời đúng ít nhất một thẻ để làm mới những gì bạn biết.',
    descId:'Buka bagian Pengulangan dan jawab setidaknya satu kartu dengan benar untuk menyegarkan yang kamu tahu.',
    descTr:'Tekrar bölümünü aç ve bildiklerini tazelemek için en az bir karta doğru cevap ver.',
    descPl:'Otwórz sekcję Powtórka i odpowiedz poprawnie na co najmniej jedną fiszkę, aby odświeżyć to, co umiesz.',
    descUK:'Відкрий розділ Повторення й відповідай правильно хоча б на одну картку — освіж те, що знаєш.' },
  { id:'rs3', type:'recall_session', icon:'🧩', target:1, xp:24,
    titleRU:'Сессия повторения', titleUK:'Сесія повторення',
    titlePtBr:'Sessão de revisão', titleVi:'Phiên ôn tập', titleId:'Sesi pengulangan', titleTr:'Tekrar oturumu', titlePl:'Sesja powtórki',
    descRU:'Открой Повторение и правильно ответь хотя бы на одну карточку — система запомнит твой прогресс.',
    descPtBr:'Abra Revisão e responda corretamente a pelo menos um cartão; o sistema salvará seu progresso.',
    descVi:'Mở Ôn tập và trả lời đúng ít nhất một thẻ; hệ thống sẽ lưu tiến trình của bạn.',
    descId:'Buka Pengulangan dan jawab setidaknya satu kartu dengan benar; sistem akan menyimpan progresmu.',
    descTr:'Tekrarı aç ve en az bir karta doğru cevap ver; sistem ilerlemeni kaydeder.',
    descPl:'Otwórz Powtórkę i odpowiedz poprawnie na co najmniej jedną fiszkę; system zapisze twój postęp.',
    descUK:'Відкрий Повторення й відповідай правильно хоча б на одну картку — застосунок збереже прогрес.' },

  // Дополнительные recall_answers
  { id:'ra3', type:'recall_answers', icon:'🧠', target:3, xp:24,
    titleRU:'Три в повторе', titleUK:'Три в повторенні',
    titlePtBr:'Três na revisão', titleVi:'Ba câu ôn lại', titleId:'Tiga dalam pengulangan', titleTr:'Tekrarda üç', titlePl:'Trzy w powtórce',
    descRU:'Правильно ответь на 3 карточки в разделе Повторение.',
    descPtBr:'Responda corretamente a 3 cartões na seção Revisão.',
    descVi:'Trả lời đúng 3 thẻ trong phần Ôn tập.',
    descId:'Jawab 3 kartu dengan benar di bagian Pengulangan.',
    descTr:'Tekrar bölümünde 3 karta doğru cevap ver.',
    descPl:'Odpowiedz poprawnie na 3 fiszki w sekcji Powtórka.',
    descUK:'Відповідай правильно на 3 картки у розділі Повторення.' },
  { id:'ra4', type:'recall_answers', icon:'🧠', target:10, xp:84,
    titleRU:'Десятка в повторе', titleUK:'Десятка в повторенні',
    titlePtBr:'Dez na revisão', titleVi:'Mười câu ôn lại', titleId:'Sepuluh dalam pengulangan', titleTr:'Tekrarda on', titlePl:'Dziesiątka w powtórce',
    descRU:'Правильно ответь на 10 карточек в разделе Повторение — понадобятся 2 сессии.',
    descPtBr:'Responda corretamente a 10 cartões na seção Revisão; serão necessárias 2 sessões.',
    descVi:'Trả lời đúng 10 thẻ trong phần Ôn tập; sẽ cần 2 phiên.',
    descId:'Jawab 10 kartu dengan benar di bagian Pengulangan; perlu 2 sesi.',
    descTr:'Tekrar bölümünde 10 karta doğru cevap ver; 2 oturum gerekir.',
    descPl:'Odpowiedz poprawnie na 10 fiszek w sekcji Powtórka; potrzebne będą 2 sesje.',
    descUK:'Відповідай правильно на 10 карток у розділі Повторення — знадобляться 2 сесії.' },
  { id:'ra5', type:'recall_answers', icon:'🔮', target:4, xp:30,
    titleRU:'Четыре на повторе', titleUK:'Чотири на повторенні',
    titlePtBr:'Quatro na revisão', titleVi:'Bốn câu ôn lại', titleId:'Empat dalam pengulangan', titleTr:'Tekrarda dört', titlePl:'Cztery w powtórce',
    descRU:'Правильно ответь на 4 карточки в разделе Повторение сегодня.',
    descPtBr:'Responda corretamente a 4 cartões na seção Revisão hoje.',
    descVi:'Trả lời đúng 4 thẻ trong phần Ôn tập hôm nay.',
    descId:'Jawab 4 kartu dengan benar di bagian Pengulangan hari ini.',
    descTr:'Bugün Tekrar bölümünde 4 karta doğru cevap ver.',
    descPl:'Odpowiedz dziś poprawnie na 4 fiszki w sekcji Powtórka.',
    descUK:'Відповідай правильно на 4 картки у розділі Повторення сьогодні.' },

  // Дополнительный recall_perfect
  { id:'rp2', type:'recall_perfect', icon:'🌟', target:1, xp:72,
    titleRU:'Идеальная память', titleUK:'Ідеальна пам\'ять',
    titlePtBr:'Memória perfeita', titleVi:'Trí nhớ hoàn hảo', titleId:'Ingatan sempurna', titleTr:'Mükemmel hafıza', titlePl:'Idealna pamięć',
    descRU:'Пройди сессию Повторения без единой ошибки — нужно минимум 5 карточек.',
    descPtBr:'Conclua uma sessão de Revisão sem nenhum erro; são necessários pelo menos 5 cartões.',
    descVi:'Hoàn thành một phiên Ôn tập mà không mắc lỗi nào; cần ít nhất 5 thẻ.',
    descId:'Selesaikan sesi Pengulangan tanpa satu pun kesalahan; perlu minimal 5 kartu.',
    descTr:'Bir Tekrar oturumunu tek hata yapmadan tamamla; en az 5 kart gerekir.',
    descPl:'Ukończ sesję Powtórki bez ani jednego błędu; potrzeba co najmniej 5 fiszek.',
    descUK:'Пройди сесію Повторення без жодної помилки — потрібно мінімум 5 карток.' },

  // Дополнительные verb_learned
  { id:'vl4', type:'verb_learned', icon:'🔤', target:1, xp:18,
    titleRU:'Первый глагол', titleUK:'Перше дієслово',
    titlePtBr:'Primeiro verbo', titleVi:'Động từ đầu tiên', titleId:'Kata kerja pertama', titleTr:'İlk fiil', titlePl:'Pierwszy czasownik',
    descRU:'Выучи 1 неправильный глагол в разделе Глаголы любого урока.',
    descPtBr:'Aprenda 1 verbo irregular na seção Verbos de qualquer lição.',
    descVi:'Học 1 động từ bất quy tắc trong phần Động từ của bất kỳ bài học nào.',
    descId:'Pelajari 1 kata kerja tidak beraturan di bagian Kata Kerja dari pelajaran apa pun.',
    descTr:'Herhangi bir dersin Fiiller bölümünde 1 düzensiz fiil öğren.',
    descPl:'Naucz się 1 czasownika nieregularnego w sekcji Czasowniki dowolnej lekcji.',
    descUK:'Вивчи 1 неправильне дієслово в розділі Дієслова будь-якого уроку.' },
  { id:'vl5', type:'verb_learned', icon:'⚙️', target:3, xp:42,
    titleRU:'Три глагола', titleUK:'Три дієслова',
    titlePtBr:'Três verbos', titleVi:'Ba động từ', titleId:'Tiga kata kerja', titleTr:'Üç fiil', titlePl:'Trzy czasowniki',
    descRU:'Выучи 3 неправильных глагола в разделе Глаголы.',
    descPtBr:'Aprenda 3 verbos irregulares na seção Verbos.',
    descVi:'Học 3 động từ bất quy tắc trong phần Động từ.',
    descId:'Pelajari 3 kata kerja tidak beraturan di bagian Kata Kerja.',
    descTr:'Fiiller bölümünde 3 düzensiz fiil öğren.',
    descPl:'Naucz się 3 czasowników nieregularnych w sekcji Czasowniki.',
    descUK:'Вивчи 3 неправильних дієслова в розділі Дієслова.' },
  { id:'vl6', type:'verb_learned', icon:'🔩', target:8, xp:96,
    titleRU:'Восемь форм', titleUK:'Вісім форм',
    titlePtBr:'Oito formas', titleVi:'Tám dạng', titleId:'Delapan bentuk', titleTr:'Sekiz form', titlePl:'Osiem form',
    descRU:'Выучи 8 неправильных глаголов в разделе Глаголы.',
    descPtBr:'Aprenda 8 verbos irregulares na seção Verbos.',
    descVi:'Học 8 động từ bất quy tắc trong phần Động từ.',
    descId:'Pelajari 8 kata kerja tidak beraturan di bagian Kata Kerja.',
    descTr:'Fiiller bölümünde 8 düzensiz fiil öğren.',
    descPl:'Naucz się 8 czasowników nieregularnych w sekcji Czasowniki.',
    descUK:'Вивчи 8 неправильних дієслів в розділі Дієслова.' },

  // Дополнительные words_learned
  { id:'wl4', type:'words_learned', icon:'📗', target:15, xp:96,
    titleRU:'Словарный прорыв', titleUK:'Словниковий прорив',
    titlePtBr:'Avanço de vocabulário', titleVi:'Bứt phá từ vựng', titleId:'Terobosan kosakata', titleTr:'Kelime atılımı', titlePl:'Przełom słownictwa',
    descRU:'Выучи 15 слов в разделе Слова — можно в разных уроках.',
    descPtBr:'Aprenda 15 palavras na seção Palavras; pode ser em lições diferentes.',
    descVi:'Học 15 từ trong phần Từ; có thể ở nhiều bài học khác nhau.',
    descId:'Pelajari 15 kata di bagian Kata; boleh dari pelajaran yang berbeda.',
    descTr:'Kelimeler bölümünde 15 kelime öğren; farklı derslerde olabilir.',
    descPl:'Naucz się 15 słów w sekcji Słowa; mogą być z różnych lekcji.',
    descUK:'Вивчи 15 слів в розділі Слова — можна в різних уроках.' },
  { id:'wl5', type:'words_learned', icon:'📝', target:7, xp:60,
    titleRU:'Семь слов', titleUK:'Сім слів',
    titlePtBr:'Sete palavras', titleVi:'Bảy từ', titleId:'Tujuh kata', titleTr:'Yedi kelime', titlePl:'Siedem słów',
    descRU:'Выучи 7 слов в разделе Слова любого урока.',
    descPtBr:'Aprenda 7 palavras na seção Palavras de qualquer lição.',
    descVi:'Học 7 từ trong phần Từ của bất kỳ bài học nào.',
    descId:'Pelajari 7 kata di bagian Kata dari pelajaran apa pun.',
    descTr:'Herhangi bir dersin Kelimeler bölümünde 7 kelime öğren.',
    descPl:'Naucz się 7 słów w sekcji Słowa dowolnej lekcji.',
    descUK:'Вивчи 7 слів у розділі Слова будь-якого уроку.' },
  { id:'wl6', type:'words_learned', icon:'📖', target:2, xp:24,
    titleRU:'Два слова', titleUK:'Два слова',
    titlePtBr:'Duas palavras', titleVi:'Hai từ', titleId:'Dua kata', titleTr:'İki kelime', titlePl:'Dwa słowa',
    descRU:'Выучи 2 слова в разделе Слова любого урока — быстрое задание.',
    descPtBr:'Aprenda 2 palavras na seção Palavras de qualquer lição: uma tarefa rápida.',
    descVi:'Học 2 từ trong phần Từ của bất kỳ bài học nào: nhiệm vụ nhanh.',
    descId:'Pelajari 2 kata di bagian Kata dari pelajaran apa pun: tugas cepat.',
    descTr:'Herhangi bir dersin Kelimeler bölümünde 2 kelime öğren: hızlı görev.',
    descPl:'Naucz się 2 słów w sekcji Słowa dowolnej lekcji: szybkie zadanie.',
    descUK:'Вивчи 2 слова в розділі Слова будь-якого уроку — швидке завдання.' },

  // Дополнительный open_theory
  { id:'ot3', type:'open_theory', icon:'📚', target:3, xp:30,
    titleRU:'Три правила', titleUK:'Три правила',
    titlePtBr:'Três regras', titleVi:'Ba quy tắc', titleId:'Tiga aturan', titleTr:'Üç kural', titlePl:'Trzy zasady',
    descRU:'Открой вкладку Теория в 3 разных уроках — изучи грамматику.',
    descPtBr:'Abra a aba Teoria em 3 lições diferentes e estude a gramática.',
    descVi:'Mở tab Lý thuyết trong 3 bài học khác nhau và học ngữ pháp.',
    descId:'Buka tab Teori di 3 pelajaran berbeda dan pelajari tata bahasa.',
    descTr:'3 farklı derste Teori sekmesini aç ve dil bilgisini çalış.',
    descPl:'Otwórz kartę Teoria w 3 różnych lekcjach i przestudiuj gramatykę.',
    descUK:'Відкрий вкладку Теорія в 3 різних уроках — вивчи граматику.' },
  { id:'ot4', type:'open_theory', icon:'💡', target:1, xp:12,
    titleRU:'Открой правило', titleUK:'Відкрий правило',
    titlePtBr:'Abra a regra', titleVi:'Mở quy tắc', titleId:'Buka aturan', titleTr:'Kuralı aç', titlePl:'Otwórz zasadę',
    descRU:'Загляни в Теорию любого урока — освежи знание правил.',
    descPtBr:'Veja a Teoria de qualquer lição e revise as regras.',
    descVi:'Xem phần Lý thuyết của bất kỳ bài học nào để ôn lại quy tắc.',
    descId:'Lihat Teori dari pelajaran apa pun untuk menyegarkan aturan.',
    descTr:'Herhangi bir dersin Teori bölümüne bak ve kuralları tazele.',
    descPl:'Zajrzyj do Teorii dowolnej lekcji i odśwież zasady.',
    descUK:'Зазирни в Теорію будь-якого уроку — освіжи знання правил.' },

  // Дополнительные different_lessons
  { id:'dl3', type:'different_lessons', icon:'🗂️', target:4, xp:102,
    titleRU:'Четыре урока за день', titleUK:'Чотири уроки за день',
    titlePtBr:'Quatro lições no dia', titleVi:'Bốn bài trong ngày', titleId:'Empat pelajaran sehari', titleTr:'Günde dört ders', titlePl:'Cztery lekcje dziennie',
    descRU:'Собери хотя бы по одной фразе в 4 разных уроках за день.',
    descPtBr:'Monte pelo menos uma frase em 4 lições diferentes durante o dia.',
    descVi:'Ghép ít nhất một câu trong 4 bài học khác nhau trong ngày.',
    descId:'Susun setidaknya satu frasa di 4 pelajaran berbeda dalam sehari.',
    descTr:'Gün içinde 4 farklı derste en az bir ifadeyi kur.',
    descPl:'Ułóż w ciągu dnia co najmniej jedną frazę w 4 różnych lekcjach.',
    descUK:'Збери хоча б по одній фразі у 4 різних уроках за день.' },

  // Дополнительные lesson_complete
  { id:'lc2', type:'lesson_complete', icon:'🏆', target:2, xp:96,
    titleRU:'Два финиша', titleUK:'Два фінішу',
    titlePtBr:'Dois finais', titleVi:'Hai lần hoàn thành', titleId:'Dua penyelesaian', titleTr:'İki bitiriş', titlePl:'Dwa finisze',
    descRU:'Пройди 2 урока полностью — дойди до экрана завершения в каждом.',
    descPtBr:'Conclua 2 lições inteiras: chegue à tela de conclusão em cada uma.',
    descVi:'Hoàn thành trọn vẹn 2 bài học: đến màn hình hoàn thành ở mỗi bài.',
    descId:'Selesaikan 2 pelajaran sepenuhnya: capai layar selesai di masing-masing pelajaran.',
    descTr:'2 dersi tamamen bitir: her birinde tamamlama ekranına ulaş.',
    descPl:'Ukończ w całości 2 lekcje: w każdej dojdź do ekranu zakończenia.',
    descUK:'Пройди 2 уроки повністю — дійди до екрана завершення в кожному.' },
  { id:'lc3', type:'lesson_complete', icon:'🎓', target:3, xp:132,
    titleRU:'Тройной финиш', titleUK:'Потрійний фініш',
    titlePtBr:'Final triplo', titleVi:'Ba lần hoàn thành', titleId:'Tiga penyelesaian', titleTr:'Üçlü bitiriş', titlePl:'Potrójny finisz',
    descRU:'Пройди 3 урока полностью — академическая сессия за день.',
    descPtBr:'Conclua 3 lições inteiras: uma sessão acadêmica no dia.',
    descVi:'Hoàn thành trọn vẹn 3 bài học: một phiên học nghiêm túc trong ngày.',
    descId:'Selesaikan 3 pelajaran sepenuhnya: sesi belajar serius dalam sehari.',
    descTr:'3 dersi tamamen bitir: gün içinde ciddi bir çalışma oturumu.',
    descPl:'Ukończ w całości 3 lekcje: solidna sesja nauki w ciągu dnia.',
    descUK:'Пройди 3 уроки повністю — академічна сесія за день.' },
  { id:'lc4', type:'lesson_complete', icon:'🏁', target:1, xp:60,
    titleRU:'Финишная черта', titleUK:'Фінішна риска',
    titlePtBr:'Linha de chegada', titleVi:'Vạch đích', titleId:'Garis finis', titleTr:'Bitiş çizgisi', titlePl:'Linia mety',
    descRU:'Пройди любой урок полностью до экрана победы.',
    descPtBr:'Conclua qualquer lição inteira até a tela de vitória.',
    descVi:'Hoàn thành trọn vẹn bất kỳ bài học nào đến màn hình chiến thắng.',
    descId:'Selesaikan pelajaran apa pun sepenuhnya sampai layar kemenangan.',
    descTr:'Herhangi bir dersi zafer ekranına kadar tamamen bitir.',
    descPl:'Ukończ dowolną lekcję w całości aż do ekranu zwycięstwa.',
    descUK:'Пройди будь-який урок повністю до екрана перемоги.' },

  // Дополнительные morning_session
  { id:'ms2', type:'morning_session', icon:'🌤️', target:3, xp:24,
    titleRU:'Утренние три', titleUK:'Ранкові три',
    titlePtBr:'Três pela manhã', titleVi:'Ba câu buổi sáng', titleId:'Tiga pagi', titleTr:'Sabah üçlüsü', titlePl:'Poranne trzy',
    descRU:'Собери 3 фразы в уроке до 12:00 — доброе утро, учёба!',
    descPtBr:'Monte 3 frases em uma lição antes das 12:00: bom dia, estudo!',
    descVi:'Ghép 3 câu trong một bài học trước 12:00: chào buổi sáng, giờ học!',
    descId:'Susun 3 frasa dalam pelajaran sebelum 12:00: selamat pagi, waktunya belajar!',
    descTr:'12:00’den önce bir derste 3 ifadeyi kur: günaydın, çalışma zamanı!',
    descPl:'Ułóż 3 frazy w lekcji przed 12:00: dzień dobry, czas na naukę!',
    descUK:'Збери 3 фрази в уроці до 12:00 — доброго ранку, навчання!' },
  { id:'ms3', type:'morning_session', icon:'☀️', target:10, xp:66,
    titleRU:'Утренний марафон', titleUK:'Ранковий марафон',
    titlePtBr:'Maratona matinal', titleVi:'Cuộc đua buổi sáng', titleId:'Maraton pagi', titleTr:'Sabah maratonu', titlePl:'Poranny maraton',
    descRU:'Собери 10 фраз в уроке до 12:00 — серьёзная утренняя сессия.',
    descPtBr:'Monte 10 frases em uma lição antes das 12:00: uma sessão matinal séria.',
    descVi:'Ghép 10 câu trong một bài học trước 12:00: một phiên học buổi sáng nghiêm túc.',
    descId:'Susun 10 frasa dalam pelajaran sebelum 12:00: sesi pagi yang serius.',
    descTr:'12:00’den önce bir derste 10 ifadeyi kur: ciddi bir sabah oturumu.',
    descPl:'Ułóż 10 fraz w lekcji przed 12:00: solidna poranna sesja.',
    descUK:'Збери 10 фраз в уроці до 12:00 — серйозна ранкова сесія.' },
  { id:'ms4', type:'morning_session', icon:'🌅', target:7, xp:48,
    titleRU:'Семь до полудня', titleUK:'Сім до полудня',
    titlePtBr:'Sete antes do meio-dia', titleVi:'Bảy câu trước trưa', titleId:'Tujuh sebelum tengah hari', titleTr:'Öğleden önce yedi', titlePl:'Siedem przed południem',
    descRU:'Собери 7 фраз в уроке до 12:00.',
    descPtBr:'Monte 7 frases em uma lição antes das 12:00.',
    descVi:'Ghép 7 câu trong một bài học trước 12:00.',
    descId:'Susun 7 frasa dalam pelajaran sebelum 12:00.',
    descTr:'12:00’den önce bir derste 7 ifadeyi kur.',
    descPl:'Ułóż 7 fraz w lekcji przed 12:00.',
    descUK:'Збери 7 фраз в уроці до 12:00.' },

  // Дополнительные evening_session
  { id:'evs2', type:'evening_session', icon:'🌆', target:3, xp:24,
    titleRU:'Вечерние три', titleUK:'Вечірні три',
    titlePtBr:'Três à noite', titleVi:'Ba câu buổi tối', titleId:'Tiga malam', titleTr:'Akşam üçlüsü', titlePl:'Wieczorne trzy',
    descRU:'Собери 3 фразы в уроке после 18:00 — вечерний ритуал.',
    descPtBr:'Monte 3 frases em uma lição depois das 18:00: ritual noturno.',
    descVi:'Ghép 3 câu trong một bài học sau 18:00: nghi thức buổi tối.',
    descId:'Susun 3 frasa dalam pelajaran setelah 18:00: ritual malam.',
    descTr:'18:00’den sonra bir derste 3 ifadeyi kur: akşam rutini.',
    descPl:'Ułóż 3 frazy w lekcji po 18:00: wieczorny rytuał.',
    descUK:'Збери 3 фрази в уроці після 18:00 — вечірній ритуал.' },
  { id:'evs3', type:'evening_session', icon:'🌠', target:10, xp:66,
    titleRU:'Вечерний марафон', titleUK:'Вечірній марафон',
    titlePtBr:'Maratona noturna', titleVi:'Cuộc đua buổi tối', titleId:'Maraton malam', titleTr:'Akşam maratonu', titlePl:'Wieczorny maraton',
    descRU:'Собери 10 фраз в уроке после 18:00 — мощная вечерняя сессия.',
    descPtBr:'Monte 10 frases em uma lição depois das 18:00: uma sessão noturna forte.',
    descVi:'Ghép 10 câu trong một bài học sau 18:00: một phiên học buổi tối mạnh mẽ.',
    descId:'Susun 10 frasa dalam pelajaran setelah 18:00: sesi malam yang kuat.',
    descTr:'18:00’den sonra bir derste 10 ifadeyi kur: güçlü bir akşam oturumu.',
    descPl:'Ułóż 10 fraz w lekcji po 18:00: mocna wieczorna sesja.',
    descUK:'Збери 10 фраз в уроці після 18:00 — потужна вечірня сесія.' },
  { id:'evs4', type:'evening_session', icon:'🌙', target:7, xp:48,
    titleRU:'Семь вечером', titleUK:'Сім ввечері',
    titlePtBr:'Sete à noite', titleVi:'Bảy câu buổi tối', titleId:'Tujuh malam', titleTr:'Akşam yedisi', titlePl:'Siedem wieczorem',
    descRU:'Собери 7 фраз в уроке после 18:00.',
    descPtBr:'Monte 7 frases em uma lição depois das 18:00.',
    descVi:'Ghép 7 câu trong một bài học sau 18:00.',
    descId:'Susun 7 frasa dalam pelajaran setelah 18:00.',
    descTr:'18:00’den sonra bir derste 7 ifadeyi kur.',
    descPl:'Ułóż 7 fraz w lekcji po 18:00.',
    descUK:'Збери 7 фраз в уроці після 18:00.' },

  // Дополнительные daily_phrase
  { id:'dpr2', type:'daily_phrase_read', icon:'📰', target:1, xp:12,
    titleRU:'Слово дня', titleUK:'Слово дня',
    titlePtBr:'Palavra do dia', titleVi:'Từ trong ngày', titleId:'Kata hari ini', titleTr:'Günün kelimesi', titlePl:'Słowo dnia',
    descRU:'Нажми на фразу дня на главном экране и прочитай её.',
    descPtBr:'Toque na frase do dia na tela inicial e leia-a.',
    descVi:'Nhấn vào câu trong ngày trên màn hình chính và đọc câu đó.',
    descId:'Ketuk frasa hari ini di layar utama dan bacalah.',
    descTr:'Ana ekranda günün ifadesine dokun ve onu oku.',
    descPl:'Stuknij frazę dnia na ekranie głównym i ją przeczytaj.',
    descUK:'Натисни на фразу дня на головному екрані і прочитай її.' },
  { id:'dpr3', type:'daily_phrase_read', icon:'💬', target:1, xp:12,
    titleRU:'Свежая фраза', titleUK:'Свіжа фраза',
    titlePtBr:'Frase nova', titleVi:'Câu mới', titleId:'Frasa segar', titleTr:'Yeni ifade', titlePl:'Świeża fraza',
    descRU:'На главном экране найди и прочитай фразу дня.',
    descPtBr:'Na tela inicial, encontre e leia a frase do dia.',
    descVi:'Trên màn hình chính, tìm và đọc câu trong ngày.',
    descId:'Di layar utama, temukan dan baca frasa hari ini.',
    descTr:'Ana ekranda günün ifadesini bul ve oku.',
    descPl:'Na ekranie głównym znajdź i przeczytaj frazę dnia.',
    descUK:'На головному екрані знайди і прочитай фразу дня.' },
  { id:'dps2', type:'daily_phrase_save', icon:'⭐', target:1, xp:18,
    titleRU:'Сохрани в память', titleUK:'Збережи в пам\'ять',
    titlePtBr:'Salve na memória', titleVi:'Lưu vào trí nhớ', titleId:'Simpan ke ingatan', titleTr:'Hafızaya kaydet', titlePl:'Zapisz w pamięci',
    descRU:'Открой фразу дня и нажми Save чтобы добавить в карточки.',
    descPtBr:'Abra a frase do dia e toque em Save para adicioná-la aos Cartões.',
    descVi:'Mở câu trong ngày và nhấn Save để thêm vào Thẻ ghi nhớ.',
    descId:'Buka frasa hari ini dan ketuk Save untuk menambahkannya ke Kartu.',
    descTr:'Günün ifadesini aç ve Kartlara eklemek için Save düğmesine dokun.',
    descPl:'Otwórz frazę dnia i stuknij Save, aby dodać ją do Fiszek.',
    descUK:'Відкрий фразу дня і натисни Save щоб додати в картки.' },
  { id:'dps3', type:'daily_phrase_save', icon:'📌', target:1, xp:18,
    titleRU:'Пометить фразу', titleUK:'Позначити фразу',
    titlePtBr:'Marcar frase', titleVi:'Đánh dấu câu', titleId:'Tandai frasa', titleTr:'İfadeyi işaretle', titlePl:'Oznacz frazę',
    descRU:'Сохрани фразу дня в Карточки — нажми Save на главном экране.',
    descPtBr:'Salve a frase do dia em Cartões: toque em Save na tela inicial.',
    descVi:'Lưu câu trong ngày vào Thẻ ghi nhớ: nhấn Save trên màn hình chính.',
    descId:'Simpan frasa hari ini ke Kartu: ketuk Save di layar utama.',
    descTr:'Günün ifadesini Kartlara kaydet: ana ekranda Save düğmesine dokun.',
    descPl:'Zapisz frazę dnia do Fiszek: stuknij Save na ekranie głównym.',
    descUK:'Збережи фразу дня в Картки — натисни Save на головному екрані.' },

  // Дополнительный diagnostic_complete
  { id:'dc2', type:'diagnostic_complete', icon:'🩺', target:1, xp:96,
    titleRU:'Повторная диагностика', titleUK:'Повторна діагностика',
    titlePtBr:'Novo diagnóstico', titleVi:'Chẩn đoán lại', titleId:'Diagnostik ulang', titleTr:'Tekrar tanılama', titlePl:'Ponowna diagnoza',
    descRU:'Снова пройди диагностический тест — проверь свой прогресс.',
    descPtBr:'Faça o teste diagnóstico novamente e verifique seu progresso.',
    descVi:'Làm lại bài kiểm tra chẩn đoán để kiểm tra tiến độ của bạn.',
    descId:'Ikuti tes diagnostik lagi dan periksa progresmu.',
    descTr:'Tanılama testini tekrar tamamla ve ilerlemeni kontrol et.',
    descPl:'Wykonaj ponownie test diagnostyczny i sprawdź swoje postępy.',
    descUK:'Знову пройди діагностичний тест — перевір свій прогрес.' },

  // Дополнительные варианты для разнообразия
  { id:'ta12', type:'total_answers', icon:'💪', target:25, xp:42,
    titleRU:'Двадцать пять', titleUK:'Двадцять п\'ять',
    titlePtBr:'Vinte e cinco', titleVi:'Hai mươi lăm', titleId:'Dua puluh lima', titleTr:'Yirmi beş', titlePl:'Dwadzieścia pięć',
    descRU:'Собери 25 фраз в уроках за день.',
    descPtBr:'Monte 25 frases nas lições durante o dia.',
    descVi:'Ghép 25 câu trong các bài học trong ngày.',
    descId:'Susun 25 frasa di pelajaran dalam sehari.',
    descTr:'Gün içinde derslerde 25 ifadeyi kur.',
    descPl:'Ułóż 25 fraz w lekcjach w ciągu dnia.',
    descUK:'Збери 25 фраз у уроках за день.' },
  { id:'cs8', type:'correct_streak', icon:'🌪️', target:30, xp:120,
    titleRU:'Тридцать в потоке', titleUK:'Тридцять у потоці',
    titlePtBr:'Trinta no fluxo', titleVi:'Ba mươi trong dòng tập trung', titleId:'Tiga puluh dalam alur', titleTr:'Akışta otuz', titlePl:'Trzydzieści w skupieniu',
    descRU:'Собери 30 фраз подряд — ты в абсолютном потоке.',
    descPtBr:'Monte 30 frases seguidas: você está em foco total.',
    descVi:'Ghép 30 câu liên tiếp: bạn đang hoàn toàn nhập tâm.',
    descId:'Susun 30 frasa beruntun: kamu berada dalam fokus penuh.',
    descTr:'Arka arkaya 30 ifadeyi kur: tamamen akıştasın.',
    descPl:'Ułóż 30 fraz z rzędu: jesteś w pełnym skupieniu.',
    descUK:'Збери 30 фраз поспіль — ти в абсолютному потоці.' },
  { id:'lc5', type:'lesson_complete', icon:'✅', target:1, xp:60,
    titleRU:'До конца', titleUK:'До кінця',
    titlePtBr:'Até o fim', titleVi:'Đến cuối', titleId:'Sampai selesai', titleTr:'Sonuna kadar', titlePl:'Do końca',
    descRU:'Пройди урок полностью — не останавливайся на полпути.',
    descPtBr:'Conclua a lição inteira: não pare no meio do caminho.',
    descVi:'Hoàn thành toàn bộ bài học: đừng dừng lại giữa chừng.',
    descId:'Selesaikan pelajaran sepenuhnya: jangan berhenti di tengah jalan.',
    descTr:'Dersi tamamen bitir: yarı yolda durma.',
    descPl:'Ukończ lekcję w całości: nie zatrzymuj się w połowie.',
    descUK:'Пройди урок повністю — не зупиняйся на півдорозі.' },
  { id:'fv7', type:'flashcard_view', icon:'🃏', target:25, xp:84,
    titleRU:'Коллекция карточек', titleUK:'Колекція карток',
    titlePtBr:'Coleção de cartões', titleVi:'Bộ sưu tập thẻ', titleId:'Koleksi kartu', titleTr:'Kart koleksiyonu', titlePl:'Kolekcja fiszek',
    descRU:'Открой раздел Карточки и пролистай 25 карточек.',
    descPtBr:'Abra a seção Cartões e passe por 25 cartões.',
    descVi:'Mở phần Thẻ ghi nhớ và lướt qua 25 thẻ.',
    descId:'Buka bagian Kartu dan lihat 25 kartu.',
    descTr:'Kartlar bölümünü aç ve 25 karta göz at.',
    descPl:'Otwórz sekcję Fiszki i przejrzyj 25 fiszek.',
    descUK:'Відкрий розділ Картки і перегортай 25 карток.' },
  { id:'ra6', type:'recall_answers', icon:'🧠', target:6, xp:48,
    titleRU:'Шесть на повторе', titleUK:'Шість на повторенні',
    titlePtBr:'Seis na revisão', titleVi:'Sáu câu ôn lại', titleId:'Enam dalam pengulangan', titleTr:'Tekrarda altı', titlePl:'Sześć w powtórce',
    descRU:'Правильно ответь на 6 карточек в разделе Повторение сегодня.',
    descPtBr:'Responda corretamente a 6 cartões na seção Revisão hoje.',
    descVi:'Trả lời đúng 6 thẻ trong phần Ôn tập hôm nay.',
    descId:'Jawab 6 kartu dengan benar di bagian Pengulangan hari ini.',
    descTr:'Bugün Tekrar bölümünde 6 karta doğru cevap ver.',
    descPl:'Odpowiedz dziś poprawnie na 6 fiszek w sekcji Powtórka.',
    descUK:'Відповідай правильно на 6 карток у розділі Повторення сьогодні.' },
  { id:'ms5', type:'morning_session', icon:'🌞', target:5, xp:36,
    titleRU:'Пять утром', titleUK:'П\'ять вранці',
    titlePtBr:'Cinco pela manhã', titleVi:'Năm câu buổi sáng', titleId:'Lima pagi', titleTr:'Sabah beşi', titlePl:'Pięć rano',
    descRU:'Собери 5 фраз в уроке до 12:00 — яркое начало дня.',
    descPtBr:'Monte 5 frases em uma lição antes das 12:00: um começo de dia vivo.',
    descVi:'Ghép 5 câu trong một bài học trước 12:00: khởi đầu ngày mới thật sáng.',
    descId:'Susun 5 frasa dalam pelajaran sebelum 12:00: awal hari yang cerah.',
    descTr:'12:00’den önce bir derste 5 ifadeyi kur: güne parlak bir başlangıç.',
    descPl:'Ułóż 5 fraz w lekcji przed 12:00: jasny początek dnia.',
    descUK:'Збери 5 фраз в уроці до 12:00 — яскравий початок дня.' },
  { id:'evs5', type:'evening_session', icon:'🌃', target:5, xp:36,
    titleRU:'Пять вечером', titleUK:'П\'ять ввечері',
    titlePtBr:'Cinco à noite', titleVi:'Năm câu buổi tối', titleId:'Lima malam', titleTr:'Akşam beşi', titlePl:'Pięć wieczorem',
    descRU:'Собери 5 фраз в уроке после 18:00 — вечерний режим.',
    descPtBr:'Monte 5 frases em uma lição depois das 18:00: modo noturno.',
    descVi:'Ghép 5 câu trong một bài học sau 18:00: chế độ buổi tối.',
    descId:'Susun 5 frasa dalam pelajaran setelah 18:00: mode malam.',
    descTr:'18:00’den sonra bir derste 5 ifadeyi kur: akşam modu.',
    descPl:'Ułóż 5 fraz w lekcji po 18:00: tryb wieczorny.',
    descUK:'Збери 5 фраз в уроці після 18:00 — вечірній режим.' },
  { id:'wl7', type:'words_learned', icon:'📕', target:4, xp:42,
    titleRU:'Четыре слова', titleUK:'Чотири слова',
    titlePtBr:'Quatro palavras', titleVi:'Bốn từ', titleId:'Empat kata', titleTr:'Dört kelime', titlePl:'Cztery słowa',
    descRU:'Выучи 4 слова в разделе Слова любого урока.',
    descPtBr:'Aprenda 4 palavras na seção Palavras de qualquer lição.',
    descVi:'Học 4 từ trong phần Từ của bất kỳ bài học nào.',
    descId:'Pelajari 4 kata di bagian Kata dari pelajaran apa pun.',
    descTr:'Herhangi bir dersin Kelimeler bölümünde 4 kelime öğren.',
    descPl:'Naucz się 4 słów w sekcji Słowa dowolnej lekcji.',
    descUK:'Вивчи 4 слова в розділі Слова будь-якого уроку.' },
  { id:'dl4', type:'different_lessons', icon:'📂', target:2, xp:48,
    titleRU:'Два урока сегодня', titleUK:'Два уроки сьогодні',
    titlePtBr:'Duas lições hoje', titleVi:'Hai bài hôm nay', titleId:'Dua pelajaran hari ini', titleTr:'Bugün iki ders', titlePl:'Dwie lekcje dzisiaj',
    descRU:'Открой 2 разных урока и собери хотя бы по одной фразе в каждом.',
    descPtBr:'Abra 2 lições diferentes e monte pelo menos uma frase em cada uma.',
    descVi:'Mở 2 bài học khác nhau và ghép ít nhất một câu trong mỗi bài.',
    descId:'Buka 2 pelajaran berbeda dan susun setidaknya satu frasa di masing-masing.',
    descTr:'2 farklı dersi aç ve her birinde en az bir ifadeyi kur.',
    descPl:'Otwórz 2 różne lekcje i ułóż co najmniej jedną frazę w każdej.',
    descUK:'Відкрий 2 різні уроки й збери хоча б по одній фразі в кожному.' },
  { id:'qe7', type:'quiz_easy', icon:'🍀', target:8, xp:24,
    titleRU:'Восемь лёгких', titleUK:'Вісім легких',
    titlePtBr:'Oito fáceis', titleVi:'Tám câu dễ', titleId:'Delapan mudah', titleTr:'Sekiz kolay', titlePl:'Osiem łatwych',
    descRU:'Ответь правильно на 8 вопросов в Вызовах на уровне Легко.',
    descPtBr:'Responda corretamente a 8 perguntas em Quizzes no nível Fácil.',
    descVi:'Trả lời đúng 8 câu hỏi trong Quiz ở mức Dễ.',
    descId:'Jawab 8 pertanyaan dengan benar di Kuis pada level Mudah.',
    descTr:'Quizlerde Kolay seviyede 8 soruyu doğru yanıtla.',
    descPl:'Odpowiedz poprawnie na 8 pytań w Quizach na poziomie Łatwe.',
    descUK:'Дай правильну відповідь на 8 запитань у Квізах на рівні Легко.' },
  { id:'vl7', type:'verb_learned', icon:'📋', target:5, xp:66,
    titleRU:'Пять глаголов', titleUK:'П\'ять дієслів',
    titlePtBr:'Cinco verbos', titleVi:'Năm động từ', titleId:'Lima kata kerja', titleTr:'Beş fiil', titlePl:'Pięć czasowników',
    descRU:'Выучи 5 неправильных глаголов в разделе Глаголы.',
    descPtBr:'Aprenda 5 verbos irregulares na seção Verbos.',
    descVi:'Học 5 động từ bất quy tắc trong phần Động từ.',
    descId:'Pelajari 5 kata kerja tidak beraturan di bagian Kata Kerja.',
    descTr:'Fiiller bölümünde 5 düzensiz fiil öğren.',
    descPl:'Naucz się 5 czasowników nieregularnych w sekcji Czasowniki.',
    descUK:'Вивчи 5 неправильних дієслів в розділі Дієслова.' },
  { id:'rp3', type:'recall_perfect', icon:'🏅', target:1, xp:72,
    titleRU:'Чистое повторение', titleUK:'Чисте повторення',
    titlePtBr:'Revisão limpa', titleVi:'Ôn tập sạch lỗi', titleId:'Pengulangan bersih', titleTr:'Temiz tekrar', titlePl:'Czysta powtórka',
    descRU:'Пройди сессию Повторения без единой ошибки (нужно минимум 5 карточек).',
    descPtBr:'Conclua uma sessão de Revisão sem nenhum erro; são necessários pelo menos 5 cartões.',
    descVi:'Hoàn thành một phiên Ôn tập mà không mắc lỗi nào; cần ít nhất 5 thẻ.',
    descId:'Selesaikan sesi Pengulangan tanpa satu pun kesalahan; perlu minimal 5 kartu.',
    descTr:'Bir Tekrar oturumunu tek hata yapmadan tamamla; en az 5 kart gerekir.',
    descPl:'Ukończ sesję Powtórki bez ani jednego błędu; potrzeba co najmniej 5 fiszek.',
    descUK:'Пройди сесію Повторення без жодної помилки (потрібно мінімум 5 карток).' },

  // Новый Тренер ошибок: отдельные задания для words / phrases / arena.
  { id:'tw1', type:'trainer_words', icon:'📚', target:3, xp:30,
    titleRU:'Разобрать слова', titleUK:'Розібрати слова',
    titlePtBr:'Revisar palavras', titleVi:'Rà soát từ', titleId:'Bedah kata', titleTr:'Kelimeleri çözümle', titlePl:'Przejrzyj słowa',
    descRU:'Открой Мою практику → «Слова». Ответь верно на 3 карточки — закроешь слабые места.',
    descPtBr:'Abra Minha prática → "Palavras". Acerte 3 cartões — feche os pontos fracos.',
    descVi:'Mở Luyện tập của tôi → "Từ vựng". Trả lời đúng 3 thẻ — xóa điểm yếu.',
    descId:'Buka Latihanku → "Kata". Jawab 3 kartu dengan benar — tutup titik lemah.',
    descTr:'Pratiğim → "Kelimeler" bölümünü aç. 3 kartı doğru yanıtla — zayıf noktaları kapat.',
    descPl:'Otwórz Moja praktyka → „Słowa”. Odpowiedz poprawnie na 3 fiszki — domkniesz słabe punkty.',
    descUK:'Відкрий Мою практику → «Слова». Відповідай правильно на 3 картки — закриєш слабкі місця.' },
  { id:'tw2', type:'trainer_words', icon:'🧠', target:5, xp:48,
    titleRU:'Слова под контроль', titleUK:'Слова під контроль',
    titlePtBr:'Palavras sob controle', titleVi:'Kiểm soát từ vựng', titleId:'Kata terkendali', titleTr:'Kelimeler kontrol altında', titlePl:'Słowa pod kontrolą',
    descRU:'Открой Мою практику → «Слова». Ответь верно на 5 карточек.',
    descPtBr:'Abra Minha prática → "Palavras". Acerte 5 cartões.',
    descVi:'Mở Luyện tập của tôi → "Từ vựng". Trả lời đúng 5 thẻ.',
    descId:'Buka Latihanku → "Kata". Jawab 5 kartu dengan benar.',
    descTr:'Pratiğim → "Kelimeler" bölümünü aç. 5 kartı doğru yanıtla.',
    descPl:'Otwórz Moja praktyka → „Słowa”. Odpowiedz poprawnie na 5 fiszek.',
    descUK:'Відкрий Мою практику → «Слова». Відповідай правильно на 5 карток.' },
  { id:'tp1', type:'trainer_phrases', icon:'💬', target:3, xp:36,
    titleRU:'Починить фразы', titleUK:'Полагодити фрази',
    titlePtBr:'Consertar frases', titleVi:'Sửa câu', titleId:'Perbaiki frasa', titleTr:'İfadeleri düzelt', titlePl:'Napraw frazy',
    descRU:'Открой Мою практику → «Фразы». Собери верно 3 фразы, где ты ошибался.',
    descPtBr:'Abra Minha prática → "Frases". Monte 3 frases em que você errou.',
    descVi:'Mở Luyện tập của tôi → "Cụm từ". Ghép đúng 3 câu bạn từng sai.',
    descId:'Buka Latihanku → "Frasa". Susun dengan benar 3 frasa yang pernah salah.',
    descTr:'Pratiğim → "İfadeler" bölümünü aç. Hata yaptığın 3 ifadeyi doğru kur.',
    descPl:'Otwórz Moja praktyka → „Frazy”. Ułóż poprawnie 3 frazy, w których były błędy.',
    descUK:'Відкрий Мою практику → «Фрази». Склади правильно 3 фрази, де ти помилявся.' },
  { id:'tp2', type:'trainer_phrases', icon:'🧩', target:5, xp:60,
    titleRU:'Фразы без провалов', titleUK:'Фрази без провалів',
    titlePtBr:'Frases sem falhas', titleVi:'Câu không vấp', titleId:'Frasa tanpa gagal', titleTr:'Hatasız ifadeler', titlePl:'Frazy bez potknięć',
    descRU:'Открой Мою практику → «Фразы». Ответь верно на 5 карточек.',
    descPtBr:'Abra Minha prática → "Frases". Acerte 5 cartões.',
    descVi:'Mở Luyện tập của tôi → "Cụm từ". Trả lời đúng 5 thẻ.',
    descId:'Buka Latihanku → "Frasa". Jawab 5 kartu dengan benar.',
    descTr:'Pratiğim → "İfadeler" bölümünü aç. 5 kartı doğru yanıtla.',
    descPl:'Otwórz Moja praktyka → „Frazy”. Odpowiedz poprawnie na 5 fiszek.',
    descUK:'Відкрий Мою практику → «Фрази». Відповідай правильно на 5 карток.' },
  { id:'tar1', type:'trainer_arena', icon:'🛡️', target:2, xp:42,
    titleRU:'Разбор ошибок', titleUK:'Розбір помилок',
    titlePtBr:'Revisão de erros', titleVi:'Phân tích lỗi', titleId:'Ulas kesalahan', titleTr:'Hata analizi', titlePl:'Analiza błędów',
    descRU:'Нажми сюда — откроется разбор твоих ошибок. Ответь верно на 2 вопроса.',
    descPtBr:'Toque aqui para abrir a revisão dos seus erros. Acerte 2 perguntas.',
    descVi:'Chạm vào đây để mở phần luyện lại lỗi sai. Trả lời đúng 2 câu hỏi.',
    descId:'Ketuk di sini untuk membuka ulasan kesalahanmu. Jawab 2 pertanyaan dengan benar.',
    descTr:'Buraya dokun — hata analizin açılsın. 2 soruyu doğru yanıtla.',
    descPl:'Stuknij tutaj — otworzy się przegląd twoich błędów. Odpowiedz poprawnie na 2 pytania.',
    descUK:'Натисни сюди — відкриється розбір твоїх помилок. Відповідай правильно на 2 питання.' },
  { id:'tar2', type:'trainer_arena', icon:'⚔️', target:4, xp:72,
    titleRU:'Без старых ошибок', titleUK:'Без старих помилок',
    titlePtBr:'Sem erros antigos', titleVi:'Không lỗi cũ', titleId:'Tanpa kesalahan lama', titleTr:'Eski hatalar yok', titlePl:'Bez starych błędów',
    descRU:'Нажми сюда — откроется разбор твоих ошибок. Ответь верно на 4 вопроса.',
    descPtBr:'Toque aqui para abrir a revisão dos seus erros. Acerte 4 perguntas.',
    descVi:'Chạm vào đây để mở phần luyện lại lỗi sai. Trả lời đúng 4 câu hỏi.',
    descId:'Ketuk di sini untuk membuka ulasan kesalahanmu. Jawab 4 pertanyaan dengan benar.',
    descTr:'Buraya dokun — hata analizin açılsın. 4 soruyu doğru yanıtla.',
    descPl:'Stuknij tutaj — otworzy się przegląd twoich błędów. Odpowiedz poprawnie na 4 pytania.',
    descUK:'Натисни сюди — відкриється розбір твоїх помилок. Відповідай правильно на 4 питання.' },

  // energy_spend — потратить N единиц энергии (только Free-аккаунт, Premium — безлимит)
  { id:'es1', type:'energy_spend', icon:'⚡', target:3, xp:30, freeOnly:true,
    titleRU:'Трата энергии', titleUK:'Витрата енергії',
    titlePtBr:'Gasto de energia', titleVi:'Tiêu hao năng lượng', titleId:'Pemakaian energi', titleTr:'Enerji harcama', titlePl:'Zużycie energii',
    descRU:'Потрать 3 единицы энергии в уроках или Арене.',
    descPtBr:'Gaste 3 unidades de energia: erre nas lições ou jogue nas Arenas.',
    descVi:'Tiêu 3 đơn vị năng lượng: mắc lỗi trong bài học hoặc chơi Arena.',
    descId:'Habiskan 3 unit energi: buat kesalahan di pelajaran atau mainkan Arena.',
    descTr:'3 enerji birimi harca: derslerde hata yap veya Arenalarda oyna.',
    descPl:'Zużyj 3 jednostki energii: popełniaj błędy w lekcjach albo graj na Arenach.',
    descUK:'Витрать 3 одиниці енергії — роби помилки на уроках або грай у дуелі.' },
  { id:'es2', type:'energy_spend', icon:'⚡', target:5, xp:48, freeOnly:true,
    titleRU:'Полная отдача', titleUK:'Повна віддача',
    titlePtBr:'Entrega total', titleVi:'Dốc toàn lực', titleId:'Usaha penuh', titleTr:'Tam verim', titlePl:'Pełne zaangażowanie',
    descRU:'Потрать 5 единиц энергии — учись интенсивно.',
    descPtBr:'Gaste 5 unidades de energia: erre nas lições ou jogue nas Arenas.',
    descVi:'Tiêu 5 đơn vị năng lượng: mắc lỗi trong bài học hoặc chơi Arena.',
    descId:'Habiskan 5 unit energi: buat kesalahan di pelajaran atau mainkan Arena.',
    descTr:'5 enerji birimi harca: derslerde hata yap veya Arenalarda oyna.',
    descPl:'Zużyj 5 jednostek energii: popełniaj błędy w lekcjach albo graj na Arenach.',
    descUK:'Витрать 5 одиниць енергії — роби помилки на уроках або грай у дуелі.' },
  { id:'es3', type:'energy_spend', icon:'⚡', target:2, xp:22, freeOnly:true,
    titleRU:'Первые потери', titleUK:'Перші втрати',
    titlePtBr:'Primeiras perdas', titleVi:'Mất mát đầu tiên', titleId:'Kehilangan pertama', titleTr:'İlk kayıplar', titlePl:'Pierwsze straty',
    descRU:'Потрать 2 единицы энергии в уроках.',
    descPtBr:'Gaste 2 unidades de energia: erre nas lições e aprenda com os erros.',
    descVi:'Tiêu 2 đơn vị năng lượng: mắc lỗi trong bài học và học từ lỗi đó.',
    descId:'Habiskan 2 unit energi: buat kesalahan di pelajaran dan belajar dari kesalahan itu.',
    descTr:'2 enerji birimi harca: derslerde hata yap ve hatalardan öğren.',
    descPl:'Zużyj 2 jednostki energii: myl się w lekcjach i ucz się na błędach.',
    descUK:'Витрать 2 одиниці енергії — помиляйся на уроках і вчись на помилках.' },
  { id:'es4', type:'energy_spend', icon:'⚡', target:7, xp:66, freeOnly:true,
    titleRU:'Тяжёлый день', titleUK:'Важкий день',
    titlePtBr:'Dia pesado', titleVi:'Ngày nặng', titleId:'Hari berat', titleTr:'Zor gün', titlePl:'Ciężki dzień',
    descRU:'Потрать 7 единиц энергии за день — максимальная интенсивность.',
    descPtBr:'Gaste 7 unidades de energia no dia: treinos intensos nas lições.',
    descVi:'Tiêu 7 đơn vị năng lượng trong ngày: luyện tập cường độ cao trong bài học.',
    descId:'Habiskan 7 unit energi dalam sehari: latihan intensif di pelajaran.',
    descTr:'Gün içinde 7 enerji birimi harca: derslerde yoğun çalışma.',
    descPl:'Zużyj 7 jednostek energii w ciągu dnia: intensywne treningi w lekcjach.',
    descUK:'Витрать 7 одиниць енергії за день — інтенсивні тренування на уроках.' },

  // arena_play — N рейтинг-матчей в день против другого игрока (см. arena_results: не bot_)
  { id:'dp1', type:'arena_play', icon:'⚔️', target:1, xp:24,
    titleRU:'Первая арена', titleUK:'Перша арена',
    titlePtBr:'Primeira Arena', titleVi:'Arena đầu tiên', titleId:'Arena pertama', titleTr:'İlk arena', titlePl:'Pierwsza arena',
    descRU:'Сыграй 1 рейтинговый матч в Арене против другого игрока.',
    descPtBr:'Jogue 1 partida ranqueada na Arena contra outro jogador.',
    descVi:'Chơi 1 trận xếp hạng trong Arena với người chơi khác.',
    descId:'Mainkan 1 pertandingan berperingkat di Arena melawan pemain lain.',
    descTr:'Arenada başka bir oyuncuya karşı 1 dereceli maç oyna.',
    descPl:'Zagraj 1 mecz rankingowy na Arenie przeciwko innemu graczowi.',
    descUK:'Зіграй 1 рейтинговий матч в Арені проти іншого гравця.' },
  { id:'dp2', type:'arena_play', icon:'⚔️', target:3, xp:54,
    titleRU:'Боец', titleUK:'Боєць',
    titlePtBr:'Lutador', titleVi:'Chiến binh', titleId:'Petarung', titleTr:'Savaşçı', titlePl:'Wojownik',
    descRU:'Сыграй 3 рейтинговых матча в Арене за день против других игроков.',
    descPtBr:'Jogue 3 partidas ranqueadas na Arena durante o dia contra outros jogadores.',
    descVi:'Chơi 3 trận xếp hạng trong Arena trong ngày với người chơi khác.',
    descId:'Mainkan 3 pertandingan berperingkat di Arena dalam sehari melawan pemain lain.',
    descTr:'Gün içinde Arenada başka oyunculara karşı 3 dereceli maç oyna.',
    descPl:'Zagraj w ciągu dnia 3 mecze rankingowe na Arenie przeciwko innym graczom.',
    descUK:'Зіграй 3 рейтингові матчі в Арені за день проти інших гравців.' },
  { id:'dp3', type:'arena_play', icon:'⚔️', target:5, xp:84,
    titleRU:'Боец арены', titleUK:'Боєць арени',
    titlePtBr:'Lutador da Arena', titleVi:'Chiến binh Arena', titleId:'Petarung Arena', titleTr:'Arena savaşçısı', titlePl:'Wojownik areny',
    descRU:'Сыграй 5 рейтинговых матчей в Арене за день против других игроков.',
    descPtBr:'Jogue 5 partidas ranqueadas na Arena durante o dia contra outros jogadores.',
    descVi:'Chơi 5 trận xếp hạng trong Arena trong ngày với người chơi khác.',
    descId:'Mainkan 5 pertandingan berperingkat di Arena dalam sehari melawan pemain lain.',
    descTr:'Gün içinde Arenada başka oyunculara karşı 5 dereceli maç oyna.',
    descPl:'Zagraj w ciągu dnia 5 meczów rankingowych na Arenie przeciwko innym graczom.',
    descUK:'Зіграй 5 рейтингових матчів в Арені за день проти інших гравців.' },
  { id:'dp4', type:'arena_play', icon:'⚔️', target:2, xp:42,
    titleRU:'Два поединка', titleUK:'Два поєдинки',
    titlePtBr:'Dois duelos', titleVi:'Hai trận đấu', titleId:'Dua duel', titleTr:'İki düello', titlePl:'Dwa pojedynki',
    descRU:'Сыграй 2 матча в Арене за день против других игроков.',
    descPtBr:'Jogue 2 partidas na Arena durante o dia contra outros jogadores.',
    descVi:'Chơi 2 trận trong Arena trong ngày với người chơi khác.',
    descId:'Mainkan 2 pertandingan di Arena dalam sehari melawan pemain lain.',
    descTr:'Gün içinde Arenada başka oyunculara karşı 2 maç oyna.',
    descPl:'Zagraj w ciągu dnia 2 mecze na Arenie przeciwko innym graczom.',
    descUK:'Зіграй 2 матчі в Арені за день проти інших гравців.' },
  { id:'dp2w1', type:'arena_plays_wins_combo', icon:'🎯', target:2, xp:62,
    arenaCombo: { minPlays: 2, minWins: 1 },
    titleRU:'Два матча и победа', titleUK:'Два матчі й перемога',
    titlePtBr:'Dois jogos e uma vitória', titleVi:'Hai trận, một chiến thắng', titleId:'Dua pertandingan dan satu kemenangan', titleTr:'İki maç ve bir zafer', titlePl:'Dwa mecze i zwycięstwo',
    descRU:'Сыграй 2 матча в Арене против других игроков и выиграй хотя бы в одном.',
    descPtBr:'Jogue 2 partidas na Arena contra outros jogadores e vença pelo menos uma.',
    descVi:'Chơi 2 trận trong Arena với người chơi khác và thắng ít nhất một trận.',
    descId:'Mainkan 2 pertandingan di Arena melawan pemain lain dan menangkan setidaknya satu.',
    descTr:'Arenada başka oyunculara karşı 2 maç oyna ve en az birini kazan.',
    descPl:'Zagraj 2 mecze na Arenie przeciwko innym graczom i wygraj co najmniej jeden.',
    descUK:'Зіграй 2 матчі в Арені проти інших гравців і виграй хоча б в одному.' },
  { id:'dp3w2', type:'arena_plays_wins_combo', icon:'🎖️', target:3, xp:82,
    arenaCombo: { minPlays: 3, minWins: 2 },
    titleRU:'Три матча, две победы', titleUK:'Три матчі, дві перемоги',
    titlePtBr:'Três jogos, duas vitórias', titleVi:'Ba trận, hai chiến thắng', titleId:'Tiga pertandingan, dua kemenangan', titleTr:'Üç maç, iki zafer', titlePl:'Trzy mecze, dwa zwycięstwa',
    descRU:'Сыграй 3 матча в Арене против других игроков и выиграй как минимум в двух.',
    descPtBr:'Jogue 3 partidas na Arena contra outros jogadores e vença pelo menos duas.',
    descVi:'Chơi 3 trận trong Arena với người chơi khác và thắng ít nhất hai trận.',
    descId:'Mainkan 3 pertandingan di Arena melawan pemain lain dan menangkan setidaknya dua.',
    descTr:'Arenada başka oyunculara karşı 3 maç oyna ve en az ikisini kazan.',
    descPl:'Zagraj 3 mecze na Arenie przeciwko innym graczom i wygraj co najmniej dwa.',
    descUK:'Зіграй 3 матчі в Арені проти інших гравців і виграй щонайменше в двох.' },
  { id:'dp5', type:'arena_play', icon:'⚔️', target:4, xp:70,
    titleRU:'Четыре боя', titleUK:'Чотири бої',
    titlePtBr:'Quatro batalhas', titleVi:'Bốn trận chiến', titleId:'Empat pertarungan', titleTr:'Dört savaş', titlePl:'Cztery walki',
    descRU:'Сыграй 4 матча в Арене за день против других игроков.',
    descPtBr:'Jogue 4 partidas na Arena durante o dia contra outros jogadores.',
    descVi:'Chơi 4 trận trong Arena trong ngày với người chơi khác.',
    descId:'Mainkan 4 pertandingan di Arena dalam sehari melawan pemain lain.',
    descTr:'Gün içinde Arenada başka oyunculara karşı 4 maç oyna.',
    descPl:'Zagraj w ciągu dnia 4 mecze na Arenie przeciwko innym graczom.',
    descUK:'Зіграй 4 матчі в Арені за день проти інших гравців.' },

  // arena_win — N побед в рейтинге за день
  { id:'dw1', type:'arena_win', icon:'🏅', target:1, xp:36,
    titleRU:'Победитель', titleUK:'Переможець',
    titlePtBr:'Vencedor', titleVi:'Người chiến thắng', titleId:'Pemenang', titleTr:'Kazanan', titlePl:'Zwycięzca',
    descRU:'Выиграй 1 матч в Арене против другого игрока — набери больше очков, чем соперник.',
    descPtBr:'Vença 1 partida na Arena contra outro jogador: marque mais pontos que o adversário.',
    descVi:'Thắng 1 trận trong Arena trước người chơi khác: ghi nhiều điểm hơn đối thủ.',
    descId:'Menangkan 1 pertandingan di Arena melawan pemain lain: raih skor lebih tinggi dari lawan.',
    descTr:'Arenada başka bir oyuncuya karşı 1 maç kazan: rakibinden daha fazla puan al.',
    descPl:'Wygraj 1 mecz na Arenie przeciwko innemu graczowi: zdobądź więcej punktów niż rywal.',
    descUK:'Виграй 1 матч в Арені проти іншого гравця — набери більше очок, ніж суперник.' },
  { id:'dw2', type:'arena_win', icon:'🥇', target:2, xp:66,
    titleRU:'Двойная победа', titleUK:'Подвійна перемога',
    titlePtBr:'Vitória dupla', titleVi:'Chiến thắng kép', titleId:'Kemenangan ganda', titleTr:'Çifte zafer', titlePl:'Podwójne zwycięstwo',
    descRU:'Выиграй 2 матча в Арене за день против других игроков.',
    descPtBr:'Vença 2 partidas na Arena durante o dia contra outros jogadores.',
    descVi:'Thắng 2 trận trong Arena trong ngày trước người chơi khác.',
    descId:'Menangkan 2 pertandingan di Arena dalam sehari melawan pemain lain.',
    descTr:'Gün içinde Arenada başka oyunculara karşı 2 maç kazan.',
    descPl:'Wygraj w ciągu dnia 2 mecze na Arenie przeciwko innym graczom.',
    descUK:'Виграй 2 матчі в Арені за день проти інших гравців.' },
  { id:'dw3', type:'arena_win', icon:'🏆', target:3, xp:96,
    titleRU:'Непобедимый', titleUK:'Непереможний',
    titlePtBr:'Invencível', titleVi:'Bất bại', titleId:'Tak terkalahkan', titleTr:'Yenilmez', titlePl:'Niepokonany',
    descRU:'Выиграй 3 матча в Арене за день против других игроков.',
    descPtBr:'Vença 3 partidas na Arena durante o dia contra outros jogadores.',
    descVi:'Thắng 3 trận trong Arena trong ngày trước người chơi khác.',
    descId:'Menangkan 3 pertandingan di Arena dalam sehari melawan pemain lain.',
    descTr:'Gün içinde Arenada başka oyunculara karşı 3 maç kazan.',
    descPl:'Wygraj w ciągu dnia 3 mecze na Arenie przeciwko innym graczom.',
    descUK:'Виграй 3 матчі в Арені за день проти інших гравців.' },
  { id:'dw4', type:'arena_win', icon:'⚡', target:4, xp:114,
    titleRU:'Четыре победы', titleUK:'Чотири перемоги',
    titlePtBr:'Quatro vitórias', titleVi:'Bốn chiến thắng', titleId:'Empat kemenangan', titleTr:'Dört zafer', titlePl:'Cztery zwycięstwa',
    descRU:'Выиграй 4 матча в Арене за день против других игроков.',
    descPtBr:'Vença 4 partidas na Arena durante o dia contra outros jogadores.',
    descVi:'Thắng 4 trận trong Arena trong ngày trước người chơi khác.',
    descId:'Menangkan 4 pertandingan di Arena dalam sehari melawan pemain lain.',
    descTr:'Gün içinde Arenada başka oyunculara karşı 4 maç kazan.',
    descPl:'Wygraj w ciągu dnia 4 mecze na Arenie przeciwko innym graczom.',
    descUK:'Виграй 4 матчі в Арені за день проти інших гравців.' },
  { id:'dw5', type:'arena_win', icon:'🌟', target:5, xp:138,
    titleRU:'Пять побед', titleUK:'П\'ять перемог',
    titlePtBr:'Cinco vitórias', titleVi:'Năm chiến thắng', titleId:'Lima kemenangan', titleTr:'Beş zafer', titlePl:'Pięć zwycięstw',
    descRU:'Выиграй 5 матчей в Арене за день против других игроков.',
    descPtBr:'Vença 5 partidas na Arena durante o dia contra outros jogadores.',
    descVi:'Thắng 5 trận trong Arena trong ngày trước người chơi khác.',
    descId:'Menangkan 5 pertandingan di Arena dalam sehari melawan pemain lain.',
    descTr:'Gün içinde Arenada başka oyunculara karşı 5 maç kazan.',
    descPl:'Wygraj w ciągu dnia 5 meczów na Arenie przeciwko innym graczom.',
    descUK:'Виграй 5 матчів в Арені за день проти інших гравців.' },

  { id:'arup1', type:'arena_rank_promoted', icon:'🚀', target:1, xp:66,
    titleRU:'Вверх по рангу', titleUK:'Вгору за рангом',
    titlePtBr:'Subindo no ranking', titleVi:'Tăng hạng', titleId:'Naik peringkat', titleTr:'Rütbede yüksel', titlePl:'W górę rankingu',
    descRU:'Повысь ранг в Арене за день: выиграй рейтинговый матч против другого игрока и получи новую ступень ранга.',
    descPtBr:'Suba de ranque na Arena durante o dia: ganhe promoção de nível ou liga em uma partida ranqueada contra outro jogador.',
    descVi:'Tăng hạng trong Arena trong ngày: được thăng cấp hoặc lên liga trong trận xếp hạng với người chơi khác.',
    descId:'Naik peringkat di Arena dalam sehari: dapatkan kenaikan level atau liga di pertandingan berperingkat melawan pemain lain.',
    descTr:'Gün içinde Arenada rütbeni yükselt: başka bir oyuncuya karşı dereceli maçta seviye veya lig terfisi al.',
    descPl:'Awansuj w rankingu Areny w ciągu dnia: zdobądź awans poziomu lub ligi w meczu rankingowym przeciwko innemu graczowi.',
    descUK:'Підвищ ранг в Арені за день: виграй рейтинговий матч проти іншого гравця й отримай нову сходинку рангу.' },

  { id:'inv1', type:'invite_friend', icon:'👥', target:1, xp:42,
    titleRU:'Пригласи друга', titleUK:'Запроси друга',
    titlePtBr:'Convide um amigo', titleVi:'Mời bạn bè', titleId:'Undang teman', titleTr:'Arkadaş davet et', titlePl:'Zaproś znajomego',
    descRU:'Открой приглашение друга и отправь ссылку.',
    descPtBr:'Abra o convite para um amigo e envie o link.',
    descVi:'Mở lời mời bạn bè và gửi liên kết.',
    descId:'Buka undangan teman dan kirim tautannya.',
    descTr:'Arkadaş davetini aç ve bağlantıyı gönder.',
    descPl:'Otwórz zaproszenie znajomego i wyślij link.',
    descUK:'Відкрий запрошення друга й надішли посилання.' },

  // ── Челленджи второго поколения (meta/время/возвращение/социум) ──
  { id:'ead1', type:'early_all_done', icon:'🌅', target:1, xp:90,
    titleRU:'Досрочник', titleUK:'Достроковик',
    titlePtBr:'Madrugador', titleVi:'Người sớm', titleId:'Si cepat', titleTr:'Erkenci', titlePl:'Ranny ptaszek',
    descRU:'Выполни все остальные вызовы дня до 12:00.',
    descPtBr:'Conclua todas as outras tarefas do dia antes das 12:00.',
    descVi:'Hoàn thành tất cả nhiệm vụ còn lại trong ngày trước 12:00.',
    descId:'Selesaikan semua tugas lain hari ini sebelum pukul 12:00.',
    descTr:"Günün diğer tüm görevlerini 12:00\'den önce bitir.",
    descPl:'Wykonaj wszystkie pozostałe zadania dnia przed 12:00.',
    descUK:'Виконай усі інші виклики дня до 12:00.' },
  { id:'ead2', type:'early_all_done', icon:'🌅', target:1, xp:102,
    titleRU:'Раньше всех', titleUK:'Раніше за всіх',
    titlePtBr:'Antes de todos', titleVi:'Trước cả mọi người', titleId:'Lebih dulu', titleTr:'Herkesten önce', titlePl:'Przed wszystkimi',
    descRU:'Закрой остальные задания дня до полудня — и день твой.',
    descPtBr:'Termine as outras tarefas do dia antes do meio-dia.',
    descVi:'Hoàn thành các nhiệm vụ còn lại trong ngày trước buổi trưa.',
    descId:'Tuntaskan tugas lain hari ini sebelum tengah hari.',
    descTr:'Günün kalan görevlerini öğleden önce tamamla.',
    descPl:'Ukończ pozostałe zadania dnia przed południem.',
    descUK:'Закрий решту завдань дня до полудня — і день твій.' },
  { id:'lch1', type:'last_chance', icon:'⏳', target:1, xp:84,
    titleRU:'Последний шанс', titleUK:'Останній шанс',
    titlePtBr:'Última chance', titleVi:'Cơ hội cuối', titleId:'Kesempatan terakhir', titleTr:'Son şans', titlePl:'Ostatnia szansa',
    descRU:'Выполни любое задание в последний час дня (23:00–00:00 UTC).',
    descPtBr:'Conclua qualquer tarefa na última hora do dia (23:00–00:00 UTC).',
    descVi:'Hoàn thành bất kỳ nhiệm vụ nào trong giờ cuối của ngày (23:00–00:00 UTC).',
    descId:'Selesaikan tugas apa pun di jam terakhir hari (23:00–00:00 UTC).',
    descTr:'Günün son saatinde (23:00–00:00 UTC) herhangi bir görevi tamamla.',
    descPl:'Wykonaj dowolne zadanie w ostatniej godzinie dnia (23:00–00:00 UTC).',
    descUK:'Виконай будь-яке завдання в останню годину дня (23:00–00:00 UTC).' },
  { id:'lch2', type:'last_chance', icon:'⏳', target:1, xp:96,
    titleRU:'На последнем дыхании', titleUK:'На останньому подиху',
    titlePtBr:'No último suspiro', titleVi:'Vào phút chót', titleId:'Detik terakhir', titleTr:'Son nefeste', titlePl:'Na ostatnią chwilę',
    descRU:'Закрой любое задание между 23:00 и полуночью UTC.',
    descPtBr:'Conclua qualquer tarefa entre 23:00 e meia-noite UTC.',
    descVi:'Hoàn thành bất kỳ nhiệm vụ nào từ 23:00 đến nửa đêm UTC.',
    descId:'Selesaikan tugas apa pun antara 23:00 dan tengah malam UTC.',
    descTr:'23:00 ile gece yarısı (UTC) arasında bir görevi bitir.',
    descPl:'Ukończ dowolne zadanie między 23:00 a północą UTC.',
    descUK:'Закрий будь-яке завдання між 23:00 та опівніччю UTC.' },
  { id:'cb1', type:'comeback_lesson', icon:'🔥', target:1, xp:120,
    titleRU:'Феникс', titleUK:'Фенікс',
    titlePtBr:'Fênix', titleVi:'Phượng hoàng', titleId:'Phoenix', titleTr:'Anka', titlePl:'Feniks',
    descRU:'Пройди урок в день возвращения после 3+ дней перерыва.',
    descPtBr:'Conclua uma lição no dia do retorno após 3+ dias de pausa.',
    descVi:'Hoàn thành một bài học vào ngày trở lại sau 3+ ngày nghỉ.',
    descId:'Selesaikan satu pelajaran di hari kembalimu setelah jeda 3+ hari.',
    descTr:'3+ günlük aradan sonra dönüş gününde bir ders tamamla.',
    descPl:'Ukończ lekcję w dniu powrotu po 3+ dniach przerwy.',
    descUK:'Пройди урок у день повернення після 3+ днів перерви.' },
  { id:'rv1', type:'revision_lesson', icon:'🏺', target:1, xp:66,
    titleRU:'Археолог', titleUK:'Археолог',
    titlePtBr:'Arqueólogo', titleVi:'Nhà khảo cổ', titleId:'Arkeolog', titleTr:'Arkeolog', titlePl:'Archeolog',
    descRU:'Повтори урок, пройденный 7+ дней назад.',
    descPtBr:'Refaça uma lição concluída há 7+ dias.',
    descVi:'Học lại một bài học đã hoàn thành từ 7+ ngày trước.',
    descId:'Ulangi pelajaran yang selesai 7+ hari lalu.',
    descTr:'7+ gün önce bitirdiğin bir dersi tekrarla.',
    descPl:'Powtórz lekcję ukończoną 7+ dni temu.',
    descUK:'Повтори урок, пройдений 7+ днів тому.' },
  { id:'rv2', type:'revision_lesson', icon:'🏺', target:1, xp:78,
    titleRU:'Раскопки', titleUK:'Розкопки',
    titlePtBr:'Escavação', titleVi:'Khai quật', titleId:'Penggalian', titleTr:'Kazı', titlePl:'Wykopaliska',
    descRU:'Освежи память: повтори урок, который проходил 7+ дней назад.',
    descPtBr:'Reveja uma lição feita há 7+ dias para refrescar a memória.',
    descVi:'Ôn lại một bài học cũ 7+ ngày để làm mới trí nhớ.',
    descId:'Segarkan ingatan: ulangi pelajaran dari 7+ hari lalu.',
    descTr:'Hafızanı tazele: 7+ gün önceki bir dersi tekrar et.',
    descPl:'Odśwież pamięć: powtórz lekcję sprzed 7+ dni.',
    descUK:'Освіжи пам\'ять: повтори урок, який проходив 7+ днів тому.' },
  { id:'pg1', type:'polyglot_day', icon:'🌍', target:2, xp:96,
    titleRU:'Полиглот', titleUK:'Поліглот',
    titlePtBr:'Poliglota', titleVi:'Đa ngôn ngữ', titleId:'Poliglot', titleTr:'Poliglot', titlePl:'Poliglota',
    descRU:'Позанимайся и в английском, и во французском сегодня.',
    descPtBr:'Estude inglês e francês hoje.',
    descVi:'Học cả tiếng Anh và tiếng Pháp hôm nay.',
    descId:'Belajar bahasa Inggris dan Prancis hari ini.',
    descTr:'Bugün hem İngilizce hem Fransızca çalış.',
    descPl:'Ucz się dziś angielskiego i francuskiego.',
    descUK:'Позаймайся і англійською, і французькою сьогодні.' },
  { id:'pbl1', type:'perfect_big_lesson', icon:'🔪', target:1, xp:84,
    titleRU:'Хирург', titleUK:'Хірург',
    titlePtBr:'Cirurgião', titleVi:'Bác sĩ phẫu thuật', titleId:'Dokter bedah', titleTr:'Cerrah', titlePl:'Chirurg',
    descRU:'Пройди урок от 20 фраз без единой ошибки.',
    descPtBr:'Conclua uma lição com 20+ frases sem nenhum erro.',
    descVi:'Hoàn thành bài học 20+ câu không một lỗi.',
    descId:'Selesaikan pelajaran 20+ frasa tanpa satu kesalahan pun.',
    descTr:'20+ ifadelik bir dersi tek hata yapmadan bitir.',
    descPl:'Ukończ lekcję z 20+ fraz bez ani jednego błędu.',
    descUK:'Пройди урок від 20 фраз без жодної помилки.' },
  { id:'pbl2', type:'perfect_big_lesson', icon:'🔪', target:1, xp:96,
    titleRU:'Безупречно', titleUK:'Бездоганно',
    titlePtBr:'Impecável', titleVi:'Hoàn hảo tuyệt đối', titleId:'Sempurna', titleTr:'Kusursuz', titlePl:'Bezbłędnie',
    descRU:'Длинный урок (20+ фраз) — и ни одной ошибки.',
    descPtBr:'Lição longa (20+ frases) sem nenhum erro.',
    descVi:'Bài học dài (20+ câu) không mắc lỗi nào.',
    descId:'Pelajaran panjang (20+ frasa) tanpa kesalahan.',
    descTr:'Uzun bir ders (20+ ifade), sıfır hata.',
    descPl:'Długa lekcja (20+ fraz) i zero błędów.',
    descUK:'Довгий урок (20+ фраз) — і жодної помилки.' },
  { id:'pbl3', type:'perfect_big_lesson', icon:'🔪', target:1, xp:108, minPlayerLevel:15,
    titleRU:'Ювелирная точность', titleUK:'Ювелірна точність',
    titlePtBr:'Precisão de joalheiro', titleVi:'Chính xác tuyệt đối', titleId:'Presisi permata', titleTr:'Kuyumcu hassasiyeti', titlePl:'Jubilerska precyzja',
    descRU:'Урок от 20 фраз без единой ошибки — работа ювелира.',
    descPtBr:'Lição com 20+ frases sem um único erro.',
    descVi:'Bài học 20+ câu không một lỗi nhỏ.',
    descId:'Pelajaran 20+ frasa tanpa satu kesalahan.',
    descTr:'20+ ifadelik ders, tek hata yok.',
    descPl:'Lekcja z 20+ fraz bez jednego błędu.',
    descUK:'Урок від 20 фраз без жодної помилки — робота ювеліра.' },
  { id:'bs1', type:'blitz_speed', icon:'⚡', target:1, xp:78,
    titleRU:'Блиц', titleUK:'Блиц',
    titlePtBr:'Blitz', titleVi:'Chớp nhoáng', titleId:'Blitz', titleTr:'Yıldırım', titlePl:'Błyskawica',
    descRU:'Дай 10 верных ответов за 60 секунд в уроке.',
    descPtBr:'Acerte 10 respostas em 60 segundos em uma lição.',
    descVi:'Trả lời đúng 10 câu trong 60 giây ở một bài học.',
    descId:'Jawab 10 jawaban benar dalam 60 detik di satu pelajaran.',
    descTr:'Bir derste 60 saniyede 10 doğru yanıt ver.',
    descPl:'Odpowiedz poprawnie 10 razy w 60 sekund w lekcji.',
    descUK:'Дай 10 правильних відповідей за 60 секунд на уроці.' },
  { id:'bs2', type:'blitz_speed', icon:'⚡', target:1, xp:90,
    titleRU:'Скорость света', titleUK:'Швидкість світла',
    titlePtBr:'Velocidade da luz', titleVi:'Tốc độ ánh sáng', titleId:'Kecepatan cahaya', titleTr:'Işık hızı', titlePl:'Prędkość światła',
    descRU:'10 правильных ответов за минуту — не тормози.',
    descPtBr:'10 respostas certas em um minuto — não freie.',
    descVi:'10 câu đúng trong một phút — đừng chậm lại.',
    descId:'10 jawaban benar dalam semenit — jangan melambat.',
    descTr:'Bir dakikada 10 doğru — yavaşlama.',
    descPl:'10 poprawnych odpowiedzi w minutę — bez hamowania.',
    descUK:'10 правильних відповідей за хвилину — не гальмуй.' },
  { id:'sf1', type:'streak_freeze_use', icon:'🛡️', target:1, xp:48,
    titleRU:'Щит стрика', titleUK:'Щит стріка',
    titlePtBr:'Escudo da sequência', titleVi:'Khiên chuỗi', titleId:'Perisai rentetan', titleTr:'Seri kalkanı', titlePl:'Tarcza serii',
    descRU:'Используй заморозку стрика на экране статистики.',
    descPtBr:'Use um congelamento de sequência na tela de estatísticas.',
    descVi:'Dùng bảo vệ chuỗi (đóng băng) trong màn hình thống kê.',
    descId:'Gunakan pembekuan rentetan di layar statistik.',
    descTr:'İstatistik ekranında seri dondurmasını kullan.',
    descPl:'Użyj zamrożenia serii na ekranie statystyk.',
    descUK:'Використай заморозку стріка на екрані статистики.' },
  { id:'ca1', type:'club_attend', icon:'🎤', target:1, xp:96,
    titleRU:'Оратор', titleUK:'Оратор',
    titlePtBr:'Orador', titleVi:'Diễn giả', titleId:'Orator', titleTr:'Hatip', titlePl:'Mówca',
    descRU:'Загляни в спикинг-клуб и посмотри, что там обсуждают.',
    descPtBr:'Visite o clube de conversação e veja o que está rolando.',
    descVi:'Ghé câu lạc bộ nói và xem mọi người đang thảo luận gì.',
    descId:'Mampir ke klub speaking dan lihat apa yang sedang dibahas.',
    descTr:'Konuşma kulübüne göz at ve neler konuşulduğuna bak.',
    descPl:'Zajrzyj do klubu rozmów i zobacz, o czym dyskutują.',
    descUK:'Зазирни у спікінг-клуб і подивися, що там обговорюють.' },
  { id:'wm1', type:'weekend_marathon', icon:'🏁', target:2, xp:108,
    titleRU:'Выходной марафон', titleUK:'Вихідний марафон',
    titlePtBr:'Maratona de fim de semana', titleVi:'Marathon cuối tuần', titleId:'Maraton akhir pekan', titleTr:'Hafta sonu maratonu', titlePl:'Weekendowy maraton',
    descRU:'Пройди 2 урока в выходной день.',
    descPtBr:'Conclua 2 lições no fim de semana.',
    descVi:'Hoàn thành 2 bài học vào cuối tuần.',
    descId:'Selesaikan 2 pelajaran di akhir pekan.',
    descTr:'Hafta sonu 2 ders tamamla.',
    descPl:'Ukończ 2 lekcje w weekend.',
    descUK:'Пройди 2 уроки у вихідний день.' },
  // TODO(mentor_friend): НЕ добавлять в DAILY_SETS/REPLACEMENT_POOL — задание ждёт
  // серверный сигнал «приглашённый друг прошёл первый урок» (referral-attribution).
  // Пока сигнала нет, тип существует только как определение для будущей проводки.
  { id:'mf1', type:'mentor_friend', icon:'🤝', target:1, xp:150,
    titleRU:'Наставник', titleUK:'Наставник',
    titlePtBr:'Mentor', titleVi:'Người cố vấn', titleId:'Mentor', titleTr:'Mentor', titlePl:'Mentor',
    descRU:'Приглашённый тобой друг прошёл первый урок.',
    descPtBr:'Um amigo que você convidou concluiu a primeira lição.',
    descVi:'Bạn bè bạn mời đã hoàn thành bài học đầu tiên.',
    descId:'Teman yang kamu undang menyelesaikan pelajaran pertamanya.',
    descTr:'Davet ettiğin bir arkadaş ilk dersini bitirdi.',
    descPl:'Zaproszony znajomy ukończył pierwszą lekcję.',
    descUK:'Запрошений тобою друг пройшов перший урок.' },
];

// ── Наборы заданий по тиру игрового уровня (30 дней × 3 задания) ──────────

// Тир 1: уровни 1–15 — базовые активности, лёгкие квизы, карточки, глаголы
const DAILY_SETS_TIER1: string[][] = [
  ['da1','ta9','dp1'],         // день 1
  ['da2','qe6','dp4'],         // день 2
  ['da3','ta1','dw1'],        // день 3
  ['da4','qs6','dp3'],         // день 4
  ['ead1','cs1','dp5'],        // день 5 — early_all_done
  ['da6','wl6','dw2'],         // день 6
  ['da7','lnm1','dw3'],        // день 7
  ['da8','ta8','dp2w1'],         // день 8
  ['da1','cs6','dw4'],         // день 9
  ['da2','tw1','dw5'],         // день 10
  ['da3','ta1','dp1'],        // день 11
  ['rv1','qe4','dp4'],        // день 12 — revision_lesson
  ['da5','inv1','dw1'],       // день 13 — пригласить друга
  ['da6','cs1','dp3'],         // день 14
  ['da7','fs6','dp5'],         // день 15
  ['da8','ta9','dw2'],        // день 16
  ['lch1','ot1','dp2w1'],        // день 17 — last_chance
  ['da2','fv4','arup1'],         // день 18
  ['da3','vl1','dp1'],         // день 19
  ['da4','dl4','dw1'],        // день 20
  ['bs1','cs2','dp3'],        // день 21 — blitz_speed
  ['da6','qe1','dp5'],         // день 22
  ['da7','ta8','dw2'],         // день 23
  ['da8','es3','dw1'],         // день 24
  ['da1','lnm6','dp2w1'],       // день 25
  ['pg1','ta9','arup1'],       // день 26 — polyglot_day
  ['da3','tp1','dp1'],         // день 27
  ['da4','dl1','dw1'],         // день 28
  ['ca1','fs1','dp3'],       // день 29 — club_attend
  ['da6','qe4','dp4'],         // день 30
];

// Тир 2: уровни 16–30 — средние квизы, арены, серии, повторения
const DAILY_SETS_TIER2: string[][] = [
  ['da1','ta2','dp1'],         // день 1
  ['da2','qm3','dw1'],         // день 2
  ['da3','ta7','dp4'],        // день 3
  ['ead2','qs2','dp3'],        // день 4 — early_all_done
  ['da5','cs3','dp5'],         // день 5
  ['da6','arup1','qm1'],       // день 6 — повышение ранга в Арене
  ['da7','lnm2','dw2'],        // день 7
  ['da8','ta4','dw3'],         // день 8
  ['sf1','cs7','dp2w1'],        // день 9 — streak_freeze_use
  ['da2','tw2','dw4'],         // день 10
  ['da3','inv1','dw5'],       // день 11 — пригласить друга
  ['da4','qe5','dp1'],         // день 12
  ['da5','vl5','dp4'],        // день 13
  ['rv2','cs2','dw1'],        // день 14 — revision_lesson
  ['da7','fs4','dp3'],         // день 15
  ['da8','ta7','dp5'],        // день 16
  ['da1','ot2','dw2'],         // день 17
  ['da2','qm3','dp2w1'],         // день 18
  ['pbl1','vl2','arup1'],       // день 19 — perfect_big_lesson
  ['da4','dl2','dp1'],        // день 20
  ['da5','cs3','dw1'],         // день 21
  ['lch2','qp1','dp4'],        // день 22 — last_chance
  ['da7','ta5','dp3'],         // день 23
  ['da8','ot2','dp1'],         // день 24
  ['da1','lnm3','dp5'],       // день 25
  ['da2','ta3','dp1'],         // день 26
  ['cb1','tp2','dp5'],        // день 27 — comeback_lesson
  ['da4','dl1','dp2w1'],       // день 28 — 2 матча в Арене + ≥1 победа
  ['da5','fs2','dp2'],        // день 29
  ['bs2','dp2','ta10'],        // день 30 — blitz_speed
];

// Тир 3: уровни 31–50 — сложные квизы, арены, перфекты, хардкор
const DAILY_SETS_TIER3: string[][] = [
  ['da1','ta11','dp1'],        // день 1
  ['da2','qh1','dw1'],         // день 2
  ['da3','ta6','dp4'],        // день 3
  ['ead1','qs4','dp3'],        // день 4 — early_all_done
  ['da5','cs4','dp5'],         // день 5
  ['ca1','wl4','dw2'],        // день 6 — club_attend
  ['da7','lnm3','dw3'],        // день 7
  ['pbl2','ta5','dp2w1'],       // день 8 — perfect_big_lesson
  ['da1','cs8','dw4'],         // день 9
  ['da2','tar1','dw5'],         // день 10
  ['da3','ta6','dp1'],        // день 11
  ['ead2','qh5','dp4'],        // день 12 — early_all_done
  ['da5','vl6','dw1'],        // день 13
  ['cb1','arup1','qh4'],      // день 14 — comeback_lesson
  ['da7','fs5','dp3'],         // день 15
  ['rv1','ta11','dp5'],      // день 16 — revision_lesson
  ['da1','ot2','dw2'],         // день 17
  ['da2','qhp1','dp2w1'],        // день 18
  ['da3','vl3','arup1'],         // день 19
  ['pbl3','dl3','dp1'],       // день 20 — perfect_big_lesson
  ['da5','dp3w2','ms3'],       // день 21 — 3 матча в Арене + ≥2 победы
  ['da6','qp2','dw1'],         // день 22
  ['lch1','ta6','dp4'],        // день 23 — last_chance
  ['da8','ot2','dp1'],         // день 24
  ['sf1','lnm5','dp5'],      // день 25 — streak_freeze_use
  ['da2','ta5','dp3'],         // день 26
  ['bs2','tar2','dp5'],        // день 27 — blitz_speed
  ['da4','dl2','dp2w1'],       // день 28 — 2 матча в Арене + ≥1 победа
  ['pg1','fs3','dw5'],        // день 29 — polyglot_day
  ['da6','dp2','ta10'],         // день 30
];

/** Выбирает набор наборов заданий по игровому уровню. */
const getSetsForPlayerLevel = (playerLevel: number): string[][] => {
  if (playerLevel <= 15) return DAILY_SETS_TIER1;
  if (playerLevel <= 30) return DAILY_SETS_TIER2;
  return DAILY_SETS_TIER3;
};

// ── Утилиты ───────────────────────────────────────────────────────────────
// Ключ дня в UTC — единый источник истины с arena_daily_limit (todayStr) и
// streak_safety (todayKey), которые тоже считают по UTC через toISOString.
// Ранее здесь было локальное время (getFullYear/getMonth/getDate): около полуночи
// у пользователей с UTC±N ключи расходились → двойной сбор дневных наград,
// потеря прогресса задач (записано на один ключ, читается с другого) и
// несправедливый сброс серии. Теперь все три модуля используют один формат.
export const getTodayKey = (): string => {
  return new Date().toISOString().slice(0, 10);
};

function datedDailyTasksStorageDateFromKey(key: string): string | null {
  const legacy = key.match(/^(?:daily_tasks_|lesson_visited_|daily_tasks_all_shards_)(\d{4}-\d{2}-\d{2})$/);
  if (legacy) return legacy[1];
  const scoped = key.match(/^daily_tasks_v2::[^:]+::(?:daily_tasks_|lesson_visited_)(\d{4}-\d{2}-\d{2})$/);
  return scoped ? scoped[1] : null;
}

export function selectDatedDailyTasksStorageKeysToRemove(
  keys: readonly string[],
  nowMs = Date.now(),
  retainKeys: readonly string[] = [],
): string[] {
  const retain = new Set(retainKeys.filter(Boolean));
  const markers = keys
    .map((key) => ({ key, date: datedDailyTasksStorageDateFromKey(key) }))
    .filter((item): item is { key: string; date: string } => item.date !== null)
    .sort((a, b) => (b.date === a.date ? b.key.localeCompare(a.key) : b.date.localeCompare(a.date)));
  if (markers.length === 0) return [];

  const cutoffMs = nowMs - DATED_DAILY_TASKS_STORAGE_TTL_MS;
  const remove = new Set<string>();
  for (const marker of markers) {
    const markerMs = Date.parse(`${marker.date}T00:00:00.000Z`);
    if (Number.isFinite(markerMs) && markerMs < cutoffMs && !retain.has(marker.key)) {
      remove.add(marker.key);
    }
  }

  let kept = 0;
  for (const marker of markers) {
    if (remove.has(marker.key)) continue;
    kept += 1;
    if (kept > DATED_DAILY_TASKS_STORAGE_MAX_KEYS && !retain.has(marker.key)) {
      remove.add(marker.key);
    }
  }
  return [...remove];
}

export async function pruneDatedDailyTasksStorageKeys(retainKeys: readonly string[] = []): Promise<void> {
  const now = Date.now();
  if (
    _datedDailyTasksStoragePruneInFlight
    || now - _lastDatedDailyTasksStoragePruneAt < DATED_DAILY_TASKS_STORAGE_PRUNE_INTERVAL_MS
  ) {
    return;
  }
  _datedDailyTasksStoragePruneInFlight = true;
  _lastDatedDailyTasksStoragePruneAt = now;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const remove = selectDatedDailyTasksStorageKeysToRemove(keys, now, retainKeys);
    if (remove.length > 0) await AsyncStorage.multiRemove(remove);
  } catch {
    // Best-effort cleanup only; progress writes stay authoritative.
  } finally {
    _datedDailyTasksStoragePruneInFlight = false;
  }
}

// ── Замена «выведенных» (retired) заданий ───────────────────────────────
// Раньше пул замены состоял из 12 id в фиксированном порядке и первый свободный
// всегда был da1/ta1 — поэтому 30/30 дней пользователь видел одни и те же карточки,
// а в 26/30 дней на экране было два почти одинаковых lesson_complete.
// Теперь: пул — все «всегда выполнимые» типы, выбор детерминированно вращается
// по UTC-дню, дубли убираются и по id, и по типу задания.

// Типы, которые всегда выполнимы: без рантайм-условий (слова/глаголы/повторение/
// тренер проверяются отдельно ниже), без level/free гейтов. early_all_done/last_chance
// имеют временные окна, но выполнимы в любой день; условные типы (comeback/revision/
// freeze/club/weekend/polyglot/mentor) в пул НЕ берём — проверяются фолбэками ниже.
const REPLACEMENT_POOL_TYPES: ReadonlySet<TaskType> = new Set([
  'lesson_complete', 'total_answers', 'correct_streak', 'lesson_no_mistakes',
  'open_theory', 'flashcard_view', 'flashcard_save', 'flashcard_flip',
  'different_lessons', 'daily_active', 'daily_phrase_read', 'daily_phrase_save',
  'invite_friend',
  'perfect_big_lesson', 'blitz_speed', 'early_all_done', 'last_chance',
]);

let _replacementPoolCache: readonly DailyTask[] | null = null;
const getReplacementPool = (): readonly DailyTask[] => {
  if (_replacementPoolCache) return _replacementPoolCache;
  _replacementPoolCache = ALL_TASKS.filter((task) => (
    REPLACEMENT_POOL_TYPES.has(task.type)
    && !isRetiredQuizArenaTaskType(task.type)
    && !task.freeOnly
    && (task.minPlayerLevel ?? 1) <= 1
  ));
  return _replacementPoolCache;
};

// Детерминированный хеш дня (FNV-1a) — одинаковый список в течение дня,
// разный ото дня ко дню, стабильный между сессиями.
const hashDaySeed = (key: string): number => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/**
 * Заменяет retired-задания и убирает дубли типов внутри дневной тройки.
 * Кандидат ищется от точки вращения (хеш UTC-дня + слот): сначала свободный
 * по id и типу, затем только по id, затем любой (страховка от исчерпания).
 */
function replaceRetiredQuizArenaTasks(tasks: readonly DailyTask[]): DailyTask[] {
  const pool = getReplacementPool();
  if (pool.length === 0) throw new Error('daily_task_decommission_replacement_exhausted');
  const seed = hashDaySeed(getTodayKey());
  const usedIds = new Set<string>();
  const usedTypes = new Set<string>();
  tasks.forEach((task) => {
    if (!isRetiredQuizArenaTaskType(task.type)) {
      usedIds.add(task.id);
      usedTypes.add(task.type);
    }
  });

  const takeFromPool = (slot: number): DailyTask => {
    const start = (seed + slot * 7) % pool.length;
    for (let step = 0; step < pool.length; step += 1) {
      const candidate = pool[(start + step) % pool.length];
      if (!usedIds.has(candidate.id) && !usedTypes.has(candidate.type)) return candidate;
    }
    for (let step = 0; step < pool.length; step += 1) {
      const candidate = pool[(start + step) % pool.length];
      if (!usedIds.has(candidate.id)) return candidate;
    }
    return pool[start];
  };

  const result = tasks.map((task, idx) => {
    if (!isRetiredQuizArenaTaskType(task.type)) return task;
    const replacement = takeFromPool(idx);
    usedIds.add(replacement.id);
    usedTypes.add(replacement.type);
    return replacement;
  });

  // Дедупликация типов: в один день не должно быть двух карточек одного типа
  // (фолбэки уровня/premium/слов/глаголов могли притащить повтор).
  const seenTypes = new Set<string>();
  return result.map((task, idx) => {
    if (!seenTypes.has(task.type)) {
      seenTypes.add(task.type);
      return task;
    }
    usedIds.delete(task.id);
    const replacement = takeFromPool(idx + result.length);
    seenTypes.add(replacement.type);
    usedIds.add(replacement.id);
    usedTypes.add(replacement.type);
    return replacement;
  });
}

const getTodayTasksByLevel = (playerLevel: number): DailyTask[] => {
  const sets = getSetsForPlayerLevel(playerLevel);
  // UTC-день — как getTodayKey(), чтобы список заданий и прогресс сбрасывались
  // в одну и ту же полночь (раньше список жил по локальной дате, а прогресс по UTC).
  // Повторяемость «5-го числа каждого месяца» снимается сидом замен внутри
  // replaceRetiredQuizArenaTasks — он привязан к полному dayKey, а не к дню месяца.
  const setIdx = (new Date().getUTCDate() - 1) % sets.length;
  const ids = sets[setIdx];
  return replaceRetiredQuizArenaTasks(ids.map(id => ALL_TASKS.find(t => t.id === id)!).filter(Boolean));
};

// Оставляем для обратной совместимости (используется в паре мест)
export const getTodayTasks = (): DailyTask[] => getTodayTasksByLevel(1);

// Резервные задания на случай если verb_learned недоступно (все глаголы выучены)
const VERB_FALLBACKS: Record<string, string> = {
  vl1: 'ta1',  vl2: 'ta2',  vl3: 'ta3',
  vl4: 'ta9',  vl5: 'ta8',  vl6: 'ta3',  vl7: 'ta3',
};

// A fully completed vocabulary has no possible progress for words_learned.
// Resolve it to an answer task instead of showing an impossible card.
const WORDS_FALLBACKS: Record<string, string> = {
  wl1: 'ta1', wl2: 'ta2', wl3: 'ta3',
  wl4: 'ta3', wl5: 'ta2', wl6: 'ta1', wl7: 'ta2',
};

export const FRENCH_UNAVAILABLE_DAILY_TASK_TYPES: ReadonlySet<TaskType> = new Set([
  'quiz_hard',
  'quiz_score',
  'quiz_easy',
  'quiz_medium',
  'quiz_perfect',
  'quiz_hard_perfect',
  'words_learned',
  'verb_learned',
  'daily_phrase_read',
  'daily_phrase_save',
  'diagnostic_complete',
]);

export const FRENCH_LESSON_CONTENT_DAILY_TASK_TYPES: ReadonlySet<TaskType> = new Set([
  'daily_active',
  'total_answers',
  'correct_streak',
  'lesson_no_mistakes',
  'different_lessons',
  'lesson_complete',
  'morning_session',
  'evening_session',
  'energy_spend',
  'flashcard_save',
  'recall_session',
  'recall_answers',
  'recall_perfect',
  'trainer_words',
  'trainer_phrases',
  'trainer_arena',
  'revision_lesson',
  'perfect_big_lesson',
  'blitz_speed',
]);

export const FRENCH_THEORY_DAILY_TASK_TYPES: ReadonlySet<TaskType> = new Set([
  'open_theory',
]);

// Замены для заданий, недоступных по игровому уровню
const LEVEL_FALLBACKS: Record<string, string> = {
  // quiz_hard (уровень 15+) → quiz_easy
  qh1: 'qe1',  qh2: 'qe2',  qh3: 'qe3',  qh4: 'qe3',
  qh5: 'qe2',  qh6: 'qe3',
  // quiz_medium (уровень 8+) → quiz_easy
  qm1: 'qe1',  qm2: 'qe2',  qm3: 'qe6',  qm4: 'qe5',
  // quiz_perfect (уровень 8+) → total_answers
  qp1: 'ta1',  qp2: 'ta2',
  // quiz_hard_perfect (уровень 15+) → total_answers
  qhp1: 'ta2', qhp2: 'ta2',
  // quiz_score высокий (уровень 15+) → пониже
  qs4: 'qs2',  qs5: 'qs3',
};

// Замены freeOnly заданий для Premium-пользователей
const PREMIUM_FALLBACKS: Record<string, string> = {
  es1: 'dp1',  // energy_spend 3 → arena_play 1
  es2: 'dp2',  // energy_spend 5 → arena_play 3
  es3: 'rs1',  // energy_spend 2 → recall_session
  es4: 'dp3',  // energy_spend 7 → arena_play 5
};

const RECALL_DAILY_TASK_TYPES: ReadonlySet<TaskType> = new Set([
  'recall_session',
  'recall_answers',
  'recall_perfect',
]);

const TRAINER_QUEUE_BY_TASK_TYPE: Readonly<Partial<Record<TaskType, TrainerQueue>>> = {
  trainer_words: 'words',
  trainer_phrases: 'phrases',
  trainer_arena: 'arena',
};

const TRAINER_TASK_FALLBACK_IDS: Record<string, readonly string[]> = {
  tw1: ['ta1', 'ot1', 'cs1', 'ta8'],
  tw2: ['ta2', 'ot1', 'cs1', 'ta1'],
  tp1: ['ta1', 'ot1', 'cs1', 'ta8'],
  tp2: ['ta2', 'ot1', 'cs1', 'ta1'],
  tar1: ['ta1', 'ot1', 'cs1', 'ta8'],
  tar2: ['ta2', 'ot1', 'cs1', 'ta1'],
};

const RECALL_TASK_FALLBACK_IDS: Record<string, readonly string[]> = {
  rs1: ['ta1', 'ta8', 'ot1', 'cs1'],
  rs2: ['ta8', 'ta1', 'ot1', 'cs1'],
  rs3: ['ot1', 'ta1', 'ta8', 'cs1'],
  ra1: ['ta2', 'ta1', 'ta8', 'cs1'],
  ra2: ['ta3', 'ta2', 'ta1', 'cs1'],
  ra3: ['ta9', 'ta1', 'ot1', 'cs1'],
  ra4: ['ta4', 'ta3', 'ta2', 'cs1'],
  ra5: ['ta8', 'ta1', 'ot1', 'cs1'],
  ra6: ['ta2', 'ta1', 'ta8', 'cs1'],
  rp1: ['cs1', 'ta1', 'ot1', 'ta8'],
  rp2: ['cs1', 'ta8', 'ta1', 'ot1'],
  rp3: ['cs1', 'ta2', 'ta1', 'ot1'],
};

const pickRecallUnavailableFallback = (
  task: DailyTask,
  usedIds: Set<string>,
  studyTarget?: RuntimeStudyTarget,
): DailyTask => {
  const fallbackIds = RECALL_TASK_FALLBACK_IDS[task.id] ?? ['ta1', 'ta8', 'ot1', 'cs1'];
  for (const id of fallbackIds) {
    if (usedIds.has(id)) continue;
    const fallback = ALL_TASKS.find((t) => t.id === id);
    if (!fallback) continue;
    if (!dailyTaskAvailableForStudyTarget(fallback, studyTarget)) continue;
    usedIds.add(fallback.id);
    return fallback;
  }
  return task;
};

const replaceRecallTasksWhenNoDueItems = async (
  tasks: DailyTask[],
  studyTarget?: RuntimeStudyTarget,
): Promise<DailyTask[]> => {
  if (!tasks.some((task) => RECALL_DAILY_TASK_TYPES.has(task.type))) return tasks;
  const dueCount = await countDueItemsToday(studyTarget);
  if (dueCount > 0) return tasks;

  const usedIds = new Set(tasks.filter((task) => !RECALL_DAILY_TASK_TYPES.has(task.type)).map((task) => task.id));
  return tasks.map((task) => {
    if (!RECALL_DAILY_TASK_TYPES.has(task.type)) return task;
    return pickRecallUnavailableFallback(task, usedIds, studyTarget);
  });
};

/** Сколько слотов «про Арену» в тройке после подмены freeOnly для Premium (как в getTodayTasksSafe). */
const countResolvedArenaSlots = (rawIds: string[], usePremiumResolution: boolean): number => {
  const resolved = rawIds.map(id => {
    if (!usePremiumResolution) return id;
    const def = ALL_TASKS.find(t => t.id === id);
    if (def?.freeOnly) {
      const rep = PREMIUM_FALLBACKS[id];
      if (rep) return rep;
    }
    return id;
  });
  let n = 0;
  for (const id of resolved) {
    const def = ALL_TASKS.find(t => t.id === id);
    if (def && isArenaDailyTaskType(def.type)) n += 1;
  }
  return n;
};

/**
 * Проверка политики: ровно одно задание типа арены в каждой дневной тройке для Free и Premium
 * (Premium — с учётом PREMIUM_FALLBACKS для freeOnly).
 */
export function getDailySetsArenaPolicyErrors(): string[] {
  const tiers: { label: string; sets: string[][] }[] = [
    { label: 'DAILY_SETS_TIER1', sets: DAILY_SETS_TIER1 },
    { label: 'DAILY_SETS_TIER2', sets: DAILY_SETS_TIER2 },
    { label: 'DAILY_SETS_TIER3', sets: DAILY_SETS_TIER3 },
  ];
  const out: string[] = [];
  for (const { label, sets } of tiers) {
    sets.forEach((row, i) => {
      const day = i + 1;
      const freeN = countResolvedArenaSlots(row, false);
      if (freeN !== 1) {
        out.push(`${label} день ${day} (free): арена×${freeN}, ids=[${row.join(',')}]`);
      }
      const premN = countResolvedArenaSlots(row, true);
      if (premN !== 1) {
        out.push(`${label} день ${day} (premium): арена×${premN}, ids=[${row.join(',')}]`);
      }
    });
  }
  return out;
}

/** Читает игровой уровень (1–50) пользователя из AsyncStorage. */
export const getUserPlayerLevel = async (): Promise<number> => {
  try {
    const { getLevelFromXP } = await import('../constants/theme');
    const raw = await AsyncStorage.getItem('user_total_xp');
    return getLevelFromXP(parseInt(raw || '0', 10));
  } catch (e) {
    if (__DEV__) console.warn('[daily_tasks]', e);
  }
  return 1;
};

/** Проверяет активен ли Premium у пользователя. */
const getUserIsPremium = async (): Promise<boolean> => {
  try {
    return await getVerifiedPremiumStatus();
  } catch (e) {
    if (__DEV__) console.warn('[daily_tasks]', e);
  }
  return false;
};

// ═══════════════════════════════════════════════════════════════════════════
// DAILY TASK REROLL — замена надоевшего задания за осколки (1 раз/сутки)
// ═══════════════════════════════════════════════════════════════════════════

/** Цена одной замены задания. Сильно дешевле страховых трат — sink ради вовлечения, не монетизации. */
export const DAILY_TASK_REROLL_COST_SHARDS = 3;
/** Сколько замен в сутки разрешено. Изменение требует обновления UI-подсказки на экране задач. */
export const DAILY_TASK_REROLL_MAX_PER_DAY = 1;

const ADMIN_TASK_OVERRIDE_STORAGE_KEY = 'daily_tasks_admin_override_v1';

interface RerollState {
  dayKey: string;
  /** origTaskId → newTaskId. Применяется в getTodayTasksSafe поверх дневного набора. */
  replacements: Record<string, string>;
}

type AdminTaskOverrideState = {
  dayKey: string;
  taskIds: string[];
};

export type DailyTaskSeedMode = 'empty' | 'ready' | 'claimed';

export type DailyTaskAdminPack = {
  id: string;
  label: string;
  taskIds: string[];
  types: TaskType[];
};

const loadAdminTaskOverride = async (studyTarget?: RuntimeStudyTarget): Promise<AdminTaskOverrideState | null> => {
  try {
    const raw = await AsyncStorage.getItem(dailyTasksAdminOverrideKey(studyTarget));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminTaskOverrideState;
    if (!parsed || parsed.dayKey !== getTodayKey() || !Array.isArray(parsed.taskIds)) return null;
    const taskIds = parsed.taskIds.filter((id) => ALL_TASKS.some((t) => t.id === id));
    return taskIds.length > 0 ? { dayKey: parsed.dayKey, taskIds } : null;
  } catch {
    return null;
  }
};

export const clearDailyTasksAdminOverride = async (studyTarget?: RuntimeStudyTarget): Promise<void> => {
  try {
    await AsyncStorage.removeItem(dailyTasksAdminOverrideKey(studyTarget));
  } catch (e) {
    if (__DEV__) console.warn('[daily_tasks]', e);
  }
};

export const getDailyTaskAdminPacks = (packSize = 3): DailyTaskAdminPack[] => {
  const safeSize = Math.max(1, Math.min(6, Math.floor(packSize) || 3));
  const packs: DailyTaskAdminPack[] = [];
  for (let i = 0; i < ALL_TASKS.length; i += safeSize) {
    const tasks = ALL_TASKS.slice(i, i + safeSize);
    packs.push({
      id: `daily_tasks_admin_pack_${Math.floor(i / safeSize) + 1}`,
      label: `${i + 1}-${i + tasks.length} / ${ALL_TASKS.length}`,
      taskIds: tasks.map((t) => t.id),
      types: tasks.map((t) => t.type),
    });
  }
  return packs;
};

export const getDailyTaskAdminPreviewTasks = (studyTarget?: RuntimeStudyTarget): DailyTask[] => (
  filterDailyTasksForStudyTarget(ALL_TASKS, studyTarget)
);

const makeAdminProgressRow = (task: DailyTask, mode: DailyTaskSeedMode): TaskProgress => {
  const done = mode === 'ready' || mode === 'claimed';
  if (task.type === 'arena_plays_wins_combo') {
    const req = getArenaComboRequirement(task);
    return {
      taskId: task.id,
      current: done ? req.minPlays : 0,
      comboPlays: done ? req.minPlays : 0,
      comboWins: done ? req.minWins : 0,
      completed: done,
      claimed: mode === 'claimed',
    };
  }
  return {
    taskId: task.id,
    current: done ? task.target : 0,
    completed: done,
    claimed: mode === 'claimed',
  };
};

export const seedDailyTasksAdminPack = async (
  taskIds: string[],
  mode: DailyTaskSeedMode = 'empty',
  studyTarget?: RuntimeStudyTarget,
): Promise<DailyTask[]> => {
  const requestedTasks = taskIds
    .map((id) => ALL_TASKS.find((t) => t.id === id))
    .filter((t): t is DailyTask => Boolean(t));
  const tasks = filterDailyTasksForStudyTarget(requestedTasks, studyTarget);
  if (tasks.length === 0) return [];

  await AsyncStorage.setItem(dailyTasksAdminOverrideKey(studyTarget), JSON.stringify({
    dayKey: getTodayKey(),
    taskIds: tasks.map((t) => t.id),
  }));
  await saveTodayProgress(tasks.map((task) => makeAdminProgressRow(task, mode)), studyTarget);
  return tasks;
};

const emptyRerollState = (): RerollState => ({ dayKey: getTodayKey(), replacements: {} });

const loadRerollStateRaw = async (studyTarget?: RuntimeStudyTarget): Promise<RerollState> => {
  try {
    const raw = await AsyncStorage.getItem(dailyTasksRerollKey(studyTarget));
    if (!raw) return emptyRerollState();
    const parsed = JSON.parse(raw) as RerollState;
    // Сутки кончились — стираем замены, иначе вчерашние ID попадут в сегодняшнюю тройку.
    if (!parsed || parsed.dayKey !== getTodayKey()) return emptyRerollState();
    if (!parsed.replacements || typeof parsed.replacements !== 'object') return emptyRerollState();
    return parsed;
  } catch {
    return emptyRerollState();
  }
};

const saveRerollState = async (
  state: RerollState,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(dailyTasksRerollKey(studyTarget), JSON.stringify(state));
  } catch (e) {
    if (__DEV__) console.warn('[daily_tasks]', e);
  }
};

/** Сколько замен ещё доступно сегодня. */
export const getDailyRerollsLeftToday = async (studyTarget?: RuntimeStudyTarget): Promise<number> => {
  const s = await loadRerollStateRaw(studyTarget);
  return Math.max(0, DAILY_TASK_REROLL_MAX_PER_DAY - Object.keys(s.replacements).length);
};

const replaceTrainerTasksWhenQueueIsInsufficient = async (
  tasks: DailyTask[],
  studyTarget?: RuntimeStudyTarget,
): Promise<DailyTask[]> => {
  if (!tasks.some((task) => TRAINER_QUEUE_BY_TASK_TYPE[task.type])) return tasks;

  const counts = await getTrainerCounts(studyTarget);
  const progressKey = dailyTasksProgressKey(getTodayKey(), studyTarget);
  let savedProgress: TaskProgress[] = [];
  try {
    const raw = await AsyncStorage.getItem(progressKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) savedProgress = parsed as TaskProgress[];
  } catch {
    savedProgress = [];
  }
  const progressByTaskId = new Map(savedProgress.map((row) => [row.taskId, row]));
  const usedIds = new Set(tasks.filter((task) => !TRAINER_QUEUE_BY_TASK_TYPE[task.type]).map((task) => task.id));

  return tasks.map((task) => {
    const queue = TRAINER_QUEUE_BY_TASK_TYPE[task.type];
    if (!queue) return task;
    const row = progressByTaskId.get(task.id);
    if (row?.completed || row?.claimed || (row?.current ?? 0) + counts[queue] >= task.target) {
      usedIds.add(task.id);
      return task;
    }

    const fallbackIds = TRAINER_TASK_FALLBACK_IDS[task.id] ?? ['ta1', 'ot1', 'cs1', 'ta8'];
    for (const id of fallbackIds) {
      if (usedIds.has(id)) continue;
      const fallback = ALL_TASKS.find((candidate) => candidate.id === id);
      if (!fallback || !dailyTaskAvailableForStudyTarget(fallback, studyTarget)) continue;
      usedIds.add(fallback.id);
      return fallback;
    }
    usedIds.add(task.id);
    return task;
  });
};

/** Count vocabulary items that have not reached the completed training threshold. */
export const countAvailableVocabularyWords = async (studyTarget?: RuntimeStudyTarget): Promise<number> => {
  try {
    const { LESSONS_WITH_WORDS, WORD_KEYS_BY_LESSON } = await import('./lesson_words');
    const lessonIds = Array.from(LESSONS_WITH_WORDS);
    const entries = await AsyncStorage.multiGet(lessonIds.map((id) => lessonWordsKey(id, studyTarget)));
    let available = 0;
    entries.forEach(([_, raw], index) => {
      const lessonId = lessonIds[index];
      const wordKeys = WORD_KEYS_BY_LESSON[lessonId ?? 0] ?? new Set<string>();
      const learned = new Set<string>();
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) {
          parsed.forEach((word) => { if (typeof word === 'string') learned.add(word); });
        } else if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([word, count]) => {
            if (Number(count) >= 3) learned.add(word);
          });
        }
      } catch {
        // Unknown progress is treated as unavailable, so a reroll is never charged blindly.
      }
      wordKeys.forEach((word) => { if (!learned.has(word)) available += 1; });
    });
    return available;
  } catch {
    return 0;
  }
};

/** Категории заданий — реролл подбирает кандидата из той же категории, чтобы сохранить баланс. */
type DailyTaskCategory = 'engage' | 'perfect' | 'quiz' | 'words' | 'flashcard' | 'recall' | 'trainer' | 'arena' | 'social';

const TASK_TYPE_CATEGORY: Record<TaskType, DailyTaskCategory> = {
  daily_active: 'engage',
  total_answers: 'engage',
  energy_spend: 'engage',
  lesson_complete: 'engage',
  different_lessons: 'engage',
  morning_session: 'engage',
  evening_session: 'engage',
  daily_phrase_read: 'engage',
  daily_phrase_save: 'engage',
  open_theory: 'engage',
  correct_streak: 'perfect',
  lesson_no_mistakes: 'perfect',
  quiz_easy: 'quiz',
  quiz_medium: 'quiz',
  quiz_hard: 'quiz',
  quiz_score: 'quiz',
  quiz_perfect: 'quiz',
  quiz_hard_perfect: 'quiz',
  words_learned: 'words',
  verb_learned: 'words',
  flashcard_view: 'flashcard',
  flashcard_save: 'flashcard',
  flashcard_flip: 'flashcard',
  recall_session: 'recall',
  recall_answers: 'recall',
  recall_perfect: 'recall',
  trainer_words: 'trainer',
  trainer_phrases: 'trainer',
  trainer_arena: 'trainer',
  arena_play: 'arena',
  arena_win: 'arena',
  arena_plays_wins_combo: 'arena',
  arena_rank_promoted: 'arena',
  invite_friend: 'social',
  diagnostic_complete: 'social',
  early_all_done: 'engage',
  last_chance: 'engage',
  weekend_marathon: 'engage',
  revision_lesson: 'engage',
  polyglot_day: 'engage',
  streak_freeze_use: 'engage',
  comeback_lesson: 'engage',
  perfect_big_lesson: 'perfect',
  blitz_speed: 'perfect',
  club_attend: 'social',
  mentor_friend: 'social',
};

export function dailyTaskAvailableForStudyTarget(
  taskOrType: DailyTask | TaskType,
  studyTarget?: RuntimeStudyTarget,
): boolean {
  if (storageStudyTarget(studyTarget) !== 'fr') return true;
  void taskOrType;
  return true;
}

export function filterDailyTasksForStudyTarget(
  tasks: DailyTask[],
  studyTarget?: RuntimeStudyTarget,
): DailyTask[] {
  if (storageStudyTarget(studyTarget) !== 'fr') return tasks;
  return tasks;
}

/**
 * Применить override замен поверх массива id (используется в getTodayTasksSafe).
 * Если replacement-id неизвестен в ALL_TASKS — игнорируем (storage corruption / старая версия).
 */
const applyRerollReplacements = (ids: string[], replacements: Record<string, string>): string[] =>
  ids.map((id) => {
    const r = replacements[id];
    if (!r) return id;
    return ALL_TASKS.find((t) => t.id === r) ? r : id;
  });

export type RerollFailReason =
  | 'limit_reached'
  | 'task_already_completed'
  | 'task_not_found'
  | 'no_candidates'
  | 'insufficient_shards'
  | 'spend_failed'
  | 'unknown';

export type RerollResult =
  | { ok: true; newTaskId: string; cost: number }
  | { ok: false; reason: RerollFailReason };

export type DailyTaskSetRerollResult =
  | { ok: true; tasks: DailyTask[] }
  | { ok: false; reason: RerollFailReason };

// Условные типы нельзя предлагать в реролле: они зависят от рантайм-условий
// (возвращение после перерыва, старые уроки, доступная заморозка) или ждут
// серверный сигнал (mentor_friend) — иначе реролл выдал бы невыполнимую карточку.
const REROLL_INELIGIBLE_CONDITIONAL_TYPES: ReadonlySet<TaskType> = new Set([
  'comeback_lesson', 'revision_lesson', 'streak_freeze_use', 'mentor_friend',
]);

/**
 * Подобрать кандидата на замену для taskId среди ALL_TASKS:
 * - в той же категории (engage/quiz/...),
 * - не уже в текущей тройке (учитывает уже применённые reroll-замены),
 * - проходит уровневую/премиумную проверки,
 * - для verb_learned — есть ещё не выученные глаголы.
 */
const pickRerollCandidate = async (
  taskId: string,
  currentIds: string[],
  playerLevel: number,
  isPremium: boolean,
  studyTarget?: RuntimeStudyTarget,
): Promise<DailyTask | null> => {
  const orig = ALL_TASKS.find((t) => t.id === taskId);
  if (!orig) return null;
  const cat = TASK_TYPE_CATEGORY[orig.type];
  const usedIds = new Set(currentIds);

  // Доступны ли ещё неправильные глаголы (для возможной замены на verb_learned).
  let verbsAvailable = Number.POSITIVE_INFINITY;
  let wordsAvailable = Number.POSITIVE_INFINITY;
  const trainerCounts = cat === 'trainer' ? await getTrainerCounts(studyTarget) : null;
  if (cat === 'words') {
    wordsAvailable = await countAvailableVocabularyWords(studyTarget);
    try {
      const raw = await AsyncStorage.getItem(irregularVerbsGlobalKey(studyTarget));
      const learned: Record<string, number> = raw ? JSON.parse(raw) : {};
      const learnedCount = Object.values(learned).filter((v) => v >= 3).length;
      const { IRREGULAR_VERBS_BY_LESSON } = await import('./irregular_verbs_data');
      const totalVerbs = Object.values(IRREGULAR_VERBS_BY_LESSON).reduce((s, arr) => s + arr.length, 0);
      verbsAvailable = totalVerbs - learnedCount;
    } catch {
      verbsAvailable = 0;
    }
  }

  const candidates = ALL_TASKS.filter((t) => {
    if (isRetiredQuizArenaTaskType(t.type)) return false;
    if (REROLL_INELIGIBLE_CONDITIONAL_TYPES.has(t.type)) return false;
    if (t.type === 'weekend_marathon' && !isWeekendToday()) return false;
    if (usedIds.has(t.id)) return false;
    if (TASK_TYPE_CATEGORY[t.type] !== cat) return false;
    if ((t.minPlayerLevel ?? 1) > playerLevel) return false;
    if (isPremium && t.freeOnly) return false;
    if (t.type === 'words_learned' && t.target > wordsAvailable) return false;
    if (t.type === 'verb_learned' && t.target > verbsAvailable) return false;
    const trainerQueue = TRAINER_QUEUE_BY_TASK_TYPE[t.type];
    if (trainerQueue && (!trainerCounts || t.target > trainerCounts[trainerQueue])) return false;
    if (!dailyTaskAvailableForStudyTarget(t, studyTarget)) return false;
    return true;
  });
  const recallDueCount = candidates.some((t) => RECALL_DAILY_TASK_TYPES.has(t.type))
    ? await countDueItemsToday(studyTarget)
    : Number.POSITIVE_INFINITY;
  const runtimeAvailableCandidates = candidates.filter((t) => (
    !RECALL_DAILY_TASK_TYPES.has(t.type) || recallDueCount > 0
  ));

  if (runtimeAvailableCandidates.length === 0) return null;
  // Случайный кандидат — лёгкая «лотерея» добавляет ощущение свежести каждой замене.
  const idx = Math.floor(Math.random() * runtimeAvailableCandidates.length);
  return runtimeAvailableCandidates[idx] ?? null;
};

/**
 * Заменить задание taskId на случайное другое из той же категории.
 * Списывает осколки. Прогресс старого задания НЕ копируется на новое (новое стартует с нуля).
 *
 * Запрещено реролить уже выполненное (completed) или забранное (claimed) задание —
 * это бы давало бесплатное «получил награду → меняю».
 */
export const rerollDailyTask = async (taskId: string, studyTarget?: RuntimeStudyTarget): Promise<RerollResult> => {
  try {
    // Быстрый отказ до дорогих операций (подбор кандидата, чтение прогресса). Настоящий
    // барьер лимита — резерв под withStorageLock ниже: только он атомарен относительно
    // параллельного реролла.
    const left = await getDailyRerollsLeftToday(studyTarget);
    if (left <= 0) return { ok: false, reason: 'limit_reached' };

    const [playerLevel, isPremium] = await Promise.all([getUserPlayerLevel(), getUserIsPremium()]);
    const tasks = await getTodayTasksSafe(studyTarget);
    const orig = tasks.find((t) => t.id === taskId);
    if (!orig) return { ok: false, reason: 'task_not_found' };

    const progress = await loadTodayProgress(tasks, studyTarget);
    const pRow = progress.find((p) => p.taskId === taskId);
    if (pRow && (pRow.completed || pRow.claimed)) {
      return { ok: false, reason: 'task_already_completed' };
    }

    const candidate = await pickRerollCandidate(taskId, tasks.map((t) => t.id), playerLevel, isPremium, studyTarget);
    if (!candidate) return { ok: false, reason: 'no_candidates' };

    // зачем: раньше проверка лимита (getDailyRerollsLeftToday выше) и списание осколков шли
    // ВНЕ замка, а под ним обновлялось только состояние — классический check-then-act. Между
    // проверкой и записью лежит несколько await, поэтому два параллельных реролла (два
    // устройства, ретрай после медленного ответа) читали один и тот же left=1, оба проходили
    // проверку и оба списывали осколки, превышая суточный лимит.
    // Лимит считается по числу записей в replacements, поэтому резервируем ИМЕННО запись —
    // под замком, до списания. Тот же приём, что в claimTaskWithReward: дорогая операция
    // (spendShards сам берёт withStorageLock, вложенный захват = дедлок) остаётся снаружи.
    const todayKey = getTodayKey();
    // Прежнее значение ключа запоминаем, чтобы при неудачном списании вернуть ИМЕННО его:
    // повторный реролл уже заменённого задания иначе потерял бы свою законную замену.
    let previousReplacementForTask: string | undefined;
    const reserved = await withStorageLock(async (): Promise<boolean> => {
      const state = await loadRerollStateRaw(studyTarget);
      const replacements = state.replacements ?? {};
      // Повторный реролл того же задания заменяет свою же запись — лимит не тратится дважды.
      const isReplacingOwnEntry = Object.prototype.hasOwnProperty.call(replacements, taskId);
      if (!isReplacingOwnEntry && Object.keys(replacements).length >= DAILY_TASK_REROLL_MAX_PER_DAY) {
        return false;
      }
      previousReplacementForTask = isReplacingOwnEntry ? replacements[taskId] : undefined;
      await saveRerollState({ dayKey: todayKey, replacements: { ...replacements, [taskId]: candidate.id } }, studyTarget);
      return true;
    });
    if (!reserved) return { ok: false, reason: 'limit_reached' };

    const spent = await spendShards(DAILY_TASK_REROLL_COST_SHARDS, 'daily_task_reroll');
    if (!spent) {
      // Осколков не хватило — снимаем резерв, иначе сгоревшая попытка съела бы суточный
      // лимит впустую. Чужие замены не трогаем, а свою возвращаем к прежнему значению:
      // если замена уже была, её нельзя просто удалить — задание «отыграло» бы назад.
      // Откат идёт по compare-and-swap: если в хранилище уже НЕ наш candidate.id, значит
      // параллельный реролл того же задания успел записать и оплатить свою замену — тогда
      // не трогаем её вовсе, иначе стёрли бы то, за что пользователь заплатил.
      await withStorageLock(async () => {
        const state = await loadRerollStateRaw(studyTarget);
        const rest = { ...(state.replacements ?? {}) };
        if (rest[taskId] !== candidate.id) return;
        if (previousReplacementForTask === undefined) delete rest[taskId];
        else rest[taskId] = previousReplacementForTask;
        await saveRerollState({ dayKey: todayKey, replacements: rest }, studyTarget);
      }).catch(() => {});
      return { ok: false, reason: 'insufficient_shards' };
    }

    // Резерв оплачен — обнуляем прогресс старого id (чтобы не «висел») под тем же замком.
    await withStorageLock(async () => {
      const key = dailyTasksProgressKey(todayKey, studyTarget);
      const raw = await AsyncStorage.getItem(key);
      const arr: TaskProgress[] = raw ? (JSON.parse(raw) as TaskProgress[]) : [];
      const filtered = Array.isArray(arr) ? arr.filter((p) => p.taskId !== taskId) : [];
      const seed: TaskProgress =
        candidate.type === 'arena_plays_wins_combo'
          ? reconcileArenaComboRow(candidate, undefined)
          : { taskId: candidate.id, current: 0, completed: false, claimed: false };
      filtered.push(seed);
      await AsyncStorage.setItem(key, JSON.stringify(filtered));
      void pruneDatedDailyTasksStorageKeys([key]).catch(() => {});
    });

    emitAppEvent('daily_task_rerolled', { oldTaskId: taskId, newTaskId: candidate.id });
    return { ok: true, newTaskId: candidate.id, cost: DAILY_TASK_REROLL_COST_SHARDS };
  } catch {
    return { ok: false, reason: 'unknown' };
  }
};

// ── Рантайм-доступность условных заданий второго поколения ─────────────
// Зеркалит replaceRecallTasksWhenNoDueItems: вызывается ПОСЛЕ базовых замен
// в getTodayTasksSafe, уважает usedIds и не создаёт дублей по типу.
const CONDITIONAL_DAILY_TASK_TYPES: ReadonlySet<TaskType> = new Set([
  'comeback_lesson', 'revision_lesson', 'streak_freeze_use',
]);

// Безопасные замены для условных заданий (всегда выполнимы, как RECALL_TASK_FALLBACK_IDS).
const CONDITIONAL_TASK_FALLBACK_IDS: Record<string, readonly string[]> = {
  cb1: ['ta2', 'ta1', 'ot1', 'cs1'],
  rv1: ['ta1', 'ta8', 'ot1', 'cs1'],
  rv2: ['ta2', 'ta1', 'ta8', 'cs1'],
  sf1: ['ta1', 'ot1', 'cs1', 'ta8'],
};

const COMEBACK_LESSON_MIN_MISSED_DAYS = 3;
const REVISION_LESSON_MIN_AGE_DAYS = 7;
// Уроки в контенте нумеруются 1..32 (как в cloud_sync SYNC_KEYS).
const REVISION_LESSON_SCAN_MAX_LESSON_ID = 32;

const isWeekendToday = (): boolean => {
  const day = new Date().getDay();
  return day === 0 || day === 6;
};

/** Полных дней между двумя YYYY-MM-DD ключами; 0 при невалидной/будущей дате. */
const daysBetweenDateKeys = (fromKey: string, toKey: string): number => {
  const from = Date.parse(`${fromKey}T00:00:00Z`);
  const to = Date.parse(`${toKey}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  const diff = Math.floor((to - from) / 86_400_000);
  return diff > 0 ? diff : 0;
};

/** comeback_lesson доступен только в день возвращения после 3+ дней перерыва
 *  (ключ last_active_date — тот же, что читает boons/comeback). */
const isComebackLessonAvailable = async (): Promise<boolean> => {
  try {
    const lastActive = await AsyncStorage.getItem('last_active_date');
    if (!lastActive) return false;
    return daysBetweenDateKeys(lastActive, getTodayKey()) >= COMEBACK_LESSON_MIN_MISSED_DAYS;
  } catch {
    return false;
  }
};

/** revision_lesson доступен, только если есть урок, пройденный 7+ дней назад.
 *  Бутстрэп: уроки с pass_count>0 без метки времени (пройдены до её появления)
 *  считаем «старыми», иначе задание было бы мёртвым первые 7 дней после релиза. */
const hasRevisionEligibleLesson = async (studyTarget?: RuntimeStudyTarget): Promise<boolean> => {
  try {
    const ids = Array.from({ length: REVISION_LESSON_SCAN_MAX_LESSON_ID }, (_, i) => i + 1);
    const [completedRows, passRows] = await Promise.all([
      AsyncStorage.multiGet(ids.map((id) => lessonLastCompletedAtKey(id, studyTarget))),
      AsyncStorage.multiGet(ids.map((id) => lessonPassCountKey(id, studyTarget))),
    ]);
    const todayKey = getTodayKey();
    for (let i = 0; i < ids.length; i += 1) {
      const completedAt = completedRows[i]?.[1];
      if (completedAt && daysBetweenDateKeys(completedAt, todayKey) >= REVISION_LESSON_MIN_AGE_DAYS) return true;
      const passCount = parseInt(passRows[i]?.[1] ?? '0', 10) || 0;
      if (!completedAt && passCount > 0) return true;
    }
  } catch {
    // fall through — считаем недоступным
  }
  return false;
};

/** streak_freeze_use доступен, когда есть что защищать (стрик > 0) и чем платить
 *  (Premium или осколков хватает на getStreakFreezeCostShards()). */
const isStreakFreezeTaskAvailable = async (isPremium: boolean): Promise<boolean> => {
  try {
    const streak = parseInt((await AsyncStorage.getItem('streak_count')) ?? '0', 10) || 0;
    if (streak <= 0) return false;
    if (isPremium) return true;
    return (await getShardsBalance()) >= getStreakFreezeCostShards();
  } catch {
    return false;
  }
};

/**
 * Подменяет условные задания, которые сегодня невыполнимы:
 * — comeback_lesson: сегодня не день возвращения (перерыв < 3 дней);
 * — revision_lesson: нет урока, пройденного 7+ дней назад;
 * — streak_freeze_use: заморозка недоступна (нет стрика / нечем платить).
 * club_attend НЕ подменяем: клиент не может надёжно определить доступность
 * клуба (feature-flag/сессии), а заход на экран клуба возможен всегда.
 */
const replaceConditionallyUnavailableDailyTasks = async (
  tasks: DailyTask[],
  isPremium: boolean,
  studyTarget?: RuntimeStudyTarget,
): Promise<DailyTask[]> => {
  if (!tasks.some((task) => CONDITIONAL_DAILY_TASK_TYPES.has(task.type))) return tasks;

  const availability: Partial<Record<TaskType, boolean>> = {};
  if (tasks.some((task) => task.type === 'comeback_lesson')) {
    availability.comeback_lesson = await isComebackLessonAvailable();
  }
  if (tasks.some((task) => task.type === 'revision_lesson')) {
    availability.revision_lesson = await hasRevisionEligibleLesson(studyTarget);
  }
  if (tasks.some((task) => task.type === 'streak_freeze_use')) {
    availability.streak_freeze_use = await isStreakFreezeTaskAvailable(isPremium);
  }

  const usedIds = new Set(
    tasks.filter((task) => !CONDITIONAL_DAILY_TASK_TYPES.has(task.type)).map((task) => task.id),
  );
  const usedTypes = new Set(
    tasks.filter((task) => !CONDITIONAL_DAILY_TASK_TYPES.has(task.type)).map((task) => task.type),
  );

  return tasks.map((task) => {
    if (!CONDITIONAL_DAILY_TASK_TYPES.has(task.type)) return task;
    if (availability[task.type] !== false) {
      usedIds.add(task.id);
      usedTypes.add(task.type);
      return task;
    }
    const fallbackIds = CONDITIONAL_TASK_FALLBACK_IDS[task.id] ?? ['ta1', 'ta8', 'ot1', 'cs1'];
    for (const id of fallbackIds) {
      const fallback = ALL_TASKS.find((candidate) => candidate.id === id);
      if (!fallback || usedIds.has(id) || usedTypes.has(fallback.type)) continue;
      if (!dailyTaskAvailableForStudyTarget(fallback, studyTarget)) continue;
      usedIds.add(id);
      usedTypes.add(fallback.type);
      return fallback;
    }
    usedIds.add(task.id);
    usedTypes.add(task.type);
    return task;
  });
};

/**
 * weekend_marathon: в сб/вс (локальный день недели) wm1 добавляется ЧЕТВЁРТЫМ
 * заданием. Экран вызовов рендерит список любой длины (sortedTasks.map — как у
 * опроса-4-го-задания), обрезки до тройки нет. Порог «бонуса за день» считает
 * все N карточек — в выходной это 4 из 4 (осознанное усложнение выходного дня).
 */
const appendWeekendMarathonTask = (tasks: DailyTask[], studyTarget?: RuntimeStudyTarget): DailyTask[] => {
  if (!isWeekendToday()) return tasks;
  if (tasks.some((task) => task.type === 'weekend_marathon')) return tasks;
  const wm = ALL_TASKS.find((task) => task.id === 'wm1');
  if (!wm || !dailyTaskAvailableForStudyTarget(wm, studyTarget)) return tasks;
  return [...tasks, wm];
};

/**
 * Async версия getTodayTasks с тремя проверками:
 * 1. Если уровень пользователя ниже minLevel задания — заменяет на более лёгкое.
 * 2. Если пользователь Premium — freeOnly задания (energy_spend) заменяются.
 * 3. Если все глаголы уже выучены — заменяет verb_learned на total_answers.
 */
export const getTodayTasksSafe = async (studyTarget?: RuntimeStudyTarget): Promise<DailyTask[]> => {
  const [playerLevel, isPremium] = await Promise.all([getUserPlayerLevel(), getUserIsPremium()]);
  const adminOverride = await loadAdminTaskOverride(studyTarget);
  if (adminOverride) {
    const adminTasks = adminOverride.taskIds
      .map((id) => ALL_TASKS.find((t) => t.id === id))
      .filter((t): t is DailyTask => Boolean(t));
    // Admin QA override показываем ДОСЛОВНО: ротация retired-типов здесь не применяется,
    // иначе seed-пак (da2/da3 и т.п.) молча подменялся и QA проверял не те задания.
    return filterDailyTasksForStudyTarget(adminTasks, studyTarget);
  }
  // Выбираем набор заданий по тиру уровня игрока
  const baseTasks = getTodayTasksByLevel(playerLevel);

  // 0. User reroll: подменяем id выбранных юзером заданий ДО уровневых/premium фолбэков,
  //    потому что замена — это уже осознанный выбор и фолбэки не должны её ломать.
  const rerollState = await loadRerollStateRaw(studyTarget);
  const rerolledIds = applyRerollReplacements(baseTasks.map((t) => t.id), rerollState.replacements);
  let result: DailyTask[] = rerolledIds
    .map((id) => ALL_TASKS.find((t) => t.id === id))
    .filter((t): t is DailyTask => Boolean(t));

  // 1. Страховка: если задание требует более высокий уровень — подменяем
  result = result.map(task => {
    const required = task.minPlayerLevel ?? 1;
    if (playerLevel >= required) return task;
    const fallbackId = LEVEL_FALLBACKS[task.id];
    return (fallbackId ? ALL_TASKS.find(t => t.id === fallbackId) : undefined) ?? task;
  });

  // 2. Для Premium-пользователей: заменяем freeOnly задания (energy_spend → duel/recall)
  if (isPremium) {
    result = result.map(task => {
      if (!task.freeOnly) return task;
      const fallbackId = PREMIUM_FALLBACKS[task.id];
      return (fallbackId ? ALL_TASKS.find(t => t.id === fallbackId) : undefined) ?? task;
    });
  }

  result = await replaceRecallTasksWhenNoDueItems(result, studyTarget);
  result = await replaceTrainerTasksWhenQueueIsInsufficient(result, studyTarget);

  // 2. Replace words_learned when no unfinished vocabulary remains.
  if (result.some((task) => task.type === 'words_learned')) {
    const remainingWords = await countAvailableVocabularyWords(studyTarget);
    const usedIds = new Set(result.map((task) => task.id));
    result = result.map((task) => {
      if (task.type !== 'words_learned' || remainingWords >= task.target) return task;
      const fallbackId = WORDS_FALLBACKS[task.id];
      const fallback = fallbackId ? ALL_TASKS.find((candidate) => candidate.id === fallbackId) : undefined;
      if (!fallback || usedIds.has(fallback.id)) return task;
      usedIds.add(fallback.id);
      return fallback;
    });
  }

  // 3. Replace verb_learned when too few verbs remain.
  const hasVerbTask = result.some(t => t.type === 'verb_learned');
  if (!hasVerbTask) {
    result = await replaceConditionallyUnavailableDailyTasks(result, isPremium, studyTarget);
    return appendWeekendMarathonTask(
      filterDailyTasksForStudyTarget(replaceRetiredQuizArenaTasks(result), studyTarget),
      studyTarget,
    );
  }

  const raw = await AsyncStorage.getItem(irregularVerbsGlobalKey(studyTarget));
  const learned: Record<string, number> = raw ? JSON.parse(raw) : {};
  const learnedCount = Object.values(learned).filter(v => v >= 3).length;

  const { IRREGULAR_VERBS_BY_LESSON } = await import('./irregular_verbs_data');
  const totalVerbs = Object.values(IRREGULAR_VERBS_BY_LESSON).reduce((s, arr) => s + arr.length, 0);
  const remaining = totalVerbs - learnedCount;

  result = result.map(task => {
    if (task.type !== 'verb_learned') return task;
    if (remaining >= task.target) return task;
    const fallbackId = VERB_FALLBACKS[task.id];
    return (fallbackId ? ALL_TASKS.find(t => t.id === fallbackId) : undefined) ?? task;
  });

  result = await replaceConditionallyUnavailableDailyTasks(result, isPremium, studyTarget);
  return appendWeekendMarathonTask(
    filterDailyTasksForStudyTarget(replaceRetiredQuizArenaTasks(result), studyTarget),
    studyTarget,
  );
};

const STORAGE_PREFIX = 'daily_tasks_';

/**
 * Merges AsyncStorage progress with the current task list from getTodayTasksSafe().
 * If the set of task ids changes (level tier, premium, verb fallbacks, etc.), raw storage
 * can keep stale ids: the UI would show 0/… on every card while the header still counts
 * orphan rows. This keeps one row per current task and drops rows for ids no longer in the set.
 */
/** Сколько наград уже забрано — только по task id из текущего списка (игнор «лишних» строк в progress). */
export const countClaimedForTaskList = (tasks: DailyTask[], progress: TaskProgress[]): number => {
  if (tasks.length === 0) return 0;
  const ids = new Set(tasks.map(x => x.id));
  return progress.filter(p => p.claimed && ids.has(p.taskId)).length;
};

export const rerollTodayDailyTaskSet = async (
  studyTarget?: RuntimeStudyTarget,
): Promise<DailyTaskSetRerollResult> => {
  try {
    const left = await getDailyRerollsLeftToday(studyTarget);
    if (left <= 0) return { ok: false, reason: 'limit_reached' };

    const [playerLevel, isPremium] = await Promise.all([getUserPlayerLevel(), getUserIsPremium()]);
    const tasks = await getTodayTasksSafe(studyTarget);
    if (tasks.length === 0) return { ok: false, reason: 'task_not_found' };

    const progress = await loadTodayProgress(tasks, studyTarget);
    const hasStartedTask = progress.some((p) => (
      tasks.some((task) => task.id === p.taskId) && (p.current > 0 || p.completed || p.claimed)
    ));
    if (hasStartedTask) return { ok: false, reason: 'task_already_completed' };

    const usedIds = tasks.map((task) => task.id);
    const replacements: Record<string, string> = {};
    const replacementTasks: DailyTask[] = [];

    for (const task of tasks) {
      const candidate = await pickRerollCandidate(task.id, usedIds, playerLevel, isPremium, studyTarget);
      if (!candidate) return { ok: false, reason: 'no_candidates' };
      replacements[task.id] = candidate.id;
      replacementTasks.push(candidate);
      usedIds.push(candidate.id);
    }

    await withStorageLock(async () => {
      const state = await loadRerollStateRaw(studyTarget);
      await saveRerollState({
        dayKey: getTodayKey(),
        replacements: { ...state.replacements, ...replacements },
      }, studyTarget);

      const key = dailyTasksProgressKey(getTodayKey(), studyTarget);
      const raw = await AsyncStorage.getItem(key);
      const arr: TaskProgress[] = raw ? (JSON.parse(raw) as TaskProgress[]) : [];
      const oldIds = new Set(tasks.map((task) => task.id));
      const filtered = Array.isArray(arr) ? arr.filter((p) => !oldIds.has(p.taskId)) : [];
      const seeded = replacementTasks.map((task) => (
        task.type === 'arena_plays_wins_combo'
          ? reconcileArenaComboRow(task, undefined)
          : { taskId: task.id, current: 0, completed: false, claimed: false }
      ));
      await AsyncStorage.setItem(key, JSON.stringify([...filtered, ...seeded]));
      void pruneDatedDailyTasksStorageKeys([key]).catch(() => {});
    });

    emitAppEvent('daily_tasks_set_rerolled', {
      oldTaskIds: tasks.map((task) => task.id),
      newTaskIds: replacementTasks.map((task) => task.id),
      studyTarget,
    });
    return { ok: true, tasks: replacementTasks };
  } catch {
    return { ok: false, reason: 'unknown' };
  }
};

/**
 * Награда «за все задания дня» готова к выдаче.
 *
 * По умолчанию требует ВСЕ задания (N из N — историческое поведение для тройки).
 * `requiredCount` позволяет ослабить порог до «любые K из N»: это нужно, когда
 * в набор добавлено бонусное 4-е задание (опрос за осколки) — тогда достаточно
 * выполнить любые 3 из 4, чтобы забрать награду (опрос можно, но не обязательно).
 * Значение клампится в [1, tasks.length], поэтому старые вызовы без параметра
 * ведут себя как раньше.
 */
export const areAllDailyTaskObjectivesDone = (
  tasks: DailyTask[],
  progress: TaskProgress[],
  requiredCount?: number,
): boolean => {
  if (tasks.length === 0) return false;
  const doneCount = tasks.reduce((n, task) => {
    const row = progress.find((p) => p.taskId === task.id);
    return row?.completed === true || row?.claimed === true ? n + 1 : n;
  }, 0);
  const required = Math.max(1, Math.min(requiredCount ?? tasks.length, tasks.length));
  return doneCount >= required;
};

/**
 * «Фраза/слово дня» (read/save) публикуется под разными id (dpr1, dpr2, …) в сетах заданий.
 * Можно забрать награду в тосте по одному id, а в тройнике сейчас — другой id: без этой
 * синхронизации карточка остаётся с «Забрать», хотя награда за этот день уже получена.
 */
const TYPES_CLAIM_SYNC_ACROSS_ALT_IDS: ReadonlySet<TaskType> = new Set(['daily_phrase_read', 'daily_phrase_save']);

const rowTaskType = (currentTasks: DailyTask[], taskId: string): TaskType | undefined =>
  currentTasks.find(t => t.id === taskId)?.type ?? ALL_TASKS.find(t => t.id === taskId)?.type;

/**
 * Пометить claim по taskId; для daily_phrase_read/save — и все завершённые строки того же типа
 * (dpr1/dpr2/… в storage могут вести себя как дубликаты, иначе на экране остаётся «Забрать»).
 */
const applyClaimForTaskToProgress = (
  progress: TaskProgress[],
  currentTasks: DailyTask[],
  taskId: string,
  task: DailyTask,
): TaskProgress[] => {
  const syncType = TYPES_CLAIM_SYNC_ACROSS_ALT_IDS.has(task.type) ? task.type : null;
  return progress.map(p => {
    if (p.taskId === taskId) {
      return { ...p, claimed: true };
    }
    if (syncType && p.completed) {
      const t = rowTaskType(currentTasks, p.taskId);
      if (t === syncType) {
        return { ...p, claimed: true };
      }
    }
    return p;
  });
};

/** Составное задание arena_plays_wins_combo: выполнено при plays≥minPlays и wins≥minWins. */
const reconcileArenaComboRow = (task: DailyTask, p?: TaskProgress): TaskProgress => {
  const req = getArenaComboRequirement(task);
  const claimed = p?.claimed ?? false;
  const playsRaw = p?.comboPlays ?? p?.current ?? 0;
  const cap = req.minPlays + 15;
  const plays = Math.min(cap, Math.max(0, Math.round(playsRaw)));
  const wins = Math.min(cap, Math.max(0, Math.round(p?.comboWins ?? 0)));
  const currentDisplay = Math.min(plays, req.minPlays);
  const completed = claimed || (plays >= req.minPlays && wins >= req.minWins);
  return { taskId: task.id, current: currentDisplay, comboPlays: plays, comboWins: wins, completed, claimed };
};

const reconcileProgressToTasks = (stored: TaskProgress[], tasks: DailyTask[]): TaskProgress[] => {
  const mainRaw = tasks.map(t => {
    const p = stored.find(s => s.taskId === t.id);
    if (!p) {
      return t.type === 'arena_plays_wins_combo'
        ? reconcileArenaComboRow(t, undefined)
        : { taskId: t.id, current: 0, completed: false, claimed: false };
    }
    if (t.type === 'arena_plays_wins_combo') {
      return reconcileArenaComboRow(t, p);
    }
    const current = Math.min(Math.max(0, p.current), t.target);
    const claimed = p.claimed;
    const completed = claimed || current >= t.target;
    return { taskId: t.id, current, completed, claimed };
  });
  const main = mainRaw.map((row, i) => {
    const def = tasks[i];
    if (!def || !TYPES_CLAIM_SYNC_ACROSS_ALT_IDS.has(def.type) || !row.completed || row.claimed) {
      return row;
    }
    const hasSiblingClaimedElsewhere = stored.some(s => {
      if (s.taskId === row.taskId || !s.claimed) return false;
      const od = ALL_TASKS.find(t => t.id === s.taskId);
      return !!od && od.type === def.type;
    });
    if (!hasSiblingClaimedElsewhere) return row;
    return { ...row, claimed: true, completed: true };
  });
  const inCurrent = new Set(main.map(m => m.taskId));
  // Сохраняем строки для id, которые выпали из «сегодняшнего тройника» (другой уровень, Premium, фоллбэк глаголов
  // и т.д.). Иначе loadTodayProgress пересохранял бы только текущий список, а «Забрать» в глобальном тосте
  // смотрел бы пустоту: eligible = false, тост завис.
  const extras: TaskProgress[] = [];
  for (const s of stored) {
    if (inCurrent.has(s.taskId)) continue;
    const def = ALL_TASKS.find(t => t.id === s.taskId);
    if (!def) continue;
    if (def.type === 'arena_plays_wins_combo') {
      extras.push(reconcileArenaComboRow(def, s));
      continue;
    }
    const current = Math.min(Math.max(0, s.current), def.target);
    const claimed = s.claimed;
    const completed = claimed || current >= def.target;
    extras.push({ taskId: s.taskId, current, completed, claimed });
  }
  return extras.length > 0 ? [...main, ...extras] : main;
};

/**
 * @param tasksForReconcile — if provided, must be the same list the UI used from getTodayTasksSafe()
 *   so progress rows align with visible cards (avoids two async getToday calls diverging).
 */
export const loadTodayProgress = async (
  tasksForReconcile?: DailyTask[],
  studyTarget?: RuntimeStudyTarget,
): Promise<TaskProgress[]> => {
  try {
    const tasks = tasksForReconcile ?? (await getTodayTasksSafe(studyTarget));
    if (tasks.length === 0) {
      return [];
    }

    const key = dailyTasksProgressKey(getTodayKey(), studyTarget);
    const raw = await AsyncStorage.getItem(key);
    let stored: TaskProgress[] = [];
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) stored = parsed as TaskProgress[];
      } catch { stored = []; }
    }

    const reconciled = reconcileProgressToTasks(stored, tasks);
    const newJson = JSON.stringify(reconciled);
    if (newJson !== raw) {
      await AsyncStorage.setItem(key, newJson);
      void pruneDatedDailyTasksStorageKeys([key]).catch(() => {});
    }
    return reconciled;
  } catch {
    return [];
  }
};

export const saveTodayProgress = async (
  progress: TaskProgress[],
  studyTarget?: RuntimeStudyTarget,
): Promise<void> => {
  try {
    const key = dailyTasksProgressKey(getTodayKey(), studyTarget);
    await AsyncStorage.setItem(key, JSON.stringify(progress));
    void pruneDatedDailyTasksStorageKeys([key]).catch(() => {});
  } catch (e) {
    if (__DEV__) console.warn('[daily_tasks]', e);
  }
};

// ── Мета-задания дня (early_all_done / last_chance / polyglot_day) ───────
const META_DAILY_TASK_TYPES: ReadonlySet<TaskType> = new Set([
  'early_all_done', 'last_chance', 'polyglot_day',
]);

/** Общий (unscoped) ключ полиглот-дня: какие языки уже были активны сегодня. */
const POLYGLOT_DAY_STORAGE_KEY = 'daily_polyglot_v1';

type PolyglotDayState = { day: string; targets: string[] };

const loadPolyglotDayState = async (): Promise<PolyglotDayState> => {
  try {
    const raw = await AsyncStorage.getItem(POLYGLOT_DAY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.day === getTodayKey() && Array.isArray(parsed.targets)) {
      return {
        day: parsed.day,
        targets: parsed.targets.filter((t: unknown): t is string => typeof t === 'string'),
      };
    }
  } catch {
    // fall through — сбрасываем на новый день
  }
  return { day: getTodayKey(), targets: [] };
};

const savePolyglotDayState = async (state: PolyglotDayState): Promise<void> => {
  try {
    await AsyncStorage.setItem(POLYGLOT_DAY_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    if (__DEV__) console.warn('[daily_tasks]', e);
  }
};

type MetaDailyTaskEvaluation = {
  progress: TaskProgress[];
  newlyCompletedTaskIds: string[];
};

/**
 * Пост-проход после обычных инкрементов прогресса (в updateTaskProgress и
 * updateMultipleTaskProgress, до записи):
 * — polyglot_day: daily_active/lesson_complete отмечают язык в общем ключе дня,
 *   прогресс (в скоупе вызывающего target) = числу разных языков (max 2);
 * — last_chance: в этом же обновлении завершилось ЛЮБОЕ ДРУГОЕ задание и сейчас
 *   23:00–00:00 UTC;
 * — early_all_done: все ОСТАЛЬНЫЕ задания дня выполнены и локальный час < 12.
 * Прогресс мета-заданий пишется напрямую (не через updateTaskProgress), поэтому
 * рекурсии нет. Ничего не делает, если в сегодняшнем списке нет мета-типов.
 */
const evaluateMetaDailyTasks = async (
  tasks: DailyTask[],
  progress: TaskProgress[],
  updates: readonly { type: TaskType; increment?: number }[],
  justCompletedTaskIds: readonly string[],
  studyTarget?: RuntimeStudyTarget,
): Promise<MetaDailyTaskEvaluation> => {
  if (!tasks.some((task) => META_DAILY_TASK_TYPES.has(task.type))) {
    return { progress, newlyCompletedTaskIds: [] };
  }
  let next = progress;
  const newlyCompleted: string[] = [];
  const applyRow = (taskId: string, mutate: (row: TaskProgress) => TaskProgress) => {
    next = next.map((row) => (row.taskId === taskId ? mutate(row) : row));
  };

  // polyglot_day: отмечаем язык активности в общем ключе дня.
  const incrementedTypes = new Set(
    updates.filter((u) => (u.increment ?? 1) > 0).map((u) => u.type),
  );
  if (incrementedTypes.has('daily_active') || incrementedTypes.has('lesson_complete')) {
    const polyglotTasks = tasks.filter((task) => task.type === 'polyglot_day');
    if (polyglotTasks.length > 0) {
      const state = await loadPolyglotDayState();
      const target = storageStudyTarget(studyTarget);
      if (!state.targets.includes(target)) state.targets.push(target);
      await savePolyglotDayState(state);
      const distinct = Math.min(2, new Set(state.targets).size);
      for (const task of polyglotTasks) {
        const row = next.find((r) => r.taskId === task.id);
        if (!row || row.completed) continue;
        const current = Math.min(task.target, Math.max(row.current, distinct));
        const completed = current >= task.target;
        applyRow(task.id, (r) => ({ ...r, current, completed }));
        if (completed) newlyCompleted.push(task.id);
      }
    }
  }

  // last_chance: любое ДРУГОЕ задание завершено в 23:00–00:00 UTC.
  if (new Date().getUTCHours() === 23) {
    const justCompletedOther = justCompletedTaskIds.some((id) => {
      const task = tasks.find((t) => t.id === id);
      return !!task && task.type !== 'last_chance';
    });
    if (justCompletedOther) {
      for (const task of tasks) {
        if (task.type !== 'last_chance') continue;
        const row = next.find((r) => r.taskId === task.id);
        if (!row || row.completed) continue;
        applyRow(task.id, (r) => ({ ...r, current: task.target, completed: true }));
        newlyCompleted.push(task.id);
      }
    }
  }

  // early_all_done: все остальные вызовы дня закрыты до 12:00 локального времени.
  if (new Date().getHours() < 12) {
    for (const task of tasks) {
      if (task.type !== 'early_all_done') continue;
      const row = next.find((r) => r.taskId === task.id);
      if (!row || row.completed) continue;
      const allOthersDone = tasks.every((other) => {
        if (other.id === task.id) return true;
        const otherRow = next.find((r) => r.taskId === other.id);
        return otherRow?.completed === true || otherRow?.claimed === true;
      });
      if (!allOthersDone) continue;
      applyRow(task.id, (r) => ({ ...r, current: task.target, completed: true }));
      newlyCompleted.push(task.id);
    }
  }

  return { progress: next, newlyCompletedTaskIds: newlyCompleted };
};

// ── Главная функция — обновить прогресс задания ───────────────────────────
export const updateTaskProgress = async (
  type: TaskType,
  increment: number = 1,
  studyTarget?: RuntimeStudyTarget,
): Promise<{ completed: TaskProgress | null; allProgress: TaskProgress[] }> => {
  const tasks = await getTodayTasksSafe(studyTarget);
  const progress = await loadTodayProgress(tasks, studyTarget);
  let newlyCompleted: TaskProgress | null = null;
  const completedTaskIds: string[] = [];

  const updated = progress.map(p => {
    const task = tasks.find(t => t.id === p.taskId);
    if (!task || task.type !== type || p.completed) return p;
    const newCurrent = Math.round(Math.min(p.current + increment, task.target) * 10) / 10;
    const nowCompleted = newCurrent >= task.target;
    if (nowCompleted && !p.completed) {
        newlyCompleted = { ...p, current: newCurrent, completed: true };
        completedTaskIds.push(task.id);
      }
    return { ...p, current: newCurrent, completed: nowCompleted };
  });

  // Мета-постпроход (early_all_done / last_chance / polyglot_day) — из того же
  // снапшота прогресса, отдельных трекинг-вызовов не требует.
  const meta = await evaluateMetaDailyTasks(tasks, updated, [{ type, increment }], completedTaskIds, studyTarget);
  await saveTodayProgress(meta.progress, studyTarget);
  for (const taskId of completedTaskIds) {
    emitDailyTaskCompleted(taskId, studyTarget);
  }
  for (const taskId of meta.newlyCompletedTaskIds) {
    emitDailyTaskCompleted(taskId, studyTarget);
  }
  return { completed: newlyCompleted, allProgress: meta.progress };
};

// ── Сброс прогресса задания (например при ошибке в серии) ─────────────────
export const resetTaskProgress = async (
  type: TaskType,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> => {
  const tasks = await getTodayTasksSafe(studyTarget);
  const progress = await loadTodayProgress(tasks, studyTarget);

  const updated = progress.map(p => {
    const task = tasks.find(t => t.id === p.taskId);
    if (!task || task.type !== type || p.completed || p.claimed) return p;
    if (task.type === 'arena_plays_wins_combo') {
      return { ...p, current: 0, comboPlays: 0, comboWins: 0, completed: false };
    }
    return { ...p, current: 0 };
  });

  await saveTodayProgress(updated, studyTarget);
};

// ── Атомарный сброс нескольких типов + опциональные инкременты (без race condition) ──
export const resetAndUpdateTaskProgress = async (
  resets: TaskType[],
  updates: { type: TaskType; increment?: number }[] = [],
  studyTarget?: RuntimeStudyTarget,
): Promise<void> => {
  const tasks = await getTodayTasksSafe(studyTarget);
  let progress = await loadTodayProgress(tasks, studyTarget);
  const wasCompleted = new Set(progress.filter(p => p.completed).map(p => p.taskId));

  // Сначала сбрасываем
  for (const type of resets) {
    progress = progress.map(p => {
      const task = tasks.find(t => t.id === p.taskId);
      if (!task || task.type !== type || p.completed || p.claimed) return p;
      if (task.type === 'arena_plays_wins_combo') {
        return { ...p, current: 0, comboPlays: 0, comboWins: 0, completed: false };
      }
      return { ...p, current: 0 };
    });
  }

  // Затем применяем инкременты
  for (const { type, increment = 1 } of updates) {
    progress = progress.map(p => {
      const task = tasks.find(t => t.id === p.taskId);
      if (!task || task.type !== type || p.completed) return p;
      const newCurrent = Math.round(Math.min(p.current + increment, task.target) * 10) / 10;
      return { ...p, current: newCurrent, completed: newCurrent >= task.target };
    });
  }

  await saveTodayProgress(progress, studyTarget);

  for (const p of progress) {
    if (p.completed && !wasCompleted.has(p.taskId)) {
      emitDailyTaskCompleted(p.taskId, studyTarget);
    }
  }
};

// ── Отметить задание как полученное (claimed) ─────────────────────────────
export const claimTask = async (
  taskId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> => {
  return withStorageLock(async () => {
    const tasks = await getTodayTasksSafe(studyTarget);
    const progress = await loadTodayProgress(tasks, studyTarget);
    const pRow = progress.find(p => p.taskId === taskId);
    const task = tasks.find(t => t.id === taskId) ?? ALL_TASKS.find(t => t.id === taskId);
    if (!pRow || !task || pRow.claimed || !pRow.completed) {
      return false;
    }
    const updated = applyClaimForTaskToProgress(progress, tasks, taskId, task);
    await saveTodayProgress(updated, studyTarget);
    return true;
  });
};

export type ClaimTaskWithRewardOptions = {
  /**
   * Fallback, если getTodayTasksSafe() вернул [] или упал (редко). Обычно клейм всегда идёт
   * по свежему safe — иначе после смены тира/премиума старый снимок экрана ломал проверку.
   */
  tasksForClaim?: DailyTask[];
  studyTarget?: RuntimeStudyTarget;
  onReserved?: () => void;
};

export const claimTaskWithReward = async (
  taskId: string,
  grantReward: () => Promise<number>,
  options?: ClaimTaskWithRewardOptions,
): Promise<{ claimed: boolean; awardedXp: number }> => {
  /**
   * Источник правды — свежий getTodayTasksSafe() (тир уровня / Premium / реролл / фолбэки).
   * Снапшот с экрана (tasksForClaim) только если safe вернул пусто — иначе после смены тира в проде
   * «Забрать» молча не проходило: UI ещё с старыми id, а storage уже согласован с новым набором.
   */
  const resolveTasks = async (): Promise<DailyTask[]> => {
    let fresh: DailyTask[] = [];
    try {
      fresh = await getTodayTasksSafe(options?.studyTarget);
    } catch {
      fresh = [];
    }
    if (fresh.length > 0) return fresh;
    if (options?.tasksForClaim && options.tasksForClaim.length > 0) {
      return options.tasksForClaim;
    }
    return [];
  };
  // Нельзя держать storage lock на время registerXP (сеть/AsyncStorage) — иначе
  // updateMultipleTaskProgress из урока перезаписывает прогресс и «Забрать» молча не срабатывает.
  const reservation = await withStorageLock(async (): Promise<'fresh' | 'already' | 'blocked'> => {
    const tasks = await resolveTasks();
    const progress = await loadTodayProgress(tasks, options?.studyTarget);
    const current = progress.find(p => p.taskId === taskId);
    const task = tasks.find(t => t.id === taskId) ?? ALL_TASKS.find(t => t.id === taskId);
    if (!current || !task) return 'blocked';
    if (current.claimed) return 'already';
    if (!current.completed) return 'blocked';
    const updated = applyClaimForTaskToProgress(progress, tasks, taskId, task);
    await saveTodayProgress(updated, options?.studyTarget);
    void bumpDailyTaskClaimed(options?.studyTarget);
    return 'fresh';
  });
  if (reservation === 'blocked') {
    return { claimed: false, awardedXp: 0 };
  }
  if (reservation === 'already') {
    return { claimed: true, awardedXp: 0 };
  }
  emitDailyTaskRewardClaimed(taskId, options?.studyTarget);
  try { options?.onReserved?.(); } catch {}

  let awardedXp = 0;
  try {
    awardedXp = await grantReward();
  } catch {
    return { claimed: true, awardedXp: 0 };
  }
  return { claimed: true, awardedXp: Math.max(0, Math.round(awardedXp)) };
};

// ── Батч-обновление нескольких типов за одну операцию чтения/записи ──────────
// Используй вместо нескольких updateTaskProgress подряд — иначе race condition
export const updateMultipleTaskProgress = async (
  updates: { type: TaskType; increment?: number }[],
  opts?: { pvpArenaMatchFinished?: { won: boolean }; studyTarget?: RuntimeStudyTarget },
): Promise<void> => {
  const completedTaskIds = new Set<string>();
  try {
    await withStorageLock(async () => {
      const tasks = await getTodayTasksSafe(opts?.studyTarget);
      let progress = await loadTodayProgress(tasks, opts?.studyTarget);

      // Safety: if progress is empty but tasks exist, reinitialize rather than overwrite with empty
      if (progress.length === 0 && tasks.length > 0) {
        progress = tasks.map(t =>
          t.type === 'arena_plays_wins_combo'
            ? reconcileArenaComboRow(t, undefined)
            : { taskId: t.id, current: 0, completed: false, claimed: false },
        );
      }

      for (const { type, increment = 1 } of updates) {
        progress = progress.map(p => {
          const task = tasks.find(t => t.id === p.taskId);
          if (!task || task.type !== type || p.completed) return p;
          const newCurrent = Math.round(Math.min(p.current + increment, task.target) * 10) / 10;
          const nowCompleted = newCurrent >= task.target;
          if (nowCompleted) {
            completedTaskIds.add(task.id);
          }
          return { ...p, current: newCurrent, completed: nowCompleted };
        });
      }

      if (opts?.pvpArenaMatchFinished) {
        const { won } = opts.pvpArenaMatchFinished;
        progress = progress.map(p => {
          const task = tasks.find(t => t.id === p.taskId);
          if (!task || task.type !== 'arena_plays_wins_combo' || p.completed) return p;
          const req = getArenaComboRequirement(task);
          const plays = Math.min(30, (p.comboPlays ?? p.current ?? 0) + 1);
          const wins = (p.comboWins ?? 0) + (won ? 1 : 0);
          const completed = plays >= req.minPlays && wins >= req.minWins;
          if (completed && !p.completed) {
            completedTaskIds.add(task.id);
          }
          return { ...p, comboPlays: plays, comboWins: wins, current: Math.min(plays, req.minPlays), completed };
        });
      }

      // Мета-постпроход (early_all_done / last_chance / polyglot_day) — до записи,
      // чтобы сохранить одним махом вместе с обычными инкрементами.
      const meta = await evaluateMetaDailyTasks(tasks, progress, updates, [...completedTaskIds], opts?.studyTarget);
      progress = meta.progress;
      meta.newlyCompletedTaskIds.forEach((taskId) => completedTaskIds.add(taskId));

      // Only save if progress has entries (prevent overwriting with empty array)
      if (progress.length > 0) {
        await saveTodayProgress(progress, opts?.studyTarget);
      }
    });
    for (const taskId of completedTaskIds) {
      emitDailyTaskCompleted(taskId, opts?.studyTarget);
    }
  } catch (error) {
    DebugLogger.error('daily_tasks:updateMultipleTaskProgress', error, 'warning');
    const now = Date.now();
    if (now - _lastDailyProgressWriteErrorToastAt >= DAILY_PROGRESS_WRITE_ERR_TOAST_COOLDOWN_MS) {
      _lastDailyProgressWriteErrorToastAt = now;
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось сохранить вызовы. Попробуй ещё раз.',
          uk: 'Не вдалося зберегти виклики. Спробуй ще раз.',
          es: 'No se pudo guardar el progreso. Inténtalo de nuevo.',
          'pt-BR': 'Não foi possível salvar o progresso das tarefas. Tente de novo.',
          vi: 'Không thể lưu tiến độ nhiệm vụ. Hãy thử lại.',
          id: 'Gagal menyimpan progres tugas. Coba lagi.',
          tr: 'Görev ilerlemesi kaydedilemedi. Tekrar dene.',
          pl: 'Nie udało się zapisać postępu zadań. Spróbuj ponownie.',
        }),
      );
    }
  }
};

export const getTaskById = (id: string): DailyTask | undefined =>
  ALL_TASKS.find(t => t.id === id);

export type DailyTaskWithSpanishCopy = DailyTask & {
  titleES: string;
  descES: string;
};

export const withDailyTaskSpanishCopy = (task: DailyTask): DailyTaskWithSpanishCopy => {
  const es = DAILY_TASK_STRINGS_ES[task.id];
  return {
    ...task,
    titleES: task.titleES ?? es?.title ?? task.titleRU,
    descES: task.descES ?? es?.desc ?? task.descRU,
  };
};

export const getAllDailyTasksWithSpanishCopy = (): DailyTaskWithSpanishCopy[] =>
  ALL_TASKS.map(withDailyTaskSpanishCopy);

export { ALL_TASKS };


/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
