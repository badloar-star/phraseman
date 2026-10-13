// зачем (владелец 13.10, «ЗАЧЕМ ТУТ КРЕСТИК?»): «Итог недели» в Пике — без крестика, один раз: при первом входе на новой неделе; при следующем входе карточки нет.
// Отметка «показано» — локально (weekId+uid+язык), без записей в Firestore; dev_state spireWeek=… по-прежнему форсирует показ. Лог [SPIRE-WEEK-CARD].
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Итог недели показывается один раз', () => {
  const client = read('app/spire/spire_week_result_client.ts');
  const card = read('components/spire/SpireWeekResultCard.tsx');
  const home = read('components/spire/SpireHomeScreen.tsx');

  it('карточка без крестика и без onClose', () => {
    expect(card).not.toContain('spire-week-result-close');
    expect(card).not.toContain('onClose');
    expect(card).not.toContain('Ionicons');
    expect(home).toContain('<SpireWeekResultCard lang={lang} result={(devWeekResult ?? game.weekResult)!} myCoinRank={myCoinRank} />');
  });

  it('отметка «показано» ставится при первом показе (и из кэша, и с сервера), повторный вход — skip', () => {
    expect(client).toContain('const markShown = async');
    expect(client).toContain("state: 'dismissed'");
    expect(client.match(/await markShown\(\)/g)?.length).toBe(2);
    expect(client).toContain("logCard('skip', 'уже показывалась при прошлом входе')");
  });

  it('логи [SPIRE-WEEK-CARD] содержат weekId и решение shown/skip с причиной', () => {
    expect(client).toContain('[SPIRE-WEEK-CARD] weekId=${prevWeek} lang=${input.lang} ${decision}: ${why}');
  });

  it('форс для кадров: dev-подмена карточки остаётся в экране', () => {
    expect(home).toContain('getDevSpireWeekResultOverride()');
  });
});
