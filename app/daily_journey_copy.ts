import { triLang, type Lang } from '../constants/i18n';
import type { DailyJourneyRewardPayload } from './daily_journey_rewards';

export type DailyJourneyTileStatus = 'received' | 'today' | 'upcoming';

function eastSlavicForm(amount: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(amount) % 10;
  const mod100 = Math.abs(amount) % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function polishForm(amount: number, one: string, few: string, many: string): string {
  if (amount === 1) return one;
  const mod10 = Math.abs(amount) % 10;
  const mod100 = Math.abs(amount) % 100;
  return mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
}

export function dailyJourneyRewardAccessibilityLabel(
  reward: DailyJourneyRewardPayload,
  lang: Lang,
): string {
  const amount = reward.amount;
  switch (reward.kind) {
    case 'pearls':
      return triLang(lang, {
        ru: `${amount} ${eastSlavicForm(amount, 'жемчужина', 'жемчужины', 'жемчужин')}`,
        uk: `${amount} ${eastSlavicForm(amount, 'перлина', 'перлини', 'перлин')}`,
        en: `${amount} ${amount === 1 ? 'pearl' : 'pearls'}`,
        es: `${amount} ${amount === 1 ? 'perla' : 'perlas'}`,
        'pt-BR': `${amount} ${amount === 1 ? 'pérola' : 'pérolas'}`,
        vi: `${amount} ngọc trai`, id: `${amount} mutiara`, tr: `${amount} inci`,
        pl: `${amount} ${polishForm(amount, 'perła', 'perły', 'pereł')}`,
      });
    case 'runes':
      return triLang(lang, {
        ru: `${amount} ${eastSlavicForm(amount, 'руна', 'руны', 'рун')}`,
        uk: `${amount} ${eastSlavicForm(amount, 'руна', 'руни', 'рун')}`,
        en: `${amount} ${amount === 1 ? 'rune' : 'runes'}`,
        es: `${amount} ${amount === 1 ? 'runa' : 'runas'}`,
        'pt-BR': `${amount} ${amount === 1 ? 'runa' : 'runas'}`,
        vi: `${amount} rune`, id: `${amount} rune`, tr: `${amount} rün`,
        pl: `${amount} ${polishForm(amount, 'runa', 'runy', 'run')}`,
      });
    case 'spins':
      return triLang(lang, {
        ru: `${amount} ${eastSlavicForm(amount, 'спин', 'спина', 'спинов')}`,
        uk: `${amount} ${eastSlavicForm(amount, 'спін', 'спіни', 'спінів')}`,
        en: `${amount} ${amount === 1 ? 'spin' : 'spins'}`,
        es: `${amount} ${amount === 1 ? 'giro' : 'giros'}`,
        'pt-BR': `${amount} ${amount === 1 ? 'giro' : 'giros'}`,
        vi: `${amount} lượt quay`, id: `${amount} putaran`, tr: `${amount} çevirme`,
        pl: `${amount} ${polishForm(amount, 'obrót', 'obroty', 'obrotów')}`,
      });
    case 'freeze':
      return triLang(lang, {
        ru: `${amount} ${eastSlavicForm(amount, 'заморозка серии', 'заморозки серии', 'заморозок серии')}`,
        uk: `${amount} ${eastSlavicForm(amount, 'заморозка серії', 'заморозки серії', 'заморозок серії')}`,
        en: `${amount} streak ${amount === 1 ? 'freeze' : 'freezes'}`,
        es: `${amount} ${amount === 1 ? 'protección de racha' : 'protecciones de racha'}`,
        'pt-BR': `${amount} ${amount === 1 ? 'proteção de sequência' : 'proteções de sequência'}`,
        vi: `${amount} lượt đóng băng chuỗi`, id: `${amount} pembeku rentetan`, tr: `${amount} seri dondurması`,
        pl: `${amount} ${polishForm(amount, 'zamrożenie serii', 'zamrożenia serii', 'zamrożeń serii')}`,
      });
    case 'energy_full':
      return triLang(lang, {
        ru: `${amount} полный запас энергии`, uk: `${amount} повний запас енергії`, en: `${amount} full energy reserve`,
        es: `${amount} reserva de energía completa`, 'pt-BR': `${amount} reserva de energia completa`, vi: `${amount} lần đầy năng lượng`,
        id: `${amount} energi penuh`, tr: `${amount} tam enerji`, pl: `${amount} pełny zapas energii`,
      });
    case 'energy_plus':
      return triLang(lang, {
        ru: `${amount} ${eastSlavicForm(amount, 'единица', 'единицы', 'единиц')} дополнительной энергии`,
        uk: `${amount} ${eastSlavicForm(amount, 'одиниця', 'одиниці', 'одиниць')} додаткової енергії`,
        en: `${amount} bonus energy ${amount === 1 ? 'unit' : 'units'}`,
        es: `${amount} ${amount === 1 ? 'unidad' : 'unidades'} de energía extra`,
        'pt-BR': `${amount} ${amount === 1 ? 'unidade' : 'unidades'} de energia extra`,
        vi: `${amount} đơn vị năng lượng thêm`, id: `${amount} unit energi tambahan`,
        tr: `${amount} ek enerji birimi`,
        pl: `${amount} ${polishForm(amount, 'jednostka', 'jednostki', 'jednostek')} dodatkowej energii`,
      });
  }
}

/**
 * Short visible name used while the revealed gift is held on screen.
 * A full-energy item is an entitlement, not a quantity, so its display copy
 * deliberately omits the internal payload amount.
 */
export function dailyJourneyRewardDisplayLabel(
  reward: DailyJourneyRewardPayload,
  lang: Lang,
): string {
  if (reward.kind !== 'energy_full') {
    return dailyJourneyRewardAccessibilityLabel(reward, lang);
  }
  return triLang(lang, {
    ru: 'Полное восстановление энергии',
    uk: 'Повне відновлення енергії',
    en: 'Full energy restore',
    es: 'Restauración completa de energía',
    'pt-BR': 'Restauração completa de energia',
    vi: 'Hồi đầy năng lượng',
    id: 'Pemulihan energi penuh',
    tr: 'Tam enerji yenileme',
    pl: 'Pełne odnowienie energii',
  });
}

function dailyJourneyDayLabel(day: number, lang: Lang): string {
  return triLang(lang, {
    ru: `День ${day}`, uk: `День ${day}`, en: `Day ${day}`, es: `Día ${day}`,
    'pt-BR': `Dia ${day}`, vi: `Ngày ${day}`, id: `Hari ${day}`, tr: `${day}. gün`, pl: `Dzień ${day}`,
  });
}

function dailyJourneyStatusLabel(status: DailyJourneyTileStatus, lang: Lang): string {
  if (status === 'today') {
    return triLang(lang, {
      ru: 'Сегодня', uk: 'Сьогодні', en: 'Today', es: 'Hoy', 'pt-BR': 'Hoje',
      vi: 'Hôm nay', id: 'Hari ini', tr: 'Bugün', pl: 'Dzisiaj',
    });
  }
  if (status === 'received') {
    return triLang(lang, {
      ru: 'Получено', uk: 'Отримано', en: 'Received', es: 'Recibido', 'pt-BR': 'Recebido',
      vi: 'Đã nhận', id: 'Diterima', tr: 'Alındı', pl: 'Odebrano',
    });
  }
  return triLang(lang, {
    ru: 'Впереди', uk: 'Попереду', en: 'Upcoming', es: 'Próximo', 'pt-BR': 'Próximo',
    vi: 'Sắp tới', id: 'Akan datang', tr: 'Yakında', pl: 'Nadchodzące',
  });
}

export function dailyJourneyTileAccessibilityLabel(
  day: number,
  reward: DailyJourneyRewardPayload,
  lang: Lang,
  status: DailyJourneyTileStatus,
): string {
  return `${dailyJourneyDayLabel(day, lang)}. ${dailyJourneyStatusLabel(status, lang)}. ${dailyJourneyRewardAccessibilityLabel(reward, lang)}`;
}

export function dailyJourneySkipLabel(lang: Lang): Readonly<{ visible: string; accessibility: string }> {
  return triLang(lang, {
    ru: { visible: 'Пропустить', accessibility: 'Пропустить анимацию' },
    uk: { visible: 'Пропустити', accessibility: 'Пропустити анімацію' },
    en: { visible: 'Skip', accessibility: 'Skip animation' },
    es: { visible: 'Omitir', accessibility: 'Omitir animación' },
    'pt-BR': { visible: 'Pular', accessibility: 'Pular animação' },
    vi: { visible: 'Bỏ qua', accessibility: 'Bỏ qua hoạt ảnh' },
    id: { visible: 'Lewati', accessibility: 'Lewati animasi' },
    tr: { visible: 'Atla', accessibility: 'Animasyonu atla' },
    pl: { visible: 'Pomiń', accessibility: 'Pomiń animację' },
  });
}

const CHAPTER_NAMES: Readonly<Record<Lang, readonly [string, string, string, string, string]>> = {
  ru: ['Пробуждение', 'Разгон', 'Ритм', 'Сила', 'Вершина'],
  uk: ['Пробудження', 'Розгін', 'Ритм', 'Сила', 'Вершина'],
  en: ['Awakening', 'Momentum', 'Rhythm', 'Power', 'Summit'],
  es: ['Despertar', 'Impulso', 'Ritmo', 'Fuerza', 'Cima'],
  'pt-BR': ['Despertar', 'Impulso', 'Ritmo', 'Força', 'Cume'],
  vi: ['Thức tỉnh', 'Tăng tốc', 'Nhịp điệu', 'Sức mạnh', 'Đỉnh cao'],
  id: ['Kebangkitan', 'Dorongan', 'Irama', 'Kekuatan', 'Puncak'],
  tr: ['Uyanış', 'Hızlanma', 'Ritim', 'Güç', 'Zirve'],
  pl: ['Przebudzenie', 'Rozpęd', 'Rytm', 'Siła', 'Szczyt'],
};

export function dailyJourneyChapterTitle(chapter: number, lang: Lang): string {
  const normalized = Number.isFinite(chapter) ? Math.max(1, Math.round(chapter)) : 1;
  const name = CHAPTER_NAMES[lang][(normalized - 1) % CHAPTER_NAMES[lang].length];
  return triLang(lang, {
    ru: `Глава ${normalized} · ${name}`, uk: `Розділ ${normalized} · ${name}`,
    en: `Chapter ${normalized} · ${name}`, es: `Capítulo ${normalized} · ${name}`,
    'pt-BR': `Capítulo ${normalized} · ${name}`, vi: `Chương ${normalized} · ${name}`,
    id: `Bab ${normalized} · ${name}`, tr: `Bölüm ${normalized} · ${name}`, pl: `Rozdział ${normalized} · ${name}`,
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
