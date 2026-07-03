// ════════════════════════════════════════════════════════════════════════════
// manual_update_modal_persistence.test.ts
//
// Регрессия для «окна обновления» (manual update modal), управляемого из админки
// («Пульт» → Manual update modal → кнопка «Показать окно обновления»).
//
// Проверяем 3 сценария, которые должны работать НЕЗАВИСИМО:
//   1) Voluntary (optional) БЕЗ target-версии: показывается ВСЕМ юзерам любой
//      версии; держится на экране до действия пользователя; после закрытия
//      (markCampaignDismissed) больше не появляется — в т.ч. после перезапуска
//      (dismissal persisted в AsyncStorage).
//   2) Target-версия: показывается только тем, у кого версия/билд НИЖЕ цели;
//      у кого уже >= цели — не показывается.
//   3) Force: нельзя «закрыть навсегда» — игнорирует локальный seen/dismissal,
//      показывается пока админ не выключит / версия не догонит target.
//
// ГЛАВНАЯ РЕГРЕССИЯ (баг, который чинили): раньше ForceUpdateGate помечал optional
// кампанию dismissed В МОМЕНТ РЕНДЕРА. Из-за асинхронного резолва userId повторный
// refresh() видел уже записанный dismissal и прятал окно САМ, до действия юзера.
// Тест моделирует эту последовательность: два подряд «чтения гейта» без действия
// пользователя обязаны оба вернуть «показать».
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldShowManualUpdate } from '../app/remote_flags';
import {
  campaignDismissalKey,
  isCampaignDismissed,
  markCampaignDismissed,
} from '../app/campaign_dismissals';

// Повторяет решение ForceUpdateGate.readManualState() в чистом виде: гейт-решение
// = pure-логика shouldShowManualUpdate + персистентный слой dismissals. Никакого
// побочного «пометить при показе» здесь нет (и не должно быть в компоненте).
async function gateShouldShow(params: {
  enabled: boolean;
  campaignId: string;
  mode: 'force' | 'optional';
  currentBuild: string;
  targetBuild: string;
  platformFilter?: string;
  platform?: string;
}): Promise<boolean> {
  const key = campaignDismissalKey('manual_update', params.campaignId);
  const alreadySeen = params.mode === 'optional' ? await isCampaignDismissed(key) : false;
  return shouldShowManualUpdate({
    enabled: params.enabled,
    campaignId: params.campaignId,
    mode: params.mode,
    currentBuild: params.currentBuild,
    targetBuild: params.targetBuild,
    platformFilter: params.platformFilter,
    platform: params.platform,
    seenCampaignIds: alreadySeen ? [params.campaignId] : [],
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('manual update modal — persistence & three modes', () => {
  describe('1) voluntary без target — всем юзерам, закрыл = больше не видно', () => {
    const base = {
      enabled: true,
      campaignId: 'manual_update_2026_06_27',
      mode: 'optional' as const,
      targetBuild: '', // версия не важна → показываем всем
    };

    it('показывается на любой версии (низкой и высокой)', async () => {
      expect(await gateShouldShow({ ...base, currentBuild: '1.0.0' })).toBe(true);
      expect(await gateShouldShow({ ...base, currentBuild: '99.0.0' })).toBe(true);
    });

    it('РЕГРЕССИЯ: два чтения подряд без действия юзера — окно держится (не самозакрывается)', async () => {
      // моделирует двойной refresh() в ForceUpdateGate (userId null → резолвнулся)
      expect(await gateShouldShow({ ...base, currentBuild: '1.0.0' })).toBe(true);
      expect(await gateShouldShow({ ...base, currentBuild: '1.0.0' })).toBe(true);
    });

    it('после закрытия пользователем больше не показывается (и переживает перезапуск)', async () => {
      expect(await gateShouldShow({ ...base, currentBuild: '1.0.0' })).toBe(true);
      // пользователь нажал «Закрыть»/«Обновить» → компонент пишет dismissal
      await markCampaignDismissed(campaignDismissalKey('manual_update', base.campaignId));
      expect(await gateShouldShow({ ...base, currentBuild: '1.0.0' })).toBe(false);
      // «перезапуск»: dismissal лежит в AsyncStorage, читается заново
      expect(await isCampaignDismissed(campaignDismissalKey('manual_update', base.campaignId))).toBe(true);
      expect(await gateShouldShow({ ...base, currentBuild: '1.0.0' })).toBe(false);
    });

    it('новая кампания (другой campaign_id) показывается снова, даже если старую закрыли', async () => {
      await markCampaignDismissed(campaignDismissalKey('manual_update', base.campaignId));
      expect(await gateShouldShow({ ...base, currentBuild: '1.0.0' })).toBe(false);
      expect(await gateShouldShow({ ...base, campaignId: 'manual_update_2026_07_01', currentBuild: '1.0.0' })).toBe(true);
    });
  });

  describe('2) target-версия — только тем, кто ниже цели', () => {
    const base = {
      enabled: true,
      campaignId: 'manual_update_target',
      mode: 'optional' as const,
      targetBuild: '1.5.44',
    };

    it('версия ниже цели → показать; ровно/выше цели → не показывать', async () => {
      expect(await gateShouldShow({ ...base, currentBuild: '1.5.43' })).toBe(true);
      expect(await gateShouldShow({ ...base, currentBuild: '1.5.44' })).toBe(false);
      expect(await gateShouldShow({ ...base, currentBuild: '1.6.0' })).toBe(false);
    });

    it('числовой build (Android versionCode): ниже цели показать, не ниже — нет', async () => {
      expect(await gateShouldShow({ ...base, targetBuild: '81', currentBuild: '80' })).toBe(true);
      expect(await gateShouldShow({ ...base, targetBuild: '81', currentBuild: '81' })).toBe(false);
      expect(await gateShouldShow({ ...base, targetBuild: '80', currentBuild: '81' })).toBe(false);
    });
  });

  describe('2b) platform target — iOS/Android/both', () => {
    const base = {
      enabled: true,
      campaignId: 'manual_update_platform',
      mode: 'optional' as const,
      targetBuild: '',
      currentBuild: '1.0.0',
    };

    it('empty platform filter keeps the old behavior: both platforms see it', async () => {
      expect(await gateShouldShow({ ...base, platformFilter: '', platform: 'ios' })).toBe(true);
      expect(await gateShouldShow({ ...base, platformFilter: '', platform: 'android' })).toBe(true);
    });

    it('ios-only campaign is hidden on Android', async () => {
      expect(await gateShouldShow({ ...base, platformFilter: 'ios', platform: 'ios' })).toBe(true);
      expect(await gateShouldShow({ ...base, platformFilter: 'ios', platform: 'android' })).toBe(false);
    });

    it('android-only campaign is hidden on iOS', async () => {
      expect(await gateShouldShow({ ...base, platformFilter: 'android', platform: 'android' })).toBe(true);
      expect(await gateShouldShow({ ...base, platformFilter: 'android', platform: 'ios' })).toBe(false);
    });
  });

  describe('3) force — нельзя закрыть навсегда', () => {
    const base = {
      enabled: true,
      campaignId: 'manual_update_force',
      mode: 'force' as const,
      targetBuild: '',
    };

    it('игнорирует локальный dismissal: даже после markCampaignDismissed показывается', async () => {
      expect(await gateShouldShow({ ...base, currentBuild: '1.0.0' })).toBe(true);
      await markCampaignDismissed(campaignDismissalKey('manual_update', base.campaignId));
      expect(await gateShouldShow({ ...base, currentBuild: '1.0.0' })).toBe(true);
    });

    it('force с target: держится пока версия ниже цели, исчезает когда догнала', async () => {
      expect(await gateShouldShow({ ...base, targetBuild: '1.5.44', currentBuild: '1.5.43' })).toBe(true);
      expect(await gateShouldShow({ ...base, targetBuild: '1.5.44', currentBuild: '1.5.44' })).toBe(false);
    });

    it('выключение флага из админки гасит окно для всех (enabled=false → не показывать)', async () => {
      expect(await gateShouldShow({ ...base, enabled: false, currentBuild: '1.0.0' })).toBe(false);
    });
  });
});
