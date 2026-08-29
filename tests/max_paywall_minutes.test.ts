import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('MAX minute-wallet surfaces', () => {
  it('renders the verified balance and all three non-expiring purchase choices', () => {
    const paywall = read('app/max_paywall.tsx');
    const prestart = read('app/max_call_prestart.tsx');
    const panel = read('modules/voice_minutes/VoiceMinutePackPanel.tsx');
    const sheet = read('modules/voice_minutes/VoiceMinutePackSheet.tsx');
    const sheetShell = read('components/modal_fx/HybridSheetShell.tsx');
    const catalog = read('modules/voice_minutes/catalog.ts');

    expect(paywall).toContain('VoiceMinutePackSheet');
    expect(prestart).toContain('VoiceMinutePackSheet');
    expect(paywall).toContain('max-buy-minutes-button');
    expect(paywall).toContain('Купить минуты');
    expect(paywall).toContain('accessibilityHint={triLang');
    expect(paywall).toContain('hitSlop={4}');
    expect(paywall).toContain('color={t.correctText}');
    expect(sheet).toContain('HybridSheetShell');
    expect(sheet).toContain('dismissDisabled={purchaseBusy}');
    expect(sheet).toContain('ScrollView');
    expect(sheet).toContain('flexShrink: 1');
    expect(panel).toContain('onBusyChange');
    expect(sheetShell).toContain('dismissDisabled');
    expect(sheetShell).toContain('Modal');
    expect(sheetShell).toContain('translateY');
    expect(sheetShell).toContain('useReduceMotion');
    expect(sheetShell).toContain('LUM.exitMs');
    expect(sheet).toContain('VoiceMinutePackPanel');
    expect(panel).toContain('voice-minute-wallet-balance');
    expect(panel).toContain('voice-minute-pack-${slot.minutes}');
    for (const minutes of [30, 120, 300]) {
      expect(catalog).toContain(`phraseman_voice_minutes_${minutes}`);
    }
    expect(panel).toContain('never expire');
    expect(panel).toContain('не сгорают');
    expect(panel).toContain('ActivityIndicator');
    expect(panel).toContain('accessibilityState={{ disabled, busy: purchaseBusy }}');
    expect(panel).toContain('accessibilityHint={purchaseHint}');
    expect(panel).toContain('accessibilityLiveRegion="polite"');
    expect(panel).toContain('backgroundColor: pack ? t.accent');
    expect(panel).toContain('color: pack ? t.correctText');
    expect(panel).toContain('Promise.allSettled');
    expect(panel).toContain('pack?.priceString');
    // зачем: владелец 2026-08-29 велел убрать подпись «Разовая покупка · не
    // сгорают» под названием пакета — это запрещённая подпись-расшифровка.
    // Сторож теперь держит её отсутствие, а не наличие.
    expect(panel).not.toContain('styles.packCaption');
    expect(panel).not.toContain('oneTimeLabel');
    expect(panel).toContain('minHeight: 84');
    expect(panel).not.toContain('Деньги не списаны');
    expect(panel).not.toContain('You were not charged');
    expect(panel).toContain('подтверждение ещё обрабатывается');
  });

  it('shows the minute number alone, without a title caption above it', () => {
    // зачем: владелец 2026-08-29 — «убери текст "Дневной запас MAX"». Подпись
    // над числом убрана из вёрстки; в озвучке смысл остаётся, иначе незрячий
    // услышал бы голое число.
    const meter = read('components/max/MaxDailyQuotaMeter.tsx');
    expect(meter).not.toContain('quotaTitle');
    // Строки ищем как локализуемые литералы (в кавычках): в объясняющем
    // комментарии над вёрсткой упоминание убранной подписи допустимо.
    expect(meter).not.toContain("'Дневной запас MAX'");
    expect(meter).not.toContain("'Купленные минуты'");
    expect(meter).toContain('accessibilityLabel={label}');
  });

  it('shows purchased minutes from one source so the number cannot flicker', () => {
    // зачем (владелец 2026-08-29, «прыгает то 109, то 119»): у платной ветки
    // было два источника одной цифры — кошелёк и limits минта. Они меряют
    // чуть разное (limits вычитают резерв текущего звонка), и после floor
    // расхождение показывалось как скачок на минуту. Источник должен быть один.
    const prestart = read('app/max_call_prestart.tsx');
    expect(prestart).toContain('? (paidWalletSec ?? preflight?.dayRemainingSec ?? 0)');
    // Потолок платной ветки равен остатку: иначе полоса жила бы своей жизнью.
    expect(prestart).toContain('const dayMaxSec = paidAccess');
    expect(prestart).not.toContain('? (preflight?.dayRemainingSec ?? minuteWallet?.availableSeconds ?? 0)');
    // Резерв идущего звонка возвращается в показываемое число: он не трата, а
    // залог — иначе экран занижал остаток на всю длину ещё не начатого звонка.
    expect(prestart).toContain('minuteWallet.availableSeconds + minuteWallet.reservedSeconds');
    // Первый кадр берёт остаток из синхронного peek-кэша, а не рисует пробник.
    expect(prestart).toContain('peekVoiceMinutes()');
    expect(prestart).toContain('writeVoiceMinutePeek(');
  });

  it('keeps pack choices inside the sheet instead of the MAX body', () => {
    const paywall = read('app/max_paywall.tsx');
    expect(paywall).not.toContain('VoiceMinutePackPanel');
    expect(paywall.match(/max-buy-minutes-button/g)).toHaveLength(1);
    expect(paywall).toContain('accessibilityRole="button"');
    expect(paywall).toContain('minHeight: 56');
  });

  it('contains no MAX subscription purchase, restore, monthly allowance, or activation promise', () => {
    const sources = [
      read('app/max_paywall.tsx'),
      read('app/max_call_prestart.tsx'),
      read('components/paywall/PaywallPlanCards.tsx'),
      read('components/paywall/PaywallPlanTiles.tsx'),
    ].join('\n');
    expect(sources).not.toMatch(/purchaseMaxSubscription|restoreMaxSubscription|confirmMaxSubscriptionActivation/);
    expect(sources).not.toMatch(/max_monthly|phraseman_max_monthly_v1/);
    expect(sources).not.toMatch(/120\s+(?:минут|мин|minutes?|хвилин|хв|phút|menit|dk|minut)\s+(?:в месяц|a month|per month|al mes|por mês|mỗi tháng|per bulan|ayda|miesięcznie)/i);
    expect(sources).not.toMatch(/Подключить MAX|Activate MAX|Восстановить.*MAX|Restore.*MAX/i);
  });

  it('never promises a daily renewal when a paid wallet has less than one minute', () => {
    const prestart = read('app/max_call_prestart.tsx');
    expect(prestart).toContain('paidMinutesInsufficient');
    expect(prestart).toContain('Недостаточно минут — купи ещё');
    expect(prestart).toContain("paidMinutesInsufficient ?");
  });
});
