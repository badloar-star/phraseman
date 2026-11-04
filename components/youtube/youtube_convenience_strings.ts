// youtube_convenience_strings.ts — подписи удобств плеера (№9): «Назад на 10 с», «Медленнее», «Продолжить с {time}».
// зачем (владелец одобрил «все сделать», координатор 04.11): строки из docs/work/ux_conveniences_strings_9lang.md; короткие, ты-тон, без метафор.
import type { Lang } from '../../constants/i18n';

export type YoutubeConvenienceCopy = Readonly<{ back10: string; slower: string; continueFrom: (time: string) => string }>;

const T: Readonly<Record<Lang, YoutubeConvenienceCopy>> = {
  ru: { back10: 'Назад на 10 с', slower: 'Медленнее', continueFrom: (t) => `Продолжить с ${t}` },
  uk: { back10: 'Назад на 10 с', slower: 'Повільніше', continueFrom: (t) => `Продовжити з ${t}` },
  en: { back10: 'Back 10 s', slower: 'Slower', continueFrom: (t) => `Continue from ${t}` },
  es: { back10: 'Atrás 10 s', slower: 'Más lento', continueFrom: (t) => `Seguir desde ${t}` },
  'pt-BR': { back10: 'Voltar 10 s', slower: 'Mais devagar', continueFrom: (t) => `Continuar de ${t}` },
  vi: { back10: 'Lùi 10 giây', slower: 'Chậm hơn', continueFrom: (t) => `Tiếp tục từ ${t}` },
  id: { back10: 'Mundur 10 dtk', slower: 'Lebih lambat', continueFrom: (t) => `Lanjut dari ${t}` },
  tr: { back10: '10 sn geri', slower: 'Daha yavaş', continueFrom: (t) => `${t}'den devam et` },
  pl: { back10: 'Wstecz 10 s', slower: 'Wolniej', continueFrom: (t) => `Kontynuuj od ${t}` },
} as Record<Lang, YoutubeConvenienceCopy>;

export const youtubeConvenienceCopy = (lang: Lang): YoutubeConvenienceCopy => T[lang] ?? T.en;

/** m:ss из секунд (отрицательное и нечисло → 0:00). */
export function formatClock(sec: number): string {
  const s = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const YOUTUBE_SLOW_RATE = 0.75;
export const YOUTUBE_BACK_SEC = 10;
/** Новая позиция после «назад на 10 с»: не меньше нуля. */
export const backTarget = (positionSec: number): number => Math.max(0, (Number.isFinite(positionSec) ? positionSec : 0) - YOUTUBE_BACK_SEC);
