// зачем: legacy-якорь URL. Таб «Уроки» убран (2026-08-02) — список уроков живёт
// на push-маршруте /lessons_list. Старые диплинки /journal и /lessons маппятся
// на главную в app/(tabs)/_layout.tsx (PATHNAME_TO_IDX); сам файл остаётся,
// чтобы старый URL не падал в not-found. Компонент отсюда больше не рендерится:
// (tabs)/_layout.tsx не рендерит детей-роутов вовсе.
export { default } from './lessons';
