/**
 * Дерево метрик: где именно изменилось, а не «изменилось».
 *
 * зачем этот модуль (аудит 2026-08-16): департаменты говорили «возвратов
 * больше обычного» или «новых платящих столько-то» и на этом останавливались.
 * Владельцу приходилось самому искать, из-за какой части это произошло —
 * то есть находка не экономила работу, а только объявляла о ней.
 *
 * зачем считает КОД, а не модель: индустриальная практика для вопроса
 * «почему упало» — детерминированный расчёт раскладывает метрику по
 * составляющим, а модель только объясняет результат человеческим языком.
 * Модель, гадающая по цифрам, ошибается тихо и убедительно.
 *
 * Модуль чистый: без Firestore и сети, поэтому все правила проверяются
 * тестами целиком, а не «на глаз в проде».
 */

/**
 * Какую долю изменения должна объяснять ветка, чтобы называться причиной.
 *
 * зачем порог, а не «самая большая»: если все ветки просели одинаково, это
 * общий тренд, и назначать виновным одну из них — значит отправить владельца
 * копать не туда. Хуже, чем промолчать.
 */
export const MIN_BRANCH_SHARE = 0.5;

/**
 * Насколько метрика должна сдвинуться, чтобы это считалось изменением.
 *
 * зачем: дневное дрожание счётчика — не новость. Без порога дерево
 * объявляло бы причину каждый день и обесценило бы сам сигнал.
 */
export const MIN_RELATIVE_CHANGE = 0.15;

export interface MetricBranch {
  readonly name: string;
  readonly current: number;
  /** null — сравнивать не с чем (первый запуск, источник молчал). */
  readonly previous: number | null;
}

export type MetricDirection = 'up' | 'down' | 'flat' | 'unknown';

export interface MetricDriver {
  readonly name: string;
  readonly delta: number;
  /** Какую долю общего изменения объясняет эта ветка, 0..1. */
  readonly share: number;
}

export interface MetricTree {
  readonly metric: string;
  readonly direction: MetricDirection;
  readonly total: number;
  readonly previousTotal: number | null;
  /** Ветка, объясняющая изменение. null — виновного нет или он не один. */
  readonly mainDriver: MetricDriver | null;
}

export interface BuildMetricTreeInput {
  readonly metric: string;
  readonly branches: readonly MetricBranch[];
}

export function buildMetricTree(input: BuildMetricTreeInput): MetricTree {
  const branches = input.branches;
  if (branches.length === 0) {
    return freeze(input.metric, 'unknown', 0, null, null);
  }

  // зачем требовать прошлое у ВСЕХ веток: частичное сравнение врёт —
  // ветка без вчерашних данных выглядела бы выросшей с нуля.
  const comparable = branches.every((b) => typeof b.previous === 'number' && Number.isFinite(b.previous));
  const total = branches.reduce((sum, b) => sum + b.current, 0);
  if (!comparable) {
    return freeze(input.metric, 'unknown', total, null, null);
  }

  const previousTotal = branches.reduce((sum, b) => sum + (b.previous as number), 0);
  const totalDelta = total - previousTotal;

  const base = Math.max(previousTotal, 1);
  if (Math.abs(totalDelta) / base < MIN_RELATIVE_CHANGE) {
    return freeze(input.metric, 'flat', total, previousTotal, null);
  }

  const direction: MetricDirection = totalDelta > 0 ? 'up' : 'down';

  // зачем брать ветки, двигавшиеся В ТУ ЖЕ сторону: если общее упало,
  // причина — среди упавших. Выросшая ветка изменение не объясняет,
  // она его смягчила.
  const sameWay = branches
    .map((b) => ({ name: b.name, delta: b.current - (b.previous as number) }))
    .filter((b) => (totalDelta > 0 ? b.delta > 0 : b.delta < 0))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const top = sameWay[0];
  if (!top) return freeze(input.metric, direction, total, previousTotal, null);

  const sameWayTotal = sameWay.reduce((sum, b) => sum + Math.abs(b.delta), 0);
  const share = sameWayTotal === 0 ? 0 : Math.abs(top.delta) / sameWayTotal;

  const driver = share >= MIN_BRANCH_SHARE
    ? Object.freeze({ name: top.name, delta: top.delta, share })
    : null;

  return freeze(input.metric, direction, total, previousTotal, driver);
}

function freeze(
  metric: string,
  direction: MetricDirection,
  total: number,
  previousTotal: number | null,
  mainDriver: MetricDriver | null,
): MetricTree {
  return Object.freeze({ metric, direction, total, previousTotal, mainDriver });
}

/**
 * Человеческая фраза о том, что произошло.
 *
 * зачем возвращать пустую строку, а не «изменений нет»: строка-заглушка в
 * каждой находке — это шум, из-за которого перестают читать находку целиком.
 * Молчание здесь — осмысленный ответ.
 */
export function explainMetricChange(tree: MetricTree): string {
  if (!tree.mainDriver || tree.direction === 'flat' || tree.direction === 'unknown') return '';
  const { name, delta } = tree.mainDriver;
  const word = tree.direction === 'down' ? 'просела' : 'выросла';
  const pct = Math.round(tree.mainDriver.share * 100);
  return `Изменение объясняется одной частью: «${name}» ${word} на ${Math.abs(delta)} — это ${pct}% всего сдвига.`;
}
