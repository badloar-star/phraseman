// Сверка расхода MAX с OpenAI Usage API: чистые вердикты, разбор ответа API,
// границы дня. зачем: бюджет-предохранитель верит клиентским токенам — сверка
// единственная ловит систематическое занижение; её пороги и парсер обязаны
// быть пришиты, иначе «тихая ложь» вернётся.
import {
  RECON_DRIFT_MIN_ABS_USD,
  RECON_DRIFT_REL_THRESHOLD,
  compareVoiceUsageDay,
  dayBoundsMs,
  parseOpenAiUsagePage,
  reconCostUsd,
  type OursDayTotals,
} from './max_voice_usage_recon';

function ours(overrides: Partial<OursDayTotals> = {}): OursDayTotals {
  return {
    calls: 10,
    seconds: 3_000,
    audioInputTokens: 30_000,
    audioOutputTokens: 12_000,
    cachedTokens: 8_000,
    textInputTokens: 5_000,
    textOutputTokens: 1_000,
    estCostUsd: reconCostUsd({
      audioInputTokens: 30_000, audioOutputTokens: 12_000, cachedTokens: 8_000,
      textInputTokens: 5_000, textOutputTokens: 1_000,
    }),
    ...overrides,
  };
}

describe('compareVoiceUsageDay', () => {
  it('совпадающие токены в пределах порога → ok c посчитанным дрейфом', () => {
    const openaiTokens = {
      audioInputTokens: 30_500, audioOutputTokens: 12_100, cachedTokens: 8_100,
      textInputTokens: 5_050, textOutputTokens: 1_020,
    };
    const verdict = compareVoiceUsageDay(ours(), { ...openaiTokens, estCostUsd: reconCostUsd(openaiTokens) });
    expect(verdict.status).toBe('ok');
    expect(verdict.drift).not.toBeNull();
  });

  it('занижение наших токенов сильнее порога и денежного пола → drift', () => {
    // OpenAI намерил вдвое больше аудио-выхода: классическое «клиент недоносит usage».
    const openaiTokens = {
      audioInputTokens: 60_000, audioOutputTokens: 200_000, cachedTokens: 8_000,
      textInputTokens: 5_000, textOutputTokens: 1_000,
    };
    const verdict = compareVoiceUsageDay(ours(), { ...openaiTokens, estCostUsd: reconCostUsd(openaiTokens) });
    expect(verdict.status).toBe('drift');
    expect(verdict.note).toContain('Расхождение');
  });

  it('крошечная денежная разница не алертит даже при большом относительном дрейфе', () => {
    // Порог денег: |гэп| < RECON_DRIFT_MIN_ABS_USD → ok, сколько бы ни было процентов.
    const tiny: OursDayTotals = ours({
      audioInputTokens: 100, audioOutputTokens: 40, cachedTokens: 0,
      textInputTokens: 0, textOutputTokens: 0,
      estCostUsd: reconCostUsd({ audioInputTokens: 100, audioOutputTokens: 40, cachedTokens: 0, textInputTokens: 0, textOutputTokens: 0 }),
    });
    const openaiTokens = {
      audioInputTokens: 1_000, audioOutputTokens: 400, cachedTokens: 0,
      textInputTokens: 0, textOutputTokens: 0,
    };
    const verdict = compareVoiceUsageDay(tiny, { ...openaiTokens, estCostUsd: reconCostUsd(openaiTokens) });
    expect(verdict.status).toBe('ok');
    expect(RECON_DRIFT_MIN_ABS_USD).toBe(0.5);
    expect(RECON_DRIFT_REL_THRESHOLD).toBe(0.12);
  });

  it('нет ответа API → api_error; пустой день с обеих сторон → no_data', () => {
    expect(compareVoiceUsageDay(ours(), null).status).toBe('api_error');
    const empty = ours({
      audioInputTokens: 0, audioOutputTokens: 0, cachedTokens: 0,
      textInputTokens: 0, textOutputTokens: 0, estCostUsd: 0, calls: 0, seconds: 0,
    });
    expect(compareVoiceUsageDay(empty, {
      audioInputTokens: 0, audioOutputTokens: 0, cachedTokens: 0,
      textInputTokens: 0, textOutputTokens: 0, estCostUsd: 0,
    }).status).toBe('no_data');
  });
});

describe('parseOpenAiUsagePage', () => {
  it('суммирует только realtime-модели из whitelist и отдаёт курсор пагинации', () => {
    const page = parseOpenAiUsagePage({
      data: [{
        results: [
          { model: 'gpt-realtime-2.1-mini', input_audio_tokens: 1_000, output_audio_tokens: 400, input_cached_tokens: 300, input_tokens: 50, output_tokens: 20 },
          { model: 'gpt-realtime-2.1', input_audio_tokens: 100, output_audio_tokens: 40 },
          // Чужие модели организации (диалоги/разборы) в сверку голоса не входят.
          { model: 'gpt-4o-mini', input_tokens: 999_999, output_tokens: 999_999 },
        ],
      }],
      has_more: true,
      next_page: 'cursor-2',
    });
    expect(page.totals).toEqual({
      audioInputTokens: 1_100,
      audioOutputTokens: 440,
      cachedTokens: 300,
      textInputTokens: 50,
      textOutputTokens: 20,
    });
    expect(page.nextPage).toBe('cursor-2');
  });

  it('битые формы (не объект, пустые results, мусорные числа) дают нули без падения', () => {
    expect(parseOpenAiUsagePage(null).totals.audioInputTokens).toBe(0);
    expect(parseOpenAiUsagePage({ data: [{ results: [{ model: 'gpt-realtime-2.1-mini', input_audio_tokens: 'garbage' }] }] }).totals.audioInputTokens).toBe(0);
    expect(parseOpenAiUsagePage({ has_more: false, next_page: 'x' }).nextPage).toBeNull();
  });
});

describe('dayBoundsMs', () => {
  it('возвращает UTC-границы суток и бросает на битом ключе', () => {
    const bounds = dayBoundsMs('2026-08-29');
    expect(bounds.startMs).toBe(Date.UTC(2026, 7, 29));
    expect(bounds.endMs - bounds.startMs).toBe(86_400_000);
    expect(() => dayBoundsMs('bad-key')).toThrow('recon_bad_day_key');
  });
});
