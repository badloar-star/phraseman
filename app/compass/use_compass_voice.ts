/**
 * Компас — хук тёплого голоса дня. Волна 5.2.
 *
 * Возвращает текст комментария для брифинга. Гибрид:
 *  - если ИИ-голос включён (compass_ai_voice) — зовёт CF и кэширует; пока грузится
 *    или при сбое/выключении — показывает текст Библии (fallback из compass_copy);
 *  - если ИИ-голос выключен — сразу текст Библии (0 вызовов).
 *
 * Поздний ответ ИИ НЕ подменяет текст: если живой комментарий пришёл, когда
 * человек уже дочитал fallback (LATE_SWAP_MS), оставляем как есть — скачок
 * заголовка посреди чтения хуже, чем отсутствие «живинки».
 *
 * Вечером (с EVENING_VOICE_HOUR) обычные дни озвучиваются вечерними вариантами:
 * «план дня» в 23:00 утренним тоном звучал фальшиво.
 *
 * ИЗОЛЯЦИЯ: при выключенном Компасе хук не зовётся (модал не смонтирован). Сам
 * хук безопасен: ИИ — необязательное украшение, день всегда озвучен по Библии.
 */
import { useEffect, useState } from 'react';
import { useLang } from '../../components/LangContext';
import { triLang, type Lang } from '../../constants/i18n';
import { compassAiVoiceOn } from './compass_flags';
import { loadCompassUserPrefs } from './compass_user_prefs';
import { COMPASS_DAY_COMMENT, COMPASS_EVENING_COMMENTS, pickCompassDailyVariant } from './compass_copy';
import type { CompassDay } from './compass_brain';
import { callCompassVoice } from './compass_voice_client';

/** Грубый уровень для подписи кэша голоса: a0..b1 → 0..3, неизвестно → 0. */
const VOICE_LEVEL: Record<string, number> = { a0: 0, a1: 1, a2: 2, b1: 3 };
/** Позже этого срока живой текст не подменяет уже прочитанный fallback. */
const LATE_SWAP_MS = 7000;
/** С этого локального часа обычные дни говорят вечерним голосом. */
const EVENING_VOICE_HOUR = 19;

export function compassVoiceLevel(level: string | null | undefined): number {
  if (!level) return 0;
  return VOICE_LEVEL[level] ?? 0;
}

function localDateKey(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Fallback-комментарий дня по Библии: вечером у обычных дней — вечерний тон. */
export function compassFallbackComment(day: CompassDay | null, lang: Lang, nowMs: number): string {
  if (!day) return '';
  const isRegularDay = day.type === 'easy' || day.type === 'deep_dive' || day.type === 'repair';
  if (isRegularDay && new Date(nowMs).getHours() >= EVENING_VOICE_HOUR) {
    return triLang(lang, pickCompassDailyVariant(COMPASS_EVENING_COMMENTS, localDateKey(nowMs)));
  }
  return triLang(lang, COMPASS_DAY_COMMENT[day.type]);
}

/**
 * Текст комментария дня. Сначала — детерминированный fallback по Библии (мгновенно),
 * затем, если ИИ-голос включён И ответ пришёл быстро, подменяется живым текстом.
 */
export function useCompassVoice(day: CompassDay | null): string {
  const { lang } = useLang();
  const fallback = compassFallbackComment(day, lang, Date.now());
  const [comment, setComment] = useState<string>(fallback);

  useEffect(() => {
    setComment(fallback);
    if (!day || !compassAiVoiceOn()) return;
    let cancelled = false;
    const startedAt = Date.now();
    // Подпись дня — РЕАЛЬНАЯ, а не вырожденная (раньше level=0 и один топик у
    // всех давали одинаковую подпись кэша → один текст на тип дня для всех).
    // Темы: фокус дня + темы задач (dedup, максимум 3, сортировка для стабильного
    // ключа кэша). Уровень: из онбординга a0..b1 → 0..3.
    const topicSet = new Set<string>();
    if (day.topicFocus) topicSet.add(day.topicFocus);
    for (const task of day.tasks) {
      const topic = task.weakTopic ?? task.focus;
      if (topic) topicSet.add(topic);
    }
    const topics = [...topicSet].sort().slice(0, 3);
    const level = compassVoiceLevel(day.level);
    // Личная настройка «Личный комментарий дня» (Настройки → Компас): выключено →
    // текст Библии без единого вызова CF.
    void loadCompassUserPrefs()
      .then((prefs) => {
        if (cancelled || !prefs.aiVoice) return null;
        return callCompassVoice({ dayType: day.type, topics, level, lang });
      })
      .then((res) => {
        if (cancelled || !res) return;
        // Поздний ответ не подменяет уже прочитанный текст (анти-скачок).
        if (Date.now() - startedAt > LATE_SWAP_MS) return;
        if (res.status === 'ok' && res.comment) setComment(res.comment);
      })
      .catch(() => {
        /* остаётся fallback по Библии */
      });
    return () => {
      cancelled = true;
    };
  }, [day, lang, fallback]);

  return comment;
}
