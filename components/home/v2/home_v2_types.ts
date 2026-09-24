/**
 * Контракт задачи блока «Сегодня» новой Главной (2.0, D49 / PM-259).
 * Источник данных — хук useTodayTasks() программы 2.0; здесь только форма,
 * чтобы вид не зависел от того, как задачи считаются.
 */
export type TodayTaskKind = 'lesson' | 'dialog' | 'cards' | 'video' | 'mistakes';

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

export type HomeFeatureTileKey = 'lessons' | 'dialogs' | 'cards';

export type HomeFeatureTile = Readonly<{
  key: HomeFeatureTileKey;
  title: string;
  subtitle: string;
  onPress: () => void;
  // зачем: плейсхолдер-арт 2.0 (assets/images/v2), пока Codex не нарисовал финальные картинки.
  art: number;
}>;
