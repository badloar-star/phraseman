/**
 * зачем: порядок ОБЯЗАН совпадать с TABS в app/(tabs)/_layout.tsx.
 * Забыть про этот файл легко: сборка не падает, но таббар начинает открывать
 * соседние экраны, а последний просто вылетает (индекс выходит за границы
 * LogicalTabIndex).
 * 2026-08-09: турниры полностью исключены из релизной навигации, включая
 * физическую свайп-страницу. После добавления Арены: lessons 1, arena 2,
 * friends 3, settings 4.
 * Исходники турниров сохранены отдельно и не участвуют в этой модели.
 * 2026-09-24, PhraseMan 2.0 (решение владельца D39): таббар
 * «Главная · Обучение · Видео · Сообщество · Настройки». Арена ушла из таббара
 * (консервация, PM-036), Друзья живут внутри «Сообщества». Внутри
 * «Сообщества» у разделов свои runtime-владельцы (SUB_RUNTIME_OWNER_IDS), чтобы
 * экран Друзей по-прежнему узнавал себя по runtimeOwnerId === 'friends'.
 * 2026-08-08: таб «Все уроки» возвращён вторым. При этом плитка на главной
 * сохраняет полноэкранный push-маршрут /lessons_list.
 * 2026-08-03, владелец: экран «Сегодня» убран полностью. Он был нулевой
 * ФИЗИЧЕСКОЙ страницей слева от главной и жил на удалённой фиче «Компас»
 * (collectCompassSnapshot/buildCompassDay), без которой показывал бы пустую
 * заглушку. Вместе с ним исчезло расхождение логических и физических
 * индексов: теперь страница = таб, и оба перевода тождественны. Функции
 * оставлены (а не вырезаны по всему layout), чтобы не переписывать свайп-
 * логику и сохранить единую точку правды, если слева снова появится страница.
 */
// зачем (слово владельца 05.11, макет plus_tab_approved): шестая логическая вкладка «Plus» — в раскладке скрыта ВСЕГДА, кроме случая,
// когда её открывает правило app/plus_tab_visibility.ts (4 иконки в панели и нет подписки). Старые раскладки поэтому не меняют ни одной страницы.
export const LOGICAL_TAB_IDS = ['home', 'lessons', 'video', 'community', 'settings', 'plus'] as const;
export const PHYSICAL_PAGE_IDS = [...LOGICAL_TAB_IDS] as const;

export type LogicalTabId = (typeof LOGICAL_TAB_IDS)[number];
export type PhysicalPageId = (typeof PHYSICAL_PAGE_IDS)[number];
export type LogicalTabIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type PhysicalPageIndex = 0 | 1 | 2 | 3 | 4 | 5;
/** Логический индекс вкладки Plus. */
export const PLUS_TAB_INDEX = 5 as const;
/** Разделы внутри вкладки «Сообщество»: владелец выдаётся только видимому разделу. */
// зачем 'spire': третий раздел «Шпиль» (за замком app/spire_tab_flag.ts) получает собственного
// владельца, чтобы его таймеры/анимации крутились только пока раздел виден.
export const SUB_RUNTIME_OWNER_IDS = ['friends', 'spire', 'packs'] as const;
export type SubRuntimeOwnerId = (typeof SUB_RUNTIME_OWNER_IDS)[number];
/**
 * Арена законсервирована (PM-036) и ушла из таббара: её экран остался в дереве
 * маршрутов, но владельца больше не получает никогда — значит, не крутит ничего.
 */
export type RetiredRuntimeOwnerId = 'arena';
export type TabRuntimeOwnerId = PhysicalPageId | SubRuntimeOwnerId | RetiredRuntimeOwnerId;

function assertIntegerInRange(value: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${label} must be an integer between 0 and ${max}`);
  }
}

/**
 * зачем D129 (владелец 2026-09-30): вкладка «Обучение» видна только для языка, у
 * которого готов курс. Скрытая вкладка исчезает и из таббара, и из свайп-ленты:
 * физических страниц становится меньше, логические индексы (маршруты, goToTab)
 * остаются прежними. Раскладка — единственное место, где считается сдвиг.
 */
export type TabPageLayout = Readonly<{ hiddenLogicalTabs: readonly LogicalTabIndex[] }>;

// зачем (Plus 05.11): раскладки кэшируются по набору скрытых вкладок — одинаковые флаги дают ТОТ ЖЕ объект (ссылки в ref/deps не мигают)
const layoutCache = new Map<string, TabPageLayout>();
function layoutFor(hidden: readonly LogicalTabIndex[]): TabPageLayout {
  const key = hidden.join(',');
  const cached = layoutCache.get(key);
  if (cached) return cached;
  const layout: TabPageLayout = Object.freeze({ hiddenLogicalTabs: Object.freeze([...hidden]) as readonly LogicalTabIndex[] });
  layoutCache.set(key, layout);
  return layout;
}
export const FULL_TAB_PAGE_LAYOUT: TabPageLayout = layoutFor([5]);

// зачем (владелец 30.10, «Главная Free по рангам»): вкладка «Видео» (логический индекс 2) скрыта у новичка до ранга 1 — как и «Обучение»,
// исчезает и из таббара, и из свайп-ленты. Раскладки кэшируются: одинаковые флаги дают ТОТ ЖЕ объект (ссылки в ref/deps не прыгают).
export function tabPageLayoutFor(options: { learnTabVisible: boolean; videoTabVisible?: boolean; plusTabVisible?: boolean }): TabPageLayout {
  const hidden: LogicalTabIndex[] = [];
  if (!options.learnTabVisible) hidden.push(1);
  if (options.videoTabVisible === false) hidden.push(2);
  if (options.plusTabVisible !== true) hidden.push(PLUS_TAB_INDEX);
  return layoutFor(hidden);
}

/**
 * Порядок вкладок В ПАНЕЛИ И В ЛЕНТЕ СВАЙПА — не равен порядку логических индексов.
 * зачем (слово владельца 11.11: «алмазик на таббаре перемести между Сообщество и Настройки… чтобы он не в конце таббара
 * был»): Plus (индекс 5) стоит ПЕРЕД «Настройками» (индекс 4), Настройки остаются крайними справа. Логические индексы
 * и маршруты не меняются — меняется только порядок показа. Панель, лента и копия панели обязаны брать порядок отсюда.
 */
export const TAB_DISPLAY_ORDER: readonly LogicalTabIndex[] = Object.freeze([0, 1, 2, 3, PLUS_TAB_INDEX, 4]) as readonly LogicalTabIndex[];

/** Логические индексы, у которых есть физическая страница, в порядке панели и свайпа (см. TAB_DISPLAY_ORDER). */
export function visibleLogicalTabs(layout: TabPageLayout = FULL_TAB_PAGE_LAYOUT): readonly LogicalTabIndex[] {
  return TAB_DISPLAY_ORDER.filter((index) => !layout.hiddenLogicalTabs.includes(index));
}

export function isLogicalTabHidden(index: number, layout: TabPageLayout = FULL_TAB_PAGE_LAYOUT): boolean {
  return (layout.hiddenLogicalTabs as readonly number[]).includes(index);
}

export function physicalPageCount(layout: TabPageLayout = FULL_TAB_PAGE_LAYOUT): number {
  return visibleLogicalTabs(layout).length;
}

/** Скрытая вкладка ведёт на Главную (страница 0): её экрана в ленте нет. */
export function logicalTabToPhysicalPage(index: number, layout: TabPageLayout = FULL_TAB_PAGE_LAYOUT): PhysicalPageIndex {
  assertIntegerInRange(index, LOGICAL_TAB_IDS.length - 1, 'logical tab index');
  const physical = visibleLogicalTabs(layout).indexOf(index as LogicalTabIndex);
  return (physical < 0 ? 0 : physical) as PhysicalPageIndex;
}

export function physicalPageToLogicalTab(index: number, layout: TabPageLayout = FULL_TAB_PAGE_LAYOUT): LogicalTabIndex {
  const visible = visibleLogicalTabs(layout);
  assertIntegerInRange(index, visible.length - 1, 'physical page index');
  return visible[index]!;
}

export function physicalPageToRuntimeOwner(index: number, layout: TabPageLayout = FULL_TAB_PAGE_LAYOUT): TabRuntimeOwnerId {
  return LOGICAL_TAB_IDS[physicalPageToLogicalTab(index, layout)] as TabRuntimeOwnerId;
}
