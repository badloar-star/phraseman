// ═══════════════════════════════════════════════════════════════════════════
// use_story_cta_action.ts — что делает кнопка действия кадра истории (6 кнопок макета stories-templates-v1.html).
//
// зачем (CLAUDE.md, Optimistic UI): «Включить тему» меняет тему сразу, локально — просмотр перекрашивается под пальцем, сеть не ждём;
// повторный тап по уже включённой теме ничего не делает. «Поделиться ссылкой» открывает системное окно со ссылкой-приглашением (код — из кэша,
// сервер только если кода ещё нет). Остальные четыре кнопки принадлежат событиям, которых в приложении ещё нет (дуэль, друг, набор, фраза):
// в просмотр они не попадают; в фотостудии нажатие только пишет лог. Логи [STORY-TPL] — каждая ветка и каждый ранний выход.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useRef } from 'react';
import { Share } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';
import { isPremiumThemeId } from '../../../app/premium_theme_catalog';
import { isPremiumThemeUnlocked } from '../../../app/premium_theme_entitlements';
import { hapticTap } from '../../../hooks/use-haptics';
import { useTheme } from '../../ThemeContext';
import type { StoryTemplate, StoryTemplateCta } from './story_template_registry';

const LOG = '[STORY-TPL]';

export function useStoryCtaAction(lang: Lang, studio: boolean): (cta: StoryTemplateCta, tpl: StoryTemplate) => void {
  const { liquidGlassThemeId, setLiquidGlassThemeId } = useTheme();
  const sharingRef = useRef(false);
  return useCallback((cta: StoryTemplateCta, tpl: StoryTemplate) => {
    DebugLogger.info(LOG, `кнопка action=${cta.action} кадр=${tpl.id} студия=${String(studio)}`);
    void hapticTap();
    if (studio) { DebugLogger.info(LOG, `кнопка в фотостудии: только лог, действия нет (action=${cta.action})`); return; }
    if (cta.action === 'use_theme') {
      if (tpl.id !== 'theme' || !isPremiumThemeId(tpl.themeId)) { DebugLogger.info(LOG, `тема: кадр=${tpl.id} themeId не особая тема — выход`); return; }
      if (!isPremiumThemeUnlocked(tpl.themeId)) { DebugLogger.info(LOG, `тема ${tpl.themeId}: не открыта по entitlements — не включаем`); return; }
      if (liquidGlassThemeId === tpl.themeId) { DebugLogger.info(LOG, `тема ${tpl.themeId} уже включена — выход`); return; }
      DebugLogger.info(LOG, `тема: ${liquidGlassThemeId} → ${tpl.themeId} (локально, сразу)`);
      setLiquidGlassThemeId(tpl.themeId);
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
  }, [lang, liquidGlassThemeId, setLiquidGlassThemeId, studio]);
}
