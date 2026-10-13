// зачем (решение владельца 13.10: монеты за диалог — да; practice.html#done d6 + dialogs.html D1–D4): на итоге диалога пилюля баланса справа в шапке
// и «+N монет» с монетой под цифрами — тот же CoinAward, что у итога урока; блок только по факту начисления (status='awarded').
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const screen = read('app/dialogue_v2_completion.tsx');
const done = read('components/completion/V2DoneScreen.tsx');

describe('итог диалога: пилюля баланса и «+N монет»', () => {
  it('CoinAward общий с итогом урока (экспорт), без дубля анимации', () => {
    expect(done).toContain('export const CoinAward = memo(function CoinAward(');
    expect(screen).toContain("import { BalancePill, CoinAward } from '../components/completion/V2DoneScreen';");
  });

  it('пилюля баланса справа в шапке, под ней нет отдельного пустого места', () => {
    const header = screen.slice(screen.indexOf('testID="dialogue-v2-completion-header"'), screen.indexOf('<ScrollView contentContainerStyle={styles.scroll}'));
    expect(header).toContain('<View style={styles.headerSpacer} />');
    expect(header).toContain('<BalancePill g={lv2Glass} lang={lang} />');
  });

  it('блок «+N монет» рисуется только по факту начисления и сразу после цифр', () => {
    expect(screen).toContain("const showCoinAward = dialogCoinReward.status === 'awarded' && dialogCoinReward.coins > 0;");
    const stats = screen.indexOf('testID="dialogue-v2-completion-stats"');
    const award = screen.indexOf('testID="dialogue-v2-completion-coins"');
    const goals = screen.indexOf('testID="dialogue-v2-completion-goals"');
    expect(award).toBeGreaterThan(stats);
    expect(award).toBeLessThan(goals);
    expect(screen).toContain('<CoinAward amount={dialogCoinReward.coins} lang={lang} g={lv2Glass} animate={!reduceMotion} />');
  });

  it('исход неизвестен (итог недоступен, разбора ходов нет) — минимальная награда как за ручное завершение, а не +30 (ревью 13.10)', () => {
    expect(screen).toContain("const mistakesKnown = outcome !== null || state.kind === 'ready';");
    expect(screen).toContain("endedBy: mistakesKnown ? endedBy : 'manual',");
    expect(screen).toContain('ошибки неизвестны → минимальная сумма');
  });

  it('вставка блока в поток плавная, а не скачком', () => {
    expect(screen).toContain('animateNextLayoutTransition();');
    expect(screen).toContain('coinAwardShownRef');
  });
});
