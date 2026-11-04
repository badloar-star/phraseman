/**
 * зачем (владелец 04.11, ярлыки на значке): мост нативных быстрых действий (expo-quick-actions) и роутера.
 * Монтируется во вкладках; ярлыки ставятся и действие открывается ТОЛЬКО после «онбординг пройден» (whenOnboardingSettled).
 * Модуль подключается ЛЕНИВО в try/catch: OTA на старой нативной сборке, dev-APK без модуля и тесты не получают красный экран
 * «Unable to resolve module» — мост просто не работает ([QUICK-ACTIONS] unavailable:<причина>). Сеть и Firebase не трогаются.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { QUICK_ACTION_IDS, isQuickActionId, quickActionRoute, quickActionTitles } from './quick_actions_config';
import { whenOnboardingSettled } from './onboarding_defer_gate';
import { lastOpenedLessonKey } from './target_storage_keys';

const LOG = '[QUICK-ACTIONS]';

type QuickActionEvent = { id?: string } | null | undefined;
type QuickActionsModule = {
  initial?: QuickActionEvent;
  setItems: (items: ReadonlyArray<Record<string, unknown>>) => Promise<unknown>;
  addListener: (listener: (action: QuickActionEvent) => void) => { remove: () => void } | undefined;
};

let quickActionsModule: QuickActionsModule | null | undefined;

/** Ленивая загрузка нативного модуля. null — модуля нет в этой сборке/окружении (не ошибка). */
export function loadQuickActionsModule(): QuickActionsModule | null {
  if (quickActionsModule !== undefined) return quickActionsModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- ленивый require в try/catch: модуля может не быть (OTA на старой сборке, dev без модуля, тесты)
    const mod = require('expo-quick-actions') as QuickActionsModule;
    quickActionsModule = mod && typeof mod.setItems === 'function' && typeof mod.addListener === 'function' ? mod : null;
    if (!quickActionsModule) console.log(LOG, 'unavailable:bad_module_shape'); // guard-ok: причина недоступности
  } catch (error: unknown) {
    quickActionsModule = null;
    console.log(LOG, `unavailable:${error instanceof Error ? error.message.slice(0, 80) : String(error).slice(0, 80)}`); // guard-ok: причина недоступности
  }
  return quickActionsModule;
}

/** Только для тестов. */
export function __resetQuickActionsModuleForTests(): void {
  quickActionsModule = undefined;
}

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
    const QuickActions = loadQuickActionsModule();
    if (!QuickActions) return undefined;
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
      if (cancelled) return undefined;
      try {
        return Promise.resolve(QuickActions.setItems(items)).then(
          () => console.log(LOG, 'items:set', JSON.stringify({ lang, count: items.length, onboarding: outcome })), // guard-ok: итог установки
          (error: unknown) => console.warn(LOG, 'items:set_failed', error instanceof Error ? error.message : String(error)),
        );
      } catch (error: unknown) {
        console.warn(LOG, 'items:set_threw', error instanceof Error ? error.message : String(error));
        return undefined;
      }
    });
    return () => { cancelled = true; };
  }, [lang]);

  useEffect(() => {
    const QuickActions = loadQuickActionsModule();
    if (!QuickActions) return undefined;
    const open = async (action: QuickActionEvent, source: string): Promise<void> => {
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
      console.log(LOG, 'open', JSON.stringify({ source, id, route, onboarding: settled })); // guard-ok: решение и маршрут
      setTimeout(() => router.push(route as never), 0);
    };

    try {
      if (!initialQuickActionHandled) {
        initialQuickActionHandled = true;
        if (QuickActions.initial) void open(QuickActions.initial, 'initial');
      }
      const sub = QuickActions.addListener((action) => { void open(action, 'listener'); });
      return () => sub?.remove();
    } catch (error: unknown) {
      console.warn(LOG, 'listener_failed', error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }, [router]);

  return null;
}
