// ═══════════════════════════════════════════════════════════════════════════
// use_story_cta_action.ts — что делает кнопка действия кадра истории: 6 кнопок шаблонов личных историй (stories-templates-v1) и 3 кнопки
// шаблонов объявлений (stories-announcements-v1: plus / invite / theme).
//
// зачем (CLAUDE.md, Optimistic UI): «Включить тему» меняет тему сразу, локально — просмотр перекрашивается под пальцем, сеть не ждём;
// повторный тап по уже включённой теме ничего не делает. «Поделиться ссылкой» открывает системное окно со ссылкой-приглашением (код — из кэша,
// сервер только если кода ещё нет), двойной тап не открывает второе окно. «Открыть Plus» закрывает просмотр и открывает экран Plus.
// Кнопки событий, которых в приложении ещё нет (дуэль, друг, набор, фраза), в просмотр не попадают; в фотостудии нажатие только пишет лог.
// Логи [STORY-TPL] — каждая ветка и каждый ранний выход.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useRef } from 'react';
import { Linking, Platform, Share } from 'react-native';
import { useRouter } from 'expo-router';
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';
import { emitAppEvent } from '../../../app/events';
import { openPremiumPaywall } from '../../../app/paywall_navigation';
import { isPremiumThemeId } from '../../../app/premium_theme_catalog';
import { isPremiumThemeUnlocked } from '../../../app/premium_theme_entitlements';
import { THEME_SLIDERS_V1_ENABLED } from '../../../constants/theme_sliders_flag';
import { hapticTap } from '../../../hooks/use-haptics';
import { useTheme } from '../../ThemeContext';
import type { StoryCelebrationShare } from './story_instead_registry';
import type { StoryTemplateCta } from './story_template_registry';

const LOG = '[STORY-TPL]';
/** Каталог наборов сообщества (= FC_PACKS_ROUTE). */
const PACKS_ROUTE = '/flashcards_packs';

/** Данные кадра для действия: тема для «Включить тему» (кадр «Новая тема» или объявление design=theme). */
export type StoryCtaContext = Readonly<{ source: string; themeId: string | null; /** данные для «Поделиться» кадров медали и экзаменов */ share?: StoryCelebrationShare | null }>;

export function useStoryCtaAction(lang: Lang, studio: boolean, closeViewer: (source: string) => void): (cta: StoryTemplateCta, ctx: StoryCtaContext) => void {
  const { liquidGlassThemeId, setLiquidGlassThemeId } = useTheme();
  const router = useRouter();
  const sharingRef = useRef(false);
  const ratingRef = useRef(false);
  const storeOpeningRef = useRef(false);
  return useCallback((cta: StoryTemplateCta, ctx: StoryCtaContext) => {
    DebugLogger.info(LOG, `кнопка action=${cta.action} кадр=${ctx.source} студия=${String(studio)}`);
    void hapticTap();
    if (studio) { DebugLogger.info(LOG, `кнопка в фотостудии: только лог, действия нет (action=${cta.action})`); return; }
    if (cta.action === 'use_theme') {
      const themeId = ctx.themeId;
      // зачем (владелец 05.11 ~20:55: все именные темы удалены, остались Светлая/Тёмная + ползунки): старые кадры «Новая тема» не включают именную тему
      if (THEME_SLIDERS_V1_ENABLED) { DebugLogger.info(LOG, `[THEME-SLIDERS] тема: кадр=${ctx.source} themeId=${themeId ?? '—'} — именные темы убраны (ползунки), не включаем`); return; }
      if (!isPremiumThemeId(themeId)) { DebugLogger.info(LOG, `тема: кадр=${ctx.source} themeId=${themeId ?? '—'} не особая тема — выход`); return; }
      if (!isPremiumThemeUnlocked(themeId)) { DebugLogger.info(LOG, `тема ${themeId}: не открыта по entitlements — не включаем`); return; }
      if (liquidGlassThemeId === themeId) { DebugLogger.info(LOG, `тема ${themeId} уже включена — выход`); return; }
      DebugLogger.info(LOG, `тема: ${liquidGlassThemeId} → ${themeId} (локально, сразу)`);
      setLiquidGlassThemeId(themeId);
      return;
    }
    if (cta.action === 'open_plus') {
      // зачем: экран Plus — маршрут; просмотр (Modal) закрываем, иначе экран открылся бы под ним.
      // source 'story_announcement' обязан быть в PAYWALL_SOURCE_VALUES (Ревизор 28.10: без записи окно Plus в стор-сборке закрывалось сразу);
      // context 'generic' — объявление Plus продаёт Plus целиком, а не упёрлось в лимит (как заставка Plus при запуске).
      // зачем (истории-предложения Plus, 11.11): кадр про защиту серии открывает окно с заголовком про серию, а не общее —
      // человек пришёл за конкретной выгодой. Остальные кадры и объявление Plus — общий вход, как раньше.
      const plusContext = ctx.source === 'plus_streak' ? 'streak' : 'generic';
      DebugLogger.info(LOG, `Plus: закрываем просмотр и открываем окно Plus context=${plusContext} source=story_announcement кадр=${ctx.source}`);
      closeViewer('cta_open_plus');
      openPremiumPaywall(router, { context: plusContext, source: 'story_announcement' });
      return;
    }
    if (cta.action === 'open_packs') {
      // зачем (анонс конкурса «Набор месяца», владелец 29.10): кнопка последнего кадра ведёт в каталог наборов сообщества — тот же маршрут,
      // что FC_PACKS_ROUTE (app/flashcards/tabbar_state.ts; модуль не тянем в просмотр историй); просмотр (Modal) закрываем, иначе каталог открылся бы под ним
      DebugLogger.info(LOG, `наборы: закрываем просмотр и открываем ${PACKS_ROUTE} (кадр=${ctx.source})`);
      closeViewer('cta_open_packs');
      router.push(PACKS_ROUTE as never);
      return;
    }
    if (cta.action === 'share_link') {
      // зачем (защита от двойного тапа): пока готовится первое окно «Поделиться», второе не открываем
      if (sharingRef.current) { DebugLogger.info(LOG, 'поделиться: уже открывается — повторный тап пропущен'); return; }
      sharingRef.current = true;
      const t0 = Date.now();
      void import('../../../app/referral_invite_share')
        .then((mod) => mod.buildCloudReferralInviteShare({ lang, userName: '' }))
        .then(async (share) => {
          DebugLogger.info(LOG, `поделиться: ссылка ${share ? 'готова' : 'нет (нет кода/входа)'} за ${Date.now() - t0} мс`);
          if (!share) return;
          const result = await Share.share({ message: share.message, url: share.url });
          DebugLogger.info(LOG, `поделиться: окно закрыто action=${String(result.action)}`);
        })
        .catch((e: unknown) => { DebugLogger.info(LOG, `поделиться упало: ${String(e)}`); })
        .finally(() => { sharingRef.current = false; });
      return;
    }
    if (cta.action === 'review_cards') {
      // зачем (истории вместо окон, 11.11): та же цель, что у кнопки «К карточкам» окна «С возвращением» — сохранённые карточки; просмотр (Modal)
      // закрываем, иначе экран открылся бы под ним
      DebugLogger.info(LOG, `карточки: закрываем просмотр и открываем сохранённые (кадр=${ctx.source})`);
      closeViewer('cta_review_cards');
      router.push({ pathname: '/flashcards_collection', params: { cat: 'saved', from: 'welcome_back' } } as never);
      return;
    }
    if (cta.action === 'upgrade_coin') {
      // зачем (истории вместо окон, 11.11): покупка ранга — на своём экране (церемония чеканки там), как у кнопки «Улучшить» окна «Хватает на ранг»
      DebugLogger.info(LOG, `ранг монеты: закрываем просмотр и открываем экран ранга (кадр=${ctx.source})`);
      closeViewer('cta_upgrade_coin');
      router.push('/coin_rank' as never);
      return;
    }
    if (cta.action === 'enter_referral_code') {
      // зачем (истории вместо окон, 11.11): та же цель, что у кнопки «У меня есть код приглашения» реферального окна — экран рефералов сам
      // выдвигает лист «Код от друга» по параметру enter=1; просмотр (Modal) закрываем, иначе экран открылся бы под ним
      DebugLogger.info(LOG, `код приглашения: закрываем просмотр и открываем ввод кода (кадр=${ctx.source})`);
      closeViewer('cta_enter_referral_code');
      router.push('/referrals?enter=1' as never);
      return;
    }
    if (cta.action === 'enable_reminder') {
      // зачем (истории вместо окон, 11.11): то же, что кнопка «Включить напоминания» окна — запрос разрешения и планирование. Логика одна и
      // живёт в app/_layout.tsx (с замком от двойного тапа и журналом [SMART-REMINDER]); кадр только просит её выполнить. Просмотр закрываем,
      // чтобы системный запрос разрешения не оказался под ним
      DebugLogger.info(LOG, `напоминания: закрываем просмотр и просим включить (кадр=${ctx.source})`);
      closeViewer('cta_enable_reminder');
      emitAppEvent('notif_nudge_enable_request', { source: ctx.source });
      return;
    }
    if (cta.action === 'update_app') {
      // зачем (истории вместо окон, 11.11): то же, что кнопка «Обновить» окна — открыть страницу приложения в магазине. Адрес — из настроек
      // приложения по платформе (событие истории адрес не несёт и подменить его не может); повторный тап магазин дважды не открывает
      if (storeOpeningRef.current) { DebugLogger.info(LOG, 'обновление: магазин уже открывается — повторный тап пропущен'); return; }
      storeOpeningRef.current = true;
      closeViewer('cta_update_app');
      void import('../../../app/config')
        .then(async (config) => {
          const storeUrl = Platform.OS === 'ios' ? config.STORE_URL_IOS : config.STORE_URL_ANDROID;
          await Linking.openURL(storeUrl);
          DebugLogger.info(LOG, `обновление: магазин открыт (кадр=${ctx.source})`);
        })
        .catch((e: unknown) => { DebugLogger.warn(LOG, `обновление: магазин не открылся: ${String(e)}`); })
        .finally(() => { storeOpeningRef.current = false; });
      return;
    }
    if (cta.action === 'share_celebration') {
      // зачем (истории вместо окон, 11.11): та же кнопка «Поделиться», что у уведомления итога урока — тот же текст (celebration_share_messages)
      // и ссылка на магазин; пока готовится первое окно «Поделиться», второе не открываем
      const share = ctx.share;
      if (!share) { DebugLogger.info(LOG, `поделиться достижением: у кадра ${ctx.source} нет данных — выход`); return; }
      if (sharingRef.current) { DebugLogger.info(LOG, 'поделиться достижением: уже открывается — повторный тап пропущен'); return; }
      sharingRef.current = true;
      void Promise.all([import('../../../app/celebration_share_messages'), import('../../../app/config')])
        .then(async ([messages, config]) => {
          const body = messages.buildCelebrationShareBody(share.kind, lang, share.lessonId, share.score, { medalTier: share.medalTier, cefrLevel: share.cefrLevel });
          const result = await Share.share({ message: `${body}\n${config.STORE_URL}` });
          DebugLogger.info(LOG, `поделиться достижением: окно закрыто action=${String(result.action)} (кадр=${ctx.source})`);
        })
        .catch((e: unknown) => { DebugLogger.info(LOG, `поделиться достижением упало: ${String(e)}`); })
        .finally(() => { sharingRef.current = false; });
      return;
    }
    if (cta.action === 'start_lesson') {
      // зачем (истории вместо окон, 11.11): кнопка кадра «Открыт урок N» ведёт в список уроков, а не в сам урок — проверки энергии и Plus
      // живут в списке, обходить их из истории нельзя; просмотр (Modal) закрываем, иначе экран открылся бы под ним
      DebugLogger.info(LOG, `урок: закрываем просмотр и открываем список уроков (кадр=${ctx.source})`);
      closeViewer('cta_start_lesson');
      router.push('/(tabs)/lessons' as never);
      return;
    }
    if (cta.action === 'rate_app') {
      // зачем (истории вместо окон, 11.11): то же, что главная кнопка окна просьбы об оценке — открыть страницу магазина; «оценено» ставим только
      // если магазин открылся (R58 #55: иначе просьба пропадала навсегда без оценки); двойной тап магазин дважды не открывает
      if (ratingRef.current) { DebugLogger.info(LOG, 'оценка: магазин уже открывается — повторный тап пропущен'); return; }
      ratingRef.current = true;
      closeViewer('cta_rate_app');
      void Promise.all([import('../../../app/store_review'), import('../../../app/review_utils')])
        .then(async ([store, review]) => {
          const opened = await store.openStoreReviewPage();
          DebugLogger.info(LOG, `оценка: магазин открыт=${String(opened)} (кадр=${ctx.source})`);
          if (opened) await review.markReviewRated();
        })
        .catch((e: unknown) => { DebugLogger.info(LOG, `оценка упала: ${String(e)}`); })
        .finally(() => { ratingRef.current = false; });
      return;
    }
    DebugLogger.info(LOG, `кнопка action=${cta.action}: события этого кадра в приложении ещё нет — переход не назначен`);
  }, [closeViewer, lang, liquidGlassThemeId, router, setLiquidGlassThemeId, studio]);
}
