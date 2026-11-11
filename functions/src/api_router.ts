// зачем (владелец 11.11, план docs/work/tasks/firebase-cold-start-router-2026-11-11.md, шаг 1): общая точка входа `api`
// рядом с базой. Замер Cloud Monitoring за 7 суток: холодный старт стоит 2 vCPU × (старт + 10 с) ≈ 31–43 vCPU-с, а
// пользовательские функции будятся 5 328 раз в неделю. Общий сервис занят почти непрерывно (пустых 15-минутных окон 12 из 672).
//
// ПОДКЛЮЧЕНИЕ: функция попадёт в деплой только после строки `export { api } from './api_router';` в index.ts.
// 11.11 index.ts редактировался в другой сессии — строка намеренно НЕ добавлена, см. план, раздел 6.
import { onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { createApiRouterHandler, type ApiRoute } from './api_router_core';
import { globalBroadcastListActive } from './global_broadcast_public';
import { premiumThemeEntitlementsGet } from './premium_themes';
import { getActiveShardSurvey } from './shard_survey';
import { storyAnnouncementsGet } from './story_announcements';

/**
 * Белый список первой очереди: только «читающие» функции без секретов — ошибка маршрутизации здесь не может ни выдать награду
 * дважды, ни потерять прогресс. Расширение (награды, профиль, затем T0-пути прогресса) — по шагам 4–5 плана, после недели замера.
 * Старые одноимённые функции в us-central1 остаются: их зовут уже выпущенные сборки приложения.
 */
export const API_ROUTER_ROUTES: Readonly<Record<string, ApiRoute>> = Object.freeze({
  storyAnnouncementsGet,
  globalBroadcastListActive,
  getActiveShardSurvey,
  premiumThemeEntitlementsGet,
});

export const API_ROUTER_OPTIONS = Object.freeze({
  // europe-west1 рядом с базой (eur3): обращение к базе — единицы мс вместо ≈ 120 мс из us-central1 (callable_options.ts).
  region: 'europe-west1',
  enforceAppCheck: ENFORCE_APP_CHECK,
  // Полное ядро и 80 параллельных запросов на экземпляр: всплеск вызовов обслуживает один тёплый экземпляр, а не будит новые.
  cpu: 1,
  concurrency: 80,
  // Бандл со всеми обработчиками занимал ≈ 340 МБ (замер в support_inbox.ts) — 256 МБ не хватит.
  memory: '512MiB' as const,
  // Самый долгий из включённых обработчиков ограничен 15 с; запас на холодный старт.
  timeoutSeconds: 60,
  maxInstances: 10,
  minInstances: 0,
});

export const api = onCall(
  API_ROUTER_OPTIONS,
  createApiRouterHandler(API_ROUTER_ROUTES, {
    now: Date.now,
    // Одна строка на вызов: без неё пропадёт разбивка «какая функция сколько работала», которую раньше давали отдельные сервисы.
    log: (level, payload) => {
      const line = JSON.stringify(payload);
      if (level === 'warn') console.warn('[API-ROUTER]', line);
      else console.log('[API-ROUTER]', line);
    },
  }),
);
