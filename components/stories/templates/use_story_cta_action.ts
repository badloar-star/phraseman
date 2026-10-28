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
import { Share } from 'react-native';
import { useRouter } from 'expo-router';
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';
import { openPremiumPaywall } from '../../../app/paywall_navigation';
import { isPremiumThemeId } from '../../../app/premium_theme_catalog';
import { isPremiumThemeUnlocked } from '../../../app/premium_theme_entitlements';
import { hapticTap } from '../../../hooks/use-haptics';
import { useTheme } from '../../ThemeContext';
import type { StoryTemplateCta } from './story_template_registry';

const LOG = '[STORY-TPL]';

/** Данные кадра для действия: тема для «Включить тему» (кадр «Новая тема» или объявление design=theme). */
export type StoryCtaContext = Readonly<{ source: string; themeId: string | null }>;

export function useStoryCtaAction(lang: Lang, studio: boolean, closeViewer: (source: string) => void): (cta: StoryTemplateCta, ctx: StoryCtaContext) => void {
  const { liquidGlassThemeId, setLiquidGlassThemeId } = useTheme();
  const router = useRouter();
  const sharingRef = useRef(false);
  return useCallback((cta: StoryTemplateCta, ctx: StoryCtaContext) => {
    DebugLogger.info(LOG, `кнопка action=${cta.action} кадр=${ctx.source} студия=${String(studio)}`);
    void hapticTap();
    if (studio) { DebugLogger.info(LOG, `кнопка в фотостудии: только лог, действия нет (action=${cta.action})`); return; }
    if (cta.action === 'use_theme') {
      const themeId = ctx.themeId;
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
      DebugLogger.info(LOG, 'Plus: закрываем просмотр и открываем окно Plus context=generic source=story_announcement');
      closeViewer('cta_open_plus');
      openPremiumPaywall(router, { context: 'generic', source: 'story_announcement' });
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
    DebugLogger.info(LOG, `кнопка action=${cta.action}: события этого кадра в приложении ещё нет — переход не назначен`);
  }, [closeViewer, lang, liquidGlassThemeId, router, setLiquidGlassThemeId, studio]);
}
