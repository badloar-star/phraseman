/**
 * Контракт задачи блока «Сегодня» новой Главной (2.0, D49 / PM-259).
 * Источник данных — хук useTodayTasks() программы 2.0; здесь только форма,
 * чтобы вид не зависел от того, как задачи считаются.
 */
// зачем 'spire_steps' (PM-280, D49 + TOWER.md): «Пройди N ступеней Шпиля» — тип
// задачи в пуле «Сегодня». progress = ступени, ПРОЙДЕННЫЕ сегодня (локальный
// день), target = N, route = экран Шпиля (PM-279). Счёт и выдача — useTodayTasks (PM-259).
export type TodayTaskKind = 'lesson' | 'dialog' | 'cards' | 'video' | 'mistakes' | 'spire_steps';

export type TodayTask = Readonly<{
  id: string;
  kind: TodayTaskKind;
  title: string;
  subtitle?: string;
  progress: number;
  target: number;
  done: boolean;
  rewardCoins: number;
  route: string;
}>;

// зачем (D143): пустые места ряда занимают другие готовые разделы.
export type HomeFeatureTileKey = 'lessons' | 'dialogs' | 'cards' | 'spire' | 'video_packs' | 'mistakes' | 'saved';

export type HomeFeatureTile = Readonly<{
  key: HomeFeatureTileKey;
  title: string;
  subtitle: string;
  onPress: () => void;
  // зачем: плейсхолдер-арт 2.0 (assets/images/v2), пока Codex не нарисовал финальные картинки.
  art: number;
}>;
