import type { Lang } from '../constants/i18n';

export type EnergyStartResult = 'spent' | 'unlimited' | 'cancelled' | 'insufficient';

export interface EnergyStartConfirmationCopy {
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  accessibilityLabel: string;
}

export function energyStartConfirmationCopy(lang: Lang, cost: number): EnergyStartConfirmationCopy {
  const amount = Math.max(1, Math.floor(cost));
  const copies: Record<Lang, EnergyStartConfirmationCopy> = {
    ru: {
      title: 'Начать активность?',
      body: `Потратить ${amount} энергию и начать?`,
      confirm: `Потратить ${amount} и начать`,
      cancel: 'Не сейчас',
      accessibilityLabel: `Подтвердить списание ${amount} энергии`,
    },
    uk: {
      title: 'Почати активність?',
      body: `Витратити ${amount} енергію та почати?`,
      confirm: `Витратити ${amount} і почати`,
      cancel: 'Не зараз',
      accessibilityLabel: `Підтвердити списання ${amount} енергії`,
    },
    es: {
      title: '¿Empezar la actividad?',
      body: `¿Gastar ${amount} de energía y empezar?`,
      confirm: `Gastar ${amount} y empezar`,
      cancel: 'Ahora no',
      accessibilityLabel: `Confirmar el gasto de ${amount} de energía`,
    },
    'pt-BR': {
      title: 'Começar a atividade?',
      body: `Gastar ${amount} de energia e começar?`,
      confirm: `Gastar ${amount} e começar`,
      cancel: 'Agora não',
      accessibilityLabel: `Confirmar o gasto de ${amount} de energia`,
    },
    vi: {
      title: 'Bắt đầu hoạt động?',
      body: `Dùng ${amount} năng lượng và bắt đầu?`,
      confirm: `Dùng ${amount} và bắt đầu`,
      cancel: 'Để sau',
      accessibilityLabel: `Xác nhận dùng ${amount} năng lượng`,
    },
    id: {
      title: 'Mulai aktivitas?',
      body: `Gunakan ${amount} energi dan mulai?`,
      confirm: `Gunakan ${amount} dan mulai`,
      cancel: 'Nanti saja',
      accessibilityLabel: `Konfirmasi penggunaan ${amount} energi`,
    },
    tr: {
      title: 'Etkinlik başlasın mı?',
      body: `${amount} enerji harcayıp başlamak ister misin?`,
      confirm: `${amount} harca ve başla`,
      cancel: 'Şimdi değil',
      accessibilityLabel: `${amount} enerji harcamayı onayla`,
    },
    pl: {
      title: 'Rozpocząć aktywność?',
      body: `Wydać ${amount} energii i zacząć?`,
      confirm: `Wydaj ${amount} i zacznij`,
      cancel: 'Nie teraz',
      accessibilityLabel: `Potwierdź wydanie ${amount} energii`,
    },
  };
  return copies[lang] ?? copies.ru;
}
