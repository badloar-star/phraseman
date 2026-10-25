// ═══════════════════════════════════════════════════════════════════════════
// use_paywall_m_person.ts — данные человека для пейвола «Вариант М»: урок, серия, выученные фразы, дорога на 30 дней.
//
// зачем (координатор 25.10; правило проекта «каждый раздел открывается мгновенно»): всё берётся с телефона — снимок прогресса (в памяти, синхронно) и кэш
// статистики профиля (одно локальное чтение после первого кадра). Сети и Firestore нет: ни одного чтения за счёт пейвола. Пока кэш не прочитан, число фраз —
// null, плитка рисует тире на том же месте (без «ноль, потом прыжок»). Журнал [PAYWALL-M] — откуда что пришло; каждый сбой пишет причину.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react';

import type { Lang } from '../../../constants/i18n';
import { usePersonalProgressSnapshot } from '../../../app/personal_progress_store';
import { useAfterFirstFrame } from '../../../hooks/use-after-first-frame';
import type { PaywallMPerson } from './paywall_m_model';
import { loadPaywallMCourseCursor } from './paywall_m_course_cursor';
import { paywallMRoadFromUpcoming, type PaywallMRoadItem } from './paywall_m_road';

const LOG = '[PAYWALL-M]';

/** Человек из локального снимка. `phrasesLearned` приходит позже (кэш статистики), до того — null. */
export function usePaywallMPerson(enabled: boolean): PaywallMPerson {
  const progress = usePersonalProgressSnapshot();
  const [phrasesLearned, setPhrasesLearned] = useState<number | null>(null);
  // зачем: флаг М выключен — ни одного чтения сверх прежнего окна
  const afterFirstFrame = useAfterFirstFrame('paywall-m-person', enabled);
  useEffect(() => {
    if (!enabled || !afterFirstFrame) return undefined;
    let alive = true;
    const startedAt = Date.now();
    void import('../../../app/lifetime_profile_stats')
      .then((m) => m.readLifetimeProfileStatsCache())
      .then((stats) => {
        if (!alive) return;
        const value = typeof stats?.phrasesLearned === 'number' && Number.isFinite(stats.phrasesLearned) ? Math.max(0, Math.floor(stats.phrasesLearned)) : null;
        console.log(LOG, 'person:phrases', JSON.stringify({ source: stats ? 'cache' : 'none', value, ms: Date.now() - startedAt })); // guard-ok: одна строка на открытие окна
        setPhrasesLearned(value);
      })
      .catch((error: unknown) => {
        console.warn(LOG, 'person:phrases_failed', JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); // guard-ok: сбой пишет причину
      });
    return () => { alive = false; };
  }, [afterFirstFrame, enabled]);
  return useMemo<PaywallMPerson>(() => ({
    lessonsDone: progress.completedLessons.length,
    streakDays: progress.streakCount,
    phrasesLearned,
    activeDays: progress.activityDates.length,
  }), [phrasesLearned, progress.activityDates.length, progress.completedLessons.length, progress.streakCount]);
}

/**
 * Три фразы следующих уроков из Learning V2 (локально, без сети). Читаются после первого кадра: сначала курсор прогресса (диск), потом функция курса (память);
 * пока нет — пустой список, раздел появляется ниже графика без сдвига остального. Нет перевода на язык интерфейса / курс пройден — пусто, раздел скрыт.
 */
export function usePaywallMRoad(lang: Lang): readonly PaywallMRoadItem[] {
  const afterFirstFrame = useAfterFirstFrame('paywall-m-road');
  const [items, setItems] = useState<readonly PaywallMRoadItem[]>([]);
  useEffect(() => {
    if (!afterFirstFrame) return undefined;
    let alive = true;
    void loadPaywallMCourseCursor().then((cursor) => {
      if (!alive) return;
      if (!cursor) { console.log(LOG, 'road:skip', JSON.stringify({ reason: 'no_cursor' })); return; } // guard-ok: ранний выход пишет причину
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { learningV2UpcomingCoursePhrasesV1 } = require('../../../modules/learning-v2/content/paywall_upcoming_phrases_v1') as typeof import('../../../modules/learning-v2/content/paywall_upcoming_phrases_v1');
        const phrases = learningV2UpcomingCoursePhrasesV1({ currentSessionId: cursor.currentSessionId, completedCount: cursor.completedCount, interfaceLocale: lang, count: 3 });
        const built = paywallMRoadFromUpcoming(phrases);
        console.log(LOG, 'road:built', JSON.stringify({ lang, phrases: phrases.length, items: built.map((i) => i.lesson) })); // guard-ok: одна строка на открытие окна
        setItems(built);
      } catch (error) {
        console.warn(LOG, 'road:failed', JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); // guard-ok: сбой пишет причину
      }
    });
    return () => { alive = false; };
  }, [afterFirstFrame, lang]);
  return items;
}
