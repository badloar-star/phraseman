// зачем (video-009, макет video.html `.thumb .du` «12:34»): длительность ролика на обложке. Нет значения — пустая строка.
export function formatVideoDuration(totalSec: number | undefined): string {
  if (typeof totalSec !== 'number' || !Number.isFinite(totalSec) || totalSec <= 0) return '';
  const safe = Math.floor(totalSec);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = String(safe % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
