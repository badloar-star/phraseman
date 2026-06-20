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
    const topics = day.topicFocus ? [day.topicFocus] : [];
    const level = 0; // грубый уровень для подписи; уточняется применяющим слоем
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
