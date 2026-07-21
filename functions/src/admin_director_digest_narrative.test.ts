import {
  buildDirectorDigestNarrativePrompt,
  parseDirectorDigestNarrative,
  type DirectorDigestNarrativeInput,
} from './admin_director_digest_narrative';

const NOW_MS = Date.parse('2026-07-19T12:34:56.789Z');

function input(): DirectorDigestNarrativeInput {
  return {
    generatedAtMs: NOW_MS,
    rangeDays: 3,
    state: 'partial',
    period: {
      startMs: Date.parse('2026-07-17T00:00:00.000Z'),
      endExclusiveMs: Date.parse('2026-07-20T00:00:00.000Z'),
    },
    previousPeriod: {
      startMs: Date.parse('2026-07-14T00:00:00.000Z'),
      endExclusiveMs: Date.parse('2026-07-17T00:00:00.000Z'),
    },
    sourceHealth: [
      {
        source: 'paywall',
        state: 'partial',
        truncated: true,
        freshness: 'recent',
      },
      {
        source: 'premium_event_time',
        state: 'ready',
        truncated: false,
        freshness: 'recent',
      },
      {
        source: 'premium_created_at',
        state: 'empty',
        truncated: false,
        freshness: 'no_events',
      },
    ],
    metrics: [
      {
        id: 'paywall.shown.v1',
        source: 'paywall_funnel',
        unit: 'count',
        availability: 'ready',
        current: 10,
        previous: 5,
        absoluteDelta: 5,
        percentDelta: 100,
        direction: 'up',
      },
      {
        id: 'store.refund.v1',
        source: 'revenuecat_premium_events',
        unit: 'count',
        availability: 'partial',
        current: null,
        previous: 2,
        absoluteDelta: null,
        percentDelta: null,
        direction: 'unavailable',
      },
    ],
  };
}

describe('director digest V2 narrative', () => {
  test('builds a versioned aggregate-only prompt with the current DigestNarrative schema', () => {
    const unsafe = {
      ...input(),
      rawEmail: 'PRIVATE_EMAIL@example.com',
      metrics: input().metrics.map((metric: unknown) => ({
        ...(metric as object),
        uid: 'PRIVATE_UID',
        body: 'PRIVATE_BODY',
        label: 'PRIVATE_LABEL',
      })),
    } as unknown as DirectorDigestNarrativeInput;

    const built = buildDirectorDigestNarrativePrompt(unsafe);
    const serialized = `${built.system}\n${built.user}`;

    expect(built.promptVersion).toBe(4);
    expect(serialized).toContain('"ownerMonologue"');
    expect(serialized).toContain('one continuous monologue');
    expect(serialized).toContain('Do not use headings, labels, bullet points');
    expect(serialized).toContain('"productManager"');
    expect(serialized).toContain('"hypothesis"');
    expect(serialized).toContain('"successMetric"');
    expect(serialized).toContain('owner');
    expect(serialized).toContain('Do not repeat the same fact');
    expect(serialized).toContain('Use numbers only when they change a decision');
    expect(serialized).toContain('paywall.shown.v1');
    expect(serialized).toContain('агрегирован');
    expect(serialized).not.toContain('PRIVATE_EMAIL');
    expect(serialized).not.toContain('PRIVATE_UID');
    expect(serialized).not.toContain('PRIVATE_BODY');
    expect(serialized).not.toContain('PRIVATE_LABEL');
  });

  test('accepts only known metric ids and rebuilds facts and comparisons on the server', () => {
    const parsed = parseDirectorDigestNarrative(JSON.stringify({
      ownerMonologue: 'За последние три дня предложение Plus стало заметнее, но прежде чем считать это устойчивым ростом, я бы проверил качество источника и соседние шаги воронки. Сейчас важнее всего понять, превратилось ли дополнительное внимание в более здоровое покупательское поведение.',
      executiveSummary: 'Показы предложения выросли, но источник частично усечён.',
      productManager: [
        {
          title: 'Проверить рост показов',
          metricIds: ['paywall.shown.v1', 'invented.metric'],
          fact: 'MODEL INVENTED FACT',
          comparison: 'MODEL INVENTED COMPARISON',
          whyItMatters: 'Изменение верхней части воронки влияет на последующие шаги.',
          hypothesis: 'Гипотеза: вырос охват предложения.',
          action: 'Сопоставить показы с релизами и каналами трафика.',
          successMetric: 'Объяснено изменение числа показов.',
          confidence: 'medium',
        },
      ],
      growthAndRevenue: ['Подтверждённые возвраты неполны.'],
      qualityAndRisks: [],
      userVoice: [],
      actions: [{
        priority: 1,
        action: 'Проверить полноту источника воронки.',
        reason: 'Источник помечен partial.',
        successMetric: 'Источник ready без усечения.',
      }],
      sourceWarnings: ['MODEL WARNING'],
    }), input());

    expect(parsed.state).toBe('generated');
    expect(parsed.narrative.ownerMonologue).toContain('предложение Plus стало заметнее');
    expect(parsed.narrative.productManager).toHaveLength(1);
    expect(parsed.narrative.productManager[0]).toMatchObject({
      metricIds: ['paywall.shown.v1'],
      sourceIds: ['paywall_funnel'],
      confidence: 'medium',
    });
    expect(parsed.narrative.productManager[0].fact).toContain('Показы предложения Plus: 10');
    expect(parsed.narrative.productManager[0].comparison).toContain('было 5');
    expect(parsed.narrative.productManager[0].fact).not.toContain('MODEL INVENTED');
    expect(parsed.narrative.productManager[0].comparison).not.toContain('MODEL INVENTED');
    expect(parsed.narrative.sourceWarnings).not.toContain('MODEL WARNING');
    expect(parsed.narrative.sourceWarnings).toContain(
      'Воронка предложения Plus: данные неполные.',
    );
  });

  test('fails closed when a generated monologue invents a number outside trusted aggregates', () => {
    const parsed = parseDirectorDigestNarrative(JSON.stringify({
      ownerMonologue: 'За выбранный период движение воронки выглядит интересным, но якобы выручка выросла на 999 процентов, чего нет в доверенных агрегатах. Поэтому я предлагаю не принимать эту красивую формулировку за факт и сначала проверить соседние шаги пользовательского пути, а уже затем решать, какое продуктовое изменение действительно заслуживает приоритета.',
      executiveSummary: 'Показы предложения выросли.',
      productManager: [{
        title: 'Проверить рост показов',
        metricIds: ['paywall.shown.v1'],
        whyItMatters: 'Изменение верхней части воронки влияет на следующие шаги.',
        hypothesis: 'Изменился охват предложения.',
        action: 'Сопоставить показы с изменениями продукта.',
        successMetric: 'Причина изменения проверена.',
        confidence: 'medium',
      }],
      growthAndRevenue: [],
      qualityAndRisks: [],
      userVoice: [],
      actions: [{
        priority: 1,
        action: 'Сопоставить показы с изменениями продукта.',
        reason: 'Нужно проверить соседние шаги.',
        successMetric: 'Причина изменения проверена.',
      }],
      sourceWarnings: [],
    }), input());

    expect(parsed.state).toBe('fallback');
    expect(parsed.narrative.ownerMonologue).not.toContain('999');
  });

  test('returns a deterministic facts-only narrative for invalid model output', () => {
    const parsed = parseDirectorDigestNarrative('not json', input());

    expect(parsed.state).toBe('fallback');
    expect(parsed.narrative.ownerMonologue.length).toBeGreaterThan(100);
    expect(parsed.narrative.ownerMonologue).not.toMatch(/(?:Факт|Сравнение|Гипотеза|Действие|Успех):/);
    expect(parsed.narrative.executiveSummary).toContain('Показы предложения Plus');
    expect(parsed.narrative.executiveSummary).toContain('10');
    expect(parsed.narrative.productManager.length).toBeGreaterThan(0);
    expect(parsed.narrative.productManager.length).toBeLessThanOrEqual(5);
    expect(parsed.narrative.productManager[0]).toMatchObject({
      title: 'Показы предложения Plus',
      metricIds: ['paywall.shown.v1'],
      sourceIds: ['paywall_funnel'],
      confidence: 'medium',
    });
    expect(parsed.narrative.productManager[0].fact).toContain('10');
    expect(parsed.narrative.productManager[0].comparison).toContain('было 5');
    expect(parsed.narrative.productManager[0].hypothesis).toMatch(/^Гипотеза:/);
    expect(parsed.narrative.growthAndRevenue.length).toBeGreaterThan(0);
    expect(parsed.narrative.qualityAndRisks.length).toBeGreaterThan(0);
    expect(parsed.narrative.userVoice.length).toBeGreaterThan(0);
    expect(parsed.narrative.actions.length).toBeGreaterThan(0);
    expect(parsed.narrative.actions.length).toBeLessThanOrEqual(7);
    expect(parsed.narrative.sourceWarnings).toContain(
      'Воронка предложения Plus: данные неполные.',
    );
  });

  test('rejects an incomplete generated narrative and never turns unavailable into zero', () => {
    const parsed = parseDirectorDigestNarrative(JSON.stringify({
      ownerMonologue: '',
      executiveSummary: '',
      productManager: [],
      growthAndRevenue: [],
      qualityAndRisks: [],
      userVoice: [],
      actions: [],
      sourceWarnings: [],
    }), input());

    expect(parsed.state).toBe('fallback');
    expect(parsed.narrative.executiveSummary).not.toContain('Возвраты: 0');
    expect(JSON.stringify(parsed.narrative)).not.toContain('null (было');
    const refundInsight = parsed.narrative.productManager.find(
      (item) => item.metricIds.includes('store.refund.v1'),
    );
    expect(refundInsight?.fact).toBe('Возвраты: данные недоступны');
    expect(refundInsight?.comparison).toBe('Возвраты: сравнение недоступно');
    expect(refundInsight?.hypothesis).toMatch(/^Гипотеза:/);
  });

  test('uses only aggregate metric statements in deterministic user voice', () => {
    const parsed = parseDirectorDigestNarrative('invalid', input());
    const userVoice = parsed.narrative.userVoice.join(' ');

    expect(userVoice).toContain('Агрегированный сигнал поведения');
    expect(userVoice).toContain('Показы предложения Plus: 10');
    expect(userVoice).not.toMatch(/отзыв|письмо|сообщил пользователь|цитат/i);
    expect(userVoice).not.toMatch(/PRIVATE|@example|uid/i);
  });
});
