// peak_tour_full_core — чистые константы полноэкранного тура Пика (без React Native: их читает сторож-тест).
// зачем (макет peak_tour_full_approved_2026-11-05, владелец 05.11): ровно 3 страницы; тексты — ключи peakTour1..3, заголовков нет.
export const PEAK_TOUR_FULL_PAGES = 3;
export const PEAK_TOUR_FULL_TEXT_KEYS = ['peakTour1', 'peakTour2', 'peakTour3'] as const;

export default function __PeakTourFullCoreRouteShim() {
  return null;
}
