// зачем (Ядро/координатор 06.11): покупки с новой вкладки «Plus» считаются в воронке отдельным источником 'plus_tab' (раньше вкладка слала 'direct').
import { PAYWALL_SOURCE_VALUES } from '../app/paywall_entry_contract';

describe('источник пейвола plus_tab', () => {
  it('зарегистрирован в PAYWALL_SOURCE_VALUES ровно один раз', () => {
    expect(PAYWALL_SOURCE_VALUES.filter((v) => v === 'plus_tab')).toHaveLength(1);
  });
  it('прежний источник direct на месте (старые вызовы не ломаются)', () => {
    expect(PAYWALL_SOURCE_VALUES).toContain('direct');
  });
});

describe('источник пейвола appearance_tune', () => {
  it('зарегистрирован (экран «Оформление», замок Plus на ползунках) — иначе реестр точек входа красный', () => {
    expect(PAYWALL_SOURCE_VALUES.filter((v) => v === 'appearance_tune')).toHaveLength(1);
  });
});
