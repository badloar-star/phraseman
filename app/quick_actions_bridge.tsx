/**
 * зачем (владелец 04.11, ярлыки на значке): мост нативных быстрых действий (expo-quick-actions) и роутера.
 * Монтируется во вкладках (т.е. только после онбординга): гость/новичок без пройденного входа просто попадает на Главную.
 * Ярлыки ставятся динамически на языке интерфейса; обработка холодного старта (initial) — один раз за запуск.
 * Сеть и Firebase не трогаются. Логи [QUICK-ACTIONS]: вход, решение, маршрут, ошибки.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as QuickActions from 'expo-quick-actions';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { QUICK_ACTION_IDS, isQuickActionId, quickActionRoute, quickActionTitles } from './quick_actions_config';
import { whenOnboardingSettled } from './onboarding_defer_gate';
import { lastOpenedLessonKey } from './target_storage_keys';

const LOG = '[QUICK-ACTIONS]';
// зачем (Ревизор 04.11): начальное действие обрабатывается ОДИН раз за запуск приложения — на уровне модуля, а не компонента:
// ReleasedTabLayout пересоздаётся при lite-режиме, и флаг в useRef давал второй переход в урок.
let initialQuickActionHandled = false;

export default function QuickActionsBridge(): null {
  const router = useRouter();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const studyTargetRef = useRef(studyTarget);
  studyTargetRef.current = studyTarget;

  // Ярлыки на языке интерфейса (меняются при смене языка).
  useEffect(() => {
    let cancelled = false;
    const titles = quickActionTitles(lang);
    const items = QUICK_ACTION_IDS.map((id) => ({
      id,
      title: titles[id],
      icon: id === 'new_card' ? 'add' : id === 'review_words' ? 'update' : 'play',
      params: { href: id },
    }));
    // зачем (Ревизор 04.11): ярлыки ставятся только после «онбординг пройден» (тот же гейт, что у тяжёлых прогревов)
    void whenOnboardingSettled('quick_actions_items').then((outcome) => {
      if (cancelled) return;
      return QuickActions.setItems(items).then(
        () => console.log(LOG, 'items:set', JSON.stringify({ lang, count: items.length, onboarding: outcome })), // guard-ok: итог установки
        (error: unknown) => console.warn(LOG, 'items:set_failed', error instanceof Error ? error.message : String(error)),
      );
    });
    return () => { cancelled = true; };
  }, [lang]);

  useEffect(() => {
    const open = async (action: { id?: string } | null | undefined, source: string): Promise<void> => {
      const id = action?.id;
      if (!isQuickActionId(id)) {
        console.log(LOG, 'ignored', JSON.stringify({ source, id: id ?? null })); // guard-ok: ранний выход с причиной
        return;
      }
      let lastLessonRaw: string | null = null;
      try {
        lastLessonRaw = await AsyncStorage.getItem(lastOpenedLessonKey(studyTargetRef.current));
      } catch (error: unknown) {
        console.warn(LOG, 'last_lesson_read_failed', error instanceof Error ? error.message : String(error));
      }
      // зачем: действие открывается только когда онбординг не идёт (гость/новичок во время онбординга остаётся на нём)
      const settled = await whenOnboardingSettled(`quick_action_${source}`);
      const route = quickActionRoute(id, lastLessonRaw);
      console.log(LOG, 'onboarding', JSON.stringify({ source, id, settled })); // guard-ok: ветвление
      console.log(LOG, 'open', JSON.stringify({ source, id, route })); // guard-ok: решение и маршрут
      setTimeout(() => router.push(route as never), 0);
    };

    if (!initialQuickActionHandled) {
      initialQuickActionHandled = true;
      if (QuickActions.initial) void open(QuickActions.initial, 'initial');
    }
    const sub = QuickActions.addListener((action) => { void open(action, 'listener'); });
    return () => sub?.remove();
  }, [router]);

  return null;
}
