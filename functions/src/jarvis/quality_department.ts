import type { AppTier } from './app_tier';
import { tierAbsoluteThresholdMultiplier } from './app_tier';
import { buildDecision, type Decision, type DecisionTrigger } from './decision';
import type { FetchQualitySourceResult } from './quality_firestore_fetcher';
import { aggregateQualityRows, buildQualityEvidence } from './quality_source_reader';
import { qualityAffectedUserBucket, type QualityAffectedUserBucket } from '../quality_daily_aggregate';

/**
 * Департамент «Качество» — первый департамент Джарвиса (решение владельца
 * 2026-08-01). Читает error_reports/user_reports/app_errors, решает, есть ли
 * скачок жалоб/крашей, и если да — строит Decision. Департаменты не общаются
 * между собой: департамент только пишет решения, ничего никому не шлёт.
 *
 * зачем appTier: владелец 2026-08-02 — «Качество» использует АБСОЛЮТНЫЙ порог
 * (число репортов), поэтому он растёт с тиром (tierAbsoluteThresholdMultiplier),
 * в отличие от процентного порога «Денег». Без явного тира считаем 'seed' —
 * самый строгий порог, отсутствие данных о масштабе не делает департамент
 * более шумным по умолчанию.
 */

/** Базовый порог скачка: сколько репортов одной категории на одном экране за
 * сутки уже не укладывается в фоновый шум — масштабируется по тиру. */
const CATEGORY_SCREEN_SPIKE_THRESHOLD = 15;

export interface RunQualityDepartmentInput {
  readonly fetches: readonly FetchQualitySourceResult[];
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
}

export interface RunQualityDepartmentResult {
  readonly decisions: readonly Decision[];
}

interface Spike {
  readonly category: string;
  readonly screen: string;
  readonly build: string;
  readonly platform: string;
  readonly count: number;
  readonly affectedUserBucket: QualityAffectedUserBucket | 'unknown';
  /** Откуда пришёл скачок — определяет ВСЕ формулировки решения. */
  readonly sourceId: FetchQualitySourceResult['sourceId'];
}

/**
 * Жалобы живых людей или автоматическая телеметрия.
 *
 * зачем (владелец 2026-08-04): Джарвис называл «жалобами» и «репортами»
 * автоматические краши из app_errors и советовал откатить релиз на
 * технических логах. Владелец: «это автоматические краши/логи, не жалобы».
 * user_reports пишет человек через форму жалобы, app_errors — само
 * приложение при сбое. Это разные сигналы и требуют разных действий.
 */
function isHumanComplaintSource(sourceId: FetchQualitySourceResult['sourceId']): boolean {
  return sourceId === 'user_reports' || sourceId === 'error_reports';
}

/** Категория 'unknown' — это отсутствие категории, а не её название. */
function hasMeaningfulCategory(category: string): boolean {
  return category !== 'unknown';
}

/**
 * Возвращает самую крупную комбинацию category×screen, но только если она
 * пересекает порог фонового шума. Без порога любое единичное «typo» на
 * «home» рождало бы решение — а это шум, а не сигнал.
 */
function findTopSpike(fetches: readonly FetchQualitySourceResult[], appTier: AppTier): Spike | null {
  const threshold = CATEGORY_SCREEN_SPIKE_THRESHOLD * tierAbsoluteThresholdMultiplier(appTier);
  let best: Spike | null = null;
  for (const fetch of fetches) {
    if (fetch.state !== 'ready' || fetch.evidenceMode === 'degraded_raw_fallback') continue;
    const counts = new Map<string, { count: number; affectedUserCount: number | null }>();
    for (const row of fetch.rows) {
      const category = row.category ?? 'unknown';
      const screen = row.screen ?? 'unknown';
      const build = row.build ?? 'unknown';
      const platform = row.platform ?? 'unknown';
      const key = JSON.stringify([category, screen, build, platform]);
      const eventCount = Number.isSafeInteger(row.eventCount) && Number(row.eventCount) > 0 ? Number(row.eventCount) : 1;
      const affectedUserCount = Number.isSafeInteger(row.affectedUserCount) && Number(row.affectedUserCount) >= 0
        ? Number(row.affectedUserCount)
        : null;
      const existing = counts.get(key);
      counts.set(key, {
        count: (existing?.count ?? 0) + eventCount,
        affectedUserCount: existing?.affectedUserCount === null || affectedUserCount === null
          ? null
          : (existing?.affectedUserCount ?? 0) + affectedUserCount,
      });
    }
    for (const [key, metric] of counts) {
      if (metric.count < threshold) continue;
      if (best && metric.count <= best.count) continue;
      const [category, screen, build, platform] = JSON.parse(key) as [string, string, string, string];
      best = {
        category,
        screen,
        build,
        platform,
        count: metric.count,
        affectedUserBucket: metric.affectedUserCount === null ? 'unknown' : qualityAffectedUserBucket(metric.affectedUserCount),
        sourceId: fetch.sourceId,
      };
    }
  }
  return best;
}

/** «на экране "friends"» — только если экран реально известен. */
function screenSuffix(screen: string): string {
  return screen === 'unknown' ? '' : ` на экране "${screen}"`;
}

function releaseSuffix(spike: Spike): string {
  const parts = [
    spike.build === 'unknown' ? null : `сборка ${spike.build}`,
    spike.platform === 'unknown' ? null : spike.platform,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

function affectedUsersSuffix(spike: Spike): string {
  return spike.affectedUserBucket === 'unknown'
    ? '; число уникально затронутых пользователей неизвестно'
    : `; уникально затронутых пользователей: ${spike.affectedUserBucket} (privacy bucket)`;
}

function buildFindingText(spike: Spike | null, fetches: readonly FetchQualitySourceResult[]): string {
  if (spike) {
    const where = screenSuffix(spike.screen);
    const release = releaseSuffix(spike);
    const affectedUsers = affectedUsersSuffix(spike);
    // зачем разные слова: «жалоба» подразумевает живого недовольного человека,
    // «сбой» — техническую запись от самого приложения. Смешивать нельзя:
    // владелец принимает по ним разные решения.
    if (isHumanComplaintSource(spike.sourceId)) {
      const what = hasMeaningfulCategory(spike.category) ? ` категории "${spike.category}"` : '';
      return `За текущий UTC-день поступило ${spike.count} событий-жалоб${what}${where}${release}${affectedUsers} — это выше обычного фона.`;
    }
    const what = hasMeaningfulCategory(spike.category) ? ` типа "${spike.category}"` : '';
    return `За текущий UTC-день приложение записало ${spike.count} событий технических ошибок${what}${where}${release}${affectedUsers} — это выше обычного фона. Записал сам код при сбое, никто из людей об этом не сообщал.`;
  }
  const exactFetches = fetches.filter((fetch) =>
    (fetch.state === 'ready' || fetch.state === 'empty') && fetch.evidenceMode !== 'degraded_raw_fallback');
  if (exactFetches.length === 0 && fetches.some((fetch) => fetch.evidenceMode === 'degraded_raw_fallback')) {
    return 'Доступны только неполные деградированные данные: точное число событий и уникально затронутых пользователей пока нельзя утверждать.';
  }
  const total = exactFetches.reduce((sum, fetch) => sum + aggregateQualityRows(fetch.rows).totalCount, 0);
  return total > 0
    ? `За последние сутки поступило ${total} записей о качестве, без явного скачка по одной категории или экрану.`
    : 'За последние сутки новых записей о качестве не поступало.';
}

export function runQualityDepartment(input: RunQualityDepartmentInput): RunQualityDepartmentResult {
  const evidence = input.fetches.map((fetch) => buildQualityEvidence({
    sourceId: fetch.sourceId,
    state: fetch.state,
    truncated: fetch.truncated,
    droppedCount: fetch.droppedCount,
    rows: fetch.rows,
    observedAtMs: fetch.observedAtMs,
  }));

  const appTier: AppTier = input.appTier ?? 'seed';
  const spike = findTopSpike(input.fetches, appTier);
  const anyTrustworthy = evidence.some((item) => item.trustworthy);

  // зачем: по расписанию департамент молчит, если нет ни скачка, ни владельческого
  // вопроса — иначе он писал бы решение каждые сутки просто потому, что запустился.
  const shouldDecide = input.trigger === 'owner_request' || Boolean(spike) || !anyTrustworthy;
  if (!shouldDecide) return { decisions: [] };

  const finding = buildFindingText(spike, input.fetches);
  const isHuman = spike ? isHumanComplaintSource(spike.sourceId) : false;
  const where = spike ? screenSuffix(spike.screen) : '';
  const categoryPart = spike && hasMeaningfulCategory(spike.category) ? ` "${spike.category}"` : '';

  const question = input.question ?? (spike
    ? (isHuman
      ? `Растут ли жалобы${categoryPart}${where}?`
      : `Почему выросло число технических ошибок${categoryPart}${where}?`)
    : 'Есть ли аномалии в качестве за последние сутки?');

  // зачем разные варианты действий: на жалобы людей осмысленно откатывать
  // недавнее изменение — они приходят на конкретную регрессию. На автоматические
  // ошибки откат вслепую опасен: сначала надо увидеть, ЧТО за ошибка, иначе
  // откатывается рабочий релиз из-за давно существующего фонового сбоя.
  const spikeOptions = isHuman
    ? [
      { title: 'Откатить последнее изменение на этом экране', cost: 1, risk: 'low' as const },
      { title: 'Точечно исправить причину без отката', cost: 5, risk: 'medium' as const },
    ]
    : [
      { title: 'Посмотреть текст ошибок и найти причину', cost: 2, risk: 'low' as const },
      { title: 'Откатить последнее изменение на этом экране', cost: 1, risk: 'medium' as const },
    ];

  const decision = buildDecision({
    department: 'quality',
    mode: 'observe',
    trigger: input.trigger,
    question,
    finding,
    hypothesis: spike
      ? (isHuman
        ? `Вероятная причина — недавнее изменение${where}, которое мешает людям.`
        : `Вероятная причина — сбой в коде${where}. Пока неизвестно, замечают ли его пользователи: автоматическая ошибка не всегда видна на экране.`)
      : 'Недостаточно данных для гипотезы.',
    options: spike
      ? spikeOptions
      : [
        { title: 'Продолжить наблюдение без вмешательства', cost: 0, risk: 'low' },
        { title: 'Запросить у владельца дополнительный контекст', cost: 0, risk: 'low' },
      ],
    recommendation: spike
      ? (isHuman ? 'Откатить последнее изменение на этом экране' : 'Посмотреть текст ошибок и найти причину')
      : 'Продолжить наблюдение без вмешательства',
    risk: spike
      ? (isHuman
        ? 'Откат может вернуть ранее исправленную проблему'
        : 'Ошибки могут оказаться фоновыми и давно существующими — откат вслепую сломал бы рабочий релиз')
      : 'Пропустить начало скачка, если он появится позже',
    cost: spike ? (isHuman ? 1 : 2) : 0,
    successMetric: spike
      ? (isHuman
        ? `Число жалоб${categoryPart}${where} возвращается к фоновому уровню`
        : `Число технических ошибок${categoryPart}${where} возвращается к фоновому уровню`)
      : 'Отсутствие новых скачков в следующем суточном снапшоте',
    rollback: 'Вернуть предыдущую сборку экрана',
    evidence,
    nowMs: input.nowMs,
  });

  return { decisions: [decision] };
}
