// зачем (правило владельца 01.10 и 18.10 «экранов-ошибок нигде»; координатор 18.10 08:00): вкладки Пик и Друзья не показывают на весь экран
// «Нет интернета» / «Связь пропала» с облаком и «Повторить». Сохранённое показывается, без него — спокойный обычный вид, загрузка тихо повторяется
// (ворота useLoadGate: паузы, затем повтор при возврате в приложение). Причина — в журнале [NO-ERROR-SCREEN].
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Пик: сбой конфига без экрана «Нет интернета»', () => {
  const screen = read('components/spire/SpireHomeScreen.tsx');
  const hook = read('components/spire/use_spire_config_quiet_retry.ts');

  it('замок рисуется без offline-варианта; сбой уходит в тихий повтор', () => {
    expect(screen).toContain('if (!unlocked) return <View style={s.root}><SpireLockedState lang={lang} /></View>;');
    expect(screen).not.toMatch(/SpireLockedState[^>]*offline=/);
    expect(screen).toContain('useSpireConfigQuietRetry(!preview, config, setConfig)');
  });

  it('сохранённый конфиг не затирается; повтор через общие ворота; журнал причины', () => {
    expect(hook).toContain('setConfig((cur) => cur ?? fallback)');
    expect(hook).toContain("useLoadGate({ id: 'spire_config', status, retry, enabled: enabled && status === 'error' })");
    expect(hook).toContain("'[NO-ERROR-SCREEN]', JSON.stringify({ screen: 'spire_home', reason, shown");
    expect(hook).toContain("cached ? 'cache' : 'quiet_empty'");
  });
});

describe('Друзья: сбой подписки без «Связь пропала · Повторить»', () => {
  const empty = read('components/friends/FriendsEmptyState.tsx');
  const tab = read('app/(tabs)/friends.tsx');

  it('пустое состояние одно — обычное; облака, «Связь пропала» и кнопки «Повторить» нет', () => {
    expect(empty).not.toMatch(/cloud-offline-outline|Связь пропала|onRetry/);
    expect(empty).toContain('testID="friends-list-empty"');
    expect(empty).toContain("JSON.stringify({ screen: 'friends_tab', reason: 'friends_list_subscription_error', shown: 'quiet_empty' })");
  });

  it('вкладка тихо перечитывает подписку через ворота, без ручной кнопки', () => {
    expect(tab).toMatch(/useLoadGate\(\{\s*id: 'friends_list',\s*status: friendsListError \? 'error' : 'ready',\s*retry: \(\) => \{ friendsAccountStore\.retry\(\); \},\s*enabled: friendsRuntimeActive && friendsListError,/);
    expect(tab).not.toContain('onRetry={');
  });
});
