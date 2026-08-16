import {
  buildMetricTree,
  explainMetricChange,
  MIN_BRANCH_SHARE,
  type MetricBranch,
} from './metric_tree';

function branch(name: string, current: number, previous: number): MetricBranch {
  return { name, current, previous };
}

describe('Metric tree — где именно упало, а не «упало»', () => {
  test('называет ветку, которая объясняет падение', () => {
    // зачем (аудит 2026-08-16): департамент говорил «выручка упала» и на
    // этом останавливался. Владельцу приходилось искать причину самому.
    const tree = buildMetricTree({
      metric: 'Новые платящие',
      branches: [
        branch('Из пробного периода', 4, 20),
        branch('Прямые покупки', 19, 20),
      ],
    });
    expect(tree.direction).toBe('down');
    expect(tree.mainDriver?.name).toBe('Из пробного периода');
  });

  test('ветка, которая почти не двигалась, не объявляется причиной', () => {
    // зачем: назвать виновным то, что изменилось на процент, — значит
    // отправить владельца копать не туда. Хуже, чем промолчать.
    const tree = buildMetricTree({
      metric: 'Новые платящие',
      branches: [
        branch('Из пробного периода', 20, 20),
        branch('Прямые покупки', 19, 20),
      ],
    });
    expect(tree.mainDriver).toBeNull();
  });

  test('рост тоже разбирается, не только падение', () => {
    const tree = buildMetricTree({
      metric: 'Новые платящие',
      branches: [branch('Прямые покупки', 40, 20), branch('Из пробного', 5, 5)],
    });
    expect(tree.direction).toBe('up');
    expect(tree.mainDriver?.name).toBe('Прямые покупки');
  });

  test('без изменений — нет ни направления, ни виновного', () => {
    const tree = buildMetricTree({
      metric: 'Новые платящие',
      branches: [branch('a', 10, 10), branch('b', 5, 5)],
    });
    expect(tree.direction).toBe('flat');
    expect(tree.mainDriver).toBeNull();
  });

  test('нет вчерашних данных — сравнивать не с чем, и это честно', () => {
    // зачем: первый запуск не должен рапортовать о падении с нуля.
    const tree = buildMetricTree({
      metric: 'Новые платящие',
      branches: [{ name: 'a', current: 10, previous: null }],
    });
    expect(tree.direction).toBe('unknown');
    expect(tree.mainDriver).toBeNull();
  });

  test('доля ветки в изменении считается честно', () => {
    const tree = buildMetricTree({
      metric: 'Новые платящие',
      branches: [branch('виновник', 0, 16), branch('фон', 19, 20)],
    });
    // 16 из 17 общего падения
    expect(tree.mainDriver!.share).toBeGreaterThan(0.9);
  });

  test('порог доли не пропускает размазанное изменение', () => {
    // зачем: если все ветки просели одинаково, виновного нет — это
    // общий тренд, и называть одну из них ложь.
    const tree = buildMetricTree({
      metric: 'Новые платящие',
      branches: [branch('a', 5, 10), branch('b', 5, 10), branch('c', 5, 10)],
    });
    expect(tree.mainDriver).toBeNull();
    expect(MIN_BRANCH_SHARE).toBeGreaterThan(0.34);
  });

  test('пустое дерево не роняет расчёт', () => {
    expect(buildMetricTree({ metric: 'x', branches: [] }).direction).toBe('unknown');
  });
});

describe('Текст объяснения', () => {
  test('называет ветку и величину', () => {
    const text = explainMetricChange(buildMetricTree({
      metric: 'Новые платящие',
      branches: [branch('Из пробного периода', 4, 20), branch('Прямые покупки', 19, 20)],
    }));
    expect(text).toContain('Из пробного периода');
    expect(text).toMatch(/\d/);
  });

  test('молчит, когда сказать нечего', () => {
    // зачем: строка «изменений нет» в каждой находке — это шум,
    // из-за которого перестают читать всю находку целиком.
    expect(explainMetricChange(buildMetricTree({
      metric: 'x',
      branches: [branch('a', 10, 10)],
    }))).toBe('');
  });

  test('честно говорит, когда не с чем сравнивать', () => {
    expect(explainMetricChange(buildMetricTree({
      metric: 'x',
      branches: [{ name: 'a', current: 10, previous: null }],
    }))).toBe('');
  });
});

describe('Инвертированная ветка (возвраты) — текст не должен врать наоборот', () => {
  // зачем (аудит 2026-08-16): возвраты подаются со знаком минус, чтобы
  // двигаться синфазно с итогом. Из-за этого фраза выходила ровно
  // противоположной правде — «Возвраты просела», когда их стало больше.
  // Этот текст уходит в промпт модели, поэтому ложь тут не косметика:
  // модель строит гипотезу и эксперимент на перевёрнутом факте.

  const worseRefunds = () => buildMetricTree({
    metric: 'Денежные события',
    branches: [
      { name: 'Новые платящие', current: 10, previous: 10 },
      { name: 'Возвраты', current: -5, previous: -1, inverted: true },
    ],
  });

  const betterRefunds = () => buildMetricTree({
    metric: 'Денежные события',
    branches: [
      { name: 'Новые платящие', current: 10, previous: 10 },
      { name: 'Возвраты', current: -1, previous: -5, inverted: true },
    ],
  });

  test('больше возвратов — говорит «выросли», а НЕ «просела»', () => {
    const text = explainMetricChange(worseRefunds());
    expect(text).toContain('выросли');
    expect(text).not.toContain('просела');
  });

  test('меньше возвратов — говорит «снизились», а НЕ «выросла»', () => {
    const text = explainMetricChange(betterRefunds());
    expect(text).toContain('снизились');
    expect(text).not.toContain('выросла');
  });

  test('обычная ветка сохраняет прежние формулировки', () => {
    // зачем: правка не должна была задеть неинвертированные ветки.
    const down = buildMetricTree({
      metric: 'x',
      branches: [{ name: 'Новые платящие', current: 2, previous: 20 }],
    });
    expect(explainMetricChange(down)).toContain('просела');
    const up = buildMetricTree({
      metric: 'x',
      branches: [{ name: 'Новые платящие', current: 20, previous: 2 }],
    });
    expect(explainMetricChange(up)).toContain('выросла');
  });

  test('виновник определяется по-прежнему верно — математика не сломана', () => {
    expect(worseRefunds().mainDriver?.name).toBe('Возвраты');
    expect(worseRefunds().direction).toBe('down');
  });
});
