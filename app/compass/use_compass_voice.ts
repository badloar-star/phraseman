/**
 * Компас — хук тёплого голоса дня. Волна 5.2.
 *
 * Возвращает текст комментария для брифинга. Гибрид:
 *  - если ИИ-голос включён (compass_ai_voice) — зовёт CF и кэширует; пока грузится
 *    или при сбое/выключении — показывает текст Библии (fallback из compass_copy);
 *  - если ИИ-голос выключен — сразу текст Библии (0 вызовов).
 *
 * ИЗОЛЯЦИЯ: при выключенном Компасе хук не зовётся (модал не смонтирован). Сам
 * хук безопасен: ИИ — необязательное украшение, день всегда озвучен по Библии.
 */
import { useEffect, useState } from 'react';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';
import { compassAiVoiceOn } from './compass_flags';
import { COMPASS_DAY_COMMENT } from './compass_copy';
import type { CompassDay } from './compass_brain';
import { callCompassVoice } from './compass_voice_client';

/** Грубый уровень для подписи кэша голоса: a0..b1 → 0..3, неизвестно → 0. */
const VOICE_LEVEL: Record<string, number> = { a0: 0, a1: 1, a2: 2, b1: 3 };

export function compassVoiceLevel(level: string | null | undefined): number {
  if (!level) return 0;
  return VOICE_LEVEL[level] ?? 0;
}

/**
 * Текст комментария дня. Сначала — детерминированный fallback по Библии (мгновенно),
 * затем, если ИИ-голос включён, подменяется живым текстом из CF (когда придёт).
 */
export function useCompassVoice(day: CompassDay | null): string {
  const { lang } = useLang();
  const fallback = day ? triLang(lang, COMPASS_DAY_COMMENT[day.type]) : '';
  const [comment, setComment] = useState<string>(fallback);

  useEffect(() => {
    setComment(fallback);
    if (!day || !compassAiVoiceOn()) return;
    let cancelled = false;
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
    void callCompassVoice({ dayType: day.type, topics, level, lang })
      .then((res) => {
        if (cancelled) return;
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
