// learning_v2_lessons_lazy.ts — тяжёлые части Learning V2 для вкладки «Уроки» подключаются лениво (заморозка V2, владелец 04.11; Android-лаги).
//
// зачем: статические import тяжёлого V2 в app/(tabs)/lessons.tsx исполнялись при первом выполнении вкладки (премаунт / первый тап) у ВСЕХ, хотя V2
// заморожен и нужен только людям с ≥1 завершённым занятием: компонент курса Season (100 файлов), клиент каталога курса и каталог занятий
// (генерированные таблицы ~1,3 МБ). Здесь они подключаются в момент, когда V2 реально открывается:
//  · компонент курса — React.lazy + Suspense (прогрев после открытия V2, чтобы вход не мигал);
//  · функции каталога — require внутри вызова: вызываются только когда V2 открыт (иначе пустой результат).
// Имена и сигнатуры функций прежние — lessons.tsx меняет только путь импорта. Сторож: tests/learning_v2_lessons_lazy_2026_11_04.test.ts.
import React from 'react';
import { SEASON_SCENE_V2_ENABLED } from '../components/learning-v2/season/season_flags';
import type LearningV2ChaptersCourse from '../components/learning-v2/LearningV2ChaptersCourse';

type CourseProps = React.ComponentProps<typeof LearningV2ChaptersCourse>;
type CatalogClient = typeof import('./learning_v2_active_course_catalog_client_v1');
type NativeCatalog = typeof import('../modules/learning-v2/content/factory_native/factory_native_catalog_v1');

const loadSurface = (): Promise<{ default: React.ComponentType<CourseProps> }> => (
  (SEASON_SCENE_V2_ENABLED
    ? import('../components/learning-v2/season/SeasonCourseConnected')
    : import('../components/learning-v2/LearningV2ChaptersCourse')) as unknown as Promise<{ default: React.ComponentType<CourseProps> }>
);

const LazySurface = React.lazy(loadSurface);

/** Компонент курса V2 той же формы, что раньше; грузится при первом показе (страница «v2» открыта явной кнопкой). */
export const LessonsCourseSurface: React.ComponentType<CourseProps> = (props) => (
  React.createElement(React.Suspense, { fallback: null }, React.createElement(LazySurface, props))
);

/** Прогрев модуля курса после того, как V2 открыт: к тапу по кнопке «V2» код уже исполнен. */
export function prewarmLearningV2CourseSurface(): void {
  loadSurface().catch((error: unknown) => {
    console.warn('[V2-LAZY] прогрев компонента курса не удался', error instanceof Error ? error.message : String(error)); // guard-ok: причина отказа
  });
}

const catalogClient = (): CatalogClient => require('./learning_v2_active_course_catalog_client_v1') as CatalogClient;
const nativeCatalog = (): NativeCatalog => require('../modules/learning-v2/content/factory_native/factory_native_catalog_v1') as NativeCatalog;

export const loadLearningV2ActiveCourseCatalogV1: CatalogClient['loadLearningV2ActiveCourseCatalogV1'] = (...args) => catalogClient().loadLearningV2ActiveCourseCatalogV1(...args);
export const peekLearningV2ActiveCourseCatalogV1: CatalogClient['peekLearningV2ActiveCourseCatalogV1'] = (...args) => catalogClient().peekLearningV2ActiveCourseCatalogV1(...args);
export const factoryNativeLearningV2AvailabilityV1: NativeCatalog['factoryNativeLearningV2AvailabilityV1'] = (...args) => nativeCatalog().factoryNativeLearningV2AvailabilityV1(...args);
export const factoryNativeLearningV2NewWordCountV1: NativeCatalog['factoryNativeLearningV2NewWordCountV1'] = (...args) => nativeCatalog().factoryNativeLearningV2NewWordCountV1(...args);

export default function __RouteShim() { return null; }
