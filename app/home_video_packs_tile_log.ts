// Governance-ID: TG-HOMEVIDEO-0511
/**
 * Журнал [HOME-VIDEO-PACKS-TILE] (слово владельца через координатора, e4331d3b4): плитка «Фразы из видео» на Главной должна быть всегда,
 * даже у нового аккаунта ранга 0 с закрытым разделом «Видео». Здесь пишется ПОЧЕМУ плитка показана или нет — одна строка на смену
 * решения (рендер Главной частый). Без идентификаторов; не бросает.
 */
export type HomeVideoPacksTileFacts = Readonly<{
  studyTarget: string;
  surfaceVideosReady: boolean;
  flashcardsVisible: boolean;
  rankLockedVideo: boolean;
  rankLockedCardsHub: boolean;
  available: boolean;
  shown: boolean;
  rowKeys: readonly string[];
}>;

/** Причина решения; ранг Видео в неё намеренно НЕ входит — замок вкладки «Видео» эту плитку не прячет. */
export function homeVideoPacksTileReason(facts: Pick<HomeVideoPacksTileFacts, 'surfaceVideosReady' | 'flashcardsVisible' | 'available' | 'shown'>): string {
  if (!facts.surfaceVideosReady) return 'hidden:language_has_no_video_packs';
  if (!facts.flashcardsVisible) return 'hidden:flashcards_not_visible';
  if (!facts.available) return 'hidden:unavailable';
  if (!facts.shown) return 'available_but_row_full';
  return 'shown';
}

let lastSignature = '';

export function logHomeVideoPacksTile(facts: HomeVideoPacksTileFacts): void {
  try {
    const reason = homeVideoPacksTileReason(facts);
    const line = JSON.stringify({ reason, ...facts });
    if (line === lastSignature) return;
    lastSignature = line;
    console.log('[HOME-VIDEO-PACKS-TILE]', line); // guard-ok: решение плитки с причиной, без идентификаторов
  } catch (error) {
    console.warn('[HOME-VIDEO-PACKS-TILE] log_failed', error instanceof Error ? error.message : String(error));
  }
}

export function __resetHomeVideoPacksTileLogForTests(): void {
  lastSignature = '';
}
