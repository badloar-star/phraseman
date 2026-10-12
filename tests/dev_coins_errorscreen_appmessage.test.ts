// зачем (Авторизация 12.10, coins-001/003/004, system-010, system-012): подмены съёмки только в памяти dev-сборки. Баланс coins=N — только показ,
// при нём настоящее повышение ранга отказывает ДО сервера (тап однажды списал 6 000 монет); coinupgrade=hold держит ожидание без сервера;
// errorscreen=on показывает экран ErrorBoundary без исключения и отчётов (recordError / logAppCritical пишут в прод); appmessage=announcement —
// демо-сообщение окна объявления без сети, закрытие не подтверждается. В стор-сборке всё отклонено.
let mockStoreRelease = false;
jest.mock('../app/config', () => ({
  ...jest.requireActual('../app/config'),
  get IS_STORE_RELEASE() { return mockStoreRelease; },
}));

/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import {
  getDevCoinBalanceOverride, isDevCoinUpgradeHold, resetDevCoinStateForTests, setDevCoinBalanceOverride, setDevCoinUpgradeHold,
} from '../app/dev_coin_rank';
import {
  getDevAppMessage, isDevErrorScreen, resetDevSocialStateForTests, setDevAppMessage, setDevErrorScreen, subscribeDevAppMessage, subscribeDevErrorScreen,
} from '../app/dev_social_state';
import { parseDevStateParams } from '../app/dev_state_fixtures';
import { devAnnouncementModalMessage, listPendingAppMessageModals } from '../app/app_messages';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('dev-подмены монет, экрана ошибки и окна объявления', () => {
  beforeEach(() => {
    mockStoreRelease = false;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    resetDevCoinStateForTests();
    resetDevSocialStateForTests();
  });

  it('разбор ссылки: coins/coinupgrade/errorscreen/appmessage, неверные значения отклоняются', () => {
    const { request, rejected } = parseDevStateParams({ coins: '12480', coinupgrade: 'hold', errorscreen: 'on', appmessage: 'announcement' });
    expect(request).toMatchObject({ coins: 12480, coinUpgrade: 'hold', errorScreen: 'on', appMessage: 'announcement' });
    expect(rejected).toEqual({});
    const bad = parseDevStateParams({ coins: '-1', coinupgrade: 'yes', errorscreen: 'boom', appmessage: 'poll' });
    expect(Object.keys(bad.rejected).sort()).toEqual(['appmessage', 'coins', 'coinupgrade', 'errorscreen']);
    expect(parseDevStateParams({ coins: '10000001' }).rejected.coins).toBeDefined();
    expect(parseDevStateParams({ coins: 'off' }).request.coins).toBe('off');
  });

  it('dev: баланс и удержание ставятся и снимаются', () => {
    expect(setDevCoinBalanceOverride(12480)).toBe(true);
    expect(getDevCoinBalanceOverride()).toBe(12480);
    expect(setDevCoinBalanceOverride(1.5)).toBe(false);
    expect(getDevCoinBalanceOverride()).toBe(12480);
    expect(setDevCoinUpgradeHold(true)).toBe(true);
    expect(isDevCoinUpgradeHold()).toBe(true);
    expect(setDevCoinBalanceOverride(null)).toBe(true);
    expect(getDevCoinBalanceOverride()).toBeNull();
  });

  it('стор-сборка: всё отклонено, геттеры выключены', () => {
    mockStoreRelease = true;
    expect(setDevCoinBalanceOverride(12480)).toBe(false);
    expect(setDevCoinUpgradeHold(true)).toBe(false);
    expect(setDevErrorScreen(true)).toBe(false);
    expect(setDevAppMessage('announcement')).toBe(false);
    expect(getDevCoinBalanceOverride()).toBeNull();
    expect(isDevCoinUpgradeHold()).toBe(false);
    expect(isDevErrorScreen()).toBe(false);
    expect(getDevAppMessage()).toBeNull();
  });

  it('экран ошибки и окно объявления уведомляют подписчиков; подписка на уже выставленное сообщение срабатывает сразу', () => {
    const onError = jest.fn();
    const unsubError = subscribeDevErrorScreen(onError);
    expect(setDevErrorScreen(true)).toBe(true);
    expect(isDevErrorScreen()).toBe(true);
    expect(onError).toHaveBeenCalledTimes(1);
    unsubError();
    setDevErrorScreen(false);
    expect(onError).toHaveBeenCalledTimes(1);

    expect(setDevAppMessage('announcement')).toBe(true);
    const onMessage = jest.fn();
    const unsubMessage = subscribeDevAppMessage(onMessage);
    expect(onMessage).toHaveBeenCalledWith('announcement');
    setDevAppMessage(null);
    expect(onMessage).toHaveBeenLastCalledWith(null);
    unsubMessage();
  });

  it('демо-сообщение проходит отбор окна объявления и помечено dev-префиксом', () => {
    const message = devAnnouncementModalMessage(Date.now());
    expect(message.id.startsWith('dev-state-')).toBe(true);
    expect(message.kind).toBe('message');
    expect(message.showOnNextLoginModal).toBe(true);
    expect(message.appMessageModalAcknowledgedAtMs).toBeNull();
    expect(listPendingAppMessageModals({ messages: [message], unreadCount: 1 }, false).map((m) => m.id)).toEqual([message.id]);
  });

  it('повышение: удержание и отказ при подменённом балансе стоят ДО сервера; ErrorBoundary без исключения; демо-сообщение не подтверждается', () => {
    const hook = read('hooks/use_coin_rank_upgrade.ts');
    const hold = hook.indexOf('if (isDevCoinUpgradeHold())');
    const fake = hook.indexOf('if (getDevCoinBalanceOverride() !== null)');
    const server = hook.indexOf('upgradeCoinRank(');
    const lastImport = hook.lastIndexOf("from '../app/");
    expect(hold).toBeGreaterThan(lastImport);
    expect(fake).toBeGreaterThan(hold);
    expect(server).toBeGreaterThan(fake);

    const boundary = read('components/ErrorBoundary.tsx');
    expect(boundary).toMatch(/const devForced = !this\.state\.hasError && isDevErrorScreen\(\);/);
    expect(boundary).toMatch(/subscribeDevErrorScreen\(\(\) => this\.forceUpdate\(\)\)/);

    const layout = read('app/_layout.tsx');
    expect(layout).toMatch(/if \(messageId\.startsWith\(DEV_SETTINGS_CAMPAIGN_PREFIX\)\) \{[\s\S]{0,200}?return;\s*\}\s*if \(!ownerUid/);
    expect(layout).toMatch(/subscribeDevAppMessage\(\(kind\) =>/);
  });
});
